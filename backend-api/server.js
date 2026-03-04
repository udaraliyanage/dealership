const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Use the PORT environment variable provided by Docker/System, 
// or default to 5001 if 5000 is busy.
const PORT = process.env.PORT || 5001; 
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8080';

app.use(cors());
app.use(express.json());

const vehicles = [
  { id: 1, make: "Toyota", model: "RAV4", year: 2021, price: 22000, type: "SUV" },
  { id: 2, make: "Honda", model: "CR-V", year: 2019, price: 18500, type: "SUV" },
  { id: 3, make: "Ford", model: "F-150", year: 2020, price: 35000, type: "Truck" },
  { id: 4, make: "Tesla", model: "Model 3", year: 2022, price: 38000, type: "Sedan" },
  { id: 5, make: "Hyundai", model: "Tucson", year: 2018, price: 15000, type: "SUV" }
];

app.get('/vehicles', (req, res) => {
  let filtered = vehicles;
  const { type, maxPrice } = req.query;
  
  if (type) filtered = filtered.filter(v => v.type.toLowerCase() === type.toLowerCase());
  if (maxPrice) filtered = filtered.filter(v => v.price <= parseInt(maxPrice));
  
  res.json(filtered);
});

// Proxy chat requests to ai-agent service
app.post('/chat', async (req, res) => {
  console.log('Chat request received:', req.body.message);
  try {
    const { message } = req.body;
    const response = await axios.post(`${AI_AGENT_URL}/chat`, { message }, { timeout: 30000 });
    console.log('AI Agent response sent to client');
    res.json(response.data);
  } catch (error) {
    console.error('Error calling AI agent:', error.message);
    res.status(500).json({ error: 'Failed to get response from AI agent', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check called from:', req.headers.origin);
  res.json({ status: 'ok', message: 'Backend is online' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Inventory API running on port ${PORT}`);
  console.log(`AI Agent URL: ${AI_AGENT_URL}`);
});
