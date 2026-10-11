import { Link } from 'react-router-dom';
import type { ToolDef } from '@/types/tool';

export interface ToolCardProps {
  tool: ToolDef;
}

/** 单个工具卡片（九宫格/列表单元） */
export default function ToolCard({ tool }: ToolCardProps): JSX.Element {
  return (
    <Link
      to={`/tool/${tool.id}`}
      className="ne-surface flex min-h-touch flex-col gap-1 p-3 ne-focus hover:border-accent"
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{tool.icon}</span>
        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
          {tool.code}
        </span>
      </div>
      <span className="line-clamp-2 text-sm font-medium text-fg">{tool.title}</span>
      {tool.subtitle && (
        <span className="line-clamp-2 text-xs text-muted">{tool.subtitle}</span>
      )}
      {tool.priority !== 'P0' && (
        <span className="mt-auto text-[10px] text-muted">{tool.priority}</span>
      )}
    </Link>
  );
}
