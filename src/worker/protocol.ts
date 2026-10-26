import type { DiffResult, NormalizeOptions } from '../core/types';

export interface DiffRequest {
  id: number;
  oldText: string;
  newText: string;
  options: NormalizeOptions;
}

export type DiffResponse =
  | { id: number; ok: true; result: DiffResult; durationMs: number }
  | { id: number; ok: false; error: string };
