'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export function TvlHeatmapCard() {
  // Mock TVL heatmap data
  const tvlData = [
    { protocol: 'Lido', tvl: 28500000000, change7d: 2.3, change30d: 12.1 },
    { protocol: 'EigenLayer', tvl: 15200000000, change7d: 8.7, change30d: 45.2 },
    { protocol: 'AAVE', tvl: 11800000000, change7d: -1.2, change30d: 5.8 },
    { protocol: 'Uniswap V3', tvl: 7900000000, change7d: 4.1, change30d: 8.3 },
    { protocol: 'Maker', tvl: 6100000000, change7d: -0.5, change30d: -2.1 }
  ];

  const formatTvl = (value: number) => {
    return `$${(value / 1e9).toFixed(1)}B`;
  };

  const getCellColor = (change: number) => {
    if (change > 5) return 'bg-green-500';
    if (change > 0) return 'bg-green-300';
    if (change > -5) return 'bg-yellow-300';
    return 'bg-red-300';
  };

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            TVL Heatmap
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">7D</Button>
            <Button variant="ghost" size="sm">14D</Button>
            <Button variant="ghost" size="sm">30D</Button>
            <Link href="/onchain">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Details
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="adaf-card-content">
        <div className="space-y-3">
          {tvlData.map((item) => (
            <div key={item.protocol} className="flex items-center gap-4">
              <div className="min-w-[100px] font-medium">{item.protocol}</div>
              <div className="min-w-[80px] text-right">{formatTvl(item.tvl)}</div>
              <div className="flex gap-2">
                <div 
                  className={`px-3 py-1 rounded text-white text-sm min-w-[60px] text-center ${getCellColor(item.change7d)}`}
                >
                  {item.change7d >= 0 ? '+' : ''}{item.change7d.toFixed(1)}%
                </div>
                <div 
                  className={`px-3 py-1 rounded text-white text-sm min-w-[60px] text-center ${getCellColor(item.change30d)}`}
                >
                  {item.change30d >= 0 ? '+' : ''}{item.change30d.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>&gt;5%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-300 rounded"></div>
            <span>0-5%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-300 rounded"></div>
            <span>0 to -5%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-300 rounded"></div>
            <span>&lt;-5%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}