'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, TrendingDown } from 'lucide-react';
import { CurrentEtfMetrics } from '@/lib/ssv';
import { 
  evaluateSemaforo, 
  FundingSign, 
  StablecoinSlope, 
  SemaforoState 
} from '@/lib/signals';

interface SemaforoLAVProps {
  ssvCurrent: CurrentEtfMetrics | null;
  fundingBtcSign?: FundingSign;
  stablecoinMcapSlope?: StablecoinSlope;
  loading?: boolean;
}

export function SemaforoLAV({ 
  ssvCurrent, 
  fundingBtcSign = 'neutro', 
  stablecoinMcapSlope = 'flat',
  loading 
}: SemaforoLAVProps) {
  
  const result = evaluateSemaforo({
    ssvCurrent,
    fundingBtcSign,
    stablecoinMcapSlope
  });

  const getStateConfig = (state: SemaforoState) => {
    switch (state) {
      case 'green':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/50',
          label: 'All Clear'
        };
      case 'yellow':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/50',
          label: 'Caution'
        };
      case 'red':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/50',
          label: 'Alert'
        };
    }
  };

  const config = getStateConfig(result.state);
  const StateIcon = config.icon;

  if (loading) {
    return (
      <Card className="border-white/10 bg-slate-900/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Semáforo LAV</h3>
          <Badge variant="secondary" className="animate-pulse">
            Loading
          </Badge>
        </div>
        <div className="space-y-4">
          <div className="h-16 bg-slate-700/50 rounded animate-pulse" />
          <div className="h-12 bg-slate-700/50 rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-slate-900/80 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Semáforo LAV</h3>
        {result.basisClean && (
          <Badge 
            variant="outline" 
            className="border-blue-500/50 bg-blue-500/20 text-blue-300"
          >
            <TrendingDown size={12} className="mr-1" />
            Basis Clean
          </Badge>
        )}
      </div>

      {/* Main Signal Badge */}
      <div className={`mb-6 rounded-lg p-4 ${config.bgColor} border ${config.borderColor}`}>
        <div className="flex items-center gap-3">
          <StateIcon size={32} className={config.color} />
          <div>
            <p className={`text-xl font-bold ${config.color}`}>
              {config.label}
            </p>
            <p className="text-sm text-slate-300 mt-1">
              Market Signal Status
            </p>
          </div>
        </div>
      </div>

      {/* Current Metrics Summary */}
      {ssvCurrent && (
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Daily Inflow</p>
            <p className={`font-mono font-semibold ${
              ssvCurrent.dailyNetInflow.value >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              ${(ssvCurrent.dailyNetInflow.value / 1e6).toFixed(1)}M
            </p>
          </div>
          <div>
            <p className="text-slate-400">Cumulative</p>
            <p className={`font-mono font-semibold ${
              ssvCurrent.cumulativeNetInflow.value >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              ${(ssvCurrent.cumulativeNetInflow.value / 1e9).toFixed(1)}B
            </p>
          </div>
        </div>
      )}

      {/* Input Signals */}
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium text-slate-300">Input Signals</p>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">BTC Funding</span>
            <Badge 
              variant="outline" 
              className={
                fundingBtcSign === 'positivo' 
                  ? 'text-green-300 border-green-500/50' 
                  : fundingBtcSign === 'negativo'
                  ? 'text-red-300 border-red-500/50'
                  : 'text-slate-300 border-slate-500/50'
              }
            >
              {fundingBtcSign}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Stablecoin Mcap</span>
            <Badge 
              variant="outline"
              className={
                stablecoinMcapSlope === 'up'
                  ? 'text-green-300 border-green-500/50'
                  : stablecoinMcapSlope === 'down'
                  ? 'text-red-300 border-red-500/50'
                  : 'text-slate-300 border-slate-500/50'
              }
            >
              {stablecoinMcapSlope}
            </Badge>
          </div>
        </div>
      </div>

      {/* Active Triggers */}
      {result.triggers.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-300 mb-2">Active Triggers</p>
          <div className="space-y-1">
            {result.triggers.map((trigger, index) => (
              <p key={index} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                {trigger}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="rounded border border-slate-700 bg-slate-800/50 p-3">
        <p className="text-sm font-medium text-slate-300 mb-1">Recommendation</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          {result.recommendation}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          Last updated: {new Date().toLocaleTimeString()} • 
          Experimental signals for research only
        </p>
      </div>
    </Card>
  );
}