import AlertsTable from '../../components/AlertsTable'

export const dynamic = 'force-dynamic'

export default function AlertsPage() {
  return (
    <div className="container mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Alertas</h1>
      <AlertsTable />
    </div>
  )
}
