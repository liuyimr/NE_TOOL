/**
 * N15 · LoRa 链路预算与覆盖距离（纯函数）
 * ------------------------------------------------------------------
 * 公式：
 *   rxSens          = rxSensitivityDbm ?? LORA_SENSITIVITY_DBM[sf]   接收灵敏度（dBm）
 *   budgetDb        = txPowerDbm + txGainDbi + rxGainDbi − cableLossDb − rxSens
 *                     最大允许路径损耗 MAPL（dB）
 *   usableDb        = budgetDb − fadeMarginDb                         扣除衰落余量后的可用损耗（dB）
 *   plRefDb         = 32.44 + 20·log10(freqMhz) + 20·log10(0.001)     1 m 处自由空间路径损耗（dB）
 *   maxDistanceM    = 10^((usableDb − plRefDb)/(10·envFactor))        最大通信距离（m）
 *   maxDistanceKm   = maxDistanceM / 1000                             最大通信距离（km）
 *   pathLossAt1kmDb = plRefDb + 10·envFactor·log10(1000)              1 km 处路径损耗（dB）
 *   marginAt1kmDb   = usableDb − pathLossAt1kmDb                      1 km 处剩余链路余量（dB）
 *
 * 常量与口径：
 *   32.44：自由空间损耗常数，对应 FSPL(dB) = 32.44 + 20·log10(f[MHz]) + 20·log10(d[km])；
 *          本模块以「1 m」为参考距离，故取 d = 0.001 km，20·log10(0.001) = −60 dB。
 *   LORA_SENSITIVITY_DBM：Semtech SX1276（SX1278 同族）在 BW125 kHz、CR 4/5、
 *          典型室温与良好阻抗匹配下的数据手册典型值；不同厂家模组、BW/CR 组合、
 *          晶振精度与前端滤波都会使实测值相差 2~6 dB，须按模组手册覆盖（rxSensitivityDbm）。
 *   envFactor（路径损耗指数 n）：对数距离路径损耗模型 PL(d) = PL(d0) + 10·n·log10(d/d0)，
 *          开阔 2.0~2.3 / 郊区 2.5~3.0 / 城区 3.0~3.5 / 室内 3.5~5.0；
 *          n 越大衰减越快，覆盖距离对 n 极其敏感（n 从 2.8 变 3.5 可使距离缩短一半以上）。
 *   fadeMarginDb（衰落余量）：用于吸收多径快衰落、天气与遮挡时变、人体/车辆遮挡等
 *          不可预期损耗，工程常取 8~15 dB（本项目默认 10 dB）。
 *
 * 边界：freqMhz / envFactor ≤ 0、sf 非 7~12 的整数、任一输入非有限
 *       → valid=false；结果溢出（maxDistanceM 非有限）→ valid=false。
 */

/** LoRa 接收灵敏度（dBm）：SX1276、BW125 kHz、CR 4/5 典型值，键为扩频因子 SF */
export const LORA_SENSITIVITY_DBM: Readonly<Record<number, number>> = Object.freeze({
  7: -123,
  8: -126,
  9: -129,
  10: -132,
  11: -134.5,
  12: -137,
});

/** 支持的扩频因子下界（SF7） */
export const LORA_SF_MIN = 7;
/** 支持的扩频因子上界（SF12） */
export const LORA_SF_MAX = 12;

/** 自由空间损耗常数（对应 f[MHz]、d[km] 口径） */
export const FSPL_CONST = 32.44;
/** 参考距离 1 m 对应的 km 数（0.001 km） */
export const REF_DISTANCE_KM = 0.001;

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

export interface LoraBudgetInput {
  /** 发射功率（dBm），默认 14 */
  txPowerDbm: number;
  /** 发射端天线增益（dBi），默认 2 */
  txGainDbi: number;
  /** 接收端天线增益（dBi），默认 2 */
  rxGainDbi: number;
  /** 馈线（含接头）损耗（dB），默认 0.5 */
  cableLossDb: number;
  /** 衰落余量（dB），默认 10 */
  fadeMarginDb: number;
  /** 工作频率（MHz），默认 470（CN470 频段） */
  freqMhz: number;
  /** 扩频因子 SF，7~12，默认 9 */
  sf: number;
  /** 环境衰减指数 n，默认 2.8 */
  envFactor: number;
  /** 可选：接收灵敏度覆盖值（dBm）；不填则按 SF 查表 */
  rxSensitivityDbm?: number;
}

/** 方案阶段默认参数表（显式导出便于审计，与组件字段默认值一致） */
export const LORA_BUDGET_DEFAULTS: Readonly<LoraBudgetInput> = Object.freeze({
  txPowerDbm: 14,
  txGainDbi: 2,
  rxGainDbi: 2,
  cableLossDb: 0.5,
  fadeMarginDb: 10,
  freqMhz: 470,
  sf: 9,
  envFactor: 2.8,
});

export interface LoraBudgetResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（口径与实测偏差说明） */
  note: string;
  /** 实际采用的扩频因子 */
  sf: number;
  /** 实际采用的接收灵敏度（dBm） */
  rxSensitivityDbm: number;
  /** 是否使用了用户指定的灵敏度覆盖值 */
  sensitivityOverridden: boolean;
  /** 最大允许路径损耗（dB） */
  budgetDb: number;
  /** 扣除衰落余量后的可用路径损耗（dB） */
  usableDb: number;
  /** 1 m 处参考路径损耗（dB） */
  plRefDb: number;
  /** 最大通信距离（m） */
  maxDistanceM: number;
  /** 最大通信距离（km） */
  maxDistanceKm: number;
  /** 1 km 处路径损耗（dB） */
  pathLossAt1kmDb: number;
  /** 1 km 处剩余链路余量（dB） */
  marginAt1kmDb: number;
  /** 1 km 处余量是否为正（即覆盖距离是否超过 1 km） */
  reachBeyond1km: boolean;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数 */
function invalidResult(note: string, sf: number, sens: number): LoraBudgetResult {
  return {
    valid: false,
    note,
    sf,
    rxSensitivityDbm: sens,
    sensitivityOverridden: false,
    budgetDb: 0,
    usableDb: 0,
    plRefDb: 0,
    maxDistanceM: 0,
    maxDistanceKm: 0,
    pathLossAt1kmDb: 0,
    marginAt1kmDb: 0,
    reachBeyond1km: false,
  };
}

/**
 * LoRa 链路预算与覆盖距离估算
 * @param input 输入参数
 */
export function loraBudget(input: LoraBudgetInput): LoraBudgetResult {
  const values = [
    input.txPowerDbm,
    input.txGainDbi,
    input.rxGainDbi,
    input.cableLossDb,
    input.fadeMarginDb,
    input.freqMhz,
    input.sf,
    input.envFactor,
  ];
  if (!values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return invalidResult('所有输入必须为有限数值', 0, 0);
  }

  const override = input.rxSensitivityDbm;
  const sensitivityOverridden = override !== undefined && override !== null;
  if (sensitivityOverridden && (typeof override !== 'number' || !Number.isFinite(override))) {
    return invalidResult('接收灵敏度覆盖值必须为有限数值（或留空按 SF 查表）', input.sf, 0);
  }

  if (!Number.isInteger(input.sf) || input.sf < LORA_SF_MIN || input.sf > LORA_SF_MAX) {
    return invalidResult(
      `扩频因子 SF 必须为 ${LORA_SF_MIN}~${LORA_SF_MAX} 的整数`,
      input.sf,
      0,
    );
  }
  if (input.freqMhz <= 0) {
    return invalidResult('工作频率须大于 0', input.sf, 0);
  }
  if (input.envFactor <= 0) {
    return invalidResult('环境衰减指数 n 须大于 0', input.sf, 0);
  }
  if (input.cableLossDb < 0 || input.fadeMarginDb < 0) {
    return invalidResult('馈线损耗与衰落余量须非负', input.sf, 0);
  }

  const rxSensitivityDbm = sensitivityOverridden ? (override as number) : LORA_SENSITIVITY_DBM[input.sf];
  const budgetDb =
    input.txPowerDbm + input.txGainDbi + input.rxGainDbi - input.cableLossDb - rxSensitivityDbm;
  const usableDb = budgetDb - input.fadeMarginDb;
  const plRefDb =
    FSPL_CONST + 20 * Math.log10(input.freqMhz) + 20 * Math.log10(REF_DISTANCE_KM);
  const maxDistanceM = Math.pow(10, (usableDb - plRefDb) / (10 * input.envFactor));
  const maxDistanceKm = maxDistanceM / 1000;
  const pathLossAt1kmDb = plRefDb + 10 * input.envFactor * Math.log10(1000);
  const marginAt1kmDb = usableDb - pathLossAt1kmDb;
  const reachBeyond1km = marginAt1kmDb > 0;

  const outputs = [
    rxSensitivityDbm,
    budgetDb,
    usableDb,
    plRefDb,
    maxDistanceM,
    maxDistanceKm,
    pathLossAt1kmDb,
    marginAt1kmDb,
  ];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult(
      '输入量级导致结果溢出（可用损耗过大或环境衰减指数过小），请核对功率与灵敏度取值',
      input.sf,
      rxSensitivityDbm,
    );
  }

  const notes: string[] = [
    `SF${input.sf} 接收灵敏度取 ${rxSensitivityDbm} dBm（${sensitivityOverridden ? '用户指定覆盖值' : 'SX1276 / BW125 / CR4-5 典型值'}）；最大允许路径损耗 ${budgetDb.toFixed(1)} dB，扣除衰落余量 ${input.fadeMarginDb} dB 后可用 ${usableDb.toFixed(1)} dB`,
    `按 ${input.freqMhz} MHz、1 m 参考损耗 ${plRefDb.toFixed(2)} dB、环境衰减指数 n=${input.envFactor} 的对数距离模型估算；1 km 处损耗约 ${pathLossAt1kmDb.toFixed(2)} dB`,
  ];
  if (!reachBeyond1km) {
    notes.push('1 km 处已无链路余量，理论覆盖半径不足 1 km，宜缩短距离、提高天线增益或降低 SF 传输速率要求');
  }
  if (input.envFactor < 1.5) {
    notes.push('环境衰减指数 n < 1.5，低于常见取值范围（开阔 2.0~2.3），覆盖距离会被显著高估，请按实际环境取值');
  }
  notes.push(
    '理论值，实际受地形/植被/建筑遮挡、天线高度与干扰影响，工程常按理论值 ×0.3~0.6 折算，须现场勘测',
  );
  notes.push('天线增益与馈线损耗须按实际天线、接头与线缆样本取值；SF 越大灵敏度越好但速率越低、占空比受限');
  notes.push(GENERAL_DISCLAIMER);

  return {
    valid: true,
    note: notes.join('；'),
    sf: input.sf,
    rxSensitivityDbm,
    sensitivityOverridden,
    budgetDb,
    usableDb,
    plRefDb,
    maxDistanceM,
    maxDistanceKm,
    pathLossAt1kmDb,
    marginAt1kmDb,
    reachBeyond1km,
  };
}
