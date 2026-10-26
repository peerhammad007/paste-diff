import { computeDiff } from '../core/diff';
import type { DiffRequest, DiffResponse } from './protocol';

self.onmessage = (event: MessageEvent<DiffRequest>) => {
  const { id, oldText, newText, options } = event.data;
  let response: DiffResponse;
  try {
    const start = performance.now();
    const result = computeDiff(oldText, newText, options);
    response = { id, ok: true, result, durationMs: performance.now() - start };
  } catch (error) {
    response = { id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};
