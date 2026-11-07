/**
 * E15 · 无功补偿容量计算（纯函数）
 * ------------------------------------------------------------------
 * 公式（三相平衡负荷，U 为线电压）：
 *   tanφ   = sqrt(1 − cos²φ) / cosφ
 *   Qc     = max(0, P × (tanφ1 − tanφ2))                补偿容量（kvar）
 *   S前    = P / cosφ1 ； S后 = P / cosφ2                视在功率（kVA）
 *   savedKva = S前 − S后
 *   I前    = P×1000 / (√3 × U × cosφ1)                  线电流（A）
 *   I后    = P×1000 / (√3 × U × cosφ2)
 *   circuits = ceil(Qc / stepKvar)                       投切路数
 *   installedKvar = circuits × stepKvar                  实装容量（kvar）
 *   overKvar = installedKvar − Qc                        过补偿余量（kvar）
 *   负载率 = S / transformerKva × 100（transformerKva > 0 时计算，否则 null）
 *
 * 常量与口径：
 *   √3 = 1.732…，P[kW]×1000 → W，U[V] 为线电压，三相有功功率
 *        P = √3·U·I·cosφ，故 I = P×1000/(√3·U·cosφ)。
 *   cosφ2 目标功率因数（默认 0.95）：供电力率考核常规要求 ≥ 0.9~0.95；
 *        不宜追求 1.0，轻载时易过补偿向电网倒送无功。
 *   stepKvar（默认 25 kvar）：常用步长示例（非标准强制），低压并联电容器组
 *        常见 10/15/20/25/50 kvar 档，实际由控制器按循环投切/编码投切组合。
 *   transformerKva（默认 0）：变压器额定容量，仅用于负载率校核，0 = 不计算。
 *   Qc 采用基础电路关系 Qc = P(tanφ1 − tanφ2)（「补偿前/后正切差」法）；
 *        工程查表法见 GB 50052《供配电系统设计规范》与《工业与民用供配电
 *        设计手册》。未计入变压器自身无功损耗、谐波导致的电容器放大、以及
 *        串联电抗器后的实际输出容量折减。
 *
 * 边界：0 < cosφ1 ≤ 1、0 < cosφ2 ≤ 1、P > 0、U > 0、stepKvar > 0；
 *       transformerKva ≤ 0 时按 0 处理（不计算负载率）；任一输入非有限或
 *       结果溢出 → valid=false。cosφ2 ≤ cosφ1 时 valid=true 但 Qc=0。
 */

/** 三相线电压换算系数 √3（P = √3·U·I·cosφ） */
export const SQRT3 = Math.sqrt(3);
/** kW → W 换算系数 */
export const KW_TO_W = 1000;
/** 无需补偿判据：目标功率因数不高于当前值 */
export const NO_COMPENSATION_NOTE = '目标功率因数不高于当前值，无需补偿';
/** 功率因数合法区间 (0, 1] */
export const POWER_FACTOR_RANGE: Readonly<{ min: number; max: number }> = Object.freeze({
  min: 0,
  max: 1,
});

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

export interface ReactivePowerInput {
  /** 有功功率 P（kW），默认 200 */
  activeKw: number;
  /** 当前功率因数 cosφ1，默认 0.75 */
  cosPhi1: number;
  /** 目标功率因数 cosφ2，默认 0.95 */
  cosPhi2: number;
  /** 线电压（V），默认 380 */
  voltageV: number;
  /** 单步电容器容量（kvar），默认 25 */
  stepKvar: number;
  /** 变压器容量（kVA），默认 0 = 不计算负载率 */
  transformerKva: number;
}

/**
 * 方案阶段默认经验参数表（显式导出便于审计，与组件字段默认值一致）
 * 其中 stepKvar=25 kvar 为常用低压电容器组单步容量、cosφ2=0.95 为力率考核
 * 常规目标；transformerKva=0 表示不计算负载率。
 */
export const REACTIVE_POWER_DEFAULTS: Readonly<ReactivePowerInput> = Object.freeze({
  activeKw: 200,
  cosPhi1: 0.75,
  cosPhi2: 0.95,
  voltageV: 380,
  stepKvar: 25,
  transformerKva: 0,
});

export interface ReactivePowerResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（无需补偿、过补偿与工程口径） */
  note: string;
  /** 补偿前 tanφ1 */
  tan1: number;
  /** 补偿后 tanφ2 */
  tan2: number;
  /** 所需补偿容量（kvar） */
  qcKvar: number;
  /** 补偿前视在功率（kVA） */
  sBeforeKva: number;
  /** 补偿后视在功率（kVA） */
  sAfterKva: number;
  /** 节省的视在功率（kVA） */
  savedKva: number;
  /** 补偿前线电流（A） */
  currentBeforeA: number;
  /** 补偿后线电流（A） */
  currentAfterA: number;
  /** 投切路数 */
  circuits: number;
  /** 实装电容器容量（kvar） */
  installedKvar: number;
  /** 过补偿余量（kvar） */
  overKvar: number;
  /** 补偿前变压器负载率（%）；不计算时为 null */
  loadBeforePct: number | null;
  /** 补偿后变压器负载率（%）；不计算时为 null */
  loadAfterPct: number | null;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数或 null */
function invalidResult(note: string): ReactivePowerResult {
  return {
    valid: false,
    note,
    tan1: 0,
    tan2: 0,
    qcKvar: 0,
    sBeforeKva: 0,
    sAfterKva: 0,
    savedKva: 0,
    currentBeforeA: 0,
    currentAfterA: 0,
    circuits: 0,
    installedKvar: 0,
    overKvar: 0,
    loadBeforePct: null,
    loadAfterPct: null,
  };
}

/** 由功率因数求 tanφ；cosφ 已保证落在 (0, 1] */
function tanPhi(cosPhi: number): number {
  return Math.sqrt(1 - cosPhi ** 2) / cosPhi;
}

/**
 * 无功补偿容量计算
 * @param input 输入参数
 */
export function reactivePower(input: ReactivePowerInput): ReactivePowerResult {
  const values = [
    input.activeKw,
    input.cosPhi1,
    input.cosPhi2,
    input.voltageV,
    input.stepKvar,
    input.transformerKva,
  ];
  if (!values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return invalidResult('所有输入必须为有限数值');
  }
  if (
    input.activeKw <= 0 ||
    input.cosPhi1 <= POWER_FACTOR_RANGE.min ||
    input.cosPhi1 > POWER_FACTOR_RANGE.max ||
    input.cosPhi2 <= POWER_FACTOR_RANGE.min ||
    input.cosPhi2 > POWER_FACTOR_RANGE.max ||
    input.voltageV <= 0 ||
    input.stepKvar <= 0
  ) {
    return invalidResult('有功功率、线电压与单步容量须大于 0，功率因数须落在 (0, 1] 区间');
  }

  const tan1 = tanPhi(input.cosPhi1);
  const tan2 = tanPhi(input.cosPhi2);
  const qcKvar = Math.max(0, input.activeKw * (tan1 - tan2));
  const sBeforeKva = input.activeKw / input.cosPhi1;
  const sAfterKva = input.activeKw / input.cosPhi2;
  const savedKva = sBeforeKva - sAfterKva;
  const currentBeforeA = (input.activeKw * KW_TO_W) / (SQRT3 * input.voltageV * input.cosPhi1);
  const currentAfterA = (input.activeKw * KW_TO_W) / (SQRT3 * input.voltageV * input.cosPhi2);
  const circuits = input.cosPhi2 <= input.cosPhi1 ? 0 : Math.ceil(qcKvar / input.stepKvar);
  const installedKvar = circuits * input.stepKvar;
  const overKvar = installedKvar - qcKvar;
  const transformerKva = input.transformerKva > 0 ? input.transformerKva : 0;
  const loadBeforePct = transformerKva > 0 ? (sBeforeKva / transformerKva) * 100 : null;
  const loadAfterPct = transformerKva > 0 ? (sAfterKva / transformerKva) * 100 : null;

  const outputs = [
    tan1,
    tan2,
    qcKvar,
    sBeforeKva,
    sAfterKva,
    savedKva,
    currentBeforeA,
    currentAfterA,
    circuits,
    installedKvar,
    overKvar,
    loadBeforePct ?? 0,
    loadAfterPct ?? 0,
  ];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请缩小有功功率或放大电压/单步容量');
  }

  const notes: string[] = [];
  if (input.cosPhi2 <= input.cosPhi1) {
    notes.push(NO_COMPENSATION_NOTE);
  }
  notes.push(
    `补偿后线电流由 ${currentBeforeA} A 降至 ${currentAfterA} A，视在功率减少 ${savedKva} kVA；按 ${input.stepKvar} kvar/步需 ${circuits} 路、实装 ${installedKvar} kvar`,
  );
  if (overKvar > 0) {
    notes.push(`分级投切带来约 ${overKvar} kvar 过补偿余量，轻载时宜由控制器减少投入路数，避免向电网倒送无功`);
  }
  if (input.cosPhi2 > 0.95) {
    notes.push('目标功率因数高于 0.95，轻载时易过补偿向电网倒送无功并抬升母线电压，建议按供电部门力率考核要求取 0.9~0.95');
  }
  notes.push(
    '结果为方案阶段容量估算（基础电路关系 Qc=P(tanφ1−tanφ2)，工程查表法见 GB 50052《供配电系统设计规范》与《工业与民用供配电设计手册》），未计变压器无功损耗、谐波放大与串联电抗器引起的容量折减，实际按负荷曲线与控制器投切策略确定',
  );
  notes.push(
    '仅适用于感性负载欠补偿场景；容性（超前）功率因数或已过补偿回路不适用（tanφ 恒取正值）。电容器实际输出容量 ∝ U²，谐波场合需串联电抗器并降容，本工具未计入。',
  );
  notes.push(GENERAL_DISCLAIMER);

  return {
    valid: true,
    note: notes.join('；'),
    tan1,
    tan2,
    qcKvar,
    sBeforeKva,
    sAfterKva,
    savedKva,
    currentBeforeA,
    currentAfterA,
    circuits,
    installedKvar,
    overKvar,
    loadBeforePct,
    loadAfterPct,
  };
}
