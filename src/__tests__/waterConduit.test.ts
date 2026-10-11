import { describe, expect, it } from 'vitest';
import { sizeConduit } from '@/lib/calc/waterConduit';

describe('D5 穿线管管径选择', () => {
  it('2.5mm² × 3 根 → 推荐 Φ16，合规', () => {
    const r = sizeConduit({ section: 2.5, count: 3 });
    expect(r.wireOd).toBeCloseTo(3.2, 6);
    expect(r.allowance).toBeCloseTo(0.4, 6);
    expect(r.recommendedOd).toBe(16);
    expect(r.fillRate).toBeLessThanOrEqual(40 + 1e-6);
    expect(r.fillOk).toBe(true);
    expect(r.minDiaOk).toBe(true);
    expect(r.compliant).toBe(true);
  });

  it('2 根时填充率上限放宽到 60%', () => {
    const r = sizeConduit({ section: 2.5, count: 2 });
    expect(r.allowance).toBeCloseTo(0.6, 6);
  });

  it('根数多 → 需要更大的管径', () => {
    const few = sizeConduit({ section: 2.5, count: 3 });
    const many = sizeConduit({ section: 2.5, count: 10 });
    expect((many.recommendedOd ?? 0)).toBeGreaterThanOrEqual(few.recommendedOd ?? 0);
  });

  it('边界：截面/根数非法时兜底为 1 根 1.5mm²', () => {
    const r = sizeConduit({ section: 0, count: 0 });
    expect(r.wireOd).toBeCloseTo(2.8, 6);
    expect(r.recommendedOd).toBe(16);
  });

  it('未知截面按近似外径估算（不崩溃）', () => {
    const r = sizeConduit({ section: 120, count: 1 });
    expect(Number.isFinite(r.wireOd)).toBe(true);
    expect(r.wireOd).toBeGreaterThan(0);
  });
});
