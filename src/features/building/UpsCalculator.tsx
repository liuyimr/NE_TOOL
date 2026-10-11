import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { upsCapacity } from '@/lib/calc/ups';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'loadKW', label: '负载功率', type: 'number', default: 10, min: 0, unit: 'kW' },
  { key: 'powerFactor', label: '功率因数', type: 'number', default: 0.9, step: 0.01 },
  { key: 'backupHours', label: '后备时间', type: 'number', default: 2, min: 0, step: 0.5, unit: 'h' },
  { key: 'batteryVoltage', label: '电池组电压', type: 'number', default: 240, min: 1, unit: 'V' },
  { key: 'efficiency', label: '逆变效率', type: 'number', default: 0.9, step: 0.01 },
  { key: 'dischargeFactor', label: '放电系数', type: 'number', default: 0.8, step: 0.01 },
  { key: 'margin', label: '容量余量', type: 'number', default: 1.25, step: 0.05 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = upsCapacity({
    loadKW: num(v, 'loadKW'),
    powerFactor: num(v, 'powerFactor', 0.9),
    backupHours: num(v, 'backupHours'),
    batteryVoltage: num(v, 'batteryVoltage', 240),
    efficiency: num(v, 'efficiency', 0.9),
    dischargeFactor: num(v, 'dischargeFactor', 0.8),
    margin: num(v, 'margin', 1.25),
  });
  return [
    res('kva', '推荐 UPS 容量', r.recommendedKVA, 'kVA', { highlight: true }),
    res('apparent', '视在功率', r.apparentKVA, 'kVA'),
    res('active', '有功功率', r.activeKW, 'kW'),
    res('ah', '电池容量', Math.ceil(r.batteryAh), 'Ah'),
    res('kwh', '电池组能量', r.batteryKWh, 'kWh'),
  ];
}

/** B5 机房 UPS 容量计算 */
export default function UpsCalculator({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
