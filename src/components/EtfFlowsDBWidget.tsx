"use client";
import { useEffect, useState } from "react";
import { EtfInflowChart } from "@/components/ssv/EtfInflowChart";
import type { HistoricalInflow, EtfType } from "@/lib/ssv";

type Pt = { date: string; dailyNetInflow: number; cumNetInflow: number; totalNetInflow: number };

export function EtfFlowsDBWidget({ asset = "BTC", days = 7, provider = "any" }: { asset?: "BTC"|"ETH"; days?: number; provider?: "any"|"farside"|"sosovalue"; }) {
  const [data, setData] = useState<Pt[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        setErr(null)
        const qs = new URLSearchParams({ asset, days: String(days) });
        if (provider !== "any") qs.set("provider", provider);
        const r = await fetch(`/api/read/etf/flow?${qs.toString()}`, { cache: "no-store" });
        if (!r.ok) throw new Error("read api failed");
        const json = await r.json();
        setData(json as Pt[]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "error";
        setErr(message);
      } finally {
        setLoading(false)
      }
    })();
  }, [asset, days, provider]);

  if (err) return <div className="text-red-500 text-sm">DB inflow error: {err}</div>;
  const type: EtfType = asset === 'BTC' ? 'us-btc-spot' : 'us-eth-spot'
  const inflows = data as unknown as HistoricalInflow[] | null
  return <EtfInflowChart type={type} data={inflows} loading={loading} error={err ? new Error(err) : null} />;
}
