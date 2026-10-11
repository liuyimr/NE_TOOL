import CalculatorView from '@/features/shared/CalculatorView';
import { res, str } from '@/features/shared/calcHelpers';
import { subnetCalc } from '@/lib/calc/subnet';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'ip', label: 'IP 地址', type: 'text', default: '192.168.1.10', placeholder: '192.168.1.10' },
  {
    key: 'mask',
    label: '掩码 / 前缀',
    type: 'text',
    default: '24',
    placeholder: '255.255.255.0 或 24',
    help: '支持点分掩码或前缀长度（0-32）',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = subnetCalc({ ip: str(v, 'ip'), mask: str(v, 'mask', '24') });
  if (!r.valid) return [res('error', '错误', r.error ?? '输入非法')];
  const results: CalcResult[] = [
    res('network', '网络地址', r.network, '', { highlight: true }),
    res('broadcast', '广播地址', r.broadcast),
    res('first', '首个可用主机', r.firstHost),
    res('last', '最后可用主机', r.lastHost),
    res('hosts', '可用主机数', r.usableHosts, '个'),
    res('total', '地址总数', r.totalAddresses, '个'),
    res('mask', '子网掩码', r.mask),
    res('prefix', '前缀长度', `/${r.prefix}`),
    res('wildcard', '反掩码', r.wildcard),
    res('ipClass', 'IP 类别', r.ipClass, '', { copyable: false }),
    res('private', '私有地址', r.isPrivate ? '是' : '否', '', { copyable: false }),
    res('ipBin', 'IP 二进制', r.ipBinary),
    res('maskBin', '掩码二进制', r.maskBinary),
  ];
  // /31、/32 为 RFC 3021 特例，不适用「2^(32−前缀) − 2」公式，界面明确提示避免误解
  if (r.prefix === 31 || r.prefix === 32) {
    results.push(
      res(
        'rfc3021',
        '提示',
        `/${r.prefix} 按 RFC 3021 特例处理，故不适用 2^(32−前缀)−2 公式`,
        '',
        { copyable: false },
      ),
    );
  }
  return results;
}

/** A1 IP 子网计算器 */
export default function SubnetCalculator({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
