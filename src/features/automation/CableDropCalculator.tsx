import CalculatorView from '@/features/shared/CalculatorView';
import { bool, num, res, str } from '@/features/shared/calcHelpers';
import {
  cableVoltageDrop,
  maxLengthForDrop,
  simpleVoltageDrop,
  type CircuitPhase,
  type ConductorMaterial,
} from '@/lib/calc/cableDrop';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'mode',
    label: '输入方式',
    type: 'select',
    default: 'current',
    options: [
      { label: '按电流（精确式）', value: 'current' },
      { label: '按功率（简化系数法）', value: 'power' },
    ],
    help: '按功率时使用 ΔU% = P·L/(C·S) 速算法，默认限值 照明 2.5% / 动力 5%',
  },
  { key: 'current', label: '负载电流', type: 'number', default: 32, min: 0, unit: 'A' },
  { key: 'power', label: '有功功率（按功率法）', type: 'number', default: 10, min: 0, unit: 'kW' },
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
      { label: '照明（≤3%，简化法 ≤2.5%）', value: '1' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const mode = str(v, 'mode', 'current');
  const material = str(v, 'material', 'copper') as ConductorMaterial;
  const phase = str(v, 'phase', 'three') as CircuitPhase;
  const lighting = bool(v, 'lighting');
  const length = num(v, 'length');
  const section = num(v, 'section');

  // 按功率输入：简化系数法 ΔU% = P·L/(C·S)
  if (mode === 'power') {
    const powerKw = num(v, 'power', 10);
    const r = simpleVoltageDrop({ powerKw, length, section, material, phase, lighting });
    const voltage = num(v, 'voltage', 380);
    const k = phase === 'three' ? Math.sqrt(3) : 1;
    const cos = 0.85;
    const equivalentCurrent = voltage > 0 ? (powerKw * 1000) / (k * voltage * cos) : 0;
    return [
      res('percent', '电压降百分比（简化法）', r.percent, '%', { highlight: true }),
      res('limit', '允许压降限值', r.limit, '%', { copyable: false }),
      res('compliant', '是否合规', r.compliant ? '合规 ✅' : '超限 ❌', '', { copyable: false }),
      res('coefficient', '系数 C', r.coefficient),
      res('equivalentCurrent', '等效电流（cosφ=0.85 估算）', equivalentCurrent, 'A'),
      res('note', '说明', '简化法 ΔU%=P·L/(C·S)，用于快速初选，精确值请切到按电流法', '', {
        copyable: false,
      }),
    ];
  }

  // 按电流输入：精确式（保持既有行为不变）
  const input = {
    current: num(v, 'current'),
    length,
    section,
    material,
    phase,
    voltage: num(v, 'voltage', 380),
    lighting,
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

/** C10 电缆选型与电压降计算（含按功率的简化系数法） */
export default function CableDropCalculator({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
