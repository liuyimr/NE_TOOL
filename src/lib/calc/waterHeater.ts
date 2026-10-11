/**
 * W13 · 热水耗热量与加热功率（纯函数）
 * 公式（PRD #21）：P = 1.163·V·ΔT/(t·1000·η) （kW）
 * 说明：V 为水量（L）、ΔT 为温升（℃）、t 为加热时间（h）、η 为加热效率。
 *      系数 1.163 源于水的比热 4.187 kJ/(kg·℃) 与小时换算（4.187/3600×1000）。
 *      校核式 P = c·m·ΔT/(3600·t·η)，两式等价。
 */

export interface WaterHeaterInput {
  /** 加热水量 V（L） */
  volumeL: number;
  /** 进水温度（℃） */
  coldTemp: number;
  /** 出水温度（℃） */
  hotTemp: number;
  /** 加热时间 t（h） */
  heatHours: number;
  /** 加热效率 η（默认 0.9） */
  efficiency?: number;
}

export interface WaterHeaterResult {
  /** 温升 ΔT（℃） */
  deltaT: number;
  /** 单位时间水量（L/h） */
  volumePerHour: number;
  /** 所需加热功率（kW） */
  powerKw: number;
  /** 加热所需热量（kWh） */
  energyKwh: number;
  /** 每小时耗热量（MJ/h） */
  heatPerHourMJ: number;
}

/**
 * 热水加热功率
 * @param input 输入参数
 */
export function waterHeater(input: WaterHeaterInput): WaterHeaterResult {
  const volumeL = Math.max(0, input.volumeL || 0);
  const deltaT = Math.max(0, (input.hotTemp || 0) - (input.coldTemp || 0));
  const heatHours = input.heatHours && input.heatHours > 0 ? input.heatHours : 1;
  const efficiency =
    input.efficiency && input.efficiency > 0 && input.efficiency <= 1 ? input.efficiency : 0.9;

  const powerKw = (1.163 * volumeL * deltaT) / (heatHours * 1000 * efficiency);
  const energyKwh = powerKw * heatHours;
  const volumePerHour = volumeL / heatHours;
  // 耗热量：Q = c·m·ΔT = 4.187·V·ΔT (kJ) → 折算到每小时为 MJ
  const heatPerHourMJ = (4.187 * volumePerHour * deltaT) / 1000;

  return { deltaT, volumePerHour, powerKw, energyKwh, heatPerHourMJ };
}
