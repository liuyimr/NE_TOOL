import { describe, expect, it } from 'vitest';
import { etaForRods, groundingResistance } from '@/lib/calc/waterGrounding';

/** ρ=100 Ω·m、L=2.5 m、d=0.05 m、目标 4Ω 的标准算例（R₁ ≈ 33.7303 Ω） */
const R1_EXPECTED = (100 / (2 * Math.PI * 2.5)) * Math.log((4 * 2.5) / 0.05);

describe('D13 接地电阻与接地体数量估算', () => {
  it('R₁ = ρ/(2πL)·ln(4L/d)', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, diameter: 0.05, targetR: 4 });
    const expected = R1_EXPECTED;
    expect(r.singleR).toBeCloseTo(expected, 4);
    // ≈ 33.73 Ω
    expect(r.singleR).toBeGreaterThan(33);
    expect(r.singleR).toBeLessThan(34.5);
  });

  it('etaForRods：按根数分级取值（越多越保守）', () => {
    expect(etaForRods(0)).toBe(1);
    expect(etaForRods(1)).toBe(1);
    expect(etaForRods(2)).toBe(0.85);
    expect(etaForRods(3)).toBe(0.8);
    expect(etaForRods(4)).toBe(0.8);
    expect(etaForRods(5)).toBe(0.75);
    expect(etaForRods(6)).toBe(0.75);
    expect(etaForRods(7)).toBe(0.7);
    expect(etaForRods(10)).toBe(0.7);
    expect(etaForRods(11)).toBe(0.65);
    expect(etaForRods(12)).toBe(0.65);
    expect(etaForRods(30)).toBe(0.65);
    // 非法输入按单根处理
    expect(etaForRods(Number.NaN)).toBe(1);
    expect(etaForRods(-5)).toBe(1);
  });

  it('自动 η：根数与 η 迭代收敛 → 13 根、η=0.65、R≈3.99Ω 达标', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, diameter: 0.05, targetR: 4 });
    // 迭代轨迹：n=1(η=1) → 9(η=0.7) → ceil(33.73/(4×0.7))=13(η=0.65) → 稳定 13
    expect(r.etaAuto).toBe(true);
    expect(r.neededRods).toBe(13);
    expect(r.plannedRods).toBe(13);
    expect(r.eta).toBeCloseTo(0.65, 9);
    // 33.7303 / (13×0.65) = 33.7303/8.45 ≈ 3.9929
    expect(r.achievedR).toBeCloseTo(R1_EXPECTED / (13 * 0.65), 6);
    expect(r.achievedR).toBeCloseTo(3.99, 2);
    expect(r.compliant).toBe(true);
  });

  it('自动 η：计划 12 根（η=0.65）→ R≈4.32Ω 不达标（旧版固定 0.75 会误判 3.75Ω 达标）', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, diameter: 0.05, targetR: 4, rods: 12 });
    expect(r.etaAuto).toBe(true);
    expect(r.plannedRods).toBe(12);
    expect(r.eta).toBeCloseTo(0.65, 9);
    // 33.7303 / (12×0.65) = 33.7303/7.8 ≈ 4.3244
    expect(r.achievedR).toBeCloseTo(R1_EXPECTED / (12 * 0.65), 6);
    expect(r.achievedR).toBeCloseTo(4.32, 2);
    expect(r.compliant).toBe(false);
    // 旧口径（η 固定 0.75）会得到 3.75Ω 并误判达标
    expect(R1_EXPECTED / (12 * 0.75)).toBeCloseTo(3.75, 2);
  });

  it('显式 η=0.75：保持原公式 R = R₁/(n·η) 不变', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, diameter: 0.05, targetR: 4, eta: 0.75 });
    expect(r.etaAuto).toBe(false);
    expect(r.eta).toBeCloseTo(0.75, 9);
    expect(r.neededRods).toBe(Math.ceil(R1_EXPECTED / (4 * 0.75)));
    const plan = groundingResistance({
      rho: 100,
      length: 2.5,
      diameter: 0.05,
      targetR: 4,
      rods: 12,
      eta: 0.75,
    });
    expect(plan.achievedR).toBeCloseTo(plan.singleR / (12 * 0.75), 6);
    expect(plan.compliant).toBe(true);
  });

  it('目标更严（1Ω）需要更多根', () => {
    const four = groundingResistance({ rho: 100, length: 2.5, targetR: 4 });
    const one = groundingResistance({ rho: 100, length: 2.5, targetR: 1 });
    expect(one.neededRods).toBeGreaterThan(four.neededRods);
  });

  it('边界：ρ=0 → R₁=0，至少 1 根；η 取单根值 1', () => {
    const r = groundingResistance({ rho: 0, length: 2.5, targetR: 4, eta: 0 });
    expect(r.singleR).toBe(0);
    expect(r.neededRods).toBe(1);
    expect(r.etaAuto).toBe(true);
    expect(r.eta).toBeCloseTo(1, 6);
    expect(r.achievedR).toBe(0);
    expect(r.compliant).toBe(true);
  });

  it('边界：η 越界（>1）按自动取值处理', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, targetR: 4, eta: 1.5 });
    expect(r.etaAuto).toBe(true);
    expect(r.eta).toBeCloseTo(0.65, 9);
    expect(r.neededRods).toBe(13);
  });

  it('计划根数不足 → 不达标', () => {
    const r = groundingResistance({ rho: 200, length: 2.5, targetR: 4, rods: 3, eta: 0.75 });
    expect(r.compliant).toBe(false);
  });
});
