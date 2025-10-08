import { describe, it, expect } from 'vitest';
import { calculateWSPS } from '../src/components/dashboard/wsp/utils/scoring';

describe('WSPS scoring', () => {
  it('computes score and color thresholds', () => {
    const res = calculateWSPS({
      ETF_BTC_FLOW_NORM: 0.8,
      ETF_ETH_FLOW_NORM: 0.7,
      VIX_NORM: 0.9,
      DXY_NORM: 0.6,
      SPREAD_2s10s_NORM: 0.5,
      SPX_NDX_MOM_NORM: 0.7,
    });
    expect(res.score).toBeGreaterThan(0);
    expect(['green','yellow','red']).toContain(res.color);
    expect(res.breakdown.length).toBe(6);
  });
});
