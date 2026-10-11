/**
 * C12 · 电阻分压 / 限流电阻计算（纯函数）
 * 分压（PRD #24）：Vout = Vin × R2 ÷ (R1 + R2)
 * 限流（PRD #25）：R = (Vcc − Vf) ÷ If；功耗 P = (Vcc − Vf) × If
 */

/** 分压：由 Vin、R1、R2 求 Vout（V） */
export function voltageDivider(vin: number, r1: number, r2: number): number {
  const total = r1 + r2;
  if (total === 0) return 0;
  return (vin * r2) / total;
}

/**
 * 分压：由 Vin、Vout、R2 反求 R1（Ω）
 * @param vin 输入电压（V）
 * @param vout 目标输出电压（V）
 * @param r2 下臂电阻（Ω）
 */
export function resistorR1ForVout(vin: number, vout: number, r2: number): number {
  if (vout <= 0 || vout >= vin) return NaN;
  return (r2 * (vin - vout)) / vout;
}

/**
 * 分压：由 Vin、Vout、R1 反求 R2（Ω）
 * @param vin 输入电压（V）
 * @param vout 目标输出电压（V）
 * @param r1 上臂电阻（Ω）
 */
export function resistorR2ForVout(vin: number, vout: number, r1: number): number {
  if (vout <= 0 || vout >= vin) return NaN;
  return (r1 * vout) / (vin - vout);
}

/**
 * 限流电阻（Ω）
 * @param vcc 电源电压（V）
 * @param vf 负载正向压降（V，如 LED Vf）
 * @param ifA 目标电流（A）
 */
export function currentLimitResistor(vcc: number, vf: number, ifA: number): number {
  if (ifA <= 0) return NaN;
  return (vcc - vf) / ifA;
}

/**
 * 电阻功耗（W）
 * @param dropV 电阻两端电压（V）
 * @param currentA 电流（A）
 */
export function resistorPower(dropV: number, currentA: number): number {
  return Math.abs(dropV * currentA);
}

/**
 * 电阻分压 / 限流综合结果
 * @param input 参数
 */
export function dividerResult(input: {
  vin: number;
  r1: number;
  r2: number;
}): { vout: number; current: number; powerR1: number; powerR2: number } {
  const vout = voltageDivider(input.vin, input.r1, input.r2);
  const total = input.r1 + input.r2;
  const current = total > 0 ? input.vin / total : 0;
  return {
    vout,
    current,
    powerR1: resistorPower(input.vin - vout, current),
    powerR2: resistorPower(vout, current),
  };
}

/**
 * 限流综合结果（含推荐电阻功率）
 * @param input { vcc, vf, ifA }
 */
export function currentLimitResult(input: {
  vcc: number;
  vf: number;
  ifA: number;
}): { resistor: number; dropV: number; power: number; recommendedWatt: number } {
  const resistor = currentLimitResistor(input.vcc, input.vf, input.ifA);
  const dropV = input.vcc - input.vf;
  const power = resistorPower(dropV, input.ifA);
  // 推荐 2 倍功率余量
  return { resistor, dropV, power, recommendedWatt: power * 2 };
}
