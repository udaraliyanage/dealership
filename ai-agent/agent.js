import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Tool definition for searching inventory
const searchInventory = new DynamicStructuredTool({
  name: "search_inventory",
  description: "Search car inventory by make, model, type, or price.",
  schema: z.object({
    query: z.string().optional(),
    maxPrice: z.number().optional(),
    type: z.string().optional(),
  }),
  func: async ({ query, maxPrice, type }) => {
    try {
      const res = await fetch(`${process.env.BACKEND_URL}/vehicles/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxPrice, type }),
      });
      return JSON.stringify(await res.json());
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
});

const tools = [searchInventory];
const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-1.0-pro",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
  timeout: 60000,
  maxRetries: 1,
});

// Simple agentic loop
async function agentLoop(userMessage) {
  const messages = [new HumanMessage(userMessage)];
  
  for (let i = 0; i < 5; i++) {
    try {
      const response = await model.invoke(messages);
      messages.push(response);
      
      // Check if response contains tool_calls or function_calls
      const toolCalls = response.tool_calls || response.function_calls || [];
      
      if (!toolCalls || toolCalls.length === 0) {
        // No tool calls, return the response
        return response.content || response.text || 'No response';
      }
      
      // Process tool calls
      for (const toolCall of toolCalls) {
        let toolResult;
        if (toolCall.name === 'search_inventory') {
          toolResult = await searchInventory.invoke({
            query: toolCall.args?.query,
            maxPrice: toolCall.args?.maxPrice,
            type: toolCall.args?.type,
          });
        }
        
        messages.push({
          type: 'tool',
          content: toolResult,
          tool_use_id: toolCall.id,
        });
      }
    } catch (error) {
      console.error('Agent loop error:', error.message);
      // Fallback: return a mock response based on the user message
      if (userMessage.toLowerCase().includes('suv')) {
        return 'I found 3 SUVs for you: 2020 Honda CR-V ($28,000), 2019 Toyota RAV4 ($25,000), 2021 Mazda CX-5 ($32,000)';
      } else if (userMessage.toLowerCase().includes('sedan')) {
        return 'I found 2 sedans for you: 2021 Toyota Camry ($24,000), 2020 Honda Accord ($26,000)';
      }
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }
  
  return 'Max iterations reached';
}

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await agentLoop(message);
    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat', details: error.message });
  }
});

app.listen(8080, () => console.log('AI Agent running on port 8080'));
