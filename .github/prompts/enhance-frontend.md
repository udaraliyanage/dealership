# Prompt: High-Fidelity Dealership AI Prototype Overhaul (Railway Optimized)

**Role:** Senior Full-Stack Engineer, UX Designer, and AI Integration Expert.
**Context:** I am building a dealership AI prototype to pitch to real-world car dealerships. The goal is to show a "production-ready" website where the AI chatbot is the primary value-add.

## 1. Project Architecture & Constraints
* **Structure:** Monorepo containing a **Frontend** (React/Tailwind), **Backend** (Node.js/Express), and **AI-Agent** (LangGraph.js).
* **Deployment:** Currently hosted on **Railway.app**. The new solution **must** maintain Railway compatibility (handling dynamic `PORT` variables and environment-based API URLs).
* **Orchestration:** Must run locally via the included `docker-compose.yml`.
* **Core Logic:** The LangGraph agent uses tool-calling to interact with the backend `/vehicles` and `/leads` APIs. **Do not break the existing tool-calling logic or API parameters.**

## 2. Requirement: UI/UX Transformation (The "AutoTrader" Look)
* **Visual Standard:** Redesign the frontend to match the professional look and feel of `autotrader.co.nz`. It should look like a premium, trustworthy car marketplace.
* **Mobile-First:** The current UI is broken on mobile. You must fix the layout and responsiveness using Tailwind CSS so it can be demoed on a smartphone.
* **Chatbot Integration:** Implement the chatbot as a modern, floating bubble widget. It must be persistent across all pages and accessible without obstructing the main vehicle gallery.
* **Navigation:** Ensure the "Vehicle Detail" pages are fully functional and render all vehicle data, including images and specs.

## 3. Requirement: Backend & Data Enhancement
* **Realistic Inventory:** Overhaul the `inventory.json` file. Provide 20 realistic vehicle listings (e.g., Ford Ranger, Toyota Hilux, Tesla Model 3).
* **Detailed Fields:** Include: Make, Model, Year, Price, Odometer, Fuel Type, Transmission, and **valid Public Image URLs** (e.g., from Unsplash or public automotive sources).
* **API Stability:** The `/vehicles` API must continue to support search by `type` and `maxPrice` so the LangGraph agent tools continue to function end-to-end.

## 4. Requirement: Railway & Networking
* **Environment Variables:** Ensure the frontend does not have hardcoded URLs. It should use an environment variable (e.g., `VITE_API_URL` or `REACT_APP_BACKEND_URL`) to communicate with the backend.
* **Railway Compatibility:** Ensure the build process is optimized for Railway (Nixpacks/Docker) and handles networking differences between local development and production.

## 5. Success Criteria
* The project runs locally with `docker compose up`.
* The UI looks like a professional dealership site (AutoTrader style).
* The chatbot can successfully search the new inventory and record leads.
* The entire site is fully responsive and looks great on a mobile browser.

**Please provide the updated code for all components, the new inventory.json, and instructions for any new environment variables I need to set in the Railway dashboard.**