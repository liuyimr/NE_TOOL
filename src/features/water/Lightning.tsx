import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { lightningProtection, type ProtectionClass } from '@/lib/calc/waterLightning';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'protectionClass',
    label: '防雷类别',
    type: 'select',
    default: 'III',
    options: [
      { label: '一类（h_r=30m）', value: 'I' },
      { label: '二类（h_r=45m）', value: 'II' },
      { label: '三类（h_r=60m）', value: 'III' },
    ],
  },
  { key: 'rodHeight', label: '接闪杆高度 h', type: 'number', default: 10, min: 0, step: 0.5, unit: 'm' },
  {
    key: 'protectedHeight',
    label: '被保护物高度 h_x',
    type: 'number',
    default: 0,
    min: 0,
    step: 0.5,
    unit: 'm',
  },
  { key: 'perimeter', label: '建筑物周长（可选）', type: 'number', default: 0, min: 0, unit: 'm' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = lightningProtection({
    rodHeight: num(v, 'rodHeight'),
    protectedHeight: num(v, 'protectedHeight', 0),
    protectionClass: str(v, 'protectionClass', 'III') as ProtectionClass,
    perimeter: num(v, 'perimeter', 0),
  });
  const results: CalcResult[] = [
    res('protectedRadius', `h_x=${r.protectedHeight}m 处保护半径 r_x`, r.protectedRadius, 'm', {
      highlight: true,
    }),
    res('groundRadius', '地面保护半径 r', r.groundRadius, 'm', { highlight: true }),
    res('rollingSphere', '滚球半径 h_r', r.rollingSphere, 'm', { copyable: false }),
    res('effectiveHeight', '接闪杆有效高度', r.effectiveHeight, 'm', { copyable: false }),
    res('maxSpacing', '引下线最大间距', r.maxSpacing, 'm', { copyable: false }),
  ];
  if (r.downLeaders > 0) {
    results.push(res('downLeaders', '所需引下线根数（估算）', r.downLeaders, '根', { highlight: true }));
  }
  return results;
}

/** D15 防雷保护范围（滚球法） */
export default function Lightning({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
