import { describe, it, expect } from 'vitest';
import { 
  evaluateSemaforo, 
  getFundingSign, 
  getStablecoinSlope,
  type SignalInputs 
} from '@/lib/signals';
import { CurrentEtfMetrics } from '@/lib/ssv';

describe('signals', () => {
  const mockCurrentMetrics: CurrentEtfMetrics = {
    totalNetAssets: { value: 50e9, unit: 'USD' },
    marketCapPercentage: { value: 2.5, unit: '%' },
    btcHoldings: { value: 800000, unit: 'BTC' },
    dailyNetInflow: { value: -100e6, unit: 'USD' }, // Negative inflow
    cumulativeNetInflow: { value: -500e6, unit: 'USD' }, // Declining cumulative
    dailyValueTraded: { value: 2e9, unit: 'USD' },
    updateTime: new Date().toISOString()
  };

  describe('evaluateSemaforo', () => {
    it('should return red state when multiple negative indicators present', () => {
      const inputs: SignalInputs = {
        ssvCurrent: mockCurrentMetrics,
        fundingBtcSign: 'negativo',
        stablecoinMcapSlope: 'down'
      };

      const result = evaluateSemaforo(inputs);

      expect(result.state).toBe('red');
      expect(result.triggers).toContain('Daily net inflow is negative');
      expect(result.triggers).toContain('Cumulative inflow trend declining');
      expect(result.recommendation).toContain('rotating subsidies to RWA/gold');
    });

    it('should return yellow state for moderate concerns', () => {
      const inputs: SignalInputs = {
        ssvCurrent: {
          ...mockCurrentMetrics,
          dailyNetInflow: { value: 50e6, unit: 'USD' }, // Positive inflow
          cumulativeNetInflow: { value: 1e9, unit: 'USD' } // Positive cumulative
        },
        fundingBtcSign: 'negativo', // Only one negative signal
        stablecoinMcapSlope: 'up'
      };

      const result = evaluateSemaforo(inputs);

      expect(result.state).toBe('yellow');
      expect(result.triggers).toContain('BTC funding rates negative');
      expect(result.recommendation).toContain('Exercise caution');
    });

    it('should return green state when all indicators positive', () => {
      const inputs: SignalInputs = {
        ssvCurrent: {
          ...mockCurrentMetrics,
          dailyNetInflow: { value: 200e6, unit: 'USD' },
          cumulativeNetInflow: { value: 5e9, unit: 'USD' }
        },
        fundingBtcSign: 'positivo',
        stablecoinMcapSlope: 'up'
      };

      const result = evaluateSemaforo(inputs);

      expect(result.state).toBe('green');
      expect(result.recommendation).toContain('Continue current allocation');
    });

    it('should detect basis clean signal', () => {
      const inputs: SignalInputs = {
        ssvCurrent: mockCurrentMetrics, // Has negative inflow
        fundingBtcSign: 'negativo',
        stablecoinMcapSlope: 'up',
        historicalInflows: [
          { date: '2024-01-01', dailyNetInflow: -50e6 },
          { date: '2024-01-02', dailyNetInflow: -80e6 }
        ]
      };

      const result = evaluateSemaforo(inputs);

      expect(result.basisClean).toBe(true);
      expect(result.triggers).toContain('Basis Clean: Negative inflows + negative funding detected');
    });

    it('should handle null SSV data gracefully', () => {
      const inputs: SignalInputs = {
        ssvCurrent: null,
        fundingBtcSign: 'neutro',
        stablecoinMcapSlope: 'flat'
      };

      const result = evaluateSemaforo(inputs);

      expect(result.state).toBe('green');
      expect(result.basisClean).toBe(false);
      expect(result.triggers).toHaveLength(0);
    });
  });

  describe('getFundingSign', () => {
    it('should classify funding rates correctly', () => {
      expect(getFundingSign(-0.02)).toBe('negativo');
      expect(getFundingSign(-0.005)).toBe('neutro');
      expect(getFundingSign(0.005)).toBe('neutro');
      expect(getFundingSign(0.02)).toBe('positivo');
    });
  });

  describe('getStablecoinSlope', () => {
    it('should determine slope from market cap changes', () => {
      expect(getStablecoinSlope([100, 105])).toBe('up'); // 5% growth
      expect(getStablecoinSlope([100, 95])).toBe('down'); // 5% decline
      expect(getStablecoinSlope([100, 101])).toBe('flat'); // 1% growth (within threshold)
    });

    it('should handle insufficient data', () => {
      expect(getStablecoinSlope([100])).toBe('flat');
      expect(getStablecoinSlope([])).toBe('flat');
    });
  });
});