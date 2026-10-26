/** Toggles applied to each line before diffing. Original text is never modified. */
export interface NormalizeOptions {
  /** Treat `foo  ` and `foo` as equal. */
  ignoreTrailingWhitespace: boolean;
  /** Treat CRLF, LF, CR and a missing final newline as equal. */
  ignoreLineEndings: boolean;
  /** Compare lines with all whitespace removed (indentation, tabs vs spaces, spacing). */
  ignoreAllWhitespace: boolean;
  /** Leave whitespace-only lines out of the comparison, so adding/removing them is not a change. */
  ignoreBlankLines: boolean;
}

export const DEFAULT_NORMALIZE_OPTIONS: NormalizeOptions = {
  ignoreTrailingWhitespace: true,
  ignoreLineEndings: true,
  ignoreAllWhitespace: false,
  ignoreBlankLines: false,
};

export type LineEnding = '\r\n' | '\n' | '\r' | '';

/** One line of the original input, exactly as pasted. */
export interface SourceLine {
  /** Line content without its line ending. */
  text: string;
  /** The terminator that followed the line; '' for a last line with no newline. */
  eol: LineEnding;
}

/** One side of the comparison, ready for the line diff. */
export interface NormalizedSide {
  /** Every original line, in order. Line N in the editor is `lines[N - 1]`. */
  lines: SourceLine[];
  /** Comparison keys for the lines that take part in the diff. */
  keys: string[];
  /** `keys[i]` was built from `lines[indexMap[i]]` (0-based). */
  indexMap: number[];
}

export type HunkType = 'added' | 'removed' | 'modified';

/**
 * One changed block. Line numbers are 1-based and refer to the ORIGINAL
 * pasted text. An empty side has `end === start - 1`: for an added hunk,
 * `oldEnd` is the old line the new lines go after (0 = top of file); for a
 * removed hunk, `newEnd` is the new line the removal sits after.
 */
export interface Hunk {
  /** Stable across re-diffs of the same content; used to remember "applied". */
  id: string;
  /** 0-based position in the hunk list. */
  index: number;
  type: HunkType;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  /** Original lines (without line endings) in oldStart..oldEnd. */
  oldLines: string[];
  /** Original lines (without line endings) in newStart..newEnd. */
  newLines: string[];
  /** Lines that actually differ, excluding ignored blank lines inside the range. */
  removedCount: number;
  addedCount: number;
}

export interface DiffSummary {
  hunks: number;
  added: number;
  removed: number;
}

export interface DiffResult {
  hunks: Hunk[];
  summary: DiffSummary;
  /** Both inputs are byte-for-byte identical. */
  identical: boolean;
  /**
   * The line diff gave up (too many differences within the time limit), so
   * the result is a single hunk replacing the whole file.
   */
  approximate: boolean;
}

export function isNormalizeOptions(value: unknown): value is NormalizeOptions {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (Object.keys(DEFAULT_NORMALIZE_OPTIONS) as (keyof NormalizeOptions)[]).every(
    (key) => typeof record[key] === 'boolean',
  );
}
