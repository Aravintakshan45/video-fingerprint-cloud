import type { Fingerprint, UploadResult, VerifyResponse } from "./types";

const BASE = "/api";

export async function listFingerprints(limit = 50): Promise<Fingerprint[]> {
  const r = await fetch(`${BASE}/fingerprints?limit=${limit}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function uploadFile(file: File, label: string): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("label", label);
  const r = await fetch(`${BASE}/fingerprints/upload`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function verifyFrame(frame_descriptor: string): Promise<VerifyResponse> {
  const r = await fetch(`${BASE}/fingerprints/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frame_descriptor }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
