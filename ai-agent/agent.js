import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { StateGraph, MessagesAnnotation, Annotation, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
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

const tools = [

  new DynamicStructuredTool({
    name: "search_inventory",
    description: "Search cars by type/budget.",
    schema: z.object({ 
      type: z.string().optional().describe("e.g., 'SUV', 'Sedan'"), 
      maxPrice: z.number().optional().describe("Maximum price in dollars") 
    }),
    func: async ({ type, maxPrice }) => {
      try {
        const url = `${process.env.BACKEND_URL}/vehicles`;
        console.log(`🔍 AGENT SEARCHING INVENTORY: ${url}`, { type, maxPrice });

        const res = await axios.get(url, { params: { type, maxPrice } });

        console.log(`✅ INVENTORY FOUND: ${res.data.length} vehicles.`);
        return JSON.stringify(res.data);
      } catch (err) {
        console.error("❌ SEARCH INVENTORY ERROR:", err.message);
        return `ERROR: Could not retrieve inventory. ${err.message}`;
      }
    },
  }),

  new DynamicStructuredTool({
    name: "get_trade_in_estimate",
    description: "Calculate value. MANDATORY: year, mileage, model.",
    schema: z.object({ 
      year: z.number(), 
      mileage: z.number(), 
      model: z.string() 
    }),
    func: async (args) => {
      try {
        const url = `${process.env.BACKEND_URL}/trade-in-estimate`;
        console.log(`⚖️ AGENT ESTIMATING TRADE-IN: ${url}`, args);

        const res = await axios.post(url, args);

        console.log("✅ ESTIMATE RECEIVED:", res.data.estimatedValue);
        return `Estimated Trade-In Value: $${res.data.estimatedValue}. (Note: This is a preliminary estimate ONLY. Final value is determined after a physical inspection at the dealership.)`;
      } catch (err) {
        console.error("❌ TRADE-IN TOOL ERROR:", err.message);
        return `ERROR: Failed to calculate estimate. ${err.message}`;
      }
    }
  }),


new DynamicStructuredTool({
  name: "submit_lead",
  description: "Submit customer info to the manager.",
  schema: z.object({ name: z.string(), phone: z.string(), summary: z.string() }),
  func: async ({ name, phone, summary }, runManager, config) => { // <--- Note the 3 arguments
    
    // LangChain often passes config as the 3rd argument in certain Node versions
    const sessionId = 
      config?.configurable?.thread_id || 
      runManager?.configurable?.thread_id || 
      "guest_session";

    console.log(`📡 TOOL EXECUTING for session: ${sessionId}`);

    try {
      const res = await axios.post(`${process.env.BACKEND_URL}/lead`, { 
        sessionId, 
        name, 
        phone, 
        history: summary 
      });
      return `SUCCESS: Lead recorded (ID: ${res.data.leadId})`;
    } catch (err) {
      console.error("❌ Lead Tool Error:", err.message);
      return `ERROR: ${err.message}`;
    }
  },
}),

  new DynamicStructuredTool({
    name: "get_booking_slots",
    description: "Get available test drive slots.",
    schema: z.object({}),
    func: async () => {
      console.log("📅 Fetching available test drive slots.")  ;
      const res = await axios.get(`${process.env.BACKEND_URL}/available-slots`);
      return JSON.stringify(res.data.slots);
    }
  }),

  new DynamicStructuredTool({
  name: "book_test_drive",
  description: "Finalize booking. Needs Name, Phone, Model, Slot.",
  schema: z.object({ 
    name: z.string(), 
    phone: z.string(), 
    model: z.string(), 
    slot: z.string() 
  }),
  func: async (args) => {
    try {
      console.log("📅 AGENT INITIATING BOOKING:", args);
      
      const res = await axios.post(`${process.env.BACKEND_URL}/bookings`, {
        ...args,
        type: 'test-drive' // Explicitly adding the type your backend expects
      });

      console.log("✅ BACKEND BOOKING SUCCESS:", res.data);
      return `Booking Confirmed! Your Booking ID is ${res.data.id}.`;
    } catch (err) {
      // THIS IS THE KEY: If the backend returns 400, this will show you the error message
      const errorMsg = err.response?.data?.error || err.message;
      console.error("❌ BACKEND BOOKING REJECTED:", errorMsg);
      return `ERROR: The booking could not be completed. Reason: ${errorMsg}`;
    }
  }
})


];

const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec,
  isGenuine: Annotation({ reducer: (p, n) => n ?? p, default: () => false }),
  sentiment: Annotation({ reducer: (p, n) => n ?? p, default: () => "neutral" }),
  msgCount: Annotation({ reducer: (p, n) => (p || 0) + 1, default: () => 0 }),
});

async function agentNode(state, config) {

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const tid = config?.configurable?.thread_id;
  console.log(`🤖 Node processing session: ${tid}`);

  const systemPrompt = `
    ### TEMPORAL ANCHOR (2026)
    - TODAY IS: ${currentDate}. 

    ### LEAD CAPTURE & TOOL EXECUTION (CRITICAL)
    1. The 'submit_lead' tool is the ONLY way to notify a manager. 
    2. As soon as you have a Name and Phone Number, you MUST call 'submit_lead' immediately.
    3. Do NOT tell the user "I have submitted your info" unless you are calling the tool in that same turn.
    4. If 'isGenuine' is true (${state.isGenuine}) and you have Name/Phone, call 'submit_lead' even if they haven't picked a test drive slot yet.

    ### MANDATORY TRADE-IN RULES
    - DO NOT call 'get_trade_in_estimate' until you have: Year, Model, AND Mileage.
    - If mileage is missing, you MUST ask for it first.
    - After estimating, show the math: "$Car - $Trade = $FinalDifference".
    - Remind them to bring the vehicle for inspection.

    ### BOOKING RULES
    - Call 'get_booking_slots' to show options.
    - Do NOT call 'book_test_drive' until the user picks a SPECIFIC slot.
    - If the user says "go ahead" without a slot, ask: "Which time works best for you?"

    ### SOCIAL AWARENESS
    - Review history: If you asked for a number in the last 2 turns and were ignored, answer the next question directly. Do not be a "broken record."
  `;

// FIX 1: Add the SystemMessage here
  const response = await model.bindTools(tools).invoke(
    [new SystemMessage(systemPrompt), ...state.messages], 
    config
  );

// FIX 2: Return the incremented msgCount
  return { 
    messages: [response],
    msgCount: (state.msgCount || 0) + 1 
  };}

async function leadQualifierNode(state) {
  if (state.msgCount >= 3) {
    const historyText = state.messages.map(m => `${m._getType()}: ${m.content}`).join("\n");
    const analysis = await model.invoke([
      new SystemMessage(`Return ONLY JSON: {"isGenuine": bool, "sentiment": "happy"|"frustrated"|"skeptical"|"neutral"}`),
      new HumanMessage(historyText)
    ]);
    try {
      const data = JSON.parse(analysis.content.replace(/```json|```/g, "").trim());
      return { isGenuine: data.isGenuine, sentiment: data.sentiment };
    } catch (e) { return {}; }
  }
  return {};
}

const workflow = new StateGraph(GraphState)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode(tools))
  .addNode("qualifier", leadQualifierNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", (s) => s.messages.at(-1).tool_calls?.length > 0 ? "tools" : "qualifier")
  .addEdge("tools", "agent")
  .addEdge("qualifier", "__end__");

const app = workflow.compile({ checkpointer: new MemorySaver() });

server.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  const result = await app.invoke({ messages: [new HumanMessage(message)] }, { configurable: { thread_id: sessionId || "guest" } });
  res.json({ reply: result.messages.at(-1).content });
});

server.listen(8080, '0.0.0.0', () => console.log("🚀 Agent Running"));