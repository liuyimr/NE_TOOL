import { describe, expect, it } from 'vitest';
import { demandFlow, ALPHA_PRESET } from '@/lib/calc/waterDemand';

describe('D7 给水设计秒流量（当量法）', () => {
  it('q_g = 0.2·α·√N_g', () => {
    const r = demandFlow({ ng: 20, buildingType: 'residential' });
    expect(r.alpha).toBeCloseTo(1.5, 6);
    expect(r.flowLps).toBeCloseTo(0.2 * 1.5 * Math.sqrt(20), 6);
    expect(r.flowM3h).toBeCloseTo(r.flowLps * 3.6, 6);
  });

  it('显式 α 覆盖建筑类型默认值', () => {
    const r = demandFlow({ ng: 16, buildingType: 'hotel', alpha: 1.2 });
    expect(r.alpha).toBeCloseTo(1.2, 6);
    expect(r.flowLps).toBeCloseTo(0.2 * 1.2 * 4, 6);
  });

  it('各建筑类型均有默认 α', () => {
    for (const key of Object.keys(ALPHA_PRESET) as (keyof typeof ALPHA_PRESET)[]) {
      expect(ALPHA_PRESET[key]).toBeGreaterThan(0);
    }
  });

  it('边界：N_g = 0 → 流量 0；负值钳 0', () => {
    expect(demandFlow({ ng: 0 }).flowLps).toBe(0);
    expect(demandFlow({ ng: -5 }).flowLps).toBe(0);
  });
});
