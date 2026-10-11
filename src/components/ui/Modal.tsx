import { useEffect, type ReactNode } from 'react';

export interface ModalProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: ReactNode;
  /** 内容 */
  children: ReactNode;
}

/**
 * 弹窗（自研原子组件，P1）—— 用于帮助/说明
 * 点击遮罩或按 Esc 关闭。
 */
export default function Modal({ open, onClose, title, children }: ModalProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="ne-surface max-h-[85vh] w-full max-w-lg overflow-auto rounded-b-none sm:rounded"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          <button
            type="button"
            aria-label="关闭"
            className="min-h-touch min-w-touch text-muted hover:text-fg"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <div className="px-4 py-3 text-sm text-fg">{children}</div>
      </div>
    </div>
  );
}
