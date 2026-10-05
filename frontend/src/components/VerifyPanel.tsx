import { useState } from "react";
import { verifyFrame } from "../api";
import type { VerifyResponse } from "../types";

export default function VerifyPanel() {
  const [descriptor, setDescriptor] = useState("");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onVerify() {
    if (!descriptor.trim()) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      setResult(await verifyFrame(descriptor));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold mb-2">Verify a submitted frame</h2>
        <p className="text-sm text-slate-400 mb-4">
          Paste the original frame descriptor. The server re-hashes it with SHA-256
          and looks it up in the cloud ledger.
        </p>

        <textarea
          value={descriptor}
          onChange={(e) => setDescriptor(e.target.value)}
          rows={4}
          placeholder="frame_00010_impact_detected"
          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-indigo-500 font-mono text-sm"
        />

        <button
          disabled={!descriptor.trim() || busy}
          onClick={onVerify}
          className="mt-4 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium"
        >
          {busy ? "Verifying..." : "Verify integrity"}
        </button>

        {err && <div className="mt-4 text-rose-400 text-sm">Error: {err}</div>}
      </div>

      {result && (
        <div
          className={`rounded-2xl border p-6 ${
            result.matched
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-rose-500/40 bg-rose-500/10"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{result.matched ? "OK" : "X"}</span>
            <h3 className="text-lg font-semibold">
              {result.matched
                ? "MATCH - the frame is authentic"
                : "NO MATCH - the frame was never fingerprinted"}
            </h3>
          </div>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-slate-400">Submitted hash:</span>{" "}
              <code className="text-emerald-300 break-all">{result.submitted_hash}</code>
            </div>
            {result.record && (
              <>
                <div>
                  <span className="text-slate-400">Session:</span>{" "}
                  <code className="text-slate-200">{result.record.session_id}</code>
                </div>
                <div>
                  <span className="text-slate-400">Registered at:</span>{" "}
                  <code className="text-slate-200">
                    {new Date(result.record.created_at).toLocaleString()}
                  </code>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
