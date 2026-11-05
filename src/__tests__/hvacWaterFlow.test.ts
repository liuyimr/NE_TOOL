import { describe, expect, it } from 'vitest';
import { hvacWaterFlow, WATER_FLOW_COEF } from '@/lib/calc/hvacWaterFlow';

describe('H14 冷冻水 / 热水流量计算', () => {
  it('Q=120kW、Δt=5℃ → 流量 20.64 m³/h', () => {
    const r = hvacWaterFlow({ loadKw: 120, deltaT: 5 });
    expect(r.flowM3h).toBeCloseTo(20.64, 6);
    expect(r.flowLps).toBeCloseTo(20.64 / 3.6, 6);
    expect(WATER_FLOW_COEF).toBe(0.86);
  });

  it('给出推荐管径与实际流速（有限值）', () => {
    const r = hvacWaterFlow({ loadKw: 120, deltaT: 5, velocity: 1.5 });
    expect(r.recommendedDn).not.toBeNull();
    expect(r.actualVelocity).toBeGreaterThan(0);
    expect(Number.isFinite(r.actualVelocity)).toBe(true);
  });

  it('Δt 变小 → 流量变大', () => {
    const a = hvacWaterFlow({ loadKw: 120, deltaT: 7 });
    const b = hvacWaterFlow({ loadKw: 120, deltaT: 5 });
    expect(b.flowM3h).toBeGreaterThan(a.flowM3h);
  });

  it('边界：Δt=0 → valid=false，流量 0，无除零', () => {
    const r = hvacWaterFlow({ loadKw: 120, deltaT: 0 });
    expect(r.valid).toBe(false);
    expect(r.flowM3h).toBe(0);
    expect(Number.isFinite(r.flowM3h)).toBe(true);
  });

  it('边界：Q=0 → 流量 0，valid=false', () => {
    const r = hvacWaterFlow({ loadKw: 0, deltaT: 5 });
    expect(r.flowM3h).toBe(0);
    expect(r.valid).toBe(false);
  });
});
