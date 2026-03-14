import express from 'express';
import cors from 'cors';
import axios from 'axios';
import morgan from 'morgan';

// 1. Import Middleware (The "Filters")
import { loggerMiddleware } from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';

// 2. Import Routes (The "Controllers")
import vehicleRoutes from './routes/vehicleRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import tradeInRoutes from './routes/tradeInRoutes.js';
import financeRoutes from './routes/financeRoutes.js';

const app = express();
const PORT = process.env.PORT || 5001; 
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://ai-agent:8080';

// --- GLOBAL FILTER CHAIN ---
app.use(cors());
app.use(express.json());      // Jackson-like JSON parsing
app.use(morgan('dev'));       // Request logging (One-liner)
app.use(loggerMiddleware);    // Detailed Request/Response interceptor

// --- REGISTER ROUTERS ---
// This is like Spring Boot's @ComponentScan finding your controllers
app.use(vehicleRoutes);
app.use(bookingRoutes);
app.use(leadRoutes);
if (tradeInRoutes) app.use(tradeInRoutes);
app.use(financeRoutes);

// --- SHARED PROXY LOGIC ---
// Keeping the Chat Proxy here is fine as it acts as a "Gateway"
app.post('/chat', async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    console.log(`💬 Forwarding to AI Agent [Session: ${sessionId}]`);
    
    const response = await axios.post(`${AI_AGENT_URL}/chat`, { 
      message, 
      sessionId 
    });
    
    res.json(response.data);
  } catch (error) {
    // Pass error to our Global Error Handler
    next(error); 
  }
});

// Health Check (Standard Actuator-like endpoint)
app.get('/health', (req, res) => res.json({ status: 'online' }));

// --- GLOBAL ERROR ADVICE ---
// IMPORTANT: This must be the VERY LAST middleware. 
// In Express, error middleware is defined by having 4 arguments (err, req, res, next)
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Dealership Backend running on port ${PORT}`);
});