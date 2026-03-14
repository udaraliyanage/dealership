import 'dotenv/config'; // Load API keys
import express from 'express';
import cors from 'cors';
import { HumanMessage } from "@langchain/core/messages";
import { agent } from "./agent.js";

const server = express();
server.use(express.json());
server.use(cors());

server.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  
  try {
    const result = await agent.invoke(
      { messages: [new HumanMessage(message)] },
      { configurable: { thread_id: sessionId || "default-session" } }
    );
    
    const lastMessage = result.messages.at(-1);
    res.json({ reply: lastMessage.content });
  } catch (err) {
    console.error("❌ Agent Error:", err);
    res.status(500).json({ reply: "I'm having a technical issue. Please try again." });
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Dealership AI Agent running on http://localhost:${PORT}`);
});