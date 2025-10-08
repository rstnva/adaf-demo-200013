'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKpis } from '@/hooks';
import { formatNumber, formatCurrency } from '@/lib/utils/numberFormat';
import { CardHeader } from '@/components/common/CardHeader';
import { ConceptInfo } from '@/components/common/ConceptInfo';
import { SkeletonPatterns } from '@/components/common/SkeletonBlock';
import { ErrorState } from '@/components/common/ErrorState';
import { 
  DollarSign,
  Activity,
  Shield,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export function KpiStrip() {
  const { 
    nav, 
    alerts, 
    isLoading, 
    error 
  } = useKpis();

  if (isLoading) {
    return (
      <Card className="adaf-card rounded-2xl p-6">
        <CardHeader 
          title="KPIs del Portafolio"
          icon={<Activity className="h-5 w-5" />}
        />
        <CardContent className="adaf-card-content">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <SkeletonPatterns.MetricValue key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="adaf-card rounded-2xl p-6">
        <CardHeader 
          title="KPIs del Portafolio"
          icon={<Activity className="h-5 w-5" />}
        />
        <CardContent className="adaf-card-content">
          <ErrorState 
            title="Error al cargar datos de KPIs"
            error={error}
            onRetry={() => {
              nav.refetch();
              alerts.refetch();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  const navData = nav.data;
  const alertsData = alerts.data;

  return (
    <Card className="adaf-card rounded-2xl p-6">
      <CardHeader 
        title={<span>KPIs del Portafolio <ConceptInfo concept="NAV" /></span>}
        icon={<Activity className="h-5 w-5" />}
        asOf={navData?.asOf}
      />
      <CardContent className="adaf-card-content">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* NAV */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              NAV
            </div>
            <div className="text-2xl font-bold">
              {navData ? formatCurrency(navData.navUsd, 'USD') : '--'}
            </div>
            <div className="text-sm text-muted-foreground">
              USD
            </div>
          </div>

          {/* P&L MXN */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Activity className="h-3 w-3" />
              P&L MXN
            </div>
            <div className="text-2xl font-bold">
              {navData ? formatCurrency(navData.pnlMxn, 'MXN') : '--'}
            </div>
            <div className="text-sm text-muted-foreground">
              Diario
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Shield className="h-3 w-3" />
              Sharpe
            </div>
            <div className="text-2xl font-bold">
              {navData ? navData.sharpe.toFixed(2) : '--'}
            </div>
            <div className="text-sm text-muted-foreground">
              90D
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Activity className="h-3 w-3" />
              Drawdown Máx
            </div>
            <div className="text-2xl font-bold">
              {navData ? formatNumber(navData.maxDrawdown, { style: 'percent' }) : '--'}
            </div>
            <div className="text-sm text-muted-foreground">
              90D
            </div>
          </div>

          {/* Alerts 7D */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Alertas 7D
            </div>
            <div className="text-2xl font-bold">
              {alertsData ? alertsData.count7d : '--'}
            </div>
            {alertsData && alertsData.count7d > 0 && (
              <Link href="/alerts">
                <Badge variant="destructive" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver
                </Badge>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}