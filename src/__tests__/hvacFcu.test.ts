import { describe, expect, it } from 'vitest';
import { hvacFcuSelect, FCU_CAPACITIES } from '@/lib/calc/hvacFcu';

describe('H15 FCU / AHU 选型速查', () => {
  it('8 kW → 单台，匹配 8.0 kW 档', () => {
    const r = hvacFcuSelect({ loadKw: 8 });
    expect(r.count).toBe(1);
    expect(r.modelKw).toBe(8.0);
    expect(r.perUnitKw).toBeCloseTo(8, 6);
    expect(r.unitWaterFlowM3h).toBeCloseTo((0.86 * 8) / 5, 6);
  });

  it('25 kW → 自动拆 3 台，单台匹配 10.2 kW 档', () => {
    const r = hvacFcuSelect({ loadKw: 25 });
    expect(r.count).toBe(3);
    expect(r.modelKw).toBe(10.2);
    expect(r.totalWaterFlowM3h).toBeCloseTo(r.unitWaterFlowM3h * 3, 6);
  });

  it('指定台数 2 台、负荷 8 kW → 单台 4 kW，匹配 4.5 kW 档', () => {
    const r = hvacFcuSelect({ loadKw: 8, units: 2 });
    expect(r.count).toBe(2);
    expect(r.perUnitKw).toBeCloseTo(4, 6);
    expect(r.modelKw).toBe(4.5);
  });

  it('边界：负荷 0 → valid=false，型号 null，不产生 NaN', () => {
    const r = hvacFcuSelect({ loadKw: 0 });
    expect(r.valid).toBe(false);
    expect(r.modelKw).toBeNull();
    expect(r.count).toBe(0);
    expect(Number.isFinite(r.totalWaterFlowM3h)).toBe(true);
  });

  it('容量不足：25 kW 指定 1 台 → 单台 25 kW 超最大档，必须显式提示', () => {
    const r = hvacFcuSelect({ loadKw: 25, units: 1 });
    expect(r.count).toBe(1);
    expect(r.perUnitKw).toBeCloseTo(25, 6);
    expect(r.modelKw).toBe(10.2);
    expect(r.capacityShortfall).toBe(true);
    expect(r.note).toContain('超过最大档');
  });

  it('自动拆台路径不误报容量不足', () => {
    expect(hvacFcuSelect({ loadKw: 25 }).capacityShortfall).toBe(false);
    expect(hvacFcuSelect({ loadKw: 8 }).capacityShortfall).toBe(false);
    expect(hvacFcuSelect({ loadKw: 8, units: 2 }).capacityShortfall).toBe(false);
  });

  it('档位常量升序且大于 0', () => {
    for (let i = 1; i < FCU_CAPACITIES.length; i++) {
      expect(FCU_CAPACITIES[i]).toBeGreaterThan(FCU_CAPACITIES[i - 1]);
    }
  });
});
