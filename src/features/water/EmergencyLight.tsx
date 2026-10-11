import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { emergencyBattery } from '@/lib/calc/waterEmergency';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'lampW', label: '单灯功率', type: 'number', default: 5, min: 0, unit: 'W' },
  { key: 'count', label: '灯具数量', type: 'number', default: 20, min: 1, step: 1, unit: '盏' },
  { key: 'durationMin', label: '要求持续时间', type: 'number', default: 90, min: 0, unit: 'min' },
  { key: 'batteryV', label: '电池标称电压', type: 'number', default: 24, min: 0, unit: 'V' },
  {
    key: 'efficiency',
    label: '综合效率 η',
    type: 'number',
    default: 0.85,
    min: 0.1,
    max: 1,
    step: 0.01,
  },
  { key: 'dod', label: '放电深度 DoD', type: 'number', default: 0.8, min: 0.1, max: 1, step: 0.05 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = emergencyBattery({
    lampW: num(v, 'lampW'),
    count: num(v, 'count', 1),
    durationMin: num(v, 'durationMin'),
    batteryV: num(v, 'batteryV', 24),
    efficiency: num(v, 'efficiency', 0.85),
    dod: num(v, 'dod', 0.8),
  });
  const verdict = r.meets90 ? '满足 90 min ✅' : r.meets30 ? '满足 30 min（不足 90）⚠️' : '不满足 ❌';
  return [
    res('capacityAh', '所需电池容量 C', r.capacityAh, 'Ah', { highlight: true }),
    res('totalPowerW', '灯具总功率', r.totalPowerW, 'W'),
    res('durationH', '持续时长', r.durationH, 'h'),
    res('energyWh', '电池能量需求', r.energyWh, 'Wh'),
    res('duration', '持续时间校核', verdict, '', { copyable: false }),
    res('min30', '是否满足 ≥30 min', r.meets30 ? '是 ✅' : '否 ❌', '', { copyable: false }),
    res('min90', '是否满足 ≥90 min', r.meets90 ? '是 ✅' : '否 ❌', '', { copyable: false }),
  ];
}

/** D6 应急照明时长与电池容量 */
export default function EmergencyLight({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
