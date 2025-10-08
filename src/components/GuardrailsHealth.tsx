"use client";
import { useEffect, useState } from "react";

type Limit = { key: string; value: number; notes?: string|null };
type M = { key: string; value: number; ts?: string|null };
const nice = (v:number) => Number.isFinite(v) ? Intl.NumberFormat("en-US",{ maximumFractionDigits: 2 }).format(v) : '—';

function statusFor(key:string, lim:number, cur:number) {
  if (!Number.isFinite(cur)) return "warn" as const
  if (key === "LTV") {
    return cur <= lim ? "ok" : "bad"
  }
  if (key === "HF") {
    return cur >= lim ? "ok" : "bad"
  }
  if (key === "slippage") {
    if (cur <= lim) return cur >= lim*0.9 ? "warn":"ok"
    return "bad"
  }
  if (key === "RealYield") {
    if (cur >= lim) return cur <= lim*1.1 ? "warn":"ok"
    return "bad"
  }
  return "ok"
}

export default function GuardrailsHealth() {
  const [limits, setLimits] = useState<Limit[]>([]);
  const [metrics, setMetrics] = useState<M[]>([]);
  const [err, setErr] = useState<string|null>(null);

  useEffect(()=>{ (async()=>{
    try{
      const r = await fetch("/api/read/kpi/limits", { cache: "no-store" });
      const j = await r.json();
      setLimits(j.limits||[]);
      setMetrics(j.metrics||[]);
    }catch(e){
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || "error");
    }
  })() },[]);

  if (err) return <div className="text-red-500 text-sm">Guardrails error: {err}</div>;
  if (!limits.length) return <div className="text-sm opacity-70">Cargando guardrails…</div>;

  const m = Object.fromEntries(metrics.map(x=>[x.key, x.value]));

  const items: Array<{label:string; key:string; lim:number; cur:number|undefined; st:"ok"|"warn"|"bad"}> = [
    { label:"LTV ≤", key:"LTV", lim:(limits.find(l=>l.key==="LTV")?.value ?? 0.35), cur:m["ltv.current"], st:"ok" as const },
    { label:"HF ≥", key:"HF", lim:(limits.find(l=>l.key==="HF")?.value ?? 1.6), cur:m["hf.current"], st:"ok" as const },
    { label:"Slippage ≤", key:"slippage", lim:(limits.find(l=>l.key==="slippage")?.value ?? 0.5), cur:m["slippage.current"], st:"ok" as const },
    { label:"RealYield ≥", key:"RealYield", lim:(limits.find(l=>l.key==="RealYield")?.value ?? 0.6), cur:m["realyield.current"], st:"ok" as const },
  ].map(row => ({ ...row, st: statusFor(row.key, row.lim, row.cur as number) }));

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 font-semibold">Health &amp; Guardrails</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((x)=>(
          <div key={x.key} className={`rounded-lg border p-3 ${x.st==="bad"?"border-red-500/50 bg-red-50 dark:bg-red-950/20":x.st==="warn"?"border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20":"border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20"}`}>
            <div className="text-xs opacity-60">{x.label}</div>
            <div className="text-lg font-semibold">
              {x.key==="LTV" || x.key==="slippage" ? `${nice(x.cur ?? NaN)}` : `${nice(x.cur ?? NaN)}`}
              <span className="text-xs opacity-60 ml-2">limite {x.key==="LTV"||x.key==="slippage"?"≤":"≥"} {nice(x.lim)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs opacity-60">Nota: si no hay métrica runtime para un guardrail, se muestra “warn”.</div>
    </div>
  );
}
