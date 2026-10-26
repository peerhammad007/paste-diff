import { describe, expect, it } from 'vitest';
import { DEFAULT_NORMALIZE_OPTIONS, isNormalizeOptions } from './types';

describe('isNormalizeOptions', () => {
  it('accepts stored options and rejects anything malformed', () => {
    expect(isNormalizeOptions(DEFAULT_NORMALIZE_OPTIONS)).toBe(true);
    expect(isNormalizeOptions({ ...DEFAULT_NORMALIZE_OPTIONS, ignoreBlankLines: 'yes' })).toBe(false);
    expect(isNormalizeOptions({ ignoreLineEndings: true })).toBe(false);
    expect(isNormalizeOptions(null)).toBe(false);
    expect(isNormalizeOptions('x')).toBe(false);
  });
});
