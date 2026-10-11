import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { powerCurrent, type CircuitPhase } from '@/lib/calc/waterPower';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'mode',
    label: '换算方向',
    type: 'select',
    default: 'powerToCurrent',
    options: [
      { label: '功率 → 电流', value: 'powerToCurrent' },
      { label: '电流 → 功率', value: 'currentToPower' },
    ],
  },
  {
    key: 'phase',
    label: '相制',
    type: 'select',
    default: 'three',
    options: [
      { label: '三相（380V）', value: 'three' },
      { label: '单相（220V）', value: 'single' },
    ],
  },
  { key: 'voltage', label: '电压', type: 'number', default: 380, min: 0, unit: 'V' },
  { key: 'cosPhi', label: '功率因数 cosφ', type: 'number', default: 0.85, min: 0.1, max: 1, step: 0.01 },
  { key: 'powerKw', label: '功率（功率→电流）', type: 'number', default: 15, min: 0, unit: 'kW' },
  { key: 'currentA', label: '电流（电流→功率）', type: 'number', default: 30, min: 0, unit: 'A' },
];

function run(v: Record<string, string>): CalcResult[] {
  const mode = str(v, 'mode', 'powerToCurrent');
  const phase = str(v, 'phase', 'three') as CircuitPhase;
  const r = powerCurrent({
    mode: mode === 'currentToPower' ? 'currentToPower' : 'powerToCurrent',
    phase,
    voltage: num(v, 'voltage', phase === 'three' ? 380 : 220),
    cosPhi: num(v, 'cosPhi', 0.85),
    powerKw: num(v, 'powerKw', 0),
    currentA: num(v, 'currentA', 0),
  });
  return [
    res('powerKw', '有功功率 P', r.powerKw, 'kW', { highlight: true }),
    res('currentA', '电流 I', r.currentA, 'A', { highlight: true }),
    res('apparentKva', '视在功率 S', r.apparentKva, 'kVA'),
    res('powerFactor', '功率因数 cosφ', r.powerFactor, '', { copyable: false }),
  ];
}

/** D2 单相 / 三相 功率电流换算 */
export default function PowerCurrent({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
