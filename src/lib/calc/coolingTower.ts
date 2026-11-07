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
 *   rtNominal   = coolingLoadKw / 3.517                       名义冷吨（RT，按制冷量口径）
 *   waterTons   = flowM3h                                      「水吨」（行业俗称）
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
 *   driftRatio（默认 0.0001 = 0.01%）：GB/T 7190.1-2018 限值 ≤0.010% 的保守取值，
 *               非高效除水器中值；高效收水器 0.005%~0.01%，老旧塔可达 0.1% 以上，
 *               以厂家样本为准。
 *   cycles（默认 4）：循环水浓缩倍数 N，由盐量平衡 Q_排 = Q_蒸/(N−1) − Q_漂；
 *               N 越小排污越大，N > 1 才有效（除零保护）。工程常用 3~5，
 *               取决于补水硬度/碱度与水处理方案。
 *   3.517 kW：1 美制冷吨（USRT）= 3.517 kW（= 12000 BTU/h）换算系数；
 *               rtNominal 按「制冷量 / 3.517」计算，与主机铭牌 RT 对齐；
 *               日制冷吨 3.861 kW 勿混用；冷却塔行业「排热冷吨」≈
 *               3.517×1.25 = 4.39625 kW，与本项不是同一口径。
 *   「水吨」：国内冷却塔行业习惯以 1 水吨 ≈ 1 m³/h 标称（对应 Δt = 5℃ 的
 *              常规工况），属行业俗称；不同厂家吨位定义及冷吨↔水吨换算差异
 *              可达 ±30%，禁止用于精确选型与采购。
 *   37/32℃：GB/T 7190.1-2018 标准工况 I（进水 37℃ / 出水 32℃ / 湿球 28℃ /
 *              Δt=5℃ / 逼近度 4℃ / 干球 31.5℃）；另有标准工况 II（43/33℃、
 *              Δt=10℃）。进水 >37℃ 或 Δt>5℃ 须按厂家高温工况修正塔型与填料。
 *   approach（默认 4℃）、wetBulb（默认 28℃）：标准工况 I 取值，按当地夏季
 *              设计湿球温度与厂家热力性能曲线换算到标准工况。
 *   TOWER_FLOW_SERIES：常见冷却塔标称水量档位（m³/h，标准工况 I 名义档），
 *              行业样本中值；标准工况 II 不能直接套用本表。
 *
 * 边界：coolingLoadKw ≤ 0、deltaT ≤ 0、cycles ≤ 1、任一系数非有限或为负
 *       → valid=false；结果溢出返回 valid=false。
 */

/** 冷却水流量系数 0.86 = 3600/(4.187×1000)，与项目 WATER_FLOW_COEF 同口径 */
export const TOWER_FLOW_COEF = 0.86;
/** 常温水汽化潜热近似（kJ/kg） */
export const VAPORIZATION_HEAT_KJ_KG = 2430;
/** 1 美制冷吨对应的 kW（按制冷量口径） */
export const KW_PER_RT = 3.517;
/** 常见冷却塔标称水量档位（m³/h，标准工况 I 名义档） */
export const TOWER_FLOW_SERIES: number[] = [
  8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150, 200, 250, 300, 400, 500, 600, 800, 1000,
];

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

export interface CoolingTowerInput {
  /** 制冷量（kW），默认 500 */
  coolingLoadKw: number;
  /** 冷凝热倍率（默认 1.25） */
  heatRejectionFactor: number;
  /** 冷却水温差 Δt（℃），默认 5 */
  deltaT: number;
  /** 漂水率（默认 0.0001） */
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
  /** 名义冷吨（RT，按制冷量 / 3.517 kW，与主机铭牌一致） */
  rtNominal: number;
  /** 「水吨」（≈ m³/h，行业俗称） */
  waterTons: number;
  /** 冷却水出水温度（℃） */
  outletTempC: number;
  /** 冷却水进水温度（℃） */
  inletTempC: number;
  /** 盐量平衡是否成立（bRaw = E/(N−1) − D 是否 > 0） */
  saltBalanceHolds: boolean;
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
    saltBalanceHolds: false,
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
  const bRaw = evapM3h / (input.cycles - 1) - driftM3h;
  const blowdownM3h = Math.max(0, bRaw);
  const saltBalanceHolds = bRaw > 0;
  const makeupM3h = evapM3h + driftM3h + blowdownM3h;
  const recommendedFlowM3h = TOWER_FLOW_SERIES.find((f) => f >= flowM3h) ?? null;
  const rtNominal = input.coolingLoadKw / KW_PER_RT;
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
    `「水吨」为行业俗称，本工具按 1 水吨 ≈ 1 m³/h 给出；不同厂家吨位定义不同，以样本为准，且冷吨↔水吨换算差异可达 ±30%，禁止用于精确选型与采购，须以厂家样本的名义冷却水流量（m³/h）与热力性能曲线为准。名义冷吨按制冷量 / 3.517 kW 计算，与主机铭牌 RT 对齐，不代表冷却塔标称吨位。`,
  ];
  if (inletTempC > 37 || input.deltaT > 5 || Math.abs(input.wetBulb - 28) > 0.5) {
    notes.push(
      '本工具按 GB/T 7190.1-2018 标准工况 I（37/32℃、湿球 28℃、Δt=5℃、逼近度 4℃、干球 31.5℃）估算。进水温度 >37℃ 或 Δt >5℃ 进入高温/大温差工况（标准工况 II：43/33℃、Δt=10℃），塔型、填料与风量须按厂家高温工况样本修正，标称水量档（m³/h）不可直接套用；实际选型应按当地夏季湿球温度与厂家热力性能曲线换算到标准工况。',
    );
  }
  if (!saltBalanceHolds) {
    notes.push(
      `漂水率过大或浓缩倍数过高：排污量已被限制为 0，设定浓缩倍数 N=${input.cycles} 无法维持，补水按 M=E+D 计算且实际浓缩倍数低于设定值；请降低漂水率、下调 N 或加大排污`,
    );
  }
  if (recommendedFlowM3h === null) {
    notes.push('所需水量超出常用标称档位，需多台并联或按厂家定制');
  }
  notes.push(GENERAL_DISCLAIMER);

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
    saltBalanceHolds,
  };
}
