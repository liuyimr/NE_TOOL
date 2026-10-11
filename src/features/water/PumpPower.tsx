import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { pumpPower } from '@/lib/calc/waterPump';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'flow', label: '流量 Q', type: 'number', default: 20, min: 0, unit: 'm³/h' },
  { key: 'head', label: '扬程 H', type: 'number', default: 40, min: 0, unit: 'm' },
  { key: 'efficiency', label: '水泵效率 η', type: 'number', default: 0.7, min: 0.1, max: 1, step: 0.01 },
  { key: 'margin', label: '电机裕量系数', type: 'number', default: 1.15, min: 1, step: 0.05 },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = pumpPower({
    flow: num(v, 'flow'),
    head: num(v, 'head'),
    efficiency: num(v, 'efficiency', 0.7),
    margin: num(v, 'margin', 1.15),
  });
  return [
    res('shaftPowerKw', '水泵轴功率 P', r.shaftPowerKw, 'kW', { highlight: true }),
    res('motorPowerKw', '建议配套功率', r.motorPowerKw, 'kW', { highlight: true }),
    res(
      'standardMotorKw',
      '就近标准电机功率',
      r.standardMotorKw !== null ? `${r.standardMotorKw} kW` : '超出常用档',
      '',
      { copyable: false },
    ),
    res('efficiency', '采用效率 η', r.efficiency, '', { copyable: false }),
    res('flow', '流量', r.flow, 'm³/h', { copyable: false }),
    res('head', '扬程', r.head, 'm', { copyable: false }),
  ];
}

/** D10 水泵选型与轴功率计算 */
export default function PumpPower({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
