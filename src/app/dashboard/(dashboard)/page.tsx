import { KpiCard } from '@/components/KpiCard'
import GuardrailsHealth from '@/components/GuardrailsHealth'
import ClientDashboard from '@/app/dashboard/(dashboard)/ClientDashboard'
import RiskPanel from '@/components/RiskPanel'
import DerivativesPanel from '@/components/DerivativesPanel'
import DqpPanel from '@/components/DqpPanel'

async function getJSON(path: string) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}${path}`, { cache: 'no-store' })
  if (!r.ok) return null
  return r.json()
}

export default async function DashboardPage() {
  const [nav, alerts7d] = await Promise.all([
    getJSON('/api/read/kpi/nav'),
    getJSON('/api/read/kpi/alerts7d')
  ])
  const navUsd = nav?.navUsd ?? 0
  const navTs = nav?.ts ?? null
  const alertsCount = Array.isArray(alerts7d) ? alerts7d.reduce((s: number, x: { d?: string; c?: number }) => s + Number(x.c || 0), 0) : 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ADAF Dashboard Pro</h1>
      </div>

      {/* KPIs strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="NAV (USD)"
          value={Intl.NumberFormat('en-US', { notation: 'compact' }).format(navUsd)}
          subtitle={navTs ? new Date(navTs).toUTCString() : '—'}
        />
        <KpiCard title="Alertas (últimos 7 días)" value={String(alertsCount)} />
      </div>

      {/* Health & Guardrails */}
      <GuardrailsHealth />

  {/* Risk & Limits Panel */}
  <RiskPanel />

      {/* Derivatives Panel */}
      <DerivativesPanel />

      {/* Data Quality & Pipeline Health */}
      <DqpPanel />

      <ClientDashboard />
    </div>
  )
}