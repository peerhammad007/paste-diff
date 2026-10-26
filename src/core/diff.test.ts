import { describe, expect, it } from 'vitest';
import { computeDiff } from './diff';
import { normalizeSide, splitLines } from './normalize';
import type { Hunk, NormalizeOptions } from './types';

const STRICT: NormalizeOptions = {
  ignoreTrailingWhitespace: false,
  ignoreLineEndings: false,
  ignoreAllWhitespace: false,
  ignoreBlankLines: false,
};

const opts = (overrides: Partial<NormalizeOptions>): NormalizeOptions => ({
  ...STRICT,
  ...overrides,
});

const lines = (...rows: string[]) => rows.join('\n') + '\n';

/** Every combination of the four toggles. */
const ALL_OPTION_COMBOS: NormalizeOptions[] = Array.from({ length: 16 }, (_, bits) => ({
  ignoreTrailingWhitespace: Boolean(bits & 1),
  ignoreLineEndings: Boolean(bits & 2),
  ignoreAllWhitespace: Boolean(bits & 4),
  ignoreBlankLines: Boolean(bits & 8),
}));

/**
 * Applies hunks to the old text the way a person would in Studio: replace
 * each old range with the hunk's new lines, keep everything else.
 */
function applyHunks(oldText: string, hunks: Hunk[]): string[] {
  const old = splitLines(oldText).map((line) => line.text);
  const out: string[] = [];
  let cursor = 1;
  for (const hunk of hunks) {
    out.push(...old.slice(cursor - 1, hunk.oldStart - 1));
    out.push(...hunk.newLines);
    cursor = hunk.oldEnd + 1;
  }
  out.push(...old.slice(cursor - 1));
  return out;
}

/** Checks the invariants every hunk list must satisfy, for any options. */
function expectConsistent(oldText: string, newText: string, options: NormalizeOptions) {
  const result = computeDiff(oldText, newText, options);
  const oldLines = splitLines(oldText).map((line) => line.text);
  const newLines = splitLines(newText).map((line) => line.text);

  let prevOldEnd = 0;
  let prevNewEnd = 0;
  result.hunks.forEach((hunk, i) => {
    expect(hunk.index).toBe(i);
    // Ranges are in order, don't overlap, and stay inside the original text.
    expect(hunk.oldStart).toBeGreaterThan(prevOldEnd);
    expect(hunk.newStart).toBeGreaterThan(prevNewEnd);
    expect(hunk.oldEnd).toBeGreaterThanOrEqual(hunk.oldStart - 1);
    expect(hunk.newEnd).toBeGreaterThanOrEqual(hunk.newStart - 1);
    expect(hunk.oldEnd).toBeLessThanOrEqual(oldLines.length);
    expect(hunk.newEnd).toBeLessThanOrEqual(newLines.length);
    // Line numbers map to the ORIGINAL text, and the hunk carries that original text.
    expect(hunk.oldLines).toEqual(oldLines.slice(hunk.oldStart - 1, hunk.oldEnd));
    expect(hunk.newLines).toEqual(newLines.slice(hunk.newStart - 1, hunk.newEnd));
    // Type matches which sides have lines.
    if (hunk.type === 'added') expect(hunk.oldLines).toHaveLength(0);
    if (hunk.type === 'removed') expect(hunk.newLines).toHaveLength(0);
    if (hunk.type === 'modified') {
      expect(hunk.oldLines.length).toBeGreaterThan(0);
      expect(hunk.newLines.length).toBeGreaterThan(0);
    }
    prevOldEnd = Math.max(hunk.oldEnd, hunk.oldStart - 1);
    prevNewEnd = Math.max(hunk.newEnd, hunk.newStart - 1);
  });

  // Applying every hunk to the old text gives the new text, as far as the
  // chosen options can tell.
  const applied = applyHunks(oldText, result.hunks).map((line) => line + '\n').join('');
  const keyOptions = { ...options, ignoreLineEndings: true };
  expect(normalizeSide(applied, keyOptions).keys).toEqual(normalizeSide(newText, keyOptions).keys);
  if (!options.ignoreTrailingWhitespace && !options.ignoreAllWhitespace && !options.ignoreBlankLines) {
    expect(applyHunks(oldText, result.hunks)).toEqual(newLines);
  }
  return result;
}

describe('identical and equivalent inputs', () => {
  it('reports identical inputs with no hunks', () => {
    const text = lines('var a = 1;', 'var b = 2;');
    const result = computeDiff(text, text, STRICT);
    expect(result.identical).toBe(true);
    expect(result.hunks).toEqual([]);
    expect(result.summary).toEqual({ hunks: 0, added: 0, removed: 0 });
  });

  it('two empty inputs are identical', () => {
    expect(computeDiff('', '', STRICT).identical).toBe(true);
  });

  it('inputs equal only after normalization have no hunks but are not identical', () => {
    const result = computeDiff('a();  \nb();\n', 'a();\nb();\n', opts({ ignoreTrailingWhitespace: true }));
    expect(result.identical).toBe(false);
    expect(result.hunks).toEqual([]);
  });
});

describe('hunk extraction', () => {
  const base = lines('line 1', 'line 2', 'line 3', 'line 4', 'line 5');

  it('a changed line is one modified hunk at that line', () => {
    const next = lines('line 1', 'line 2', 'LINE 3', 'line 4', 'line 5');
    const [hunk, ...rest] = expectConsistent(base, next, STRICT).hunks;
    expect(rest).toEqual([]);
    expect(hunk).toMatchObject({
      type: 'modified',
      oldStart: 3,
      oldEnd: 3,
      newStart: 3,
      newEnd: 3,
      oldLines: ['line 3'],
      newLines: ['LINE 3'],
      removedCount: 1,
      addedCount: 1,
    });
  });

  it('adjacent changed lines form one hunk; separated changes form separate hunks', () => {
    const next = lines('X', 'Y', 'line 3', 'line 4', 'Z');
    const result = expectConsistent(base, next, STRICT);
    expect(result.hunks.map((h) => [h.oldStart, h.oldEnd, h.newStart, h.newEnd])).toEqual([
      [1, 2, 1, 2],
      [5, 5, 5, 5],
    ]);
    expect(result.summary).toEqual({ hunks: 2, added: 3, removed: 3 });
  });

  it('an insertion in the middle is an added hunk anchored after the previous old line', () => {
    const next = lines('line 1', 'line 2', 'new a', 'new b', 'line 3', 'line 4', 'line 5');
    const [hunk] = expectConsistent(base, next, STRICT).hunks;
    expect(hunk).toMatchObject({ type: 'added', oldStart: 3, oldEnd: 2, newStart: 3, newEnd: 4 });
    expect(hunk.newLines).toEqual(['new a', 'new b']);
  });

  it('an insertion at the very top is anchored after line 0', () => {
    const [hunk] = expectConsistent(base, lines('// header', ...base.trim().split('\n')), STRICT).hunks;
    expect(hunk).toMatchObject({ type: 'added', oldStart: 1, oldEnd: 0, newStart: 1, newEnd: 1 });
  });

  it('an insertion at the end is anchored after the last old line', () => {
    const [hunk] = expectConsistent(base, base + 'line 6\n', STRICT).hunks;
    expect(hunk).toMatchObject({ type: 'added', oldStart: 6, oldEnd: 5, newStart: 6, newEnd: 6 });
  });

  it('a deletion is a removed hunk with the old range and an empty new range', () => {
    const next = lines('line 1', 'line 4', 'line 5');
    const [hunk] = expectConsistent(base, next, STRICT).hunks;
    expect(hunk).toMatchObject({ type: 'removed', oldStart: 2, oldEnd: 3, newStart: 2, newEnd: 1 });
    expect(hunk.oldLines).toEqual(['line 2', 'line 3']);
    expect(hunk.newLines).toEqual([]);
  });

  it('deleting the first and last lines', () => {
    const result = expectConsistent(base, lines('line 2', 'line 3', 'line 4'), STRICT);
    expect(result.hunks.map((h) => [h.type, h.oldStart, h.oldEnd, h.newStart, h.newEnd])).toEqual([
      ['removed', 1, 1, 1, 0],
      ['removed', 5, 5, 4, 3],
    ]);
  });

  it('diffing against an empty side', () => {
    expect(expectConsistent('', base, STRICT).hunks[0]).toMatchObject({
      type: 'added',
      oldStart: 1,
      oldEnd: 0,
      newStart: 1,
      newEnd: 5,
    });
    expect(expectConsistent(base, '', STRICT).hunks[0]).toMatchObject({
      type: 'removed',
      oldStart: 1,
      oldEnd: 5,
      newStart: 1,
      newEnd: 0,
    });
  });

  it('a realistic script include edit', () => {
    const oldScript = lines(
      'var IncidentUtils = Class.create();',
      'IncidentUtils.prototype = {',
      '    initialize: function() {},',
      '',
      '    getOpenCount: function(callerId) {',
      "        var gr = new GlideRecord('incident');",
      "        gr.addQuery('caller_id', callerId);",
      "        gr.addQuery('active', true);",
      '        gr.query();',
      '        return gr.getRowCount();',
      '    },',
      '',
      "    type: 'IncidentUtils'",
      '};',
    );
    const newScript = lines(
      'var IncidentUtils = Class.create();',
      'IncidentUtils.prototype = {',
      '    initialize: function() {},',
      '',
      '    getOpenCount: function(callerId) {',
      "        var ga = new GlideAggregate('incident');",
      "        ga.addQuery('caller_id', callerId);",
      '        ga.addActiveQuery();',
      "        ga.addAggregate('COUNT');",
      '        ga.query();',
      "        return ga.next() ? parseInt(ga.getAggregate('COUNT'), 10) : 0;",
      '    },',
      '',
      '    isVip: function(callerId) {',
      "        var user = new GlideRecord('sys_user');",
      "        return user.get(callerId) && user.getValue('vip') == 'true';",
      '    },',
      '',
      "    type: 'IncidentUtils'",
      '};',
    );
    const result = expectConsistent(oldScript, newScript, STRICT);
    // Splitting this into "modify 6-10" + "insert isVip" costs the same number
    // of line edits; the diff picks the single block, which is just as
    // applicable: replace old 6-10 with new 6-16.
    expect(result.hunks.map((h) => [h.type, h.oldStart, h.oldEnd, h.newStart, h.newEnd])).toEqual([
      ['modified', 6, 10, 6, 16],
    ]);
    expect(result.summary).toEqual({ hunks: 1, added: 11, removed: 5 });
  });
});

describe('line numbers map to the original text under normalization', () => {
  it('ignored blank lines shift nothing: hunk numbers are original line numbers', () => {
    const oldText = lines('a', '', '', '', 'b', 'c', 'd', 'e', 'f', 'OLD');
    const newText = lines('a', 'b', 'c', 'd', 'e', 'f', 'NEW');
    const result = expectConsistent(oldText, newText, opts({ ignoreBlankLines: true }));
    expect(result.hunks).toHaveLength(1);
    expect(result.hunks[0]).toMatchObject({
      type: 'modified',
      oldStart: 10,
      oldEnd: 10,
      newStart: 7,
      newEnd: 7,
      oldLines: ['OLD'],
      newLines: ['NEW'],
    });
  });

  it('without ignoring blank lines, the removed blank lines are their own hunk', () => {
    const oldText = lines('a', '', '', '', 'b');
    const result = expectConsistent(oldText, lines('a', 'b'), STRICT);
    expect(result.hunks[0]).toMatchObject({ type: 'removed', oldStart: 2, oldEnd: 4 });
  });

  it('blank lines inside a changed block stay in its range but not in its counts', () => {
    const oldText = lines('keep', 'x1', '', 'x2', 'end');
    const newText = lines('keep', 'y1', 'y2', 'end');
    const [hunk] = expectConsistent(oldText, newText, opts({ ignoreBlankLines: true })).hunks;
    expect(hunk).toMatchObject({ oldStart: 2, oldEnd: 4, newStart: 2, newEnd: 3, removedCount: 2 });
    expect(hunk.oldLines).toEqual(['x1', '', 'x2']);
  });

  it('a pure insertion after ignored blank lines is anchored after the last real line', () => {
    const oldText = lines('a', 'b', '', '', 'c');
    const newText = lines('a', 'b', 'inserted', 'c');
    const [hunk] = expectConsistent(oldText, newText, opts({ ignoreBlankLines: true })).hunks;
    expect(hunk).toMatchObject({ type: 'added', oldStart: 3, oldEnd: 2, newStart: 3, newEnd: 3 });
  });

  it('re-indenting with tabs vs spaces plus one real change finds only the real change', () => {
    const oldText = lines('function f() {', '\tif (a) {', '\t\treturn 1;', '\t}', '\treturn 0;', '}');
    const newText = lines('function f() {', '    if (a) {', '        return 2;', '    }', '    return 0;', '}');
    const strict = expectConsistent(oldText, newText, STRICT);
    expect(strict.hunks).toHaveLength(1);
    expect(strict.hunks[0]).toMatchObject({ oldStart: 2, oldEnd: 5 });

    const [hunk, ...rest] = expectConsistent(oldText, newText, opts({ ignoreAllWhitespace: true })).hunks;
    expect(rest).toEqual([]);
    expect(hunk).toMatchObject({ oldStart: 3, oldEnd: 3, newStart: 3, newEnd: 3 });
    // The copyable lines are the original ones, indentation included.
    expect(hunk.newLines).toEqual(['        return 2;']);
    expect(hunk.oldLines).toEqual(['\t\treturn 1;']);
  });

  it('CRLF old vs LF new: one whole-file hunk unless line endings are ignored', () => {
    const oldText = 'a\r\nb\r\nc\r\n';
    const newText = 'a\nb\nc\n';
    const strict = expectConsistent(oldText, newText, STRICT);
    expect(strict.hunks).toHaveLength(1);
    expect(strict.hunks[0]).toMatchObject({ oldStart: 1, oldEnd: 3, newStart: 1, newEnd: 3 });
    expect(expectConsistent(oldText, newText, opts({ ignoreLineEndings: true })).hunks).toEqual([]);
  });

  it('CRLF old vs LF new with a real change reports only the change', () => {
    const result = expectConsistent('a\r\nb\r\nc\r\n', 'a\nB\nc\n', opts({ ignoreLineEndings: true }));
    expect(result.hunks).toHaveLength(1);
    expect(result.hunks[0]).toMatchObject({ oldStart: 2, newStart: 2, oldLines: ['b'], newLines: ['B'] });
  });

  it('trailing whitespace noise next to a real change', () => {
    const oldText = lines('a  ', 'b', 'c\t');
    const newText = lines('a', 'B', 'c');
    const result = expectConsistent(oldText, newText, opts({ ignoreTrailingWhitespace: true }));
    expect(result.hunks).toHaveLength(1);
    expect(result.hunks[0]).toMatchObject({ oldStart: 2, oldEnd: 2, newStart: 2, newEnd: 2 });
  });
});

describe('hunk ids', () => {
  it('are stable across runs of the same input', () => {
    const a = lines('1', '2', '3');
    const b = lines('1', 'two', '3');
    expect(computeDiff(a, b, STRICT).hunks[0].id).toBe(computeDiff(a, b, STRICT).hunks[0].id);
  });

  it('survive an unrelated change elsewhere in the file', () => {
    const a = lines('1', '2', '3', '4', '5');
    const before = computeDiff(a, lines('1', 'two', '3', '4', '5'), STRICT).hunks[0].id;
    const after = computeDiff(a, lines('1', 'two', '3', '4', 'five'), STRICT).hunks[0].id;
    expect(after).toBe(before);
  });

  it('differ for repeated identical hunks', () => {
    const a = lines('x', 'keep', 'x');
    const ids = computeDiff(a, lines('y', 'keep', 'y'), STRICT).hunks.map((h) => h.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('fallback when the diff gives up', () => {
  it('returns one whole-file hunk marked approximate', () => {
    const result = computeDiff(lines('a', 'b', 'c'), lines('x', 'y'), STRICT, -1);
    expect(result.approximate).toBe(true);
    expect(result.hunks).toHaveLength(1);
    expect(result.hunks[0]).toMatchObject({ oldStart: 1, oldEnd: 3, newStart: 1, newEnd: 2 });
  });
});

describe('randomised edits, every option combination', () => {
  // Small seeded PRNG so failures are reproducible.
  function rng(seed: number) {
    return () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  }
  const pool = [
    'var gr = new GlideRecord("incident");',
    '\tgr.query();',
    '    gr.query();',
    'if (current.active) {',
    '}',
    '',
    '   ',
    'gs.info("done");  ',
    'return answer;',
    '\t \tmixed();',
  ];

  function mutate(lineList: string[], random: () => number): string[] {
    const out = [...lineList];
    const edits = 1 + Math.floor(random() * 6);
    for (let e = 0; e < edits; e++) {
      const at = Math.floor(random() * (out.length + 1));
      const pick = pool[Math.floor(random() * pool.length)];
      const kind = random();
      if (kind < 0.25) out.splice(at, 0, pick);
      else if (kind < 0.45) out.splice(at, 1);
      else if (kind < 0.65 && at < out.length) out[at] = pick;
      else if (kind < 0.8 && at < out.length) out[at] = out[at] + '  ';
      else if (at < out.length) out[at] = out[at].replace(/^\t/, '    ');
    }
    return out;
  }

  it('hunks always map to the original text and reproduce the new text', () => {
    const random = rng(42);
    for (let c = 0; c < 150; c++) {
      const length = Math.floor(random() * 25);
      const base = Array.from({ length }, () => pool[Math.floor(random() * pool.length)]);
      const next = mutate(base, random);
      const crlf = random() < 0.3;
      const oldText = base.join(crlf ? '\r\n' : '\n') + (random() < 0.5 ? '\n' : '');
      const newText = next.join('\n') + (random() < 0.5 ? '\n' : '');
      for (const options of ALL_OPTION_COMBOS) expectConsistent(oldText, newText, options);
    }
  });
});
