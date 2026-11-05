import { describe, expect, it } from 'vitest';
import { ddcSizing, DDC_MODULE_SPEC, DEFAULT_MAX_POINTS_PER_DDC } from '@/lib/calc/ddcSizing';

describe('BA8 DDC 选型与 I/O 模块配置', () => {
  it('AI40/AO10/DI120/DO60，余量 20% → 48/12/144/72，共 276 点', () => {
    const r = ddcSizing({ ai: 40, ao: 10, di: 120, do: 60, marginPct: 20 });
    expect(r.required).toEqual({ ai: 48, ao: 12, di: 144, do: 72 });
    expect(r.totalPoints).toBe(276);
  });

  it('模块数按规格 8AI/4AO/12DI/8DO 向上取整', () => {
    const r = ddcSizing({ ai: 40, ao: 10, di: 120, do: 60, marginPct: 20 });
    expect(r.modules).toEqual({ ai: 6, ao: 3, di: 12, do: 9 });
    expect(r.totalModules).toBe(30);
  });

  it('DDC 台数按单台上限拆分（默认 200 → 2 台）', () => {
    const r = ddcSizing({ ai: 40, ao: 10, di: 120, do: 60, marginPct: 20 });
    expect(r.ddcCount).toBe(2);
    expect(r.avgPointsPerDdc).toBeCloseTo(138, 6);
    expect(r.needsSplit).toBe(true);
    expect(DDC_MODULE_SPEC).toEqual({ ai: 8, ao: 4, di: 12, do: 8 });
  });

  it('边界：单台上限放大到 300 → 1 台、不拆分', () => {
    const r = ddcSizing({ ai: 40, ao: 10, di: 120, do: 60, marginPct: 20, maxPointsPerDdc: 300 });
    expect(r.ddcCount).toBe(1);
    expect(r.needsSplit).toBe(false);
  });

  it('边界：全 0 → 总点数 0，台数 1，无 NaN', () => {
    const r = ddcSizing({ ai: 0, ao: 0, di: 0, do: 0 });
    expect(r.totalPoints).toBe(0);
    expect(r.totalModules).toBe(0);
    expect(r.ddcCount).toBe(1);
    expect(r.avgPointsPerDdc).toBe(0);
    expect(Number.isFinite(r.avgPointsPerDdc)).toBe(true);
  });

  it('边界：负点数钳到 0；余量 0 时不放大', () => {
    const r = ddcSizing({ ai: -10, ao: 0, di: 12, do: 0, marginPct: 0 });
    expect(r.required.ai).toBe(0);
    expect(r.required.di).toBe(12);
    expect(DEFAULT_MAX_POINTS_PER_DDC).toBe(200);
  });
});
