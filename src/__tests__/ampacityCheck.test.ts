import { describe, expect, it } from 'vitest';
import {
  AMPACITY_ENTRIES,
  GROUP_FACTOR,
  TEMP_FACTOR,
  checkAmpacity,
} from '@/lib/calc/ampacityCheck';
import cableAmpacity from '@/data/automation/cableAmpacity.json';

/**
 * 载流量校核（E5 页内卡）
 * 唯一数据源：src/data/automation/cableAmpacity.json（此处直接读原始 JSON 做独立复算）。
 * 修正口径：I_z = I_table × k_t × k_g。
 */

/** 从原始 JSON 取某截面某方式的基准载流量（独立于实现代码的复算路径） */
function baseFromJson(section: string, method: 'air' | 'pipe'): number {
  const row = cableAmpacity.rows.find((r) => Number(r.values.section) === Number(section));
  if (!row) throw new Error(`表中无 ${section} mm²`);
  return Number(row.values[method]);
}

describe('ampacityCheck · 数据源与系数表', () => {
  it('唯一数据源：13 档截面、按升序解析，且与 JSON 数值一致', () => {
    expect(AMPACITY_ENTRIES.length).toBe(cableAmpacity.rows.length);
    expect(AMPACITY_ENTRIES.map((e) => e.sectionMm2)).toEqual([
      1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120,
    ]);
    for (const entry of AMPACITY_ENTRIES) {
      expect(entry.airA).toBe(baseFromJson(String(entry.sectionMm2), 'air'));
      expect(entry.pipeA).toBe(baseFromJson(String(entry.sectionMm2), 'pipe'));
    }
  });

  it('温度系数：30→1 / 35→0.94 / 40→0.87 / 45→0.79 / 50→0.71', () => {
    expect(TEMP_FACTOR).toEqual({ 30: 1, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71 });
  });

  it('并列系数：1→1 / 2→0.8 / 3→0.7 / 4→0.65 / 5→0.6 / 6→0.57', () => {
    expect(GROUP_FACTOR).toEqual({ 1: 1, 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.57 });
  });
});

describe('ampacityCheck · 4mm² 穿管 40℃ 3 回路', () => {
  it('基准 24A × 0.87 × 0.7 → Iz ≈ 14.62A', () => {
    const r = checkAmpacity({ ib: 16, method: 'pipe', ambientC: 40, circuits: 3, sectionMm2: 4 });
    expect(r.valid).toBe(true);
    expect(r.baseA).toBe(24);
    expect(r.tempFactor).toBe(0.87);
    expect(r.groupFactor).toBe(0.7);
    expect(r.izA).toBeCloseTo(14.616, 3);
  });

  it('I_b = 16A > 14.62A → 不合规，推荐 6mm²（31×0.87×0.7 ≈ 18.88A）', () => {
    const r = checkAmpacity({ ib: 16, method: 'pipe', ambientC: 40, circuits: 3, sectionMm2: 4 });
    expect(r.compliant).toBe(false);
    expect(r.recommendedSectionMm2).toBe(6);
    // 复算：6mm² 穿管 31A × 0.87 × 0.7 = 18.879A ≥ 16A，而 4mm² 仅 14.616A
    expect(baseFromJson('6', 'pipe') * 0.87 * 0.7).toBeCloseTo(18.879, 3);
    expect(baseFromJson('4', 'pipe') * 0.87 * 0.7).toBeLessThan(16);
  });

  it('I_b = 10A ≤ 14.62A → 合规，推荐 2.5mm²（18×0.87×0.7 ≈ 10.96A）', () => {
    const r = checkAmpacity({ ib: 10, method: 'pipe', ambientC: 40, circuits: 3, sectionMm2: 4 });
    expect(r.compliant).toBe(true);
    expect(r.recommendedSectionMm2).toBe(2.5);
    expect(baseFromJson('2.5', 'pipe') * 0.87 * 0.7).toBeCloseTo(10.962, 3);
    // 1.5mm² 修正后 7.917A < 10A，故 2.5mm² 才是最小满足档
    expect(baseFromJson('1.5', 'pipe') * 0.87 * 0.7).toBeLessThan(10);
  });
});

describe('ampacityCheck · 敷设方式与修正方向', () => {
  it('明敷基准值高于穿管（4mm²：28A vs 24A）', () => {
    const air = checkAmpacity({ ib: 10, method: 'air', ambientC: 30, circuits: 1, sectionMm2: 4 });
    const pipe = checkAmpacity({ ib: 10, method: 'pipe', ambientC: 30, circuits: 1, sectionMm2: 4 });
    expect(air.baseA).toBe(28);
    expect(pipe.baseA).toBe(24);
    expect(air.izA).toBeGreaterThan(pipe.izA);
  });

  it('温度升高 / 回路数增加 → 修正后 Iz 单调下降', () => {
    const at30 = checkAmpacity({ ib: 10, method: 'pipe', ambientC: 30, circuits: 1, sectionMm2: 6 });
    const at50 = checkAmpacity({ ib: 10, method: 'pipe', ambientC: 50, circuits: 1, sectionMm2: 6 });
    const at6 = checkAmpacity({ ib: 10, method: 'pipe', ambientC: 30, circuits: 6, sectionMm2: 6 });
    expect(at50.izA).toBeLessThan(at30.izA);
    expect(at6.izA).toBeLessThan(at30.izA);
    expect(at30.izA).toBeCloseTo(31, 6);
  });

  it('超大电流 → 超出表内最大截面时返回最大档并在 note 中提示', () => {
    const r = checkAmpacity({ ib: 500, method: 'pipe', ambientC: 50, circuits: 6, sectionMm2: 4 });
    expect(r.compliant).toBe(false);
    expect(r.recommendedSectionMm2).toBe(120);
    expect(r.note).toContain('仍不满足');
  });

  it('非表内截面 → 取最近档位作基准（5mm² → 4mm² 的 24A）', () => {
    const r = checkAmpacity({ ib: 10, method: 'pipe', ambientC: 30, circuits: 1, sectionMm2: 5 });
    expect(r.baseA).toBe(24);
  });
});

describe('ampacityCheck · 输入校验', () => {
  const zeroed = {
    baseA: 0,
    tempFactor: 0,
    groupFactor: 0,
    izA: 0,
    recommendedSectionMm2: 0,
    compliant: false,
  };

  it('I_b ≤ 0 → valid:false', () => {
    for (const ib of [0, -1]) {
      const r = checkAmpacity({ ib, method: 'pipe', ambientC: 30, circuits: 1 });
      expect(r.valid).toBe(false);
      expect(r).toMatchObject(zeroed);
    }
  });

  it('非有限 I_b / 截面 → valid:false', () => {
    expect(
      checkAmpacity({ ib: Number.NaN, method: 'pipe', ambientC: 30, circuits: 1 }).valid,
    ).toBe(false);
    expect(
      checkAmpacity({ ib: 10, method: 'pipe', ambientC: 30, circuits: 1, sectionMm2: 0 }).valid,
    ).toBe(false);
  });

  it('温度越界（<30 或 >50）→ valid:false', () => {
    expect(checkAmpacity({ ib: 10, method: 'pipe', ambientC: 20, circuits: 1 }).valid).toBe(false);
    expect(checkAmpacity({ ib: 10, method: 'pipe', ambientC: 60, circuits: 1 }).valid).toBe(false);
  });

  it('回路数非整数或越界 → valid:false', () => {
    expect(checkAmpacity({ ib: 10, method: 'pipe', ambientC: 30, circuits: 0 }).valid).toBe(false);
    expect(checkAmpacity({ ib: 10, method: 'pipe', ambientC: 30, circuits: 7 }).valid).toBe(false);
    expect(checkAmpacity({ ib: 10, method: 'pipe', ambientC: 30, circuits: 2.5 }).valid).toBe(false);
  });

  it('非法敷设方式 → valid:false', () => {
    const r = checkAmpacity({
      ib: 10,
      method: 'tray' as 'pipe',
      ambientC: 30,
      circuits: 1,
    });
    expect(r.valid).toBe(false);
  });
});
