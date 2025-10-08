'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  Play,
  FileText,
  Bell,
  Settings,
  ChevronDown,
  Clock,
  DollarSign,
  Globe
} from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';

const AVAILABLE_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', color: 'bg-orange-500' },
  { symbol: 'ETH', name: 'Ethereum', color: 'bg-blue-500' },
  { symbol: 'SOL', name: 'Solana', color: 'bg-purple-500' },
  { symbol: 'AVAX', name: 'Avalanche', color: 'bg-red-500' },
  { symbol: 'MATIC', name: 'Polygon', color: 'bg-indigo-500' }
];

const TIME_RANGES = [
  { value: '1D', label: '1 Día' },
  { value: '7D', label: '7 Días' },
  { value: '30D', label: '30 Días' },
  { value: '90D', label: '90 Días' },
  { value: '1Y', label: '1 Año' }
] as const;

const CURRENCIES = [
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'MXN', label: 'MXN', symbol: '$' }
] as const;

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Ciudad de México', short: 'CST' },
  { value: 'America/New_York', label: 'Nueva York', short: 'EST' },
  { value: 'Europe/London', label: 'Londres', short: 'GMT' },
  { value: 'Asia/Tokyo', label: 'Tokio', short: 'JST' }
] as const;

interface TopBarProps {
  children?: React.ReactNode;
}

export function TopBar({ children }: TopBarProps = {}) {
  const {
    selectedAssets,
    range,
    currency,
    timezone,
    setSelectedAssets,
    setRange,
    setCurrency,
    setTimezone,
    getFormattedAsOf
  } = useUIStore();

  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showRangeSelector, setShowRangeSelector] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showTimezoneSelector, setShowTimezoneSelector] = useState(false);
  const [isRunningWorker, setIsRunningWorker] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleAssetToggle = (assetSymbol: string) => {
    if (selectedAssets.includes(assetSymbol)) {
      // Don't allow removing all assets
      if (selectedAssets.length > 1) {
        setSelectedAssets(selectedAssets.filter(a => a !== assetSymbol));
      }
    } else {
      setSelectedAssets([...selectedAssets, assetSymbol]);
    }
  };

  const handleRunWorker = async () => {
    setIsRunningWorker(true);
    try {
      const response = await fetch('/api/actions/run-worker-once', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to run worker');
      }
      
      // Track UI interaction
      fetch('/api/metrics/ui/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          component: 'TopBar',
          action: 'run_worker_once',
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
      
    } catch (error) {
      console.error('Failed to run worker:', error);
    } finally {
      setIsRunningWorker(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch('/api/generate/report/onepager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Required by the API
          actor: 'local-user',
          // Optional metadata we may use in the PDF template later
          notes: `Assets: ${selectedAssets.join(', ')} | Range: ${range} | Currency: ${currency} | TZ: ${timezone}`,
          period: 'q'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      // Handle PDF download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      // Try to extract filename from Content-Disposition
      const cd = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
      const fallbackName = `ADAF_OnePager_${new Date().toISOString().split('T')[0]}.pdf`;
      let fileName = fallbackName;
      if (cd) {
        const match = cd.match(/filename="?([^";]+)"?/i);
        if (match?.[1]) fileName = match[1];
      }
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      // Track UI interaction
      fetch('/api/metrics/ui/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          component: 'TopBar',
          action: 'generate_one_pager',
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
      
      // Lightweight success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
      toast.textContent = 'Reporte generado y descargado';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
      
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Left: Global Selectors */}
        <div className="flex items-center gap-3">
          {/* Asset Selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssetSelector(!showAssetSelector)}
              className="h-9 min-w-[120px] justify-between"
            >
              <div className="flex items-center gap-1">
                {selectedAssets.slice(0, 2).map(asset => {
                  const assetInfo = AVAILABLE_ASSETS.find(a => a.symbol === asset);
                  return (
                    <div key={asset} className={cn("w-3 h-3 rounded-full", assetInfo?.color)} />
                  );
                })}
                <span className="ml-1 font-medium">
                  {selectedAssets.length === 1 ? selectedAssets[0] : `${selectedAssets.length} Assets`}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
            
            {showAssetSelector && (
              <div className="absolute top-full mt-1 w-64 rounded-md border bg-white p-3 shadow-lg">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Select Assets</h4>
                  {AVAILABLE_ASSETS.map(asset => (
                    <div key={asset.symbol} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedAssets.includes(asset.symbol)}
                        onChange={() => handleAssetToggle(asset.symbol)}
                        className="rounded"
                      />
                      <div className={cn("w-3 h-3 rounded-full", asset.color)} />
                      <span className="text-sm">{asset.name} ({asset.symbol})</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => setShowAssetSelector(false)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Time Range Selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRangeSelector(!showRangeSelector)}
              className="h-9 justify-between"
            >
              <Clock className="h-4 w-4" />
              <span className="ml-1">{range}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
            
            {showRangeSelector && (
              <div className="absolute top-full mt-1 w-32 rounded-md border bg-white py-1 shadow-lg">
                {TIME_RANGES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => {
                      setRange(r.value);
                      setShowRangeSelector(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-100",
                      range === r.value && "bg-gray-100 font-medium"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Currency Selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCurrencySelector(!showCurrencySelector)}
              className="h-9 justify-between"
            >
              <DollarSign className="h-4 w-4" />
              <span className="ml-1">{currency}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
            
            {showCurrencySelector && (
              <div className="absolute top-full mt-1 w-24 rounded-md border bg-white py-1 shadow-lg">
                {CURRENCIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => {
                      setCurrency(c.value);
                      setShowCurrencySelector(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-100",
                      currency === c.value && "bg-gray-100 font-medium"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timezone Selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimezoneSelector(!showTimezoneSelector)}
              className="h-9 justify-between"
            >
              <Globe className="h-4 w-4" />
              <span className="ml-1">
                {TIMEZONES.find(tz => tz.value === timezone)?.short}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
            
            {showTimezoneSelector && (
              <div className="absolute top-full mt-1 w-48 rounded-md border bg-white py-1 shadow-lg">
                {TIMEZONES.map(tz => (
                  <button
                    key={tz.value}
                    onClick={() => {
                      setTimezone(tz.value);
                      setShowTimezoneSelector(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-100",
                      timezone === tz.value && "bg-gray-100 font-medium"
                    )}
                  >
                    <div className="flex justify-between">
                      <span>{tz.label}</span>
                      <span className="text-gray-500">{tz.short}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* As-of timestamp */}
          <Badge variant="outline" className="text-xs">
            as of {getFormattedAsOf()}
          </Badge>
        </div>

        {/* Centro: Búsqueda Spotlight */}
        <div className="flex-1 max-w-md">
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent('spotlight:open'))}
            className="w-full justify-start text-gray-500 hover:bg-gray-50"
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Búsqueda Spotlight...</span>
            <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded border">
                {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}
              </kbd>
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded border">K</kbd>
            </div>
          </Button>
        </div>

        {/* Right: Quick Actions & Notifications */}
        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <Button
            size="sm"
            onClick={handleRunWorker}
            disabled={isRunningWorker}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="mr-1 h-4 w-4" />
            {isRunningWorker ? 'Running...' : 'Run Worker'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
          >
            <FileText className="mr-1 h-4 w-4" />
            {isGeneratingReport ? 'Generating...' : 'One-Pager'}
          </Button>

          {/* Alert Bell */}
          <Button size="sm" variant="outline" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
              3
            </Badge>
          </Button>

          {/* Configuración */}
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4" />
          </Button>

          {/* Children - Controles adicionales */}
          {children}
        </div>
      </div>
    </div>
  );
}