'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Calendar, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { ResearchApi, ResearchApiError } from '@/lib/research/api';
import { BacktestSummary, Backtest } from '@/types/research';

interface BacktestListProps {
  onSelect?: (backtest: Backtest | null) => void;
  selectedId?: number;
}

/**
 * Backtest list component with selection and refresh capabilities
 */
export function BacktestList({ onSelect, selectedId }: BacktestListProps) {
  const [backtests, setBacktests] = useState<BacktestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load backtests from API
   */
  const loadBacktests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ResearchApi.listBacktests({
        limit: 20,
        orderBy: 'created_at',
        orderDir: 'DESC'
      });

      if (response.success && response.backtests) {
        setBacktests(response.backtests);
      } else {
        throw new Error(response.error || 'Failed to load backtests');
      }

    } catch (error) {
      console.error('Load backtests error:', error);
      const message = error instanceof ResearchApiError 
        ? error.message 
        : 'Failed to load backtests';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle backtest selection
   */
  const handleSelect = async (summary: BacktestSummary) => {
    if (!onSelect) return;

    try {
      // Load full backtest details
      const response = await ResearchApi.getBacktest(summary.id);
      
      if (response.success && response.backtest) {
        onSelect(response.backtest);
      } else {
        throw new Error(response.error || 'Failed to load backtest details');
      }

    } catch (error) {
      console.error('Load backtest details error:', error);
      onSelect(null);
    }
  };

  /**
   * Format status badge
   */
  const getStatusBadge = (status: BacktestSummary['status']) => {
    const variants = {
      'queued': 'outline',
      'running': 'secondary', 
      'done': 'default',
      'failed': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  /**
   * Format performance metrics
   */
  const formatMetric = (value: number | undefined, type: 'percentage' | 'ratio') => {
    if (value === undefined) return '-';
    
    if (type === 'percentage') {
      return `${(value * 100).toFixed(2)}%`;
    }
    
    return value.toFixed(3);
  };

  // Load backtests on mount
  useEffect(() => {
    loadBacktests();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Backtests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading backtests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Backtests
            </span>
            <Button variant="outline" size="sm" onClick={loadBacktests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            <p>Error loading backtests:</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Backtests ({backtests.length})
          </span>
          <Button variant="outline" size="sm" onClick={loadBacktests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {backtests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No backtests yet</p>
            <p>Create your first backtest using the configuration panel</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Benchmark</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>PnL</TableHead>
                  <TableHead>Sharpe</TableHead>
                  <TableHead>Max DD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backtests.map((backtest) => (
                  <TableRow
                    key={backtest.id}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      selectedId === backtest.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleSelect(backtest)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{backtest.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {backtest.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(backtest.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(backtest.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{backtest.benchmark}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{backtest.agentCount} agents</div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        backtest.pnlPct && backtest.pnlPct > 0 
                          ? 'text-green-600' 
                          : backtest.pnlPct && backtest.pnlPct < 0
                          ? 'text-red-600'
                          : ''
                      }`}>
                        {formatMetric(backtest.pnlPct, 'percentage')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatMetric(backtest.sharpe, 'ratio')}
                    </TableCell>
                    <TableCell>
                      <span className={
                        backtest.maxDDPct ? 'text-red-600' : ''
                      }>
                        {formatMetric(backtest.maxDDPct, 'percentage')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}