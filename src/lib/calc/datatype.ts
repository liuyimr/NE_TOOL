/**
 * C3 · 数据类型 / 进制换算（INT/DINT/WORD/DWORD/REAL/BCD）（纯函数）
 * 说明位宽、有符号/无符号范围，并提供 BCD 与整型互转。
 */

export type DataTypeId = 'INT' | 'DINT' | 'SINT' | 'WORD' | 'DWORD' | 'REAL' | 'BCD16' | 'BCD32';

export interface DataTypeDef {
  id: DataTypeId;
  label: string;
  /** 位宽 */
  bits: number;
  /** 是否有符号 */
  signed: boolean;
  /** 最小值（数值型） */
  min: number;
  /** 最大值（数值型） */
  max: number;
}

export const DATA_TYPES: DataTypeDef[] = [
  { id: 'SINT', label: 'SINT 短整型', bits: 8, signed: true, min: -128, max: 127 },
  { id: 'INT', label: 'INT 整型', bits: 16, signed: true, min: -32768, max: 32767 },
  { id: 'DINT', label: 'DINT 双整型', bits: 32, signed: true, min: -2147483648, max: 2147483647 },
  { id: 'WORD', label: 'WORD 字（无符号）', bits: 16, signed: false, min: 0, max: 65535 },
  {
    id: 'DWORD',
    label: 'DWORD 双字（无符号）',
    bits: 32,
    signed: false,
    min: 0,
    max: 4294967295,
  },
];

/**
 * 整型 → BCD（每 4 位二进制表示 1 位十进制）
 * @param value 非负整数
 * @returns BCD 数值（以十进制位拼接，如 1234 → 0x1234=4660）
 */
export function toBcd(value: number): number {
  if (!Number.isFinite(value) || value < 0) return NaN;
  let n = Math.floor(value);
  let result = 0;
  let shift = 0;
  while (n > 0) {
    const digit = n % 10;
    result |= digit << shift;
    n = Math.floor(n / 10);
    shift += 4;
  }
  return result >>> 0;
}

/**
 * BCD → 整型
 * @param bcd BCD 数值
 */
export function fromBcd(bcd: number): number {
  if (!Number.isFinite(bcd) || bcd < 0) return NaN;
  let n = Math.floor(bcd);
  let result = 0;
  let factor = 1;
  while (n > 0) {
    const nibble = n & 0xf;
    if (nibble > 9) return NaN; // 非法 BCD
    result += nibble * factor;
    factor *= 10;
    n >>>= 4;
  }
  return result;
}

export interface DatatypeInfo {
  type: DataTypeDef;
  /** 十进制 */
  dec: string;
  /** 二进制（按位宽补零） */
  bin: string;
  /** 十六进制 */
  hex: string;
  /** 是否在范围内 */
  inRange: boolean;
}

/**
 * 获取类型定义
 * @param id 类型 id
 */
export function getDataType(id: DataTypeId): DataTypeDef | undefined {
  return DATA_TYPES.find((t) => t.id === id);
}

/**
 * 查看某数值在指定数据类型下的表示
 * @param value 数值
 * @param id 类型 id
 */
export function datatypeInfo(value: number, id: DataTypeId): DatatypeInfo {
  const type = getDataType(id) ?? DATA_TYPES[1];
  const masked = (() => {
    if (type.bits >= 32) return value >>> 0;
    return (value & ((1 << type.bits) - 1)) >>> 0;
  })();
  return {
    type,
    dec: String(value),
    bin: masked.toString(2).padStart(type.bits, '0'),
    hex: `0x${masked.toString(16).toUpperCase().padStart(type.bits / 4, '0')}`,
    inRange: value >= type.min && value <= type.max,
  };
}
