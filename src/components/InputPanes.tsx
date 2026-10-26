interface InputPanesProps {
  oldText: string;
  newText: string;
  onOldChange: (value: string) => void;
  onNewChange: (value: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function lineCount(text: string): number {
  if (text === '') return 0;
  const breaks = text.match(/\r\n|\n|\r/g)?.length ?? 0;
  return /(\r\n|\n|\r)$/.test(text) ? breaks : breaks + 1;
}

const TEXTAREA_PROPS = {
  spellCheck: false,
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
} as const;

export function InputPanes({
  oldText,
  newText,
  onOldChange,
  onNewChange,
  collapsed,
  onCollapsedChange,
}: InputPanesProps) {
  return (
    <section className={`inputs${collapsed ? ' inputs-collapsed' : ''}`} aria-label="Pasted versions">
      <div className="inputs-header">
        <button
          type="button"
          className="btn btn-small btn-ghost"
          aria-expanded={!collapsed}
          aria-controls="input-panes"
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? '▸ Show inputs' : '▾ Hide inputs'}
        </button>
        {collapsed && (
          <span className="summary-muted">
            Old: {lineCount(oldText)} lines · New: {lineCount(newText)} lines
          </span>
        )}
      </div>
      <div className="input-panes" id="input-panes" hidden={collapsed}>
        <label className="input-pane">
          <span className="input-label">
            Old <span className="input-meta">{lineCount(oldText)} lines</span>
          </span>
          <textarea
            value={oldText}
            onChange={(e) => onOldChange(e.target.value)}
            placeholder="Paste the current file from ServiceNow Studio…"
            {...TEXTAREA_PROPS}
          />
        </label>
        <label className="input-pane">
          <span className="input-label">
            New <span className="input-meta">{lineCount(newText)} lines</span>
          </span>
          <textarea
            value={newText}
            onChange={(e) => onNewChange(e.target.value)}
            placeholder="Paste the AI's replacement file…"
            {...TEXTAREA_PROPS}
          />
        </label>
      </div>
    </section>
  );
}
