/**
 * C10 · 电缆选型与电压降计算（纯函数）
 * 公式（PRD #22）：
 *   三相简化 ΔU = √3 · ρ · L · I ÷ S
 *   单相简化 ΔU = 2 · ρ · L · I ÷ S
 * 铜 ρ ≈ 0.0175 Ω·mm²/m，铝 ρ ≈ 0.0282 Ω·mm²/m。
 * 判据：动力回路电压降 ≤ 5%，照明回路 ≤ 3%（工程常用）。
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
  /** 电压降（V） */
  deltaV: number;
  /** 电压降百分比（%） */
  percent: number;
  /** 判据限值（%） */
  limit: number;
  /** 是否合规 */
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

  if (section <= 0 || !input.voltage || input.voltage <= 0) {
    return { deltaV: 0, percent: 0, limit, compliant: false, resistivity: rho };
  }

  const factor = phase === 'three' ? Math.sqrt(3) : 2;
  const deltaV = (factor * rho * input.length * input.current) / section;
  const percent = (deltaV / input.voltage) * 100;

  return {
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
