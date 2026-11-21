/**
 * S11 · 接地电阻与接地体数量估算（纯函数）
 * 公式（PRD #10）：单根垂直接地体 R₁ = ρ/(2πL)·ln(4L/d)
 * 公式（PRD #11）：多根接地体并联 R = R₁/(n·η)
 * 说明：ρ 为土壤电阻率（Ω·m）、L 为接地体长度（m）、d 为接地体直径（m）、
 *      η 为利用系数（与根数、间距、土壤均匀性相关，一般 0.6~0.9）。
 *      η 不再固定取 0.75：多根并联时屏蔽效应随根数增加而增强，固定 0.75 会明显偏乐观
 *      （工程上 10 根以上常降到 0.6~0.65）。现按根数自动取值（见 etaForRods），
 *      并保留「显式传入 η 覆盖」的入口（η∈(0,1] 时按原公式 R₁/(n·η) 计算）。
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
  /**
   * 利用系数 η 显式覆盖（可选）：传入 (0, 1] 的值时按该值计算；
   * 未传、≤0 或 >1 时按根数自动取值（见 etaForRods）
   */
  eta?: number;
}

export interface GroundingResult {
  /** 单根垂直接地体电阻 R₁（Ω） */
  singleR: number;
  /** 目标电阻（Ω） */
  targetR: number;
  /** 实际采用的利用系数 η（自动模式下为按计划根数取的经验值） */
  eta: number;
  /** η 是否按根数自动取值（true = 自动，false = 由输入显式指定） */
  etaAuto: boolean;
  /** 满足目标所需的并联根数（向上取整，至少 1 根；自动模式下为 η 与根数迭代收敛值） */
  neededRods: number;
  /** 计划根数（未给时等于 neededRods） */
  plannedRods: number;
  /** 按计划根数可达的接地电阻（Ω） */
  achievedR: number;
  /** 是否达标（achievedR ≤ targetR） */
  compliant: boolean;
}

/**
 * 按并联根数取利用系数 η（工程经验值）
 * ------------------------------------------------------------------
 * n ≤ 1 → 1（单根无并联屏蔽）；n ≤ 2 → 0.85；n ≤ 4 → 0.8；
 * n ≤ 6 → 0.75；n ≤ 10 → 0.7；n > 10 → 0.65。
 * 该曲线为工程经验值，随根数与间距变化，须按规范或实测复核；
 * 根数越多、间距越小，屏蔽效应越强，η 越小（切勿固定取 0.75）。
 * @param n 并联根数（非有限值或 ≤1 按 1 根处理）
 */
export function etaForRods(n: number): number {
  const rods = Number.isFinite(n) && n > 1 ? n : 1;
  if (rods <= 1) return 1;
  if (rods <= 2) return 0.85;
  if (rods <= 4) return 0.8;
  if (rods <= 6) return 0.75;
  if (rods <= 10) return 0.7;
  return 0.65;
}

/**
 * 接地电阻与接地体数量估算
 * @param input 输入参数（eta 未传或 ≤0 时按根数自动取值并迭代求解根数）
 */
export function groundingResistance(input: GroundingInput): GroundingResult {
  const rho = Math.max(0, input.rho || 0);
  const length = input.length && input.length > 0 ? input.length : 2.5;
  const diameter = input.diameter && input.diameter > 0 ? input.diameter : 0.05;
  const targetR = input.targetR && input.targetR > 0 ? input.targetR : 4;
  // 显式覆盖：η∈(0,1] 才视为有效覆盖，其余（未传 / 0 / 负数 / >1 物理上不成立）走自动取值
  const etaOverride =
    input.eta !== undefined && input.eta > 0 && input.eta <= 1 ? input.eta : undefined;
  const etaAuto = etaOverride === undefined;

  // 单根垂直接地体电阻 R₁ = ρ/(2πL)·ln(4L/d)
  const singleR = (rho / (2 * Math.PI * length)) * Math.log((4 * length) / diameter);
  const singleRSafe = Number.isFinite(singleR) && singleR > 0 ? singleR : 0;

  const rodsInput = input.rods && input.rods > 0 ? Math.floor(input.rods) : 0;

  let neededRods: number;
  if (etaAuto) {
    // neededRods 依赖 η、η 依赖根数 → 从 n=1 起迭代至稳定（f(n) 单调不减，必收敛，上限 20 轮）
    let n = 1;
    for (let i = 0; i < 20; i += 1) {
      const next = Math.max(1, Math.ceil(singleRSafe / (targetR * etaForRods(n))));
      if (next === n) break;
      n = next;
    }
    neededRods = n;
  } else {
    neededRods = Math.max(1, Math.ceil(singleRSafe / (targetR * etaOverride)));
  }

  const plannedRods = rodsInput > 0 ? rodsInput : neededRods;
  // 自动模式下 η 按「实际采用的计划根数」取值，保证结果中的 η 与 achievedR 自洽
  const eta = etaAuto ? etaForRods(plannedRods) : etaOverride;
  const achievedR = plannedRods > 0 ? singleRSafe / (plannedRods * eta) : singleRSafe;

  return {
    singleR: singleRSafe,
    targetR,
    eta,
    etaAuto,
    neededRods,
    plannedRods,
    achievedR,
    compliant: achievedR <= targetR + 1e-9,
  };
}
