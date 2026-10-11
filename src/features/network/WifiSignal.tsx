import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { wifiSignal } from '@/lib/calc/wifiSignal';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'value', label: '数值', type: 'number', default: -65, step: 1 },
  {
    key: 'unit',
    label: '输入单位',
    type: 'select',
    default: 'dBm',
    options: [
      { label: 'dBm', value: 'dBm' },
      { label: 'mW', value: 'mW' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const unit = str(v, 'unit', 'dBm') === 'mW' ? 'mW' : 'dBm';
  const r = wifiSignal(num(v, 'value'), unit);
  return [
    res('dbm', 'RSSI', `${r.dbm.toFixed(2)}`, 'dBm', { highlight: true }),
    res('mw', '功率', r.mw, 'mW'),
    res('level', '信号等级', r.level, '', { copyable: false }),
    res('quality', '信号质量', r.quality, '', { copyable: false }),
    res('use', '典型体验', r.use, '', { copyable: false }),
  ];
}

/** A12 WiFi 信号强度换算 */
export default function WifiSignal({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView toolId={tool.id} fields={fields} run={run} quickRefIds={['network.wifiSignal']} />
  );
}
