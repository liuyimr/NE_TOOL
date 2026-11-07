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
  {
    key: 'driftRatio',
    label: '漂水率',
    type: 'number',
    default: 0.0001,
    min: 0,
    step: 0.00001,
    help: 'GB/T 7190.1-2018 限值 ≤0.010%；高效收水器 0.005%~0.01%，老旧塔可达 0.1% 以上，以厂家样本为准',
  },
  {
    key: 'cycles',
    label: '浓缩倍数 N',
    type: 'number',
    default: 4,
    min: 1.01,
    step: 0.5,
    help: '循环水浓缩倍数，工程常用 3~5，取决于补水硬度/碱度与水处理方案',
  },
  {
    key: 'approach',
    label: '逼近度',
    type: 'number',
    default: 4,
    min: 0,
    step: 0.5,
    unit: '℃',
    help: '逼近度 = 出水温度 − 湿球温度，常规 4℃',
  },
  {
    key: 'wetBulb',
    label: '湿球温度',
    type: 'number',
    default: 28,
    min: 0,
    step: 0.5,
    unit: '℃',
    help: '按当地夏季设计湿球温度取值，标准工况 I 为 28℃',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = coolingTower({
    coolingLoadKw: num(v, 'coolingLoadKw'),
    heatRejectionFactor: num(v, 'heatRejectionFactor', 1.25),
    deltaT: num(v, 'deltaT', 5),
    driftRatio: num(v, 'driftRatio', 0.0001),
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
      '推荐标称水量档（标准工况 I 名义档）',
      r.recommendedFlowM3h ?? '超出常用档位',
      r.recommendedFlowM3h === null ? '' : 'm³/h',
      { highlight: true },
    ),
    res(
      'evapM3h',
      '蒸发损失',
      r.evapM3h,
      'm³/h',
      {
        note: 'E=0.0017226·W·Δt 为夏季满负荷全潜热上限值；冬季/部分负荷部分热量靠显热散出，K 可降至 0.0010~0.0014，本式会高估蒸发与补水',
      },
    ),
    res('driftM3h', '漂水损失', r.driftM3h, 'm³/h'),
    res('blowdownM3h', '排污损失', r.blowdownM3h, 'm³/h'),
    res('makeupM3h', '补水量', r.makeupM3h, 'm³/h', { highlight: true }),
    res('rtNominal', '名义冷吨（按制冷量，与主机铭牌一致）', r.rtNominal, 'RT'),
    res('waterTons', '「水吨」（行业俗称，≈ m³/h）', r.waterTons, '水吨'),
    res('outletTempC', '冷却水出水温度', r.outletTempC, '℃'),
    res('inletTempC', '冷却水进水温度', r.inletTempC, '℃'),
    res(
      'tondisclaimer',
      '吨位口径免责',
      '「水吨」为行业俗称，不同厂家定义与冷吨↔水吨换算差异可达 ±30%，禁止用于精确选型与采购；名义冷吨按制冷量/3.517 kW 与主机铭牌对齐，不代表冷却塔标称吨位；选型以厂家样本 m³/h 与热力性能曲线为准',
      '',
      { copyable: false },
    ),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** H18 冷却塔选型与冷却水量 */
export default function CoolingTower({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
