import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { groundingResistance, GROUNDING_TARGETS } from '@/lib/calc/waterGrounding';
import QuickRefTable from '@/components/QuickRefTable';
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
  {
    key: 'eta',
    label: '利用系数 η（0 = 按根数自动）',
    type: 'number',
    default: 0,
    min: 0,
    max: 1,
    step: 0.05,
    help: '填 0 时按根数自动取值：1 根=1、≤2 根=0.85、≤4 根=0.8、≤6 根=0.75、≤10 根=0.7、>10 根=0.65（工程经验值，随根数与间距变化，须按规范或实测复核）；填 (0,1] 则按该值计算',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = groundingResistance({
    rho: num(v, 'rho'),
    length: num(v, 'length', 2.5),
    diameter: num(v, 'diameter', 0.05),
    targetR: num(v, 'targetR', 4),
    rods: num(v, 'rods', 0),
    eta: num(v, 'eta', 0),
  });
  return [
    res('singleR', '单根垂直接地体电阻 R₁', r.singleR, 'Ω', { highlight: true }),
    res('neededRods', '满足目标所需根数', r.neededRods, '根', { highlight: true }),
    res('achievedR', `按 ${r.plannedRods} 根可达电阻`, r.achievedR, 'Ω'),
    res('targetR', '目标接地电阻', r.targetR, 'Ω', { copyable: false }),
    res('eta', '利用系数 η（实际采用）', r.eta, '', { copyable: false }),
    res('etaAuto', 'η 取值方式', r.etaAuto ? '按根数自动' : '手动指定', '', { copyable: false }),
    res('compliant', '结论', r.compliant ? '达标 ✅' : '不达标，需增加接地体 ❌', '', {
      copyable: false,
    }),
  ];
}

/**
 * 接地电阻与接地体数量估算
 * 并入原「土壤电阻率与接地电阻限值速查」（原 D14）：页脚直接展示限值速查表，
 * 计算与速查同屏，省去一次跳转。
 */
export default function Grounding({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <CalculatorView toolId={tool.id} fields={fields} run={run} />
      <QuickRefTable tableId="elec.groundingLimits" />
    </div>
  );
}
