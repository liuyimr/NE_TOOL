import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { coolingTower } from '@/lib/calc/coolingTower';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'coolingLoadKw', label: '制冷量', type: 'number', default: 500, min: 0, unit: 'kW' },
  {
    key: 'heatRejectionFactor',
    label: '冷凝热倍率',
    type: 'number',
    default: 1.25,
    min: 0,
    step: 0.05,
    help: '冷凝热 ≈ 制冷量 + 压缩机功，方案阶段经验值 1.2~1.3',
  },
  { key: 'deltaT', label: '冷却水温差 Δt', type: 'number', default: 5, min: 0.1, step: 0.5, unit: '℃' },
  { key: 'driftRatio', label: '漂水率', type: 'number', default: 0.0005, min: 0, step: 0.0001 },
  { key: 'cycles', label: '浓缩倍数 N', type: 'number', default: 4, min: 1.01, step: 0.5 },
  { key: 'approach', label: '逼近度', type: 'number', default: 4, min: 0, step: 0.5, unit: '℃' },
  { key: 'wetBulb', label: '湿球温度', type: 'number', default: 28, min: 0, step: 0.5, unit: '℃' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = coolingTower({
    coolingLoadKw: num(v, 'coolingLoadKw'),
    heatRejectionFactor: num(v, 'heatRejectionFactor', 1.25),
    deltaT: num(v, 'deltaT', 5),
    driftRatio: num(v, 'driftRatio', 0.0005),
    cycles: num(v, 'cycles', 4),
    approach: num(v, 'approach', 4),
    wetBulb: num(v, 'wetBulb', 28),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('qcKw', '冷凝热 Qc', r.qcKw, 'kW'),
    res('flowM3h', '冷却水量', r.flowM3h, 'm³/h', { highlight: true }),
    res(
      'recommendedFlowM3h',
      '推荐标称水量档',
      r.recommendedFlowM3h ?? '超出常用档位',
      r.recommendedFlowM3h === null ? '' : 'm³/h',
      { highlight: true },
    ),
    res('evapM3h', '蒸发损失', r.evapM3h, 'm³/h'),
    res('driftM3h', '漂水损失', r.driftM3h, 'm³/h'),
    res('blowdownM3h', '排污损失', r.blowdownM3h, 'm³/h'),
    res('makeupM3h', '补水量', r.makeupM3h, 'm³/h', { highlight: true }),
    res('rtNominal', '名义冷吨', r.rtNominal, 'RT'),
    res('waterTons', '「水吨」', r.waterTons, '水吨'),
    res('outletTempC', '冷却水出水温度', r.outletTempC, '℃'),
    res('inletTempC', '冷却水进水温度', r.inletTempC, '℃'),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** H18 冷却塔选型与冷却水量 */
export default function CoolingTower({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
