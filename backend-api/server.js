import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from 'node:console';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5001; 
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://ai-agent:8080';

app.use(cors());
app.use(express.json());

// --- MOCK STORAGE (In-memory for 2026 demo) ---
const leads = [];
const bookings = [];
const availableSlots = [
  "Tomorrow 10:00 AM", 
  "Tomorrow 2:00 PM", 
  "Saturday 11:00 AM", 
  "Saturday 3:00 PM"
];

const getVehicles = () => {
  try {
    const dataPath = path.join(__dirname, 'inventory.json');
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {
    console.error("❌ Error reading inventory.json:", err.message);
    return []; 
  }
};

// --- EXISTING ENDPOINTS ---
app.get('/vehicles', (req, res) => {
  const { type, maxPrice } = req.query;
  let filtered = getVehicles();
  if (type) filtered = filtered.filter(v => v.type.toLowerCase() === type.toLowerCase());
  if (maxPrice) filtered = filtered.filter(v => v.price <= parseInt(maxPrice));
  res.json(filtered);
});

app.post('/trade-in-estimate', (req, res) => {
  const { year, mileage, model } = req.body;

  if (!year) {
    return res.status(400).json({ error: "Missing 'year'. I need the vehicle's manufacturing year to calculate trade-in value." });
  }

  if (!model) {
    return res.status(400).json({ error: "Missing 'model'. I need the vehicle's make and model to calculate trade-in value." });
  }

  if (!mileage) {
    return res.status(400).json({ error: "Missing 'mileage'. I need the current odometer reading to calculate trade-in value." });
  }

  if (year < 1990 || year > 2027) {
    return res.status(400).json({ error: "Vehicle year out of range. We only provide estimates for vehicles between 1990 and 2027. Please confirm the year with the customer." });
  }

  if (mileage > 500000) {
    return res.status(400).json({ error: "High mileage detected (over 500k). For vehicles with very high mileage, please advise the customer to bring the car in for a manual appraisal to ensure accuracy." });
  }

  const currentYear = 2026;
  let estimate = 15000 - (currentYear - year) * 1000 - (mileage * 0.05);
  res.json({ estimatedValue: Math.max(estimate, 1000) });
});

// --- NEW ENDPOINTS FOR CONTROLLED FLOW ---

// 1. Available Slots
app.get('/available-slots', (req, res) => {
  console.log("📅 Fetching available test drive slots.");
  res.json({ slots: availableSlots });
});

// 2. Booking Endpoint (STRICT VALIDATION)
app.post('/bookings', (req, res) => {
  const { name, phone, model, slot, type } = req.body;

  // Mandatory fields: name, phone, model
  if (!name) {
    return res.status(400).json({ error: "Missing 'name'. I need the customer's full name to hold the test drive reservation." });
  }

  if (!phone) {
    return res.status(400).json({ error: "Missing 'phone'. I need a valid contact number to send the booking confirmation and reminder." });
  }

  if (!model) {
    return res.status(400).json({ error: "Missing 'model'. Please specify which vehicle model the customer wants to test drive (e.g., 'Toyota RAV4', 'Honda Civic')." });
  }

  // Optional: slot (can be omitted if no slots available)
  if (!slot) {
    console.log("⚠️  Warning: No time slot provided. Tentative booking created. Manager will contact customer to confirm time.");
  }

  const newBooking = {
    id: `BK-${Math.random().toString(36).substring(7).toUpperCase()}`,
    name,
    phone,
    model,
    slot: slot || "To be confirmed by manager",
    type: type || 'test-drive',
    createdAt: new Date()
  };

  console.log(`📅 New booking request received:`, newBooking);
  bookings.push(newBooking);
  console.log(`📅 New Booking [${newBooking.type}]:`, newBooking);
  res.status(201).json(newBooking);
});

// 3. Lead Capture (Manager follow-up)
app.post('/lead', (req, res) => {
  const { name, phone, history } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Missing 'name'. I need the customer's full name so the manager can follow up." });
  }

  if (!phone) {
    return res.status(400).json({ error: "Missing 'phone'. I need a valid contact number so the manager can send the confirmation and follow-up." });
  }
  
  const lead = {
    id: `LEAD-${Date.now()}`,
    name,
    phone,
    history: history || [],
    timestamp: new Date()
  };

  console.log(`🚨 Capturing lead:`, lead);
  leads.push(lead);
  console.log(`📈 Lead Captured. Total leads: ${leads.length}`);
  res.status(201).json({ status: "Lead recorded", leadId: lead.id });
});

// --- CHAT PROXY ---
app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    console.log(`💬 Received message for session ${sessionId}:`, message);
    const response = await axios.post(`${AI_AGENT_URL}/chat`, { message, sessionId });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'AI Agent error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'online', leads: leads.length }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Backend API running on port ${PORT}`);
});