import type { NormalizeOptions } from '../core/types';
import { CopyButton } from './CopyButton';

interface ToolbarProps {
  options: NormalizeOptions;
  onOptionsChange: (options: NormalizeOptions) => void;
  onCompare: () => void;
  newText: string;
  onClearAll: () => void;
  sideBySide: boolean;
  onSideBySideChange: (sideBySide: boolean) => void;
}

const TOGGLES: { key: keyof NormalizeOptions; label: string; title: string }[] = [
  {
    key: 'ignoreTrailingWhitespace',
    label: 'Trailing whitespace',
    title: 'Treat lines that differ only by spaces or tabs at the end as equal',
  },
  {
    key: 'ignoreLineEndings',
    label: 'Line endings',
    title: 'Treat CRLF, LF and a missing final newline as equal',
  },
  {
    key: 'ignoreAllWhitespace',
    label: 'All whitespace',
    title: 'Compare lines with all whitespace removed (indentation, tabs vs spaces, spacing)',
  },
  {
    key: 'ignoreBlankLines',
    label: 'Blank lines',
    title: 'Adding or removing empty lines is not a change',
  },
];

export function Toolbar({
  options,
  onOptionsChange,
  onCompare,
  newText,
  onClearAll,
  sideBySide,
  onSideBySideChange,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <h1 className="app-title">Paste Diff</h1>
      <button type="button" className="btn btn-primary" onClick={onCompare}>
        Compare
      </button>
      <fieldset className="toggles">
        <legend>Ignore</legend>
        {TOGGLES.map(({ key, label, title }) => {
          // "All whitespace" already covers trailing whitespace.
          const implied = key === 'ignoreTrailingWhitespace' && options.ignoreAllWhitespace;
          return (
            <label key={key} className="toggle" title={title}>
              <input
                type="checkbox"
                checked={options[key] || implied}
                disabled={implied}
                onChange={(e) => onOptionsChange({ ...options, [key]: e.target.checked })}
              />
              {label}
            </label>
          );
        })}
      </fieldset>
      <div className="segmented" role="group" aria-label="Diff layout">
        <button type="button" aria-pressed={sideBySide} onClick={() => onSideBySideChange(true)}>
          Side by side
        </button>
        <button type="button" aria-pressed={!sideBySide} onClick={() => onSideBySideChange(false)}>
          Inline
        </button>
      </div>
      <div className="toolbar-end">
        <CopyButton
          text={newText}
          label="Copy full new file"
          title="Fallback: copy the whole New pane"
          disabled={newText === ''}
          className="btn"
        />
        <button
          type="button"
          className="btn btn-danger"
          onClick={onClearAll}
          title="Remove both pastes, applied marks and settings from this browser"
        >
          Clear all
        </button>
      </div>
    </header>
  );
}
