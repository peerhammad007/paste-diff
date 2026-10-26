import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export const STORAGE_PREFIX = 'paste-diff:v1:';

function read<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/** Stores `value`, or removes the key when it equals the default, so a cleared app leaves nothing behind. */
function write(key: string, value: unknown, fallback: unknown): void {
  try {
    const json = JSON.stringify(value);
    if (json === JSON.stringify(fallback)) localStorage.removeItem(STORAGE_PREFIX + key);
    else localStorage.setItem(STORAGE_PREFIX + key, json);
  } catch {
    // Storage full, disabled or private mode: keep working without persistence.
  }
}

/** Removes everything this app stored. */
export function clearPersistentState(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/**
 * `useState` backed by localStorage. Writes are delayed by `writeDelayMs` so
 * typing in a large textarea doesn't serialize the whole file per keystroke;
 * a pending write is flushed when the page is hidden or closed.
 */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
  writeDelayMs = 0,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(key, fallback, validate));
  const latest = useRef(value);
  latest.current = value;
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    if (writeDelayMs === 0) {
      write(key, value, fallbackRef.current);
      return;
    }
    const id = setTimeout(() => write(key, value, fallbackRef.current), writeDelayMs);
    const flush = () => write(key, latest.current, fallbackRef.current);
    window.addEventListener('pagehide', flush);
    return () => {
      clearTimeout(id);
      window.removeEventListener('pagehide', flush);
    };
  }, [key, value, writeDelayMs]);

  return [value, setValue];
}

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
