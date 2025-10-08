'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { currency, formatDate } from '@/lib/format';
import { CurrentEtfMetrics } from '@/lib/ssv';
import { FarsideEtfFlow } from '@/lib/farside';

interface ReconciliationRow {
  date: string;
  ssv_btc: number;
  farside_btc: number;
  delta_btc: number;
  delta_btc_pct: number;
  ssv_eth: number;
  farside_eth: number;
  delta_eth: number;
  delta_eth_pct: number;
  status: 'OK' | 'DIFF';
}

interface FarsideReconciliationProps {
  ssvMetrics: {
    btc: CurrentEtfMetrics | null;
    eth: CurrentEtfMetrics | null;
  };
  farsideData: FarsideEtfFlow[] | null;
  loading?: boolean;
  error?: Error | null;
}

export function FarsideReconciliation({
  ssvMetrics,
  farsideData,
  loading,
  error
}: FarsideReconciliationProps) {
  const [exportLoading, setExportLoading] = useState(false);
  
  const reconciliationData = useMemo(() => {
    if (!farsideData || (!ssvMetrics.btc && !ssvMetrics.eth)) {
      return [];
    }

    const tolerance = 0.01; // 1% tolerance
    const rows: ReconciliationRow[] = [];
    
    // Get the last 7 days for comparison
    const recentFarside = farsideData.slice(-7);
    
    recentFarside.forEach((farsideDay) => {
      // For demo purposes, we'll use current SSV metrics as daily values
      // In production, this would come from historical SSV daily data
      const ssvBtcFlow = ssvMetrics.btc?.dailyNetInflow.value || 0;
      const ssvEthFlow = ssvMetrics.eth?.dailyNetInflow.value || 0;
      
      // Convert to millions for comparison (Farside is in millions)
      const ssvBtcM = ssvBtcFlow / 1e6;
      const ssvEthM = ssvEthFlow / 1e6;
      
      const deltaBtc = ssvBtcM - farsideDay.btc_flow;
      const deltaEth = ssvEthM - farsideDay.eth_flow;
      
      const deltaBtcPct = Math.abs(farsideDay.btc_flow) > 0 
        ? Math.abs(deltaBtc / farsideDay.btc_flow) 
        : Math.abs(deltaBtc) > 10 ? 1 : 0; // If farside is 0, consider >10M as 100% diff
        
      const deltaEthPct = Math.abs(farsideDay.eth_flow) > 0 
        ? Math.abs(deltaEth / farsideDay.eth_flow) 
        : Math.abs(deltaEth) > 5 ? 1 : 0; // If farside is 0, consider >5M as 100% diff

      const status = (deltaBtcPct <= tolerance && deltaEthPct <= tolerance) ? 'OK' : 'DIFF';
      
      rows.push({
        date: farsideDay.date,
        ssv_btc: ssvBtcM,
        farside_btc: farsideDay.btc_flow,
        delta_btc: deltaBtc,
        delta_btc_pct: deltaBtcPct,
        ssv_eth: ssvEthM,
        farside_eth: farsideDay.eth_flow,
        delta_eth: deltaEth,
        delta_eth_pct: deltaEthPct,
        status
      });
    });
    
    return rows.reverse(); // Most recent first
  }, [ssvMetrics, farsideData]);

  const exportToCsv = async () => {
    setExportLoading(true);
    try {
      const headers = [
        'Date',
        'SSV_BTC_M',
        'Farside_BTC_M',
        'Delta_BTC_M',
        'Delta_BTC_%',
        'SSV_ETH_M', 
        'Farside_ETH_M',
        'Delta_ETH_M',
        'Delta_ETH_%',
        'Status'
      ];
      
      const csvContent = [
        headers.join(','),
        ...reconciliationData.map(row => [
          row.date,
          row.ssv_btc.toFixed(2),
          row.farside_btc.toFixed(2),
          row.delta_btc.toFixed(2),
          (row.delta_btc_pct * 100).toFixed(2),
          row.ssv_eth.toFixed(2),
          row.farside_eth.toFixed(2),
          row.delta_eth.toFixed(2),
          (row.delta_eth_pct * 100).toFixed(2),
          row.status
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `farside-reconciliation-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const diffCount = reconciliationData.filter(row => row.status === 'DIFF').length;
  const totalCount = reconciliationData.length;

  if (error) {
    return (
      <Card className="border-white/10 bg-slate-900/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Farside Reconciliation</h3>
          <Badge variant="destructive">Error</Badge>
        </div>
        <p className="text-sm text-slate-400">{error.message}</p>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-slate-900/80 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Farside Reconciliation</h3>
          <p className="text-sm text-slate-400 mt-1">
            SSV vs Farside ETF flow comparison • {totalCount} days
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {diffCount > 0 && (
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/50">
              <AlertCircle size={12} className="mr-1" />
              {diffCount} diffs
            </Badge>
          )}
          
          <Button
            onClick={exportToCsv}
            disabled={exportLoading || reconciliationData.length === 0}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <Download size={14} className="mr-2" />
            {exportLoading ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-700/50 rounded animate-pulse" />
          ))}
        </div>
      ) : reconciliationData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400">No reconciliation data available</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 text-slate-400 font-medium">Date</th>
                <th className="text-right py-2 text-slate-400 font-medium">SSV BTC</th>
                <th className="text-right py-2 text-slate-400 font-medium">Farside BTC</th>
                <th className="text-right py-2 text-slate-400 font-medium">Δ BTC</th>
                <th className="text-right py-2 text-slate-400 font-medium">SSV ETH</th>
                <th className="text-right py-2 text-slate-400 font-medium">Farside ETH</th>
                <th className="text-right py-2 text-slate-400 font-medium">Δ ETH</th>
                <th className="text-center py-2 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {reconciliationData.map((row) => (
                <tr 
                  key={row.date}
                  className={`border-b border-slate-800/50 ${
                    row.status === 'DIFF' ? 'bg-yellow-500/5' : ''
                  }`}
                >
                  <td className="py-2 text-slate-300 font-mono">
                    {formatDate(row.date)}
                  </td>
                  <td className="py-2 text-right font-mono text-slate-300">
                    {currency(row.ssv_btc * 1e6, 'USD', true)}
                  </td>
                  <td className="py-2 text-right font-mono text-slate-300">
                    {currency(row.farside_btc * 1e6, 'USD', true)}
                  </td>
                  <td className={`py-2 text-right font-mono ${
                    Math.abs(row.delta_btc_pct) > 0.01 ? 'text-yellow-400' : 'text-slate-500'
                  }`}>
                    {currency(row.delta_btc * 1e6, 'USD', true)}
                  </td>
                  <td className="py-2 text-right font-mono text-slate-300">
                    {currency(row.ssv_eth * 1e6, 'USD', true)}
                  </td>
                  <td className="py-2 text-right font-mono text-slate-300">
                    {currency(row.farside_eth * 1e6, 'USD', true)}
                  </td>
                  <td className={`py-2 text-right font-mono ${
                    Math.abs(row.delta_eth_pct) > 0.01 ? 'text-yellow-400' : 'text-slate-500'
                  }`}>
                    {currency(row.delta_eth * 1e6, 'USD', true)}
                  </td>
                  <td className="py-2 text-center">
                    <Badge 
                      variant={row.status === 'OK' ? 'outline' : 'secondary'}
                      className={
                        row.status === 'OK' 
                          ? 'text-green-400 border-green-500/50' 
                          : 'text-yellow-400 border-yellow-500/50'
                      }
                    >
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          <strong>Note:</strong> En cierre diario, prevalecen los datos de Farside si hay diferencia significativa (&gt;1%).
          Los datos mostrados son para investigación únicamente.
        </p>
      </div>
    </Card>
  );
}