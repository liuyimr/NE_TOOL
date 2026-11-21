/**
 * C10 · 电缆选型与电压降计算（纯函数）
 * 公式（PRD #22）：
 *   三相简化 ΔU = √3 · ρ · L · I ÷ S
 *   单相简化 ΔU = 2 · ρ · L · I ÷ S
 * 铜 ρ ≈ 0.0175 Ω·mm²/m，铝 ρ ≈ 0.0282 Ω·mm²/m。
 * 判据：动力回路电压降 ≤ 5%，照明回路 ≤ 3%（工程常用）。
 * 口径统一：按电流法（精确式）与按功率法（简化系数法）共用同一限值口径
 *   —— 照明 3%、动力 5%，避免同一回路两种算法给出相反结论。
 * 输入校验：长度 / 电流（功率）/ 截面 / 电压 为负或非正、或非有限值时 valid=false，
 *   deltaV / percent 置 0、compliant=false，不再把负值算出的负百分比判为「合规」。
 */

export type ConductorMaterial = 'copper' | 'aluminum';
export type CircuitPhase = 'single' | 'three';

/** 电阻率 ρ（Ω·mm²/m，20℃） */
export const RESISTIVITY: Record<ConductorMaterial, number> = {
  copper: 0.0175,
  aluminum: 0.0282,
};

export interface CableDropInput {
  /** 负载电流（A） */
  current: number;
  /** 单程线缆长度（m） */
  length: number;
  /** 导体截面（mm²） */
  section: number;
  /** 材质（默认铜） */
  material?: ConductorMaterial;
  /** 相制（默认三相） */
  phase?: CircuitPhase;
  /** 系统电压（V，用于计算百分比） */
  voltage?: number;
  /** 是否照明回路（限值 3%，否则 5%） */
  lighting?: boolean;
}

export interface CableDropResult {
  /** 输入是否有效（长度 / 电流 / 截面 / 电压 均为有限且为正；无效时其余数值字段为 0） */
  valid: boolean;
  /** 电压降（V） */
  deltaV: number;
  /** 电压降百分比（%） */
  percent: number;
  /** 判据限值（%） */
  limit: number;
  /** 是否合规（输入无效时恒为 false，不再因负值算出负百分比而误判合规） */
  compliant: boolean;
  /** 使用电阻率 */
  resistivity: number;
}

/**
 * 电压降计算
 * @param input 输入参数
 */
export function cableVoltageDrop(input: CableDropInput): CableDropResult {
  const material = input.material ?? 'copper';
  const rho = RESISTIVITY[material];
  const phase = input.phase ?? 'three';
  const section = input.section > 0 ? input.section : 0;
  const limit = input.lighting ? 3 : 5;

  const voltage = input.voltage ?? Number.NaN;
  const finiteValues = [input.current, input.length, input.section, voltage];
  const invalid =
    !finiteValues.every((x) => typeof x === 'number' && Number.isFinite(x)) ||
    section <= 0 ||
    input.length < 0 ||
    input.current < 0 ||
    voltage <= 0;

  if (invalid) {
    return { valid: false, deltaV: 0, percent: 0, limit, compliant: false, resistivity: rho };
  }

  const factor = phase === 'three' ? Math.sqrt(3) : 2;
  const deltaV = (factor * rho * input.length * input.current) / section;
  const percent = (deltaV / voltage) * 100;

  return {
    valid: true,
    deltaV,
    percent,
    limit,
    compliant: percent <= limit,
    resistivity: rho,
  };
}

/**
 * 按目标电压降百分比反算允许的最大长度（m）
 * @param input 输入参数（其中 length 被忽略）
 * @param targetPercent 目标百分比（如 5）
 */
export function maxLengthForDrop(input: CableDropInput, targetPercent = 5): number {
  const material = input.material ?? 'copper';
  const rho = RESISTIVITY[material];
  const phase = input.phase ?? 'three';
  const factor = phase === 'three' ? Math.sqrt(3) : 2;
  if (!input.voltage || input.section <= 0 || input.current <= 0) return 0;
  const allowedV = (input.voltage * targetPercent) / 100;
  return (allowedV * input.section) / (factor * rho * input.current);
}

// ============================================================================
// 以下为「按功率输入」的简化系数法增强（追加，不影响上面的按电流精确算法）。
// 公式（PRD 水电 #5）：ΔU% = P·L/(C·S)
//   P(kW)、L(m)、S(mm²)；三相铜 C=76.5 / 铝 46.3，单相铜 12.8 / 铝 7.75。
// 说明：C 与材质、相制相关，是工程速算法；精确算法（cableVoltageDrop）仍保留。
// ============================================================================

/** 简化系数法常数 C（按相制 × 材质） */
export const COEFFICIENT_C: Record<CircuitPhase, Record<ConductorMaterial, number>> = {
  three: { copper: 76.5, aluminum: 46.3 },
  single: { copper: 12.8, aluminum: 7.75 },
};

/** 允许电压降限值（%）：照明 3%、动力 5%，与按电流法（精确式）保持同一口径 */
export const ALLOWABLE_DROP: { lighting: number; power: number } = {
  lighting: 3,
  power: 5,
};

export interface SimpleDropInput {
  /** 有功功率 P（kW） */
  powerKw: number;
  /** 单程线缆长度 L（m） */
  length: number;
  /** 导体截面 S（mm²） */
  section: number;
  /** 材质（默认铜） */
  material?: ConductorMaterial;
  /** 相制（默认三相） */
  phase?: CircuitPhase;
  /** 是否照明回路（限值 3%，否则 5%，与精确式一致） */
  lighting?: boolean;
}

export interface SimpleDropResult {
  /** 输入是否有效（功率 / 长度 / 截面 均为有限且符合要求；无效时 percent 为 0） */
  valid: boolean;
  /** 电压降百分比（%） */
  percent: number;
  /** 选用的系数 C */
  coefficient: number;
  /** 判据限值（%） */
  limit: number;
  /** 是否合规（输入无效时恒为 false） */
  compliant: boolean;
}

/**
 * 简化系数法电压降 ΔU% = P·L/(C·S)
 * @param input 输入参数
 */
export function simpleVoltageDrop(input: SimpleDropInput): SimpleDropResult {
  const material = input.material ?? 'copper';
  const phase = input.phase ?? 'three';
  const coefficient = COEFFICIENT_C[phase][material];
  const limit = input.lighting ? ALLOWABLE_DROP.lighting : ALLOWABLE_DROP.power;

  const section = input.section > 0 ? input.section : 0;
  const finiteValues = [input.powerKw, input.length, input.section];
  const invalid =
    !finiteValues.every((x) => typeof x === 'number' && Number.isFinite(x)) ||
    section <= 0 ||
    input.length < 0 ||
    input.powerKw < 0;

  if (invalid) {
    return { valid: false, percent: 0, coefficient, limit, compliant: false };
  }
  const percent = (input.powerKw * input.length) / (coefficient * section);
  return { valid: true, percent, coefficient, limit, compliant: percent <= limit };
}
