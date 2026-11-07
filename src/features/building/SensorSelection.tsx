import QuickRefTool from '@/components/QuickRefTool';
import type { ToolDef } from '@/types/tool';

/** BA10 传感器量程与精度选型 */
export default function SensorSelection({ tool }: { tool: ToolDef }): JSX.Element {
  return <QuickRefTool tool={tool} />;
}
