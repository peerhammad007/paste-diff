import type { LineEnding, NormalizeOptions, NormalizedSide, SourceLine } from './types';

const LINE_BREAK = /\r\n|\n|\r/g;
const TRAILING_WHITESPACE = /\s+$/;
const ALL_WHITESPACE = /\s+/g;

/**
 * Splits text into lines, remembering each line's terminator so the original
 * text can be rebuilt exactly. A trailing newline ends the last line rather
 * than starting an empty one, so "a\nb\n" is two lines, matching how editors
 * number content lines.
 */
export function splitLines(text: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let start = 0;
  for (const match of text.matchAll(LINE_BREAK)) {
    lines.push({ text: text.slice(start, match.index), eol: match[0] as LineEnding });
    start = match.index + match[0].length;
  }
  if (start < text.length) lines.push({ text: text.slice(start), eol: '' });
  return lines;
}

/** Rebuilds the original text from `splitLines` output. */
export function joinLines(lines: readonly SourceLine[]): string {
  return lines.map((line) => line.text + line.eol).join('');
}

export function isBlank(text: string): boolean {
  return text.trim() === '';
}

/** The string two lines are compared by. Lines are equal when their keys are. */
export function lineKey(line: SourceLine, options: NormalizeOptions): string {
  let key = line.text;
  if (options.ignoreAllWhitespace) key = key.replace(ALL_WHITESPACE, '');
  else if (options.ignoreTrailingWhitespace) key = key.replace(TRAILING_WHITESPACE, '');
  // The EOL is appended after a NUL so it can never collide with line content.
  if (!options.ignoreLineEndings) key += '\0' + line.eol;
  return key;
}

export function normalizeSide(text: string, options: NormalizeOptions): NormalizedSide {
  const lines = splitLines(text);
  const keys: string[] = [];
  const indexMap: number[] = [];
  lines.forEach((line, index) => {
    if (options.ignoreBlankLines && isBlank(line.text)) return;
    keys.push(lineKey(line, options));
    indexMap.push(index);
  });
  return { lines, keys, indexMap };
}
