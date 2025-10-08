import { slope3d, StablecoinMcap } from './stables';

describe('slope3d', () => {
  it('returns up for >0.5% increase', () => {
    const arr: StablecoinMcap[] = [
      { date: 'd1', mcap: 100 },
      { date: 'd2', mcap: 101 },
      { date: 'd3', mcap: 101.5 },
    ];
    expect(slope3d(arr)).toBe('up');
  });
  it('returns down for <-0.5% decrease', () => {
    const arr: StablecoinMcap[] = [
      { date: 'd1', mcap: 100 },
      { date: 'd2', mcap: 99 },
      { date: 'd3', mcap: 99.4 },
    ];
    expect(slope3d(arr)).toBe('down');
  });
  it('returns flat for small change', () => {
    const arr: StablecoinMcap[] = [
      { date: 'd1', mcap: 100 },
      { date: 'd2', mcap: 100.2 },
      { date: 'd3', mcap: 100.3 },
    ];
    expect(slope3d(arr)).toBe('flat');
  });
});
