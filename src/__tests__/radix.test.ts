import { describe, expect, it } from 'vitest';
import { parseBigInt, radixConvert } from '@/lib/calc/radix';

describe('A3 进制转换', () => {
  it('十进制 → 全进制', () => {
    const r = radixConvert('255', 10);
    expect(r.valid).toBe(true);
    expect(r.dec).toBe('255');
    expect(r.bin).toBe('11111111');
    expect(r.oct).toBe('377');
    expect(r.hex).toBe('FF');
    expect(r.bitLength).toBe(8);
  });

  it('按位宽补零', () => {
    const r = radixConvert('255', 10, 16);
    expect(r.bin).toBe('0000000011111111');
  });

  it('负数二进制补码', () => {
    const r = radixConvert('-1', 10, 8);
    expect(r.dec).toBe('-1');
    expect(r.bin).toBe('11111111');
    expect(r.hex).toBe('FF');
  });

  it('十六进制 → 十进制 / 大数精度', () => {
    expect(radixConvert('FF', 16).dec).toBe('255');
    // 超过 Number 安全整数的十六进制
    const big = radixConvert('FFFFFFFFFFFFFFFF', 16);
    expect(big.dec).toBe('18446744073709551615');
    expect(big.bin.length).toBe(64);
  });

  it('非法字符报错', () => {
    expect(radixConvert('12G', 10).valid).toBe(false);
    expect(radixConvert('', 2).valid).toBe(false);
  });

  it('parseBigInt 兼容多进制', () => {
    expect(parseBigInt('1010', 2)).toBe(10n);
    expect(parseBigInt('777', 8)).toBe(511n);
  });
});
