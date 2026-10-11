/**
 * S16 · 应急照明时长与电池容量（纯函数）
 * 公式（PRD #13）：C = (P·t)/(U·η·DoD)  ，单位 Ah
 * 说明：P 为灯具总功率（W）、t 为要求持续时间（h）、U 为电池标称电压（V）、
 *       η 为逆变/放电综合效率、DoD 为允许放电深度。消防应急照明持续时间一般 ≥30 min，
 *       高层/人员密集场所常要求 ≥90 min。
 */

export interface EmergencyInput {
  /** 单灯功率（W） */
  lampW: number;
  /** 灯具数量 */
  count: number;
  /** 要求持续时间（min） */
  durationMin: number;
  /** 电池标称电压（V，默认 24） */
  batteryV?: number;
  /** 综合效率（默认 0.85） */
  efficiency?: number;
  /** 允许放电深度 DoD（默认 0.8） */
  dod?: number;
}

export interface EmergencyResult {
  /** 灯具总功率（W） */
  totalPowerW: number;
  /** 持续时长（h） */
  durationH: number;
  /** 所需电池容量（Ah） */
  capacityAh: number;
  /** 电池能量（Wh） */
  energyWh: number;
  /** 是否满足 ≥30 min */
  meets30: boolean;
  /** 是否满足 ≥90 min */
  meets90: boolean;
}

/**
 * 应急照明电池容量
 * @param input 输入参数
 */
export function emergencyBattery(input: EmergencyInput): EmergencyResult {
  const lampW = Math.max(0, input.lampW || 0);
  const count = input.count && input.count > 0 ? input.count : 1;
  const durationMin = Math.max(0, input.durationMin || 0);
  const batteryV = input.batteryV && input.batteryV > 0 ? input.batteryV : 24;
  const efficiency = input.efficiency && input.efficiency > 0 ? Math.min(1, input.efficiency) : 0.85;
  const dod = input.dod && input.dod > 0 ? Math.min(1, input.dod) : 0.8;

  const totalPowerW = lampW * count;
  const durationH = durationMin / 60;
  const capacityAh = (totalPowerW * durationH) / (batteryV * efficiency * dod);
  const energyWh = totalPowerW * durationH;

  return {
    totalPowerW,
    durationH,
    capacityAh,
    energyWh,
    meets30: durationMin >= 30,
    meets90: durationMin >= 90,
  };
}
