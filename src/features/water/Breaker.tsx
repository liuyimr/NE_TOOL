import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { selectBreaker, type LoadType } from '@/lib/calc/waterBreaker';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'ib', label: '计算电流 I_b', type: 'number', default: 24, min: 0, unit: 'A' },
  { key: 'iz', label: '导线允许载流量 I_z', type: 'number', default: 32, min: 0, unit: 'A' },
  {
    key: 'loadType',
    label: '负载类型',
    type: 'select',
    default: 'general',
    options: [
      { label: '一般（C 曲线）', value: 'general' },
      { label: '照明（C 曲线）', value: 'lighting' },
      { label: '阻性（B 曲线）', value: 'resistive' },
      { label: '电机（D 曲线）', value: 'motor' },
      { label: '变压器（D 曲线）', value: 'transformer' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = selectBreaker({
    ib: num(v, 'ib'),
    iz: num(v, 'iz'),
    loadType: str(v, 'loadType', 'general') as LoadType,
  });
  return [
    res('recommendedIn', '推荐额定电流 I_n', r.recommendedIn ?? '超出常用范围', 'A', {
      highlight: true,
    }),
    res('curve', '推荐脱扣曲线', `${r.curve} 曲线`, '', { copyable: false }),
    res('i2', '约定不熔断电流 I₂', r.i2, 'A'),
    res('rangeOk', 'I_b ≤ I_n ≤ I_z', r.rangeOk ? '满足 ✅' : '不满足 ❌', '', { copyable: false }),
    res('thermalOk', 'I₂ ≤ 1.45·I_z', r.thermalOk ? '满足 ✅' : '不满足 ❌', '', { copyable: false }),
    res('compliant', '综合结论', r.compliant ? '配合合规 ✅' : '需调整 ❌', '', { copyable: false }),
  ];
}

/** D4 断路器选型与导线配合 */
export default function Breaker({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView
      toolId={tool.id}
      fields={fields}
      run={run}
      quickRefIds={['water.cableTypes']}
    />
  );
}
