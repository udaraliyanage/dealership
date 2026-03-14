import express from 'express';
import cors from 'cors';
import { StateGraph, MessagesAnnotation, Annotation, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

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

const server = express();
server.use(express.json());
server.use(cors());

const tools = [
  searchInventory,
  getTradeInEstimate,
  submitLead,
  getBookingSlots,
  bookTestDrive,
  calculateFinance
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

    ### 1. IDENTITY & ROLE
    You are the "Inventory Specialist" for our dealership. Your tone is professional, enthusiastic, and helpful, but strictly business-oriented. Your primary goal is to match customers with the right vehicle from our inventory and schedule test drives.

    ### TOOL: SEARCH INVENTORY
- Always call 'search_inventory' before confirming stock.
- Extract type (SUV/Sedan/Truck) and maxPrice from the customer's message.
 
---
 
### TOOL: FINANCE CALCULATOR (CRITICAL RULES)
You MUST collect ALL 4 inputs before calling 'calculate_finance'. Never assume or guess any value.
 
Required inputs — ask for any that are missing:
1. **Purchase price** — confirm the vehicle price (already known if they picked a car).
2. **Deposit** — "How much deposit can you put down? (Enter 0 if none)"
3. **Loan term** — "What loan term would you prefer? 12, 24, 36, 48, 60, or 72 months?"
4. **Repayment frequency** — "Would you prefer Weekly, Fortnightly, or Monthly repayments?"
 
Collect inputs ONE question at a time if the customer hasn't provided them upfront.
 
After calling 'calculate_finance', present ONLY these fields in a clean format:
 
---
💰 **Finance Estimate**
 
| | |
|---|---|
| Purchase price | $[purchasePrice] |
| Interest rate | [interestRate] |
| Deposit | $[depositAmount] |
| Total to finance | $[totalToFinance] |
 
**[repaymentAmount] [repaymentFrequency]**
Based on a [termsInMonths]-month term.
 
_This is an estimate only. Final rate subject to credit approval._
---
 
Do NOT show adminFee, originationFee, periodCount, amountToFinance, or totalRepayment.
 
---
 
### TOOL: TRADE-IN ESTIMATE
- DO NOT call 'get_trade_in_estimate' until you have: Year, Make, Model, AND Odometer.
- After result: show "$[vehiclePrice] − $[tradeIn] = $[difference] to finance".
 
---
 
### TOOL: TEST DRIVE BOOKING
- Call 'get_booking_slots' to show available times.
- Do NOT call 'book_test_drive' until the customer picks a specific slot.
 
---
 
### LEAD CAPTURE
- As soon as you have a customer's Name AND Phone Number, call 'submit_lead' immediately.
- Do not confirm submission until the tool has been called.
- If isGenuine is ${state.isGenuine} and you have Name/Phone, submit now.
 
---
 
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
    - Review history: If you asked for a phone number in the last 2 turns and were ignored, 
    
    ### 2. CORE CAPABILITIES (ALLOWED TOPICS)
    You are ONLY permitted to discuss the following:
    - Specific vehicles in our inventory (Year, Make, Model, Price, Mileage).
    - General vehicle comparisons (e.g., "SUV vs Sedan").
    - Financing, trade-ins, and dealership hours/location.
    - Scheduling test drives and answering questions about car features.answer the next question directly. Do not be a "broken record."
      
    ### 3. DOMAIN GUARDRAILS (STRICT REFUSAL POLICY)
    You are strictly prohibited from discussing non-automotive topics. If the user asks about anything outside of car sales, you must follow these rules:
    - **Geography/Trivia:** Do not provide coordinates, distances (except to the dealership), or facts about countries/cities.
    - **News/General Info:** Do not provide news updates, weather, or historical facts.
    - **Personal/General Advice:** Do not act as a general-purpose assistant.
    - **Constraint:** Even if you "know" the answer from your internal training, you must refuse to answer.

    ### 4. THE REFUSAL SCRIPT
    If a user goes off-topic, you must respond with:
    "I apologize, but I am specialized specifically in our vehicle inventory and dealership services"

    ### 5. CONVERSATION GUIDELINES
    - **Pivot:** After every refusal, immediately pivot back to a car in the inventory.
    - **Conciseness:** Keep responses under 3 sentences unless describing a specific vehicle.
    - **Tools:** Always use the 'Vehicle Search' tool before confirming if a car is in stock.
`
  ;

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

server.get('/health', (req, res) => res.json({ status: 'online' }));

server.post('/chat', async (req, res) => {
  console.log("💬 Received message for AI Agent:", req.body);
  const { message, sessionId } = req.body;
  try {
    const result = await app.invoke(
      { messages: [new HumanMessage(message)] },
      { configurable: { thread_id: sessionId || "guest" } }
    );
    res.json({ reply: result.messages.at(-1).content });
  } catch (err) {
    console.error("❌ Agent error:", err.message);
    res.status(500).json({ reply: "I'm having trouble right now. Please try again in a moment." });
  }
});

server.listen(8080, '0.0.0.0', () => console.log("🚀 Agent Running on port 8080"));