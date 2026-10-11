/**
 * 数值格式化工具（纯函数，无 React 依赖）
 * 统一显示层舍入：默认 4 位有效数字或 2 位小数（自适应）。
 */

/** 判断是否为有限数 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 按指定小数位四舍五入（返回数值）
 * @param value 数值
 * @param digits 小数位数（默认 2）
 */
export function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return value;
  const p = 10 ** digits;
  // 使用 EPSILON 修正浮点表示误差（如 1.005）
  return Math.round((value + Number.EPSILON) * p) / p;
}

/**
 * 按有效数字四舍五入
 * @param value 数值
 * @param sig 有效数字位数（默认 4）
 */
export function roundSig(value: number, sig = 4): number {
  if (!Number.isFinite(value) || value === 0) return value;
  const d = Math.ceil(Math.log10(Math.abs(value)));
  const power = sig - d;
  const magnitude = 10 ** power;
  return Math.round(value * magnitude) / magnitude;
}

/**
 * 自适应格式化：整数原样；非整数时用「有效数字或小数位」中更简洁者。
 * @param value 数值
 * @param digits 最大小数位（默认 2）
 * @param sig 有效数字（默认 4）
 */
export function formatNumber(value: number | string, digits = 2, sig = 4): string {
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  const byDigit = round(value, digits);
  const bySig = roundSig(value, sig);
  // 选择更接近原值且更简洁的表示
  if (Math.abs(byDigit - value) <= Math.abs(bySig - value)) {
    return String(byDigit);
  }
  return String(bySig);
}

/**
 * 千分位格式化
 * @param value 数值
 * @param digits 小数位（默认 0）
 */
export function thousands(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return String(value);
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * 保留固定小数位（返回字符串）
 * @param value 数值
 * @param digits 小数位（默认 0）
 */
export function fixed(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return String(value);
  return value.toFixed(digits);
}

/**
 * 按 SI（1000）前缀格式化字节/比特等大数
 * @param value 数值
 * @param unit 单位（如 'B'、'bit'）
 * @param digits 小数位（默认 2）
 */
export function formatSI(value: number, unit = '', digits = 2): string {
  if (!Number.isFinite(value)) return String(value);
  const prefixes = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
  const abs = Math.abs(value);
  if (abs < 1000) return `${formatNumber(value, digits)} ${unit}`.trim();
  const exp = Math.min(Math.floor(Math.log10(abs) / 3), prefixes.length - 1);
  const scaled = value / 1000 ** exp;
  return `${formatNumber(scaled, digits)} ${prefixes[exp]}${unit}`.trim();
}

/**
 * 字节数格式化（按 1024 进制，保留「B/KB/MB/GB/TB」）
 * @param bytes 字节数
 * @param digits 小数位（默认 2）
 */
export function formatBytes(bytes: number, digits = 2): string {
  if (!Number.isFinite(bytes)) return String(bytes);
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${formatNumber(bytes, digits)} B`;
  const exp = Math.min(Math.floor(Math.log(abs) / Math.log(1024)), units.length - 1);
  const scaled = bytes / 1024 ** exp;
  return `${formatNumber(scaled, digits)} ${units[exp]}`;
}

/**
 * 判断两数是否近似相等（epsilon 容差）
 * @param a 数 a
 * @param b 数 b
 * @param eps 容差（默认 1e-9）
 */
export function approxEqual(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}
