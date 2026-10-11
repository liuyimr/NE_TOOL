import { describe, expect, it } from 'vitest';
import { datatypeInfo, fromBcd, getDataType, toBcd } from '@/lib/calc/datatype';

describe('C3 数据类型 / BCD', () => {
  it('BCD 与整型互转', () => {
    expect(toBcd(1234)).toBe(0x1234);
    expect(fromBcd(0x1234)).toBe(1234);
    expect(fromBcd(toBcd(2024))).toBe(2024);
  });

  it('非法 BCD 返回 NaN', () => {
    expect(Number.isNaN(fromBcd(0x0a))).toBe(true);
  });

  it('WORD 位宽与十六进制', () => {
    const info = datatypeInfo(255, 'WORD');
    expect(info.bin).toBe('0000000011111111');
    expect(info.hex).toBe('0x00FF');
    expect(info.inRange).toBe(true);
  });

  it('INT 范围判定', () => {
    const t = getDataType('INT')!;
    expect(t.min).toBe(-32768);
    expect(t.max).toBe(32767);
    expect(datatypeInfo(40000, 'INT').inRange).toBe(false);
  });
});
