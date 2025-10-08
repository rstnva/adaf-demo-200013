'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEtfFlows, useFundingGamma } from '@/hooks';
import { formatCurrency } from '@/lib/utils/numberFormat';
import { CardHeader } from '@/components/common/CardHeader';
import { SkeletonPatterns } from '@/components/common/SkeletonBlock';
import { ErrorState } from '@/components/common/ErrorState';
import { useUIStore } from '@/store/ui';
import { 
  TrendingUp,
  TrendingDown,
  Download,
  BarChart3,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ETF Autoswitch Card as Hero variant
function EtfAutoswitchHero({ showAssetPicker = false }: { showAssetPicker?: boolean }) {
  const { flows } = useEtfFlows();
  const { data: flowsData, isLoading, error, refetch } = flows;
  const { selectedAssets } = useUIStore();

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="ETF Market Overview"
          badge="Real-time ETF flows and market movements"
        />
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonPatterns.MetricValue />
            <SkeletonPatterns.MetricValue />
            <SkeletonPatterns.MetricValue />
          </div>
          <div className="mt-6">
            <SkeletonPatterns.Table />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="ETF Market Overview"
          badge="Real-time ETF flows and market movements"
        />
        <CardContent className="p-6">
          <ErrorState
            title="ETF Market Data Unavailable"
            onRetry={refetch}
          />
        </CardContent>
      </Card>
    );
  }

  const topFlows = flowsData?.slice(0, 8) || [];
  const totalFlowUsd = topFlows.reduce((sum, etf) => sum + Math.abs(etf.flowsUsd), 0);

  const getFlowIndicator = (flowUsd: number) => {
    if (flowUsd > 0) return { icon: TrendingUp, color: 'text-green-500' };
    return { icon: TrendingDown, color: 'text-red-500' };
  };

  const getFlowSignal = (flowUsd: number): 'BUY' | 'SELL' | null => {
    if (Math.abs(flowUsd) < 1000000) return null; // Less than 1M USD
    return flowUsd > 0 ? 'BUY' : 'SELL';
  };

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="ETF Market Overview"
        badge="Real-time ETF flows and market movements"
        asOf={flowsData?.[0]?.date}
        actions={
          <div className="flex gap-2">
            {showAssetPicker && (
              <Button variant="outline" size="sm">
                Asset Filter
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/api/read/etf/flow?asset=${selectedAssets[0] || 'BTC'}&days=14&format=csv`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        }
      />
      
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Total Flow */}
          <div className="text-center">
            <div className="text-3xl font-bold">
              {formatCurrency(totalFlowUsd, 'USD', true)}
            </div>
            <div className="text-sm text-muted-foreground">Total Flow (24h)</div>
          </div>
          
          {/* Active ETFs */}
          <div className="text-center">
            <div className="text-3xl font-bold">{topFlows.length}</div>
            <div className="text-sm text-muted-foreground">Active ETFs</div>
          </div>
          
          {/* Market Sentiment */}
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {topFlows.filter(etf => etf.flowsUsd > 0).length}/{topFlows.length}
            </div>
            <div className="text-sm text-muted-foreground">Positive Flows</div>
          </div>
        </div>

        {/* ETF Flow Table */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground mb-3">
            Top ETF Flows
          </div>
          
          {topFlows.map((etf, index) => {
            const { icon: FlowIcon, color } = getFlowIndicator(etf.flowsUsd);
            const signal = getFlowSignal(etf.flowsUsd);
            
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
                          className={cn(
                            "text-xs",
                            signal === 'BUY' ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'
                          )}
                        >
                          {signal}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Provider: {etf.provider}
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
      </CardContent>
    </Card>
  );
}

// ETF Compare Panel (7D BTC vs ETH)
function EtfComparePanel({ defaultMode = 'daily' }: { defaultMode?: 'daily' | 'cumulative' }) {
  console.log('Compare mode:', defaultMode); // TODO: Implement mode switching
  const { flows } = useEtfFlows();
  const { data: flowsData, isLoading } = flows;

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="BTC vs ETH Comparison (7D)"
          badge="Daily and cumulative flow comparison"
        />
        <CardContent className="p-6">
          <SkeletonPatterns.Table />
        </CardContent>
      </Card>
    );
  }

  // Mock comparison data - in real implementation this would be separate API
  const btcFlows = flowsData?.filter(f => f.symbol && f.symbol.includes('BTC')).slice(0, 7) || [];
  const ethFlows = flowsData?.filter(f => f.symbol && f.symbol.includes('ETH')).slice(0, 7) || [];

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="BTC vs ETH Comparison (7D)"
        badge="Daily and cumulative flow comparison"
        asOf={flowsData?.[0]?.date}
        actions={
          <Button variant="outline" size="sm">
            Toggle Mode
          </Button>
        }
      />
      
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              BTC ETF Flows
            </h4>
            <div className="space-y-2">
              {btcFlows.map((flow, i) => (
                <div key={i} className="flex justify-between p-2 rounded bg-muted/30">
                  <span className="text-sm">{flow.symbol}</span>
                  <span className={cn("text-sm font-medium", flow.flowsUsd > 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(flow.flowsUsd, 'USD', true)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              ETH ETF Flows
            </h4>
            <div className="space-y-2">
              {ethFlows.map((flow, i) => (
                <div key={i} className="flex justify-between p-2 rounded bg-muted/30">
                  <span className="text-sm">{flow.symbol}</span>
                  <span className={cn("text-sm font-medium", flow.flowsUsd > 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(flow.flowsUsd, 'USD', true)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Funding Table
function FundingTable({ asset = 'BTC', days = 14 }: { asset?: string; days?: number }) {
  const { funding } = useFundingGamma();
  const { data: fundingData, isLoading, error } = funding;

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="Funding Rates"
          badge={`${asset} funding across exchanges (${days}d)`}
          actions={
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/api/read/derivs/funding?asset=${asset}&days=${days}&format=csv`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          }
        />
        <CardContent className="p-6">
          <SkeletonPatterns.Table />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="Funding Rates"
          badge={`${asset} funding across exchanges (${days}d)`}
        />
        <CardContent className="p-6">
          <ErrorState
            title="Funding Data Unavailable"
          />
        </CardContent>
      </Card>
    );
  }

  const assetFunding = fundingData?.filter(f => f.asset === asset) || [];

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="Funding Rates"
        badge={`${asset} funding across exchanges (${days}d)`}
        asOf={assetFunding[0]?.timestamp}
        actions={
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`/api/read/derivs/funding?asset=${asset}&days=${days}&format=csv`)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />
      
      <CardContent className="p-6 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 text-sm font-medium text-muted-foreground">Exchange</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Latest</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">14D Spark</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {assetFunding
                .sort((a, b) => b.rate - a.rate)
                .map((funding, index) => {
                const isNegative = funding.rate < 0;
                const isNeg48h = funding.rate < 0; // Simplified - would need historical data
                
                return (
                  <tr key={index} className="border-b border-border/40">
                    <td className="py-3 font-medium">{funding.exchange}</td>
                    <td className={cn(
                      "py-3 font-mono text-sm",
                      isNegative ? "text-red-600" : "text-green-600"
                    )}>
                      {(funding.rate * 100).toFixed(4)}%
                    </td>
                    <td className="py-3">
                      <div className="h-6 w-16 bg-muted rounded flex items-center justify-center text-xs">
                        📈 {/* Mock sparkline */}
                      </div>
                    </td>
                    <td className="py-3">
                      {isNegative && isNeg48h ? (
                        <Badge variant="destructive" className="text-xs">
                          Neg 48h+
                        </Badge>
                      ) : isNegative ? (
                        <Badge variant="secondary" className="text-xs text-red-700">
                          Negative
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Normal
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Markets Page
export default function MarketsPage() {
  const { selectedAssets } = useUIStore();

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">›</span>
        <span>Markets</span>
      </nav>

      {/* Hero ETF Autoswitch */}
      <EtfAutoswitchHero showAssetPicker />

      {/* BTC/ETH Comparison */}
      <section id="comparison">
        <EtfComparePanel defaultMode="daily" />
      </section>

      {/* Funding Table */}
      <section id="funding">
        <FundingTable asset={selectedAssets[0] ?? 'BTC'} days={14} />
      </section>
    </div>
  );
}