import { fundingSign, FundingRate } from './derivatives';

describe('fundingSign', () => {
  it('returns negativo for negative avg', () => {
    const arr: FundingRate[] = [
      { ts: 1, symbol: 'BTC', funding8h: -0.02 },
      { ts: 2, symbol: 'BTC', funding8h: -0.03 },
    ];
    expect(fundingSign(arr)).toBe('negativo');
  });
  it('returns positivo for positive avg', () => {
    const arr: FundingRate[] = [
      { ts: 1, symbol: 'BTC', funding8h: 0.02 },
      { ts: 2, symbol: 'BTC', funding8h: 0.03 },
    ];
    expect(fundingSign(arr)).toBe('positivo');
  });
  it('returns neutro for near zero avg', () => {
    const arr: FundingRate[] = [
      { ts: 1, symbol: 'BTC', funding8h: 0.005 },
      { ts: 2, symbol: 'BTC', funding8h: -0.005 },
    ];
    expect(fundingSign(arr)).toBe('neutro');
  });
});
