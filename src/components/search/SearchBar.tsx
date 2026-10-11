import { useEffect, useRef, useState } from 'react';

export interface SearchBarProps {
  /** 初始值 */
  initial?: string;
  /** 防抖后的变更回调（~200ms） */
  onDebouncedChange: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * 搜索输入框（防抖 ~200ms）
 */
export default function SearchBar({
  initial = '',
  onDebouncedChange,
  placeholder = '搜索工具、端口、功能码…',
  autoFocus = false,
}: SearchBarProps): JSX.Element {
  const [text, setText] = useState(initial);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onDebouncedChange(text.trim()), 200);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [text, onDebouncedChange]);

  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 text-muted">🔍</span>
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-h-touch w-full rounded border border-border bg-surface pl-9 pr-9 text-fg placeholder:text-muted ne-focus"
      />
      {text && (
        <button
          type="button"
          aria-label="清空"
          className="absolute right-2 min-h-touch min-w-touch text-muted"
          onClick={() => setText('')}
        >
          ✕
        </button>
      )}
    </div>
  );
}
