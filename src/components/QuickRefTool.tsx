import { Link } from 'react-router-dom';
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
  return (
    <div className="flex flex-col gap-4">
      {ids.length === 0 ? (
        <p className="text-sm text-muted">该速查工具暂无数据。</p>
      ) : (
        ids.map((id) => <QuickRefTable key={id} tableId={id} />)
      )}

      {/* 结果区统一免责入口：与关于页 #/about#disclaimer 保持同一口径 */}
      <p className="px-1 text-xs leading-relaxed text-muted">
        结果为方案阶段工程估算，含经验系数与简化假设，不作为施工图设计、采购、验收或安全校验依据；
        <Link
          to="/about#disclaimer"
          className="ne-focus ml-1 underline decoration-dotted underline-offset-2"
        >
          查看完整免责声明 →
        </Link>
      </p>
    </div>
  );
}
