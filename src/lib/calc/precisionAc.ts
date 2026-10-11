/**
 * B6 · 精密空调制冷量估算（纯函数）
 * 公式（PRD #11）：Q(kW) ≈ IT负载(kW) × (1.0~1.3)；1 kW ≈ 3412 BTU/h
 * 另计入建筑围护负荷（面积 × 单位冷负荷）。
 */

export interface PrecisionAcInput {
  /** IT 设备负载（kW） */
  itLoadKW: number;
  /** 机房面积（m²） */
  area?: number;
  /** 单位面积建筑负荷（W/m²，默认 60） */
  buildingLoadWPerM2?: number;
  /** IT 负荷放大系数（默认 1.15） */
  itFactor?: number;
  /** 安全余量系数（默认 1.1） */
  margin?: number;
}

export interface PrecisionAcResult {
  /** IT 冷负荷（kW） */
  itCoolingKW: number;
  /** 建筑围护冷负荷（kW） */
  buildingCoolingKW: number;
  /** 总制冷量（kW，含余量） */
  totalKW: number;
  /** 总制冷量（BTU/h） */
  totalBTU: number;
  /** 折算冷吨（RT） */
  tonsRT: number;
}

const BTU_PER_KW = 3412;
const KW_PER_RT = 3.5168525;

/**
 * 精密空调制冷量估算
 * @param input 输入参数
 */
export function precisionAc(input: PrecisionAcInput): PrecisionAcResult {
  const itLoad = Math.max(0, input.itLoadKW || 0);
  const itFactor = input.itFactor && input.itFactor > 0 ? input.itFactor : 1.15;
  const margin = input.margin && input.margin > 0 ? input.margin : 1.1;
  const area = Math.max(0, input.area || 0);
  const buildingLoadWPerM2 =
    input.buildingLoadWPerM2 && input.buildingLoadWPerM2 > 0 ? input.buildingLoadWPerM2 : 60;

  const itCoolingKW = itLoad * itFactor;
  const buildingCoolingKW = (area * buildingLoadWPerM2) / 1000;
  const totalKW = (itCoolingKW + buildingCoolingKW) * margin;

  return {
    itCoolingKW,
    buildingCoolingKW,
    totalKW,
    totalBTU: totalKW * BTU_PER_KW,
    tonsRT: totalKW / KW_PER_RT,
  };
}
