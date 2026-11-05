import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { hvacAirVolume, DEFAULT_FRESH_PER_PERSON, type FreshAirMode } from '@/lib/calc/hvacAirVolume';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'coolingLoadKw', label: '室内冷负荷', type: 'number', default: 120, min: 0, unit: 'kW' },
  { key: 'supplyDeltaT', label: '送风温差 Δt', type: 'number', default: 10, min: 0, step: 0.5, unit: '℃' },
  {
    key: 'freshMode',
    label: '新风口径',
    type: 'select',
    default: 'people',
    options: [
      { label: '按人数 × 人均新风量', value: 'people' },
      { label: '按换气次数 × 房间体积', value: 'ach' },
    ],
  },
  { key: 'people', label: '人数（人数口径）', type: 'number', default: 50, min: 0, step: 1 },
  { key: 'freshPerPerson', label: '人均新风量', type: 'number', default: DEFAULT_FRESH_PER_PERSON, min: 0, step: 5, unit: 'm³/(h·人)' },
  { key: 'volumeM3', label: '房间体积（换气口径）', type: 'number', default: 500, min: 0, unit: 'm³' },
  { key: 'ach', label: '换气次数（换气口径）', type: 'number', default: 2, min: 0, step: 0.5, unit: '次/h' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = hvacAirVolume({
    coolingLoadKw: num(v, 'coolingLoadKw'),
    supplyDeltaT: num(v, 'supplyDeltaT', 0),
    freshMode: str(v, 'freshMode', 'people') as FreshAirMode,
    people: num(v, 'people', 0),
    freshPerPerson: num(v, 'freshPerPerson', DEFAULT_FRESH_PER_PERSON),
    volumeM3: num(v, 'volumeM3', 0),
    ach: num(v, 'ach', 0),
  });
  if (!r.valid) {
    return [res('error', '错误', '送风温差 Δt 需大于 0；冷负荷需大于 0', '', { copyable: false })];
  }
  return [
    res('supplyM3h', '送风量', r.supplyM3h, 'm³/h', { highlight: true }),
    res('freshM3h', '新风量', r.freshM3h, 'm³/h', { highlight: true }),
    res('freshRatioPct', '新风比', r.freshRatioPct, '%'),
    res('supplyCoef', '送风系数', r.supplyCoef, 'm³·K/(h·kW)', { copyable: false }),
  ];
}

/** H12 送风量 / 新风量计算 */
export default function AirVolume({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
