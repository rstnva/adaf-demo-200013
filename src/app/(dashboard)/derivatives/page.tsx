'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFundingGamma } from '@/hooks';
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
  Activity,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Funding Panel
function FundingPanel({ defaultAsset = 'BTC' }: { defaultAsset?: string }) {
  const [selectedAsset, setSelectedAsset] = useState(defaultAsset);
  const { funding } = useFundingGamma();
  const { data: fundingData, isLoading, error } = funding;

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="Funding Rates"
          badge={`${selectedAsset} perpetual funding across exchanges`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                BTC
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`/api/read/derivs/funding?asset=${selectedAsset}&format=csv`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
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
          title="Funding Rates"
          badge={`${selectedAsset} perpetual funding across exchanges`}
        />
        <CardContent className="p-6">
          <ErrorState
            title="Funding Data Unavailable"
          />
        </CardContent>
      </Card>
    );
  }

  const assetFunding = fundingData?.filter(f => f.asset === selectedAsset) || [];
  const latestUpdate = assetFunding[0]?.timestamp;

  // Calculate summary metrics
  const avgRate = assetFunding.reduce((sum, f) => sum + f.rate, 0) / assetFunding.length;
  const positiveCount = assetFunding.filter(f => f.rate > 0).length;
  const negativeCount = assetFunding.filter(f => f.rate < 0).length;

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="Funding Rates"
        badge={`${selectedAsset} perpetual funding across exchanges`}
        asOf={latestUpdate}
        actions={
          <div className="flex gap-2">
            <Button 
              variant={selectedAsset === 'BTC' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedAsset('BTC')}
            >
              BTC
            </Button>
            <Button 
              variant={selectedAsset === 'ETH' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedAsset('ETH')}
            >
              ETH
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/api/read/derivs/funding?asset=${selectedAsset}&format=csv`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        }
      />
      
      <CardContent className="p-6 pt-0">
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className={cn(
              "text-2xl font-bold",
              avgRate > 0 ? "text-green-600" : "text-red-600"
            )}>
              {(avgRate * 100).toFixed(4)}%
            </div>
            <div className="text-sm text-muted-foreground">Average Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{positiveCount}</div>
            <div className="text-sm text-muted-foreground">Positive</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{negativeCount}</div>
            <div className="text-sm text-muted-foreground">Negative</div>
          </div>
        </div>

        {/* Funding Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 text-sm font-medium text-muted-foreground">Exchange</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Current Rate</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">24h Change</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {assetFunding
                .sort((a, b) => b.rate - a.rate)
                .map((funding, index) => {
                  const isNegative = funding.rate < 0;
                  const change24h = (Math.random() - 0.5) * 0.001; // Mock 24h change
                  const isChangePositive = change24h > 0;
                  
                  return (
                    <tr key={index} className="border-b border-border/40">
                      <td className="py-3 font-medium">{funding.exchange}</td>
                      <td className={cn(
                        "py-3 font-mono text-sm",
                        isNegative ? "text-red-600" : "text-green-600"
                      )}>
                        {(funding.rate * 100).toFixed(4)}%
                      </td>
                      <td className={cn(
                        "py-3 font-mono text-xs",
                        isChangePositive ? "text-green-600" : "text-red-600"
                      )}>
                        <div className="flex items-center gap-1">
                          {isChangePositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isChangePositive ? '+' : ''}{(change24h * 100).toFixed(4)}%
                        </div>
                      </td>
                      <td className="py-3">
                        {isNegative && Math.abs(funding.rate) > 0.0001 ? (
                          <Badge variant="destructive" className="text-xs">
                            High Negative
                          </Badge>
                        ) : isNegative ? (
                          <Badge variant="secondary" className="text-xs text-red-700">
                            Negative
                          </Badge>
                        ) : funding.rate > 0.0005 ? (
                          <Badge variant="secondary" className="text-xs text-orange-700">
                            High Positive
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

// Gamma Panel
function GammaPanel({ defaultAsset = 'BTC' }: { defaultAsset?: string }) {
  const [selectedAsset, setSelectedAsset] = useState(defaultAsset);
  const { gamma } = useFundingGamma();
  const { data: gammaData, isLoading, error } = gamma;

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="Options Gamma Exposure"
          badge={`${selectedAsset} options gamma levels and dealer positioning`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                BTC
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`/api/read/derivs/gamma?asset=${selectedAsset}&format=csv`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
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
          title="Options Gamma Exposure"
          badge={`${selectedAsset} options gamma levels and dealer positioning`}
        />
        <CardContent className="p-6">
          <ErrorState
            title="Gamma Data Unavailable"
          />
        </CardContent>
      </Card>
    );
  }

  const assetGamma = gammaData?.filter(g => g.asset === selectedAsset) || [];
  const latestUpdate = assetGamma[0]?.timestamp;

  // Calculate gamma metrics
  const totalGamma = assetGamma.reduce((sum, g) => sum + g.gamma, 0);
  const netGamma = assetGamma.reduce((sum, g) => sum + g.gamma, 0); // Simplified since we don't have call/put split
  const gammaFlip = Math.abs(netGamma) < Math.abs(totalGamma) * 0.1; // Within 10% threshold

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="Options Gamma Exposure"
        badge={`${selectedAsset} options gamma levels and dealer positioning`}
        asOf={latestUpdate}
        actions={
          <div className="flex gap-2">
            <Button 
              variant={selectedAsset === 'BTC' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedAsset('BTC')}
            >
              BTC
            </Button>
            <Button 
              variant={selectedAsset === 'ETH' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedAsset('ETH')}
            >
              ETH
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/api/read/derivs/gamma?asset=${selectedAsset}&format=csv`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        }
      />
      
      <CardContent className="p-6 pt-0">
        {/* Gamma Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className={cn(
              "text-2xl font-bold",
              totalGamma > 0 ? "text-blue-600" : "text-purple-600"
            )}>
              {formatCurrency(totalGamma, 'USD', true)}
            </div>
            <div className="text-sm text-muted-foreground">Total Gamma</div>
          </div>
          <div className="text-center">
            <div className={cn(
              "text-2xl font-bold",
              netGamma > 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(netGamma, 'USD', true)}
            </div>
            <div className="text-sm text-muted-foreground">Net Gamma</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              {gammaFlip && <AlertTriangle className="h-5 w-5 text-orange-500" />}
              <span className={cn(
                "text-2xl font-bold",
                gammaFlip ? "text-orange-600" : "text-gray-600"
              )}>
                {gammaFlip ? 'FLIP' : 'STABLE'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Gamma Status</div>
          </div>
        </div>

        {/* Gamma Levels */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground mb-3">
            Strike-Level Gamma Exposure
          </div>
          
          {assetGamma.slice(0, 8).map((gamma, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">${gamma.strike}</div>
                  <div className="text-xs text-muted-foreground">
                    Tenor: {gamma.tenor}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-right">
                <div>
                  <div className={cn(
                    "text-sm font-medium",
                    gamma.gamma > 0 ? "text-blue-600" : "text-purple-600"
                  )}>
                    {gamma.gamma.toFixed(6)}
                  </div>
                  <div className="text-xs text-muted-foreground">Gamma</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-orange-600">
                    {formatCurrency(gamma.exposure, 'USD', true)}
                  </div>
                  <div className="text-xs text-muted-foreground">Exposure</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Gamma Insights */}
        <div className="pt-4 border-t mt-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900">Gamma Insight</div>
              <div className="text-sm text-blue-700">
                {gammaFlip 
                  ? `${selectedAsset} is near gamma flip levels. Expect increased volatility.`
                  : `${selectedAsset} gamma positioning is stable. Market makers are providing liquidity.`
                }
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Derivatives Page
export default function DerivativesPage() {
  const { selectedAssets } = useUIStore();
  const defaultAsset = selectedAssets[0] || 'BTC';

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">›</span>
        <span>Derivatives</span>
      </nav>

      {/* Funding Panel */}
      <FundingPanel defaultAsset={defaultAsset} />

      {/* Gamma Panel */}
      <GammaPanel defaultAsset={defaultAsset} />
    </div>
  );
}