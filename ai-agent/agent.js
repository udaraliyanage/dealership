const express = require('express');
const cors = require('cors');
const axios = require('axios');
// load .env files if present (won't override existing env vars)
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

console.log('AI Agent startup');

// Mock implementations for testing

// 1. Logic to extract parameters
async function analyzeIntent(state) {
  const words = state.input.toLowerCase().split(' ');
  let type = null;
  let maxPrice = null;
  
  if (words.includes('suv')) type = 'SUV';
  else if (words.includes('truck')) type = 'Truck';
  else if (words.includes('sedan')) type = 'Sedan';
  
  // Look for price patterns like "20k" or "20000"
  const priceMatch = state.input.match(/(\d+)k?/);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1]) * (priceMatch[0].includes('k') ? 1000 : 1);
  }
  
  return { params: { type, maxPrice } };
}

// 2. Logic to call backend
async function callBackend(state) {
  try {
    const { type, maxPrice } = state.params;
    const url = `${process.env.BACKEND_URL}/vehicles?type=${type || ''}&maxPrice=${maxPrice || ''}`;
    const res = await axios.get(url);
    return { inventory: res.data };
  } catch (error) {
    console.error('Backend call error:', error.message);
    return { inventory: [] };
  }
}

// 3. Logic to reply
async function generateReply(state) {
  const carList = state.inventory;
  let response = '';
  
  if (carList.length === 0) {
    response = 'Sorry, I could not find any vehicles matching your criteria. Please try again with different parameters.';
  } else {
    response = `Great! I found ${carList.length} vehicle(s) for you:\n`;
    carList.forEach((car, idx) => {
      response += `${idx + 1}. ${car.year} ${car.make} ${car.model} (${car.type}) - $${car.price.toLocaleString()}\n`;
    });
    response += 'Would you like more information about any of these vehicles?';
  }
  
  return { output: response };
}

// Simple workflow
app.post('/chat', async (req, res) => {
  try {
    const message = req.body.message;
    
    // Step 1: Analyze intent
    const paramsResult = await analyzeIntent({ input: message });
    
    // Step 2: Call backend to get inventory
    const inventoryResult = await callBackend({ params: paramsResult.params });
    
    // Step 3: Generate reply
    const replyResult = await generateReply({ inventory: inventoryResult.inventory });
    
    res.json({ reply: replyResult.output });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request', details: error.message });
  }
});

app.listen(8080, () => console.log('AI Agent running on port 8080'));
