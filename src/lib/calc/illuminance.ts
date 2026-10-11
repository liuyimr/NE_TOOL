/**
 * B10 / B11 · 照度计算（流明法）与灯具数量估算（纯函数）
 * 公式（PRD #14）：E = (N × Φ × U × K) ÷ A
 *              反算 N = (E × A) ÷ (Φ × U × K)
 * 其中 N 灯具数、Φ 单灯光通量(lm)、U 利用系数、K 维护系数、A 面积(m²)。
 */

export interface IlluminanceInput {
  /** 房间面积（m²） */
  area: number;
  /** 目标照度（lx） */
  targetLux?: number;
  /** 单灯光通量（lm） */
  lumens?: number;
  /** 利用系数 U（默认 0.7） */
  utilization?: number;
  /** 维护系数 K（默认 0.8） */
  maintenance?: number;
  /** 实际灯具数量（用于正算照度） */
  fixtures?: number;
  /** 单灯功率（W，用于功率密度） */
  wattPerLamp?: number;
}

export interface IlluminanceResult {
  /** 所需灯具数量（向上取整） */
  requiredFixtures: number;
  /** 实际达到的平均照度（lx） */
  averageLux: number;
  /** 功率密度（W/m²） */
  powerDensity: number;
}

/**
 * 照度 / 灯具数量计算
 * @param input 输入参数
 */
export function illuminanceCalc(input: IlluminanceInput): IlluminanceResult {
  const area = Math.max(0, input.area || 0);
  const utilization = input.utilization && input.utilization > 0 ? input.utilization : 0.7;
  const maintenance = input.maintenance && input.maintenance > 0 ? input.maintenance : 0.8;
  const lumens = input.lumens && input.lumens > 0 ? input.lumens : 0;
  const targetLux = Math.max(0, input.targetLux || 0);

  // 反算所需灯具数
  const denom = lumens * utilization * maintenance;
  const requiredFixtures =
    denom > 0 && area > 0 && targetLux > 0 ? Math.ceil((targetLux * area) / denom) : 0;

  // 正算平均照度
  const fixtures = Math.max(0, input.fixtures || 0);
  const averageLux = area > 0 ? (fixtures * lumens * utilization * maintenance) / area : 0;

  // 功率密度 W/m²
  const wattPerLamp = Math.max(0, input.wattPerLamp || 0);
  const powerDensity = area > 0 ? (fixtures * wattPerLamp) / area : 0;

  return { requiredFixtures, averageLux, powerDensity };
}
