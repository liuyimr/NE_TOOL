import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { hvacLoad, type HvacBuildingType } from '@/lib/calc/hvacLoad';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'area', label: '建筑面积', type: 'number', default: 1000, min: 0, unit: 'm²' },
  {
    key: 'buildingType',
    label: '建筑类型',
    type: 'select',
    default: 'office',
    options: [
      { label: '住宅', value: 'residential' },
      { label: '办公', value: 'office' },
      { label: '酒店', value: 'hotel' },
      { label: '商场', value: 'shopping' },
      { label: '医院', value: 'hospital' },
      { label: '厂房', value: 'factory' },
    ],
    help: '选择后自动带出常用冷/热指标，可手动覆盖',
  },
  { key: 'coldIndex', label: '冷指标（覆盖默认，0 用默认）', type: 'number', default: 0, min: 0, step: 5, unit: 'W/m²' },
  { key: 'heatIndex', label: '热指标（覆盖默认，0 用默认）', type: 'number', default: 0, min: 0, step: 5, unit: 'W/m²' },
  { key: 'correction', label: '修正系数', type: 'number', default: 1, min: 0.1, step: 0.05 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = hvacLoad({
    area: num(v, 'area'),
    buildingType: str(v, 'buildingType', 'office') as HvacBuildingType,
    coldIndex: num(v, 'coldIndex', 0),
    heatIndex: num(v, 'heatIndex', 0),
    correction: num(v, 'correction', 1),
  });
  if (!r.valid) {
    return [res('error', '错误', '建筑面积需大于 0', '', { copyable: false })];
  }
  return [
    res('coldKw', '冷负荷', r.coldKw, 'kW', { highlight: true }),
    res('heatKw', '热负荷', r.heatKw, 'kW', { highlight: true }),
    res('unitColdIndex', '采用冷指标', r.unitColdIndex, 'W/m²'),
    res('unitHeatIndex', '采用热指标', r.unitHeatIndex, 'W/m²'),
    res('correction', '修正系数', r.correction, '', { copyable: false }),
    res('note', '说明', '方案阶段估算，施工图需按围护结构逐项计算', '', { copyable: false }),
  ];
}

/** H11 空调冷/热负荷估算 */
export default function LoadEstimate({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
