/**
 * A3 · 进制转换器（纯函数，BigInt 实现，避免大数精度丢失）
 * 支持 2/8/10/16 进制互转，可选位宽（补零 / 负数二进制补码表示）。
 */

/** 支持的进制 */
export type Radix = 2 | 8 | 10 | 16;

export interface RadixResult {
  valid: boolean;
  error?: string;
  /** 十进制（可能为负数，字符串） */
  dec: string;
  /** 二进制 */
  bin: string;
  /** 八进制 */
  oct: string;
  /** 十六进制（大写） */
  hex: string;
  /** 去除符号后的位宽（二进制位数） */
  bitLength: number;
}

const EMPTY: RadixResult = {
  valid: false,
  dec: '',
  bin: '',
  oct: '',
  hex: '',
  bitLength: 0,
};

/** 数字字符的进制合法性校验 */
function validateDigits(value: string, base: number): boolean {
  const patterns: Record<number, RegExp> = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^[0-9]+$/,
    16: /^[0-9a-fA-F]+$/,
  };
  return patterns[base].test(value);
}

/**
 * 进制转换
 * @param value 原始字符串（可含前导负号）
 * @param fromBase 源进制（2/8/10/16）
 * @param bitWidth 位宽（可选）：>0 时对负数采用二进制补码并按位宽补零
 */
export function radixConvert(value: string, fromBase: Radix, bitWidth = 0): RadixResult {
  const raw = (value ?? '').trim();
  if (raw === '') return { ...EMPTY, error: '请输入数值' };
  if (![2, 8, 10, 16].includes(fromBase)) {
    return { ...EMPTY, error: '源进制需为 2/8/10/16' };
  }

  let negative = false;
  let body = raw;
  if (body.startsWith('-')) {
    negative = true;
    body = body.slice(1);
  } else if (body.startsWith('+')) {
    body = body.slice(1);
  }

  // 去除常见前缀
  if (fromBase === 16 && /^0x/i.test(body)) body = body.slice(2);
  if (fromBase === 2 && /^0b/i.test(body)) body = body.slice(2);
  if (fromBase === 8 && /^0o/i.test(body)) body = body.slice(2);

  if (body === '' || !validateDigits(body, fromBase)) {
    return { ...EMPTY, error: `${fromBase} 进制数值非法` };
  }

  const absValue = parseBigInt(body, fromBase);
  const bitLength = body.length === 0 ? 0 : absValue.toString(2).length;

  if (negative && bitWidth > 0) {
    // 二进制补码：mask = 2^bitWidth
    const mask = 1n << BigInt(bitWidth);
    const twos = (mask - absValue) & (mask - 1n);
    return {
      valid: true,
      dec: (-absValue).toString(),
      bin: twos.toString(2).padStart(bitWidth, '0'),
      oct: twos.toString(8),
      hex: twos.toString(16).toUpperCase(),
      bitLength,
    };
  }

  const signed = negative ? -absValue : absValue;
  return {
    valid: true,
    dec: signed.toString(),
    bin: padBin(signed, bitWidth),
    oct: signed.toString(8),
    hex: signed.toString(16).toUpperCase(),
    bitLength,
  };
}

/** 按需位宽补零的二进制字符串 */
function padBin(value: bigint, bitWidth: number): string {
  const s = value.toString(2);
  if (bitWidth > 0 && s.length < bitWidth) return s.padStart(bitWidth, '0');
  return s;
}

/**
 * 将指定进制字符串解析为 BigInt（不依赖 BigInt 前缀解析，兼容 2/8 进制）
 * @param body 纯数字体（无符号、无前缀）
 * @param base 进制
 */
export function parseBigInt(body: string, base: number): bigint {
  let result = 0n;
  const b = BigInt(base);
  const lower = body.toLowerCase();
  for (const ch of lower) {
    const digit = BigInt(parseInt(ch, base));
    result = result * b + digit;
  }
  return result;
}
