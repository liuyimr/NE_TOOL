/**
 * B9 · 冷量计费计算（纯函数）
 * 公式（PRD #13）：Q = ρ·V·c·(T回 − T供) 积分
 * 水：ρ = 1000 kg/m³，c = 4.186 kJ/(kg·K)，V 为体积流量(m³/h)。
 */

export interface CoolingInput {
  /** 水体积流量（m³/h） */
  flowM3h: number;
  /** 回水温度（℃） */
  returnTemp: number;
  /** 供水温度（℃） */
  supplyTemp: number;
  /** 运行小时数 */
  hours: number;
  /** 冷量单价（元/kWh，可选） */
  pricePerKWh?: number;
  /** 介质密度（kg/m³，默认 1000） */
  density?: number;
  /** 比热（kJ/(kg·K)，默认 4.186） */
  specificHeat?: number;
}

export interface CoolingResult {
  /** 供回水温差（K） */
  deltaT: number;
  /** 瞬时冷功率（kW） */
  powerKW: number;
  /** 累计冷量（kWh） */
  energyKWh: number;
  /** 冷量费用（元，可选） */
  costYuan?: number;
}

/**
 * 冷量计费
 * @param input 输入参数
 */
export function coolingBilling(input: CoolingInput): CoolingResult {
  const density = input.density && input.density > 0 ? input.density : 1000;
  const heat = input.specificHeat && input.specificHeat > 0 ? input.specificHeat : 4.186;
  const flow = Math.max(0, input.flowM3h || 0);
  const deltaT = (input.returnTemp || 0) - (input.supplyTemp || 0);
  const hours = Math.max(0, input.hours || 0);

  // 质量流量 kg/s = ρ × V(m³/h) / 3600
  const massFlow = (density * flow) / 3600;
  // 冷功率 kW = kg/s × kJ/(kg·K) × K
  const powerKW = massFlow * heat * deltaT;
  const energyKWh = powerKW * hours;
  const costYuan =
    input.pricePerKWh && input.pricePerKWh > 0 ? energyKWh * input.pricePerKWh : undefined;

  return { deltaT, powerKW, energyKWh, costYuan };
}
