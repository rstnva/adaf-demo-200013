"use client"
import React, { useCallback, useEffect, useState } from 'react'
import { RunWorkerOnceButton } from '@/components/RunWorkerOnceButton'

type Limit = { key: string; value: number; notes: string | null; createdAt?: string; updatedAt?: string }
type Rule = { id: string; agentCode: string; name: string; expr: unknown; enabled: boolean; createdAt?: string }
type ChangeRow = { id: string; actor: string; entity: string; entityId: string; field: string; old: unknown; new: unknown; at: string }

export default function ControlPage() {
  const [limits, setLimits] = useState<Limit[]>([])
  const [saving, setSaving] = useState(false)
  const [rules, setRules] = useState<Rule[]>([])
  const [agentFilter, setAgentFilter] = useState<string>('')
  const [newRule, setNewRule] = useState<{ agentCode: string; name: string; expr: string; enabled: boolean }>({ agentCode: '', name: '', expr: '{"kind":"keyword","field":"news.title","anyOf":["hack","exploit"],"severity":"high"}', enabled: true })
  const [audit, setAudit] = useState<ChangeRow[]>([])
  const [auditEntity, setAuditEntity] = useState<string>('')
  const [toast, setToast] = useState<string>('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadLimits = useCallback(async () => {
    const res = await fetch('/api/control/limits', { cache: 'no-store' })
    const data = await res.json()
    setLimits(data as Limit[])
  }, [])
  const loadRules = useCallback(async () => {
    const url = agentFilter ? `/api/control/rules?agentCode=${encodeURIComponent(agentFilter)}` : '/api/control/rules'
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    setRules(data as Rule[])
  }, [agentFilter])
  const loadAudit = useCallback(async () => {
    const url = auditEntity ? `/api/read/audit?entity=${encodeURIComponent(auditEntity)}` : '/api/read/audit'
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    setAudit(data as ChangeRow[])
  }, [auditEntity])

  useEffect(() => { loadLimits().catch(console.error) }, [loadLimits])
  useEffect(() => { loadRules().catch(console.error) }, [loadRules])
  useEffect(() => { loadAudit().catch(console.error) }, [loadAudit])

  const onChangeLimit = (idx: number, patch: Partial<Limit>) => {
    setLimits(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  const onSaveLimit = async (row: Limit) => {
    try {
      setSaving(true)
      const res = await fetch('/api/control/limits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: row.key, value: Number(row.value), notes: row.notes ?? undefined, actor: 'ui' })
      })
      if (!res.ok) throw new Error('save failed')
      await loadLimits()
      showToast(`Guardado ${row.key}`)
    } catch (e) {
      showToast('Error al guardar límite')
    } finally { setSaving(false) }
  }

  const onCreateRule = async () => {
    try {
      const parsed = JSON.parse(newRule.expr)
      const res = await fetch('/api/control/rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRule, expr: parsed, actor: 'ui' })
      })
      if (!res.ok) throw new Error('create failed')
      setNewRule({ agentCode: '', name: '', expr: '{"kind":"keyword","field":"news.title","anyOf":["hack","exploit"],"severity":"high"}', enabled: true })
      await loadRules()
      showToast('Regla creada')
    } catch (e) {
      showToast('Expr inválida o error al crear')
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Panel de Control</h1>
        <div className="flex items-center gap-3">
          <a href="/control/compliance" className="text-sm underline">Cumplimiento</a>
          <RunWorkerOnceButton />
        </div>
      </div>
      {!!toast && (
        <div className="mb-4 rounded bg-green-100 text-green-800 px-3 py-2 text-sm">{toast}</div>
      )}

      {/* Guardrails */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Guardrails (Limits)</h2>
          <button className="text-sm underline" onClick={() => loadLimits()}>Refrescar</button>
        </div>
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Key</th>
                <th className="text-left p-2">Value</th>
                <th className="text-left p-2">Notes</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {limits.map((l, i) => (
                <tr key={l.key} className="border-t">
                  <td className="p-2 font-mono">{l.key}</td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-32" type="number" step="0.0001" value={l.value} onChange={e => onChangeLimit(i, { value: Number(e.target.value) })} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-full" value={l.notes ?? ''} onChange={e => onChangeLimit(i, { notes: e.target.value })} /></td>
                  <td className="p-2 text-right"><button disabled={saving} onClick={() => onSaveLimit(l)} className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50">Guardar</button></td>
                </tr>
              ))}
              {limits.length === 0 && (
                <tr><td className="p-2 text-gray-500" colSpan={4}>Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reglas */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Reglas</h2>
          <div className="flex items-center gap-2">
            <input placeholder="Filtrar por agentCode (p.ej. NM-1)" className="border rounded px-2 py-1" value={agentFilter} onChange={e => setAgentFilter(e.target.value)} />
            <button className="text-sm underline" onClick={() => loadRules()}>Refrescar</button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded p-3">
            <h3 className="font-semibold mb-2">Nueva regla</h3>
            <div className="flex flex-col gap-2">
              <input placeholder="agentCode (NM-1, OC-1, OP-X)" className="border rounded px-2 py-1" value={newRule.agentCode} onChange={e => setNewRule({ ...newRule, agentCode: e.target.value })} />
              <input placeholder="name" className="border rounded px-2 py-1" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} />
              <label className="text-xs text-gray-600">Expr (JSON)</label>
              <textarea rows={6} className="border rounded px-2 py-1 font-mono" value={newRule.expr} onChange={e => setNewRule({ ...newRule, expr: e.target.value })} />
              <div className="flex items-center gap-2">
                <input id="enabled" type="checkbox" checked={newRule.enabled} onChange={e => setNewRule({ ...newRule, enabled: e.target.checked })} />
                <label htmlFor="enabled">Enabled</label>
              </div>
              <button onClick={onCreateRule} className="bg-green-600 text-white px-3 py-1 rounded">Crear regla</button>
            </div>
          </div>
          <div className="border rounded p-3 overflow-x-auto">
            <h3 className="font-semibold mb-2">Listado</h3>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Agent</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Enabled</th>
                  <th className="text-left p-2">Expr</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2 font-mono">{r.agentCode}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.enabled ? 'yes' : 'no'}</td>
                    <td className="p-2"><pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">{JSON.stringify(r.expr, null, 2)}</pre></td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr><td className="p-2 text-gray-500" colSpan={4}>Sin reglas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Auditoría */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Auditoría</h2>
          <div className="flex items-center gap-2">
            <input placeholder="entity (Limit|Rule)" className="border rounded px-2 py-1" value={auditEntity} onChange={e => setAuditEntity(e.target.value)} />
            <button className="text-sm underline" onClick={() => loadAudit()}>Refrescar</button>
          </div>
        </div>
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">At</th>
                <th className="text-left p-2">Actor</th>
                <th className="text-left p-2">Entity</th>
                <th className="text-left p-2">Field</th>
                <th className="text-left p-2">Old</th>
                <th className="text-left p-2">New</th>
              </tr>
            </thead>
            <tbody>
              {audit.map(a => (
                <tr key={a.id} className="border-t align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(a.at).toLocaleString()}</td>
                  <td className="p-2">{a.actor}</td>
                  <td className="p-2">{a.entity}:{a.entityId}</td>
                  <td className="p-2">{a.field}</td>
                  <td className="p-2 max-w-sm"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(a.old, null, 2)}</pre></td>
                  <td className="p-2 max-w-sm"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(a.new, null, 2)}</pre></td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr><td className="p-2 text-gray-500" colSpan={6}>Sin cambios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
