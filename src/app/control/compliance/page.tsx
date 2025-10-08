import CompliancePanel from '@/components/CompliancePanel'

export default function CompliancePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Cumplimiento (AML/CTF)</h1>
      </div>
      <CompliancePanel />
    </main>
  )
}
