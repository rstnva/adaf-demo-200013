'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { EtfMetricsCard } from './EtfMetricsCard';
import { EtfInflowChart } from './EtfInflowChart';
import { NewsTicker } from './NewsTicker';
import { SemaforoLAV } from '../signals/SemaforoLAV';
import { FarsideReconciliation } from '../ops/FarsideReconciliation';

import { usePolling } from '@/hooks/usePolling';
import { 
  fetchCurrentEtfMetrics, 
  fetchHistoricalInflow, 
  fetchFeaturedNews,
  EtfType,
  CurrentEtfMetrics,
  HistoricalInflow,
  NewsItem
} from '@/lib/ssv';
import { fetchFarsideEtfFlows, FarsideEtfFlow } from '@/lib/farside';
import { FundingSign, StablecoinSlope } from '@/lib/signals';

const POLLING_INTERVAL = 10 * 60 * 1000; // 10 minutes

interface ADAFSSVState {
  btcMetrics: CurrentEtfMetrics | null;
  ethMetrics: CurrentEtfMetrics | null;
  btcInflows: HistoricalInflow[] | null;
  ethInflows: HistoricalInflow[] | null;
  news: NewsItem[] | null;
  farsideFlows: FarsideEtfFlow[] | null;
  lastUpdate: Date | null;
  isDegraded: boolean;
}

export function ADAF_SSV_Block() {
  const [selectedType, setSelectedType] = useState<EtfType>('us-btc-spot');
  const [state, setState] = useState<ADAFSSVState>({
    btcMetrics: null,
    ethMetrics: null,
    btcInflows: null,
    ethInflows: null,
    news: null,
    farsideFlows: null,
    lastUpdate: null,
    isDegraded: false,
  });

  // Mock placeholder data for funding and stablecoin signals
  const [fundingBtcSign] = useState<FundingSign>('neutro');
  const [stablecoinMcapSlope] = useState<StablecoinSlope>('flat');

  const readApiFallback = useCallback(async (asset: 'BTC'|'ETH', days = 300) => {
    try {
      const r = await fetch(`/api/read/etf/flow?asset=${asset}&days=${Math.min(days, 31)}`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`read api ${r.status}`)
      const json = await r.json() as Array<{ date: string; dailyNetInflow: number; cumNetInflow: number; totalNetInflow: number }>
      return json
    } catch (e) {
      console.warn('ETF read fallback failed:', e)
      return null
    }
  }, [])

  const fetchAllData = useCallback(async (signal?: AbortSignal) => {
    try {
      // Fetch all data in parallel with error handling
      const [
        btcMetricsResult,
        ethMetricsResult,
        btcInflowsResult,
        ethInflowsResult,
        newsResult,
        farsideResult
      ] = await Promise.allSettled([
        fetchCurrentEtfMetrics('us-btc-spot'),
        fetchCurrentEtfMetrics('us-eth-spot'),
        fetchHistoricalInflow('us-btc-spot', 300),
        fetchHistoricalInflow('us-eth-spot', 300),
        fetchFeaturedNews(1, 12),
        fetchFarsideEtfFlows(30)
      ]);

      if (signal?.aborted) return state;

      // Resolve inflows with fallback if primary failed
      let btcInflows = btcInflowsResult.status === 'fulfilled' ? btcInflowsResult.value : state.btcInflows
      let ethInflows = ethInflowsResult.status === 'fulfilled' ? ethInflowsResult.value : state.ethInflows

      if (btcInflowsResult.status === 'rejected') {
        const fb = await readApiFallback('BTC', 300)
        if (fb) {
          btcInflows = fb as unknown as HistoricalInflow[]
        }
      }
      if (ethInflowsResult.status === 'rejected') {
        const fb = await readApiFallback('ETH', 300)
        if (fb) {
          ethInflows = fb as unknown as HistoricalInflow[]
        }
      }

      const newState: ADAFSSVState = {
        btcMetrics: btcMetricsResult.status === 'fulfilled' ? btcMetricsResult.value : state.btcMetrics,
        ethMetrics: ethMetricsResult.status === 'fulfilled' ? ethMetricsResult.value : state.ethMetrics,
        btcInflows,
        ethInflows,
        news: newsResult.status === 'fulfilled' ? newsResult.value : state.news,
        farsideFlows: farsideResult.status === 'fulfilled' ? farsideResult.value : state.farsideFlows,
        lastUpdate: new Date(),
        isDegraded: [btcMetricsResult, ethMetricsResult, btcInflowsResult, ethInflowsResult].some(
          result => result.status === 'rejected'
        ),
      };

      setState(newState);
      return newState;
    } catch (error) {
      console.error('Failed to fetch SSV data:', error);
      // Return degraded state with preserved data
      setState(prevState => ({
        ...prevState,
        isDegraded: true,
        lastUpdate: new Date(),
      }));
      throw error;
    }
  }, [state, readApiFallback]);

  const polling = usePolling(fetchAllData, {
    interval: POLLING_INTERVAL,
    immediate: true,
    enabled: true,
  });

  const currentMetrics = selectedType === 'us-btc-spot' ? state.btcMetrics : state.ethMetrics;
  const currentInflows = selectedType === 'us-btc-spot' ? state.btcInflows : state.ethInflows;

  return (
    <div className="space-y-6" data-testid="adaf-ssv-block">
      {/* Mini-alerta de backoff/circuit breaker */}
      {(polling.circuitOpen || polling.failCount > 0) && (
        <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-xs text-yellow-700">
          <AlertTriangle size={14} className="mr-1" />
          {polling.circuitOpen
            ? `Circuit breaker activo. Reintento en ${polling.nextRetry ? Math.max(0, Math.ceil((polling.nextRetry - Date.now())/1000)) : '?'}s.`
            : `Reintento en ${Math.ceil(polling.backoff/1000)}s (${polling.failCount} fallas)`}
        </div>
      )}
      {/* Header with controls */}
      <Card className="border-white/10 bg-slate-900/80 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">ADAF x SoSoValue</h2>
            <p className="text-sm text-slate-400">
              US ETF flows, signals, and reconciliation
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {state.isDegraded && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500/50">
                <AlertTriangle size={12} className="mr-1" />
                Degraded
              </Badge>
            )}
            
            {state.lastUpdate && (
              <Badge variant="outline" className="text-slate-300">
                Updated: {state.lastUpdate.toLocaleTimeString()}
              </Badge>
            )}
            
            <Select value={selectedType} onValueChange={(value: string) => setSelectedType(value as EtfType)}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us-btc-spot">BTC Spot ETFs</SelectItem>
                <SelectItem value="us-eth-spot">ETH Spot ETFs</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => polling.refresh()}
              disabled={polling.loading}
              variant="outline"
              size="sm"
              className="h-8"
            >
              <RefreshCw size={14} className={`mr-2 ${polling.loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Main ETF Metrics */}
      <EtfMetricsCard
        type={selectedType}
        data={currentMetrics}
        loading={polling.loading}
        error={polling.error}
      />

      {/* Chart and Signals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EtfInflowChart
          type={selectedType}
          data={currentInflows}
          loading={polling.loading}
          error={polling.error}
        />
        
        <SemaforoLAV
          ssvCurrent={currentMetrics}
          fundingBtcSign={fundingBtcSign}
          stablecoinMcapSlope={stablecoinMcapSlope}
          loading={polling.loading}
        />
      </div>

      {/* Reconciliation and Operations */}
      <Tabs defaultValue="reconciliation" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-600">
          <TabsTrigger value="reconciliation">Farside Reconciliation</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reconciliation" className="space-y-4">
          <FarsideReconciliation
            ssvMetrics={{
              btc: state.btcMetrics,
              eth: state.ethMetrics,
            }}
            farsideData={state.farsideFlows}
            loading={polling.loading}
            error={polling.error}
          />
        </TabsContent>
        
        <TabsContent value="news" className="space-y-4">
          <NewsTicker
            data={state.news}
            loading={polling.loading}
            error={polling.error}
          />
        </TabsContent>
      </Tabs>

      {/* Status Footer */}
      {(polling.error || state.isDegraded) && (
        <Card className="border-yellow-500/20 bg-yellow-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-yellow-300 font-medium">Data Status Notice</p>
              <p className="text-yellow-200/80 mt-1">
                {polling.error 
                  ? `Connection issue: ${polling.error.message}`
                  : 'Some data providers are unavailable. Showing last known values.'
                }
              </p>
              <p className="text-yellow-200/60 mt-2 text-xs">
                Rate limit: ~18 requests/min • Next refresh in {Math.ceil(POLLING_INTERVAL / 1000 / 60)} minutes
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}