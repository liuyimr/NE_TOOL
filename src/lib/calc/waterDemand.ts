/**
 * W1 · 给水设计秒流量（当量法）（纯函数）
 * 公式（PRD #14）：q_g = 0.2·α·√N_g （L/s）
 * 说明：生活给水按卫生器具给水当量总数 N_g 与建筑类型系数 α 估算设计秒流量。
 *      α 与建筑用途、卫生器具数量相关，此处给出常用取值并允许覆盖；施工图以 GB 50015 为准。
 */

/** 建筑类型（用于取默认 α） */
export type WaterBuildingType =
  | 'residential'
  | 'office'
  | 'hotel'
  | 'school'
  | 'shopping'
  | 'hospital';

/** 建筑类型 → 常用 α 取值（工程近似，可被输入覆盖） */
export const ALPHA_PRESET: Record<WaterBuildingType, number> = {
  residential: 1.5,
  office: 1.5,
  hotel: 2.5,
  school: 1.8,
  shopping: 1.5,
  hospital: 2.0,
};

export interface DemandFlowInput {
  /** 卫生器具给水当量总数 N_g */
  ng: number;
  /** 建筑类型（用于取默认 α） */
  buildingType?: WaterBuildingType;
  /** 系数 α（显式给出且 >0 时优先） */
  alpha?: number;
}

export interface DemandFlowResult {
  /** 当量总数 N_g */
  ng: number;
  /** 实际采用的 α */
  alpha: number;
  /** 设计秒流量 q_g（L/s） */
  flowLps: number;
  /** 等同流量（m³/h） */
  flowM3h: number;
}

/**
 * 给水设计秒流量（当量法）
 * @param input 输入参数
 */
export function demandFlow(input: DemandFlowInput): DemandFlowResult {
  const ng = Math.max(0, input.ng || 0);
  const preset = ALPHA_PRESET[input.buildingType ?? 'residential'] ?? 1.5;
  const alpha = input.alpha && input.alpha > 0 ? input.alpha : preset;
  const flowLps = 0.2 * alpha * Math.sqrt(ng);
  return { ng, alpha, flowLps, flowM3h: flowLps * 3.6 };
}
