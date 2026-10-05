export default function StatCard({
  label,
  value,
  tone = "indigo",
}: {
  label: string;
  value: number | string;
  tone?: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    indigo: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    rose: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
