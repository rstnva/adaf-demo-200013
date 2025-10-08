'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnchain } from '@/hooks';
import { formatCurrency } from '@/lib/utils/numberFormat';
import { CardHeader } from '@/components/common/CardHeader';
import { SkeletonPatterns } from '@/components/common/SkeletonBlock';
import { ErrorState } from '@/components/common/ErrorState';

import { 
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// TVL Heatmap Card with selectable days
function TvlHeatmapCard({ selectableDays = [7, 14, 30], defaultDays = 14 }: { 
  selectableDays?: number[]; 
  defaultDays?: number; 
}) {
  const [selectedDays, setSelectedDays] = useState(defaultDays);
  const { tvlHeatmap } = useOnchain();
  const { data: tvlData, isLoading, error } = tvlHeatmap;

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="TVL Heatmap"
          badge={`Protocol value distribution (${selectedDays}d)`}
          actions={
            <div className="flex gap-1">
              {selectableDays.map(days => (
                <Button key={days} variant="outline" size="sm" disabled>
                  {days}d
                </Button>
              ))}
            </div>
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
          title="TVL Heatmap"
          badge={`Protocol value distribution (${selectedDays}d)`}
        />
        <CardContent className="p-6">
          <ErrorState
            title="TVL Data Unavailable"
          />
        </CardContent>
      </Card>
    );
  }

  const protocolData = tvlData?.slice(0, 12) || [];

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="TVL Heatmap"
        badge={`Protocol value distribution (${selectedDays}d)`}
        asOf={new Date().toISOString()}
        actions={
          <div className="flex gap-1">
            {selectableDays.map(days => (
              <Button 
                key={days} 
                variant={days === selectedDays ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedDays(days)}
              >
                {days}d
              </Button>
            ))}
          </div>
        }
      />
      
      <CardContent className="p-6 pt-0" id="heatmap">
        {/* TVL Heatmap Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {protocolData.map((protocol, index) => {
            const changePct = protocol.change7d; // Use actual 7d change from API
            const isPositive = changePct > 0;
            const intensity = Math.min(Math.abs(changePct) / 10, 1); // Normalize for color intensity
            
            return (
              <div 
                key={index}
                className={cn(
                  "p-3 rounded-lg text-center transition-all hover:scale-105 cursor-pointer",
                  isPositive 
                    ? `bg-green-50 border border-green-200 text-green-800` 
                    : `bg-red-50 border border-red-200 text-red-800`
                )}
                style={{
                  opacity: 0.6 + intensity * 0.4 // Varying opacity based on change
                }}
              >
                <div className="text-xs font-medium truncate">{protocol.protocol}</div>
                <div className="text-sm font-bold">
                  {formatCurrency(protocol.tvl, 'USD', true)}
                </div>
                <div className={cn(
                  "text-xs flex items-center justify-center gap-1",
                  isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(changePct).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {formatCurrency(
                protocolData.reduce((sum, p) => sum + p.tvl, 0), 
                'USD', 
                true
              )}
            </div>
            <div className="text-sm text-muted-foreground">Total TVL</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {protocolData.filter(p => p.tvl > 1000000000).length}
            </div>
            <div className="text-sm text-muted-foreground">$1B+ Protocols</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {protocolData.length}
            </div>
            <div className="text-sm text-muted-foreground">Tracked Protocols</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Stablecoin Flows Card (placeholder with mock endpoint)
function StablecoinFlowsCard() {
  const [days, setDays] = useState(30);
  
  // Mock data - in real implementation would use useOnchain().stablecoinFlows
  const mockStablecoinData = [
    { asset: 'USDT', netFlow7d: 1200000000, netFlow30d: 3400000000 },
    { asset: 'USDC', netFlow7d: -800000000, netFlow30d: 1200000000 },
    { asset: 'DAI', netFlow7d: 150000000, netFlow30d: -200000000 },
    { asset: 'BUSD', netFlow7d: -50000000, netFlow30d: -300000000 }
  ];

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="Stablecoin Flows"
        badge="Net inflows and outflows by stablecoin"
        actions={
          <div className="flex gap-1">
            <Button 
              variant={days === 7 ? "default" : "outline"} 
              size="sm"
              onClick={() => setDays(7)}
            >
              7D
            </Button>
            <Button 
              variant={days === 30 ? "default" : "outline"} 
              size="sm"
              onClick={() => setDays(30)}
            >
              30D
            </Button>
          </div>
        }
      />
      
      <CardContent className="p-6 pt-0" id="stablecoins">
        <div className="space-y-3">
          {mockStablecoinData.map((stable) => {
            const flow = days === 7 ? stable.netFlow7d : stable.netFlow30d;
            const isPositive = flow > 0;
            
            return (
              <div key={stable.asset} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{stable.asset}</div>
                    <div className="text-xs text-muted-foreground">
                      7d: {formatCurrency(stable.netFlow7d, 'USD', true)} | 
                      30d: {formatCurrency(stable.netFlow30d, 'USD', true)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge 
                      variant={isPositive ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        isPositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}
                    >
                      Net {days}d
                    </Badge>
                    <div className={cn(
                      "text-sm font-medium mt-1",
                      isPositive ? "text-green-600" : "text-red-600"
                    )}>
                      {isPositive ? '+' : ''}{formatCurrency(flow, 'USD', true)}
                    </div>
                  </div>
                  
                  {/* Mini Chart Placeholder */}
                  <div className="w-16 h-8 bg-muted rounded flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="pt-4 border-t mt-4">
          <Link href="/onchain#stablecoins" passHref>
            <Button variant="ghost" className="w-full text-sm">
              View More Details
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Real Yield Tile (placeholder linking to MX-1)
function RealYieldTile() {
  // Mock real yield data
  const mockYields = [
    { protocol: 'Lido', apy: 4.2, category: 'Staking' },
    { protocol: 'Aave', apy: 2.8, category: 'Lending' },
    { protocol: 'Compound', apy: 3.1, category: 'Lending' },
    { protocol: 'Uniswap V3', apy: 12.5, category: 'DEX' }
  ];

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="Real Yield Opportunities"
        badge="Sustainable yield across DeFi protocols"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/mx-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              MX-1 Details
            </Link>
          </Button>
        }
      />
      
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mockYields.map((yield_data, index) => (
            <div key={index} className="p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{yield_data.protocol}</div>
                  <div className="text-xs text-muted-foreground">{yield_data.category}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {yield_data.apy.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">APY</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t mt-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Comprehensive real yield analysis available in MX-1 module
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/mx-1">
              <Activity className="h-4 w-4 mr-2" />
              Open MX-1 Dashboard
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Main OnChain Page
export default function OnChainPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">›</span>
        <span>On-Chain</span>
      </nav>

      {/* TVL Heatmap */}
      <TvlHeatmapCard selectableDays={[7, 14, 30]} defaultDays={14} />

      {/* Stablecoin Flows & Real Yield */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StablecoinFlowsCard />
        <RealYieldTile />
      </div>
    </div>
  );
}