"use client"
import { useCallback, useEffect, useMemo, useState } from 'react'

type Item = { id:number; key:string; title:string; status:'pass'|'warn'|'fail'; evidenceUrl?:string|null; updatedAt:string; updatedBy?:string|null }

// status badge styles kept inline in table via select; helper omitted to avoid unused lint

export default function CompliancePanel() {
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<'all'|'pass'|'warn'|'fail'>('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    const qs = new URLSearchParams()
    if (status !== 'all') qs.set('status', status)
    if (q) qs.set('q', q)
    const r = await fetch(`/api/read/compliance/checklist?${qs.toString()}`, { cache: 'no-store' })
    if (!r.ok) { setErr('load failed'); setItems([]); setLoading(false); return }
    const json = await r.json()
    setItems(json.items as Item[])
    setLoading(false)
  }, [status, q])
  useEffect(() => { (async()=>{ await load().catch(console.error) })() }, [load])

  const counts = useMemo(() => {
    type C = { total: number; pass: number; warn: number; fail: number }
    return items.reduce<C>((acc, it) => {
      acc.total += 1
      if (it.status === 'pass') acc.pass += 1
      else if (it.status === 'warn') acc.warn += 1
      else acc.fail += 1
      return acc
    }, { total: 0, pass: 0, warn: 0, fail: 0 })
  }, [items])

  const [modal, setModal] = useState<{ open:boolean; key?:string }|null>(null)
  const [evidenceUrl, setEvidenceUrl] = useState('')

  async function attachEvidence(key: string) {
    try {
      const r = await fetch('/api/control/compliance/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { key, evidenceUrl }, actor: 'ui' })
      })
      if (!r.ok) throw new Error('attach failed')
      setModal(null); setEvidenceUrl(''); await load()
    } catch (e) {
      alert('Error adjuntando evidencia')
    }
  }

  async function updateStatus(key: string, next: Item['status']) {
    const prev = items.slice()
    setItems(it => it.map(x => x.key === key ? { ...x, status: next } : x))
    try {
      const r = await fetch('/api/control/compliance/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { key, status: next }, actor: 'ui' })
      })
      if (!r.ok) throw new Error('save failed')
    } catch (e) {
      setItems(prev)
      alert('Error al cambiar estado')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className={`text-xs px-2 py-1 rounded border ${status==='all'?'bg-slate-900 text-white':''}`} onClick={()=>setStatus('all')}>All ({counts.total})</button>
          <button className={`text-xs px-2 py-1 rounded border ${status==='pass'?'bg-slate-900 text-white':''}`} onClick={()=>setStatus('pass')}>Pass ({counts.pass||0})</button>
          <button className={`text-xs px-2 py-1 rounded border ${status==='warn'?'bg-slate-900 text-white':''}`} onClick={()=>setStatus('warn')}>Warn ({counts.warn||0})</button>
          <button className={`text-xs px-2 py-1 rounded border ${status==='fail'?'bg-slate-900 text-white':''}`} onClick={()=>setStatus('fail')}>Fail ({counts.fail||0})</button>
        </div>
        <div className="flex items-center gap-2">
          <input className="border rounded px-2 py-1" placeholder="Buscar key o título" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="text-sm underline" onClick={()=>load()}>Buscar</button>
        </div>
      </div>
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Key</th>
              <th className="text-left p-2">Título</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Evidencia</th>
              <th className="text-left p-2">UpdatedAt</th>
              <th className="text-left p-2">UpdatedBy</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-t">
                <td className="p-2 font-mono">{it.key}</td>
                <td className="p-2">{it.title}</td>
                <td className="p-2">
                  <select className="border rounded px-2 py-1" value={it.status} onChange={(e)=>updateStatus(it.key, e.target.value as Item['status'])}>
                    <option value="pass">pass</option>
                    <option value="warn">warn</option>
                    <option value="fail">fail</option>
                  </select>
                </td>
                <td className="p-2">
                  {it.evidenceUrl ? (
                    <a href={it.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">evidencia</a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-2 whitespace-nowrap">{new Date(it.updatedAt).toLocaleString()}</td>
                <td className="p-2">{it.updatedBy ?? '—'}</td>
                <td className="p-2 text-right">
                  <button className="text-xs underline" onClick={()=>{ setModal({ open:true, key: it.key }); setEvidenceUrl('') }}>Adjuntar evidencia</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="p-2 text-gray-500" colSpan={7}>{loading ? 'Cargando…' : (err ? 'Error' : 'Sin datos')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal?.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white text-black rounded p-4 w-[420px]">
            <h3 className="font-semibold mb-2">Adjuntar evidencia</h3>
            <input className="border rounded px-2 py-1 w-full" placeholder="https://…" value={evidenceUrl} onChange={e=>setEvidenceUrl(e.target.value)} />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={()=>setModal(null)} className="px-3 py-1">Cancelar</button>
              <button onClick={()=> modal?.key && attachEvidence(modal.key)} className="bg-blue-600 text-white px-3 py-1 rounded">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
