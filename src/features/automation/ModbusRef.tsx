import QuickRefTool from '@/components/QuickRefTool';
import type { ToolDef } from '@/types/tool';

/** C15 Modbus 通信速查（功能码 + 异常码 两张表，经 quickRefIds 挂载） */
export default function ModbusRef({ tool }: { tool: ToolDef }): JSX.Element {
  return <QuickRefTool tool={tool} />;
}
