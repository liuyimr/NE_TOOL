import type { ToolDef } from '@/types/tool';
import QuickRefTable from './QuickRefTable';

export interface QuickRefToolProps {
  tool: ToolDef;
}

/**
 * 速查类工具的统一视图：按 tool.quickRefIds / quickRefId 渲染一张或多张速查表。
 * C15（Modbus）即通过 quickRefIds 同时挂载「功能码 + 异常码」两张表。
 */
export default function QuickRefTool({ tool }: QuickRefToolProps): JSX.Element {
  const ids = tool.quickRefIds ?? (tool.quickRefId ? [tool.quickRefId] : []);
  if (ids.length === 0) {
    return <p className="text-sm text-muted">该速查工具暂无数据。</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {ids.map((id) => (
        <QuickRefTable key={id} tableId={id} />
      ))}
    </div>
  );
}
