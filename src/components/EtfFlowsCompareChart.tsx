"use client";
import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

type Pt = { date: string; dailyNetInflow: number; cumNetInflow: number };
type SeriesResp = { BTC: Pt[]; ETH: Pt[] };
type Row = { date: string; btc?: number; eth?: number };

export default function EtfFlowsCompareChart({
  provider = "any",
  days = 7,
  mode = "daily",
}: { provider?: "any" | "farside" | "sosovalue"; days?: number; mode?: "daily" | "cum" }) {
  const [series, setSeries] = useState<SeriesResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ days: String(days) });
        if (provider !== "any") qs.set("provider", provider);
        const r = await fetch(`/api/read/etf/flow2?${qs.toString()}`, { cache: "no-store" });
        if (!r.ok) throw new Error("read api failed");
        const j = (await r.json()) as SeriesResp;
        setSeries(j);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg || "error");
      }
    })();
  }, [provider, days]);

  const data: Row[] = useMemo(() => {
    if (!series) return [];
    const idx = new Map<string, Row>();
    const pick = (p: Pt) => (mode === "daily" ? p.dailyNetInflow : p.cumNetInflow);
    for (const p of series.BTC) idx.set(p.date, { date: p.date, btc: pick(p) });
    for (const q of series.ETH) {
      const row = idx.get(q.date) || { date: q.date };
      row.eth = pick(q);
      idx.set(q.date, row);
    }
    return Array.from(idx.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [series, mode]);

  if (err) return <div className="text-red-500 text-sm">ETF compare error: {err}</div>;
  if (!data.length) return <div className="text-sm opacity-70">Cargando comparativo…</div>;

  const yFmt = (v: number) => `${(v / 1e6).toFixed(0)}M`;
  const ttFmt = (v: unknown) => `${(Number(v) / 1e6).toFixed(1)}M`;

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="font-semibold">ETF Inflows — BTC vs ETH ({mode === "daily" ? "Daily" : "Cumulative"})</div>
        <div className="flex items-center gap-2 text-sm">
          <label>View:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={mode}
            onChange={(e) => {
              // The parent panel can also control this. Inline navigation is a simple fallback.
              const url = new URL(window.location.href)
              url.searchParams.set('mode', e.target.value)
              window.history.replaceState({}, '', url.toString())
            }}
          >
            <option value="daily">Daily</option>
            <option value="cum">Cumulative</option>
          </select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={yFmt} />
          <Tooltip formatter={ttFmt} />
          <Legend />
          <Line type="monotone" dataKey="btc" name={`BTC ${mode}`} dot={false} stroke="#f59e0b" />
          <Line type="monotone" dataKey="eth" name={`ETH ${mode}`} dot={false} stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>
      <div className="text-xs opacity-60 mt-2">
        Unidad: USD {mode === "daily" ? "por día (neto)" : "acumulado en la ventana"}.
      </div>
    </div>
  );
}
