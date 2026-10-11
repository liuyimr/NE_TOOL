import { describe, expect, it } from 'vitest';
import {
  cableVoltageDrop,
  maxLengthForDrop,
  simpleVoltageDrop,
  COEFFICIENT_C,
  ALLOWABLE_DROP,
} from '@/lib/calc/cableDrop';

/**
 * C10 增强（按功率简化系数法）验证 + 既有按电流算法回归。
 * 硬性要求：既有输入/输出行为不变，新增为追加。
 */
describe('C10 既有按电流算法（回归，行为不变）', () => {
  it('三相 ΔU 与百分比', () => {
    const r = cableVoltageDrop({
      current: 32,
      length: 100,
      section: 6,
      material: 'copper',
      phase: 'three',
      voltage: 380,
    });
    expect(r.deltaV).toBeCloseTo(16.166, 2);
    expect(r.percent).toBeCloseTo(4.254, 2);
    expect(r.limit).toBe(5);
    expect(r.compliant).toBe(true);
  });

  it('反算最大长度仍可用', () => {
    const len = maxLengthForDrop(
      { current: 32, length: 0, section: 6, material: 'copper', phase: 'three', voltage: 380 },
      5,
    );
    expect(len).toBeGreaterThan(100);
  });
});

describe('C10 增强 · 简化系数法 ΔU% = P·L/(C·S)', () => {
  it('三相铜 C=76.5', () => {
    const r = simpleVoltageDrop({ powerKw: 30, length: 100, section: 16, material: 'copper', phase: 'three' });
    expect(r.coefficient).toBeCloseTo(76.5, 6);
    expect(r.percent).toBeCloseTo((30 * 100) / (76.5 * 16), 6);
    expect(r.limit).toBe(ALLOWABLE_DROP.power);
    expect(r.compliant).toBe(true);
  });

  it('三相铝 C=46.3', () => {
    const r = simpleVoltageDrop({ powerKw: 30, length: 100, section: 16, material: 'aluminum', phase: 'three' });
    expect(r.coefficient).toBeCloseTo(46.3, 6);
  });

  it('单相铜 C=12.8 / 铝 7.75', () => {
    expect(simpleVoltageDrop({ powerKw: 5, length: 50, section: 6, phase: 'single', material: 'copper' }).coefficient).toBeCloseTo(12.8, 6);
    expect(simpleVoltageDrop({ powerKw: 5, length: 50, section: 6, phase: 'single', material: 'aluminum' }).coefficient).toBeCloseTo(7.75, 6);
  });

  it('照明限值 2.5% / 动力 5%', () => {
    const power = simpleVoltageDrop({ powerKw: 40, length: 100, section: 16, phase: 'three', lighting: false });
    const light = simpleVoltageDrop({ powerKw: 40, length: 100, section: 16, phase: 'three', lighting: true });
    expect(power.limit).toBe(5);
    expect(light.limit).toBe(2.5);
    // 40×100/(76.5×16) ≈ 3.27%
    expect(power.compliant).toBe(true);
    expect(light.compliant).toBe(false);
  });

  it('边界：截面 0 → 百分比 0 且不合规', () => {
    const r = simpleVoltageDrop({ powerKw: 30, length: 100, section: 0 });
    expect(r.percent).toBe(0);
    expect(r.compliant).toBe(false);
    expect(COEFFICIENT_C.three.copper).toBe(76.5);
  });
});
