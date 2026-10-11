import type { ReactNode } from 'react';

export interface CardProps {
  /** 卡片标题（可选） */
  title?: ReactNode;
  /** 标题右侧附加内容（可选） */
  extra?: ReactNode;
  /** 内容 */
  children: ReactNode;
  className?: string;
}

/**
 * 卡片容器（自研原子组件）：统一 surface 背景 + 边框 + 圆角 + 内边距
 */
export default function Card({ title, extra, children, className = '' }: CardProps): JSX.Element {
  const hasHeader = Boolean(title) || Boolean(extra);
  return (
    <section className={['ne-surface p-3', className].filter(Boolean).join(' ')}>
      {hasHeader && (
        <header className="mb-2 flex items-center justify-between gap-2">
          {title ? <h3 className="text-sm font-semibold text-fg">{title}</h3> : <span />}
          {extra}
        </header>
      )}
      {children}
    </section>
  );
}
