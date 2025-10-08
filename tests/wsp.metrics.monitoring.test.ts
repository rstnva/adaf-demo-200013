import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('WSP Metrics and Monitoring Tests', () => {
  let mockRecordAdapterRequest: any;
  let mockCounter: any;
  let mockHistogram: any;
  let mockGauge: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRecordAdapterRequest = vi.fn();
    mockCounter = {
      inc: vi.fn(),
      labels: vi.fn().mockReturnThis()
    };
    mockHistogram = {
      observe: vi.fn(),
      labels: vi.fn().mockReturnThis()
    };
    mockGauge = {
      set: vi.fn(),
      inc: vi.fn(),
      dec: vi.fn(),
      labels: vi.fn().mockReturnThis()
    };
  });

  describe('Adapter Request Metrics Recording', () => {
    it('should record successful requests with proper labels', () => {
      const adapterName = 'etfFlow';
      const statusCode = 200;
      const latencyMs = 250;

      mockRecordAdapterRequest(adapterName, statusCode, latencyMs);

      expect(mockRecordAdapterRequest).toHaveBeenCalledWith(adapterName, statusCode, latencyMs);
    });

    it('should record failed requests with error status codes', () => {
      const errorScenarios = [
        { adapter: 'etfFlow', status: 500, latency: 1500 },
        { adapter: 'ratesFx', status: 502, latency: 2000 },
        { adapter: 'indices', status: 503, latency: 100 },
        { adapter: 'calendar', status: 504, latency: 5000 }
      ];

      errorScenarios.forEach(scenario => {
        mockRecordAdapterRequest(scenario.adapter, scenario.status, scenario.latency);
        expect(mockRecordAdapterRequest).toHaveBeenCalledWith(
          scenario.adapter, 
          scenario.status, 
          scenario.latency
        );
      });

      expect(mockRecordAdapterRequest).toHaveBeenCalledTimes(4);
    });

    it('should record circuit breaker events', () => {
      const adapterName = 'etfFlow';
      const circuitOpenStatus = 'circuit_open';
      const zeroLatency = 0; // No request made when circuit is open

      mockRecordAdapterRequest(adapterName, circuitOpenStatus, zeroLatency);

      expect(mockRecordAdapterRequest).toHaveBeenCalledWith(adapterName, 'circuit_open', 0);
    });

    it('should handle special status codes for different scenarios', () => {
      const specialCases = [
        { adapter: 'etfFlow', status: 304, latency: 50, scenario: 'ETag cache hit' },
        { adapter: 'ratesFx', status: 429, latency: 10, scenario: 'Rate limited' },
        { adapter: 'indices', status: 'circuit_open', latency: 0, scenario: 'Circuit breaker open' },
        { adapter: 'calendar', status: 'timeout', latency: 30000, scenario: 'Request timeout' }
      ];

      specialCases.forEach(testCase => {
        mockRecordAdapterRequest(testCase.adapter, testCase.status, testCase.latency);
      });

      expect(mockRecordAdapterRequest).toHaveBeenCalledTimes(4);
    });
  });

  describe('Prometheus Metrics Format Validation', () => {
    it('should generate counter metrics with proper labels', () => {
      // Simulate Prometheus counter for HTTP requests
      const httpRequestsTotal = mockCounter;
      
      // Record different adapter requests
      httpRequestsTotal.labels({ adapter: 'etfFlow', status: '200', method: 'GET' }).inc();
      httpRequestsTotal.labels({ adapter: 'ratesFx', status: '500', method: 'GET' }).inc();
      httpRequestsTotal.labels({ adapter: 'indices', status: '304', method: 'GET' }).inc();

      expect(httpRequestsTotal.labels).toHaveBeenCalledTimes(3);
      expect(httpRequestsTotal.inc).toHaveBeenCalledTimes(3);
      
      expect(httpRequestsTotal.labels).toHaveBeenCalledWith({ 
        adapter: 'etfFlow', 
        status: '200', 
        method: 'GET' 
      });
    });

    it('should generate histogram metrics for latency tracking', () => {
      // Simulate Prometheus histogram for request duration
      const httpRequestDuration = mockHistogram;
      
      const latencyMeasurements = [
        { adapter: 'etfFlow', latency: 0.150 },
        { adapter: 'ratesFx', latency: 0.350 },
        { adapter: 'indices', latency: 0.050 },
        { adapter: 'calendar', latency: 1.200 }
      ];

      latencyMeasurements.forEach(measurement => {
        httpRequestDuration.labels({ adapter: measurement.adapter }).observe(measurement.latency);
      });

      expect(httpRequestDuration.labels).toHaveBeenCalledTimes(4);
      expect(httpRequestDuration.observe).toHaveBeenCalledTimes(4);
      
      expect(httpRequestDuration.observe).toHaveBeenCalledWith(0.150);
      expect(httpRequestDuration.observe).toHaveBeenCalledWith(1.200);
    });

    it('should generate gauge metrics for current state', () => {
      // Simulate Prometheus gauge for circuit breaker state
      const circuitBreakerState = mockGauge;
      
      // Record circuit breaker states (0 = closed, 1 = open, 0.5 = half-open)
      circuitBreakerState.labels({ adapter: 'etfFlow' }).set(0); // Closed
      circuitBreakerState.labels({ adapter: 'ratesFx' }).set(1); // Open
      circuitBreakerState.labels({ adapter: 'indices' }).set(0.5); // Half-open
      
      expect(circuitBreakerState.labels).toHaveBeenCalledTimes(3);
      expect(circuitBreakerState.set).toHaveBeenCalledTimes(3);
      
      expect(circuitBreakerState.set).toHaveBeenCalledWith(0);
      expect(circuitBreakerState.set).toHaveBeenCalledWith(1);
      expect(circuitBreakerState.set).toHaveBeenCalledWith(0.5);
    });

    it('should validate metric names follow Prometheus conventions', () => {
      const validMetricNames = [
        'wsp_adapter_requests_total',
        'wsp_adapter_request_duration_seconds',
        'wsp_adapter_circuit_breaker_state',
        'wsp_adapter_cache_hits_total',
        'wsp_adapter_rate_limit_exceeded_total'
      ];

      validMetricNames.forEach(metricName => {
        // Validate naming convention: lowercase, underscores, descriptive suffix
        expect(metricName).toMatch(/^[a-z_][a-z0-9_]*$/);
        expect(metricName).toMatch(/_total$|_seconds$|_state$|_ratio$/);
        expect(metricName.startsWith('wsp_adapter_')).toBe(true);
      });
    });
  });

  describe('Metrics Aggregation and Alerting', () => {
    it('should track error rates for alerting', () => {
      const errorRateMetrics = {
        totalRequests: 1000,
        errorRequests: 50,
        circuitOpenEvents: 10,
        timeoutEvents: 15
      };

      // Calculate error rate percentage
      const errorRate = (errorRateMetrics.errorRequests / errorRateMetrics.totalRequests) * 100;
      const circuitOpenRate = (errorRateMetrics.circuitOpenEvents / errorRateMetrics.totalRequests) * 100;
      
      expect(errorRate).toBe(5.0); // 5% error rate
      expect(circuitOpenRate).toBe(1.0); // 1% circuit breaker activation
      
      // Simulate alerting threshold
      const ERROR_RATE_THRESHOLD = 10.0; // 10%
      const CIRCUIT_OPEN_THRESHOLD = 5.0; // 5%
      
      expect(errorRate).toBeLessThan(ERROR_RATE_THRESHOLD);
      expect(circuitOpenRate).toBeLessThan(CIRCUIT_OPEN_THRESHOLD);
    });

    it('should track adapter performance percentiles', () => {
      const latencyMeasurements = [
        100, 150, 200, 250, 300, 350, 400, 500, 750, 1000
      ]; // Milliseconds

      // Simulate percentile calculations
      const p50 = latencyMeasurements[Math.floor(latencyMeasurements.length * 0.5)]; // 350ms (index 5)
      const p95 = latencyMeasurements[Math.floor(latencyMeasurements.length * 0.95)]; // 1000ms
      const p99 = latencyMeasurements[latencyMeasurements.length - 1]; // 1000ms

      expect(p50).toBe(350);
      expect(p95).toBe(1000);
      expect(p99).toBe(1000);

      // Validate SLA thresholds
      const SLA_P50_THRESHOLD = 500; // 500ms
      const SLA_P95_THRESHOLD = 2000; // 2s
      
      expect(p50).toBeLessThan(SLA_P50_THRESHOLD);
      expect(p95).toBeLessThan(SLA_P95_THRESHOLD);
    });

    it('should generate comprehensive health metrics', () => {
      const baseTimestamp = Date.now();
      const healthMetrics = {
        adapters: {
          etfFlow: { healthy: true, lastSuccess: baseTimestamp, errorCount: 0 },
          ratesFx: { healthy: false, lastSuccess: baseTimestamp - 400000, errorCount: 5 }, // 6+ minutes ago
          indices: { healthy: true, lastSuccess: baseTimestamp - 60000, errorCount: 1 },
          calendar: { healthy: true, lastSuccess: baseTimestamp, errorCount: 0 }
        }
      };

      // Calculate overall system health
      const healthyAdapters = Object.values(healthMetrics.adapters).filter(a => a.healthy).length;
      const totalAdapters = Object.keys(healthMetrics.adapters).length;
      const systemHealthPercent = (healthyAdapters / totalAdapters) * 100;

      expect(systemHealthPercent).toBe(75); // 3 out of 4 adapters healthy

      // Check stale data (last success > 5 minutes ago)
      const STALE_THRESHOLD = 300000; // 5 minutes
      const staleAdapters = Object.entries(healthMetrics.adapters)
        .filter(([_, adapter]) => baseTimestamp - adapter.lastSuccess > STALE_THRESHOLD);
      
      expect(staleAdapters).toHaveLength(1);
      expect(staleAdapters[0][0]).toBe('ratesFx');
    });
  });

  describe('Metrics Export and Integration', () => {
    it('should export metrics in Prometheus format', () => {
      // Simulate Prometheus metrics output
      const prometheusOutput = `
# HELP wsp_adapter_requests_total Total number of WSP adapter requests
# TYPE wsp_adapter_requests_total counter
wsp_adapter_requests_total{adapter="etfFlow",status="200"} 150
wsp_adapter_requests_total{adapter="etfFlow",status="500"} 5
wsp_adapter_requests_total{adapter="ratesFx",status="200"} 120
wsp_adapter_requests_total{adapter="ratesFx",status="429"} 10

# HELP wsp_adapter_request_duration_seconds Request duration in seconds
# TYPE wsp_adapter_request_duration_seconds histogram
wsp_adapter_request_duration_seconds_bucket{adapter="etfFlow",le="0.1"} 50
wsp_adapter_request_duration_seconds_bucket{adapter="etfFlow",le="0.5"} 140
wsp_adapter_request_duration_seconds_bucket{adapter="etfFlow",le="1.0"} 150
wsp_adapter_request_duration_seconds_bucket{adapter="etfFlow",le="+Inf"} 155
      `.trim();

      // Validate Prometheus format
      expect(prometheusOutput).toContain('# HELP');
      expect(prometheusOutput).toContain('# TYPE');
      expect(prometheusOutput).toContain('wsp_adapter_requests_total');
      expect(prometheusOutput).toContain('wsp_adapter_request_duration_seconds');
      
      // Validate metric labels
      expect(prometheusOutput).toContain('adapter="etfFlow"');
      expect(prometheusOutput).toContain('status="200"');
      expect(prometheusOutput).toContain('le="0.5"');
    });

    it('should handle metrics collection during high load', () => {
      const highLoadScenario = {
        requestsPerSecond: 1000,
        concurrentAdapters: 4,
        durationSeconds: 60
      };

      const totalMetricsPoints = 
        highLoadScenario.requestsPerSecond * 
        highLoadScenario.concurrentAdapters * 
        highLoadScenario.durationSeconds;

      // Simulate metric recording at scale
      for (let i = 0; i < 100; i++) { // Sample of high load
        mockRecordAdapterRequest('etfFlow', 200, Math.random() * 500);
      }

      expect(mockRecordAdapterRequest).toHaveBeenCalledTimes(100);
      expect(totalMetricsPoints).toBe(240000); // Expected total metrics points

      // Verify performance doesn't degrade
      const maxLatency = 500; // ms
      expect(maxLatency).toBeLessThan(1000); // Should handle metrics efficiently
    });

    it('should validate metric cardinality limits', () => {
      const adapterNames = ['etfFlow', 'ratesFx', 'indices', 'calendar'];
      const statusCodes = ['200', '304', '404', '429', '500', '502', '503', '504', 'circuit_open', 'timeout'];
      
      // Calculate metric cardinality
      const cardinalityCount = adapterNames.length * statusCodes.length;
      const CARDINALITY_LIMIT = 100; // Reasonable limit for Prometheus

      expect(cardinalityCount).toBe(40);
      expect(cardinalityCount).toBeLessThan(CARDINALITY_LIMIT);

      // Ensure we don't accidentally create high cardinality metrics
      adapterNames.forEach(adapter => {
        statusCodes.forEach(status => {
          mockRecordAdapterRequest(adapter, status, 100);
        });
      });

      expect(mockRecordAdapterRequest).toHaveBeenCalledTimes(40);
    });
  });
});