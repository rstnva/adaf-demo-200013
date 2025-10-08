'use client';

import { useUIStore } from '@/store/ui';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import EtfAutoswitchCard from '@/components/dashboard/EtfAutoswitchCard';
import { EtfCompareMini } from '@/components/dashboard/EtfCompareMini';
import { FundingSnapshotCard } from '@/components/dashboard/FundingSnapshotCard';
import { TvlHeatmapCard } from '@/components/dashboard/TvlHeatmapCard';
import { NewsRegPanel } from '@/components/dashboard/NewsRegPanel';
import { DqpHealthCard } from '@/components/dashboard/DqpHealthCard';
import { AlertsLiveCard } from '@/components/dashboard/AlertsLiveCard';
import { OpxTopScores } from '@/components/dashboard/OpxTopScores';
import { GuardrailsCard } from '@/components/dashboard/GuardrailsCard';
import { ResearchQuickActions } from '@/components/dashboard/ResearchQuickActions';

export default function DashboardHome() {
  const { getFormattedAsOf } = useUIStore();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">ADAF Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Market Intelligence • Risk Management • Strategy Optimization
        </p>
        <p className="text-xs text-gray-500 font-mono mt-1">
          Last updated: {getFormattedAsOf()}
        </p>
      </div>

      {/* Row 1: Hero KPIs (12 cols) */}
      <div className="adaf-grid">
        <div className="col-span-12">
          <KpiStrip />
        </div>
      </div>

      {/* Row 2: Market Overview - ETF Flows + Comparative */}
      <div className="adaf-grid">
        <div className="col-span-12 lg:col-span-8">
          <EtfAutoswitchCard />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <EtfCompareMini />
        </div>
      </div>

      {/* Row 3: On-chain & TVL */}
      <div className="adaf-grid">
        <div className="col-span-12 md:col-span-4">
          <FundingSnapshotCard />
        </div>
        <div className="col-span-12 md:col-span-8">
          <TvlHeatmapCard />
        </div>
      </div>

      {/* Row 4: News/Reg & DQP Health */}
      <div className="adaf-grid">
        <div className="col-span-12 lg:col-span-8">
          <NewsRegPanel />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <DqpHealthCard />
        </div>
      </div>

      {/* Row 5: Alerts Live & OP-X Highlights */}
      <div className="adaf-grid">
        <div className="col-span-12 lg:col-span-7">
          <AlertsLiveCard />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <OpxTopScores />
        </div>
      </div>

      {/* Row 6: Guardrails (full width) */}
      <div className="adaf-grid">
        <div className="col-span-12">
          <GuardrailsCard />
        </div>
      </div>

      {/* Row 7: Research Quick Actions (full width) */}
      <div className="adaf-grid">
        <div className="col-span-12">
          <ResearchQuickActions />
        </div>
      </div>
    </div>
  );
}