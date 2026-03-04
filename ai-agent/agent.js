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
  model: "gemini-2.5-flash-lite", 
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
  // --- RETRY LOGIC ---
  maxRetries: 5,         // Recommended for Free Tier in 2026
  timeout: 30000,        // 30 second timeout before giving up
});

// Remove apiVersion and systemInstruction for now to maximize compatibility
// Bind tools correctly
const modelWithTools = model.bindTools(tools);

/**
 * Processes a user message, handles tool calls (searching inventory),
 * and maintains conversation context with built-in resilience.
 */
async function agentLoop(userMessage, sessionId) {
  // 1. Initialize History for the session if it doesn't exist
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, [
      new SystemMessage(
        "You are a helpful and professional car dealer concierge for AutoHub. " +
        "You MUST use the search_inventory tool to check stock before confirming a car's availability. " +
        "Always ask for vehicle type (SUV, Sedan, Truck) and a budget if they haven't provided one."
      )
    ]);
  }

  const messages = conversationHistory.get(sessionId);
  messages.push(new HumanMessage(userMessage));

  let steps = 0;
  const MAX_STEPS = 3; // Safety break to prevent infinite loops and save quota

  try {
    // Initial call to the model (includes native retry logic if configured in the model init)
    let response = await modelWithTools.invoke(messages);

    // 2. The Tool-Calling Loop
    // We stay in this loop as long as the AI wants to use tools and we haven't hit our safety limit
    while (response.tool_calls && response.tool_calls.length > 0 && steps < MAX_STEPS) {
      steps++;
      console.log(`[Session: ${sessionId}] 🔄 Step ${steps}: AI requested ${response.tool_calls.length} tool calls.`);

      // Push the AI's "Thought" (the tool call request) to the message list
      // Gemini REQUIRES this message to exist before the ToolMessage
      messages.push(response);

      // Execute each tool call requested by the AI
      for (const toolCall of response.tool_calls) {
        console.log(`--- 🛠️  Executing Tool: ${toolCall.name} with args:`, toolCall.args);
        
        const toolResult = await searchInventory.invoke(toolCall.args);
        
        // Push the result of the tool back to the message history
        messages.push(new ToolMessage({
          tool_call_id: toolCall.id,
          content: toolResult
        }));
      }

      // Re-invoke the model to let it see the tool results and decide its next move
      // We use modelWithTools here just in case it needs a second tool call (e.g., checking a second category)
      response = await modelWithTools.invoke(messages);
    }

    // 3. Finalization
    // If we exited because of the safety break, the AI might need a nudge to wrap it up
    if (steps >= MAX_STEPS && response.tool_calls?.length > 0) {
      console.warn(`[Session: ${sessionId}] ⚠️  Hit MAX_STEPS. Forcing final response.`);
      // We call the base model (without tools) to force a textual conclusion
      response = await model.invoke([
        ...messages, 
        new HumanMessage("Summarize what you found so far and tell me the next steps.")
      ]);
    }

    // Add the AI's final textual response to the history
    messages.push(response);
    
    // Log the interaction
    console.log(`[Session: ${sessionId}] ✅ Response generated successfully.`);
    
    return response.content;

  } catch (error) {
    console.error(`[Session: ${sessionId}] ❌ AgentLoop Error:`, error.message);
    
    // Specific handling for 429 errors
    if (error.message.includes('429')) {
      return "I'm receiving a lot of requests right now. Could you wait a few seconds and try again? I want to make sure I give you the best information.";
    }
    
    throw error; // Let the express route handle other generic errors
  }
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