import { describe, expect, it } from 'vitest';
import { analogConvert, analogToEng, engToRaw } from '@/lib/calc/analog';

describe('C1 模拟量换算', () => {
  const base = { raw: 13824, rawMin: 0, rawMax: 27648, engMin: 0, engMax: 100 };

  it('中点原始值 → 50 工程量', () => {
    expect(analogToEng(base)).toBeCloseTo(50, 10);
  });

  it('正反算互逆', () => {
    expect(engToRaw(base, 50)).toBeCloseTo(13824, 6);
    expect(engToRaw(base, 0)).toBeCloseTo(0, 6);
    expect(engToRaw(base, 100)).toBeCloseTo(27648, 6);
  });

  it('含偏移量程', () => {
    const r = analogConvert({
      raw: 27648,
      rawMin: 0,
      rawMax: 27648,
      engMin: -50,
      engMax: 150,
    });
    expect(r.engineering).toBeCloseTo(150, 10);
    expect(r.slope).toBeCloseTo(200 / 27648, 10);
    expect(r.rawFromEng).toBeCloseTo(27648, 6);
  });

  it('4-20mA 预设：5530 对应工程量下限', () => {
    const r = analogToEng({
      raw: 5530,
      rawMin: 5530,
      rawMax: 27648,
      engMin: 0,
      engMax: 100,
    });
    expect(r).toBeCloseTo(0, 6);
  });
});
