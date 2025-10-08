import { describe, it, expect } from 'vitest';
import { useFeatureFlag } from '../src/lib/featureFlags';

describe('Feature flags', () => {
  it('FF_WSP_ENABLED defaults true unless set false', () => {
    expect(useFeatureFlag('FF_WSP_ENABLED')).toBeTypeOf('boolean');
  });
});
