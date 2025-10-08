'use client';

import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResearchSnapshot,
  createComparison,
  updateSnapshot,
} from '@/lib/research/snapshots';
import { postUiEvent } from '@/lib/ux/shortcuts';
import { formatDistanceToNow } from 'date-fns';
import {
  BarChart3,
  Download,
  Pin,
  PinOff,
  Settings,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Equal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompareDrawerProps {
  snapshots?: ResearchSnapshot[];
  onLoadConfig?: (config: ResearchSnapshot['config']) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Metric formatting utility
function formatMetric(value: number, format: 'percent' | 'number' | 'ratio'): string {
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(2)}%`;
    case 'ratio':
      return value.toFixed(3);
    case 'number':
      return value.toLocaleString();
    default:
      return value.toString();
  }
}

// Metric comparison indicator
function getMetricIndicator(current: number, baseline: number, betterIsHigher: boolean = true) {
  const diff = current - baseline;
  const threshold = Math.abs(baseline) * 0.01; // 1% threshold for "equal"
  
  if (Math.abs(diff) < threshold) {
    return { icon: Equal, color: 'text-gray-500', label: 'equal' };
  }
  
  const isWorse = betterIsHigher ? diff < 0 : diff > 0;
  
  if (isWorse) {
    return { icon: ArrowDown, color: 'text-red-500', label: 'worse' };
  } else {
    return { icon: ArrowUp, color: 'text-green-500', label: 'better' };
  }
}

// Individual snapshot column component
function SnapshotColumn({ 
  snapshot, 
  isBaseline = false, 
  baselineSnapshot, 
  onLoadConfig, 
  onTogglePin 
}: {
  snapshot: ResearchSnapshot;
  isBaseline?: boolean;
  baselineSnapshot?: ResearchSnapshot;
  onLoadConfig?: (config: ResearchSnapshot['config']) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <Card className={cn(
        'h-full',
        isBaseline && 'ring-2 ring-blue-500 ring-opacity-50'
      )}>
        <CardHeader className="pb-3">
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate" title={snapshot.name}>
                  {snapshot.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true })}
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                {isBaseline && (
                  <Badge variant="secondary" className="text-xs">
                    Baseline
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTogglePin?.(snapshot.id, !snapshot.isPinned)}
                  className="h-6 w-6 p-0"
                >
                  {snapshot.isPinned ? (
                    <PinOff className="h-3 w-3" />
                  ) : (
                    <Pin className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Tags */}
            {snapshot.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {snapshot.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {snapshot.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{snapshot.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLoadConfig?.(snapshot.config)}
                className="h-7 text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                Load Config
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <MetricItem 
                label="Total Return"
                value={formatMetric(snapshot.results.pnlPercent, 'percent')}
                baseline={baselineSnapshot?.results.pnlPercent}
                current={snapshot.results.pnlPercent}
                betterIsHigher={true}
              />
              <MetricItem
                label="Sharpe"
                value={formatMetric(snapshot.results.sharpe, 'ratio')}
                baseline={baselineSnapshot?.results.sharpe}
                current={snapshot.results.sharpe}
                betterIsHigher={true}
              />
              <MetricItem
                label="Max DD"
                value={formatMetric(snapshot.results.maxDrawdown, 'percent')}
                baseline={baselineSnapshot?.results.maxDrawdown}
                current={snapshot.results.maxDrawdown}
                betterIsHigher={false}
              />
              <MetricItem
                label="Hit Rate"
                value={formatMetric(snapshot.results.hitRate, 'percent')}
                baseline={baselineSnapshot?.results.hitRate}
                current={snapshot.results.hitRate}
                betterIsHigher={true}
              />
            </div>

            {/* Mini equity curve placeholder */}
            <div className="h-16 bg-gray-50 rounded border flex items-center justify-center text-xs text-gray-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              Equity Curve
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Metric item with comparison
function MetricItem({
  label,
  value,
  baseline,
  current,
  betterIsHigher = true,
}: {
  label: string;
  value: string;
  baseline?: number;
  current: number;
  betterIsHigher?: boolean;
}) {
  const indicator = baseline !== undefined ? 
    getMetricIndicator(current, baseline, betterIsHigher) : null;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}</span>
        {indicator && (
          <indicator.icon className={cn('h-3 w-3', indicator.color)} />
        )}
      </div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

export function CompareDrawer({ 
  snapshots: propSnapshots, 
  onLoadConfig, 
  trigger, 
  open: externalOpen, 
  onOpenChange 
}: CompareDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [baselineId, setBaselineId] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Use external open state if provided, otherwise internal
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  // Get snapshots from props or fetch from storage
  const snapshots = propSnapshots || (() => {
    try {
      return JSON.parse(localStorage.getItem('adaf-research-snapshots') || '[]') as ResearchSnapshot[];
    } catch {
      return [];
    }
  })();

  // Set default baseline to first pinned or first snapshot
  const defaultBaseline = useMemo(() => {
    const pinned = snapshots.find(s => s.isPinned);
    return pinned?.id || snapshots[0]?.id || '';
  }, [snapshots]);

  const actualBaselineId = baselineId || defaultBaseline;
  const comparison = createComparison(snapshots.map(s => s.id));

  const handleTogglePin = async (id: string, pinned: boolean) => {
    updateSnapshot(id, { isPinned: pinned });
    // Force re-render by closing and reopening (simple approach)
  };

  const handleExportComparison = () => {
    if (!comparison) return;

    const data = {
      comparison: {
        timestamp: new Date().toISOString(),
        baseline: actualBaselineId,
        snapshots: comparison.snapshots.map(snap => ({
          id: snap.id,
          name: snap.name,
          createdAt: snap.createdAt,
          results: snap.results,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest-comparison-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    postUiEvent('Research', 'CompareExport', { 
      snapshotCount: snapshots.length,
      baseline: actualBaselineId,
    });
  };

  const baselineSnapshot = snapshots.find(s => s.id === actualBaselineId);

  if (snapshots.length === 0) {
    return (
      <Button variant="outline" disabled>
        <BarChart3 className="h-4 w-4 mr-2" />
        Compare (No Snapshots)
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button 
            variant="outline"
            onClick={() => {
              setOpen(true);
              postUiEvent('Research', 'CompareOpen', { 
                snapshotCount: snapshots.length,
              });
            }}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Compare ({snapshots.length})
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Backtest Comparison
          </SheetTitle>
          <SheetDescription>
            Compare {snapshots.length} research snapshots side by side
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Baseline:</label>
              <select
                value={actualBaselineId}
                onChange={(e) => setBaselineId(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                {snapshots.map(snap => (
                  <option key={snap.id} value={snap.id}>
                    {snap.name}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="outline" size="sm" onClick={handleExportComparison}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Metrics</TabsTrigger>
              <TabsTrigger value="config">Configuration Diff</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {snapshots.map(snapshot => (
                  <SnapshotColumn
                    key={snapshot.id}
                    snapshot={snapshot}
                    isBaseline={snapshot.id === actualBaselineId}
                    baselineSnapshot={baselineSnapshot}
                    onLoadConfig={onLoadConfig}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="mt-4">
              {comparison && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Metric</th>
                          {comparison.snapshots.map(snap => (
                            <th key={snap.id} className="text-center p-2 min-w-[120px]">
                              <div className="truncate" title={snap.name}>
                                {snap.name}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.metrics.map(({ metric, label, format }) => (
                          <tr key={metric} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{label}</td>
                            {comparison.snapshots.map(snap => {
                              const value = snap.results[metric];
                              const isBaseline = snap.id === actualBaselineId;
                              
                              return (
                                <td key={snap.id} className={cn(
                                  'p-2 text-center',
                                  isBaseline && 'bg-blue-50 font-medium'
                                )}>
                                  {formatMetric(value, format)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="config" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Configuration diff view</p>
                <p className="text-xs">Coming soon - side-by-side DSL rules comparison</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}