import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(n);
const fmtOdo = (n) => new Intl.NumberFormat('en-NZ').format(n) + ' km';

const FUEL_COLORS = {
  Electric: '#22c55e',
  Hybrid: '#3b82f6',
  'Plug-in Hybrid': '#8b5cf6',
  Diesel: '#f59e0b',
  Petrol: '#6b7280',
};

// ─── Vehicle Card ────────────────────────────────────────────────────────────
function VehicleCard({ vehicle, onClick }) {
  const [imgError, setImgError] = useState(false);
  const fuelColor = FUEL_COLORS[vehicle.fuelType] || '#6b7280';

  return (
    <div className="vc" onClick={() => onClick(vehicle)}>
      <div className="vc-img-wrap">
        {imgError ? (
          <div className="vc-img-fallback">
            <span>🚗</span>
          </div>
        ) : (
          <img
            src={vehicle.image}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="vc-img"
            onError={() => setImgError(true)}
          />
        )}
        <span className="vc-badge" style={{ background: fuelColor }}>{vehicle.fuelType}</span>
        <span className="vc-type-badge">{vehicle.type}</span>
      </div>
      <div className="vc-body">
        <div className="vc-year">{vehicle.year}</div>
        <h3 className="vc-title">{vehicle.make} {vehicle.model}</h3>
        <div className="vc-meta">
          <span>{fmtOdo(vehicle.odometer)}</span>
          <span className="vc-dot">·</span>
          <span>{vehicle.transmission}</span>
          <span className="vc-dot">·</span>
          <span>{vehicle.color}</span>
        </div>
        <div className="vc-footer">
          <div className="vc-price">{fmt(vehicle.price)}</div>
          <button className="vc-btn">View Details</button>
        </div>
      </div>
    </div>
  );
}

// ─── Vehicle Detail Modal ────────────────────────────────────────────────────
function VehicleModal({ vehicle, onClose, onChat }) {
  const [imgError, setImgError] = useState(false);
  if (!vehicle) return null;
  const fuelColor = FUEL_COLORS[vehicle.fuelType] || '#6b7280';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-grid">
          <div className="modal-img-wrap">
            {imgError ? (
              <div className="modal-img-fallback"><span>🚗</span></div>
            ) : (
              <img
                src={vehicle.image}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="modal-img"
                onError={() => setImgError(true)}
              />
            )}
            <span className="modal-fuel-badge" style={{ background: fuelColor }}>{vehicle.fuelType}</span>
          </div>
          <div className="modal-content">
            <div className="modal-year">{vehicle.year} · {vehicle.type}</div>
            <h2 className="modal-title">{vehicle.make} {vehicle.model}</h2>
            <div className="modal-price">{fmt(vehicle.price)}</div>
            <p className="modal-desc">{vehicle.description}</p>
            <div className="modal-specs">
              {[
                ['Odometer', fmtOdo(vehicle.odometer)],
                ['Fuel Type', vehicle.fuelType],
                ['Transmission', vehicle.transmission],
                ['Colour', vehicle.color],
              ].map(([label, val]) => (
                <div className="modal-spec" key={label}>
                  <span className="modal-spec-label">{label}</span>
                  <span className="modal-spec-val">{val}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => { onChat(`I'm interested in the ${vehicle.year} ${vehicle.make} ${vehicle.model}`); onClose(); }}>
                Enquire Now
              </button>
              <button className="btn-secondary" onClick={() => { onChat(`I'd like to book a test drive for the ${vehicle.year} ${vehicle.make} ${vehicle.model}`); onClose(); }}>
                Book Test Drive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────
function ChatBubble({ isOpen, onToggle, initialMessage, onInitialConsumed }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let sid = sessionStorage.getItem('auto_session');
    if (!sid) {
      sid = `session_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('auto_session', sid);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (initialMessage && isOpen) {
      sendMessage(initialMessage);
      onInitialConsumed();
    }
  }, [initialMessage, isOpen]);

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim() || isTyping) return;
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setIsTyping(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/chat`, {
        message: msg,
        sessionId: sessionStorage.getItem('auto_session'),
      });
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Connection issue. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    sessionStorage.removeItem('auto_session');
    const newId = `session_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('auto_session', newId);
    setMessages([]);
  };

  return (
    <>
      <button
        className={`chat-fab ${isOpen ? 'chat-fab--open' : ''}`}
        onClick={onToggle}
        aria-label="Toggle AI chat"
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        )}
        {!isOpen && <span className="chat-fab-label">AI Assistant</span>}
      </button>

      <div className={`chat-panel ${isOpen ? 'chat-panel--open' : ''}`}>
        <div className="chat-header">
          <div className="chat-header-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/>
            </svg>
          </div>
          <div className="chat-header-info">
            <div className="chat-header-name">AutoHub AI</div>
            <div className="chat-header-status"><span className="chat-online-dot"></span> Online</div>
          </div>
          <button className="chat-clear-btn" onClick={handleClear} title="New conversation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">🚗</div>
              <p>Hi! I'm your personal vehicle specialist. Tell me your budget or the type of car you're looking for and I'll find your perfect match.</p>
              <div className="chat-suggestions">
                {["Show me SUVs under $50k", "I need a family ute", "Best EV options?"].map(s => (
                  <button key={s} className="chat-suggestion" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg chat-msg--${m.role}`}>
              {m.role === 'ai' && <div className="chat-msg-avatar">AI</div>}
              <div className="chat-msg-bubble">{m.text}</div>
            </div>
          ))}
          {isTyping && (
            <div className="chat-msg chat-msg--ai">
              <div className="chat-msg-avatar">AI</div>
              <div className="chat-msg-bubble chat-typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="chat-input-row">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about any vehicle..."
            className="chat-input"
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitMessage, setChatInitMessage] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState('All');
  const [filterFuel, setFilterFuel] = useState('All');
  const [filterMaxPrice, setFilterMaxPrice] = useState(200000);
  const [filterSearch, setFilterSearch] = useState('');
  const [sortBy, setSortBy] = useState('price-asc');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/vehicles`)
      .then(r => setVehicles(r.data))
      .catch(() => setError('Could not load inventory'))
      .finally(() => setLoading(false));
  }, []);

  const openChat = useCallback((msg) => {
    setChatInitMessage(msg);
    setChatOpen(true);
  }, []);

  const filtered = vehicles
    .filter(v => filterType === 'All' || v.type === filterType)
    .filter(v => filterFuel === 'All' || v.fuelType === filterFuel)
    .filter(v => v.price <= filterMaxPrice)
    .filter(v => {
      if (!filterSearch) return true;
      const q = filterSearch.toLowerCase();
      return `${v.make} ${v.model} ${v.year}`.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'year-desc') return b.year - a.year;
      if (sortBy === 'odo-asc') return a.odometer - b.odometer;
      return 0;
    });

  const types = ['All', 'SUV', 'Sedan', 'Truck'];
  const fuels = ['All', 'Petrol', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric'];

  return (
    <div className="app">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            <span className="nav-logo-icon">◆</span>
            AutoHub
          </a>
          <div className="nav-links">
            <a href="#inventory" className="nav-link">Inventory</a>
            <a href="#" className="nav-link">Finance</a>
            <a href="#" className="nav-link">Sell My Car</a>
            <a href="#" className="nav-link">About</a>
          </div>
          <div className="nav-actions">
            <a href="tel:090012345" className="nav-phone">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
              </svg>
              0900 12345
            </a>
            <button className="btn-chat-nav" onClick={() => setChatOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Chat with AI
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-bg-grad"></div>
        </div>
        <div className="hero-inner">
          <div className="hero-eyebrow">New Zealand's Smartest Dealership</div>
          <h1 className="hero-h1">Find Your Perfect<br /><span className="hero-accent">Drive</span> Today</h1>
          <p className="hero-sub">
            {vehicles.length || 20}+ quality vehicles · AI-powered matching · Instant test drive booking
          </p>
          <div className="hero-search">
            <input
              className="hero-search-input"
              placeholder="Search by make, model or year..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
            />
            <button className="hero-search-btn" onClick={() => document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' })}>
              Search
            </button>
          </div>
          <div className="hero-stats">
            {[['20+', 'Vehicles in stock'], ['5★', 'Google Rating'], ['NZ', 'Based & owned']].map(([n, l]) => (
              <div key={l} className="hero-stat">
                <div className="hero-stat-n">{n}</div>
                <div className="hero-stat-l">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INVENTORY ───────────────────────────────────────────────────── */}
      <section className="inventory" id="inventory">
        <div className="inventory-inner">

          {/* Sidebar filters */}
          <aside className={`filters ${mobileFiltersOpen ? 'filters--open' : ''}`}>
            <div className="filters-header">
              <h3 className="filters-title">Filter Results</h3>
              <button className="filters-close" onClick={() => setMobileFiltersOpen(false)}>✕</button>
            </div>

            <div className="filter-group">
              <label className="filter-label">Vehicle Type</label>
              <div className="filter-pills">
                {types.map(t => (
                  <button key={t} className={`filter-pill ${filterType === t ? 'filter-pill--active' : ''}`} onClick={() => setFilterType(t)}>{t}</button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Fuel Type</label>
              <div className="filter-pills filter-pills--sm">
                {fuels.map(f => (
                  <button key={f} className={`filter-pill ${filterFuel === f ? 'filter-pill--active' : ''}`} onClick={() => setFilterFuel(f)}>{f}</button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                Max Price: <strong>{fmt(filterMaxPrice)}</strong>
              </label>
              <input
                type="range"
                min={30000}
                max={200000}
                step={5000}
                value={filterMaxPrice}
                onChange={e => setFilterMaxPrice(+e.target.value)}
                className="filter-range"
              />
              <div className="filter-range-labels">
                <span>$30k</span>
                <span>$200k+</span>
              </div>
            </div>

            <button
              className="filter-ai-btn"
              onClick={() => { openChat("Help me find the right car"); setMobileFiltersOpen(false); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Let AI Find My Car
            </button>
          </aside>

          {/* Main content */}
          <main className="inventory-main">
            <div className="inventory-toolbar">
              <div className="inventory-count">
                <strong>{filtered.length}</strong> vehicles found
              </div>
              <div className="toolbar-right">
                <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="year-desc">Newest First</option>
                  <option value="odo-asc">Lowest KMs</option>
                </select>
                <button className="mobile-filter-btn" onClick={() => setMobileFiltersOpen(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="18" x2="12" y2="18"/>
                  </svg>
                  Filters
                </button>
              </div>
            </div>

            {loading && (
              <div className="loading-grid">
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card"></div>)}
              </div>
            )}

            {error && (
              <div className="error-state">
                <p>{error}</p>
                <button className="btn-primary" onClick={() => openChat("Show me available vehicles")}>Browse with AI</button>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No vehicles match your filters</h3>
                <p>Try adjusting your search or let our AI find options for you.</p>
                <button className="btn-primary" onClick={() => openChat(`I'm looking for ${filterType !== 'All' ? 'a ' + filterType : 'a car'} with a budget of ${fmt(filterMaxPrice)}`)}>
                  Ask AI for Help
                </button>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="vehicle-grid">
                {filtered.map(v => (
                  <VehicleCard key={v.id} vehicle={v} onClick={setSelectedVehicle} />
                ))}
              </div>
            )}
          </main>
        </div>
      </section>

      {/* ── CTA STRIP ────────────────────────────────────────────────────── */}
      <section className="cta-strip">
        <div className="cta-inner">
          <h2>Not sure what you need?</h2>
          <p>Our AI can search the inventory, estimate trade-ins, and book a test drive — all in one chat.</p>
          <button className="btn-primary btn-lg" onClick={() => openChat("I need help finding the right vehicle")}>
            Start AI Chat
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="nav-logo-icon">◆</span> AutoHub
            <p>New Zealand's AI-powered dealership. Quality vehicles, transparent pricing.</p>
          </div>
          <div className="footer-links">
            <div><strong>Inventory</strong><a href="#">All Vehicles</a><a href="#">SUVs</a><a href="#">Utes</a><a href="#">Sedans</a></div>
            <div><strong>Services</strong><a href="#">Finance</a><a href="#">Trade-In</a><a href="#">Test Drive</a></div>
            <div><strong>Contact</strong><a href="tel:090012345">0900 12345</a><a href="#">Auckland, NZ</a></div>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} AutoHub NZ · Powered by AI
        </div>
      </footer>

      {/* ── MODALS & CHAT ────────────────────────────────────────────────── */}
      {selectedVehicle && (
        <VehicleModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onChat={(msg) => { openChat(msg); }}
        />
      )}

      <ChatBubble
        isOpen={chatOpen}
        onToggle={() => setChatOpen(p => !p)}
        initialMessage={chatInitMessage}
        onInitialConsumed={() => setChatInitMessage(null)}
      />

      {/* Mobile filters overlay */}
      {mobileFiltersOpen && <div className="filters-overlay" onClick={() => setMobileFiltersOpen(false)} />}
    </div>
  );
}
