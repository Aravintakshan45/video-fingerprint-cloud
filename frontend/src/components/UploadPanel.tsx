import { useState } from "react";
import { uploadFile } from "../api";
import StatCard from "./StatCard";
import type { UploadResult } from "../types";

export default function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("driver-session");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onUpload() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      setResult(await uploadFile(file, label));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold mb-4">Upload a driver session (.txt)</h2>
        <p className="text-sm text-slate-400 mb-4">
          One frame descriptor per line. Each line is SHA-256 hashed on the server
          and streamed to PostgreSQL.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <label className="md:col-span-2">
            <span className="block text-sm text-slate-300 mb-1">Session label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-indigo-500"
            />
          </label>

          <label>
            <span className="block text-sm text-slate-300 mb-1">.txt file</span>
            <input
              type="file"
              accept=".txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white file:cursor-pointer"
            />
          </label>
        </div>

        <button
          disabled={!file || busy}
          onClick={onUpload}
          className="mt-5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium"
        >
          {busy ? "Streaming..." : "Stream to cloud"}
        </button>

        {err && <div className="mt-4 text-rose-400 text-sm">Error: {err}</div>}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total lines" value={result.total} />
            <StatCard label="Inserted" value={result.inserted} tone="emerald" />
            <StatCard label="Duplicates" value={result.duplicates} tone="amber" />
            <StatCard label="Failed" value={result.failed} tone="rose" />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-sm text-slate-400 mb-2">
              Session <code className="text-slate-200">{result.session_id}</code>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Frame hash (SHA-256)</th>
                    <th className="text-left py-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {result.fingerprints.map((fp) => (
                    <tr key={fp.id} className="border-t border-slate-800">
                      <td className="py-2 pr-3 text-slate-400">{fp.line_no}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-emerald-300">
                        {fp.frame_hash.slice(0, 24)}...
                      </td>
                      <td className="py-2 text-slate-400 text-xs">
                        {new Date(fp.client_ts).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
