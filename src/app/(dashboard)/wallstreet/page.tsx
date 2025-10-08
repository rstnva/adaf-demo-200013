"use client";
// Página principal de Wall Street Pulse (WSP)
// Monta el grid de widgets drag & drop

import { WallStreetPulseGrid } from '@/components/dashboard/wsp/WallStreetPulseGrid';
import { useRBAC } from '@/contexts/DashboardLayoutContext';
import { useFeatureFlag } from '../../../lib/featureFlags';
import { wspI18n } from '@/components/dashboard/wsp/utils/i18n';

export default function WallStreetPulsePage() {
  const { hasPermission } = useRBAC();
  const wspEnabled = useFeatureFlag('FF_WSP_ENABLED');

  if (!wspEnabled || !hasPermission('feature:wsp')) {
    return (
      <div className="p-8 text-center text-gray-500">
        {wspI18n['wsp.rbac.denied']}
      </div>
    );
  }

  return (
    <main className="wsp-main p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">{wspI18n['wsp.title']}</h1>
      <WallStreetPulseGrid />
    </main>
  );
}
