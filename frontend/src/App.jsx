import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      // Direct call to your Backend Proxy
      const response = await axios.post('http://localhost:5001/chat', { 
        message: userInput 
      });
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: response.data.reply 
      }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'Connection lost. Is the backend running on 5001?' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Main Dealer Site */}
      <header className="dealer-header">
        <h1>🚗 AutoHub AI</h1>
      </header>
      
      <main className="dealer-main">
        <div className="hero-box">
          <h2>Premium Inventory</h2>
          <p>Talk to our AI to find your next car.</p>
          <button className="cta-btn" onClick={() => setShowChat(true)}>Start Searching</button>
        </div>
      </main>

      {/* The Chat Widget */}
      <div className={`chat-window ${showChat ? 'active' : ''}`}>
        <div className="chat-top">
          <span>AI Dealer Assistant</span>
          <button onClick={() => setShowChat(false)}>✕</button>
        </div>

        <div className="chat-body">
          {messages.length === 0 && (
            <div className="welcome-note">👋 Hi! Ask me for an SUV, Sedan, or Truck under a certain price.</div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role}`}>
              <div className="msg-bubble">{m.text}</div>
            </div>
          ))}
          
          {loading && <div className="msg-row ai"><div className="msg-bubble loading">...</div></div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-footer">
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>

      {!showChat && (
        <button className="floating-icon" onClick={() => setShowChat(true)}>💬</button>
      )}
    </div>
  );
}

export default App;