import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const getBookingSlots = new DynamicStructuredTool({
  name: "get_booking_slots",
  description: "Get available test drive slots.",
  schema: z.object({}),
  func: async () => {
    try {
      console.log("📅 Fetching available test drive slots.");
      const res = await axios.get(`${process.env.BACKEND_URL}/available-slots`);
      console.log(`✅ SLOTS RETRIEVED: ${res.data.slots.length} slots available.`);
      return JSON.stringify(res.data.slots);
    } catch (err) {
      console.error("❌ GET BOOKING SLOTS ERROR:", err.message);
      return `ERROR: Could not retrieve available slots. ${err.message}`;
    }
  },
});
