/**
 * H11 · 空调冷/热负荷估算（纯函数）
 * 说明：方案阶段按「面积 × 单位面积冷/热指标 × 修正系数」快速估算总负荷。
 * 指标为工程常用范围的中值，施工图阶段须按围护结构逐项计算。指标可被输入覆盖。
 */

/** 建筑类型 */
export type HvacBuildingType =
  | 'residential'
  | 'office'
  | 'hotel'
  | 'shopping'
  | 'hospital'
  | 'factory';

/** 冷负荷指标 W/m²（方案阶段常用中值，可覆盖） */
export const COLD_INDEX: Record<HvacBuildingType, number> = {
  residential: 100,
  office: 120,
  hotel: 120,
  shopping: 200,
  hospital: 150,
  factory: 160,
};

/** 热负荷指标 W/m²（方案阶段常用中值，可覆盖） */
export const HEAT_INDEX: Record<HvacBuildingType, number> = {
  residential: 60,
  office: 80,
  hotel: 80,
  shopping: 100,
  hospital: 100,
  factory: 120,
};

export interface HvacLoadInput {
  /** 建筑面积（m²） */
  area: number;
  /** 建筑类型（取默认指标） */
  buildingType?: HvacBuildingType;
  /** 冷指标 W/m²（显式给出且 >0 时覆盖） */
  coldIndex?: number;
  /** 热指标 W/m²（显式给出且 >0 时覆盖） */
  heatIndex?: number;
  /** 修正系数（默认 1） */
  correction?: number;
}

export interface HvacLoadResult {
  valid: boolean;
  /** 冷负荷（kW） */
  coldKw: number;
  /** 热负荷（kW） */
  heatKw: number;
  /** 采用的冷指标 W/m² */
  unitColdIndex: number;
  /** 采用的热指标 W/m² */
  unitHeatIndex: number;
  /** 建筑面积 */
  area: number;
  /** 修正系数 */
  correction: number;
}

/**
 * 空调冷/热负荷估算
 * @param input 输入参数
 */
export function hvacLoad(input: HvacLoadInput): HvacLoadResult {
  const area = Number.isFinite(input.area) && input.area > 0 ? input.area : 0;
  const bt = input.buildingType ?? 'office';
  const coldIndex =
    input.coldIndex && input.coldIndex > 0 ? input.coldIndex : COLD_INDEX[bt] ?? 120;
  const heatIndex =
    input.heatIndex && input.heatIndex > 0 ? input.heatIndex : HEAT_INDEX[bt] ?? 80;
  const correction = input.correction && input.correction > 0 ? input.correction : 1;

  const coldKw = (area * coldIndex * correction) / 1000;
  const heatKw = (area * heatIndex * correction) / 1000;

  return {
    valid: area > 0,
    coldKw,
    heatKw,
    unitColdIndex: coldIndex,
    unitHeatIndex: heatIndex,
    area,
    correction,
  };
}
