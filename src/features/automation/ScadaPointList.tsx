import QuickRefTool from '@/components/QuickRefTool';
import type { ToolDef } from '@/types/tool';

/** P20 SCADA / 上位机点表模板 */
export default function ScadaPointList({ tool }: { tool: ToolDef }): JSX.Element {
  return <QuickRefTool tool={tool} />;
}
