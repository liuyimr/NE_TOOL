import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { groundingResistance, GROUNDING_TARGETS } from '@/lib/calc/waterGrounding';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'rho', label: '土壤电阻率 ρ', type: 'number', default: 100, min: 0, unit: 'Ω·m' },
  { key: 'length', label: '单根接地体长度 L', type: 'number', default: 2.5, min: 0.1, step: 0.1, unit: 'm' },
  {
    key: 'diameter',
    label: '接地体直径 d',
    type: 'number',
    default: 0.05,
    min: 0.001,
    step: 0.001,
    unit: 'm',
  },
  {
    key: 'targetR',
    label: '目标接地电阻',
    type: 'number',
    default: 4,
    min: 0.1,
    step: 0.5,
    unit: 'Ω',
    help: `常用限值：保护接地 ≤4Ω、独立接闪 ≤10Ω、防静电 ≤100Ω（参考 ${GROUNDING_TARGETS.join('/')} Ω）`,
  },
  { key: 'rods', label: '计划并联根数（可选）', type: 'number', default: 0, min: 0, step: 1 },
  { key: 'eta', label: '利用系数 η', type: 'number', default: 0.75, min: 0.1, max: 1, step: 0.05 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = groundingResistance({
    rho: num(v, 'rho'),
    length: num(v, 'length', 2.5),
    diameter: num(v, 'diameter', 0.05),
    targetR: num(v, 'targetR', 4),
    rods: num(v, 'rods', 0),
    eta: num(v, 'eta', 0.75),
  });
  return [
    res('singleR', '单根垂直接地体电阻 R₁', r.singleR, 'Ω', { highlight: true }),
    res('neededRods', '满足目标所需根数', r.neededRods, '根', { highlight: true }),
    res('achievedR', `按 ${r.plannedRods} 根可达电阻`, r.achievedR, 'Ω'),
    res('targetR', '目标接地电阻', r.targetR, 'Ω', { copyable: false }),
    res('eta', '利用系数 η', r.eta, '', { copyable: false }),
    res('compliant', '结论', r.compliant ? '达标 ✅' : '不达标，需增加接地体 ❌', '', {
      copyable: false,
    }),
  ];
}

/** D13 接地电阻与接地体数量估算 */
export default function Grounding({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
