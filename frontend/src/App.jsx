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
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      // Determine API URL dynamically based on current hostname
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      // If accessed via ngrok, construct the ngrok backend URL
      if (window.location.hostname.includes('ngrok')) {
        // Replace frontend domain with backend domain on port 5001
        apiUrl = `${window.location.protocol}//${window.location.hostname}:5001`;
      }
      
      console.log('API URL:', apiUrl);
      console.log('Current hostname:', window.location.hostname);
      console.log('Sending message:', userInput);
      const response = await axios.post(`${apiUrl}/chat`, { message: userInput }, {
        timeout: 30000
      });
      
      console.log('Response received:', response.data);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: response.data.reply 
      }]);
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'Sorry, I could not process your request. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">🚗 AutoHub Dealership</div>
          <nav>
            <a href="#vehicles">Vehicles</a>
            <a href="#about">About Us</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Find Your Perfect Vehicle</h1>
          <p>Discover our wide selection of quality vehicles at unbeatable prices</p>
        </div>
      </section>

      {/* Vehicles Section */}
      <section id="vehicles" className="vehicles">
        <div className="container">
          <h2>Featured Inventory</h2>
          <div className="vehicle-grid">
            <div className="vehicle-card">
              <div className="vehicle-image suv"></div>
              <h3>SUVs</h3>
              <p>Spacious and comfortable for families</p>
              <button onClick={() => setShowChat(true)}>Browse SUVs</button>
            </div>
            <div className="vehicle-card">
              <div className="vehicle-image truck"></div>
              <h3>Trucks</h3>
              <p>Powerful and reliable workhorses</p>
              <button onClick={() => setShowChat(true)}>Browse Trucks</button>
            </div>
            <div className="vehicle-card">
              <div className="vehicle-image sedan"></div>
              <h3>Sedans</h3>
              <p>Sleek and fuel-efficient</p>
              <button onClick={() => setShowChat(true)}>Browse Sedans</button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <h2>About AutoHub</h2>
          <p>We are committed to providing the best selection of quality vehicles and exceptional customer service. Our AI-powered chat assistant is available 24/7 to help you find your perfect match.</p>
        </div>
      </section>

      {/* Chat Widget */}
      <div className={`chat-widget ${showChat ? 'open' : ''}`}>
        <div className="chat-header">
          <h3>Chat with Our AI Assistant</h3>
          <button className="close-btn" onClick={() => setShowChat(false)}>✕</button>
        </div>
        
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <p>👋 Hi! I'm your AI assistant. Ask me about:</p>
              <ul>
                <li>SUVs, Trucks, or Sedans</li>
                <li>Specific price ranges (e.g., "under 20k")</li>
                <li>Vehicle availability</li>
              </ul>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-bubble">
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message ai">
              <div className="message-bubble loading">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading}>
            {loading ? '...' : '➤'}
          </button>
        </div>
      </div>

      {/* Chat Toggle Button */}
      {!showChat && (
        <button className="chat-toggle" onClick={() => setShowChat(true)}>
          💬
        </button>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2026 AutoHub Dealership. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
