import CalculatorView from '@/features/shared/CalculatorView';
import { res, str } from '@/features/shared/calcHelpers';
import { ipInfo } from '@/lib/calc/ipConvert';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'ip', label: 'IP 地址', type: 'text', default: '192.168.1.1', placeholder: '192.168.1.1' },
];

function run(v: Record<string, string>): CalcResult[] {
  const info = ipInfo(str(v, 'ip'));
  if (!info.valid) return [res('error', '错误', info.error ?? 'IP 非法')];
  return [
    res('dotted', '点分十进制', info.dotted, '', { highlight: true }),
    res('decimal', '十进制', info.decimal),
    res('binary', '二进制', info.binary),
    res('hex', '十六进制', info.hex),
    res('ipClass', 'IP 类别', info.ipClass, '', { copyable: false }),
    res('private', '地址类型', info.isPrivate ? '私有地址' : '公网地址', '', { copyable: false }),
  ];
}

/** A2 IP 地址转换与校验 */
export default function IpConverter({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
