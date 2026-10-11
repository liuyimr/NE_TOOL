import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { precisionAc } from '@/lib/calc/precisionAc';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'itLoadKW', label: 'IT 设备负载', type: 'number', default: 20, min: 0, unit: 'kW' },
  { key: 'area', label: '机房面积', type: 'number', default: 50, min: 0, unit: 'm²' },
  { key: 'buildingLoad', label: '单位面积建筑负荷', type: 'number', default: 60, min: 0, unit: 'W/m²' },
  { key: 'itFactor', label: 'IT 负荷放大系数', type: 'number', default: 1.15, step: 0.05 },
  { key: 'margin', label: '安全余量', type: 'number', default: 1.1, step: 0.05 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = precisionAc({
    itLoadKW: num(v, 'itLoadKW'),
    area: num(v, 'area'),
    buildingLoadWPerM2: num(v, 'buildingLoad', 60),
    itFactor: num(v, 'itFactor', 1.15),
    margin: num(v, 'margin', 1.1),
  });
  return [
    res('totalKW', '总制冷量', r.totalKW, 'kW', { highlight: true }),
    res('btu', '总制冷量', Math.round(r.totalBTU), 'BTU/h'),
    res('rt', '折算冷吨', r.tonsRT, 'RT'),
    res('it', 'IT 冷负荷', r.itCoolingKW, 'kW'),
    res('building', '建筑冷负荷', r.buildingCoolingKW, 'kW'),
  ];
}

/** B6 精密空调制冷量估算 */
export default function PrecisionAc({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
