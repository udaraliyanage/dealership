import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // Featured cars for the landing page
  const featuredCars = [
    { id: 1, name: "Tesla Model 3", price: "$39,900", img: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=400" },
    { id: 2, name: "Ford F-150", price: "$34,000", img: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=400" },
    { id: 3, name: "BMW X5", price: "$48,000", img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400" }
  ];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const onSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const { data } = await axios.post('http://localhost:5001/chat', { 
        message: userMsg,
        sessionId: sessionStorage.getItem('auto_session') || 'guest' 
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
      {/* --- LANDING PAGE --- */}
      <nav className="navbar">
        <div className="logo">🚗 AutoHub<span>AI</span></div>
        <div className="nav-links">
          <span>Inventory</span>
          <span>Financing</span>
          <button className="nav-cta" onClick={() => setIsOpen(true)}>Ask AI</button>
        </div>
      </nav>

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

      {/* --- CHATBOT WIDGET --- */}
      <button className={`fab ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '💬'}
      </button>

      <div className={`chat-container ${isOpen ? 'show' : ''}`}>
        <div className="chat-header">
          <div className="status-dot"></div>
          <div>
            <h4>Concierge AI</h4>
            <p>Always online</p>
          </div>
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