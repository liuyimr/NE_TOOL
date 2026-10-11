import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { drainSlope, DRAIN_TABLE } from '@/lib/calc/waterDrain';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'dn',
    label: '公称直径 DN',
    type: 'select',
    default: '100',
    options: DRAIN_TABLE.map((s) => ({ label: `DN${s.dn}`, value: String(s.dn) })),
  },
  {
    key: 'actualSlope',
    label: '实际坡度',
    type: 'number',
    default: 0.02,
    min: 0,
    step: 0.001,
    help: '小数形式，如 0.02 表示 2%（20‰）',
  },
  { key: 'length', label: '横管长度（可选）', type: 'number', default: 0, min: 0, unit: 'm' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = drainSlope({
    dn: num(v, 'dn', 100),
    actualSlope: num(v, 'actualSlope'),
    length: num(v, 'length', 0),
  });
  if (!r.spec) {
    return [res('error', '错误', '该管径不在标准表内（DN50~DN200）', '', { copyable: false })];
  }
  return [
    res('compliant', '坡度校核', r.compliant ? '满足最小坡度 ✅' : '低于最小坡度 ❌', '', {
      highlight: true,
      copyable: false,
    }),
    res('standardSlope', '标准坡度', r.spec.standardSlope, '', { copyable: false }),
    res('minSlope', '最小坡度', r.spec.minSlope, '', { copyable: false }),
    res('maxFill', '最大计算充满度', r.spec.maxFill, '', { copyable: false }),
    res('actualSlope', '实际坡度（‰）', r.perMille, '‰'),
    res('meetsStandard', '是否达标准坡度', r.meetsStandard ? '达到 ✅' : '未达标准（≥最小即可）', '', {
      copyable: false,
    }),
    res('dropMm', '横管两端高差', r.dropMm, 'mm'),
  ];
}

/** D11 排水管径与坡度校核 */
export default function DrainSlope({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView
      toolId={tool.id}
      fields={fields}
      run={run}
      quickRefIds={['water.drainSlope']}
    />
  );
}
