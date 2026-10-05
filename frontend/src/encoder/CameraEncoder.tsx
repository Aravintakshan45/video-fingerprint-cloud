/**
 * Encoder - mobile camera capture + SHA-256 hashing + streaming.
 */
import { useEffect, useRef, useState, useCallback } from "react";

interface QueuedHash {
  hash: string;
  ts: string;
  sessionId: string;
}

const STORAGE_KEY = "encoder_queue";
const LOCAL_QUEUE_LIMIT = 500;
const FRAME_INTERVAL_MS = 1000;
const RETENTION_MS = 60 * 60 * 1000;

export default function CameraEncoder() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("idle");
  const [sent, setSent] = useState(0);
  const [queued, setQueued] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback((): QueuedHash[] => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  }, []);

  const saveQueue = useCallback((q: QueuedHash[]) => {
    const cutoff = Date.now() - RETENTION_MS;
    const trimmed = q.filter((e) => new Date(e.ts).getTime() >= cutoff).slice(-LOCAL_QUEUE_LIMIT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    setQueued(trimmed.length);
  }, []);

  const enqueue = useCallback((item: QueuedHash) => {
    const q = loadQueue(); q.push(item); saveQueue(q);
  }, [loadQueue, saveQueue]);

  const flushQueue = useCallback(async () => {
    const q = loadQueue();
    if (q.length === 0) return;
    const remaining: QueuedHash[] = [];
    for (const item of q) {
      try {
        const r = await fetch("/api/fingerprints/single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frame_hash: item.hash, client_ts: item.ts, session_id: item.sessionId }),
        });
        if (!r.ok && r.status !== 409) remaining.push(item);
      } catch { remaining.push(item); }
    }
    saveQueue(remaining);
    if (remaining.length < q.length) {
      setSent((s) => s + (q.length - remaining.length));
      setStatus(`flushed ${q.length - remaining.length} queued`);
    }
  }, [loadQueue, saveQueue]);

  useEffect(() => {
    const id = window.setInterval(() => { if (navigator.onLine) flushQueue(); }, 5000);
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    return () => { window.clearInterval(id); window.removeEventListener("online", onOnline); };
  }, [flushQueue]);

  const hashCurrentFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    const W = 64, H = 64;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H).data;
    const gray = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < img.length; i += 4, j++) {
      gray[j] = Math.round(0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]);
    }
    const buf = await crypto.subtle.digest("SHA-256", gray);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setRunning(true); setStatus("capturing");

      intervalRef.current = window.setInterval(async () => {
        const hash = await hashCurrentFrame();
        if (!hash) return;
        const item: QueuedHash = { hash, ts: new Date().toISOString(), sessionId: sessionIdRef.current };
        if (navigator.onLine) {
          try {
            const r = await fetch("/api/fingerprints/single", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ frame_hash: item.hash, client_ts: item.ts, session_id: item.sessionId }),
            });
            if (r.ok) setSent((s) => s + 1);
            else if (r.status !== 409) enqueue(item);
          } catch { enqueue(item); }
        } else { enqueue(item); }
      }, FRAME_INTERVAL_MS);
    } catch (e) { setError(`Camera error: ${String(e)}`); }
  }, [hashCurrentFrame, enqueue]);

  const stop = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false); setStatus("stopped");
  }, []);

  useEffect(() => () => stop(), [stop]);
  useEffect(() => { setQueued(loadQueue().length); }, [loadQueue]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold mb-2">Encoder - Live Camera</h2>
        <p className="text-sm text-slate-400 mb-4">
          Records the road, hashes each frame with SHA-256 every {FRAME_INTERVAL_MS / 1000}s, streams hashes to the cloud. Offline queues locally.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {!running && (<div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Camera off</div>)}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="rounded-xl border border-slate-800 p-4 space-y-3">
            <div><div className="text-xs uppercase text-slate-400">Status</div><div className="text-lg font-mono">{status}</div></div>
            <div><div className="text-xs uppercase text-slate-400">Sent (live)</div><div className="text-lg font-mono text-emerald-300">{sent}</div></div>
            <div><div className="text-xs uppercase text-slate-400">In offline queue</div><div className="text-lg font-mono text-amber-300">{queued}</div></div>
            <div><div className="text-xs uppercase text-slate-400">Session ID</div><div className="text-xs font-mono text-slate-400 break-all">{sessionIdRef.current}</div></div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {!running ? (
            <button onClick={start} className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium">Start recording</button>
          ) : (
            <button onClick={stop} className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium">Stop</button>
          )}
          <button onClick={flushQueue} className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium">Flush queue now</button>
          <button onClick={() => { localStorage.removeItem(STORAGE_KEY); setQueued(0); }} className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">Clear local queue</button>
        </div>
        {error && <div className="mt-4 text-rose-400 text-sm">{error}</div>}
      </div>
    </section>
  );
}
