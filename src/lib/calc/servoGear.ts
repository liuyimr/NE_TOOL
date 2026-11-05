/**
 * P17 · 伺服电子齿轮比与脉冲当量（纯函数）
 * 公式：电子齿轮比 = 编码器分辨率 × 脉冲当量 × 减速比 ÷ 丝杠导程
 *      ratio = E·Δ·i / P
 * 其中 E=pulses/rev、Δ=mm/pulse、i=减速比、P=导程 mm/rev。
 * 输出齿轮比、最简整数比、每转指令脉冲数与定位精度，并做可设范围校验（常见 1/50~50）。
 */

/** 齿轮比可设范围（常见驱动器限值） */
export const GEAR_RATIO_MIN = 1 / 50;
export const GEAR_RATIO_MAX = 50;

export interface ServoGearInput {
  /** 编码器分辨率 E（pulses/rev） */
  encoderRes: number;
  /** 丝杠导程 / 每转行程 P（mm/rev） */
  pitch: number;
  /** 减速比 i（>0） */
  gearRatio: number;
  /** 目标脉冲当量 Δ（mm/pulse） */
  pulseEquiv: number;
}

export interface ServoGearResult {
  valid: boolean;
  error?: string;
  /** 电子齿轮比 */
  ratio: number;
  /** 最简整数比分子 */
  numerator: number;
  /** 最简整数比分母 */
  denominator: number;
  /** 每转指令脉冲数（指令脉冲 / 负载转） */
  pulsesPerRev: number;
  /** 目标脉冲当量（mm） */
  pulseEquiv: number;
  /** 是否在常见驱动器可设范围内 */
  inRange: boolean;
}

/** 最大公约数 */
function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

/** 将浮点数转最简整数比（分母上限 1e6） */
function toFraction(value: number): { num: number; den: number } {
  const scale = 1_000_000;
  const num0 = Math.round(Math.abs(value) * scale);
  const den0 = scale;
  const g = gcd(num0, den0);
  const num = (value < 0 ? -1 : 1) * (num0 / g);
  const den = den0 / g;
  return { num, den };
}

/**
 * 伺服电子齿轮比与脉冲当量
 * @param input 输入参数
 */
export function servoGear(input: ServoGearInput): ServoGearResult {
  const E = Number.isFinite(input.encoderRes) ? input.encoderRes : 0;
  const P = Number.isFinite(input.pitch) ? input.pitch : 0;
  const i = Number.isFinite(input.gearRatio) ? input.gearRatio : 0;
  const d = Number.isFinite(input.pulseEquiv) ? input.pulseEquiv : 0;

  if (!(E > 0) || !(P > 0) || !(i > 0) || !(d > 0)) {
    return {
      valid: false,
      error: '编码器分辨率、丝杠导程、减速比、目标脉冲当量都必须大于 0',
      ratio: 0,
      numerator: 0,
      denominator: 0,
      pulsesPerRev: 0,
      pulseEquiv: d > 0 ? d : 0,
      inRange: false,
    };
  }

  const ratio = (E * d * i) / P;
  const { num, den } = toFraction(ratio);
  const pulsesPerRev = P / d;
  const inRange = ratio >= GEAR_RATIO_MIN && ratio <= GEAR_RATIO_MAX;

  return {
    valid: true,
    ratio,
    numerator: num,
    denominator: den,
    pulsesPerRev,
    pulseEquiv: d,
    inRange,
  };
}
