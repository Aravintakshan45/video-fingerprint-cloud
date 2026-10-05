import { useEffect, useRef, useState } from "react";
import { connectFingerprintWS } from "../ws";
import { listFingerprints } from "../api";
import type { Fingerprint } from "../types";

const MAX_ROWS = 60;

export default function LiveFeed() {
  const [rows, setRows] = useState<Fingerprint[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // Guard: React 18 Strict Mode double-invokes effects in dev.
    // We only want to open the socket once.
    if (startedRef.current) return;
    startedRef.current = true;

    listFingerprints(MAX_ROWS)
      .then((r) => setRows(r))
      .catch(() => {});

    const ws = connectFingerprintWS((fp) => {
      setRows((prev) => {
        // dedupe by id
        if (prev.some((p) => p.id === fp.id)) return prev;
        return [fp, ...prev].slice(0, MAX_ROWS);
      });
    });
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    return () => {
      // don't close on unmount in Strict Mode — the guard prevents re-open anyway
      // (closing would trigger the exact error we are fixing)
    };
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live fingerprint feed</h2>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            connected
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-rose-500/20 text-rose-300"
          }`}
        >
          {connected ? "WebSocket connected" : "Disconnected"}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/60 text-slate-400 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Frame hash</th>
                <th className="text-left px-4 py-2">Client time</th>
                <th className="text-left px-4 py-2">Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((fp) => (
                <tr
                  key={fp.id}
                  className="border-t border-slate-800 hover:bg-slate-800/40"
                >
                  <td className="px-4 py-2 text-slate-400">{fp.line_no}</td>
                  <td className="px-4 py-2 font-mono text-xs text-emerald-300">
                    {fp.frame_hash}
                  </td>
                  <td className="px-4 py-2 text-slate-400 text-xs">
                    {new Date(fp.client_ts).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2 text-slate-400 text-xs">
                    {new Date(fp.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No fingerprints yet. Upload a session to start the feed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
