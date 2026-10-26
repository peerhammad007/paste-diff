import { useEffect, useState } from 'react';

/**
 * Returns `value` once it has stopped changing for `delayMs`. Calling the
 * returned `flush` applies the latest value (or `next`) immediately.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): [T, (next?: T) => void] {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return [debounced, (next?: T) => setDebounced(next ?? value)];
}
