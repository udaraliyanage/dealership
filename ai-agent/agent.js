import express from 'express';
import cors from 'cors';
import { StateGraph, MessagesAnnotation, Annotation, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// Tool Imports
import { searchInventory } from "./tools/searchInventory.js";
import { getTradeInEstimate } from "./tools/getTradeInEstimate.js";
import { submitLead } from "./tools/submitLead.js";
import { getBookingSlots } from "./tools/getBookingSlots.js";
import { bookTestDrive } from "./tools/bookTestDrive.js";
import { calculateFinance } from "./tools/calculateFinance.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite-preview", 
  apiKey: process.env.GOOGLE_API_KEY,
  apiVersion: "v1beta", 
  temperature: 0,
});

const tools = [
  searchInventory,
  getTradeInEstimate,
  submitLead,
  getBookingSlots,
  bookTestDrive,
  calculateFinance
];

// --- 1. STATE DEFINITION ---
const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec,
  isGenuine: Annotation({ reducer: (p, n) => n ?? p, default: () => false }),
  sentiment: Annotation({ reducer: (p, n) => n ?? p, default: () => "neutral" }),
  msgCount: Annotation({ reducer: (p, n) => (p || 0) + 1, default: () => 0 }),
  // Remembers finance params for recalculations
  financeContext: Annotation({ reducer: (p, n) => ({ ...p, ...n }), default: () => ({}) }),
});

// --- 2. NODES ---
async function agentNode(state, config) {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  const hasFinance = state.financeContext?.price;

  const systemPrompt = `
### IDENTITY & ROLE
You are the "Inventory Specialist" for our dealership. Today is ${currentDate}.
Tone: Professional, enthusiastic, business-oriented. Under 3 sentences per response.

### TOOL PROTOCOL
1. **Search:** Always call 'search_inventory' before confirming stock.
2. **Parameters:** Collect missing tool parameters (mileage, deposit, etc.) one-by-one. Never guess.
3. **Leads:** Call 'submit_lead' immediately once you have a Name AND Phone. (Priority: ${state.isGenuine ? 'HIGH' : 'Standard'}).
4. **Bookings:** Suggest slots from 'get_booking_slots' before calling 'book_test_drive'.

### TRADE-IN & FINANCE INTEGRATION
- **Recalculation:** If a trade-in value is found after a finance estimate exists, you MUST ask: "Would you like me to recalculate your finance estimate using this $[value] deduction?" 
- **Sticky Context:** Use these existing finance terms if recalculating: ${hasFinance ? JSON.stringify(state.financeContext) : 'None'}.
- **One Trade-In Only:** We only accept ONE vehicle per deal. If the user mentions another, ask: "We can only accept one trade-in. Which of these two should we use?"

### OUTPUT FORMATTING
- **Finance:** Show only: Price, Interest Rate, Deposit, Total to Finance, and [Amount] [Frequency].
- **Trade-In:** Show math: "$[Car] - $[Trade] = $[Difference] to finance." Remind them to bring the car for inspection.

### DOMAIN GUARDRAILS
- **Allowed:** Inventory, Comparisons, Finance, Trade-ins, Dealership info.
- **Strict Refusal:** For non-automotive topics, say: "I apologize, but I am specialized specifically in our vehicle inventory and dealership services." Then pivot back to a car in stock.
`;

  const response = await model.bindTools(tools).invoke(
    [new SystemMessage(systemPrompt), ...state.messages], 
    config
  );

  // Persistence Logic: If the LLM just called finance, save the args to state
  const updates = { 
    messages: [response],
    msgCount: (state.msgCount || 0) + 1 
  };

  const financeCall = response.tool_calls?.find(tc => tc.name === "calculate_finance");
  if (financeCall) {
    updates.financeContext = financeCall.args;
  }

  return updates;
}

async function leadQualifierNode(state) {
  // Analyzes lead quality every few messages
  if (state.msgCount % 3 === 0) {
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

// --- 3. GRAPH CONSTRUCTION ---
const workflow = new StateGraph(GraphState)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode(tools))
  .addNode("qualifier", leadQualifierNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", (s) => s.messages.at(-1).tool_calls?.length > 0 ? "tools" : "qualifier")
  .addEdge("tools", "agent")
  .addEdge("qualifier", "__end__");

const app = workflow.compile({ checkpointer: new MemorySaver() });

// --- 4. SERVER ---
const server = express();
server.use(express.json());
server.use(cors());

server.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  try {
    const result = await app.invoke(
      { messages: [new HumanMessage(message)] },
      { configurable: { thread_id: sessionId || "guest" } }
    );
    res.json({ reply: result.messages.at(-1).content });
  } catch (err) {
    res.status(500).json({ reply: "I'm having trouble. Please try again later." });
  }
});

server.listen(8080, '0.0.0.0', () => console.log("🚀 Agent Online on 8080"));