import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const submitLead = new DynamicStructuredTool({
  name: "submit_lead",
  description: "Submit customer info to the manager.",
  schema: z.object({ name: z.string(), phone: z.string(), summary: z.string() }),
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
