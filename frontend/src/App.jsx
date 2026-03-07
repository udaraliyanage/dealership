import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // --- 1. SESSION INITIALIZATION ---
  useEffect(() => {
    // Check if we already have a session ID in the browser
    let currentSession = sessionStorage.getItem('auto_session');
    
    if (!currentSession) {
      // Create a unique ID like "session_abc123"
      const newId = `session_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('auto_session', newId);
      console.log("🎫 New Session Generated:", newId);
    }
  }, []);

  // Featured cars for the landing page
  const featuredCars = [
    { id: 1, name: "Tesla Model 3", price: "$39,900", img: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=400" },
    { id: 2, name: "Ford F-150", price: "$34,000", img: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=400" },
    { id: 3, name: "BMW X5", price: "$48,000", img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400" }
  ];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // --- 2. CLEAR CHAT FUNCTION ---
  const handleClearChat = () => {
    // Wipe browser session
    sessionStorage.removeItem('auto_session');
    // Generate fresh ID
    const newId = `session_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('auto_session', newId);
    // Clear UI
    setMessages([]);
    console.log("🧹 Memory cleared and new session started.");
  };

  const onSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/chat`, { 
        message: userMsg,
        sessionId: sessionStorage.getItem('auto_session') // No longer needs || 'guest'
      });
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "⚠️ Service busy. Try again soon." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="site-wrapper">
      <nav className="navbar">
        <div className="logo">🚗 AutoHub<span>AI</span></div>
        <div className="nav-links">
          <span>Inventory</span>
          <span>Financing</span>
          <button className="nav-cta" onClick={() => setIsOpen(true)}>Ask AI</button>
        </div>
      </nav>

      {/* Hero & Inventory sections stay the same... */}
      <header className="hero">
        <div className="hero-text">
          <h1>Find your perfect drive, <span>instantly.</span></h1>
          <p>The first AI-powered dealership experience. Just tell us what you need.</p>
          <div className="hero-btns">
            <button className="btn-primary">Browse All</button>
            <button className="btn-secondary" onClick={() => setIsOpen(true)}>Chat with Agent</button>
          </div>
        </div>
      </header>

      <section className="inventory-preview">
        <h2>Featured Inventory</h2>
        <div className="car-grid">
          {featuredCars.map(car => (
            <div key={car.id} className="car-card">
              <img src={car.img} alt={car.name} />
              <div className="car-info">
                <h3>{car.name}</h3>
                <p>{car.price}</p>
                <button onClick={() => setIsOpen(true)}>Inquire</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button className={`fab ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '💬'}
      </button>

      <div className={`chat-container ${isOpen ? 'show' : ''}`}>
        <div className="chat-header">
          <div className="status-dot"></div>
          <div style={{ flex: 1 }}>
            <h4>Concierge AI</h4>
            <p>Always online</p>
          </div>
          {/* Added a Clear button in the header */}
          <button className="clear-btn" onClick={handleClearChat} title="Reset Conversation">🧹</button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="msg ai">How can I help you find a car today?</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>{m.text}</div>
          ))}
          {isTyping && <div className="msg ai typing">AI is thinking...</div>}
          <div ref={scrollRef} />
        </div>

        <div className="chat-input-area">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="Type your budget or car type..."
          />
          <button onClick={onSend}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;