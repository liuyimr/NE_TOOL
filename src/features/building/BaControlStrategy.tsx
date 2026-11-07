import QuickRefTool from '@/components/QuickRefTool';
import type { ToolDef } from '@/types/tool';

/** BA9 BA 控制策略速查（冷冻站 / 空调箱 / 新风机） */
export default function BaControlStrategy({ tool }: { tool: ToolDef }): JSX.Element {
  return <QuickRefTool tool={tool} />;
}
