import { describe, expect, it } from 'vitest';
import { describeNewSide, describeOldSide, formatRange, hunkNewCode, hunkOldCode, previewLines } from './format';
import type { Hunk } from './types';

const hunk = (overrides: Partial<Hunk>): Hunk => ({
  id: 'x',
  index: 0,
  type: 'modified',
  oldStart: 1,
  oldEnd: 1,
  newStart: 1,
  newEnd: 1,
  oldLines: [],
  newLines: [],
  removedCount: 0,
  addedCount: 0,
  ...overrides,
});

describe('card labels', () => {
  it('formats single lines and ranges', () => {
    expect(formatRange(7, 7)).toBe('7');
    expect(formatRange(7, 12)).toBe('7–12');
  });

  it('describes insertions and deletions by their anchor line', () => {
    expect(describeOldSide(hunk({ type: 'added', oldStart: 13, oldEnd: 12 }))).toBe('insert after line 12');
    expect(describeOldSide(hunk({ type: 'added', oldStart: 1, oldEnd: 0 }))).toBe('insert at top');
    expect(describeNewSide(hunk({ type: 'removed', newStart: 4, newEnd: 3 }))).toBe('deleted after line 3');
    expect(describeOldSide(hunk({ oldStart: 6, oldEnd: 10 }))).toBe('lines 6–10');
    expect(describeNewSide(hunk({ newStart: 11, newEnd: 11 }))).toBe('line 11');
  });

  it('previews the new side, or the old side for removals, skipping blank lines', () => {
    const preview = previewLines(hunk({ newLines: ['', 'a', 'b', ' ', 'c', 'd'] }));
    expect(preview).toEqual({ lines: ['a', 'b', 'c'], more: 1 });
    expect(previewLines(hunk({ type: 'removed', oldLines: ['gone'] })).lines).toEqual(['gone']);
  });
});

describe('copy text', () => {
  it('copies exactly the original lines of each side, without a trailing newline', () => {
    const h = hunk({ oldLines: ['\tvar a = 1;  ', ''], newLines: ['    var a = 2;'] });
    expect(hunkNewCode(h)).toBe('    var a = 2;');
    expect(hunkOldCode(h)).toBe('\tvar a = 1;  \n');
  });

  it('is empty for the side a pure insertion or deletion does not have', () => {
    expect(hunkOldCode(hunk({ type: 'added', newLines: ['x'] }))).toBe('');
    expect(hunkNewCode(hunk({ type: 'removed', oldLines: ['x'] }))).toBe('');
  });
});
