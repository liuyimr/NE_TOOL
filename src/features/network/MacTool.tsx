import CalculatorView from '@/features/shared/CalculatorView';
import { res, str } from '@/features/shared/calcHelpers';
import { macInfo } from '@/lib/calc/mac';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'mac',
    label: 'MAC 地址',
    type: 'text',
    default: 'AA:BB:CC:DD:EE:FF',
    placeholder: 'AA:BB:CC:DD:EE:FF',
    help: '支持 : - . 或无分隔格式',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = macInfo(str(v, 'mac'));
  if (!r.valid) return [res('error', '错误', r.error ?? 'MAC 非法')];
  return [
    res('canonical', '标准格式', r.canonical, '', { highlight: true }),
    res('colon', '冒号分隔', r.colon),
    res('hyphen', '连字符分隔', r.hyphen),
    res('dotted', '点分（Cisco）', r.dotted),
    res('bare', '无分隔', r.bare),
    res('oui', 'OUI（厂商前缀）', r.oui),
    res('type', '地址类型', r.multicast ? '组播' : '单播', '', { copyable: false }),
    res('ul', '管理类型', r.locallyAdministered ? '本地管理' : '全局唯一', '', {
      copyable: false,
    }),
  ];
}

/** A9 MAC 地址工具 */
export default function MacTool({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
