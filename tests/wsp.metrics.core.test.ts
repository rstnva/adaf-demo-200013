import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wspMetrics, recordApiHit, setWspsScore, recordAdapterRequest, recordCacheHit, recordEvent } from '@/metrics/wsp.metrics';

describe('WSP Metrics Core Functions', () => {
  beforeEach(() => {
    // Reset in-memory metrics
    wspMetrics.adapterRequests = 0;
    wspMetrics.wspsScore = 0;
    wspMetrics.eventsTotal = 0;
    wspMetrics.cacheHits = 0;
    wspMetrics.apiHits = 0;
  });

  describe('In-memory metrics tracking', () => {
    it('should track API hits correctly', () => {
      expect(wspMetrics.apiHits).toBe(0);
      
      recordApiHit('/api/wsp/etf', 200, 250);
      expect(wspMetrics.apiHits).toBe(1);
      
      recordApiHit('/api/wsp/indices', 500, 1500);
      expect(wspMetrics.apiHits).toBe(2);
      
      recordApiHit(); // No params
      expect(wspMetrics.apiHits).toBe(3);
    });

    it('should track WSPS score updates', () => {
      expect(wspMetrics.wspsScore).toBe(0);
      
      setWspsScore(0.75);
      expect(wspMetrics.wspsScore).toBe(0.75);
      
      setWspsScore(0.25);
      expect(wspMetrics.wspsScore).toBe(0.25);
      
      setWspsScore(1.0);
      expect(wspMetrics.wspsScore).toBe(1.0);
    });

    it('should track adapter requests correctly', () => {
      expect(wspMetrics.adapterRequests).toBe(0);
      
      recordAdapterRequest('etfFlow', 200, 150);
      expect(wspMetrics.adapterRequests).toBe(1);
      
      recordAdapterRequest('ratesFx', 304, 50);
      expect(wspMetrics.adapterRequests).toBe(2);
      
      recordAdapterRequest('indices', 500, 2000);
      expect(wspMetrics.adapterRequests).toBe(3);
      
      recordAdapterRequest(); // No params
      expect(wspMetrics.adapterRequests).toBe(4);
    });

    it('should track cache hits with different sources', () => {
      expect(wspMetrics.cacheHits).toBe(0);
      
      recordCacheHit('redis');
      expect(wspMetrics.cacheHits).toBe(1);
      
      recordCacheHit('memory');
      expect(wspMetrics.cacheHits).toBe(2);
      
      recordCacheHit('etag');
      expect(wspMetrics.cacheHits).toBe(3);
      
      recordCacheHit('other');
      expect(wspMetrics.cacheHits).toBe(4);
      
      recordCacheHit(); // Default to redis
      expect(wspMetrics.cacheHits).toBe(5);
    });

    it('should track events correctly', () => {
      expect(wspMetrics.eventsTotal).toBe(0);
      
      recordEvent();
      expect(wspMetrics.eventsTotal).toBe(1);
      
      recordEvent();
      expect(wspMetrics.eventsTotal).toBe(2);
      
      recordEvent();
      expect(wspMetrics.eventsTotal).toBe(3);
    });
  });

  describe('Parameter edge cases', () => {
    it('should handle recordApiHit with various parameter combinations', () => {
      recordApiHit('/api/test', 200, 100);
      expect(wspMetrics.apiHits).toBe(1);
      
      recordApiHit('/api/test', 200); // No duration
      expect(wspMetrics.apiHits).toBe(2);
      
      recordApiHit('/api/test'); // No status or duration
      expect(wspMetrics.apiHits).toBe(3);
      
      recordApiHit(undefined, 500, 1000); // No route
      expect(wspMetrics.apiHits).toBe(4);
      
      recordApiHit('', 0, 0); // Empty/zero values
      expect(wspMetrics.apiHits).toBe(5);
    });

    it('should handle recordAdapterRequest with various parameter combinations', () => {
      recordAdapterRequest('etfFlow', 200, 250);
      expect(wspMetrics.adapterRequests).toBe(1);
      
      recordAdapterRequest('etfFlow', 200); // No duration
      expect(wspMetrics.adapterRequests).toBe(2);
      
      recordAdapterRequest('etfFlow'); // No status or duration
      expect(wspMetrics.adapterRequests).toBe(3);
      
      recordAdapterRequest(undefined, 500, 1500); // No adapter
      expect(wspMetrics.adapterRequests).toBe(4);
      
      recordAdapterRequest('', 0, 0); // Empty/zero values
      expect(wspMetrics.adapterRequests).toBe(5);
    });

    it('should handle numerical edge cases', () => {
      setWspsScore(0);
      expect(wspMetrics.wspsScore).toBe(0);
      
      setWspsScore(1);
      expect(wspMetrics.wspsScore).toBe(1);
      
      setWspsScore(-0.5);
      expect(wspMetrics.wspsScore).toBe(-0.5);
      
      setWspsScore(1.5);
      expect(wspMetrics.wspsScore).toBe(1.5);
      
      recordApiHit('/api/test', 200, 0); // Zero duration
      recordAdapterRequest('test', 200, 0); // Zero duration
      
      expect(wspMetrics.apiHits).toBe(1);
      expect(wspMetrics.adapterRequests).toBe(1);
    });
  });

  describe('Metrics state consistency', () => {
    it('should maintain consistent state across multiple operations', () => {
      // Initial state
      expect(wspMetrics.apiHits).toBe(0);
      expect(wspMetrics.adapterRequests).toBe(0);
      expect(wspMetrics.cacheHits).toBe(0);
      expect(wspMetrics.eventsTotal).toBe(0);
      expect(wspMetrics.wspsScore).toBe(0);
      
      // Perform various operations
      recordApiHit('/api/wsp/etf', 200, 150);
      recordAdapterRequest('etfFlow', 200, 100);
      recordCacheHit('redis');
      recordEvent();
      setWspsScore(0.8);
      
      // Verify all counters updated correctly
      expect(wspMetrics.apiHits).toBe(1);
      expect(wspMetrics.adapterRequests).toBe(1);
      expect(wspMetrics.cacheHits).toBe(1);
      expect(wspMetrics.eventsTotal).toBe(1);
      expect(wspMetrics.wspsScore).toBe(0.8);
      
      // Perform more operations
      recordApiHit('/api/wsp/indices', 304, 50);
      recordAdapterRequest('indices', 304, 75);
      recordCacheHit('etag');
      recordEvent();
      setWspsScore(0.6);
      
      // Verify counters incremented and score updated
      expect(wspMetrics.apiHits).toBe(2);
      expect(wspMetrics.adapterRequests).toBe(2);
      expect(wspMetrics.cacheHits).toBe(2);
      expect(wspMetrics.eventsTotal).toBe(2);
      expect(wspMetrics.wspsScore).toBe(0.6);
    });

    it('should handle rapid successive calls correctly', () => {
      // Simulate high-frequency operations
      for (let i = 0; i < 100; i++) {
        recordApiHit(`/api/test-${i}`, 200, i * 10);
        recordAdapterRequest(`adapter-${i}`, 200, i * 5);
        recordCacheHit(i % 2 === 0 ? 'redis' : 'memory');
        recordEvent();
      }
      
      setWspsScore(0.95);
      
      expect(wspMetrics.apiHits).toBe(100);
      expect(wspMetrics.adapterRequests).toBe(100);
      expect(wspMetrics.cacheHits).toBe(100);
      expect(wspMetrics.eventsTotal).toBe(100);
      expect(wspMetrics.wspsScore).toBe(0.95);
    });
  });
});