# Decoder — Technical Report

## 1. Overview

The **Decoder** is the insurance company's web application. Its purpose is
to **verify the integrity** of a video file submitted by a driver after an
accident. It does so by re-computing SHA-256 fingerprints of the video
frames and checking whether those fingerprints exist in the cloud ledger
that was populated by the Encoder in real time.

## 2. Technology Stack

Same stack as the Encoder (shared codebase):
React 18 + TypeScript (Vite), Web Crypto API, FastAPI backend,
Supabase PostgreSQL.

| Component | Purpose |
|---|---|
| `Verify (single frame)` tab | Direct descriptor → hash → lookup |
| `Video Verifier` tab | Full video file → frame-by-frame lookup |
| `Live Feed` tab | WebSocket stream from Encoder |
| FastAPI `/api/fingerprints/verify` | Re-hash a descriptor, check existence |
| FastAPI `/api/fingerprints/exists` | Check existence of a pre-computed hash |

## 3. Development Environment Setup

Identical to the Encoder (same repository). See `ENCODER_REPORT.md` §3.

Quick recap:

    # Backend
    cd backend && source .venv/bin/activate
    uvicorn app.main:app --reload --port 8000

    # Frontend
    cd frontend && npm run dev

Then open the printed frontend URL.

## 4. Integrity Verification Mechanism

### 4.1 The Core Idea

Every frame of the driver's video is reduced to a deterministic fingerprint
that is small (64 bytes in hex) and collision-resistant. The cloud stores
these fingerprints **at the moment the video is captured** — before any
possibility of tampering.

When the insurer later receives a video file, it re-computes the same
fingerprints. If the video is unaltered, every fingerprint matches a row in
the cloud ledger. If even a single frame is edited, its fingerprint changes
completely (avalanche property of SHA-256), and the cloud has no matching
row.

### 4.2 Algorithm Steps — Single Frame

1. Client submits a frame descriptor (the raw text used originally by the
   Encoder, or a canonical representation of the frame).
2. Server computes `h = SHA-256(descriptor)`.
3. Server runs `SELECT 1 FROM fingerprints WHERE frame_hash = h`.
4. If a row exists → **MATCH**. Otherwise → **NO MATCH**.

### 4.3 Algorithm Steps — Video File

1. The user selects an `.mp4` / `.mov` file in the browser.
2. The video is loaded into a hidden `<video>` element and seeked to
   `t = 0, 1, 2, ... N` seconds.
3. At each seek, the current frame is drawn into a 64×64 canvas, converted
   to grayscale (same luma weights as the Encoder), and SHA-256 hashed.
4. Each hash is sent to `/api/fingerprints/exists`.
5. The Decoder displays a per-frame match/mismatch table and computes:

       match_ratio = (# matching frames) / (total frames)

6. Verdict:
   - `match_ratio > 0.5` → **AUTHENTIC**
   - otherwise           → **TAMPERED**

## 5. Reliability of the Proposed Solution

| Property | How it is guaranteed |
|---|---|
| **Collision resistance** | SHA-256 — no known collision attack |
| **Preimage resistance** | SHA-256 — infeasible to reverse |
| **Avalanche effect** | Any change of one pixel flips ~50% of hash bits |
| **Tamper detection** | Any edited frame → hash not in ledger |
| **Replay prevention** | `frame_hash` column has a UNIQUE constraint |
| **Transport security** | HTTPS for all API calls |
| **Storage integrity** | Managed PostgreSQL with atomic commits |
| **Timestamp proof** | Server-side `created_at` recorded by Supabase |

## 6. What the Decoder Detects

- **Fully edited videos** → all frames unmatched → verdict TAMPERED.
- **Partially edited videos** (e.g. cut scenes) → some frames matched,
  others not → match_ratio drops below 0.5 → verdict TAMPERED.
- **Completely unregistered videos** → 0 matches → TAMPERED.
- **Videos captured by the Encoder** → all frames match → AUTHENTIC.

## 7. Justification of Choices

| Choice | Justification |
|---|---|
| SHA-256 over SHA-512 | 256 bits is already infeasible to collide; faster |
| 64×64 grayscale | Matches Encoder's output; robust to minor sensor noise |
| Frame sampling at 1 s | Reduces compute; still catches scene edits |
| 50 % match threshold | Tolerates compression artefacts while catching any significant edit |
| Web Worker not required | FastAPI backend performs lookups; browser just hashes |
| HTTP 409 handling | Duplicate submissions are silently accepted (idempotency) |

## 8. Error Handling and Edge Cases

- **File is not a video** → browser refuses to load → user sees `loading`
  stuck; no crash.
- **Zero-length video** → match_ratio undefined → treated as TAMPERED.
- **Duplicate hash in DB** → the encoder skips the insert (409); the
  verifier sees the first stored row.
- **Backend unreachable** → fetch errors → `matched = false`.
- **Frame decoding fails** → hash `null` → frame skipped.

## 9. Limitations

- The Decoder relies on the cloud ledger being populated by the Encoder.
  Without prior Encoder activity, no video can be verified as AUTHENTIC.
- Compression artefacts between Encoder capture and Decoder re-hash may
  cause false negatives in some scenarios; the 50 % threshold mitigates
  this but does not eliminate it.
- The system assumes the Encoder runs continuously while the vehicle is in
  operation.

## 10. Files of Interest

    frontend/src/decoder/VideoVerifier.tsx   — full video verification UI
    frontend/src/components/VerifyPanel.tsx  — single-frame verification UI
    frontend/src/components/LiveFeed.tsx     — real-time dashboard
    backend/app/routers/fingerprints.py      — /verify and /exists endpoints
    backend/app/security.py                  — SHA-256 helper

## 11. References

- NIST FIPS 180-4 — Secure Hash Standard
- RFC 6234 — US Secure Hash Algorithms
- MDN: SubtleCrypto.digest
- OWASP: Cryptographic Storage Cheat Sheet
