import { describe, expect, it } from 'vitest';
import { groundingResistance } from '@/lib/calc/waterGrounding';

describe('D13 接地电阻与接地体数量估算', () => {
  it('R₁ = ρ/(2πL)·ln(4L/d)', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, diameter: 0.05, targetR: 4 });
    const expected = (100 / (2 * Math.PI * 2.5)) * Math.log((4 * 2.5) / 0.05);
    expect(r.singleR).toBeCloseTo(expected, 4);
    // ≈ 33.7 Ω
    expect(r.singleR).toBeGreaterThan(33);
    expect(r.singleR).toBeLessThan(34.5);
  });

  it('多根并联 R = R₁/(n·η)', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, diameter: 0.05, targetR: 4, eta: 0.75 });
    expect(r.neededRods).toBe(Math.ceil(r.singleR / (4 * 0.75)));
    const plan = groundingResistance({ rho: 100, length: 2.5, diameter: 0.05, targetR: 4, rods: 12, eta: 0.75 });
    expect(plan.achievedR).toBeCloseTo(plan.singleR / (12 * 0.75), 6);
    expect(plan.compliant).toBe(true);
  });

  it('目标更严（1Ω）需要更多根', () => {
    const four = groundingResistance({ rho: 100, length: 2.5, targetR: 4 });
    const one = groundingResistance({ rho: 100, length: 2.5, targetR: 1 });
    expect(one.neededRods).toBeGreaterThan(four.neededRods);
  });

  it('边界：ρ=0 → R₁=0，至少 1 根；eta 越界按 0.75', () => {
    const r = groundingResistance({ rho: 0, length: 2.5, targetR: 4, eta: 0 });
    expect(r.singleR).toBe(0);
    expect(r.neededRods).toBe(1);
    expect(r.eta).toBeCloseTo(0.75, 6);
  });

  it('计划根数不足 → 不达标', () => {
    const r = groundingResistance({ rho: 200, length: 2.5, targetR: 4, rods: 3, eta: 0.75 });
    expect(r.compliant).toBe(false);
  });
});
