import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const getTradeInEstimate = new DynamicStructuredTool({
  name: "get_trade_in_estimate",
  description: "Calculate value. MANDATORY: year, mileage, model.",
  schema: z.object({
    year: z.number(),
    mileage: z.number(),
    model: z.string(),
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
});
