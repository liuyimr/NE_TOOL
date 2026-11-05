import { describe, expect, it } from 'vitest';
import { hvacLoad, COLD_INDEX, HEAT_INDEX } from '@/lib/calc/hvacLoad';

describe('H11 空调冷/热负荷估算', () => {
  it('1000 m² 办公、冷指标 120 W/m² → 冷负荷 120 kW', () => {
    const r = hvacLoad({ area: 1000, buildingType: 'office' });
    expect(r.unitColdIndex).toBe(120);
    expect(r.coldKw).toBeCloseTo(120, 6);
  });

  it('热指标取默认（办公 80）→ 80 kW', () => {
    const r = hvacLoad({ area: 1000, buildingType: 'office' });
    expect(r.unitHeatIndex).toBe(80);
    expect(r.heatKw).toBeCloseTo(80, 6);
  });

  it('显式冷/热指标覆盖默认', () => {
    const r = hvacLoad({ area: 1000, buildingType: 'office', coldIndex: 150, heatIndex: 90 });
    expect(r.coldKw).toBeCloseTo(150, 6);
    expect(r.heatKw).toBeCloseTo(90, 6);
  });

  it('修正系数 1.2 → 冷负荷 144 kW', () => {
    const r = hvacLoad({ area: 1000, buildingType: 'office', correction: 1.2 });
    expect(r.coldKw).toBeCloseTo(144, 6);
  });

  it('边界：面积 0 → valid=false，负荷 0（无 NaN）', () => {
    const r = hvacLoad({ area: 0, buildingType: 'office' });
    expect(r.valid).toBe(false);
    expect(r.coldKw).toBe(0);
    expect(Number.isFinite(r.coldKw)).toBe(true);
  });

  it('边界：负面积钳 0；全类目指标均为正', () => {
    expect(hvacLoad({ area: -100, buildingType: 'office' }).coldKw).toBe(0);
    for (const key of Object.keys(COLD_INDEX) as (keyof typeof COLD_INDEX)[]) {
      expect(COLD_INDEX[key]).toBeGreaterThan(0);
      expect(HEAT_INDEX[key]).toBeGreaterThan(0);
    }
  });
});
