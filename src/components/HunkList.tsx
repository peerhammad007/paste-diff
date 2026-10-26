import { memo } from 'react';
import type { DiffState } from '../hooks/useDiff';
import { HunkCard } from './HunkCard';

interface HunkListProps {
  state: DiffState;
  bothEmpty: boolean;
  appliedIds: ReadonlySet<string>;
  onAppliedChange: (id: string, applied: boolean) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
}

export const HunkList = memo(function HunkList({
  state,
  bothEmpty,
  appliedIds,
  onAppliedChange,
  activeId,
  onSelect,
}: HunkListProps) {
  const { result } = state;
  let body;
  if (bothEmpty) {
    body = <p className="hunk-empty">Paste the old and new versions of a file above to see what changed.</p>;
  } else if (!result) {
    body = null;
  } else if (result.hunks.length === 0) {
    body = (
      <div className="hunk-empty no-diff">
        <strong>No differences</strong>
        <p>
          {result.identical
            ? 'Both versions are identical.'
            : 'The versions differ only in whitespace, blank lines or line endings that you chose to ignore.'}
        </p>
      </div>
    );
  } else {
    body = (
      <ol className="hunk-list">
        {result.hunks.map((hunk) => (
          <HunkCard
            key={hunk.id}
            hunk={hunk}
            total={result.hunks.length}
            applied={appliedIds.has(hunk.id)}
            active={hunk.id === activeId}
            onAppliedChange={onAppliedChange}
            onSelect={onSelect}
          />
        ))}
      </ol>
    );
  }
  return (
    <aside className="hunk-panel" aria-label="Changes">
      {body}
    </aside>
  );
});
