import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { StateGraph, MessagesAnnotation, Annotation, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// --- 1. CONFIGURATION ---
const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite-preview", 
  apiKey: process.env.GOOGLE_API_KEY,
  apiVersion: "v1beta", 
  temperature: 0,
});

const server = express();
server.use(express.json());
server.use(cors());

// --- 2. THE TOOLS ---
const tools = [
  new DynamicStructuredTool({
    name: "search_inventory",
    description: "Search available cars by type and budget.",
    schema: z.object({ 
      type: z.string().optional(), 
      maxPrice: z.number().optional() 
    }),
    func: async ({ type, maxPrice }) => {
      const res = await axios.get(`${process.env.BACKEND_URL}/vehicles`, { params: { type, maxPrice } });
      return JSON.stringify(res.data);
    },
  }),
  // --- RESTORED TRADE-IN TOOL ---
  new DynamicStructuredTool({
    name: "get_trade_in_estimate",
    description: "Get an estimated value for a user's current car based on year, mileage, and model.",
    schema: z.object({ 
      year: z.number(), 
      mileage: z.number(), 
      model: z.string() 
    }),
    func: async (args) => {
      console.log
      const res = await axios.post(`${process.env.BACKEND_URL}/trade-in-estimate`, args);
      return `Estimated Trade-In Value: $${res.data.estimatedValue}. Note: This is a preliminary estimate subject to inspection.`;
    }
  }),
  new DynamicStructuredTool({
    name: "get_booking_slots",
    description: "Get available time slots for test drives.",
    schema: z.object({}),
    func: async () => {
      console
      const res = await axios.get(`${process.env.BACKEND_URL}/available-slots`);
      return JSON.stringify(res.data.slots);
    }
  }),
  new DynamicStructuredTool({
    name: "submit_lead",
    description: "Submit a high-interest customer to the manager. Use ONLY when you have name and phone.",
    schema: z.object({ 
      name: z.string(), 
      phone: z.string(),
      summary: z.string().describe("What is the user interested in? (e.g., Interested in X car, trade-in value was Y)")
    }),
    func: async ({ name, phone, summary }, config) => {
      console.log(`🚨 Submitting lead for ${name} (${phone}). Summary: ${summary}`);
      console.log(`📡 Attempting API call to: ${process.env.BACKEND_URL}/lead`);
      const sessionId = config.configurable?.thread_id;
      await axios.post(`${process.env.BACKEND_URL}/lead`, {
        sessionId, name, phone, history: summary, type: "HOT_LEAD"
      });
      return "SUCCESS: Lead submitted. Tell user a manager will call shortly.";
    },
  }),
  new DynamicStructuredTool({
    name: "book_test_drive",
    description: "Finalize a test drive booking. REQUIRES name, phone, model, and slot.",
    schema: z.object({ 
      name: z.string(), 
      phone: z.string(), 
      model: z.string(), 
      slot: z.string() 
    }),
    func: async (args) => {
      try {
        console.log(`📅 Attempting to book test drive for ${args.name} (${args.phone}) - Model: ${args.model}, Slot: ${args.slot}`);
        const res = await axios.post(`${process.env.BACKEND_URL}/bookings`, args);
        return `Booking Confirmed! ID: ${res.data.id}`;
      } catch (err) {
        return `Error: ${err.response?.data?.error || "Booking failed"}`;
      }
    }
  })
];

// --- 3. GRAPH STATE ---
const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec,
  isGenuine: Annotation({ reducer: (p, n) => n ?? p, default: () => false }),
  leadSynced: Annotation({ reducer: (p, n) => n ?? p, default: () => false }),
  msgCount: Annotation({ reducer: (p, n) => (p || 0) + 1, default: () => 0 }),
});

// --- 4. NODES ---

async function agentNode(state) {
  let strategy = "Be a helpful car dealership assistant.";

  // TEMPTATION LOGIC: If flagged as genuine but no lead info yet
  if (state.isGenuine && !state.leadSynced) {
    strategy = `
      The user is very interested. 
      ACTION: Offer a $500 'First-Time Buyer' discount or mention that you can help them get a better trade-in value.
      GOAL: Tell them you need their Name and Mobile number to check if they qualify for this specific incentive or to finalize the quote.
    `;
  }

  const systemPrompt = `
    ${strategy}
    - If they want to book, buy, or get a final trade-in quote, you MUST ask for Name and Phone.
    - If you get Name and Phone, immediately use 'submit_lead'.
    - Use 'get_trade_in_estimate' if they mention wanting to swap or sell their current car.
  `;

  const response = await model.bindTools(tools).invoke([
    new SystemMessage(systemPrompt),
    ...state.messages
  ]);

  return { messages: [response] };
}

async function leadQualifierNode(state, config) {
  const sessionId = config.configurable?.thread_id;
  const count = state.msgCount || 0;

  if (count >= 5 && !state.isGenuine) {
    console.log(`🔍 [Safety Net] Analyzing Turn ${count} for Session ${sessionId}`);
    const historyText = state.messages.map(m => `[${m._getType()}]: ${m.content}`).join("\n");
    
    const analysis = await model.invoke([
      new SystemMessage("Is this user a genuine car buyer? Respond ONLY with 'YES' or 'NO'."),
      new HumanMessage(historyText)
    ]);

    if (analysis.content.toUpperCase().includes("YES")) {
      console.log("📈 Genuine interest detected by Safety Net.");
      return { isGenuine: true };
    }
  }
  return {};
}

// --- 5. GRAPH CONSTRUCTION ---
const workflow = new StateGraph(GraphState)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode(tools))
  .addNode("qualifier", leadQualifierNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", (state) => {
    if (state.messages.at(-1).tool_calls?.length > 0) return "tools";
    return "qualifier";
  })
  .addEdge("tools", "agent")
  .addEdge("qualifier", "__end__");

const app = workflow.compile({ checkpointer: new MemorySaver() });

// --- 6. SERVER ---
server.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const config = { configurable: { thread_id: sessionId || "guest" } };
    
    const result = await app.invoke({ 
      messages: [new HumanMessage(message)] 
    }, config);

    const lastMessage = result.messages[result.messages.length - 1];
    res.json({ reply: lastMessage.content });
  } catch (err) {
    console.error("Agent Error:", err);
    res.status(500).json({ error: "I'm having trouble thinking right now." });
  }
});

server.listen(8080, '0.0.0.0', () => console.log("🚀 Agent Active on 8080"));