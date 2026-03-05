import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const searchInventory = new DynamicStructuredTool({
  name: "search_inventory",
  description: "Search cars by type/budget.",
  schema: z.object({
    type: z.string().optional().describe("e.g., 'SUV', 'Sedan'"),
    maxPrice: z.number().optional().describe("Maximum price in dollars"),
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
