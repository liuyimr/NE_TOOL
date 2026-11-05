import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { hvacFcuSelect, FCU_CAPACITIES } from '@/lib/calc/hvacFcu';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'loadKw', label: '房间 / 区域冷负荷', type: 'number', default: 8, min: 0, step: 0.5, unit: 'kW' },
  { key: 'units', label: '指定台数（0 = 自动）', type: 'number', default: 0, min: 0, step: 1 },
  { key: 'deltaT', label: '供回水温差', type: 'number', default: 5, min: 0, step: 0.5, unit: '℃' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = hvacFcuSelect({
    loadKw: num(v, 'loadKw'),
    units: num(v, 'units', 0),
    deltaT: num(v, 'deltaT', 5),
  });
  if (!r.valid) {
    return [res('error', '错误', '冷负荷需大于 0', '', { copyable: false })];
  }
  return [
    res(
      'modelKw',
      '匹配冷量档',
      r.modelKw !== null ? `${r.modelKw} kW` : '—',
      '',
      { highlight: true },
    ),
    res('count', '台数', r.count, '台', { highlight: true }),
    res('perUnitKw', '单台承担负荷', r.perUnitKw, 'kW'),
    res('unitWaterFlowM3h', '单台水流量', r.unitWaterFlowM3h, 'm³/h'),
    res('totalWaterFlowM3h', '总水流量', r.totalWaterFlowM3h, 'm³/h'),
    res(
      'capacity',
      '容量校核',
      r.capacityShortfall ? '容量不足 ⚠️：单台超最大档' : '满足 ✅',
      '',
      { highlight: r.capacityShortfall, copyable: false },
    ),
    res('note', '说明', `${r.note}（档位：${FCU_CAPACITIES.join(' / ')} kW）`, '', {
      copyable: false,
    }),
  ];
}

/** H15 FCU / AHU 选型速查 */
export default function FcuSelect({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
