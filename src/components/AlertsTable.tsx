"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LineageDrawer } from '@/components/LineageDrawer';

type Row = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  severity?: 'low' | 'med' | 'high' | null;
  resolved: boolean;
  signal?: { id?: string; type?: string; source?: string; title?: string };
};
type Resp = { page: number; limit: number; total: number; pages: number; data: Row[] }

const sevPill = (s?: Row['severity']) => {
  const sev = s || 'med'
  const cls =
    sev === 'high'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
      : sev === 'low'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
  return <span className={`ml-2 text-2xs px-1.5 py-0.5 rounded ${cls}`}>{sev.toUpperCase()}</span>
}

const rowTone = (s?: Row['severity']) =>
  s === 'high' ? 'bg-red-50/40 dark:bg-red-900/10' : s === 'low' ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : 'bg-yellow-50/40 dark:bg-yellow-900/10'

export default function AlertsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState<number>(1)
  const [pages, setPages] = useState<number>(1)
  const [limit, setLimit] = useState<number>(50)
  const [open, setOpen] = useState<"all" | "open" | "ack">("open");
  const [type, setType] = useState<string>("all");
  const [sev, setSev] = useState<'all' | 'low' | 'med' | 'high'>('all')
  const [q, setQ] = useState<string>("");
  const [busy, setBusy] = useState(false);
  
  // Lineage drawer state
  const [lineageDrawer, setLineageDrawer] = useState<{
    open: boolean;
    entity: 'signal' | 'metric' | 'report';
    refId: string;
  }>({
    open: false,
    entity: 'signal',
    refId: ''
  });

  const fetchData = useCallback(async () => {
    setBusy(true);
    const params = new URLSearchParams();
    if (open === "open") params.set("open", "1");
    if (open === "ack") params.set("open", "0");
    if (type !== "all") params.set("type", type);
    if (sev !== 'all') params.set('severity', sev)
    if (q) params.set("q", q);
    params.set('page', String(page))
    params.set('limit', String(limit))
    const r = await fetch(`/api/read/alerts?${params.toString()}`, { cache: "no-store" });
    const j: Resp = await r.json();
    setRows(j.data);
    setPages(j.pages)
    setBusy(false);
  }, [open, type, sev, q, page, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ack = async (id: string) => {
    await fetch(`/api/actions/alerts/${id}/ack`, { method: "POST" });
    fetchData();
  };

  const types = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => r.signal?.type && s.add(r.signal.type));
    return ["all", ...Array.from(s).sort()];
  }, [rows]);

  return (
    <div className="rounded-xl border p-4">
  <div className="flex flex-wrap items-center gap-3 mb-3">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={open}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setOpen(e.target.value as 'all' | 'open' | 'ack')
          }
        >
          <option value="open">Abiertas</option>
          <option value="ack">Reconocidas</option>
          <option value="all">Todas</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm" value={type} onChange={e => setType(e.target.value)}>
          {types.map(a => <option key={a} value={a}>{a.toUpperCase?.() || a}</option>)}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={sev}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSev(e.target.value as 'all' | 'low' | 'med' | 'high')}
        >
          <option value="all">Severidad (todas)</option>
          <option value="high">HIGH</option>
          <option value="med">MED</option>
          <option value="low">LOW</option>
        </select>
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Buscar…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchData()}
        />
        <button onClick={fetchData} className="rounded border px-3 py-1 text-sm">{busy ? "..." : "Refrescar"}</button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams()
              if (open === 'open') params.set('open','1')
              if (open === 'ack') params.set('open','0')
              if (type !== 'all') params.set('type', type)
              if (sev !== 'all') params.set('severity', sev)
              if (q) params.set('q', q)
              window.location.href = `/api/read/alerts.csv?${params.toString()}`
            }}
            className="rounded border px-3 py-1 text-sm"
          >Export CSV</button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="py-2 pr-3">Fecha</th>
              <th className="py-2 pr-3">Tipo</th>
              <th className="py-2 pr-3">Título</th>
              <th className="py-2 pr-3">Mensaje</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={`border-b last:border-0 ${rowTone(r.severity)}`}>
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-3">{r.signal?.type}</td>
                <td className="py-2 pr-3 font-medium">
                  {r.title}
                  {sevPill(r.severity)}
                </td>
                <td className="py-2 pr-3">{r.description}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    {!r.resolved ? (
                      <button onClick={() => ack(r.id)} className="rounded border px-2 py-1 text-xs">ACK</button>
                    ) : (
                      <span className="text-xs opacity-60">OK</span>
                    )}
                    {r.signal?.id && (
                      <button
                        onClick={() => setLineageDrawer({
                          open: true,
                          entity: 'signal',
                          refId: r.signal!.id!
                        })}
                        className="rounded border px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                        title="Ver lineage de la señal"
                      >
                        📊 Lineage
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="py-6 text-center opacity-70" colSpan={5}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs opacity-70">Página {page} de {pages} — {rows.length} resultados (límite {limit})</div>
        <div className="flex items-center gap-2">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded border px-2 py-1 text-xs disabled:opacity-50">← Anterior</button>
          <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Siguiente →</button>
          <select className="border rounded px-1 py-1 text-xs" value={limit} onChange={e=>{ setLimit(Number(e.target.value)); setPage(1); }}>
            {[25,50,100,200].map(n=> <option key={n} value={n}>{n}/pág</option>)}
          </select>
        </div>
      </div>

      {/* Lineage Drawer */}
      <LineageDrawer
        open={lineageDrawer.open}
        onClose={() => setLineageDrawer(prev => ({ ...prev, open: false }))}
        entity={lineageDrawer.entity}
        refId={lineageDrawer.refId}
      />
    </div>
  );
}
