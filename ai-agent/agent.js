import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { StateGraph, MessagesAnnotation, Annotation, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite-preview", 
  apiKey: process.env.GOOGLE_API_KEY,
  apiVersion: "v1beta", 
  temperature: 0,
});

const server = express();
server.use(express.json());
server.use(cors());

// --- 1. TOOLS ---
const tools = [
  new DynamicStructuredTool({
    name: "search_inventory",
    description: "Search car inventory by type and maxPrice.",
    schema: z.object({ 
      type: z.string().describe("SUV, Sedan, or Truck"), 
      maxPrice: z.number().describe("Maximum budget") 
    }),
    func: async ({ type, maxPrice }) => {
      const res = await axios.get(`${process.env.BACKEND_URL}/vehicles?type=${type}&maxPrice=${maxPrice}`);
      return JSON.stringify(res.data);
    },
  }),
  new DynamicStructuredTool({
    name: "get_trade_in_value",
    description: "Get trade-in estimate.",
    schema: z.object({ 
      year: z.number(), 
      mileage: z.number(), 
      modelName: z.string() 
    }),
    func: async ({ year, mileage, modelName }) => {
      const res = await axios.post(`${process.env.BACKEND_URL}/trade-in-estimate`, { year, mileage, model: modelName });
      return JSON.stringify(res.data);
    },
  })
];

// --- 2. STATE ---
const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec,
  sentiment: Annotation({ reducer: (p, n) => n ?? p, default: () => "neutral" }),
});

// --- 3. NODES ---
async function agentNode(state) {
  const systemPrompt = `You are the AutoHub Concierge. 
  You have memory. If the user already mentioned their budget ($40,000) or car type (SUV), REMEMBER IT.
  Never ask for information the user has already provided in the message history.
  Always check the context before responding.`;

  const response = await model.bindTools(tools).invoke([
    new SystemMessage(systemPrompt),
    ...state.messages // Memory is injected here
  ]);

  return { messages: [response] };
}

// --- 4. COMPILE WITH CHECKPOINTER ---
// This saves the state in RAM. Use a DB checkpointer for production.
const checkpointer = new MemorySaver();

const workflow = new StateGraph(GraphState)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode(tools))
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", (state) => {
    const last = state.messages[state.messages.length - 1];
    return last.tool_calls?.length > 0 ? "tools" : "__end__";
  })
  .addEdge("tools", "agent");

const app = workflow.compile({ checkpointer });

// --- 5. SERVER ROUTE ---
server.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body; // Received from your backend proxy

    // This is where the magic happens:
    const config = { 
      configurable: { thread_id: sessionId || "default-session" } 
    };

    // Invoke the graph with the message AND the memory config
    const result = await app.invoke(
      { messages: [new HumanMessage(message)] },
      config
    );

    const lastMessage = result.messages[result.messages.length - 1];
    res.json({ reply: lastMessage.content });
  } catch (error) {
    console.error("Agent Error:", error);
    res.status(500).json({ error: "Agent memory failure." });
  }
});

server.listen(8080, '0.0.0.0', () => console.log("🚀 Agent Memory System Active"));