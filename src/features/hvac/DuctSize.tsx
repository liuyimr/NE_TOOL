import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { ductSize, type DuctShape } from '@/lib/calc/hvacDuct';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'flowM3h', label: '风量', type: 'number', default: 35640, min: 0, step: 100, unit: 'm³/h' },
  {
    key: 'velocity',
    label: '推荐风速',
    type: 'number',
    default: 7,
    min: 0,
    step: 0.5,
    unit: 'm/s',
    help: '主管 6~9、支管 3~5、回风 4~6',
  },
  {
    key: 'shape',
    label: '风管型式',
    type: 'select',
    default: 'round',
    options: [
      { label: '圆形', value: 'round' },
      { label: '矩形', value: 'rect' },
    ],
  },
  { key: 'aspectMax', label: '矩形长宽比上限', type: 'number', default: 4, min: 1, step: 0.5 },
];

function run(v: Record<string, string>): CalcResult[] {
  const shape = str(v, 'shape', 'round') as DuctShape;
  const r = ductSize({
    flowM3h: num(v, 'flowM3h'),
    velocity: num(v, 'velocity', 0),
    shape,
    aspectMax: num(v, 'aspectMax', 4),
  });
  if (!r.valid) {
    return [res('error', '错误', '风量需大于 0，推荐风速需大于 0', '', { copyable: false })];
  }
  const out: CalcResult[] = [
    res('areaM2', '所需截面积', r.areaM2, 'm²', { highlight: true }),
    res('roundDiaMm', '圆形直径', r.roundDiaMm, 'mm', { highlight: shape === 'round' }),
  ];
  if (shape === 'rect') {
    out.push(
      res('rect', '矩形尺寸（宽×高）', `${r.rectW ?? '—'} × ${r.rectH ?? '—'}`, 'mm', {
        highlight: true,
      }),
      res('actualVelocity', '实际风速', r.actualVelocity, 'm/s'),
      res('exceeds', '风速校核', r.exceeds ? '超过推荐风速 ⚠️' : '在推荐范围内 ✅', '', {
        copyable: false,
      }),
    );
  } else {
    out.push(res('actualVelocity', '实际风速', r.actualVelocity, 'm/s', { copyable: false }));
  }
  return out;
}

/** H13 风管尺寸选择 */
export default function DuctSize({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
