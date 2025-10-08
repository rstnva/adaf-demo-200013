import { describe, it, expect } from 'vitest';
import { updateWelford, stdFromWelford, P2Quantile, rollPctl } from '../src/lib/wsp/norm/streaming';

describe('Welford streaming stats', () => {
  it('computes mean/std incrementally', () => {
    const data = [1, 2, 3, 4, 5];
    let state: any = null;
    for (const x of data) state = updateWelford(state, x);
    expect(state.count).toBe(5);
    expect(state.mean).toBeCloseTo(3, 1e-6 as any);
    expect(stdFromWelford(state)).toBeCloseTo(Math.sqrt(2.5), 1e-6 as any);
  });
});

describe('P² quantile estimator', () => {
  it('estimates p5/p95 reasonably for skewed data', () => {
    const p5 = new P2Quantile(0.05);
    const p95 = new P2Quantile(0.95);
    // Simulate skewed: many small, few large
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() < 0.98 ? Math.random() * 10 : 50 + Math.random() * 50;
      p5.update(x); p95.update(x);
    }
    const q05 = p5.estimate()!;
    const q95 = p95.estimate()!;
    expect(q05).toBeGreaterThanOrEqual(0);
    expect(q95).toBeGreaterThan(q05);
  });
});
