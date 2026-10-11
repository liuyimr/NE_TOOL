import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { illuminanceCalc } from '@/lib/calc/illuminance';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'area', label: '房间面积', type: 'number', default: 100, min: 0, unit: 'm²' },
  { key: 'targetLux', label: '目标照度', type: 'number', default: 300, min: 0, unit: 'lx' },
  { key: 'lumens', label: '单灯光通量', type: 'number', default: 3000, min: 0, unit: 'lm' },
  { key: 'utilization', label: '利用系数 U', type: 'number', default: 0.7, step: 0.05 },
  { key: 'maintenance', label: '维护系数 K', type: 'number', default: 0.8, step: 0.05 },
  { key: 'fixtures', label: '实际灯具数量', type: 'number', default: 20, min: 0, unit: '套' },
  { key: 'wattPerLamp', label: '单灯功率', type: 'number', default: 36, min: 0, unit: 'W' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = illuminanceCalc({
    area: num(v, 'area'),
    targetLux: num(v, 'targetLux'),
    lumens: num(v, 'lumens'),
    utilization: num(v, 'utilization', 0.7),
    maintenance: num(v, 'maintenance', 0.8),
    fixtures: num(v, 'fixtures'),
    wattPerLamp: num(v, 'wattPerLamp'),
  });
  return [
    res('required', '所需灯具数量', r.requiredFixtures, '套', { highlight: true }),
    res('lux', '实际平均照度', r.averageLux, 'lx'),
    res('powerDensity', '功率密度', r.powerDensity, 'W/m²'),
  ];
}

/** B10 照度计算（流明法 / 利用系数法） */
export default function IlluminanceCalc({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView
      toolId={tool.id}
      fields={fields}
      run={run}
      quickRefIds={['building.illuminance']}
    />
  );
}
