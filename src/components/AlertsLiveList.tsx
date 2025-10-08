"use client";
import { useEffect, useState } from "react";

type AlertRow = {
  id: number;
  title: string;
  description?: string;
  message?: string;
  createdAt: string;
  signal?: { agentCode?: string; type?: string; title?: string };
};

export default function AlertsLiveList() {
  const [items, setItems] = useState<AlertRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = new EventSource("/api/stream/alerts");
      es.onmessage = (ev) => {
        try {
          const j = JSON.parse(ev.data) as AlertRow;
          setItems((old) => [j, ...old].slice(0, 50));
        } catch {}
      };
      es.onerror = () => setErr("stream error");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErr(msg || "init error");
    }
    return () => { es?.close() }
  }, []);

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 font-semibold">Alertas (live)</div>
      {err && <div className="text-red-500 text-sm mb-2">{err}</div>}
      {items.length === 0 ? (
        <div className="text-sm opacity-70">Esperando nuevas alertas…</div>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="text-sm">
              <div className="font-medium">
                {a.title || a.description}
                {a.signal?.agentCode && (
                  <span className="opacity-60"> [{a.signal.agentCode}]</span>
                )}
              </div>
              {(a.message || a.description) && (
                <div className="opacity-80">{a.message || a.description}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
