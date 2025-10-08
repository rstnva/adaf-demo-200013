'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, TrendingDown, Clock } from 'lucide-react';
import Link from 'next/link';

export function FundingSnapshotCard() {
  // Mock data for funding rates
  const fundingData = [
    { exchange: 'Binance', rate: -0.0125, trend: '48h-' },
    { exchange: 'OKX', rate: -0.0089, trend: '24h-' },
    { exchange: 'Bybit', rate: 0.0045, trend: 'pos' },
    { exchange: 'dYdX', rate: -0.0156, trend: '72h-' }
  ];

  const formatFundingRate = (rate: number) => {
    return `${rate >= 0 ? '+' : ''}${(rate * 100).toFixed(3)}%`;
  };

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Funding Radar
          </CardTitle>
          <Link href="/derivatives">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              Full Panel
            </Button>
          </Link>
        </div>
        <div className="text-sm text-gray-600">
          Last 48-72h snapshot
        </div>
      </CardHeader>
      <CardContent className="adaf-card-content">
        <div className="space-y-3">
          {fundingData.map((item, index) => (
            <div key={item.exchange} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">{item.exchange}</div>
                <div className="text-sm text-gray-600">Perpetual</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-right font-medium ${item.rate < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatFundingRate(item.rate)}
                </div>
                {item.trend.includes('-') && (
                  <Badge className="adaf-badge-severity-red text-xs">
                    {item.trend}
                  </Badge>
                )}
                {item.trend === 'pos' && (
                  <Badge className="adaf-badge-severity-ok text-xs">
                    Positive
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              3 exchanges showing negative funding 48h+
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}