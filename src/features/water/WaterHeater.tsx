import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { waterHeater } from '@/lib/calc/waterHeater';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'volumeL', label: '加热水量 V', type: 'number', default: 1000, min: 0, unit: 'L' },
  { key: 'coldTemp', label: '进水温度', type: 'number', default: 10, unit: '℃' },
  { key: 'hotTemp', label: '出水温度', type: 'number', default: 60, unit: '℃' },
  { key: 'heatHours', label: '加热时间 t', type: 'number', default: 4, min: 0.1, step: 0.5, unit: 'h' },
  { key: 'efficiency', label: '加热效率 η', type: 'number', default: 0.9, min: 0.1, max: 1, step: 0.01 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = waterHeater({
    volumeL: num(v, 'volumeL'),
    coldTemp: num(v, 'coldTemp'),
    hotTemp: num(v, 'hotTemp'),
    heatHours: num(v, 'heatHours', 1),
    efficiency: num(v, 'efficiency', 0.9),
  });
  return [
    res('powerKw', '所需加热功率 P', r.powerKw, 'kW', { highlight: true }),
    res('deltaT', '温升 ΔT', r.deltaT, '℃'),
    res('energyKwh', '加热所需热量', r.energyKwh, 'kWh'),
    res('heatPerHourMJ', '每小时耗热量', r.heatPerHourMJ, 'MJ/h'),
    res('volumePerHour', '单位时间水量', r.volumePerHour, 'L/h'),
  ];
}

/** D12 热水耗热量与加热功率 */
export default function WaterHeater({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
