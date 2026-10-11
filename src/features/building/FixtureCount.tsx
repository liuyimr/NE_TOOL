import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { illuminanceCalc } from '@/lib/calc/illuminance';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'area', label: '房间面积', type: 'number', default: 200, min: 0, unit: 'm²' },
  { key: 'targetLux', label: '照度标准', type: 'number', default: 300, min: 0, unit: 'lx' },
  { key: 'lumens', label: '单灯光通量', type: 'number', default: 3600, min: 0, unit: 'lm' },
  { key: 'utilization', label: '利用系数 U', type: 'number', default: 0.7, step: 0.05 },
  { key: 'maintenance', label: '维护系数 K', type: 'number', default: 0.8, step: 0.05 },
  { key: 'wattPerLamp', label: '单灯功率', type: 'number', default: 36, min: 0, unit: 'W' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = illuminanceCalc({
    area: num(v, 'area'),
    targetLux: num(v, 'targetLux'),
    lumens: num(v, 'lumens'),
    utilization: num(v, 'utilization', 0.7),
    maintenance: num(v, 'maintenance', 0.8),
    fixtures: 0,
    wattPerLamp: num(v, 'wattPerLamp'),
  });
  const powerDensity =
    r.requiredFixtures > 0 && num(v, 'area') > 0
      ? (r.requiredFixtures * num(v, 'wattPerLamp')) / num(v, 'area')
      : 0;
  return [
    res('required', '灯具数量', r.requiredFixtures, '套', { highlight: true }),
    res('powerDensity', '功率密度', powerDensity, 'W/m²'),
    res('totalPower', '总功率', r.requiredFixtures * num(v, 'wattPerLamp'), 'W'),
  ];
}

/** B11 灯具数量估算 */
export default function FixtureCount({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView
      toolId={tool.id}
      fields={fields}
      run={run}
      quickRefIds={['building.illuminance']}
    />
  );
}
