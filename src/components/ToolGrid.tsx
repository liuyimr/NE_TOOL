import type { ToolDef } from '@/types/tool';
import ToolCard from './ToolCard';

export interface ToolGridProps {
  /** 工具列表 */
  tools: ToolDef[];
  /** 分区标题（可选） */
  title?: string;
}

/** 九宫格工具入口（响应式：手机 2 列 / 平板 3 列 / 桌面 4 列） */
export default function ToolGrid({ tools, title }: ToolGridProps): JSX.Element {
  return (
    <section>
      {title && <h2 className="mb-2 px-1 text-sm font-semibold text-muted">{title}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}
