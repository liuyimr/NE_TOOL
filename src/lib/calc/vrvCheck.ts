/**
 * H19 · VRV 多联机配比与管长校核（纯函数）
 * ------------------------------------------------------------------
 * 公式：
 *   ratio               = indoorTotalKw / outdoorKw                     室内外机容量配比
 *   ratioOk             = ratio ≥ ratioMin && ratio ≤ ratioMax          配比是否在允许区间
 *   lengthLossPct       = max(0, pipeLengthM − referenceLengthM) × lengthCorrectionPerM × 100
 *   heightLossPct       = max(0, heightDiffM − heightReferenceM) × heightCorrectionPerM × 100
 *   totalLossPct        = lengthLossPct + heightLossPct                 容量修正合计衰减率（%）
 *   correctedCapacityKw = outdoorKw × (1 − totalLossPct / 100)          修正后外机实际能力（kW）
 *   pipeOk              = pipeLengthM ≤ maxPipeLengthM                  管长是否超限
 *   heightOk            = heightDiffM ≤ maxHeightDiffM                  高差是否超限
 *   capacityOk          = correctedCapacityKw ≥ indoorTotalKw           修正后外机能力是否覆盖内机总容量
 *   correctedRatio      = indoorTotalKw / correctedCapacityKw           修正后配比（能力校核口径）
 *   capacityGapKw       = max(0, indoorTotalKw − correctedCapacityKw)   能力缺口（kW）
 *   overallOk           = ratioOk && pipeOk && heightOk && capacityOk   综合结论
 *
 * 常量与口径：
 *   ratioMin / ratioMax（默认 0.5 / 1.3）：多联机室内外机容量配比常见允许区间
 *        50%~130%（部分厂家标注 50%~130%，也有 50%~120%），超配率过大易导致能力不足
 *        与回油困难，欠配则外机能力浪费；须按厂家样本的「连接容量比范围」取值。
 *   referenceLengthM（默认 5 m）：厂家性能表的基准配管长度（多数样本以 5 m 或 7.5 m 为基准）。
 *   heightReferenceM（默认 10 m）：部分厂家样本给出高差基准（超出基准才折减），
 *        也有样本不给高差基准（等价于 0）；须按样本表格逐档插值取值。
 *   lengthCorrectionPerM / heightCorrectionPerM：线性化后的每米衰减率，默认 0.003（0.3%/m）
 *        与 0.001（0.1%/m）为方案阶段经验值。厂家样本实际为分档表格（且衰减与配比、
 *        内外机高差方向相关），线性化仅用于方案阶段快速判断，不可替代样本插值。
 *   maxPipeLengthM / maxHeightDiffM（默认 165 / 50）：常见家用与商用多联机的配管总长与
 *        高差上限区间上限值；不同机型差异很大（单机 100~165 m、高差 30~50 m），
 *        且还受「单管最长」「第一分支配件后长度」「室内外机高差方向」等分项限制，
 *        必须按具体型号样本逐项校核。
 *
 * 边界：outdoorKw ≤ 0、indoorTotalKw < 0、pipeLengthM/heightDiffM < 0、
 *       ratioMin ≤ 0、ratioMax < ratioMin、各上限/基准为负、任一输入非有限
 *       → valid=false；结果溢出 → valid=false。
 *
 * 两个配比口径的区别（勿混用）：
 *   ratio（ratioOk）为「名义配比」＝内机总容量 ÷ 外机名义容量，是厂家样本给出的
 *   「连接容量比」口径，不随管长/高差折减变化，因此不足以判断能力是否够用；
 *   correctedRatio（capacityOk）为「修正后配比」＝内机总容量 ÷ 修正后外机能力，
 *   反映管长与高差衰减后的真实能力匹配。两者同时满足才算综合通过。
 */

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

export interface VrvCheckInput {
  /** 室内机总容量（kW），默认 60 */
  indoorTotalKw: number;
  /** 室外机容量（kW），默认 56 */
  outdoorKw: number;
  /** 实际配管长度（m），默认 80 */
  pipeLengthM: number;
  /** 配管基准长度（m），默认 5 */
  referenceLengthM: number;
  /** 室内外机高差（m），默认 20 */
  heightDiffM: number;
  /** 高差基准（m），默认 10 */
  heightReferenceM: number;
  /** 每米管长容量衰减率（小数/米），默认 0.003 */
  lengthCorrectionPerM: number;
  /** 每米高差容量衰减率（小数/米），默认 0.001 */
  heightCorrectionPerM: number;
  /** 允许配比下界，默认 0.5 */
  ratioMin: number;
  /** 允许配比上界，默认 1.3 */
  ratioMax: number;
  /** 配管总长上限（m），默认 165 */
  maxPipeLengthM: number;
  /** 高差上限（m），默认 50 */
  maxHeightDiffM: number;
}

/** 方案阶段默认参数表（显式导出便于审计，与组件字段默认值一致） */
export const VRV_CHECK_DEFAULTS: Readonly<VrvCheckInput> = Object.freeze({
  indoorTotalKw: 60,
  outdoorKw: 56,
  pipeLengthM: 80,
  referenceLengthM: 5,
  heightDiffM: 20,
  heightReferenceM: 10,
  lengthCorrectionPerM: 0.003,
  heightCorrectionPerM: 0.001,
  ratioMin: 0.5,
  ratioMax: 1.3,
  maxPipeLengthM: 165,
  maxHeightDiffM: 50,
});

export interface VrvCheckResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（配比、修正与超限说明） */
  note: string;
  /** 室内外机容量配比 */
  ratio: number;
  /** 配比是否在允许区间 */
  ratioOk: boolean;
  /** 管长引起的容量衰减率（%） */
  lengthLossPct: number;
  /** 高差引起的容量衰减率（%） */
  heightLossPct: number;
  /** 容量衰减合计（%） */
  totalLossPct: number;
  /** 修正后外机实际能力（kW） */
  correctedCapacityKw: number;
  /**
   * 能力校核是否通过：修正后外机实际能力是否覆盖内机总容量
   * （correctedCapacityKw ≥ indoorTotalKw）。
   * 内机总容量为 0 时恒为 true（此时 ratioOk 为 false，不影响 overallOk）。
   */
  capacityOk: boolean;
  /**
   * 修正后配比：内机总容量 ÷ 修正后外机能力。
   * 修正后能力为 0 时无法计算，取 Infinity。
   */
  correctedRatio: number;
  /** 能力缺口（kW）：max(0, 内机总容量 − 修正后外机能力)，0 表示无缺口 */
  capacityGapKw: number;
  /** 管长是否超限 */
  pipeOk: boolean;
  /** 高差是否超限 */
  heightOk: boolean;
  /**
   * 综合结论：配比、管长、高差、修正后能力四项全部通过才为 true
   * （ratioOk && pipeOk && heightOk && capacityOk）
   */
  overallOk: boolean;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数 */
function invalidResult(note: string): VrvCheckResult {
  return {
    valid: false,
    note,
    ratio: 0,
    ratioOk: false,
    lengthLossPct: 0,
    heightLossPct: 0,
    totalLossPct: 0,
    correctedCapacityKw: 0,
    capacityOk: false,
    correctedRatio: 0,
    capacityGapKw: 0,
    pipeOk: false,
    heightOk: false,
    overallOk: false,
  };
}

/**
 * VRV 多联机配比与管长校核
 * @param input 输入参数
 */
export function vrvCheck(input: VrvCheckInput): VrvCheckResult {
  const values = [
    input.indoorTotalKw,
    input.outdoorKw,
    input.pipeLengthM,
    input.referenceLengthM,
    input.heightDiffM,
    input.heightReferenceM,
    input.lengthCorrectionPerM,
    input.heightCorrectionPerM,
    input.ratioMin,
    input.ratioMax,
    input.maxPipeLengthM,
    input.maxHeightDiffM,
  ];
  if (!values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return invalidResult('所有输入必须为有限数值');
  }
  if (input.outdoorKw <= 0) {
    return invalidResult('外机容量须大于 0');
  }
  if (input.indoorTotalKw < 0) {
    return invalidResult('内机总容量须非负');
  }
  if (input.pipeLengthM < 0 || input.heightDiffM < 0) {
    return invalidResult('配管长度与高差须非负（高差按绝对值填写）');
  }
  if (input.referenceLengthM < 0 || input.heightReferenceM < 0) {
    return invalidResult('管长基准与高差基准须非负');
  }
  if (input.lengthCorrectionPerM < 0 || input.heightCorrectionPerM < 0) {
    return invalidResult('容量衰减率须非负');
  }
  if (input.ratioMin <= 0 || input.ratioMax < input.ratioMin) {
    return invalidResult('配比下界须大于 0，且上界须不小于下界');
  }
  if (input.maxPipeLengthM <= 0 || input.maxHeightDiffM < 0) {
    return invalidResult('配管总长上限须大于 0，高差上限须非负');
  }
  const ratio = input.indoorTotalKw / input.outdoorKw;
  const ratioOk = ratio >= input.ratioMin && ratio <= input.ratioMax;
  const lengthLossPct =
    Math.max(0, input.pipeLengthM - input.referenceLengthM) *
    input.lengthCorrectionPerM *
    100;
  const heightLossPct =
    Math.max(0, input.heightDiffM - input.heightReferenceM) *
    input.heightCorrectionPerM *
    100;
  const totalLossPct = lengthLossPct + heightLossPct;
  const correctedCapacityKw = Math.max(0, input.outdoorKw * (1 - totalLossPct / 100));
  // 能力校核：修正后的外机实际能力是否覆盖内机总容量（名义配比之外的第二道校核）
  const capacityOk = correctedCapacityKw >= input.indoorTotalKw;
  // 修正后配比与能力缺口：修正后能力为 0 时配比无法计算（取 Infinity），缺口等于全部内机容量
  const correctedRatio =
    correctedCapacityKw > 0 ? input.indoorTotalKw / correctedCapacityKw : Number.POSITIVE_INFINITY;
  const capacityGapKw = Math.max(0, input.indoorTotalKw - correctedCapacityKw);
  const pipeOk = input.pipeLengthM <= input.maxPipeLengthM;
  const heightOk = input.heightDiffM <= input.maxHeightDiffM;
  const overallOk = ratioOk && pipeOk && heightOk && capacityOk;

  const outputs = [ratio, lengthLossPct, heightLossPct, totalLossPct, correctedCapacityKw];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请核对容量与衰减率取值');
  }

  const notes: string[] = [
    `配比 ${ratio.toFixed(4)}（允许 ${input.ratioMin}~${input.ratioMax}）${ratioOk ? '，在允许区间内' : ratio > input.ratioMax ? '，超配' : '，欠配'}`,
    `管长 ${input.pipeLengthM} m 超出基准 ${input.referenceLengthM} m → 衰减 ${lengthLossPct.toFixed(2)}%；高差 ${input.heightDiffM} m 超出基准 ${input.heightReferenceM} m → 衰减 ${heightLossPct.toFixed(2)}%；合计 ${totalLossPct.toFixed(2)}%`,
    `修正后外机能力 ${correctedCapacityKw.toFixed(2)} kW（原 ${input.outdoorKw} kW）`,
    correctedRatio === Number.POSITIVE_INFINITY
      ? '修正后能力为 0，无法计算配比'
      : `修正后配比 ${correctedRatio.toFixed(2)}（内机总容量 ÷ 修正后外机能力）`,
    capacityOk
      ? '能力校核：修正后外机能力已覆盖内机总容量'
      : `能力校核：修正后外机能力不足 ${capacityGapKw.toFixed(2)} kW，须增大外机、缩短管长或减少内机`,
  ];
  if (!pipeOk) {
    notes.push(`配管总长 ${input.pipeLengthM} m 超过上限 ${input.maxPipeLengthM} m，须调整系统划分或改用多系统`);
  }
  if (!heightOk) {
    notes.push(`高差 ${input.heightDiffM} m 超过上限 ${input.maxHeightDiffM} m，须核对样本的分项高差限制`);
  }
  if (totalLossPct >= 100) {
    notes.push('衰减合计 ≥100%，修正后外机能力不可用（按 0 kW 计），须缩短管长、降低高差或重新选型');
  }
  notes.push(
    '配比与修正系数以厂家样本为准（常见 50%~130%，管长/高差上限随机型不同）；衰减率默认值为方案阶段经验值',
  );
  notes.push(
    '名义配比（内机 ÷ 外机名义容量）为厂家样本的连接容量比口径，修正后配比（内机 ÷ 修正后能力）用于能力校核，两者须同时满足',
  );
  notes.push(GENERAL_DISCLAIMER);

  return {
    valid: true,
    note: notes.join('；'),
    ratio,
    ratioOk,
    lengthLossPct,
    heightLossPct,
    totalLossPct,
    correctedCapacityKw,
    capacityOk,
    correctedRatio,
    capacityGapKw,
    pipeOk,
    heightOk,
    overallOk,
  };
}
