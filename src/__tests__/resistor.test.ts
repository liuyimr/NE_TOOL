import { describe, expect, it } from 'vitest';
import {
  currentLimitResistor,
  currentLimitResult,
  dividerResult,
  resistorPower,
  resistorR1ForVout,
  resistorR2ForVout,
  voltageDivider,
} from '@/lib/calc/resistor';

describe('C12 电阻分压 / 限流', () => {
  it('分压 Vout = Vin·R2/(R1+R2)', () => {
    expect(voltageDivider(12, 1000, 1000)).toBeCloseTo(6, 6);
    expect(voltageDivider(5, 1000, 2000)).toBeCloseTo(10 / 3, 6);
  });

  it('反求 R1 / R2', () => {
    expect(resistorR1ForVout(12, 6, 1000)).toBeCloseTo(1000, 6);
    expect(resistorR2ForVout(12, 6, 1000)).toBeCloseTo(1000, 6);
    expect(Number.isNaN(resistorR1ForVout(12, 12, 1000))).toBe(true);
  });

  it('限流电阻 R = (Vcc−Vf)/If', () => {
    expect(currentLimitResistor(12, 2, 0.02)).toBeCloseTo(500, 6);
  });

  it('电阻功耗', () => {
    expect(resistorPower(10, 0.02)).toBeCloseTo(0.2, 6);
  });

  it('综合结果', () => {
    const d = dividerResult({ vin: 12, r1: 1000, r2: 1000 });
    expect(d.vout).toBeCloseTo(6, 6);
    expect(d.current).toBeCloseTo(0.006, 6);

    const c = currentLimitResult({ vcc: 12, vf: 2, ifA: 0.02 });
    expect(c.resistor).toBeCloseTo(500, 6);
    expect(c.power).toBeCloseTo(0.2, 6);
    expect(c.recommendedWatt).toBeCloseTo(0.4, 6);
  });
});
