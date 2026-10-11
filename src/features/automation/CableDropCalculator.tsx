import CalculatorView from '@/features/shared/CalculatorView';
import { bool, num, res, str } from '@/features/shared/calcHelpers';
import {
  cableVoltageDrop,
  maxLengthForDrop,
  type CircuitPhase,
  type ConductorMaterial,
} from '@/lib/calc/cableDrop';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'current', label: '负载电流', type: 'number', default: 32, min: 0, unit: 'A' },
  { key: 'length', label: '线缆长度（单程）', type: 'number', default: 100, min: 0, unit: 'm' },
  { key: 'section', label: '导体截面', type: 'number', default: 6, min: 0, step: 0.5, unit: 'mm²' },
  {
    key: 'material',
    label: '材质',
    type: 'select',
    default: 'copper',
    options: [
      { label: '铜（ρ≈0.0175）', value: 'copper' },
      { label: '铝（ρ≈0.0282）', value: 'aluminum' },
    ],
  },
  {
    key: 'phase',
    label: '相制',
    type: 'select',
    default: 'three',
    options: [
      { label: '三相', value: 'three' },
      { label: '单相', value: 'single' },
    ],
  },
  { key: 'voltage', label: '系统电压', type: 'number', default: 380, min: 0, unit: 'V' },
  {
    key: 'lighting',
    label: '回路类型',
    type: 'select',
    default: '0',
    options: [
      { label: '动力（≤5%）', value: '0' },
      { label: '照明（≤3%）', value: '1' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const input = {
    current: num(v, 'current'),
    length: num(v, 'length'),
    section: num(v, 'section'),
    material: str(v, 'material', 'copper') as ConductorMaterial,
    phase: str(v, 'phase', 'three') as CircuitPhase,
    voltage: num(v, 'voltage', 380),
    lighting: bool(v, 'lighting'),
  };
  const r = cableVoltageDrop(input);
  const maxLen = maxLengthForDrop(input, r.limit);
  return [
    res('percent', '电压降百分比', r.percent, '%', { highlight: true }),
    res('deltaV', '电压降', r.deltaV, 'V'),
    res('limit', '限值', r.limit, '%', { copyable: false }),
    res('compliant', '是否合规', r.compliant ? '合规 ✅' : '超限 ❌', '', { copyable: false }),
    res('maxLength', `满足 ${r.limit}% 的最大长度`, Math.floor(maxLen), 'm'),
  ];
}

/** C10 电缆选型与电压降计算 */
export default function CableDropCalculator({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
