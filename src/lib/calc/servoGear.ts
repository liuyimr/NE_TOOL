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
  /** 最简整数比分子（无法给出整数比时为 0） */
  numerator: number;
  /** 最简整数比分母（无法给出整数比时为 0） */
  denominator: number;
  /** 是否能给出稳妥的最简整数比（量级过大/过小时为 false） */
  fractionAvailable: boolean;
  /** 每转指令脉冲数（指令脉冲 / 负载转） */
  pulsesPerRev: number;
  /** 目标脉冲当量（mm） */
  pulseEquiv: number;
  /** 是否在常见驱动器可设范围内 */
  inRange: boolean;
  /** 提示文字（无法给出整数比 / 超出可设范围等） */
  note?: string;
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

/**
 * 将浮点数转最简整数比（分母上限 1e6）
 * @returns 有限性守卫：若分子/分母溢出为非有限数，返回 null（调用方需处理为「无法给出整数比」）
 */
function toFraction(value: number): { num: number; den: number } | null {
  const scale = 1_000_000;
  const scaled = Math.abs(value) * scale;
  if (!Number.isFinite(scaled)) return null; // 量级过大，乘 scale 即溢出
  const num0 = Math.round(scaled);
  const den0 = scale;
  if (!Number.isFinite(num0)) return null;
  const g = gcd(num0, den0);
  const num = (value < 0 ? -1 : 1) * (num0 / g);
  const den = den0 / g;
  if (!Number.isFinite(num) || !Number.isFinite(den)) return null;
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
      fractionAvailable: false,
      pulsesPerRev: 0,
      pulseEquiv: d > 0 ? d : 0,
      inRange: false,
    };
  }

  const ratio = (E * d * i) / P;
  const pulsesPerRev = P / d;

  // 极端量级兜底：ratio 或 pulsesPerRev 溢出为非有限数时判为不可计算，避免输出 Infinity/NaN
  if (!Number.isFinite(ratio) || !Number.isFinite(pulsesPerRev)) {
    return {
      valid: false,
      error: '齿轮比或每转脉冲数超出可计算范围，请核对脉冲当量等参数',
      ratio: 0,
      numerator: 0,
      denominator: 0,
      fractionAvailable: false,
      pulsesPerRev: 0,
      pulseEquiv: d,
      inRange: false,
    };
  }

  const frac = toFraction(ratio);

  const inRange = ratio >= GEAR_RATIO_MIN && ratio <= GEAR_RATIO_MAX;
  const notes: string[] = [];
  if (!frac) notes.push('齿轮比量级过大/过小，无法稳妥给出最简整数比，请核对参数');
  if (!inRange) notes.push('齿轮比超出常见驱动器可设范围（1/50 ~ 50）');

  return {
    valid: true,
    ratio,
    numerator: frac ? frac.num : 0,
    denominator: frac ? frac.den : 0,
    fractionAvailable: frac !== null,
    pulsesPerRev,
    pulseEquiv: d,
    inRange,
    note: notes.length > 0 ? notes.join('；') : undefined,
  };
}
