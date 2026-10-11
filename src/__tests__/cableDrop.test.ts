import { describe, expect, it } from 'vitest';
import { cableVoltageDrop, maxLengthForDrop, RESISTIVITY } from '@/lib/calc/cableDrop';

describe('C10 电缆电压降', () => {
  it('三相简化 ΔU = √3·ρ·L·I/S', () => {
    const r = cableVoltageDrop({
      current: 32,
      length: 100,
      section: 6,
      material: 'copper',
      phase: 'three',
      voltage: 380,
    });
    // √3 × 0.0175 × 100 × 32 / 6 ≈ 16.166 V
    expect(r.deltaV).toBeCloseTo(16.166, 2);
    expect(r.percent).toBeCloseTo(4.254, 2);
    expect(r.limit).toBe(5);
    expect(r.compliant).toBe(true);
  });

  it('单相系数为 2', () => {
    const r = cableVoltageDrop({
      current: 10,
      length: 50,
      section: 2.5,
      material: 'copper',
      phase: 'single',
      voltage: 220,
    });
    // 2 × 0.0175 × 50 × 10 / 2.5 = 7 V
    expect(r.deltaV).toBeCloseTo(7, 6);
  });

  it('照明回路限值 3%', () => {
    const r = cableVoltageDrop({
      current: 10,
      length: 100,
      section: 2.5,
      phase: 'single',
      voltage: 220,
      lighting: true,
    });
    expect(r.limit).toBe(3);
  });

  it('反算最大长度', () => {
    const len = maxLengthForDrop(
      { current: 32, length: 0, section: 6, material: 'copper', phase: 'three', voltage: 380 },
      5,
    );
    // 380×5% = 19 V；L = 19×6 /(√3×0.0175×32) ≈ 117.5 m
    expect(len).toBeGreaterThan(100);
    expect(len).toBeLessThan(130);
  });

  it('电阻率常量', () => {
    expect(RESISTIVITY.copper).toBeCloseTo(0.0175, 6);
  });
});
