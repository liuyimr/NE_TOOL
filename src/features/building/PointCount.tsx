import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { pointCount } from '@/lib/calc/pointCount';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'ai', label: 'AI（模拟量输入）', type: 'number', default: 20, min: 0, unit: '点' },
  { key: 'ao', label: 'AO（模拟量输出）', type: 'number', default: 4, min: 0, unit: '点' },
  { key: 'di', label: 'DI（数字量输入）', type: 'number', default: 40, min: 0, unit: '点' },
  { key: 'do', label: 'DO（数字量输出）', type: 'number', default: 10, min: 0, unit: '点' },
  { key: 'capacity', label: '单台控制器点数', type: 'number', default: 48, min: 1, unit: '点' },
  { key: 'margin', label: '预留余量', type: 'number', default: 20, min: 0, max: 100, unit: '%' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = pointCount({
    points: [
      { type: 'AI', count: num(v, 'ai') },
      { type: 'AO', count: num(v, 'ao') },
      { type: 'DI', count: num(v, 'di') },
      { type: 'DO', count: num(v, 'do') },
    ],
    capacityPerDdc: num(v, 'capacity', 48),
    marginPct: num(v, 'margin', 20),
  });
  return [
    res('ddc', 'DDC 数量', r.ddcCount, '台', { highlight: true }),
    res('total', '总点数', r.total, '点'),
    res('margin', '余量点数', r.marginPoints, '点'),
    res('design', '设计点数（含余量）', r.designPoints, '点'),
    res('AI', 'AI 合计', r.byType.AI ?? 0, '点', { copyable: false }),
    res('AO', 'AO 合计', r.byType.AO ?? 0, '点', { copyable: false }),
    res('DI', 'DI 合计', r.byType.DI ?? 0, '点', { copyable: false }),
    res('DO', 'DO 合计', r.byType.DO ?? 0, '点', { copyable: false }),
  ];
}

/** B3 弱电点位统计与工程量估算 */
export default function PointCount({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView
      toolId={tool.id}
      fields={fields}
      run={run}
      quickRefIds={['building.pointTypes']}
    />
  );
}
