/**
 * C4 · IEEE754 浮点转换（纯函数）
 * 单精度（32 位）/ 双精度（64 位），支持大端/小端字节序。
 * 用于通信协议中浮点数的 4/8 字节解析。
 */

export type FloatPrecision = 'single' | 'double';

const SIZES: Record<FloatPrecision, number> = { single: 4, double: 8 };

/** 数值 → 字节数组 */
export function floatToBytes(value: number, precision: FloatPrecision, littleEndian = false): Uint8Array {
  const size = SIZES[precision];
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  if (precision === 'single') view.setFloat32(0, value, littleEndian);
  else view.setFloat64(0, value, littleEndian);
  return new Uint8Array(buffer);
}

/** 字节数组 → 数值 */
export function bytesToFloat(
  bytes: Uint8Array,
  precision: FloatPrecision,
  littleEndian = false,
): number {
  const size = SIZES[precision];
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  for (let i = 0; i < size; i++) view.setUint8(i, bytes[i] ?? 0);
  return precision === 'single' ? view.getFloat32(0, littleEndian) : view.getFloat64(0, littleEndian);
}

/** 字节数组 → 十六进制字符串（空格分隔，大写） */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

/** 十六进制字符串 → 字节数组（忽略空格与 0x） */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  const len = Math.floor(clean.length / 2);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * 数值 → 十六进制字符串
 * @param value 数值
 * @param precision 精度
 * @param littleEndian 是否小端
 */
export function floatToHex(value: number, precision: FloatPrecision, littleEndian = false): string {
  return bytesToHex(floatToBytes(value, precision, littleEndian));
}

/**
 * 十六进制字符串 → 数值
 * @param hex 十六进制字符串（4 或 8 字节）
 * @param precision 精度
 * @param littleEndian 是否小端
 */
export function hexToFloat(hex: string, precision: FloatPrecision, littleEndian = false): number {
  return bytesToFloat(hexToBytes(hex), precision, littleEndian);
}
