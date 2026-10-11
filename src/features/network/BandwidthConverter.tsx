import CalculatorView from '@/features/shared/CalculatorView';
import { bool, num, res, str } from '@/features/shared/calcHelpers';
import { BANDWIDTH_UNITS, bandwidthConvert } from '@/lib/calc/bandwidth';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'value', label: '数值', type: 'number', default: 100, min: 0, step: 1 },
  {
    key: 'unit',
    label: '源单位',
    type: 'select',
    default: 'Mbps',
    options: BANDWIDTH_UNITS.map((u) => ({ label: u.label, value: u.id })),
  },
  {
    key: 'binary',
    label: '换算口径',
    type: 'select',
    default: '0',
    help: '字节类单位：十进制 1000 / 二进制 1024',
    options: [
      { label: '十进制 (1000)', value: '0' },
      { label: '二进制 (1024)', value: '1' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const binary = bool(v, 'binary');
  const all = bandwidthConvert(num(v, 'value'), str(v, 'unit', 'Mbps'), binary);
  return BANDWIDTH_UNITS.map((u) =>
    res(u.id, u.label, all[u.id], '', { highlight: u.id === str(v, 'unit', 'Mbps') }),
  );
}

/** A4 带宽 / 流量单位换算 */
export default function BandwidthConverter({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
