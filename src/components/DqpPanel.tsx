'use client';

import { useState, useEffect, useCallback } from 'react';
import { DqpRow, DqpOverviewResponse } from '@/types/dqp';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, Download, RefreshCw, Eye } from 'lucide-react';

interface DqpPanelProps {
  className?: string;
}

export default function DqpPanel({ className }: DqpPanelProps) {
  const [data, setData] = useState<DqpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('any');
  const [agentFilter, setAgentFilter] = useState<string>('any');
  const [sourceFilter, setSourceFilter] = useState<string>('any');
  const [typeFilter, setTypeFilter] = useState<string>('any');

  // Available filter options (populated from data)
  const [sources, setSources] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'any') params.set('status', statusFilter);
      if (agentFilter !== 'any') params.set('agent', agentFilter);
      if (sourceFilter !== 'any') params.set('source', sourceFilter);
      if (typeFilter !== 'any') params.set('type', typeFilter);
      params.set('limit', '500');

      const response = await fetch(`/api/read/dqp/overview?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result: DqpOverviewResponse = await response.json();
      setData(result.rows);

      // Extract unique sources and types for filters
      const uniqueSources = Array.from(new Set(result.rows.map(r => r.source))).sort();
      const uniqueTypes = Array.from(new Set(result.rows.map(r => r.type))).sort();
      setSources(uniqueSources);
      setTypes(uniqueTypes);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, agentFilter, sourceFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async (row: DqpRow) => {
    try {
      const response = await fetch('/api/actions/dqp/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: row.source,
          agentCode: row.agentCode,
          type: row.type,
          actor: 'ui'
        })
      });

      if (!response.ok) {
        throw new Error(`Retry failed: ${response.status}`);
      }

      const result = await response.json();
      setMessage(result.queued ? 'Retry queued' : 'Retry logged (no backend)');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Retry failed: ${errorMsg}`);
    }
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'any') params.set('status', statusFilter);
      if (agentFilter !== 'any') params.set('agent', agentFilter);
      if (sourceFilter !== 'any') params.set('source', sourceFilter);
      if (typeFilter !== 'any') params.set('type', typeFilter);
      params.set('limit', '1000');

      const response = await fetch(`/api/read/dqp/overview.csv?${params}`);
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dqp-overview-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage('CSV exported successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Export failed: ${errorMsg}`);
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Never';
    const date = new Date(ts);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    return (
      <div className="text-right text-xs">
        <div className="text-muted-foreground">
          {date.toLocaleString()}
        </div>
        <div>
          {diffMin < 60 ? `${diffMin}m ago` : `${Math.floor(diffMin / 60)}h ago`}
        </div>
      </div>
    );
  };

  const getStatusIcon = (status: 'ok' | 'warn' | 'fail') => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warn':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'fail':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'ok' | 'warn' | 'fail') => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      ok: 'default',
      warn: 'secondary', 
      fail: 'destructive'
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  if (error && !data.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            DQP Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load DQP data: {error}</p>
          <Button onClick={fetchData} className="mt-2" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusCounts = data.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Data Quality & Pipeline Health
            <div className="flex items-center gap-2 text-sm font-normal">
              <Badge variant="outline">{data.length} sources</Badge>
              {statusCounts.ok > 0 && <Badge variant="default">{statusCounts.ok} OK</Badge>}
              {statusCounts.warn > 0 && <Badge variant="secondary">{statusCounts.warn} WARN</Badge>}
              {statusCounts.fail > 0 && <Badge variant="destructive">{statusCounts.fail} FAIL</Badge>}
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportCsv} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={fetchData} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Status Messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {error}
          </div>
        )}
        {message && (
          <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
            {message}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Agent:</span>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All</SelectItem>
                <SelectItem value="NM">NM</SelectItem>
                <SelectItem value="OC">OC</SelectItem>
                <SelectItem value="OF">OF</SelectItem>
                <SelectItem value="DV">DV</SelectItem>
                <SelectItem value="MX">MX</SelectItem>
                <SelectItem value="OP">OP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Source:</span>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All</SelectItem>
                {sources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Type:</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading DQP data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-3 py-2 text-left">Status</th>
                  <th className="border border-border px-3 py-2 text-left">Source</th>
                  <th className="border border-border px-3 py-2 text-left">Agent</th>
                  <th className="border border-border px-3 py-2 text-left">Type</th>
                  <th className="border border-border px-3 py-2 text-left">Last TS</th>
                  <th className="border border-border px-3 py-2 text-right">Fresh (min)</th>
                  <th className="border border-border px-3 py-2 text-right">24h Count</th>
                  <th className="border border-border px-3 py-2 text-right">Dupes</th>
                  <th className="border border-border px-3 py-2 text-right">Schema Err</th>
                  <th className="border border-border px-3 py-2 text-left">Notes</th>
                  <th className="border border-border px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`
                      ${row.status === 'fail' ? 'bg-red-50' : row.status === 'warn' ? 'bg-yellow-50' : ''}
                      hover:bg-muted/50
                    `}
                  >
                    <td className="border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(row.status)}
                        {getStatusBadge(row.status)}
                      </div>
                    </td>
                    <td className="border border-border px-3 py-2 font-medium">{row.source}</td>
                    <td className="border border-border px-3 py-2">
                      <Badge variant="outline">{row.agentCode}</Badge>
                    </td>
                    <td className="border border-border px-3 py-2 font-mono text-xs">{row.type}</td>
                    <td className="border border-border px-3 py-2">{formatTimestamp(row.lastTs)}</td>
                    <td className="border border-border px-3 py-2 text-right">
                      {row.freshnessMin !== null ? (
                        <span className={row.freshnessMin > 60 ? 'text-red-600 font-medium' : row.freshnessMin > 15 ? 'text-yellow-600' : 'text-green-600'}>
                          {row.freshnessMin}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="border border-border px-3 py-2 text-right">{row.lastCount24h}</td>
                    <td className="border border-border px-3 py-2 text-right">
                      {row.dupes24h > 0 ? (
                        <span className="text-yellow-600 font-medium">{row.dupes24h}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="border border-border px-3 py-2 text-right">
                      {row.schemaErrors24h > 0 ? (
                        <span className="text-red-600 font-medium">{row.schemaErrors24h}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {row.notes && (
                        <span className="text-xs text-muted-foreground">{row.notes}</span>
                      )}
                    </td>
                    <td className="border border-border px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(row)}
                          className="h-8 px-2"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMessage('Incidents view coming soon');
                          }}
                          className="h-8 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No data quality issues found
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}