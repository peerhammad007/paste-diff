import type { Hunk } from './types';

/** "12" or "12–18". */
export function formatRange(start: number, end: number): string {
  return start === end ? String(start) : `${start}–${end}`;
}

/** "line 12" or "lines 12–18". */
function lineLabel(start: number, end: number): string {
  return `${start === end ? 'line' : 'lines'} ${formatRange(start, end)}`;
}

/** Where a hunk sits on the old side, as shown on its card. */
export function describeOldSide(hunk: Hunk): string {
  if (hunk.type === 'added') {
    return hunk.oldEnd === 0 ? 'insert at top' : `insert after line ${hunk.oldEnd}`;
  }
  return lineLabel(hunk.oldStart, hunk.oldEnd);
}

/** Where a hunk sits on the new side, as shown on its card. */
export function describeNewSide(hunk: Hunk): string {
  if (hunk.type === 'removed') {
    return hunk.newEnd === 0 ? 'deleted at top' : `deleted after line ${hunk.newEnd}`;
  }
  return lineLabel(hunk.newStart, hunk.newEnd);
}

/** Up to `max` non-blank lines of the side that best shows the change, plus how many were left out. */
export function previewLines(hunk: Hunk, max = 3): { lines: string[]; more: number } {
  const source = hunk.type === 'removed' ? hunk.oldLines : hunk.newLines;
  const nonBlank = source.filter((line) => line.trim() !== '');
  return { lines: nonBlank.slice(0, max), more: Math.max(0, nonBlank.length - max) };
}

/** The lines to paste into Studio for this hunk, without a trailing newline. */
export function hunkNewCode(hunk: Hunk): string {
  return hunk.newLines.join('\n');
}

/** The original lines, for rolling a hunk back. */
export function hunkOldCode(hunk: Hunk): string {
  return hunk.oldLines.join('\n');
}
