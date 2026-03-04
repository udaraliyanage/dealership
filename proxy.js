const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://frontend:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-api:5001';

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route /api/* to backend
  if (req.url.startsWith('/api/')) {
    req.url = req.url.replace('/api', '');
    proxy.web(req, res, { target: BACKEND_URL });
  } else {
    // Route everything else to frontend
    proxy.web(req, res, { target: FRONTEND_URL });
  }
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('Proxy error: ' + err.message);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Proxy server running on port 3000');
  console.log('Frontend URL:', FRONTEND_URL);
  console.log('Backend URL:', BACKEND_URL);
});
