import { diffArrays } from 'diff';
import { fnv1a } from './hash';
import { normalizeSide } from './normalize';
import type { DiffResult, Hunk, HunkType, NormalizeOptions, NormalizedSide } from './types';

/** Give up on a precise line diff after this long and fall back to one whole-file hunk. */
export const DIFF_TIMEOUT_MS = 5000;

/** A run of changed keys: [aStart, aEnd) in the old keys, [bStart, bEnd) in the new keys. */
interface KeyRange {
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
}

/**
 * Diffs two key arrays and returns the changed runs. The common prefix and
 * suffix are stripped first, which keeps the typical "AI changed a few
 * functions in a long file" case fast.
 */
function changedRanges(a: string[], b: string[], timeoutMs: number): KeyRange[] | undefined {
  let prefix = 0;
  const maxPrefix = Math.min(a.length, b.length);
  while (prefix < maxPrefix && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  const maxSuffix = maxPrefix - prefix;
  while (suffix < maxSuffix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++;

  const midA = a.slice(prefix, a.length - suffix);
  const midB = b.slice(prefix, b.length - suffix);
  if (midA.length === 0 && midB.length === 0) return [];
  if (midA.length === 0 || midB.length === 0) {
    return [{ aStart: prefix, aEnd: prefix + midA.length, bStart: prefix, bEnd: prefix + midB.length }];
  }

  const changes = diffArrays(midA, midB, { timeout: timeoutMs });
  if (!changes) return undefined;

  const ranges: KeyRange[] = [];
  let ai = prefix;
  let bi = prefix;
  let open: KeyRange | null = null;
  for (const change of changes) {
    if (!change.added && !change.removed) {
      if (open) ranges.push(open);
      open = null;
      ai += change.count;
      bi += change.count;
      continue;
    }
    open ??= { aStart: ai, aEnd: ai, bStart: bi, bEnd: bi };
    if (change.removed) {
      ai += change.count;
      open.aEnd = ai;
    } else {
      bi += change.count;
      open.bEnd = bi;
    }
  }
  if (open) ranges.push(open);
  return ranges;
}

/**
 * Converts a range of keys into 1-based original line numbers. An empty range
 * becomes `end = start - 1`, anchored after the original line of the key just
 * before it.
 */
function toLineRange(side: NormalizedSide, keyStart: number, keyEnd: number) {
  if (keyEnd > keyStart) {
    return { start: side.indexMap[keyStart] + 1, end: side.indexMap[keyEnd - 1] + 1 };
  }
  const after = keyStart === 0 ? 0 : side.indexMap[keyStart - 1] + 1;
  return { start: after + 1, end: after };
}

function linesIn(side: NormalizedSide, start: number, end: number): string[] {
  return side.lines.slice(start - 1, end).map((line) => line.text);
}

function hunkType(removed: number, added: number): HunkType {
  if (removed === 0) return 'added';
  if (added === 0) return 'removed';
  return 'modified';
}

function assignIds(hunks: Omit<Hunk, 'id'>[]): Hunk[] {
  const seen = new Map<string, number>();
  return hunks.map((hunk) => {
    const base = fnv1a(`${hunk.oldLines.join('\n')}\u0001${hunk.newLines.join('\n')}`);
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return { ...hunk, id: `${base}-${occurrence}` };
  });
}

function summarize(hunks: Hunk[]): DiffResult['summary'] {
  let added = 0;
  let removed = 0;
  for (const hunk of hunks) {
    added += hunk.addedCount;
    removed += hunk.removedCount;
  }
  return { hunks: hunks.length, added, removed };
}

export function computeDiff(
  oldText: string,
  newText: string,
  options: NormalizeOptions,
  timeoutMs = DIFF_TIMEOUT_MS,
): DiffResult {
  const identical = oldText === newText;
  if (identical) {
    return { hunks: [], summary: { hunks: 0, added: 0, removed: 0 }, identical, approximate: false };
  }

  const oldSide = normalizeSide(oldText, options);
  const newSide = normalizeSide(newText, options);
  let ranges = changedRanges(oldSide.keys, newSide.keys, timeoutMs);
  const approximate = ranges === undefined;
  ranges ??= [{ aStart: 0, aEnd: oldSide.keys.length, bStart: 0, bEnd: newSide.keys.length }];

  const hunks = assignIds(
    ranges.map((range, index) => {
      const oldRange = toLineRange(oldSide, range.aStart, range.aEnd);
      const newRange = toLineRange(newSide, range.bStart, range.bEnd);
      const removedCount = range.aEnd - range.aStart;
      const addedCount = range.bEnd - range.bStart;
      return {
        index,
        type: hunkType(removedCount, addedCount),
        oldStart: oldRange.start,
        oldEnd: oldRange.end,
        newStart: newRange.start,
        newEnd: newRange.end,
        oldLines: linesIn(oldSide, oldRange.start, oldRange.end),
        newLines: linesIn(newSide, newRange.start, newRange.end),
        removedCount,
        addedCount,
      };
    }),
  );

  return { hunks, summary: summarize(hunks), identical, approximate };
}
