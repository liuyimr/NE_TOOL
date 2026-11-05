import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { hvacWaterFlow } from '@/lib/calc/hvacWaterFlow';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'loadKw', label: '冷 / 热量 Q', type: 'number', default: 120, min: 0, unit: 'kW' },
  { key: 'deltaT', label: '供回水温差 Δt', type: 'number', default: 5, min: 0, step: 0.5, unit: '℃' },
  { key: 'velocity', label: '推荐流速', type: 'number', default: 1.5, min: 0.1, step: 0.1, unit: 'm/s' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = hvacWaterFlow({
    loadKw: num(v, 'loadKw'),
    deltaT: num(v, 'deltaT', 0),
    velocity: num(v, 'velocity', 1.5),
  });
  if (!r.valid) {
    return [res('error', '错误', '冷/热量需大于 0，供回水温差需大于 0', '', { copyable: false })];
  }
  return [
    res('flowM3h', '流量', r.flowM3h, 'm³/h', { highlight: true }),
    res('flowLps', '流量', r.flowLps, 'L/s'),
    res(
      'recommendedDn',
      '推荐管径',
      r.recommendedDn !== null ? `DN${r.recommendedDn}` : '超出常用范围',
      '',
      { highlight: true },
    ),
    res('actualVelocity', '实际流速', r.actualVelocity, 'm/s'),
    res('velocity', '采用流速', r.velocity, 'm/s', { copyable: false }),
  ];
}

/** H14 冷冻水 / 热水流量计算 */
export default function WaterFlow({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
