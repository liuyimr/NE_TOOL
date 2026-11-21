/**
 * 32 位数据字序（字节排列）换算（纯函数）
 * ------------------------------------------------------------------
 * Modbus / PLC / 仪表的 32 位数据（DWORD / REAL）在两个寄存器之间传输时，
 * 各厂家对「哪个字节先发」并不统一，工程上常见四种排列：
 *
 *   ABCD —— 大端（原序，Big-Endian）
 *   CDAB —— 字交换（两个 16 位字互换）
 *   BADC —— 字节交换（每个字内部两字节互换）
 *   DCBA —— 小端（全反，Little-Endian）
 *
 * 记输入字节按书写顺序为 B0 B1 B2 B3（对应字母 A B C D），重排后一律按 **大端**
 * 解释为 uint32，再由它派生 int32（补码）与 float32（IEEE754 单精度）。
 * 本模块只做字节重排与解释，不含任何工程量换算。
 */

/** 四种字序标识 */
export type WordOrder = 'ABCD' | 'CDAB' | 'BADC' | 'DCBA';

/** 展示顺序：大端 → 字交换 → 字节交换 → 小端 */
export const WORD_ORDERS: WordOrder[] = ['ABCD', 'CDAB', 'BADC', 'DCBA'];

/** 字序 → 工程含义（用于界面说明） */
export const WORD_ORDER_LABEL: Record<WordOrder, string> = {
  ABCD: '大端（原序）',
  CDAB: '字交换',
  BADC: '字节交换',
  DCBA: '小端（全反）',
};

/**
 * 字序 → 输出字节取自输入字节的下标序列
 * 输入记为 [B0, B1, B2, B3]（书写顺序）：
 *   ABCD = 原序          → [0, 1, 2, 3]
 *   CDAB = 字交换        → [2, 3, 0, 1]
 *   BADC = 字节交换      → [1, 0, 3, 2]
 *   DCBA = 全反          → [3, 2, 1, 0]
 */
const ORDER_PERMUTATION: Record<WordOrder, readonly [number, number, number, number]> = {
  ABCD: [0, 1, 2, 3],
  CDAB: [2, 3, 0, 1],
  BADC: [1, 0, 3, 2],
  DCBA: [3, 2, 1, 0],
};

/** 单个字序的换算结果 */
export interface WordOrderResult {
  /** 字序标识 */
  order: WordOrder;
  /** 重排后的 8 位十六进制（大写，无分隔） */
  hex: string;
  /** 按大端解释的无符号 32 位整数 */
  uint32: number;
  /** 按补码解释的有符号 32 位整数 */
  int32: number;
  /** 按 IEEE754 单精度解释的浮点数 */
  float32: number;
}

/**
 * 解析「4 字节十六进制」输入
 * 支持 `3F800000` / `3F 80 00 00` / `0x3F800000`（含大小写与前缀、任意空白）。
 * 必须**恰好 4 字节**（8 个十六进制字符），否则返回 null。
 * @param input 用户输入
 * @returns 4 个字节值（0~255），或 null（格式非法）
 */
export function parseHexBytes4(input: string): number[] | null {
  if (typeof input !== 'string') return null;
  // 去掉全部空白字符（含中间分组空格），再剥离 0x / 0X 前缀
  let text = input.replace(/\s+/g, '');
  if (/^0[xX]/.test(text)) text = text.slice(2);
  if (!/^[0-9a-fA-F]{8}$/.test(text)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    bytes.push(parseInt(text.slice(i * 2, i * 2 + 2), 16));
  }
  return bytes;
}

/** 数字 → 两位大写十六进制 */
function toHexByte(value: number): string {
  return (value & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

/** 4 字节 → 8 位大写十六进制字符串 */
function bytesToHex(bytes: number[]): string {
  return bytes.map(toHexByte).join('');
}

/** 按大端把 4 字节解释为 uint32 */
function bytesToUint32(bytes: number[]): number {
  const b0 = bytes[0] ?? 0;
  const b1 = bytes[1] ?? 0;
  const b2 = bytes[2] ?? 0;
  const b3 = bytes[3] ?? 0;
  return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
}

/** 按大端把 4 字节解释为 IEEE754 单精度浮点 */
function bytesToFloat32(bytes: number[]): number {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint8(0, bytes[0] ?? 0);
  view.setUint8(1, bytes[1] ?? 0);
  view.setUint8(2, bytes[2] ?? 0);
  view.setUint8(3, bytes[3] ?? 0);
  return view.getFloat32(0, false);
}

/** 按字序重排字节 */
function reorderBytes(bytes: number[], order: WordOrder): number[] {
  return ORDER_PERMUTATION[order].map((index) => bytes[index] ?? 0);
}

/**
 * 给出同一份 4 字节数据在四种字序下的解释结果
 * @param input 4 字节十六进制字符串（可含空格 / 0x 前缀）
 * @returns 四种字序的结果（顺序见 WORD_ORDERS）；输入非法返回 null
 */
export function describeWordOrders(input: string): WordOrderResult[] | null {
  const bytes = parseHexBytes4(input);
  if (!bytes) return null;
  return WORD_ORDERS.map((order) => {
    const arranged = reorderBytes(bytes, order);
    const uint32 = bytesToUint32(arranged);
    return {
      order,
      hex: bytesToHex(arranged),
      uint32,
      int32: uint32 | 0,
      float32: bytesToFloat32(arranged),
    };
  });
}
