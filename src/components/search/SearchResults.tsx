import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchHit } from '@/lib/search';

export interface SearchResultsProps {
  hits: SearchHit[];
  query: string;
}

/** 高亮字符串中命中的关键词片段 */
function highlight(text: string, query: string): JSX.Element {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: JSX.Element[] = [];
  let i = 0;
  let idx = lower.indexOf(ql);
  let key = 0;
  while (idx >= 0) {
    if (idx > i) parts.push(<Fragment key={key++}>{text.slice(i, idx)}</Fragment>);
    parts.push(
      <mark key={key++} className="rounded bg-accent/20 px-0.5 text-accent">
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
    idx = lower.indexOf(ql, i);
  }
  if (i < text.length) parts.push(<Fragment key={key++}>{text.slice(i)}</Fragment>);
  return <>{parts}</>;
}

/**
 * 搜索结果列表：分「工具」「速查」两组展示，命中关键词高亮，可跳转
 */
export default function SearchResults({ hits, query }: SearchResultsProps): JSX.Element {
  const navigate = useNavigate();
  const tools = hits.filter((h) => h.doc.type === 'tool');
  const refs = hits.filter((h) => h.doc.type === 'quickref-item');

  if (hits.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">未找到与「{query}」相关的内容</p>;
  }

  function open(toolId: string, anchor?: string): void {
    navigate(anchor ? `/tool/${toolId}?anchor=${encodeURIComponent(anchor)}` : `/tool/${toolId}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {tools.length > 0 && (
        <section>
          <h2 className="mb-1 px-1 text-xs font-semibold uppercase text-muted">工具</h2>
          <ul className="ne-surface divide-y divide-border">
            {tools.map((h) => (
              <li key={h.doc.id}>
                <button
                  type="button"
                  className="flex min-h-touch w-full items-center gap-3 px-3 py-2 text-left"
                  onClick={() => open(h.doc.toolId)}
                >
                  <span className="text-xl">{getIcon(h.doc.toolId)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {highlight(h.doc.title, query)}
                    </span>
                    {h.doc.subtitle && (
                      <span className="block truncate text-xs text-muted">{h.doc.subtitle}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {refs.length > 0 && (
        <section>
          <h2 className="mb-1 px-1 text-xs font-semibold uppercase text-muted">速查内容</h2>
          <ul className="ne-surface divide-y divide-border">
            {refs.map((h) => (
              <li key={h.doc.id}>
                <button
                  type="button"
                  className="flex min-h-touch w-full flex-col gap-0.5 px-3 py-2 text-left"
                  onClick={() => open(h.doc.toolId, h.doc.anchor)}
                >
                  <span className="text-sm font-medium text-fg">
                    {highlight(h.doc.title, query)}
                  </span>
                  {h.doc.body && (
                    <span className="truncate text-xs text-muted">
                      {highlight(h.doc.body, query)}
                    </span>
                  )}
                  {h.doc.subtitle && (
                    <span className="text-xs text-muted">来源于：{h.doc.subtitle}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** 根据工具 id 取图标（用于搜索结果，避免额外查询成本） */
function getIcon(toolId: string): string {
  // 延迟 import 会引入循环依赖，这里用轻量映射兜底
  const map: Record<string, string> = {
    network: '🌐',
    building: '🏢',
    automation: '⚙️',
  };
  const domain = toolId.split('.')[0] ?? 'network';
  return map[domain] ?? '🔧';
}
