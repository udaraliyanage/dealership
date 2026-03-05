import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const submitLead = new DynamicStructuredTool({
  name: "submit_lead",
  description: "Submit the customer's contact information to the dealership manager for follow-up. Use this as soon as you have the customer's name and phone number.",
  schema: z.object({
    name: z.string().describe("The customer's full name as they provided it (e.g., 'John Smith', 'Maria Garcia')."),
    phone: z.string().describe("The customer's phone number in any format (e.g., '555-123-4567', '(555) 123-4567', '+1 555 123 4567'). Do not modify or clean the format."),
    summary: z.string().describe("A brief summary of the customer's interests and conversation so far (e.g., 'Looking for SUV under $50k, interested in trade-in estimate for 2020 Toyota RAV4')."),
  }),
  func: async ({ name, phone, summary }, runManager, config) => {
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
        history: summary,
      });
      return `SUCCESS: Lead recorded (ID: ${res.data.leadId})`;
    } catch (err) {
      console.error("❌ Lead Tool Error:", err.message);
      return `ERROR: ${err.message}`;
    }
  },
});
