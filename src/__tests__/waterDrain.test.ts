import { describe, expect, it } from 'vitest';
import { drainSlope, DRAIN_TABLE } from '@/lib/calc/waterDrain';

describe('D11 排水管径与坡度校核', () => {
  it('DN100 标准坡度 0.020 达标', () => {
    const r = drainSlope({ dn: 100, actualSlope: 0.02 });
    expect(r.spec?.standardSlope).toBeCloseTo(0.02, 6);
    expect(r.spec?.minSlope).toBeCloseTo(0.012, 6);
    expect(r.atLeastMin).toBe(true);
    expect(r.meetsStandard).toBe(true);
    expect(r.compliant).toBe(true);
  });

  it('低于最小坡度 → 不合规', () => {
    const r = drainSlope({ dn: 100, actualSlope: 0.01 });
    expect(r.atLeastMin).toBe(false);
    expect(r.compliant).toBe(false);
  });

  it('达到最小但未达标准仍合规', () => {
    const r = drainSlope({ dn: 100, actualSlope: 0.015 });
    expect(r.atLeastMin).toBe(true);
    expect(r.meetsStandard).toBe(false);
    expect(r.compliant).toBe(true);
  });

  it('给出长度时反算两端高差（mm）', () => {
    const r = drainSlope({ dn: 100, actualSlope: 0.02, length: 10 });
    expect(r.dropMm).toBeCloseTo(200, 6);
  });

  it('坡度千分数换算', () => {
    expect(drainSlope({ dn: 50, actualSlope: 0.035 }).perMille).toBeCloseTo(35, 6);
  });

  it('边界：不在表内的管径 → spec 为 null', () => {
    const r = drainSlope({ dn: 80, actualSlope: 0.03 });
    expect(r.spec).toBeNull();
    expect(r.compliant).toBe(false);
  });

  it('标准表覆盖 DN50~DN200', () => {
    expect(DRAIN_TABLE.map((s) => s.dn)).toEqual([50, 75, 100, 125, 150, 200]);
  });
});
