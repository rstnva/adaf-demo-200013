"use client"
import { PnlLine } from '@/components/charts/PnlLine'
import { PresetsDrawer } from '@/components/panels/PresetsDrawer'
import { ADAF_SSV_Block } from '@/components/ssv/ADAF_SSV_Block'
import EtfFlowsPanel from '@/components/EtfFlowsPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AlertsLiveList from '@/components/AlertsLiveList'
import EtfComparePanel from '@/components/EtfComparePanel'
import OnchainPanel from '@/components/OnchainPanel'
import PnlBucketsChart from '@/components/PnlBucketsChart'
import PnlBucketsCards from '@/components/PnlBucketsCards'

export default function ClientDashboard() {
  return (
    <>
      {/* Chart and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>PnL Evolution</CardTitle>
            </CardHeader>
            <CardContent>
              <PnlLine />
            </CardContent>
          </Card>
          <div className="mt-6 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>PnL por buckets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <PnlBucketsCards />
                </div>
                <PnlBucketsChart />
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <PresetsDrawer />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ADAF x SoSoValue Section + DB parity panel */}
      <div className="space-y-6 mt-6">
        <ADAF_SSV_Block />
        <EtfFlowsPanel />
        <EtfComparePanel />
        <OnchainPanel />
        <AlertsLiveList />
      </div>
    </>
  )
}
