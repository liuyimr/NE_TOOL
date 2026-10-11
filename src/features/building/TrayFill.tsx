import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { trayFill, type FillKind } from '@/lib/calc/trayFill';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'cableCount', label: '线缆数量', type: 'number', default: 4, min: 0, unit: '根' },
  { key: 'cableSection', label: '单根线缆截面', type: 'number', default: 100, min: 0, unit: 'mm²' },
  { key: 'width', label: '桥架/管内宽', type: 'number', default: 100, min: 0, unit: 'mm' },
  { key: 'height', label: '桥架/管内高', type: 'number', default: 20, min: 0, unit: 'mm' },
  {
    key: 'kind',
    label: '敷设类型',
    type: 'select',
    default: 'power',
    options: [
      { label: '电力桥架（≤40%）', value: 'power' },
      { label: '弱电桥架（≤50%）', value: 'weak' },
      { label: '穿管（≤40%）', value: 'conduit' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = trayFill({
    cables: [{ count: num(v, 'cableCount'), section: num(v, 'cableSection') }],
    width: num(v, 'width'),
    height: num(v, 'height'),
    kind: str(v, 'kind', 'power') as FillKind,
  });
  return [
    res('fill', '填充率', r.fillRate, '%', { highlight: true }),
    res('cableArea', '线缆占位面积', r.cableArea, 'mm²'),
    res('containerArea', '容器截面积', r.containerArea, 'mm²'),
    res('limit', '限值', r.limit, '%', { copyable: false }),
    res('compliant', '是否合规', r.compliant ? '合规 ✅' : '超限 ❌', '', { copyable: false }),
  ];
}

/** B2 桥架 / 管路填充率计算 */
export default function TrayFill({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView toolId={tool.id} fields={fields} run={run} quickRefIds={['building.fillRate']} />
  );
}
