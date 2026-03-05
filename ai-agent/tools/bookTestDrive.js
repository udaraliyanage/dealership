import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const bookTestDrive = new DynamicStructuredTool({
  name: "book_test_drive",
  description: "Finalize booking. Needs Name, Phone, Model, Slot.",
  schema: z.object({
    name: z.string(),
    phone: z.string(),
    model: z.string(),
    slot: z.string(),
  }),
  func: async (args) => {
    try {
      console.log("📅 AGENT INITIATING BOOKING:", args);

      const res = await axios.post(`${process.env.BACKEND_URL}/bookings`, {
        ...args,
        type: 'test-drive' // Explicitly adding the type your backend expects
      });

      console.log("✅ BACKEND BOOKING SUCCESS:", res.data);
      return `Booking Confirmed! Your Booking ID is ${res.data.id}.`;
    } catch (err) {
      // THIS IS THE KEY: If the backend returns 400, this will show you the error message
      const errorMsg = err.response?.data?.error || err.message;
      console.error("❌ BACKEND BOOKING REJECTED:", errorMsg);
      return `ERROR: The booking could not be completed. Reason: ${errorMsg}`;
    }
  }
});
