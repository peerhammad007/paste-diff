import { useEffect, useRef } from 'react';
import { describeNewSide, describeOldSide, hunkNewCode, hunkOldCode, previewLines } from '../core/format';
import type { Hunk } from '../core/types';
import { CopyButton } from './CopyButton';

const TYPE_LABEL: Record<Hunk['type'], string> = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Modified',
};

interface HunkCardProps {
  hunk: Hunk;
  total: number;
  applied: boolean;
  active: boolean;
  onAppliedChange: (id: string, applied: boolean) => void;
  onSelect: (id: string) => void;
}

export function HunkCard({ hunk, total, applied, active, onAppliedChange, onSelect }: HunkCardProps) {
  const preview = previewLines(hunk);
  const ref = useRef<HTMLLIElement>(null);

  // Keep the active card visible when it's chosen with the keyboard.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <li
      ref={ref}
      className={`hunk-card hunk-${hunk.type}${applied ? ' hunk-applied' : ''}${active ? ' hunk-active' : ''}`}
      aria-current={active ? 'true' : undefined}
      tabIndex={0}
      onClick={() => onSelect(hunk.id)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          onSelect(hunk.id);
        }
      }}
    >
      <div className="hunk-header">
        <span className={`hunk-badge badge-${hunk.type}`}>{TYPE_LABEL[hunk.type]}</span>
        <span className="hunk-number">
          {hunk.index + 1} / {total}
        </span>
        <span className="hunk-counts">
          {hunk.addedCount > 0 && <span className="summary-added">+{hunk.addedCount}</span>}
          {hunk.removedCount > 0 && <span className="summary-removed">−{hunk.removedCount}</span>}
        </span>
      </div>
      <dl className="hunk-ranges">
        <dt>Old</dt>
        <dd>{describeOldSide(hunk)}</dd>
        <dt>New</dt>
        <dd>{describeNewSide(hunk)}</dd>
      </dl>
      {preview.lines.length > 0 && (
        <pre className="hunk-preview">
          {preview.lines.join('\n')}
          {preview.more > 0 && `\n… ${preview.more} more`}
        </pre>
      )}
      <div className="hunk-actions">
        <CopyButton
          text={hunkNewCode(hunk)}
          label="Copy new code"
          title={
            hunk.type === 'removed'
              ? 'This change only deletes lines: remove the old lines in Studio'
              : `Copy the ${hunk.newLines.length} new line(s) for this change`
          }
          disabled={hunk.type === 'removed'}
          className="btn btn-small btn-primary"
        />
        <CopyButton
          text={hunkOldCode(hunk)}
          label="Copy old code"
          title={
            hunk.type === 'added'
              ? 'This change only adds lines: there is no old code'
              : 'Copy the original lines, to roll this change back'
          }
          disabled={hunk.type === 'added'}
        />
        <label className="applied-toggle" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={applied}
            onChange={(e) => onAppliedChange(hunk.id, e.target.checked)}
          />
          Applied
        </label>
      </div>
    </li>
  );
}
