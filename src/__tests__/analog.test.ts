import { describe, expect, it } from 'vitest';
import {
  ANALOG_PRESETS,
  analogConvert,
  analogToEng,
  engToRaw,
} from '@/lib/calc/analog';

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

  it('预设清单：4-20mA 按 CPU/模块系列区分，无歧义「标准 4-20mA」', () => {
    expect(ANALOG_PRESETS).toHaveLength(6);
    expect(ANALOG_PRESETS.map((p) => p.name)).toEqual([
      'S7 单极性 0-27648',
      'S7 双极性 -27648~27648',
      'S7-200 4-20mA（5530~27648）',
      '12 位 0-4095',
      '16 位 0-65535',
      'S7-1200/1500/300/400 4-20mA（0~27648）',
    ]);
    // 删除含义模糊的旧预设
    expect(ANALOG_PRESETS.some((p) => p.name === '标准 4-20mA 0-27648')).toBe(false);
    expect(ANALOG_PRESETS.some((p) => p.name === 'S7 4-20mA 5530-27648')).toBe(false);
  });

  it('两种 4-20mA 口径的原始量程差约 20% 量程', () => {
    const s7200 = ANALOG_PRESETS.find((p) => p.name.startsWith('S7-200 4-20mA'));
    const s71200 = ANALOG_PRESETS.find((p) => p.name.startsWith('S7-1200/1500'));
    expect(s7200).toBeDefined();
    expect(s71200).toBeDefined();
    expect(s7200?.rawMin).toBe(5530);
    expect(s7200?.rawMax).toBe(27648);
    expect(s71200?.rawMin).toBe(0);
    expect(s71200?.rawMax).toBe(27648);
    // 5530/27648 ≈ 20%
    expect(5530 / 27648).toBeCloseTo(0.2, 2);
  });
});
