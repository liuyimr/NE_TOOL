import QuickRefTool from '@/components/QuickRefTool';
import type { ToolDef } from '@/types/tool';

/** BA12 BACnet 对象与服务速查 */
export default function BacnetRef({ tool }: { tool: ToolDef }): JSX.Element {
  return <QuickRefTool tool={tool} />;
}
