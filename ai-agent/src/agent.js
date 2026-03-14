import { StateGraph, MessagesAnnotation, Annotation, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { tools } from "./tools/index.js";

// 1. Model Configuration
const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite-preview", 
  apiKey: process.env.GOOGLE_API_KEY,
  apiVersion: "v1beta", 
  temperature: 0,
}).bindTools(tools);

// 2. State Definition
const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec,
  isGenuine: Annotation({ reducer: (p, n) => n ?? p, default: () => false }),
  sentiment: Annotation({ reducer: (p, n) => n ?? p, default: () => "neutral" }),
  msgCount: Annotation({ reducer: (p, n) => (p || 0) + 1, default: () => 0 }),
  financeContext: Annotation({ reducer: (p, n) => ({ ...p, ...n }), default: () => ({}) }),
});

// 3. Nodes
async function agentNode(state, config) {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  const hasFinance = state.financeContext?.price;

  const systemPrompt = `
### ROLE
You are the "Inventory Specialist" for our dealership. Today is ${currentDate}.
Tone: Professional and business-oriented. Under 3 sentences per response.

### TOOL PROTOCOL
1. **Search:** Always call 'search_inventory' before confirming stock.
2. **Persistence:** Collect missing parameters one-by-one. Never guess values.
3. **Leads:** Call 'submit_lead' immediately upon getting Name AND Phone. (Priority: ${state.isGenuine ? 'HIGH' : 'Standard'}).
4. **Integration:** If a trade-in value arrives and finance exists, offer to recalculate using the trade-in deduction.
5. **Context:** Use these existing terms if recalculating: ${hasFinance ? JSON.stringify(state.financeContext) : 'None'}.
6. **Limits:** Only ONE trade-in car allowed per deal. If a user mentions a second, ask which one to keep.

### FORMATTING
- **Finance:** Show Price, Interest Rate, Deposit, Total to Finance, and [Amount] [Frequency].
- **Trade-In:** Show: "$[Car] - $[Trade] = $[Difference] to finance."

### GUARDRAILS
- Strictly automotive topics only. 
- Refusal: "I apologize, but I am specialized specifically in our vehicle inventory and dealership services." 
- Pivot back to inventory immediately after refusal.
`;

  const response = await model.invoke([new SystemMessage(systemPrompt), ...state.messages], config);

  const updates = { messages: [response], msgCount: (state.msgCount || 0) + 1 };
  
  // Persistence: Save finance args to state if called
  const financeCall = response.tool_calls?.find(tc => tc.name === "calculate_finance");
  if (financeCall) { updates.financeContext = financeCall.args; }

  return updates;
}

async function leadQualifierNode(state) {
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

// 4. Graph Construction
const workflow = new StateGraph(GraphState)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode(tools))
  .addNode("qualifier", leadQualifierNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", (s) => s.messages.at(-1).tool_calls?.length > 0 ? "tools" : "qualifier")
  .addEdge("tools", "agent")
  .addEdge("qualifier", "__end__");

export const agent = workflow.compile({ checkpointer: new MemorySaver() });