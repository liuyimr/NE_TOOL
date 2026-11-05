import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { illuminanceCalc } from '@/lib/calc/illuminance';
import FixtureCount from '@/features/building/FixtureCount';
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

/** 照度计算（流明法 / 利用系数法，下方内嵌原「灯具数量估算」） */
export default function IlluminanceCalc({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <CalculatorView
        toolId={tool.id}
        fields={fields}
        run={run}
        quickRefIds={['building.illuminance']}
      />
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-fg">灯具数量快速估算</h2>
        <p className="px-1 text-xs text-muted">
          只输入面积与照度标准，快速估算灯具数量与功率密度（原「灯具数量估算」已并入本页）。
        </p>
        <FixtureCount tool={tool} />
      </section>
    </div>
  );
}
