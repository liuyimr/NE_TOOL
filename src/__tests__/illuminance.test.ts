import { describe, expect, it } from 'vitest';
import { illuminanceCalc } from '@/lib/calc/illuminance';

describe('B10/B11 照度与灯具数量', () => {
  it('反算所需灯具数量（流明法）', () => {
    const r = illuminanceCalc({
      area: 100,
      targetLux: 300,
      lumens: 3000,
      utilization: 0.7,
      maintenance: 0.8,
    });
    // N = (300×100) / (3000×0.7×0.8) = 30000/1680 = 17.86 → 18
    expect(r.requiredFixtures).toBe(18);
  });

  it('正算平均照度', () => {
    const r = illuminanceCalc({
      area: 100,
      lumens: 3000,
      utilization: 0.7,
      maintenance: 0.8,
      fixtures: 20,
    });
    // E = 20×3000×0.7×0.8 / 100 = 336
    expect(r.averageLux).toBeCloseTo(336, 6);
  });

  it('功率密度 W/m²', () => {
    const r = illuminanceCalc({
      area: 100,
      fixtures: 20,
      wattPerLamp: 36,
    });
    expect(r.powerDensity).toBeCloseTo(7.2, 6);
  });

  it('面积为零安全', () => {
    const r = illuminanceCalc({ area: 0, targetLux: 300, lumens: 3000 });
    expect(r.requiredFixtures).toBe(0);
  });
});
