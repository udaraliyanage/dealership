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
  // Use the 2.5 Flash model shown in your Rate Limit screenshot
  model: "gemini-2.5-flash", 
  apiKey: process.env.GOOGLE_API_KEY,
  // We can go back to v1beta now to use 'tools' and 'systemInstruction'
  apiVersion: "v1beta",
  temperature: 0,
});

// Remove apiVersion and systemInstruction for now to maximize compatibility
// Bind tools correctly
const modelWithTools = model.bindTools(tools);

async function agentLoop(userMessage, sessionId) {
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, [
      new SystemMessage("You are a car dealer. Ask for 'type' and 'budget' before searching.")
    ]);
  }

  const messages = conversationHistory.get(sessionId);
  messages.push(new HumanMessage(userMessage));

  // First call to see if LLM wants to use a tool
  let response = await modelWithTools.invoke(messages);

  if (response.tool_calls && response.tool_calls.length > 0) {
    for (const toolCall of response.tool_calls) {
      const toolResult = await searchInventory.invoke(toolCall.args);
      
      messages.push(response); 
      messages.push(new ToolMessage({
        tool_call_id: toolCall.id,
        content: toolResult
      }));

      // Final call to summarize tool results
      response = await model.invoke(messages);
    }
  }

  messages.push(response);
  return response.content;
}

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await agentLoop(message, 'default');
    res.json({ reply });
  } catch (error) {
    console.error("AGENT ERROR:", error);
    res.status(500).json({ reply: "I hit a snag. Try again?" });
  }
});

app.listen(8080, '0.0.0.0', () => console.log('AI Agent running on port 8080'));