import { describe, expect, it } from 'vitest';
import {
  ALLOWABLE_DROP,
  cableVoltageDrop,
  maxLengthForDrop,
  RESISTIVITY,
  simpleVoltageDrop,
} from '@/lib/calc/cableDrop';

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
    expect(r.valid).toBe(true);
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

describe('C10 照明限值口径统一（两法同为 3%）', () => {
  it('电流法与简化法的照明限值都等于 3', () => {
    const byCurrent = cableVoltageDrop({
      current: 10,
      length: 50,
      section: 2.5,
      phase: 'single',
      voltage: 220,
      lighting: true,
    });
    const byPower = simpleVoltageDrop({
      powerKw: 3,
      length: 50,
      section: 2.5,
      phase: 'single',
      material: 'copper',
      lighting: true,
    });
    expect(byCurrent.limit).toBe(3);
    expect(byPower.limit).toBe(3);
    expect(ALLOWABLE_DROP.lighting).toBe(3);
    expect(ALLOWABLE_DROP.power).toBe(5);
  });
});

describe('C10 输入有效性校验（负值不得静默判合规）', () => {
  it('负长度 → valid=false、deltaV/percent 置 0、不合规', () => {
    const r = cableVoltageDrop({ current: 32, length: -100, section: 6, voltage: 380 });
    expect(r.valid).toBe(false);
    expect(r.deltaV).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.compliant).toBe(false);
  });

  it('负电流 → valid=false、不合规（原先负百分比会被误判合规）', () => {
    const r = cableVoltageDrop({ current: -32, length: 100, section: 6, voltage: 380 });
    expect(r.valid).toBe(false);
    expect(r.percent).toBe(0);
    expect(r.compliant).toBe(false);
  });

  it('负功率 → valid=false、percent 置 0、不合规', () => {
    const r = simpleVoltageDrop({ powerKw: -10, length: 100, section: 6 });
    expect(r.valid).toBe(false);
    expect(r.percent).toBe(0);
    expect(r.compliant).toBe(false);
  });

  it('负长度（简化法）→ valid=false', () => {
    const r = simpleVoltageDrop({ powerKw: 10, length: -100, section: 6 });
    expect(r.valid).toBe(false);
    expect(r.percent).toBe(0);
    expect(r.compliant).toBe(false);
  });

  it('截面 0 / 电压 0 → valid=false', () => {
    expect(cableVoltageDrop({ current: 10, length: 10, section: 0, voltage: 380 }).valid).toBe(
      false,
    );
    expect(cableVoltageDrop({ current: 10, length: 10, section: 4, voltage: 0 }).valid).toBe(
      false,
    );
    expect(simpleVoltageDrop({ powerKw: 10, length: 100, section: 0 }).valid).toBe(false);
  });

  it('有效正数输入 → valid=true，结果不变', () => {
    const current = cableVoltageDrop({
      current: 32,
      length: 100,
      section: 6,
      material: 'copper',
      phase: 'three',
      voltage: 380,
    });
    expect(current.valid).toBe(true);
    expect(current.deltaV).toBeCloseTo(16.166, 2);
    const power = simpleVoltageDrop({ powerKw: 30, length: 100, section: 16 });
    // 30×100/(76.5×16) ≈ 2.451%
    expect(power.valid).toBe(true);
    expect(power.percent).toBeCloseTo((30 * 100) / (76.5 * 16), 6);
    expect(power.compliant).toBe(true);
  });
});
