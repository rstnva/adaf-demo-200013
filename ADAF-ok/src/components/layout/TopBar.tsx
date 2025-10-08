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
  Globe,
  X
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
  { value: '1D', label: '1 Day' },
  { value: '7D', label: '7 Days' },
  { value: '30D', label: '30 Days' },
  { value: '90D', label: '90 Days' },
  { value: '1Y', label: '1 Year' }
] as const;

const CURRENCIES = [
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'MXN', label: 'MXN', symbol: '$' }
] as const;

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Mexico City', short: 'CST' },
  { value: 'America/New_York', label: 'New York', short: 'EST' },
  { value: 'Europe/London', label: 'London', short: 'GMT' },
  { value: 'Asia/Tokyo', label: 'Tokyo', short: 'JST' }
] as const;

export function TopBar() {
  const {
    selectedAssets,
    range,
    currency,
    timezone,
    searchOpen,
    setSelectedAssets,
    setRange,
    setCurrency,
    setTimezone,
    toggleSearch,
    getFormattedAsOf
  } = useUIStore();

  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showRangeSelector, setShowRangeSelector] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showTimezoneSelector, setShowTimezoneSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
      const response = await fetch('/api/reports/generate-one-pager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: selectedAssets,
          range,
          currency,
          timezone
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
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

        {/* Center: Universal Search */}
        <div className="flex-1 max-w-md">
          {searchOpen ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search signals, alerts, reports, lineage hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSearch}
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={toggleSearch}
              className="w-full justify-start text-gray-500"
            >
              <Search className="mr-2 h-4 w-4" />
              Universal search...
            </Button>
          )}
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

          {/* Settings */}
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}