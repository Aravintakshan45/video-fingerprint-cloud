# Video Fingerprint Cloud — Insurance Anti-Fraud System

Cloud-based proof-of-concept that streams SHA-256 fingerprints of
video frames from an in-vehicle camera to a Supabase (PostgreSQL)
backend, plus an insurance-side dashboard for verifying submitted
video integrity.

## Why fingerprints?

Raw dashcam video is huge (~1 GB per 10 min). Uploading 24/7 is
prohibitively expensive. Instead:

1. The phone hashes each video frame with SHA-256 (64 hex chars).
2. Only the hash + timestamp is uploaded to the cloud (a few dozen bytes).
3. The raw video stays on the phone unless an accident occurs.
4. When a driver submits a claim, the insurer re-hashes the submitted
   video and compares against the cloud ledger. Mismatch = tampering.

## Architecture

    React (Vite + TS)  --HTTP-->  FastAPI (Python)  --SQL-->  PostgreSQL
           |                            |                       (Supabase)
           +------WebSocket-------------+

- Frontend (frontend/): React + TypeScript + TailwindCSS. Three tabs:
  upload a session, view the live fingerprint feed, verify a submitted frame.
- Backend (backend/): FastAPI async. Hashing, persistence, WebSocket
  broadcast, verification.
- Database: PostgreSQL hosted on Supabase (managed cloud).

## Setup

### 1) Database (Supabase — free tier)

1. Create a project at https://supabase.com
2. In SQL Editor, paste and run backend/sql/schema.sql.
3. Copy the Connection string (URI) from Settings -> Database.
4. Prepend +asyncpg to the protocol: postgresql+asyncpg://...

### 2) Backend

    cd backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env      # edit DATABASE_URL with your Supabase URI
    uvicorn app.main:app --reload --port 8000

API docs: http://localhost:8000/docs

### 3) Frontend

    cd frontend
    npm install
    npm run dev

Open http://localhost:5173

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET  | /api/health                | Liveness check |
| POST | /api/fingerprints/upload   | Upload .txt, hash, insert, broadcast |
| GET  | /api/fingerprints?limit=N  | Latest N fingerprints |
| POST | /api/fingerprints/verify   | Re-hash and check existence |
| WS   | /ws/fingerprints           | Real-time push to dashboard |

## Security

- SHA-256 per NIST FIPS 180-4.
- TLS on every Supabase connection.
- Pydantic input validation on all requests.
- Parameterized SQL via SQLAlchemy (no injection).
- UNIQUE constraint on frame_hash prevents replay.
- Raw video never leaves the device — only hashes.

## Credits / Reused libraries

- FastAPI — MIT
- Uvicorn — BSD-3
- SQLAlchemy — MIT
- asyncpg — Apache-2.0
- Pydantic — MIT
- React, Vite, TailwindCSS — MIT
- PostgreSQL — PostgreSQL License

## License

Academic project. Not for production use.
