"use client"
import { useState } from 'react'

export function RunWorkerOnceButton() {
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<unknown>(null)

  const run = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/agents/process', { method: 'POST' })
      const j = await r.json()
      setLast(j)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={run} disabled={busy} className="rounded border px-3 py-1 text-sm hover:bg-accent">
        {busy ? 'Procesando…' : 'Run worker once'}
      </button>
      {last && <code className="text-xs opacity-70">{JSON.stringify(last)}</code>}
    </div>
  )
}
