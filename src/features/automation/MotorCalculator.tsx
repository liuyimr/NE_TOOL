import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { motorFull, type PhaseMode } from '@/lib/calc/motor';
import { apparentPower, electricPower } from '@/lib/calc/power';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'powerKW', label: '功率', type: 'number', default: 7.5, min: 0, unit: 'kW' },
  { key: 'voltage', label: '电压', type: 'number', default: 380, min: 0, unit: 'V' },
  { key: 'powerFactor', label: '功率因数 cosφ', type: 'number', default: 0.85, step: 0.01 },
  { key: 'efficiency', label: '效率 η', type: 'number', default: 0.9, step: 0.01 },
  {
    key: 'poles',
    label: '极数',
    type: 'select',
    default: '4',
    options: [
      { label: '2 极', value: '2' },
      { label: '4 极', value: '4' },
      { label: '6 极', value: '6' },
      { label: '8 极', value: '8' },
    ],
  },
  { key: 'frequency', label: '电源频率', type: 'number', default: 50, min: 0, unit: 'Hz' },
  { key: 'rpm', label: '额定转速', type: 'number', default: 1440, min: 0, unit: 'rpm' },
  {
    key: 'phase',
    label: '相制',
    type: 'select',
    default: 'three',
    options: [
      { label: '三相', value: 'three' },
      { label: '单相', value: 'single' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const phase = str(v, 'phase', 'three') as PhaseMode;
  const input = {
    powerKW: num(v, 'powerKW'),
    voltage: num(v, 'voltage'),
    powerFactor: num(v, 'powerFactor', 0.85),
    efficiency: num(v, 'efficiency', 0.9),
    rpm: num(v, 'rpm'),
    frequency: num(v, 'frequency', 50),
    poles: num(v, 'poles', 4),
    phase,
  };
  const r = motorFull(input);
  const voltage = num(v, 'voltage');
  const current = r.current;
  return [
    res('current', '额定电流', current, 'A', { highlight: true }),
    res('power', '电机功率', r.powerKW, 'kW'),
    res('torque', '额定扭矩', r.torque, 'N·m'),
    res('sync', '同步转速', r.syncSpeed, 'rpm'),
    res('apparent', '视在功率', apparentPower(voltage, current, phase), 'kVA'),
    res('electric', '电功率', electricPower({ voltage, current, powerFactor: num(v, 'powerFactor', 0.85), phase }), 'kW'),
  ];
}

/** C7 三相电机电流 / 功率 / 扭矩 / 转速计算 */
export default function MotorCalculator({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
