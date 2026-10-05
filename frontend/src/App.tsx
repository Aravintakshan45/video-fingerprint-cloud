import { useState } from "react";
import UploadPanel from "./components/UploadPanel";
import LiveFeed from "./components/LiveFeed";
import VerifyPanel from "./components/VerifyPanel";
import MetricsPanel from "./components/MetricsPanel";
import CameraEncoder from "./encoder/CameraEncoder";
import VideoVerifier from "./decoder/VideoVerifier";

export default function App() {
  const [tab, setTab] = useState<
    "encoder" | "video" | "live" | "verify" | "metrics" | "upload"
  >("encoder");

  const tabs: [typeof tab, string][] = [
    ["encoder", "Encoder"],
    ["video", "Video Verifier"],
    ["live", "Live Feed"],
    ["verify", "Verify (single frame)"],
    ["metrics", "Metrics"],
    ["upload", "Upload .txt (test)"],
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">
            Dashcam - Cloud Fingerprint System
          </h1>
          <span className="text-xs text-slate-400">FastAPI + PostgreSQL + React</span>
        </div>
      </header>

      <nav className="max-w-6xl mx-auto px-6 pt-6 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              tab === id
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {tab === "encoder" && <CameraEncoder />}
        {tab === "video" && <VideoVerifier />}
        {tab === "live" && <LiveFeed />}
        {tab === "verify" && <VerifyPanel />}
        {tab === "metrics" && <MetricsPanel />}
        {tab === "upload" && <UploadPanel />}
      </main>
    </div>
  );
}
