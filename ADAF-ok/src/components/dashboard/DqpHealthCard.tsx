'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import Link from 'next/link';

export function DqpHealthCard() {
  // Mock DQP health data
  const healthMetrics = {
    freshness: { score: 95, status: 'ok', lastUpdate: '2 min ago' },
    completeness: { score: 89, status: 'warning', lastUpdate: '5 min ago' },
    duplicates: { score: 98, status: 'ok', lastUpdate: '1 min ago' },
    schema: { score: 76, status: 'critical', lastUpdate: '10 min ago' }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'adaf-badge-severity-ok';
      case 'warning': return 'adaf-badge-severity-amber';
      case 'critical': return 'adaf-badge-severity-red';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const overallHealth = Object.values(healthMetrics).reduce((sum, metric) => sum + metric.score, 0) / 4;

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            DQP Health
          </CardTitle>
          <Link href="/dqp">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              Full Report
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="adaf-card-content space-y-4">
        {/* Overall Score */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold">{overallHealth.toFixed(0)}</div>
          <div className="text-sm text-gray-600">Overall Health Score</div>
        </div>

        {/* Individual Metrics */}
        <div className="space-y-3">
          {Object.entries(healthMetrics).map(([key, metric]) => (
            <div key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(metric.status)}
                <div>
                  <div className="font-medium capitalize">{key}</div>
                  <div className="text-xs text-gray-600">{metric.lastUpdate}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{metric.score}%</span>
                <Badge className={getStatusColor(metric.status)}>
                  {metric.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}