import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { currentLimitResult, dividerResult } from '@/lib/calc/resistor';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'mode',
    label: '计算模式',
    type: 'select',
    default: 'divider',
    options: [
      { label: '电阻分压', value: 'divider' },
      { label: '限流电阻（LED/接口）', value: 'current' },
    ],
  },
  { key: 'vin', label: '输入电压 Vin', type: 'number', default: 12, unit: 'V' },
  { key: 'r1', label: '上臂电阻 R1', type: 'number', default: 1000, min: 0, unit: 'Ω' },
  { key: 'r2', label: '下臂电阻 R2', type: 'number', default: 1000, min: 0, unit: 'Ω' },
  { key: 'vcc', label: '电源电压 Vcc', type: 'number', default: 5, unit: 'V' },
  { key: 'vf', label: '负载压降 Vf', type: 'number', default: 2, unit: 'V' },
  { key: 'ifA', label: '目标电流 If', type: 'number', default: 0.02, step: 0.001, unit: 'A' },
];

function run(v: Record<string, string>): CalcResult[] {
  const mode = str(v, 'mode', 'divider');
  if (mode === 'current') {
    const r = currentLimitResult({ vcc: num(v, 'vcc'), vf: num(v, 'vf'), ifA: num(v, 'ifA') });
    return [
      res('resistor', '限流电阻', r.resistor, 'Ω', { highlight: true }),
      res('dropV', '电阻两端电压', r.dropV, 'V'),
      res('power', '电阻功耗', r.power, 'W'),
      res('recommendedWatt', '推荐额定功率', r.recommendedWatt, 'W'),
    ];
  }
  const r = dividerResult({ vin: num(v, 'vin'), r1: num(v, 'r1'), r2: num(v, 'r2') });
  return [
    res('vout', '输出电压 Vout', r.vout, 'V', { highlight: true }),
    res('current', '分压电流', r.current, 'A'),
    res('powerR1', 'R1 功耗', r.powerR1, 'W'),
    res('powerR2', 'R2 功耗', r.powerR2, 'W'),
  ];
}

/** C12 电阻分压 / 限流电阻计算 */
export default function ResistorCalculator({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
