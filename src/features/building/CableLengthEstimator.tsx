import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { cableLength } from '@/lib/calc/cableLength';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'points', label: '总点数', type: 'number', default: 100, min: 0 },
  { key: 'horizontal', label: '平均水平距离', type: 'number', default: 60, min: 0, unit: 'm' },
  { key: 'vertical', label: '垂直距离', type: 'number', default: 10, min: 0, unit: 'm' },
  { key: 'margin', label: '余量系数', type: 'number', default: 1.1, step: 0.05, help: '一般 1.1~1.2' },
  { key: 'boxLength', label: '单箱长度', type: 'number', default: 305, min: 1, unit: 'm' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = cableLength({
    points: num(v, 'points'),
    horizontal: num(v, 'horizontal'),
    vertical: num(v, 'vertical'),
    margin: num(v, 'margin', 1.1),
    boxLength: num(v, 'boxLength', 305),
  });
  return [
    res('total', '总长度', Math.ceil(r.totalLength), 'm', { highlight: true }),
    res('totalExact', '总长度（精确）', r.totalLength, 'm'),
    res('boxes', '所需箱数', r.boxes, '箱'),
    res('perPoint', '单点平均长度', r.perPoint, 'm'),
    res('margin', '余量系数', r.margin, '', { copyable: false }),
  ];
}

/** B1 综合布线线缆长度估算 */
export default function CableLengthEstimator({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
