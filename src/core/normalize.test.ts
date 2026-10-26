import { describe, expect, it } from 'vitest';
import { isBlank, joinLines, lineKey, normalizeSide, splitLines } from './normalize';
import type { NormalizeOptions } from './types';

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

const keysOf = (text: string, options: NormalizeOptions) => normalizeSide(text, options).keys;

describe('splitLines', () => {
  it('returns no lines for empty input', () => {
    expect(splitLines('')).toEqual([]);
  });

  it('treats a trailing newline as the end of the last line, not a new empty line', () => {
    expect(splitLines('a\nb\n')).toEqual([
      { text: 'a', eol: '\n' },
      { text: 'b', eol: '\n' },
    ]);
    expect(splitLines('a\nb')).toEqual([
      { text: 'a', eol: '\n' },
      { text: 'b', eol: '' },
    ]);
  });

  it('recognises CRLF, LF and lone CR, including mixed in one file', () => {
    expect(splitLines('a\r\nb\nc\rd')).toEqual([
      { text: 'a', eol: '\r\n' },
      { text: 'b', eol: '\n' },
      { text: 'c', eol: '\r' },
      { text: 'd', eol: '' },
    ]);
  });

  it('keeps empty lines between line breaks', () => {
    expect(splitLines('a\n\n\nb')).toHaveLength(4);
    expect(splitLines('\n')).toEqual([{ text: '', eol: '\n' }]);
    expect(splitLines('\r\n\r\n')).toEqual([
      { text: '', eol: '\r\n' },
      { text: '', eol: '\r\n' },
    ]);
  });

  it('round-trips the exact original text', () => {
    const samples = [
      '',
      '\n',
      'no newline',
      'a\r\nb\r\n',
      'mixed\r\nendings\nand\rcr',
      '\ttabs\t \n  spaces  \n\n',
    ];
    for (const text of samples) expect(joinLines(splitLines(text))).toBe(text);
  });
});

describe('line endings', () => {
  const lf = 'var a = 1;\nvar b = 2;\n';
  const crlf = 'var a = 1;\r\nvar b = 2;\r\n';

  it('CRLF and LF lines differ when line endings are not ignored', () => {
    expect(keysOf(crlf, STRICT)).not.toEqual(keysOf(lf, STRICT));
  });

  it('CRLF, LF and CR lines are equal when line endings are ignored', () => {
    const options = opts({ ignoreLineEndings: true });
    expect(keysOf(crlf, options)).toEqual(keysOf(lf, options));
    expect(keysOf('var a = 1;\rvar b = 2;\r', options)).toEqual(keysOf(lf, options));
  });

  it('a missing final newline is a difference only when line endings matter', () => {
    expect(keysOf('a\nb', STRICT)).not.toEqual(keysOf('a\nb\n', STRICT));
    const options = opts({ ignoreLineEndings: true });
    expect(keysOf('a\nb', options)).toEqual(keysOf('a\nb\n', options));
  });

  it('line content cannot be confused with a line ending', () => {
    expect(lineKey({ text: 'a\0\n', eol: '' }, STRICT)).not.toBe(
      lineKey({ text: 'a', eol: '\n' }, STRICT),
    );
  });
});

describe('trailing whitespace', () => {
  it('trailing spaces and tabs are a difference by default', () => {
    expect(keysOf('foo();  \n', STRICT)).not.toEqual(keysOf('foo();\n', STRICT));
  });

  it('is ignored when the toggle is on', () => {
    const options = opts({ ignoreTrailingWhitespace: true });
    expect(keysOf('foo();  \t\nbar();\n', options)).toEqual(keysOf('foo();\nbar(); \n', options));
  });

  it('does not ignore leading or inner whitespace', () => {
    const options = opts({ ignoreTrailingWhitespace: true });
    expect(keysOf('  foo();\n', options)).not.toEqual(keysOf('foo();\n', options));
    expect(keysOf('a = 1;\n', options)).not.toEqual(keysOf('a=1;\n', options));
  });

  it('combines with ignoring line endings (CRLF plus trailing space)', () => {
    const options = opts({ ignoreTrailingWhitespace: true, ignoreLineEndings: true });
    expect(keysOf('foo(); \r\n', options)).toEqual(keysOf('foo();\n', options));
  });
});

describe('ignore all whitespace', () => {
  const options = opts({ ignoreAllWhitespace: true });

  it('treats tab indentation and space indentation as equal', () => {
    const tabs = 'function f() {\n\tif (x) {\n\t\treturn 1;\n\t}\n}\n';
    const spaces = 'function f() {\n    if (x) {\n        return 1;\n    }\n}\n';
    expect(keysOf(tabs, options)).toEqual(keysOf(spaces, options));
    expect(keysOf(tabs, STRICT)).not.toEqual(keysOf(spaces, STRICT));
  });

  it('treats mixed tabs and spaces within one line as equal to either', () => {
    expect(keysOf(' \t  gr.query();\n', options)).toEqual(keysOf('\tgr.query();\n', options));
  });

  it('ignores spacing inside a line', () => {
    expect(keysOf('if(a==b){\n', options)).toEqual(keysOf('if (a == b) {\n', options));
  });

  it('ignores non-breaking spaces (common when copying from web pages)', () => {
    expect(keysOf('var a = 1;\n', options)).toEqual(keysOf('var a = 1;\n', options));
  });

  it('still sees real content changes', () => {
    expect(keysOf('var a = 1;\n', options)).not.toEqual(keysOf('var a = 2;\n', options));
  });

  it('still sees line ending differences unless those are ignored too', () => {
    expect(keysOf('a\r\n', options)).not.toEqual(keysOf('a\n', options));
    const both = opts({ ignoreAllWhitespace: true, ignoreLineEndings: true });
    expect(keysOf('a\r\n', both)).toEqual(keysOf('a\n', both));
  });
});

describe('ignore blank lines', () => {
  it('blank lines take part in the diff by default', () => {
    expect(keysOf('a\n\nb\n', STRICT)).toHaveLength(3);
  });

  it('drops whitespace-only lines from the comparison', () => {
    const options = opts({ ignoreBlankLines: true });
    expect(keysOf('a\n\n  \t\nb\n', options)).toEqual(keysOf('a\nb\n', options));
  });

  it('maps every remaining key back to its original 0-based line index', () => {
    const side = normalizeSide('a\n\nb\n   \n\nc\n', opts({ ignoreBlankLines: true }));
    expect(side.lines).toHaveLength(6);
    expect(side.indexMap).toEqual([0, 2, 5]);
    expect(side.indexMap.map((i) => side.lines[i].text)).toEqual(['a', 'b', 'c']);
  });

  it('handles a file that is entirely blank', () => {
    const side = normalizeSide('\n\n  \n', opts({ ignoreBlankLines: true }));
    expect(side.lines).toHaveLength(3);
    expect(side.keys).toEqual([]);
    expect(side.indexMap).toEqual([]);
  });

  it('CRLF blank lines count as blank', () => {
    const options = opts({ ignoreBlankLines: true });
    expect(normalizeSide('a\r\n\r\nb\r\n', options).indexMap).toEqual([0, 2]);
  });
});

describe('original text is preserved', () => {
  it('normalization never changes the stored lines', () => {
    const text = '\tvar a = 1;  \r\n\r\n  b();\n';
    const all = opts({
      ignoreTrailingWhitespace: true,
      ignoreLineEndings: true,
      ignoreAllWhitespace: true,
      ignoreBlankLines: true,
    });
    const side = normalizeSide(text, all);
    expect(joinLines(side.lines)).toBe(text);
    expect(side.lines[0]).toEqual({ text: '\tvar a = 1;  ', eol: '\r\n' });
  });

  it('without blank-line filtering, indexMap is the identity', () => {
    const side = normalizeSide('a\n\nb', STRICT);
    expect(side.indexMap).toEqual([0, 1, 2]);
  });
});

describe('isBlank', () => {
  it('detects whitespace-only lines', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank(' \t ')).toBe(true);
    expect(isBlank(' x ')).toBe(false);
  });
});
