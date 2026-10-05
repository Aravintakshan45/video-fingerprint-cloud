/**
 * MetricsPanel — compare two images using perceptual hashes and distance metrics.
 */
import { useState } from "react";

interface HashResult {
  filename: string;
  hashes: Record<string, string>;
  lengths: Record<string, number>;
}

interface CompareResult {
  file_a: string;
  file_b: string;
  hashes_a: Record<string, string>;
  hashes_b: Record<string, string>;
  results: Record<
    string,
    {
      hamming: number;
      normalized_hamming: number;
      euclidean: number;
      manhattan: number;
      cosine_similarity: number;
      cosine_distance: number;
      matched: boolean;
      threshold: number;
    }
  >;
}

export default function MetricsPanel() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onCompare() {
    if (!fileA || !fileB) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file_a", fileA);
      fd.append("file_b", fileB);
      const r = await fetch("/api/metrics/compare", { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      setResult(await r.json());
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold mb-2">📊 Perceptual Hash Metrics</h2>
        <p className="text-sm text-slate-400 mb-4">
          Upload two images. The backend computes 4 perceptual hashes (aHash,
          dHash, pHash, wHash) for each and returns Hamming, normalized Hamming,
          Euclidean, Manhattan, and Cosine distances.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="rounded-xl border border-slate-800 p-4">
            <span className="block text-sm text-slate-300 mb-2">Image A</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFileA(e.target.files?.[0] ?? null)}
              className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white file:cursor-pointer"
            />
            {fileA && <div className="mt-2 text-xs text-slate-400">{fileA.name}</div>}
          </label>

          <label className="rounded-xl border border-slate-800 p-4">
            <span className="block text-sm text-slate-300 mb-2">Image B</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFileB(e.target.files?.[0] ?? null)}
              className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white file:cursor-pointer"
            />
            {fileB && <div className="mt-2 text-xs text-slate-400">{fileB.name}</div>}
          </label>
        </div>

        <button
          disabled={!fileA || !fileB || busy}
          onClick={onCompare}
          className="mt-5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium"
        >
          {busy ? "Comparing…" : "Compare images"}
        </button>

        {err && <div className="mt-4 text-rose-400 text-sm">Error: {err}</div>}
      </div>

      {result && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 overflow-x-auto">
          <h3 className="text-md font-semibold mb-3">Results</h3>

          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="text-left py-2 pr-3">Algorithm</th>
                <th className="text-left py-2 pr-3">Hamming</th>
                <th className="text-left py-2 pr-3">Norm. Ham.</th>
                <th className="text-left py-2 pr-3">Euclidean</th>
                <th className="text-left py-2 pr-3">Manhattan</th>
                <th className="text-left py-2 pr-3">Cosine sim.</th>
                <th className="text-left py-2 pr-3">Threshold</th>
                <th className="text-left py-2 pr-3">Match?</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.results).map(([algo, r]) => (
                <tr key={algo} className="border-t border-slate-800">
                  <td className="py-2 pr-3 font-mono text-indigo-300">{algo}</td>
                  <td className="py-2 pr-3">{r.hamming}</td>
                  <td className="py-2 pr-3">{r.normalized_hamming.toFixed(3)}</td>
                  <td className="py-2 pr-3">{r.euclidean.toFixed(2)}</td>
                  <td className="py-2 pr-3">{r.manhattan}</td>
                  <td className="py-2 pr-3">{r.cosine_similarity.toFixed(3)}</td>
                  <td className="py-2 pr-3 text-slate-400">≤ {r.threshold}</td>
                  <td className="py-2 pr-3">
                    {r.matched ? (
                      <span className="text-emerald-400">✅ MATCH</span>
                    ) : (
                      <span className="text-rose-400">❌ NO</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <details className="mt-6 text-sm">
            <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
              Show raw hashes
            </summary>
            <div className="mt-3 space-y-3">
              {Object.keys(result.hashes_a).map((algo) => (
                <div key={algo} className="border-t border-slate-800 pt-2">
                  <div className="text-xs font-semibold text-indigo-300 mb-1">{algo}</div>
                  <div className="font-mono text-xs text-slate-400 break-all">
                    A: {result.hashes_a[algo]}
                  </div>
                  <div className="font-mono text-xs text-slate-400 break-all">
                    B: {result.hashes_b[algo]}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
