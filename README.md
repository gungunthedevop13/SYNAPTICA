# Synaptica

A smart study planner with Kanban, Pomodoro, AI Assistant, and Notes.

## Project Structure

```
synaptica/
├── backend/     → Node/Express/MongoDB API
└── frontend/    → React/Vite app
```

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env    # fill in your values
npm run dev             # runs on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev             # runs on http://localhost:5173
```

### Backend .env values needed
```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=any_long_random_string
CLIENT_URL=http://localhost:5173
```
