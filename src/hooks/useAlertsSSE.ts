'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui';

interface AlertItem {
  id: string;
  severity: 'sev1' | 'sev2' | 'sev3' | 'sev4';
  title: string;
  description: string;
  component: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

const MAX_ALERTS = 50; // Keep last 50 alerts

export function useAlertsSSE() {
  const { timezone } = useUIStore();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fallback polling query (used when SSE fails)
  const pollingQuery = useQuery({
    queryKey: ['alerts', 'polling', timezone],
    queryFn: async (): Promise<AlertItem[]> => {
      const response = await fetch(`/api/read/alerts?timezone=${timezone}`);
      if (!response.ok) {
        throw new Error(`Alerts API error: ${response.status}`);
      }
      const result = await response.json();
      // The API returns { page, limit, total, pages, data }
      return Array.isArray(result.data) ? result.data : [];
    },
    enabled: !isSSEConnected, // Only poll when SSE is not connected
    refetchInterval: 10_000, // Poll every 10 seconds
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  // Update alerts from polling when SSE is not available
  useEffect(() => {
    if (!isSSEConnected && pollingQuery.data) {
      // pollingQuery.data is always an array now
      setAlerts(() => {
        const newAlerts = [...pollingQuery.data];
        return newAlerts.slice(-MAX_ALERTS); // Keep only last N alerts
      });
    }
  }, [pollingQuery.data, isSSEConnected]);

  // SSE Connection management
  useEffect(() => {
    let currentEventSource: EventSource | null = null;
    
    const connectSSE = () => {
      try {
        const eventSource = new EventSource('/api/stream/alerts');
        currentEventSource = eventSource;
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsSSEConnected(true);
          console.log('SSE Connected to alerts stream');
        };

        eventSource.onmessage = (event) => {
          try {
            const newAlert: AlertItem = JSON.parse(event.data);
            setAlerts(prevAlerts => {
              const updatedAlerts = [newAlert, ...prevAlerts];
              return updatedAlerts.slice(0, MAX_ALERTS); // Keep only last N alerts
            });
          } catch (error) {
            console.error('Error parsing SSE alert data:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          setIsSSEConnected(false);
          eventSource.close();
          
          // Retry connection after 5 seconds
          setTimeout(() => {
            if (eventSourceRef.current === eventSource) {
              connectSSE();
            }
          }, 5000);
        };

      } catch (error) {
        console.error('Failed to create SSE connection:', error);
        setIsSSEConnected(false);
      }
    };

    // Try to establish SSE connection
    connectSSE();

    // Cleanup on unmount
    return () => {
      if (currentEventSource) {
        currentEventSource.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Acknowledge alert function
  const acknowledgeAlert = async (alertId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/actions/alerts/${alertId}/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone }),
      });

      if (!response.ok) {
        throw new Error(`Failed to acknowledge alert: ${response.status}`);
      }

      // Update local state
      setAlerts(prevAlerts =>
        prevAlerts.map(alert =>
          alert.id === alertId
            ? {
                ...alert,
                status: 'acknowledged' as const,
                acknowledgedAt: new Date().toISOString(),
                acknowledgedBy: 'current-user' // TODO: Get from auth context
              }
            : alert
        )
      );
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  };

  return {
    alerts,
    isSSEConnected,
    isLoading: !isSSEConnected && pollingQuery.isLoading,
    error: pollingQuery.error,
    acknowledgeAlert,
    refetch: pollingQuery.refetch,
  };
}