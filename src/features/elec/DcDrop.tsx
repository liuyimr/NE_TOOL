import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import {
  STANDARD_SECTIONS_MM2,
  dcDrop,
  type DcMaterial,
} from '@/lib/calc/dcDrop';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'loadCurrent',
    label: '负载电流 I',
    type: 'number',
    default: 1,
    min: 0,
    step: 0.1,
    unit: 'A',
    help: '门禁电锁单把常见 0.3~0.5A（12V/24V 磁力锁）、风阀执行器 0.2~1A，多台并联须累加',
  },
  {
    key: 'length',
    label: '线路长度（单程）',
    type: 'number',
    default: 50,
    min: 0,
    step: 1,
    unit: 'm',
    help: '只填一端到另一端的单程长度，直流的去回两倍长度已由公式计入',
  },
  {
    key: 'section',
    label: '导体截面 S',
    type: 'number',
    default: 1.0,
    min: 0,
    step: 0.25,
    unit: 'mm²',
    help: 'RVV 2×0.5 / 2×0.75 / 2×1.0 / 2×1.5 为弱电常见规格',
  },
  {
    key: 'material',
    label: '导体材质',
    type: 'select',
    default: 'copper',
    options: [
      { label: '铜（ρ = 0.0175）', value: 'copper' },
      { label: '铝（ρ = 0.0282）', value: 'aluminum' },
    ],
  },
  {
    key: 'systemV',
    label: '系统电压',
    type: 'number',
    default: 24,
    min: 0,
    step: 1,
    unit: 'V',
    help: '弱电常见 24V DC；12V 系统压降占比会翻倍，长距离更易超限',
  },
  {
    key: 'allowablePct',
    label: '允许压降',
    type: 'number',
    default: 10,
    min: 0,
    step: 1,
    unit: '%',
    help: '工程常用 10%（24V 末端 ≥21.6V）；设备手册要求更严时按其规定（如 5%）',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = dcDrop({
    currentA: num(v, 'loadCurrent', 1),
    lengthM: num(v, 'length', 50),
    sectionMm2: num(v, 'section', 1),
    material: str(v, 'material', 'copper') as DcMaterial,
    systemV: num(v, 'systemV', 24),
    allowablePct: num(v, 'allowablePct', 10),
  });

  if (!r.valid) {
    return [
      res('error', '错误', '输入无效：电流与长度不能为负，截面 / 电压 / 允许压降必须大于 0', '', {
        copyable: false,
      }),
    ];
  }

  const allowablePct = num(v, 'allowablePct', 10);
  const systemV = num(v, 'systemV', 24);

  return [
    res('pct', '压降百分比', r.pct, '%', { highlight: true }),
    res('deltaV', '压降 ΔU', r.deltaV, 'V'),
    res('endV', '末端电压', r.endV, 'V'),
    res('compliant', '压降结论', r.compliant ? '合规 ✅' : '超限 ❌', '', { copyable: false }),
    res('maxLength', `满足 ${allowablePct}% 的最大单程长度`, r.maxLengthM, 'm'),
    res('minSection', `满足 ${allowablePct}% 的最小截面`, r.minSectionMm2, 'mm²'),
    res('recommendedSection', '推荐标准截面', r.recommendedSectionMm2, 'mm²', { highlight: true }),
    res(
      'standardList',
      '可选标准截面档',
      STANDARD_SECTIONS_MM2.join(' / '),
      'mm²',
      { copyable: false },
    ),
    res(
      'judgement',
      `末端电压判据（${systemV}V × (1−${allowablePct}%)）`,
      (systemV * (1 - allowablePct / 100)).toFixed(1),
      'V',
      { copyable: false },
    ),
    res(
      'note',
      '说明',
      '直流回路 ΔU = 2·ρ·L·I/S（去回两倍长度，ρ 铜 0.0175 / 铝 0.0282 Ω·mm²/m，20℃）；门禁电锁、风阀执行器末端电压不足是最常见故障，长距离供电建议就近设 24V 电源或提高线径',
      '',
      { copyable: false },
    ),
  ];
}

/** E18 24V DC 压降与线径 */
export default function DcDrop({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
