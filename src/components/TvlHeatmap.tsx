"use client";
import { useEffect, useMemo, useState } from "react";

type Pt = { date: string; chain: string; tvlUsd: number };

function colorFor(v: number, min: number, max: number) {
  if (!Number.isFinite(v) || v <= 0) return "#f1f5f9"; // slate-100
  const lv = Math.log10(v);
  const lmin = Math.log10(Math.max(min, 1));
  const lmax = Math.log10(Math.max(max, 10));
  const t = Math.min(1, Math.max(0, (lv - lmin) / Math.max(1e-6, lmax - lmin)));
  // blue scale 50 -> 600
  const r = Math.round(30 + 20 * t);
  const g = Math.round(64 + 80 * t);
  const b = Math.round(175 + 50 * t);
  return `rgb(${r},${g},${b})`;
}

export default function TvlHeatmap({ days = 14 }: { days?: number }) {
  const [data, setData] = useState<Pt[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/read/onchain/tvl-heatmap?days=${days}`, { cache: "no-store" });
        if (!r.ok) throw new Error("read failed");
        const j = (await r.json()) as Pt[];
        setData(j);
        setErr(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  const by = useMemo(() => {
    const chains = Array.from(new Set(data.map(d => d.chain))).sort();
    const dates = Array.from(new Set(data.map(d => d.date))).sort();
    const index = new Map<string, number>();
    let min = Infinity, max = 0;
    for (const d of data) {
      index.set(`${d.chain}|${d.date}`, d.tvlUsd);
      if (d.tvlUsd > 0) {
        min = Math.min(min, d.tvlUsd);
        max = Math.max(max, d.tvlUsd);
      }
    }
    return { chains, dates, index, min: isFinite(min) ? min : 1, max: isFinite(max) ? max : 10 };
  }, [data]);

  if (loading) return <div className="text-sm opacity-70">Cargando heatmap…</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;
  if (!by.dates.length) return <div className="text-sm opacity-70">Sin datos</div>;

  return (
    <div className="w-full overflow-auto">
      <div className="text-sm font-semibold mb-2">TVL Heatmap (últimos {days} días)</div>
      <div className="inline-block">
        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${by.dates.length}, 20px)` }}>
          <div />
          {by.dates.map(d => (
            <div key={d} className="text-[10px] text-center opacity-70 rotate-45 origin-left translate-x-2">{d.slice(5)}</div>
          ))}
          {by.chains.map(chain => (
            <>
              <div key={chain+':label'} className="text-xs pr-2 py-1 whitespace-nowrap">{chain}</div>
              {by.dates.map(date => {
                const v = by.index.get(`${chain}|${date}`) ?? 0;
                const bg = colorFor(v, by.min, by.max);
                const title = `${chain} ${date}: $${Intl.NumberFormat('en-US',{notation:'compact'}).format(v)}`;
                return <div key={`${chain}|${date}`} title={title} className="w-5 h-5 border border-white/40" style={{ backgroundColor: bg }} />
              })}
            </>
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs opacity-60">Escala logarítmica por color; apunta para ver el valor exacto.</div>
    </div>
  );
}
