# Quick Start

## Prerequisites
- Python 3.11+, Node.js 20+, Supabase account

## 1. Database
- Create a Supabase project
- Run `backend/sql/schema.sql` in SQL Editor
- Copy the Session Pooler URI, prepend `+asyncpg`

## 2. Backend
    cd backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

Create `backend/.env`:
    DATABASE_URL=postgresql+asyncpg://YOUR_URI
    CORS_ORIGINS=*

Run:
    uvicorn app.main:app --reload --reload-dir app --port 8000

## 3. Frontend
    cd frontend
    npm install
    npm run dev

Open http://localhost:5173

## 4. Usage
- Encoder tab: Start recording (camera)
- Live Feed: real-time fingerprints
- Verify (single frame): paste descriptor
- Video Verifier: upload video
- Upload .txt: test with `data/sample_frames.txt`
