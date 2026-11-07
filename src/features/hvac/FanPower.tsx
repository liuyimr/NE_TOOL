import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { fanPower } from '@/lib/calc/fanPower';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'flowM3h', label: '风量 Q', type: 'number', default: 10000, min: 0, unit: 'm³/h' },
  { key: 'totalPa', label: '风机全压', type: 'number', default: 500, min: 0, unit: 'Pa' },
  { key: 'fanEff', label: '风机效率', type: 'number', default: 0.7, min: 0.01, max: 1, step: 0.05 },
  {
    key: 'transEff',
    label: '传动效率',
    type: 'number',
    default: 0.95,
    min: 0.01,
    max: 1,
    step: 0.05,
    help: '直联取 1.0',
  },
  { key: 'motorMargin', label: '电机储备系数', type: 'number', default: 1.2, min: 1, step: 0.1 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = fanPower({
    flowM3h: num(v, 'flowM3h'),
    totalPa: num(v, 'totalPa', 500),
    fanEff: num(v, 'fanEff', 0.7),
    transEff: num(v, 'transEff', 0.95),
    motorMargin: num(v, 'motorMargin', 1.2),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('shaftKw', '风机轴功率', r.shaftKw, 'kW', { highlight: true }),
    res('requiredKw', '所需电机功率', r.requiredKw, 'kW'),
    res(
      'recommendedMotorKw',
      '推荐标准电机功率',
      r.recommendedMotorKw ?? '超出常用电机序列',
      'kW',
      { highlight: true },
    ),
    res('fanTypeNote', '风机形式（经验）', r.fanTypeNote, '', { copyable: false }),
    res('motorMargin', '采用储备系数', r.motorMargin, '', { copyable: false }),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** H16 风机选型与轴功率 */
export default function FanPower({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
