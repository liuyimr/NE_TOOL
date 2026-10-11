/**
 * C2 · PT100 / 热电偶温度换算（纯函数）
 * PT100（Callendar-Van Dusen）：
 *   t ≥ 0：R(t) = R0·(1 + A·t + B·t²)
 *   t < 0：R(t) = R0·(1 + A·t + B·t² + C·(t−100)·t³)
 *   其中 R0=100Ω，A=3.9083e-3，B=−5.775e-7，C=−4.183e-12。
 * 热电偶：近似按平均灵敏度（mV/℃）线性换算，用于现场快速估算。
 */

/** PT100 标准系数 */
const PT100_R0 = 100;
const PT100_A = 3.9083e-3;
const PT100_B = -5.775e-7;
const PT100_C = -4.183e-12;

/**
 * 温度 → PT100 电阻值
 * @param tempC 温度（℃）
 */
export function pt100Resistance(tempC: number): number {
  const t = tempC;
  if (t >= 0) {
    return PT100_R0 * (1 + PT100_A * t + PT100_B * t * t);
  }
  return PT100_R0 * (1 + PT100_A * t + PT100_B * t * t + PT100_C * (t - 100) * t ** 3);
}

/**
 * PT100 电阻值 → 温度（℃）
 * 先用近似式给出初值，再用牛顿迭代收敛。
 * @param resistance 电阻值（Ω）
 */
export function pt100Temperature(resistance: number): number {
  if (resistance <= 0) return NaN;
  // 初值：中温段近似 t ≈ (R - 100) / 0.385
  let t = (resistance - PT100_R0) / 0.385;
  for (let i = 0; i < 20; i++) {
    const f = pt100Resistance(t) - resistance;
    // 导数近似（数值微分）
    const df = (pt100Resistance(t + 1e-4) - pt100Resistance(t - 1e-4)) / 2e-4;
    if (df === 0) break;
    const step = f / df;
    t -= step;
    if (Math.abs(step) < 1e-9) break;
  }
  return t;
}

/** 热电偶类型 → 平均灵敏度（mV/℃） */
export const THERMOCOUPLE_SENSITIVITY: Record<string, number> = {
  K: 0.041,
  J: 0.052,
  T: 0.0425,
  E: 0.061,
  N: 0.0305,
  R: 0.0115,
  S: 0.0096,
  B: 0.0065,
};

/**
 * 热电偶热电势 → 温度（℃）
 * @param mv 热电势（mV）
 * @param type 分度号（如 'K'）
 */
export function thermocoupleToTemp(mv: number, type = 'K'): number {
  const sensitivity = THERMOCOUPLE_SENSITIVITY[type] ?? 0.041;
  if (sensitivity === 0) return NaN;
  return mv / sensitivity;
}

/**
 * 温度 → 热电偶热电势（mV）
 * @param tempC 温度（℃）
 * @param type 分度号
 */
export function tempToThermocouple(tempC: number, type = 'K'): number {
  const sensitivity = THERMOCOUPLE_SENSITIVITY[type] ?? 0.041;
  return tempC * sensitivity;
}

/** 摄氏度 → 华氏度 */
export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

/** 华氏度 → 摄氏度 */
export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

/** 摄氏度 → 开尔文 */
export function celsiusToKelvin(c: number): number {
  return c + 273.15;
}
