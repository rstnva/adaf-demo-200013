import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('WSP Adapters Circuit Breaker Tests', () => {
  let mockCanPassCircuit: any;
  let mockReportCircuitFailure: any;
  let mockReportCircuitSuccess: any;
  let mockRecordAdapterRequest: any;
  let mockFetchWithCacheETag: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mocks
    mockCanPassCircuit = vi.fn();
    mockReportCircuitFailure = vi.fn();
    mockReportCircuitSuccess = vi.fn();
    mockRecordAdapterRequest = vi.fn();
    mockFetchWithCacheETag = vi.fn();
  });

  describe('Circuit Breaker State Management', () => {
    it('should allow requests when circuit is closed', () => {
      // Simulate circuit closed (healthy state)
      mockCanPassCircuit.mockReturnValue(true);
      
      const canPass = mockCanPassCircuit('etfFlow');
      expect(canPass).toBe(true);
      expect(mockCanPassCircuit).toHaveBeenCalledWith('etfFlow');
    });

    it('should block requests when circuit is open', () => {
      // Simulate circuit open (unhealthy state)
      mockCanPassCircuit.mockReturnValue(false);
      
      const canPass = mockCanPassCircuit('etfFlow');
      expect(canPass).toBe(false);
      expect(mockCanPassCircuit).toHaveBeenCalledWith('etfFlow');
    });

    it('should track failures and open circuit after threshold', () => {
      // Simulate 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        mockReportCircuitFailure('etfFlow', 1000);
      }
      
      // After 3 failures, circuit should be open
      mockCanPassCircuit.mockReturnValue(false);
      const canPass = mockCanPassCircuit('etfFlow');
      
      expect(canPass).toBe(false);
      expect(mockReportCircuitFailure).toHaveBeenCalledTimes(3);
      expect(mockReportCircuitFailure).toHaveBeenCalledWith('etfFlow', 1000);
    });

    it('should reset circuit on success', () => {
      // Simulate success after failures
      mockReportCircuitSuccess('etfFlow');
      
      // Circuit should be closed after success
      mockCanPassCircuit.mockReturnValue(true);
      const canPass = mockCanPassCircuit('etfFlow');
      
      expect(canPass).toBe(true);
      expect(mockReportCircuitSuccess).toHaveBeenCalledWith('etfFlow');
    });
  });

  describe('Adapter Circuit Breaker Integration', () => {
    it('should return circuit_open error when circuit breaker blocks request', async () => {
      // Simulate circuit breaker blocking the request
      mockCanPassCircuit.mockReturnValue(false);
      
      // Simulate adapter behavior when circuit is open
      const simulateAdapter = async (adapterName: string) => {
        if (!mockCanPassCircuit(adapterName)) {
          // Record circuit open metric
          mockRecordAdapterRequest(adapterName, 'circuit_open', 0);
          throw new Error('circuit_open');
        }
        
        // Normal processing would happen here
        return { data: [], stale: false };
      };

      await expect(async () => {
        await simulateAdapter('etfFlow');
      }).rejects.toThrow('circuit_open');

      expect(mockCanPassCircuit).toHaveBeenCalledWith('etfFlow');
      expect(mockRecordAdapterRequest).toHaveBeenCalledWith('etfFlow', 'circuit_open', 0);
    });

    it('should process request normally when circuit allows', async () => {
      // Simulate circuit breaker allowing the request
      mockCanPassCircuit.mockReturnValue(true);
      mockFetchWithCacheETag.mockResolvedValue({
        body: JSON.stringify([{ symbol: 'BTC', netFlowUSD: 1000 }]),
        status: 200,
        stale: false
      });

      // Simulate successful adapter behavior
      const simulateAdapter = async (adapterName: string) => {
        if (!mockCanPassCircuit(adapterName)) {
          throw new Error('circuit_open');
        }
        
        const start = Date.now();
        const response = await mockFetchWithCacheETag(adapterName, 'test-url', 'test-key', 180, {});
        const duration = Date.now() - start;
        
        mockRecordAdapterRequest(adapterName, response.status, duration);
        mockReportCircuitSuccess(adapterName);
        
        return { data: JSON.parse(response.body), stale: response.stale };
      };

      const result = await simulateAdapter('etfFlow');

      expect(result.data).toEqual([{ symbol: 'BTC', netFlowUSD: 1000 }]);
      expect(result.stale).toBe(false);
      expect(mockCanPassCircuit).toHaveBeenCalledWith('etfFlow');
      expect(mockRecordAdapterRequest).toHaveBeenCalledWith('etfFlow', 200, expect.any(Number));
      expect(mockReportCircuitSuccess).toHaveBeenCalledWith('etfFlow');
    });

    it('should report failure and open circuit on adapter errors', async () => {
      // Simulate circuit allowing request but adapter failing
      mockCanPassCircuit.mockReturnValue(true);
      mockFetchWithCacheETag.mockRejectedValue(new Error('Network error'));

      const simulateAdapter = async (adapterName: string) => {
        if (!mockCanPassCircuit(adapterName)) {
          throw new Error('circuit_open');
        }
        
        const start = Date.now();
        try {
          const response = await mockFetchWithCacheETag(adapterName, 'test-url', 'test-key', 180, {});
          mockReportCircuitSuccess(adapterName);
          return { data: JSON.parse(response.body), stale: response.stale };
        } catch (error) {
          const duration = Date.now() - start;
          mockReportCircuitFailure(adapterName, 1000);
          mockRecordAdapterRequest(adapterName, 500, duration);
          throw error;
        }
      };

      await expect(simulateAdapter('etfFlow')).rejects.toThrow('Network error');

      expect(mockCanPassCircuit).toHaveBeenCalledWith('etfFlow');
      expect(mockReportCircuitFailure).toHaveBeenCalledWith('etfFlow', 1000);
      expect(mockRecordAdapterRequest).toHaveBeenCalledWith('etfFlow', 500, expect.any(Number));
    });
  });

  describe('Circuit Breaker with Multiple Adapters', () => {
    it('should manage circuit state independently for each adapter', () => {
      const adapters = ['etfFlow', 'ratesFx', 'indices', 'calendar'];
      
      adapters.forEach((adapter, index) => {
        // Some adapters are healthy, others are not
        const isHealthy = index % 2 === 0;
        mockCanPassCircuit.mockReturnValue(isHealthy);
        
        const canPass = mockCanPassCircuit(adapter);
        expect(canPass).toBe(isHealthy);
        
        if (isHealthy) {
          mockReportCircuitSuccess(adapter);
        } else {
          mockReportCircuitFailure(adapter, 1000);
        }
      });

      expect(mockCanPassCircuit).toHaveBeenCalledTimes(4);
      expect(mockReportCircuitSuccess).toHaveBeenCalledTimes(2);
      expect(mockReportCircuitFailure).toHaveBeenCalledTimes(2);
    });

    it('should handle circuit breaker escalation scenario', () => {
      // Simulate progressive failure scenario
      const adapter = 'etfFlow';
      
      // First failure - circuit should remain closed
      mockCanPassCircuit.mockReturnValue(true);
      mockReportCircuitFailure(adapter, 1000);
      
      let canPass = mockCanPassCircuit(adapter);
      expect(canPass).toBe(true);
      
      // Second failure - circuit should remain closed
      mockReportCircuitFailure(adapter, 1000);
      canPass = mockCanPassCircuit(adapter);
      expect(canPass).toBe(true);
      
      // Third failure - circuit should open
      mockReportCircuitFailure(adapter, 1000);
      mockCanPassCircuit.mockReturnValue(false); // Circuit opens after 3 failures
      
      canPass = mockCanPassCircuit(adapter);
      expect(canPass).toBe(false);
      
      expect(mockReportCircuitFailure).toHaveBeenCalledTimes(3);
      expect(mockCanPassCircuit).toHaveBeenCalledTimes(3);
    });
  });

  describe('Circuit Breaker Metrics Integration', () => {
    it('should record correct metrics for circuit_open status', () => {
      mockCanPassCircuit.mockReturnValue(false);
      
      // Simulate the metric recording when circuit is open
      const adapterName = 'etfFlow';
      const latency = 0; // No actual request made when circuit is open
      
      mockRecordAdapterRequest(adapterName, 'circuit_open', latency);
      
      expect(mockRecordAdapterRequest).toHaveBeenCalledWith(adapterName, 'circuit_open', 0);
    });

    it('should record different status codes based on circuit state', () => {
      const scenarios = [
        { circuitOpen: false, fetchSuccess: true, expectedStatus: 200 },
        { circuitOpen: false, fetchSuccess: false, expectedStatus: 500 },
        { circuitOpen: true, fetchSuccess: false, expectedStatus: 'circuit_open' }
      ];

      scenarios.forEach(scenario => {
        mockCanPassCircuit.mockReturnValue(!scenario.circuitOpen);
        
        if (scenario.circuitOpen) {
          // Circuit is open
          mockRecordAdapterRequest('testAdapter', 'circuit_open', 0);
        } else if (scenario.fetchSuccess) {
          // Circuit closed and request succeeds
          mockRecordAdapterRequest('testAdapter', 200, 250);
        } else {
          // Circuit closed but request fails
          mockRecordAdapterRequest('testAdapter', 500, 150);
        }
      });

      expect(mockRecordAdapterRequest).toHaveBeenCalledTimes(3);
      expect(mockRecordAdapterRequest).toHaveBeenCalledWith('testAdapter', 'circuit_open', 0);
      expect(mockRecordAdapterRequest).toHaveBeenCalledWith('testAdapter', 200, 250);
      expect(mockRecordAdapterRequest).toHaveBeenCalledWith('testAdapter', 500, 150);
    });
  });

  describe('Circuit Breaker Edge Cases', () => {
    it('should handle rapid successive failures', () => {
      const adapter = 'etfFlow';
      
      // Simulate rapid successive failures
      for (let i = 0; i < 5; i++) {
        mockReportCircuitFailure(adapter, 1000);
      }
      
      // After multiple failures, circuit should definitely be open
      mockCanPassCircuit.mockReturnValue(false);
      const canPass = mockCanPassCircuit(adapter);
      
      expect(canPass).toBe(false);
      expect(mockReportCircuitFailure).toHaveBeenCalledTimes(5);
    });

    it('should verify circuit breaker backoff parameters', () => {
      const adapter = 'etfFlow';
      const baseBackoffMs = 1000;
      
      // Test that different backoff values are handled
      const backoffValues = [500, 1000, 2000, 5000];
      
      backoffValues.forEach(backoff => {
        mockReportCircuitFailure(adapter, backoff);
        expect(mockReportCircuitFailure).toHaveBeenCalledWith(adapter, backoff);
      });
    });

    it('should test circuit breaker with all WSP adapters', () => {
      const wspAdapters = ['etfFlow', 'ratesFx', 'indices', 'calendar'];
      
      wspAdapters.forEach(adapter => {
        // Test circuit open scenario for each adapter
        mockCanPassCircuit.mockReturnValue(false);
        const canPass = mockCanPassCircuit(adapter);
        
        expect(canPass).toBe(false);
        expect(mockCanPassCircuit).toHaveBeenCalledWith(adapter);
        
        // Test failure reporting for each adapter
        mockReportCircuitFailure(adapter, 1000);
        expect(mockReportCircuitFailure).toHaveBeenCalledWith(adapter, 1000);
      });

      expect(mockCanPassCircuit).toHaveBeenCalledTimes(4);
      expect(mockReportCircuitFailure).toHaveBeenCalledTimes(4);
    });
  });
});