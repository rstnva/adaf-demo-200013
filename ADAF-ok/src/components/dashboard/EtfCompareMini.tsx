'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

export function EtfCompareMini() {
  // Mock data for now
  const compareData = {
    btc: { change7d: 5.2, volume: 1200000000 },
    eth: { change7d: -2.1, volume: 800000000 }
  };

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            BTC vs ETH (7D)
          </CardTitle>
          <Link href="/markets/compare">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              Detailed
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="adaf-card-content space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="font-medium">Bitcoin</span>
            </div>
            <div className="flex items-center gap-2">
              {compareData.btc.change7d >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <Badge className={compareData.btc.change7d >= 0 ? 'adaf-badge-severity-ok' : 'adaf-badge-severity-red'}>
                {compareData.btc.change7d >= 0 ? '+' : ''}{compareData.btc.change7d}%
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="font-medium">Ethereum</span>
            </div>
            <div className="flex items-center gap-2">
              {compareData.eth.change7d >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <Badge className={compareData.eth.change7d >= 0 ? 'adaf-badge-severity-ok' : 'adaf-badge-severity-red'}>
                {compareData.eth.change7d >= 0 ? '+' : ''}{compareData.eth.change7d}%
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="text-sm text-gray-600 mb-2">Volume (24h)</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>BTC</span>
              <span className="font-medium">${(compareData.btc.volume / 1e9).toFixed(1)}B</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>ETH</span>
              <span className="font-medium">${(compareData.eth.volume / 1e9).toFixed(1)}B</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}