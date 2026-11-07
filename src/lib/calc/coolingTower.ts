/**
 * H18 · 冷却塔选型与冷却水量（纯函数）
 * ------------------------------------------------------------------
 * 公式：
 *   Qc          = coolingLoadKw × heatRejectionFactor        冷凝热（kW）
 *   flowM3h     = Qc × 0.86 / deltaT                          冷却水量（m³/h）
 *   evapM3h     = Qc × 3600 / (2430 × 1000)                   蒸发损失（m³/h）
 *   driftM3h    = flowM3h × driftRatio                        漂水损失（m³/h）
 *   blowdownM3h = max(0, evapM3h/(cycles−1) − driftM3h)       排污损失（m³/h）
 *   makeupM3h   = evapM3h + driftM3h + blowdownM3h            补水量（m³/h）
 *                ≡ evapM3h × N/(N−1)（当 blowdown > 0 时恒等）
 *   rtNominal   = Qc / 3.517                                  名义冷吨（RT）
 *   waterTons   = flowM3h                                      「水吨」
 *   outletTempC = wetBulb + approach                           冷却水出水温度（℃）
 *   inletTempC  = outletTempC + deltaT                         冷却水进水温度（℃）
 *
 * 常量来源与口径：
 *   heatRejectionFactor（默认 1.25）：冷凝热 ≈ 制冷量 + 压缩机输入功，电动压缩式
 *                    冷水机组方案阶段经验倍率常用 1.2~1.3；吸收式/热泵工况不同，
 *                    须按主机样本 COP 修正（Qc = Qe·(1 + 1/COP)）。
 *   0.86：沿用项目 WATER_FLOW_COEF 口径，源于 3600/(4.187×1000) = 0.85999，
 *         其中 4.187 kJ/(kg·℃) 为水的比热容、1000 kg/m³ 为水密度、3600 s/h；
 *         取整为 0.86（Q[kW]·0.86/Δt[℃] → m³/h）。
 *   2430 kJ/kg：常温（约 20~30℃）水汽化潜热 r 的工程近似值（100℃ 时为
 *               2257 kJ/kg，冷却塔工况下取 2430 左右）；3600 为 s/h，
 *               /1000 由 kg/h 折算为 m³/h（ρ ≈ 1000 kg/m³）。
 *   driftRatio（默认 0.0005 = 0.05%）：带高效除水器的机械通风冷却塔漂水率
 *               经验中值，老式塔可达 0.1%~0.2%，以厂家样本为准。
 *   cycles（默认 4）：循环水浓缩倍数 N，由盐量平衡 Q_排 = Q_蒸/(N−1) − Q_漂；
 *               N 越小排污越大，N > 1 才有效（除零保护）。
 *   3.517 kW：1 美制冷吨（USRT）= 3.517 kW（= 12000 BTU/h）换算系数。
 *   「水吨」：国内冷却塔行业习惯以 1 水吨 ≈ 1 m³/h 标称（对应 Δt = 5℃ 的
 *              常规工况），不同厂家吨位定义不同，以样本为准。
 *   37/32℃：GB/T 7190 及行业常规标准工况（进水 37℃ / 出水 32℃ / 湿球 28℃）；
 *              inletTempC > 37℃ 时须按厂家高温工况修正塔型与填料。
 *   approach（默认 4℃）、wetBulb（默认 28℃）：常规标准工况取值。
 *   TOWER_FLOW_SERIES：常见冷却塔标称水量档位（m³/h），行业样本中值。
 *
 * 边界：coolingLoadKw ≤ 0、deltaT ≤ 0、cycles ≤ 1、任一系数非有限或为负
 *       → valid=false；结果溢出返回 valid=false。
 */

/** 冷却水流量系数 0.86 = 3600/(4.187×1000)，与项目 WATER_FLOW_COEF 同口径 */
export const TOWER_FLOW_COEF = 0.86;
/** 常温水汽化潜热近似（kJ/kg） */
export const VAPORIZATION_HEAT_KJ_KG = 2430;
/** 1 美制冷吨对应的 kW */
export const KW_PER_RT = 3.517;
/** 常见冷却塔标称水量档位（m³/h） */
export const TOWER_FLOW_SERIES: number[] = [
  8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150, 200, 250, 300, 400, 500, 600, 800, 1000,
];

export interface CoolingTowerInput {
  /** 制冷量（kW），默认 500 */
  coolingLoadKw: number;
  /** 冷凝热倍率（默认 1.25） */
  heatRejectionFactor: number;
  /** 冷却水温差 Δt（℃），默认 5 */
  deltaT: number;
  /** 漂水率（默认 0.0005） */
  driftRatio: number;
  /** 浓缩倍数 N（默认 4，须 > 1） */
  cycles: number;
  /** 逼近度（℃），默认 4 */
  approach: number;
  /** 湿球温度（℃），默认 28 */
  wetBulb: number;
}

export interface CoolingTowerResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（吨位口径与工况修正） */
  note: string;
  /** 冷凝热（kW） */
  qcKw: number;
  /** 冷却水量（m³/h） */
  flowM3h: number;
  /** 蒸发损失（m³/h） */
  evapM3h: number;
  /** 漂水损失（m³/h） */
  driftM3h: number;
  /** 排污损失（m³/h） */
  blowdownM3h: number;
  /** 补水量（m³/h） */
  makeupM3h: number;
  /** 首个 ≥ flowM3h 的标称水量档（m³/h）；超出序列为 null */
  recommendedFlowM3h: number | null;
  /** 名义冷吨（RT） */
  rtNominal: number;
  /** 「水吨」（≈ m³/h） */
  waterTons: number;
  /** 冷却水出水温度（℃） */
  outletTempC: number;
  /** 冷却水进水温度（℃） */
  inletTempC: number;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数或 null */
function invalidResult(note: string): CoolingTowerResult {
  return {
    valid: false,
    note,
    qcKw: 0,
    flowM3h: 0,
    evapM3h: 0,
    driftM3h: 0,
    blowdownM3h: 0,
    makeupM3h: 0,
    recommendedFlowM3h: null,
    rtNominal: 0,
    waterTons: 0,
    outletTempC: 0,
    inletTempC: 0,
  };
}

/**
 * 冷却塔选型与冷却水量计算
 * @param input 输入参数
 */
export function coolingTower(input: CoolingTowerInput): CoolingTowerResult {
  const values = [
    input.coolingLoadKw,
    input.heatRejectionFactor,
    input.deltaT,
    input.driftRatio,
    input.cycles,
    input.approach,
    input.wetBulb,
  ];
  if (!values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return invalidResult('所有输入必须为有限数值');
  }
  if (
    input.coolingLoadKw <= 0 ||
    input.deltaT <= 0 ||
    input.cycles <= 1 ||
    input.heatRejectionFactor < 0 ||
    input.driftRatio < 0 ||
    input.approach < 0 ||
    input.wetBulb < 0
  ) {
    return invalidResult('制冷量与冷却水温差须大于 0，浓缩倍数须大于 1，各系数须非负');
  }

  const qcKw = input.coolingLoadKw * input.heatRejectionFactor;
  const flowM3h = (qcKw * TOWER_FLOW_COEF) / input.deltaT;
  const evapM3h = (qcKw * 3600) / (VAPORIZATION_HEAT_KJ_KG * 1000);
  const driftM3h = flowM3h * input.driftRatio;
  const blowdownM3h = Math.max(0, evapM3h / (input.cycles - 1) - driftM3h);
  const makeupM3h = evapM3h + driftM3h + blowdownM3h;
  const recommendedFlowM3h = TOWER_FLOW_SERIES.find((f) => f >= flowM3h) ?? null;
  const rtNominal = qcKw / KW_PER_RT;
  const waterTons = flowM3h;
  const outletTempC = input.wetBulb + input.approach;
  const inletTempC = outletTempC + input.deltaT;

  const outputs = [
    qcKw,
    flowM3h,
    evapM3h,
    driftM3h,
    blowdownM3h,
    makeupM3h,
    rtNominal,
    waterTons,
    outletTempC,
    inletTempC,
  ];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请缩小制冷量或放大温差');
  }

  const notes: string[] = [
    `冷凝热按制冷量 × ${input.heatRejectionFactor} 估算（方案阶段经验倍率，须按主机 COP 修正）；蒸发/排污/补水按浓缩倍数 N=${input.cycles} 的盐量平衡计算`,
    `「水吨」按 1 水吨 ≈ 1 m³/h（Δt=5℃ 常规工况）给出，仅为行业习惯标称；不同厂家吨位定义不同，以样本为准`,
  ];
  if (inletTempC > 37) {
    notes.push(
      `进水温度 ${inletTempC}℃ 超过常规 37/32℃ 标准工况（湿球 28℃），需按厂家高温工况修正塔型、填料与风量`,
    );
  }
  if (recommendedFlowM3h === null) {
    notes.push('所需水量超出常用标称档位，需多台并联或按厂家定制');
  }

  return {
    valid: true,
    note: notes.join('；'),
    qcKw,
    flowM3h,
    evapM3h,
    driftM3h,
    blowdownM3h,
    makeupM3h,
    recommendedFlowM3h,
    rtNominal,
    waterTons,
    outletTempC,
    inletTempC,
  };
}
