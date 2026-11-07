import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { shortCircuit, type CableMaterial } from '@/lib/calc/shortCircuit';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'transformerKva',
    label: '变压器额定容量',
    type: 'number',
    default: 1000,
    min: 0,
    unit: 'kVA',
  },
  { key: 'ukPercent', label: '阻抗电压 uk', type: 'number', default: 6, min: 0, step: 0.1, unit: '%' },
  { key: 'voltageV', label: '低压侧线电压', type: 'number', default: 400, min: 0, unit: 'V' },
  { key: 'cableLengthM', label: '电缆长度', type: 'number', default: 0, min: 0, unit: 'm' },
  {
    key: 'cableSectionMm2',
    label: '电缆截面',
    type: 'number',
    default: 185,
    min: 0,
    unit: 'mm²',
  },
  {
    key: 'material',
    label: '导体材料',
    type: 'select',
    default: 'copper',
    options: [
      { label: '铜（ρ = 0.0175 Ω·mm²/m）', value: 'copper' },
      { label: '铝（ρ = 0.0283 Ω·mm²/m）', value: 'aluminium' },
    ],
  },
  { key: 'kappa', label: '冲击系数 κ', type: 'number', default: 1.8, min: 1, max: 2, step: 0.1 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = shortCircuit({
    transformerKva: num(v, 'transformerKva', 1000),
    ukPercent: num(v, 'ukPercent', 6),
    voltageV: num(v, 'voltageV', 400),
    cableLengthM: num(v, 'cableLengthM', 0),
    cableSectionMm2: num(v, 'cableSectionMm2', 185),
    material: str(v, 'material', 'copper') as CableMaterial,
    kappa: num(v, 'kappa', 1.8),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('ik3Ka', '三相短路电流 Ik3', r.ik3Ka, 'kA', { highlight: true }),
    res('ik1Ka', '单相短路电流 Ik1', r.ik1Ka, 'kA'),
    res('ipKa', '短路冲击电流峰值 ip', r.ipKa, 'kA'),
    res(
      'recommendedIcuKa',
      '建议断路器 Icu ≥',
      r.recommendedIcuKa ?? '超出常用档位',
      r.recommendedIcuKa === null ? '' : 'kA',
      { highlight: true },
    ),
    res('inA', '变压器额定电流 In', r.inA, 'A'),
    res('ztOhm', '变压器短路阻抗 Zt', r.ztOhm, 'Ω'),
    res('ztotOhm', '短路点总阻抗 Ztot', r.ztotOhm, 'Ω'),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** E14 短路电流估算 */
export default function ShortCircuit({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
