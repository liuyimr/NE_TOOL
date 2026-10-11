import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { sizeConduit } from '@/lib/calc/waterConduit';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const SECTION_OPTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95].map((s) => ({
  label: `${s} mm²`,
  value: String(s),
}));

const fields: FieldDef[] = [
  {
    key: 'section',
    label: '导线截面',
    type: 'select',
    default: '2.5',
    options: SECTION_OPTIONS,
  },
  { key: 'count', label: '导线根数', type: 'number', default: 3, min: 1, step: 1 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = sizeConduit({
    section: num(v, 'section', 2.5),
    count: num(v, 'count', 1),
  });
  return [
    res(
      'recommendedOd',
      '推荐管径（公称外径）',
      r.recommendedOd !== null ? `Φ${r.recommendedOd}` : '超出常用管径',
      'mm',
      { highlight: true },
    ),
    res('fillRate', '实际填充率', r.fillRate, '%'),
    res('allowance', '填充率允许上限', r.allowance * 100, '%', { copyable: false }),
    res('bundleDia', '线束外径', r.bundleDia, 'mm'),
    res('minConduitId', '所需最小管内径', r.minConduitId, 'mm'),
    res('fillOk', '填充率校核', r.fillOk ? '满足 ✅' : '不满足 ❌', '', { copyable: false }),
    res('minDiaOk', '内径≥1.5×线束外径', r.minDiaOk ? '满足 ✅' : '不满足 ❌', '', {
      copyable: false,
    }),
    res('compliant', '综合结论', r.compliant ? '可穿线 ✅' : '需加大管径 ❌', '', { copyable: false }),
  ];
}

/** D5 穿线管管径选择 */
export default function Conduit({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView
      toolId={tool.id}
      fields={fields}
      run={run}
      quickRefIds={['water.installLimits']}
    />
  );
}
