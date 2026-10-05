# Encoder / Transmitter — Technical Report

## 1. Overview

The **Encoder** is a mobile web application that runs on the driver's
smartphone, mounted on the vehicle's windshield, and acts as a dashcam.
It continuously captures frames from the camera, hashes each frame with
**SHA-256**, and transmits the fingerprints (hashes) to a cloud backend in
real time. Raw video never leaves the device — only the cryptographic
fingerprints are transmitted.

## 2. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Mobile web app (React 18 + TypeScript) | Runs on any phone with a modern browser; no app-store install |
| Camera access | `navigator.mediaDevices.getUserMedia` | W3C standard for camera streams |
| Hashing | Web Crypto API (`crypto.subtle.digest('SHA-256')`) | Native, hardware-accelerated, FIPS 180-4 compliant |
| Frame sampling | HTML5 `<canvas>` + `ImageData` | Universal, no plugins |
| Offline buffer | `localStorage` | Survives page reloads, no server dependency |
| Transport | HTTPS (fetch) | TLS-secured transmission to backend |
| Backend | FastAPI (Python 3.12) | Async I/O, high throughput |
| Cloud DB | Supabase (managed PostgreSQL) | Open-source, real-time, free tier |

## 3. Development Environment Setup

### 3.1 Prerequisites

- **Python 3.11+** — https://www.python.org/downloads/
- **Node.js 20+** — https://nodejs.org/
- **Supabase account** — https://supabase.com (free)
- A **phone** or laptop with a camera

### 3.2 Backend Setup

    cd backend
    python3 -m venv .venv
    source .venv/bin/activate         # Windows: .venv\Scripts\activate
    pip install -r requirements.txt

Create `backend/.env`:

    DATABASE_URL=postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
    CORS_ORIGINS=*

Run the server:

    uvicorn app.main:app --reload --port 8000

API docs at http://localhost:8000/docs

### 3.3 Database Setup (Supabase)

1. Create a new project at supabase.com.
2. In **SQL Editor**, run `backend/sql/schema.sql`.
3. Copy the **Session Pooler** connection string from **Settings → Database**.
4. Prepend `+asyncpg` to the URL scheme.

### 3.4 Frontend Setup

    cd frontend
    npm install
    npm run dev

Open the printed URL (usually http://localhost:5173).

### 3.5 Testing on a Phone

Vite prints a **Network URL** (e.g. `http://192.168.1.10:5173`). Open that
on your phone (same Wi-Fi). Note: browsers require **HTTPS** or **localhost**
for camera access on mobile. To satisfy this, use ngrok:

    ngrok http 5173

Open the resulting `https://...` URL on the phone.

## 4. Implementation

### 4.1 Frame Acquisition

The app requests a video stream via `getUserMedia({ video: { facingMode:
'environment' } })`. Every 1000 ms it draws the current video frame into a
hidden canvas at 64×64 pixels, converts to grayscale (luma =
0.299·R + 0.587·G + 0.114·B), and computes SHA-256 over the grayscale bytes.

Downscaling to 64×64 and grayscale conversion provides **perceptual
stability** (minor noise on the sensor does not change the resulting bytes
significantly) while keeping hashing cheap.

### 4.2 Hash Generation

    const buf = await crypto.subtle.digest('SHA-256', grayBytes);
    const hex = [...new Uint8Array(buf)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

Result: 64-character hexadecimal digest per frame.

### 4.3 Dynamic Transmission

Each hash is POSTed individually to `/api/fingerprints/single` with the
client timestamp and a session UUID. The backend inserts it into the
`fingerprints` table and broadcasts it over WebSocket to any connected
Decoder dashboards.

### 4.4 Network Interruption Handling

- Before each POST, the client checks `navigator.onLine`.
- On failure (offline, timeout, HTTP 5xx), the fingerprint is appended to
  a **localStorage queue**.
- A background timer flushes the queue every 5 s when connectivity
  returns; the `window.online` event triggers an immediate flush.
- HTTP 409 (duplicate) responses are silently dropped — the hash already
  exists in the cloud ledger.

### 4.5 Data Retention

Two rules enforce bounded local storage:
- Any queued entry older than **1 hour** is discarded on write.
- The queue is truncated to the most recent **500 entries**.

Raw frames are never persisted — only hashes, and only in memory until
successfully flushed or expired.

## 5. Why These Choices

| Decision | Justification |
|---|---|
| SHA-256 | Collision-resistant, FIPS-standard, hardware-accelerated in browsers |
| 64×64 grayscale | Cheap, stable, matches the Decoder algorithm |
| 1 frame/second | Balances coverage and bandwidth (~64 bytes/s per driver) |
| localStorage | Zero-dependency persistence across reloads |
| WebSocket | Real-time push without polling |
| Supabase | Open-source, managed, PostgreSQL under the hood |

## 6. Files of Interest

    frontend/src/encoder/CameraEncoder.tsx    — the Encoder UI + logic
    frontend/src/ws.ts                        — WebSocket client
    frontend/src/api.ts                       — REST helpers
    backend/app/routers/fingerprints.py       — /single and /exists endpoints
    backend/app/security.py                   — SHA-256 helper
    backend/sql/schema.sql                    — cloud DB schema

## 7. References

- NIST FIPS 180-4 — Secure Hash Standard
- W3C Media Capture and Streams — getUserMedia
- MDN: SubtleCrypto.digest
- FastAPI documentation
- Supabase documentation
