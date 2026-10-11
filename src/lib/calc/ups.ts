/**
 * B5 · 机房 UPS 容量与后备电池估算（纯函数）
 * 公式（PRD #10）：S(kVA) = P(kW) ÷ cosφ
 *               电池 Ah = P(W) × t(h) ÷ (U(电池) × η × 放电系数)
 */

export interface UpsInput {
  /** 负载功率（kW） */
  loadKW: number;
  /** 功率因数（默认 0.9） */
  powerFactor?: number;
  /** 后备时间（小时） */
  backupHours: number;
  /** 电池组电压（V，默认 240） */
  batteryVoltage?: number;
  /** 逆变效率（默认 0.9） */
  efficiency?: number;
  /** 放电系数 / 老化系数（默认 0.8） */
  dischargeFactor?: number;
  /** UPS 容量余量系数（默认 1.25） */
  margin?: number;
}

export interface UpsResult {
  /** 视在功率（kVA，未含余量） */
  apparentKVA: number;
  /** 推荐 UPS 容量（kVA，含余量） */
  recommendedKVA: number;
  /** 有功功率（kW） */
  activeKW: number;
  /** 电池容量（Ah） */
  batteryAh: number;
  /** 电池组总能量（kWh） */
  batteryKWh: number;
}

/**
 * UPS 容量与电池估算
 * @param input 输入参数
 */
export function upsCapacity(input: UpsInput): UpsResult {
  const loadKW = Math.max(0, input.loadKW || 0);
  const pf = input.powerFactor && input.powerFactor > 0 ? input.powerFactor : 0.9;
  const hours = Math.max(0, input.backupHours || 0);
  const uBatt = input.batteryVoltage && input.batteryVoltage > 0 ? input.batteryVoltage : 240;
  const eff = input.efficiency && input.efficiency > 0 ? input.efficiency : 0.9;
  const discharge = input.dischargeFactor && input.dischargeFactor > 0 ? input.dischargeFactor : 0.8;
  const margin = input.margin && input.margin > 0 ? input.margin : 1.25;

  const apparentKVA = loadKW / pf;
  const recommendedKVA = apparentKVA * margin;
  const activeKW = loadKW;
  const batteryAh = (loadKW * 1000 * hours) / (uBatt * eff * discharge);
  const batteryKWh = (uBatt * batteryAh) / 1000;

  return { apparentKVA, recommendedKVA, activeKW, batteryAh, batteryKWh };
}
