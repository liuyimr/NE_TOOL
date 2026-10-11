/**
 * C7 · 三相电机电流 / 功率 / 扭矩 / 转速计算（纯函数）
 * 公式（PRD #18~#21）：
 *   三相电流 I = P ÷ (√3 × U × cosφ × η)
 *   电机功率 P = √3 × U × I × cosφ × η
 *   扭矩 T(N·m) = 9550 × P(kW) ÷ n(rpm)
 *   同步转速 n = 60·f ÷ p（p 为极对数）
 */

export type PhaseMode = 'single' | 'three';

const SQRT3 = Math.sqrt(3);

export interface MotorCurrentInput {
  /** 功率（kW） */
  powerKW: number;
  /** 电压（V） */
  voltage: number;
  /** 功率因数（默认 0.85） */
  powerFactor?: number;
  /** 效率（默认 0.9） */
  efficiency?: number;
  /** 相制（默认三相） */
  phase?: PhaseMode;
}

export interface MotorPowerInput {
  /** 电压（V） */
  voltage: number;
  /** 电流（A） */
  current: number;
  /** 功率因数（默认 0.85） */
  powerFactor?: number;
  /** 效率（默认 0.9） */
  efficiency?: number;
  /** 相制（默认三相） */
  phase?: PhaseMode;
}

/**
 * 电机额定电流（A）
 * @param input 输入参数
 */
export function motorCurrent(input: MotorCurrentInput): number {
  const pf = input.powerFactor && input.powerFactor > 0 ? input.powerFactor : 0.85;
  const eff = input.efficiency && input.efficiency > 0 ? input.efficiency : 0.9;
  const phase = input.phase ?? 'three';
  const p = (input.powerKW || 0) * 1000;
  if (input.voltage <= 0 || pf <= 0 || eff <= 0) return 0;
  return phase === 'three'
    ? p / (SQRT3 * input.voltage * pf * eff)
    : p / (input.voltage * pf * eff);
}

/**
 * 电机功率（kW）
 * @param input 输入参数
 */
export function motorPower(input: MotorPowerInput): number {
  const pf = input.powerFactor && input.powerFactor > 0 ? input.powerFactor : 0.85;
  const eff = input.efficiency && input.efficiency > 0 ? input.efficiency : 0.9;
  const phase = input.phase ?? 'three';
  const p =
    phase === 'three'
      ? SQRT3 * input.voltage * input.current * pf * eff
      : input.voltage * input.current * pf * eff;
  return p / 1000;
}

/**
 * 电机扭矩（N·m）
 * @param powerKW 功率（kW）
 * @param rpm 转速（rpm）
 */
export function motorTorque(powerKW: number, rpm: number): number {
  if (rpm <= 0) return 0;
  return (9550 * powerKW) / rpm;
}

/**
 * 同步转速（rpm）
 * @param frequency 电源频率（Hz，默认 50）
 * @param polePairs 极对数（2 极=1，4 极=2，6 极=3…）
 */
export function synchronousSpeed(frequency: number, polePairs: number): number {
  if (polePairs <= 0) return 0;
  return (60 * frequency) / polePairs;
}

/**
 * 由极数换算极对数
 * @param poles 极数（2/4/6/8…）
 */
export function polesToPairs(poles: number): number {
  return Math.max(1, Math.round(poles / 2));
}

export interface MotorFullResult {
  /** 额定电流（A） */
  current: number;
  /** 额定功率（kW） */
  powerKW: number;
  /** 扭矩（N·m） */
  torque: number;
  /** 同步转速（rpm） */
  syncSpeed: number;
}

/**
 * 电机综合计算
 * @param input 参数（功率/电压/功率因数/效率/转速/电源频率/极数）
 */
export function motorFull(input: {
  powerKW: number;
  voltage: number;
  powerFactor?: number;
  efficiency?: number;
  rpm?: number;
  frequency?: number;
  poles?: number;
  phase?: PhaseMode;
}): MotorFullResult {
  const current = motorCurrent(input);
  const powerKW = input.powerKW || 0;
  const rpm = input.rpm && input.rpm > 0 ? input.rpm : 0;
  const frequency = input.frequency && input.frequency > 0 ? input.frequency : 50;
  const polePairs = input.poles && input.poles > 0 ? polesToPairs(input.poles) : 2;
  return {
    current,
    powerKW,
    torque: rpm > 0 ? motorTorque(powerKW, rpm) : 0,
    syncSpeed: synchronousSpeed(frequency, polePairs),
  };
}
