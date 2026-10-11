import { formatNumber } from '@/lib/format';
import type { CalcResult } from '@/types/calculator';
import CopyButton from './CopyButton';

export interface ResultCardProps {
  /** 结果项列表 */
  results: CalcResult[];
  /** 标题 */
  title?: string;
}

/** 将结果项格式化为可复制的纯文本 */
function resultToText(item: CalcResult): string {
  const value =
    typeof item.value === 'number' ? formatNumber(item.value) : item.value;
  return item.unit ? `${item.label}: ${value} ${item.unit}` : `${item.label}: ${value}`;
}

/**
 * 结果卡片（自研原子组件）
 * - 主结果（highlight）高亮显示
 * - 每项支持一键复制
 */
export default function ResultCard({ results, title = '计算结果' }: ResultCardProps): JSX.Element {
  const visible = results.filter((r) => r.value !== undefined && r.value !== '');
  return (
    <section className="ne-surface divide-y divide-border">
      <header className="px-3 py-2 text-sm font-semibold text-fg">{title}</header>
      {visible.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">请输入参数以查看结果。</p>
      ) : (
        <ul>
          {visible.map((item) => {
            const text = typeof item.value === 'number' ? formatNumber(item.value) : item.value;
            return (
              <li
                key={item.key}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs text-muted">{item.label}</p>
                  <p
                    className={
                      item.highlight
                        ? 'break-all font-mono text-lg font-semibold text-accent'
                        : 'break-all font-mono text-base text-fg'
                    }
                  >
                    {text}
                    {item.unit && <span className="ml-1 text-sm text-muted">{item.unit}</span>}
                  </p>
                  {item.note && <p className="text-xs text-muted">{item.note}</p>}
                </div>
                {item.copyable !== false && <CopyButton text={resultToText(item)} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
