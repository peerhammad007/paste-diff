import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Hunk } from '../core/types';
import type { DiffFocus } from '../components/DiffView';

/** Index of the next (+1) or previous (-1) hunk, wrapping around. With nothing active, starts at an end. */
export function stepIndex(current: number, count: number, direction: 1 | -1): number {
  if (count === 0) return -1;
  if (current < 0 || current >= count) return direction === 1 ? 0 : count - 1;
  return (current + direction + count) % count;
}

/** True when a key press should go to the element (typing), not to our shortcuts. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'SELECT';
}

export interface HunkNavigation {
  activeId: string | null;
  focus: DiffFocus | null;
  select: (id: string) => void;
  next: () => void;
  previous: () => void;
}

/**
 * Tracks the active hunk and binds J/K (outside text fields) and Alt+Down /
 * Alt+Up (everywhere) to next/previous change.
 */
export function useHunkNavigation(hunks: Hunk[]): HunkNavigation {
  const [active, setActive] = useState<{ id: string; token: number } | null>(null);

  const activeIndex = active ? hunks.findIndex((hunk) => hunk.id === active.id) : -1;

  const select = useCallback((id: string) => {
    setActive((prev) => ({ id, token: (prev?.token ?? 0) + 1 }));
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      const index = stepIndex(activeIndex, hunks.length, direction);
      if (index >= 0) select(hunks[index].id);
    },
    [activeIndex, hunks, select],
  );
  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      const arrow = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      if (event.altKey && arrow !== 0) {
        event.preventDefault();
        event.stopPropagation();
        step(arrow);
        return;
      }
      if (event.altKey || event.shiftKey || isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'j' || key === 'k') {
        event.preventDefault();
        step(key === 'j' ? 1 : -1);
      }
    };
    // Capture phase, so Monaco's own Alt+Arrow bindings don't swallow the keys.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [step]);

  const activeHunk = activeIndex >= 0 ? hunks[activeIndex] : null;
  const token = active?.token ?? 0;
  const focus = useMemo(() => (activeHunk ? { hunk: activeHunk, token } : null), [activeHunk, token]);

  return { activeId: activeHunk?.id ?? null, focus, select, next, previous };
}
