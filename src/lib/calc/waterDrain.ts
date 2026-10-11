/**
 * W10 · 排水管径与坡度校核（纯函数）
 * 依据（PRD 速查关键值 / GB 50015）：生活污水管道标准坡度与最小坡度，
 * 横支管、横干管按管径取值；实际坡度 ≥ 最小坡度即视为可排（合规）。
 */

/** 排水管径 → 坡度/充满度限值 */
export interface DrainSpec {
  /** 公称直径 DN */
  dn: number;
  /** 标准坡度（小数，如 0.035） */
  standardSlope: number;
  /** 最小坡度（小数） */
  minSlope: number;
  /** 最大计算充满度 */
  maxFill: number;
}

/** 排水管径-坡度标准表（GB 50015） */
export const DRAIN_TABLE: DrainSpec[] = [
  { dn: 50, standardSlope: 0.035, minSlope: 0.025, maxFill: 0.5 },
  { dn: 75, standardSlope: 0.025, minSlope: 0.015, maxFill: 0.5 },
  { dn: 100, standardSlope: 0.02, minSlope: 0.012, maxFill: 0.5 },
  { dn: 125, standardSlope: 0.015, minSlope: 0.01, maxFill: 0.5 },
  { dn: 150, standardSlope: 0.01, minSlope: 0.007, maxFill: 0.55 },
  { dn: 200, standardSlope: 0.007, minSlope: 0.005, maxFill: 0.55 },
];

export interface DrainSlopeInput {
  /** 公称直径 DN（需为表中已列管径） */
  dn: number;
  /** 实际坡度（小数，如 0.02） */
  actualSlope: number;
  /** 排水横管长度（m，可选，用于反算两端高差） */
  length?: number;
}

export interface DrainSlopeResult {
  /** 命中的标准管径规格；未命中为 null */
  spec: DrainSpec | null;
  /** 实际采用坡度 */
  actualSlope: number;
  /** 实际坡度对应的坡度千分数（‰） */
  perMille: number;
  /** 是否 ≥ 最小坡度 */
  atLeastMin: boolean;
  /** 是否达到标准坡度 */
  meetsStandard: boolean;
  /** 综合是否合规（≥ 最小坡度） */
  compliant: boolean;
  /** 按实际坡度计算的两端高差（mm）；未给长度时为 0 */
  dropMm: number;
}

/**
 * 排水管径与坡度校核
 * @param input 输入参数
 */
export function drainSlope(input: DrainSlopeInput): DrainSlopeResult {
  const spec = DRAIN_TABLE.find((s) => s.dn === input.dn) ?? null;
  const actualSlope = Math.max(0, input.actualSlope || 0);
  const length = Math.max(0, input.length || 0);

  const atLeastMin = spec ? actualSlope >= spec.minSlope - 1e-9 : false;
  const meetsStandard = spec ? actualSlope >= spec.standardSlope - 1e-9 : false;
  const dropMm = actualSlope * length * 1000;

  return {
    spec,
    actualSlope,
    perMille: actualSlope * 1000,
    atLeastMin,
    meetsStandard,
    compliant: atLeastMin,
    dropMm,
  };
}
