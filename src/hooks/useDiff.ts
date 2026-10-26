import { useEffect, useRef, useState } from 'react';
import type { DiffResult, NormalizeOptions } from '../core/types';
import type { DiffRequest, DiffResponse } from '../worker/protocol';
import DiffWorker from '../worker/diff.worker?worker';

export interface DiffState {
  result: DiffResult | null;
  /** A diff for the current inputs is still running. */
  pending: boolean;
  error: string | null;
  /** How long the last diff took inside the worker. */
  durationMs: number | null;
}

/**
 * Runs `computeDiff` in a Web Worker. If inputs change while a diff is still
 * running, that worker is terminated and a fresh one takes the new request,
 * so a slow diff of stale input never delays the current one.
 */
export function useDiff(oldText: string, newText: string, options: NormalizeOptions): DiffState {
  const [state, setState] = useState<DiffState>({
    result: null,
    pending: false,
    error: null,
    durationMs: null,
  });
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const nextIdRef = useRef(0);

  useEffect(() => () => workerRef.current?.terminate(), []);

  useEffect(() => {
    if (busyRef.current) {
      workerRef.current?.terminate();
      workerRef.current = null;
    }
    const worker = (workerRef.current ??= new DiffWorker());
    const id = ++nextIdRef.current;
    busyRef.current = true;
    setState((prev) => ({ ...prev, pending: true }));

    worker.onmessage = (event: MessageEvent<DiffResponse>) => {
      const response = event.data;
      if (response.id !== nextIdRef.current) return;
      busyRef.current = false;
      setState(
        response.ok
          ? { result: response.result, pending: false, error: null, durationMs: response.durationMs }
          : { result: null, pending: false, error: response.error, durationMs: null },
      );
    };
    worker.onerror = (event) => {
      busyRef.current = false;
      setState({ result: null, pending: false, error: event.message || 'Diff worker failed', durationMs: null });
    };

    const request: DiffRequest = { id, oldText, newText, options };
    worker.postMessage(request);
  }, [oldText, newText, options]);

  return state;
}
