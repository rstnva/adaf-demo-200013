'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Search, Play, Zap, TrendingUp, Target, BarChart3, Activity } from 'lucide-react';
import Link from 'next/link';

import { ConceptInfo } from '@/components/common/ConceptInfo';

interface ResearchPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'backtest' | 'analysis' | 'screening';
  estimatedTime: string;
  parameters: Record<string, unknown>;
}

export function ResearchQuickActions() {
  const [isRunning, setIsRunning] = useState<string | null>(null);

  // Research presets
  const presets: ResearchPreset[] = [
    {
      id: 'momentum-backtest',
      name: 'Momentum Strategy',
      description: 'Cross-asset momentum with risk parity',
      icon: TrendingUp,
      category: 'backtest',
      estimatedTime: '3-5 min',
      parameters: { lookback: 14, rebalance: 'weekly' }
    },
    {
      id: 'mean-reversion',
      name: 'Mean Reversion',
      description: 'BTC/ETH pair trading opportunities',
      icon: Activity,
      category: 'backtest',
      estimatedTime: '2-4 min',
      parameters: { zscore: 2.0, holding: 7 }
    },
    {
      id: 'volatility-surface',
      name: 'Vol Surface Analysis',
      description: 'Options skew and term structure',
      icon: BarChart3,
      category: 'analysis',
      estimatedTime: '1-2 min',
      parameters: { strikes: '0.8-1.2', expiries: '7,14,30' }
    },
    {
      id: 'funding-arbitrage',
      name: 'Funding Arbitrage',
      description: 'Cross-exchange funding opportunities',
      icon: Target,
      category: 'screening',
      estimatedTime: '30s-1min',
      parameters: { minSpread: 0.01, exchanges: 'binance,okx,bybit' }
    },
    {
      id: 'correlation-matrix',
      name: 'Correlation Breakdown',
      description: 'Multi-asset correlation analysis',
      icon: Search,
      category: 'analysis',
      estimatedTime: '1-2 min',
      parameters: { window: 30, assets: 'BTC,ETH,SOL,AVAX' }
    },
    {
      id: 'liquidity-scanner',
      name: 'Liquidity Scanner',
      description: 'Real-time orderbook depth analysis',
      icon: Zap,
      category: 'screening',
      estimatedTime: '15-30s',
      parameters: { depth: 1000000, exchanges: 'tier1' }
    }
  ];

  const handleRunPreset = async (presetId: string) => {
    setIsRunning(presetId);
    
    try {
      // Track UI interaction
      fetch('/api/metrics/ui/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          component: 'ResearchQuickActions',
          action: 'run_preset',
          preset: presetId,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);

      // Simulate research execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would trigger the research execution
      console.log(`Running preset: ${presetId}`);
      
    } catch (error) {
      console.error('Failed to run preset:', error);
    } finally {
      setIsRunning(null);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'backtest': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'analysis': return 'bg-green-100 text-green-800 border-green-200';
      case 'screening': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Research Quick Actions
            <ConceptInfo concept="Research Quick Actions" />
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Play className="h-4 w-4 mr-1" />
              Custom Backtest
            </Button>
            <Link href="/research">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Research Lab
              </Button>
            </Link>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Pre-configured research templates for quick analysis
        </div>
      </CardHeader>
      <CardContent className="adaf-card-content">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const running = isRunning === preset.id;
            
            return (
              <div 
                key={preset.id} 
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{preset.name}</h4>
                      <p className="text-sm text-gray-600">{preset.description}</p>
                    </div>
                  </div>
                </div>

                {/* Category & Time */}
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getCategoryColor(preset.category)}>
                    {preset.category}
                  </Badge>
                  <span className="text-xs text-gray-500">{preset.estimatedTime}</span>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => handleRunPreset(preset.id)}
                  disabled={running || isRunning !== null}
                  size="sm"
                  className="w-full"
                >
                  {running ? (
                    <>
                      <Zap className="h-4 w-4 mr-1 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Global Action */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Custom Research Pipeline</h4>
              <p className="text-sm text-blue-700">Build your own research workflow with advanced parameters</p>
            </div>
            <Link href="/research/builder">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Search className="h-4 w-4 mr-1" />
                Open Builder
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}