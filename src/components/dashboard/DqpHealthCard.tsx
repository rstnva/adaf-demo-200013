
'use client';
import { ConceptInfo } from '@/components/common/ConceptInfo';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDqp } from '@/hooks';
import { CardHeader } from '@/components/common/CardHeader';
import { SkeletonPatterns } from '@/components/common/SkeletonBlock';
import { ErrorState } from '@/components/common/ErrorState';
import { getSeverityToken, getStatusToken } from '@/theme/tokens';
import { 
  ExternalLink, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Activity,
  Database,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function DqpHealthCard() {
  const { overview, isLoading, error } = useDqp();
  const { data: overviewData, refetch } = overview;

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title={<span>DQP Health <ConceptInfo concept="DQP Health" /></span> as React.ReactNode}
          badge="Data Quality Pipeline Status"
        />
        <CardContent className="p-6">
          <SkeletonPatterns.MetricValue />
          <div className="space-y-3 mt-4">
            <SkeletonPatterns.ListItem />
            <SkeletonPatterns.ListItem />
            <SkeletonPatterns.ListItem />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="DQP Health"
          badge="Data Quality Pipeline Status"
        />
        <CardContent className="p-6">
          <ErrorState
            title="DQP Status Unavailable"
            onRetry={refetch}
          />
        </CardContent>
      </Card>
    );
  }

  if (!overviewData) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="DQP Health"
          badge="Data Quality Pipeline Status"
        />
        <CardContent className="p-6">
          <ErrorState
            variant="minimal"
            title="No DQP Data"
          />
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': 
        return CheckCircle;
      case 'warn': 
        return AlertTriangle;
      case 'fail':
        return XCircle;
      default: 
        return Activity;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'ok': 
        return getSeverityToken('ok');
      case 'warn': 
        return getSeverityToken('warning');
      case 'fail':
        return getSeverityToken('critical');
      default: 
        return getStatusToken('neutral');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ok': return 'OK';
      case 'warn': return 'Warning';
      case 'fail': return 'Failed';
      default: return status;
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'database':
      case 'db':
        return Database;
      case 'api':
      case 'rest':
        return Wifi;
      case 'stream':
      case 'kafka':
        return Activity;
      default:
        return Shield;
    }
  };

  const getHealthScore = (data: typeof overviewData) => {
    const total = data.totalSources;
    if (total === 0) return 0;
    
    const healthy = data.healthySources;
    return Math.round((healthy / total) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const healthScore = getHealthScore(overviewData);
  const criticalSources = overviewData.sources?.filter(s => s.status === 'fail').length || 0;

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="DQP Health"
        badge="Data Quality Pipeline Status"
        asOf={overviewData.lastUpdate}
        actions={
          <Link href="/dqp" passHref>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
      
      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {/* Overall Score */}
          <div className="text-center">
            <div className={cn("text-3xl font-bold", getScoreColor(healthScore))}>
              {healthScore}%
            </div>
            <div className="text-sm text-muted-foreground">
              {getScoreStatus(healthScore)} Health Score
            </div>
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overviewData.healthySources}</div>
              <div className="text-sm text-muted-foreground">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{overviewData.warningSources}</div>
              <div className="text-sm text-muted-foreground">Warning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overviewData.failedSources}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Source Status */}
          {overviewData.sources && overviewData.sources.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Data Sources ({overviewData.sources.length})
              </div>
              
              {overviewData.sources.slice(0, 4).map((source) => {
                const StatusIcon = getStatusIcon(source.status);
                const SourceIcon = getSourceIcon(source.type);
                const statusStyles = getStatusStyles(source.status);
                
                return (
                  <div 
                    key={source.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <SourceIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{source.source}</div>
                        <div className="text-xs text-muted-foreground">
                          {source.type} • Agent: {source.agentCode}
                        </div>
                        {source.freshnessMin !== null && (
                          <div className="text-xs text-muted-foreground">
                            Freshness: {source.freshnessMin}m
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline"
                        className={cn("text-xs", statusStyles)}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {getStatusLabel(source.status)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Critical Alert */}
          {criticalSources > 0 && (
            <div className="p-3 rounded bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div className="text-sm font-medium text-red-800">
                  {criticalSources} Failed Source{criticalSources > 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-xs text-red-700 mt-1">
                Immediate attention required for critical data sources
              </div>
            </div>
          )}

          {/* Freshness Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avg Freshness:</span>
            <span className="font-medium">{overviewData.avgFreshness}m</span>
          </div>

          {/* View Details Link */}
          <div className="pt-2 border-t">
            <Link href="/dqp" passHref>
              <Button variant="ghost" className="w-full text-sm">
                View Detailed Report
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}