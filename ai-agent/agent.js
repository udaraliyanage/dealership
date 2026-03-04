import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const conversationHistory = new Map();

// 1. Tool Definition
const searchInventory = new DynamicStructuredTool({
  name: "search_inventory",
  description: "Search car inventory. Requires 'type' (SUV, Sedan, or Truck) and 'maxPrice' (number).",
  schema: z.object({
    type: z.enum(["SUV", "Sedan", "Truck"]).describe("Vehicle category"),
    maxPrice: z.number().describe("Maximum budget in dollars"),
  }),
  func: async ({ type, maxPrice }) => {
    try {
      const url = `${process.env.BACKEND_URL}/vehicles?type=${type}&maxPrice=${maxPrice}`;
      console.log(`--- TOOL CALL: ${url} ---`);
      const res = await axios.get(url);
      return JSON.stringify(res.data);
    } catch (error) {
      return JSON.stringify({ error: "Inventory offline" });
    }
  },
});

const tools = [searchInventory];

// 2. Model Initialization
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite", // or "gemini-3.1-flash-lite-preview"
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});

// Remove apiVersion and systemInstruction for now to maximize compatibility
// Bind tools correctly
const modelWithTools = model.bindTools(tools);

async function agentLoop(userMessage, sessionId) {
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, [
      new SystemMessage("You are a helpful car dealer. You MUST use tools to check inventory before answering.")
    ]);
  }

  const messages = conversationHistory.get(sessionId);
  messages.push(new HumanMessage(userMessage));

  // Use a loop to handle multiple or sequential tool calls
  let response = await modelWithTools.invoke(messages);

  while (response.tool_calls && response.tool_calls.length > 0) {
    // 1. Add the AI's tool-call "Thought" to the history
    messages.push(response); 

    // 2. Execute all tool calls requested in this turn
    for (const toolCall of response.tool_calls) {
      const toolResult = await searchInventory.invoke(toolCall.args);
      
      // 3. Add the Tool's "Result" to the history
      messages.push(new ToolMessage({
        tool_call_id: toolCall.id,
        content: toolResult
      }));
    }

    // 4. Ask the model again: "Here is the data, what is your next move?"
    // We use modelWithTools here in case it needs ANOTHER tool after seeing the first results
    response = await modelWithTools.invoke(messages);
  }

  // Final text response from the AI
  messages.push(response);
  return response.content;
}

app.post('/chat', async (req, res) => {
  try {
    console.log("New chat request received");
    const { message, sessionId } = req.body; // <--- Get the real ID
    
    // Fallback to 'anonymous' if for some reason the ID is missing
    const activeSession = sessionId || 'anonymous'; 
    
    const reply = await agentLoop(message, activeSession); 
    res.json({ reply });
  } catch (error) {
    console.error("AGENT ERROR:", error);
    res.status(500).json({ reply: "Snag hit. Try again?" });
  }
});

app.listen(8080, '0.0.0.0', () => console.log('AI Agent running on port 8080'));