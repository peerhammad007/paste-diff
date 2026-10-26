import { useEffect, useState, type MouseEvent } from 'react';
import { copyText } from '../clipboard';

type Status = 'idle' | 'copied' | 'failed';

interface CopyButtonProps {
  text: string;
  label: string;
  title?: string;
  disabled?: boolean;
  className?: string;
}

export function CopyButton({ text, label, title, disabled, className = 'btn btn-small' }: CopyButtonProps) {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const id = setTimeout(() => setStatus('idle'), 1500);
    return () => clearTimeout(id);
  }, [status]);

  const onClick = async (event: MouseEvent) => {
    // Cards are clickable (to scroll the diff); copying shouldn't also navigate.
    event.stopPropagation();
    try {
      await copyText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <button
      type="button"
      className={`${className}${status === 'copied' ? ' btn-copied' : ''}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {status === 'copied' ? 'Copied ✓' : status === 'failed' ? 'Copy failed' : label}
    </button>
  );
}
