import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const bookTestDrive = new DynamicStructuredTool({
  name: "book_test_drive",
  description: "Finalize a test drive booking with customer details. Only call this after confirming the customer's name, phone, and the specific vehicle model they want to test. The time slot is optional—if no slots are available, proceed without it and the manager will contact the customer to confirm a time.",
  schema: z.object({
    name: z.string().describe("The customer's full name (e.g., 'John Smith')."),
    phone: z.string().describe("The customer's phone number in their original format (e.g., '555-123-4567')."),
    model: z.string().describe("The exact vehicle model to be test driven (e.g., 'Toyota RAV4', 'Honda Civic'). This should be a specific model available in the dealership."),
    slot: z.string().describe("The exact time slot the customer selected (e.g., '2:00 PM Monday', 'March 7 at 10:30 AM')"),
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
