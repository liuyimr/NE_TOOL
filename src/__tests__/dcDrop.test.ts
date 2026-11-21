import { describe, expect, it } from 'vitest';
import {
  DC_RESISTIVITY,
  STANDARD_SECTIONS_MM2,
  dcDrop,
  pickStandardSection,
} from '@/lib/calc/dcDrop';

/**
 * E18 24V DC 供电压降与线径
 * 独立复算：ΔU = 2·ρ·L·I/S（去回两倍长度），pct = ΔU/V·100，U_end = V − ΔU，
 *   L_max = (V·pct%/100)·S/(2·ρ·I)，S_min = 2·ρ·L·I/(V·pct%/100)。
 */

describe('dcDrop · 电阻率与标准档', () => {
  it('铜 0.0175 / 铝 0.0282 Ω·mm²/m（20℃）', () => {
    expect(DC_RESISTIVITY.copper).toBe(0.0175);
    expect(DC_RESISTIVITY.aluminum).toBe(0.0282);
  });

  it('标准截面档升序且含 0.75 / 1.5', () => {
    expect(STANDARD_SECTIONS_MM2).toEqual([0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25]);
    expect(pickStandardSection(0.729)).toBe(0.75);
    expect(pickStandardSection(1.4583)).toBe(1.5);
    expect(pickStandardSection(0.1)).toBe(0.5);
    expect(pickStandardSection(100)).toBe(25);
  });
});

describe('dcDrop · 铜 1A / 50m / 1.0mm² / 24V / 10%', () => {
  const r = dcDrop({ currentA: 1, lengthM: 50, sectionMm2: 1.0, systemV: 24, allowablePct: 10 });

  it('输入有效', () => {
    expect(r.valid).toBe(true);
  });

  it('ΔU = 1.75 V（2×0.0175×50×1/1.0）', () => {
    expect(r.deltaV).toBeCloseTo(1.75, 6);
  });

  it('压降 ≈ 7.29%、末端电压 ≈ 22.25 V', () => {
    expect(r.pct).toBeCloseTo(7.2917, 3);
    expect(r.endV).toBeCloseTo(22.25, 6);
  });

  it('满足 10% 的最大单程长度 ≈ 68.57 m', () => {
    expect(r.maxLengthM).toBeCloseTo(68.5714, 3);
  });

  it('最小截面 ≈ 0.729 mm² → 推荐标准档 0.75 mm²', () => {
    expect(r.minSectionMm2).toBeCloseTo(0.7292, 3);
    expect(r.recommendedSectionMm2).toBe(0.75);
  });

  it('7.29% ≤ 10% → 合规', () => {
    expect(r.compliant).toBe(true);
  });
});

describe('dcDrop · 电流加倍后超限', () => {
  const r = dcDrop({ currentA: 2, lengthM: 50, sectionMm2: 1.0, systemV: 24, allowablePct: 10 });

  it('ΔU = 3.5 V、压降 ≈ 14.58% → 不合规', () => {
    expect(r.deltaV).toBeCloseTo(3.5, 6);
    expect(r.pct).toBeCloseTo(14.5833, 3);
    expect(r.compliant).toBe(false);
  });

  it('末端电压 ≈ 20.5 V（低于 21.6 V 判据）', () => {
    expect(r.endV).toBeCloseTo(20.5, 6);
    expect(r.endV).toBeLessThan(21.6);
  });

  it('最小截面 ≈ 1.458 mm² → 推荐 1.5 mm²', () => {
    expect(r.minSectionMm2).toBeCloseTo(1.4583, 3);
    expect(r.recommendedSectionMm2).toBe(1.5);
  });
});

describe('dcDrop · 材质与系统电压', () => {
  it('铝电阻率更高 → 同条件压降为铜的 1.611 倍', () => {
    const cu = dcDrop({ currentA: 1, lengthM: 50, sectionMm2: 1, material: 'copper' });
    const al = dcDrop({ currentA: 1, lengthM: 50, sectionMm2: 1, material: 'aluminum' });
    expect(al.deltaV / cu.deltaV).toBeCloseTo(0.0282 / 0.0175, 6);
    expect(al.pct).toBeGreaterThan(cu.pct);
  });

  it('默认值：铜 / 24V / 10%', () => {
    const r = dcDrop({ currentA: 1, lengthM: 50, sectionMm2: 1 });
    expect(r.pct).toBeCloseTo(7.2917, 3);
    expect(r.endV).toBeCloseTo(22.25, 6);
  });

  it('12V 系统同条件压降百分比翻倍 → 超限', () => {
    const r = dcDrop({ currentA: 1, lengthM: 50, sectionMm2: 1, systemV: 12, allowablePct: 10 });
    expect(r.pct).toBeCloseTo(14.5833, 3);
    expect(r.compliant).toBe(false);
  });

  it('电流为 0 时压降为 0，最大长度置 0（不返回 Infinity）', () => {
    const r = dcDrop({ currentA: 0, lengthM: 50, sectionMm2: 1 });
    expect(r.valid).toBe(true);
    expect(r.deltaV).toBe(0);
    expect(r.endV).toBe(24);
    expect(r.maxLengthM).toBe(0);
    expect(Number.isFinite(r.maxLengthM)).toBe(true);
  });
});

describe('dcDrop · 输入校验', () => {
  it('负电流 → valid:false 且数值全 0', () => {
    const r = dcDrop({ currentA: -1, lengthM: 50, sectionMm2: 1 });
    expect(r.valid).toBe(false);
    expect(r.deltaV).toBe(0);
    expect(r.pct).toBe(0);
    expect(r.endV).toBe(0);
    expect(r.compliant).toBe(false);
  });

  it('负长度 → valid:false', () => {
    expect(dcDrop({ currentA: 1, lengthM: -50, sectionMm2: 1 }).valid).toBe(false);
  });

  it('零 / 负截面 → valid:false', () => {
    expect(dcDrop({ currentA: 1, lengthM: 50, sectionMm2: 0 }).valid).toBe(false);
    expect(dcDrop({ currentA: 1, lengthM: 50, sectionMm2: -1 }).valid).toBe(false);
  });

  it('零 / 负电压或非正允许压降 → valid:false', () => {
    expect(dcDrop({ currentA: 1, lengthM: 50, sectionMm2: 1, systemV: 0 }).valid).toBe(false);
    expect(dcDrop({ currentA: 1, lengthM: 50, sectionMm2: 1, allowablePct: 0 }).valid).toBe(false);
    expect(dcDrop({ currentA: 1, lengthM: 50, sectionMm2: 1, allowablePct: -5 }).valid).toBe(false);
  });

  it('非有限值 → valid:false', () => {
    expect(dcDrop({ currentA: Number.NaN, lengthM: 50, sectionMm2: 1 }).valid).toBe(false);
    expect(
      dcDrop({ currentA: 1, lengthM: Number.POSITIVE_INFINITY, sectionMm2: 1 }).valid,
    ).toBe(false);
  });
});
