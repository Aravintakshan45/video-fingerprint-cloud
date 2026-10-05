/**
 * Decoder - verify integrity of a submitted video file.
 */
import { useRef, useState } from "react";

interface FrameResult {
  index: number;
  time: number;
  hash: string;
  matched: boolean | null;
}

export default function VideoVerifier() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<File | null>(null);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<FrameResult[]>([]);
  const [verdict, setVerdict] = useState<"AUTHENTIC" | "TAMPERED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hashFrame(): Promise<string | null> {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
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
  }

  async function checkHash(hash: string): Promise<boolean> {
    const r = await fetch("/api/fingerprints/exists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frame_hash: hash }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    return data.exists === true;
  }

  async function verify() {
    if (!fileRef.current || !videoRef.current) return;
    setError(null); setResults([]); setVerdict(null); setStatus("loading");
    const url = URL.createObjectURL(fileRef.current);
    const video = videoRef.current;
    video.src = url; video.muted = true;
    await new Promise<void>((res) => { video.onloadedmetadata = () => res(); });
    const duration = video.duration;
    const step = 1;
    const totalFrames = Math.floor(duration / step);
    setStatus("hashing");
    const collected: FrameResult[] = [];
    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = i * step;
      await new Promise<void>((res) => { video.onseeked = () => res(); });
      const hash = await hashFrame();
      if (hash) collected.push({ index: i, time: i * step, hash, matched: null });
      setProgress(Math.round(((i + 1) / totalFrames) * 100));
    }
    setStatus("checking");
    for (const item of collected) {
      item.matched = await checkHash(item.hash);
      setResults([...collected]);
    }
    const matched = collected.filter((r) => r.matched).length;
    const ratio = matched / Math.max(collected.length, 1);
    setVerdict(ratio > 0.5 ? "AUTHENTIC" : "TAMPERED");
    setStatus("done");
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold mb-2">Decoder - Verify a video</h2>
        <p className="text-sm text-slate-400 mb-4">
          Upload a video. Every 1s we extract a frame, grayscale, SHA-256, and check existence in the cloud ledger.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <input type="file" accept="video/*"
            onChange={(e) => (fileRef.current = e.target.files?.[0] ?? null)}
            className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white file:cursor-pointer" />
          <button onClick={verify} className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium">Verify video</button>
          <span className="text-sm text-slate-400">Status: {status}</span>
          {status === "hashing" && <span className="text-sm text-slate-400">({progress}%)</span>}
        </div>
        <video ref={videoRef} className="hidden" />
        <canvas ref={canvasRef} className="hidden" />
        {error && <div className="mt-4 text-rose-400 text-sm">{error}</div>}
        {verdict && (
          <div className={`mt-5 rounded-xl border p-4 ${verdict === "AUTHENTIC" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}>
            <div className="text-lg font-semibold">{verdict === "AUTHENTIC" ? "AUTHENTIC" : "TAMPERED"}</div>
            <div className="text-sm text-slate-300 mt-1">{results.filter((r) => r.matched).length} / {results.length} frames matched</div>
          </div>
        )}
        {results.length > 0 && (
          <div className="mt-5 max-h-96 overflow-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/60 text-slate-400 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Time</th>
                  <th className="text-left px-3 py-2">Hash</th>
                  <th className="text-left px-3 py-2">Match</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.index} className="border-t border-slate-800">
                    <td className="px-3 py-2 text-slate-400">{r.index}</td>
                    <td className="px-3 py-2 text-slate-400">{r.time}s</td>
                    <td className="px-3 py-2 font-mono text-xs text-emerald-300">{r.hash.slice(0, 24)}...</td>
                    <td className="px-3 py-2">{r.matched === null ? "..." : r.matched ? "OK" : "NO"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
