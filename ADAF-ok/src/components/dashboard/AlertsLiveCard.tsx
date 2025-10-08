'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Bell, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import Link from 'next/link';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
}

export function AlertsLiveCard() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'critical',
      title: 'Position Size Limit Exceeded',
      description: 'BTC position exceeds 95% of limit threshold',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      source: 'Risk Engine',
      acknowledged: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Funding Rate Negative 48h+',
      description: 'Binance BTC perpetual funding rate negative for 48+ hours',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      source: 'Funding Monitor',
      acknowledged: false
    },
    {
      id: '3',
      type: 'info',
      title: 'New Strategy Proposal',
      description: 'ETH LST arbitrage strategy ready for review',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      source: 'Strategy Engine',
      acknowledged: true
    }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new alert occasionally
      if (Math.random() < 0.1) {
        const newAlert: Alert = {
          id: Date.now().toString(),
          type: Math.random() < 0.3 ? 'critical' : Math.random() < 0.6 ? 'warning' : 'info',
          title: 'Market Volatility Spike Detected',
          description: 'BTC volatility increased by 25% in last 15 minutes',
          timestamp: new Date().toISOString(),
          source: 'Volatility Monitor',
          acknowledged: false
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'adaf-badge-severity-red';
      case 'warning': return 'adaf-badge-severity-amber';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const activeAlerts = alerts.filter(alert => !alert.acknowledged);

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Live Alerts
            {activeAlerts.length > 0 && (
              <Badge className="adaf-badge-severity-red ml-2">
                {activeAlerts.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-1" />
              SSE: ON
            </Button>
            <Link href="/alerts">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                All Alerts
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="adaf-card-content">
        {alerts.length === 0 ? (
          <div className="adaf-empty-state">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No active alerts</p>
            <p className="text-sm">All systems operating normally</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => (
              <div 
                key={alert.id} 
                className={`p-3 border border-gray-200 rounded-lg ${
                  alert.acknowledged ? 'opacity-60 bg-gray-50' : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{alert.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{alert.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge className={getAlertColor(alert.type)}>
                      {alert.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{alert.source}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatTime(alert.timestamp)}</span>
                    {!alert.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="h-6 px-2 text-xs"
                      >
                        Ack
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}