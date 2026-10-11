/**
 * C1 · 模拟量换算（4-20mA / 0-10V ↔ 工程量）（纯函数）
 * 公式（PRD #15）：工程量 = (原始值 − 原始下限) ÷ (原始上限 − 原始下限) × 量程差 + 量程下限
 * 提供常见 PLC 原始量程预设（西门子 S7 单/双极性、4-20mA）。
 */

export interface AnalogInput {
  /** 原始值（如 PLC 采样值 0-27648） */
  raw: number;
  /** 原始量程下限 */
  rawMin: number;
  /** 原始量程上限 */
  rawMax: number;
  /** 工程量程下限 */
  engMin: number;
  /** 工程量程上限 */
  engMax: number;
}

export interface AnalogResult {
  /** 换算后的工程量 */
  engineering: number;
  /** 线性斜率 k（工程量 / 原始值） */
  slope: number;
  /** 线性截距 b */
  intercept: number;
  /** 由工程量反算的原始值 */
  rawFromEng: number;
}

export interface AnalogPreset {
  name: string;
  rawMin: number;
  rawMax: number;
}

/** 常见 PLC 原始量程预设 */
export const ANALOG_PRESETS: AnalogPreset[] = [
  { name: 'S7 单极性 0-27648', rawMin: 0, rawMax: 27648 },
  { name: 'S7 双极性 -27648~27648', rawMin: -27648, rawMax: 27648 },
  { name: 'S7 4-20mA 5530-27648', rawMin: 5530, rawMax: 27648 },
  { name: '12 位 0-4095', rawMin: 0, rawMax: 4095 },
  { name: '16 位 0-65535', rawMin: 0, rawMax: 65535 },
  { name: '标准 4-20mA 0-27648', rawMin: 0, rawMax: 27648 },
];

/** 计算线性斜率与截距 */
function slopeIntercept(input: AnalogInput): { k: number; b: number } {
  const rawSpan = input.rawMax - input.rawMin;
  if (rawSpan === 0) return { k: 0, b: input.engMin };
  const k = (input.engMax - input.engMin) / rawSpan;
  const b = input.engMin - input.rawMin * k;
  return { k, b };
}

/**
 * 原始值 → 工程量
 * @param input 输入参数
 */
export function analogToEng(input: AnalogInput): number {
  const { k, b } = slopeIntercept(input);
  return input.raw * k + b;
}

/**
 * 工程量 → 原始值
 * @param input 输入参数（raw 字段被忽略）
 * @param eng 目标工程量
 */
export function engToRaw(input: AnalogInput, eng: number): number {
  const { k, b } = slopeIntercept(input);
  if (k === 0) return input.rawMin;
  return (eng - b) / k;
}

/**
 * 模拟量换算完整结果
 * @param input 输入参数
 */
export function analogConvert(input: AnalogInput): AnalogResult {
  const { k, b } = slopeIntercept(input);
  const engineering = input.raw * k + b;
  return {
    engineering,
    slope: k,
    intercept: b,
    rawFromEng: k === 0 ? input.rawMin : (engineering - b) / k,
  };
}
