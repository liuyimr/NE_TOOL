import { describe, expect, it } from 'vitest';
import { hvacAirVolume, SUPPLY_AIR_COEF } from '@/lib/calc/hvacAirVolume';

describe('H12 送风量 / 新风量计算', () => {
  it('Q=120kW、Δt=10℃ → 送风量 35640 m³/h', () => {
    const r = hvacAirVolume({ coolingLoadKw: 120, supplyDeltaT: 10 });
    expect(r.supplyM3h).toBeCloseTo(35640, 6);
  });

  it('新风（按人数）：50 人 × 30 → 1500 m³/h，新风比约 4.21%', () => {
    const r = hvacAirVolume({ coolingLoadKw: 120, supplyDeltaT: 10, freshMode: 'people', people: 50 });
    expect(r.freshM3h).toBeCloseTo(1500, 6);
    expect(r.freshRatioPct).toBeCloseTo((1500 / 35640) * 100, 4);
  });

  it('新风（换气次数）：体积 500m³ × 2 次 → 1000 m³/h', () => {
    const r = hvacAirVolume({
      coolingLoadKw: 120,
      supplyDeltaT: 10,
      freshMode: 'ach',
      volumeM3: 500,
      ach: 2,
    });
    expect(r.freshM3h).toBeCloseTo(1000, 6);
  });

  it('边界：Δt=0 → valid=false，不产生 Infinity', () => {
    const r = hvacAirVolume({ coolingLoadKw: 120, supplyDeltaT: 0 });
    expect(r.valid).toBe(false);
    expect(r.supplyM3h).toBe(0);
    expect(r.freshRatioPct).toBe(0);
    expect(Number.isFinite(r.supplyM3h)).toBe(true);
  });

  it('边界：Q=0 → 送风量 0，valid=false；系数常量正确', () => {
    const r = hvacAirVolume({ coolingLoadKw: 0, supplyDeltaT: 10 });
    expect(r.supplyM3h).toBe(0);
    expect(r.valid).toBe(false);
    expect(SUPPLY_AIR_COEF).toBe(2970);
  });

  it('边界：负冷负荷 / 负温差 → 兜底为 0 / 无效', () => {
    const r = hvacAirVolume({ coolingLoadKw: -50, supplyDeltaT: -5 });
    expect(r.valid).toBe(false);
    expect(r.supplyM3h).toBe(0);
  });
});
