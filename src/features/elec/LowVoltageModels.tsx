import QuickRefTool from '@/components/QuickRefTool';
import type { ToolDef } from '@/types/tool';

/** E16 低压电气元件型号含义速查 */
export default function LowVoltageModels({ tool }: { tool: ToolDef }): JSX.Element {
  return <QuickRefTool tool={tool} />;
}
