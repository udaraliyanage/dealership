import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const getTradeInEstimate = new DynamicStructuredTool({
  name: "get_trade_in_estimate",
  description: "Calculate trade-in value in NZD for a customer's vehicle. Use this ONLY when you have all three: the year, mileage, and model. This is for valuing their current car if they want to trade it in.",
  schema: z.object({
    year: z.number().describe("The manufacturing year of the vehicle as a 4-digit number (e.g., 2022, 2020). Extract from customer's input."),
    mileage: z.number().describe("The current odometer reading in miles or kilometers as a plain number without commas or units (e.g., 45000, not '45,000 miles')."),
    model: z.string().describe("The complete vehicle model name including make (e.g., 'Toyota RAV4', 'Honda Civic', 'Ford F-150'). Extract exactly as the customer states it."),
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
