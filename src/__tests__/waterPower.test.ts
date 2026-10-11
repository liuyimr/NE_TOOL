import { describe, expect, it } from 'vitest';
import { powerCurrent } from '@/lib/calc/waterPower';

describe('D2 单相 / 三相 功率电流换算', () => {
  it('三相 功率→电流', () => {
    const r = powerCurrent({ mode: 'powerToCurrent', phase: 'three', voltage: 380, cosPhi: 0.85, powerKw: 15 });
    // I = 15000 /(√3×380×0.85)
    expect(r.currentA).toBeCloseTo(15000 / (Math.sqrt(3) * 380 * 0.85), 4);
  });

  it('三相 电流→功率', () => {
    const r = powerCurrent({ mode: 'currentToPower', phase: 'three', voltage: 380, cosPhi: 0.85, currentA: 30 });
    expect(r.powerKw).toBeCloseTo((Math.sqrt(3) * 380 * 30 * 0.85) / 1000, 4);
  });

  it('单相把 √3 换成 1', () => {
    const r = powerCurrent({ mode: 'powerToCurrent', phase: 'single', voltage: 220, cosPhi: 0.85, powerKw: 5 });
    expect(r.currentA).toBeCloseTo(5000 / (220 * 0.85), 4);
  });

  it('边界：cosφ 越界按 0.85，负值钳 0', () => {
    const r = powerCurrent({ mode: 'powerToCurrent', phase: 'three', voltage: 380, cosPhi: 0, powerKw: -3 });
    expect(r.powerFactor).toBeCloseTo(0.85, 6);
    expect(r.powerKw).toBe(0);
    expect(r.currentA).toBe(0);
  });

  it('单相/三相同功率下三相电流更小', () => {
    const three = powerCurrent({ mode: 'powerToCurrent', phase: 'three', voltage: 380, cosPhi: 1, powerKw: 10 });
    const single = powerCurrent({ mode: 'powerToCurrent', phase: 'single', voltage: 380, cosPhi: 1, powerKw: 10 });
    expect(three.currentA).toBeLessThan(single.currentA);
  });
});
