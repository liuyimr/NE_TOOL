import { describe, expect, it } from 'vitest';
import { bytesToHex, floatToHex, hexToBytes, hexToFloat } from '@/lib/calc/ieee754';

describe('C4 IEEE754 浮点转换', () => {
  it('单精度 1.0 大端 = 3F800000', () => {
    expect(floatToHex(1.0, 'single')).toBe('3F 80 00 00');
    expect(hexToFloat('3F 80 00 00', 'single')).toBe(1);
  });

  it('-0.5 单精度 = BF000000', () => {
    expect(floatToHex(-0.5, 'single')).toBe('BF 00 00 00');
  });

  it('小端字节序反转', () => {
    expect(floatToHex(1.0, 'single', true)).toBe('00 00 80 3F');
    expect(hexToFloat('00 00 80 3F', 'single', true)).toBeCloseTo(1, 6);
  });

  it('单精度往返', () => {
    const v = 3.14;
    expect(hexToFloat(floatToHex(v, 'single'), 'single')).toBeCloseTo(v, 5);
  });

  it('双精度往返', () => {
    const v = -1234.5678;
    expect(hexToFloat(floatToHex(v, 'double'), 'double')).toBeCloseTo(v, 9);
  });

  it('HEX 解析容错（空格/0x）', () => {
    expect(bytesToHex(hexToBytes('0x3F 0x80 0x00 0x00'))).toBe('3F 80 00 00');
  });
});
