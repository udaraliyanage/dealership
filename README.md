# AI Dealership Website

A modern dealership website with an integrated AI chatbot for vehicle recommendations.

## Features

- **Beautiful Dealership Website** - Professional design showcasing vehicle inventory
- **AI-Powered Chat Widget** - Right-side floating chat for 24/7 customer support
- **Vehicle Catalog** - Browse SUVs, Trucks, and Sedans
- **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **AI Agent**: Mock-based implementation (can be replaced with real LLM)
- **Deployment**: Docker + Vercel (frontend only)

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+

### Run Locally

```bash
docker compose up -d
```

Then open: `http://localhost:3000`

### Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **AI Agent**: http://localhost:8080

## API Endpoints

### Chat
```bash
POST /chat
Content-Type: application/json

{
  "message": "I want an SUV under 20000"
}
```

### Vehicles
```bash
GET /vehicles?type=SUV&maxPrice=20000
```

### Health Check
```bash
GET /health
```

## Deploy to Vercel

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/dealership.git
git push -u origin main
```

### Step 2: Deploy Frontend

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select `frontend` as the root directory
5. Set environment variables:
   - `REACT_APP_API_URL`: Your backend API URL (e.g., `https://your-backend.com`)
6. Click "Deploy"

### Step 3: Deploy Backend (Optional)

Deploy the backend-api to any Node.js hosting service:
- Railway
- Render
- Fly.io
- AWS Lambda + API Gateway
- Heroku (deprecated)

Example for Railway:
```bash
cd backend-api
railway link
railway up
```

### Step 4: Update Frontend Environment

Update the `REACT_APP_API_URL` in Vercel settings to point to your deployed backend.

## Testing

### Test AI Agent Directly
```bash
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want an SUV"}'
```

### Test Backend API
```bash
curl -X POST http://localhost:5001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want a truck under 30000"}'
```

## Architecture

```
┌─────────────────┐
│    Frontend     │ (Vercel)
│   React + Vite  │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Backend API    │ (Your hosting)
│  Node + Express │
└────────┬────────┘
         │ Internal
         ▼
┌─────────────────┐
│  AI Agent       │ (Docker)
│  Node.js + LLM  │
└─────────────────┘
```

## Customization

### Add More Vehicles
Edit `backend-api/server.js` - Update the `vehicles` array

### Customize Colors
Edit `frontend/src/App.css` - Update gradient colors (currently purple/blue)

### Change Company Name
Replace "AutoHub Dealership" with your dealership name in `frontend/src/App.jsx`

## Support

For issues or questions, please create a GitHub issue or contact support.

---

Made with ❤️ for modern dealerships
