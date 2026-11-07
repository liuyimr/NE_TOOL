import QuickRefTool from '@/components/QuickRefTool';
import type { ToolDef } from '@/types/tool';

/** E17 接地系统形式 TN / TT / IT 速查 */
export default function EarthingSystems({ tool }: { tool: ToolDef }): JSX.Element {
  return <QuickRefTool tool={tool} />;
}
