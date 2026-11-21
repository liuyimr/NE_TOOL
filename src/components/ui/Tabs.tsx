import type { KeyboardEvent } from 'react';

/** 单个页签定义 */
export interface TabItem {
  /** 页签标识（写入 URL 参数，需稳定不变） */
  id: string;
  /** 页签展示文案 */
  label: string;
}

export interface TabsProps {
  /** 页签列表 */
  items: TabItem[];
  /** 当前选中页签 id（受控值） */
  value: string;
  /** 选中变化回调 */
  onChange: (id: string) => void;
  /** tablist 的无障碍名称 */
  ariaLabel?: string;
  className?: string;
}

/**
 * 通用页签（自研原子组件，受控）
 * ------------------------------------------------------------------
 * - 结构：外层 `role="tablist"` + 每个按钮 `role="tab"` + `aria-selected`
 * - 交互：点击切换；焦点在页签上时 ← / → 循环切换
 * - 视觉：选中态 bg-surface-2 + text-fg + ring-border，未选中态 text-muted
 * - 移动端：容器横向可滚动（overflow-x-auto），按钮 shrink-0 + whitespace-nowrap，
 *   窄屏（320px）不撑破页面、不产生整页横向滚动
 * 仅做展示与事件透传，选中状态由调用方（URL 参数）持有。
 */
export default function Tabs({
  items,
  value,
  onChange,
  ariaLabel = '视图切换',
  className = '',
}: TabsProps): JSX.Element {
  /** ← / → 在页签间循环移动选中项 */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const index = items.findIndex((item) => item.id === value);
    if (index < 0) return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = items[(index + delta + items.length) % items.length];
    if (next) onChange(next.id);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={[
        'flex items-stretch gap-1 overflow-x-auto rounded border border-border bg-surface p-1',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={[
              'min-h-touch shrink-0 whitespace-nowrap rounded px-3 text-sm font-medium ne-focus transition',
              selected
                ? 'bg-surface-2 text-fg ring-1 ring-border'
                : 'bg-transparent text-muted hover:text-fg',
            ].join(' ')}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
