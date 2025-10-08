'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlertsSSE } from '@/hooks';
import { CardHeader } from '@/components/common/CardHeader';
import { SkeletonPatterns } from '@/components/common/SkeletonBlock';
import { ErrorState } from '@/components/common/ErrorState';
import { getSeverityToken, getStatusToken } from '@/theme/tokens';
import { 
  ExternalLink, 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Info,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function AlertsLiveCard() {
  const {
    alerts,
    isSSEConnected,
    isLoading,
    error,
    acknowledgeAlert,
    refetch,
  } = useAlertsSSE();

  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'sev1');
  const warningAlerts = activeAlerts.filter(alert => alert.severity === 'sev2');

  const ConnectionIcon = isSSEConnected ? Wifi : WifiOff;
  const connectionStatus = isSSEConnected ? 'En Vivo' : 'Consultando';
  const connectionColor = isSSEConnected ? 'text-green-500' : 'text-yellow-500';

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader 
          title="Alertas en Vivo"
          badge={
            <div className="flex items-center gap-1">
              <ConnectionIcon className={cn("h-3 w-3", connectionColor)} />
              <span className="text-xs">{connectionStatus}</span>
            </div>
          }
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
          title="Alertas en Vivo"
          badge="Cargando alertas..."
        />
        <CardContent className="p-6">
          <ErrorState
            variant="connection"
            title="Alert System Unavailable"
            onRetry={refetch}
          />
        </CardContent>
      </Card>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'sev1': return AlertTriangle;
      case 'sev2': return Clock;
      case 'sev3': return Info;
      case 'sev4': return Bell;
      default: return CheckCircle;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'sev1': return getSeverityToken('critical');
      case 'sev2': return getSeverityToken('warning');
      case 'sev3': return getSeverityToken('amber');
      case 'sev4': return getStatusToken('info');
      default: return getStatusToken('neutral');
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'sev1': return 'Crítico';
      case 'sev2': return 'Advertencia';
      case 'sev3': return 'Info';
      case 'sev4': return 'Bajo';
      default: return severity;
    }
  };

  const getComponentColor = (component: string) => {
    switch (component.toLowerCase()) {
      case 'pricing': return 'bg-blue-100 text-blue-800';
      case 'data': return 'bg-purple-100 text-purple-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      case 'api': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
    } catch (error) {
      console.error('Error al confirmar alerta:', error);
    }
  };

  return (
    <Card className="adaf-card">
      <CardHeader 
        title="Alertas en Vivo"
        badge={
          <div className="flex items-center gap-1">
            <ConnectionIcon className={cn("h-3 w-3", connectionColor)} />
            <span className="text-xs">{connectionStatus}</span>
          </div>
        }
        asOf={activeAlerts[0]?.timestamp}
        actions={
          <Link href="/alerts" passHref>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
      
      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {/* Summary Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{criticalAlerts.length}</div>
              <div className="text-sm text-muted-foreground">Críticas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{warningAlerts.length}</div>
              <div className="text-sm text-muted-foreground">Advertencia</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{activeAlerts.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Recent Alerts */}
          {activeAlerts.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <div className="text-sm text-muted-foreground">No hay alertas activas</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Alertas Recientes ({Math.min(activeAlerts.length, 3)})
              </div>
              
              {activeAlerts.slice(0, 3).map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.severity);
                const severityStyles = getSeverityStyles(alert.severity);
                
                return (
                  <div 
                    key={alert.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <SeverityIcon className={cn("h-4 w-4 mt-0.5", severityStyles)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{alert.title}</span>
                          <Badge 
                            variant="secondary"
                            className={cn("text-xs", getComponentColor(alert.component))}
                          >
                            {alert.component}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={cn("text-xs", severityStyles)}
                          >
                            {getSeverityLabel(alert.severity)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {alert.description}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleAcknowledge(alert.id)}
                        className="h-6 w-6 p-0"
                        title="Confirmar alerta"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View All Link */}
          <div className="pt-2 border-t">
            <Link href="/alerts" passHref>
              <Button variant="ghost" className="w-full text-sm">
                Ver Todas las Alertas ({alerts.length})
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}