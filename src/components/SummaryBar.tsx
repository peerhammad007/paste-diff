import type { DiffState } from '../hooks/useDiff';

interface SummaryBarProps {
  state: DiffState;
  appliedCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function SummaryBar({ state, appliedCount, onPrevious, onNext }: SummaryBarProps) {
  const { result, pending, error, durationMs } = state;
  return (
    <div className="summary-bar" role="status" aria-live="polite">
      {error && <span className="summary-error">Diff failed: {error}</span>}
      {result && !error && (
        <>
          <span className="summary-item">
            <strong>{result.summary.hunks}</strong> {result.summary.hunks === 1 ? 'change' : 'changes'}
          </span>
          <span className="summary-item summary-added">+{result.summary.added} added</span>
          <span className="summary-item summary-removed">−{result.summary.removed} removed</span>
          {result.summary.hunks > 0 && (
            <span className={`summary-item${appliedCount === result.summary.hunks ? ' summary-added' : ''}`}>
              {appliedCount} / {result.summary.hunks} applied
            </span>
          )}
          {durationMs !== null && (
            <span className="summary-item summary-muted">diffed in {Math.round(durationMs)} ms</span>
          )}
          {result.approximate && (
            <span className="summary-warning">
              Too many differences for a line-by-line diff; showing the whole file as one change.
            </span>
          )}
        </>
      )}
      {pending && <span className="summary-item summary-muted">Comparing…</span>}
      {result && result.hunks.length > 0 && (
        <span className="summary-nav">
          <button type="button" className="btn btn-small" onClick={onPrevious} title="Previous change (K or Alt+↑)">
            ↑ Prev
          </button>
          <button type="button" className="btn btn-small" onClick={onNext} title="Next change (J or Alt+↓)">
            ↓ Next
          </button>
          <span className="summary-muted shortcut-hint">
            <kbd>J</kbd>/<kbd>K</kbd> or <kbd>Alt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>
          </span>
        </span>
      )}
    </div>
  );
}
