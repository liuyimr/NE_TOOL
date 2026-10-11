import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getQuickRef } from '@/data/catalog';
import type { QuickRefItem } from '@/types/quickref';

export interface QuickRefTableProps {
  /** 速查表 id */
  tableId: string;
}

/** 行是否匹配关键词（label / 各列值 / 备注） */
function matchRow(row: QuickRefItem, q: string): boolean {
  if (!q) return true;
  const ql = q.toLowerCase();
  if (row.label.toLowerCase().includes(ql)) return true;
  if (row.note && row.note.toLowerCase().includes(ql)) return true;
  return Object.values(row.values).some((v) => String(v).toLowerCase().includes(ql));
}

/**
 * 通用速查表渲染（自研组件）
 * - 由 data/*.json（QuickRefTable schema）驱动，列/行自适应
 * - 支持页内搜索
 * - 支持通过 URL ?anchor=行id 定位高亮（从搜索结果跳转而来）
 * - 移动端：宽表横向滚动，首列吸附，避免左右滑动时丢失行标签
 */
export default function QuickRefTable({ tableId }: QuickRefTableProps): JSX.Element {
  const table = getQuickRef(tableId);
  const [params] = useSearchParams();
  const anchor = params.get('anchor');
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () => (table ? table.rows.filter((row) => matchRow(row, query.trim())) : []),
    [table, query],
  );

  if (!table) {
    return <p className="text-sm text-danger">速查数据缺失：{tableId}</p>;
  }

  const wide = table.columns.length > 2;

  return (
    <section className="ne-surface">
      <header className="flex flex-col gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">{table.title}</h3>
          <span className="shrink-0 text-xs text-muted">{rows.length} 项</span>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="表内搜索…"
          className="min-h-touch w-full rounded border border-border bg-surface px-3 text-fg placeholder:text-muted ne-focus"
        />
        {wide && (
          <p className="text-[11px] text-muted sm:hidden">表格较宽，可左右滑动查看</p>
        )}
      </header>

      <div className="ne-scroll-x">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2 text-left text-xs text-muted">
              {table.columns.map((col, ci) => (
                <th
                  key={col.key}
                  className={[
                    'whitespace-nowrap px-3 py-2 font-medium',
                    col.align === 'right' ? 'text-right' : 'text-left',
                    col.mono ? 'font-mono' : '',
                    ci === 0
                      ? 'sticky left-0 z-[2] bg-surface-2 shadow-[1px_0_0_0_var(--ne-border)]'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                id={`ref-${row.id}`}
                className={[
                  'border-t border-border align-top',
                  anchor === row.id ? 'bg-accent/10' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {table.columns.map((col, ci) => (
                  <td
                    key={col.key}
                    className={[
                      'px-3 py-2',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      col.mono ? 'font-mono' : '',
                      ci === 0
                        ? 'sticky left-0 z-[1] font-medium shadow-[1px_0_0_0_var(--ne-border)]'
                        : '',
                      ci === 0 ? (anchor === row.id ? 'bg-surface-2' : 'bg-surface') : 'text-fg',
                      ci === 0 ? 'text-fg' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {row.cells && row.cells[ci]?.color ? (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-border"
                          style={{ backgroundColor: row.cells[ci].color }}
                        />
                        {String(row.values[col.key] ?? row.cells[ci].text)}
                      </span>
                    ) : (
                      String(row.values[col.key] ?? '—')
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={table.columns.length} className="px-3 py-6 text-center text-muted">
                  无匹配项
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(table.source || table.updatedAt) && (
        <footer className="border-t border-border px-3 py-2 text-xs text-muted">
          {table.source && <span>依据：{table.source}</span>}
          {table.updatedAt && <span className="ml-2">更新：{table.updatedAt}</span>}
        </footer>
      )}
    </section>
  );
}
