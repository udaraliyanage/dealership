import { searchInventory } from "./searchInventory.js";
import { getTradeInEstimate } from "./getTradeInEstimate.js";
import { submitLead } from "./submitLead.js";
import { getBookingSlots } from "./getBookingSlots.js";
import { bookTestDrive } from "./bookTestDrive.js";
import { calculateFinance } from "./calculateFinance.js";

export const tools = [
  searchInventory,
  getTradeInEstimate,
  submitLead,
  getBookingSlots,
  bookTestDrive,
  calculateFinance
];