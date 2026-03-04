import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();

// --- NODE 18 PATH FIX ---
// Recreates __dirname because it's missing in Node 18 ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5001; 
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://ai-agent:8080';

app.use(cors());
app.use(express.json());

// Helper function to read the inventory from JSON
const getVehicles = () => {
  try {
    const dataPath = path.join(__dirname, 'inventory.json');
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Error reading inventory.json:", err.message);
    return []; 
  }
};

// GET: Filter vehicles by type and maxPrice
app.get('/vehicles', (req, res) => {
  console.log(`🔍 Search Request: Type=${req.query.type}, MaxPrice=${req.query.maxPrice}`);
  const vehicles = getVehicles();
  let filtered = vehicles;
  
  const { type, maxPrice } = req.query;
  
  if (type) {
    filtered = filtered.filter(v => v.type.toLowerCase() === type.toLowerCase());
  }
  
  if (maxPrice) {
    filtered = filtered.filter(v => v.price <= parseInt(maxPrice));
  }
  
  res.json(filtered);
});

// POST: Proxy chat messages to the AI Agent
app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body; // <--- Extract sessionId
    console.log(`💬 Chat for Session [${sessionId}]:`, message);
    
    const response = await axios.post(`${AI_AGENT_URL}/chat`, { 
      message, 
      sessionId // <--- Forward it to the AI Agent
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'AI Agent error' });
  }
});

// Health Check
app.get('/health', (req, res) => res.json({ status: 'online' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Inventory API running on port ${PORT}`);
  console.log(`🤖 Targeting AI Agent at: ${AI_AGENT_URL}`);
});