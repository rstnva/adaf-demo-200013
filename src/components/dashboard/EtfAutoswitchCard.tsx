
'use client';
import { ConceptInfo } from '@/components/common/ConceptInfo';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEtfFlows } from '@/hooks';
import { formatCurrency } from '@/lib/utils/numberFormat';
import { CardHeader } from '@/components/common/CardHeader';
import { SkeletonPatterns } from '@/components/common/SkeletonBlock';
import { ErrorState } from '@/components/common/ErrorState';
import { 
  ExternalLink,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function EtfAutoswitchCard() {
  const { flows } = useEtfFlows();
  const { data: flowsData, isLoading, error, refetch } = flows;

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title={<span>ETF Autoswitch <ConceptInfo concept="ETF Autoswitch" /></span>}
          badge="Monitoreo de flujos ETF en tiempo real"
        />
        <CardContent className="p-6">
          <SkeletonPatterns.MetricValue />
          <div className="space-y-3 mt-4">
            <SkeletonPatterns.ListItem />
            <SkeletonPatterns.ListItem />
            <SkeletonPatterns.ListItem />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="ETF Autoswitch"
          badge="Monitoreo de flujos ETF en tiempo real"
        />
        <CardContent className="p-6">
          <ErrorState
            title="Datos ETF No Disponibles"
            onRetry={refetch}
          />
        </CardContent>
      </Card>
    );
  }

  if (!flowsData || flowsData.length === 0) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="ETF Autoswitch"
          badge="Monitoreo de flujos ETF en tiempo real"
        />
        <CardContent className="p-6">
          <ErrorState
            variant="minimal"
            title="Sin Datos ETF"
          />
        </CardContent>
      </Card>
    );
  }

  const topFlows = flowsData.slice(0, 5);
  const totalFlowUsd = topFlows.reduce((sum, etf) => sum + Math.abs(etf.flowsUsd), 0);

  const getFlowIndicator = (flowUsd: number) => {
    if (flowUsd > 0) return { icon: TrendingUp, color: 'text-green-500' };
    return { icon: TrendingDown, color: 'text-red-500' };
  };

  const getFlowSignal = (flowUsd: number): 'BUY' | 'SELL' | null => {
    if (Math.abs(flowUsd) < 1000000) return null; // Less than 1M USD
    return flowUsd > 0 ? 'BUY' : 'SELL';
  };

  const getSignalColor = (signal: 'BUY' | 'SELL' | null) => {
    switch (signal) {
      case 'BUY': return 'text-green-700 border-green-200';
      case 'SELL': return 'text-red-700 border-red-200';
      default: return 'text-gray-700 border-gray-200';
    }
  };

  const getRiskLevel = (flowUsd: number): 'LOW' | 'MEDIUM' | 'HIGH' => {
    const absFlow = Math.abs(flowUsd);
    if (absFlow > 50000000) return 'HIGH'; // > 50M USD
    if (absFlow > 10000000) return 'MEDIUM'; // > 10M USD
    return 'LOW';
  };

  const getRiskColor = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="ETF Autoswitch"
        badge="Monitoreo de flujos ETF en tiempo real"
        asOf={flowsData[0]?.date}
        actions={
          <Link href="/etf-flows" passHref>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
      
      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {/* Summary Metrics */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Flujo Total</div>
              <div className="text-2xl font-bold">
                {formatCurrency(totalFlowUsd, 'USD', true)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">ETFs Activos</div>
              <div className="text-2xl font-bold">{topFlows.length}</div>
            </div>
          </div>

          {/* ETF List */}
          <div className="space-y-2">
            {topFlows.map((etf, index) => {
              const { icon: FlowIcon, color } = getFlowIndicator(etf.flowsUsd);
              const signal = getFlowSignal(etf.flowsUsd);
              const riskLevel = getRiskLevel(etf.flowsUsd);
              
              return (
                <div 
                  key={`${etf.symbol}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FlowIcon className={cn("h-4 w-4", color)} />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {etf.symbol}
                        {signal && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getSignalColor(signal))}
                          >
                            {signal}
                          </Badge>
                        )}
                        <Badge 
                          variant="secondary"
                          className={cn("text-xs", getRiskColor(riskLevel))}
                        >
                          {riskLevel}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Proveedor: {etf.provider}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={cn("font-medium", color)}>
                      {etf.flowsUsd > 0 ? '+' : ''}{formatCurrency(etf.flowsUsd, 'USD', true)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      MXN: {formatCurrency(etf.flowsMxn, 'MXN', true)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View All Link */}
          <div className="pt-2 border-t">
            <Link href="/etf-flows" passHref>
              <Button variant="ghost" className="w-full text-sm">
                Ver Todos los Flujos ETF
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}