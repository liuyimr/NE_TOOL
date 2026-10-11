import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { pipeSize, type FlowUnit } from '@/lib/calc/waterPipe';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'flow', label: '设计流量', type: 'number', default: 2, min: 0, step: 0.1 },
  {
    key: 'flowUnit',
    label: '流量单位',
    type: 'select',
    default: 'L/s',
    options: [
      { label: 'L/s', value: 'L/s' },
      { label: 'm³/h', value: 'm3/h' },
    ],
  },
  { key: 'velocity', label: '推荐流速', type: 'number', default: 1.0, min: 0.1, step: 0.1, unit: 'm/s' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = pipeSize({
    flow: num(v, 'flow'),
    flowUnit: str(v, 'flowUnit', 'L/s') as FlowUnit,
    velocity: num(v, 'velocity', 1.0),
  });
  return [
    res(
      'recommendedDn',
      '推荐公称直径 DN',
      r.recommendedDn !== null ? `DN${r.recommendedDn}` : '超出常用范围',
      '',
      { highlight: true },
    ),
    res('actualVelocity', '实际流速', r.actualVelocity, 'm/s', { highlight: true }),
    res('computedDiaMm', '理论所需内径', r.computedDiaMm, 'mm'),
    res('recommendedId', '推荐 DN 内径', r.recommendedId, 'mm'),
    res('velocity', '采用流速', r.velocity, 'm/s', { copyable: false }),
  ];
}

/** D8 管径选择（按流量与流速） */
export default function PipeSize({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
