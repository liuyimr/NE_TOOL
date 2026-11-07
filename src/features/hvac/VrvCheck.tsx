import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { vrvCheck } from '@/lib/calc/vrvCheck';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'indoorTotalKw', label: '内机总容量', type: 'number', default: 60, min: 0, step: 0.5, unit: 'kW' },
  {
    key: 'outdoorKw',
    label: '外机容量',
    type: 'number',
    default: 56,
    min: 0.1,
    step: 0.5,
    unit: 'kW',
    help: '按外机名义制冷量填写（组合系统为各模块之和）',
  },
  {
    key: 'pipeLengthM',
    label: '实际配管长度',
    type: 'number',
    default: 80,
    min: 0,
    step: 1,
    unit: 'm',
    help: '液管等效长度（各分支配件按厂家换算表折算成等效长度后累加）',
  },
  {
    key: 'referenceLengthM',
    label: '配管基准长度',
    type: 'number',
    default: 5,
    min: 0,
    step: 0.5,
    unit: 'm',
    help: '厂家性能表的基准配管长度，常见 5 m 或 7.5 m',
  },
  { key: 'heightDiffM', label: '室内外机高差', type: 'number', default: 20, min: 0, step: 1, unit: 'm' },
  {
    key: 'heightReferenceM',
    label: '高差基准',
    type: 'number',
    default: 10,
    min: 0,
    step: 1,
    unit: 'm',
    help: '超出该高差才开始折减；样本不给基准时填 0',
  },
  {
    key: 'lengthCorrectionPerM',
    label: '每米管长衰减率',
    type: 'number',
    default: 0.003,
    min: 0,
    step: 0.0005,
    help: '小数/米，0.003 即 0.3%/m（方案阶段经验值，须按样本分档表插值）',
  },
  {
    key: 'heightCorrectionPerM',
    label: '每米高差衰减率',
    type: 'number',
    default: 0.001,
    min: 0,
    step: 0.0005,
    help: '小数/米，0.001 即 0.1%/m（方案阶段经验值）',
  },
  { key: 'ratioMin', label: '允许配比下界', type: 'number', default: 0.5, min: 0.01, step: 0.05 },
  { key: 'ratioMax', label: '允许配比上界', type: 'number', default: 1.3, min: 0.01, step: 0.05 },
  {
    key: 'maxPipeLengthM',
    label: '配管总长上限',
    type: 'number',
    default: 165,
    min: 1,
    step: 5,
    unit: 'm',
    help: '随机型不同（常见 100~165 m），须按样本',
  },
  {
    key: 'maxHeightDiffM',
    label: '高差上限',
    type: 'number',
    default: 50,
    min: 0,
    step: 5,
    unit: 'm',
    help: '随机型不同（常见 30~50 m），且内外机高差方向另有分项限制',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = vrvCheck({
    indoorTotalKw: num(v, 'indoorTotalKw', 60),
    outdoorKw: num(v, 'outdoorKw', 56),
    pipeLengthM: num(v, 'pipeLengthM', 80),
    referenceLengthM: num(v, 'referenceLengthM', 5),
    heightDiffM: num(v, 'heightDiffM', 20),
    heightReferenceM: num(v, 'heightReferenceM', 10),
    lengthCorrectionPerM: num(v, 'lengthCorrectionPerM', 0.003),
    heightCorrectionPerM: num(v, 'heightCorrectionPerM', 0.001),
    ratioMin: num(v, 'ratioMin', 0.5),
    ratioMax: num(v, 'ratioMax', 1.3),
    maxPipeLengthM: num(v, 'maxPipeLengthM', 165),
    maxHeightDiffM: num(v, 'maxHeightDiffM', 50),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('overallOk', '综合校核结论', r.overallOk ? '通过 ✅' : '不通过 ❌', '', {
      highlight: true,
      copyable: false,
    }),
    res('ratio', '室内外机容量配比', r.ratio, '', { highlight: true }),
    res('ratioOk', '配比校核', r.ratioOk ? '在允许区间 ✅' : '超出允许区间 ❌', '', {
      copyable: false,
    }),
    res('totalLossPct', '容量衰减合计', r.totalLossPct, '%', { highlight: true }),
    res('correctedCapacityKw', '修正后外机能力', r.correctedCapacityKw, 'kW', { highlight: true }),
    res('lengthLossPct', '管长衰减', r.lengthLossPct, '%'),
    res('heightLossPct', '高差衰减', r.heightLossPct, '%'),
    res('pipeOk', '配管总长校核', r.pipeOk ? '未超限 ✅' : '超限 ❌', '', { copyable: false }),
    res('heightOk', '高差校核', r.heightOk ? '未超限 ✅' : '超限 ❌', '', { copyable: false }),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** H19 VRV 多联机配比与管长校核 */
export default function VrvCheck({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
