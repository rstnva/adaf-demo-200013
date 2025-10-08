export function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="text-sm opacity-60">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <div className="text-xs opacity-60">{subtitle}</div>}
    </div>
  )
}
