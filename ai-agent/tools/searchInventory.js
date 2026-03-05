import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const searchInventory = new DynamicStructuredTool({
  name: "search_inventory",
  description: "Search the dealership inventory by vehicle type and maximum budget in NZD. Use this when the customer has specified what kind of car they want and how much they can spend.",
  schema: z.object({
    type: z.string().optional().describe("The vehicle type. Must be one of: 'SUV', 'Sedan', or 'Truck'. Extract from customer's input (e.g., 'SUV', 'sedan', 'pickup truck')."),
    maxPrice: z.number().optional().describe(\"The maximum price budget in NZD (e.g., 40000, 50000). Extract numerical values from phrases like '40k', '40 grands', '40 grand', '$40,000', '40000 NZD', 'NZD 40000', 'NZD 40,000', 'forty thousand', 'fifty grands', or similar variations.\"),
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
});
