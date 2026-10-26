import { describe, expect, it } from 'vitest';
import { stepIndex } from './useHunkNavigation';

describe('stepIndex', () => {
  it('starts at the first hunk going forward and the last going back', () => {
    expect(stepIndex(-1, 4, 1)).toBe(0);
    expect(stepIndex(-1, 4, -1)).toBe(3);
  });

  it('moves one hunk at a time and wraps around', () => {
    expect(stepIndex(0, 4, 1)).toBe(1);
    expect(stepIndex(3, 4, 1)).toBe(0);
    expect(stepIndex(0, 4, -1)).toBe(3);
  });

  it('has nowhere to go without hunks', () => {
    expect(stepIndex(-1, 0, 1)).toBe(-1);
  });

  it('restarts from an end if the active hunk disappeared', () => {
    expect(stepIndex(7, 3, 1)).toBe(0);
  });
});
