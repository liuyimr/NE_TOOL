/**
 * S11 · 接地电阻与接地体数量估算（纯函数）
 * 公式（PRD #10）：单根垂直接地体 R₁ = ρ/(2πL)·ln(4L/d)
 * 公式（PRD #11）：多根接地体并联 R = R₁/(n·η)
 * 说明：ρ 为土壤电阻率（Ω·m）、L 为接地体长度（m）、d 为接地体直径（m）、
 *      η 为利用系数（与根数、间距相关，一般 0.6~0.9），此处取默认 0.75 并允许覆盖。
 */

/** 常用接地电阻目标限值（Ω） */
export const GROUNDING_TARGETS = [1, 4, 10, 30, 100];

export interface GroundingInput {
  /** 土壤电阻率 ρ（Ω·m） */
  rho: number;
  /** 单根接地体长度 L（m） */
  length: number;
  /** 接地体直径 d（m，默认 0.05，即 50mm 钢管/圆钢近似） */
  diameter?: number;
  /** 目标接地电阻（Ω） */
  targetR: number;
  /** 计划并联根数 n（可选，用于回算实际可达电阻） */
  rods?: number;
  /** 利用系数 η（默认 0.75） */
  eta?: number;
}

export interface GroundingResult {
  /** 单根垂直接地体电阻 R₁（Ω） */
  singleR: number;
  /** 目标电阻（Ω） */
  targetR: number;
  /** 利用系数 η */
  eta: number;
  /** 满足目标所需的并联根数（向上取整，至少 1 根） */
  neededRods: number;
  /** 计划根数（未给时等于 neededRods） */
  plannedRods: number;
  /** 按计划根数可达的接地电阻（Ω） */
  achievedR: number;
  /** 是否达标（achievedR ≤ targetR） */
  compliant: boolean;
}

/**
 * 接地电阻与接地体数量估算
 * @param input 输入参数
 */
export function groundingResistance(input: GroundingInput): GroundingResult {
  const rho = Math.max(0, input.rho || 0);
  const length = input.length && input.length > 0 ? input.length : 2.5;
  const diameter = input.diameter && input.diameter > 0 ? input.diameter : 0.05;
  const targetR = input.targetR && input.targetR > 0 ? input.targetR : 4;
  const eta = input.eta && input.eta > 0 && input.eta <= 1 ? input.eta : 0.75;

  // 单根垂直接地体电阻 R₁ = ρ/(2πL)·ln(4L/d)
  const singleR = (rho / (2 * Math.PI * length)) * Math.log((4 * length) / diameter);
  const singleRSafe = Number.isFinite(singleR) && singleR > 0 ? singleR : 0;

  const neededRods = Math.max(1, Math.ceil(singleRSafe / (targetR * eta)));
  const plannedRods = input.rods && input.rods > 0 ? Math.floor(input.rods) : neededRods;
  const achievedR = plannedRods > 0 ? singleRSafe / (plannedRods * eta) : singleRSafe;

  return {
    singleR: singleRSafe,
    targetR,
    eta,
    neededRods,
    plannedRods,
    achievedR,
    compliant: achievedR <= targetR + 1e-9,
  };
}
