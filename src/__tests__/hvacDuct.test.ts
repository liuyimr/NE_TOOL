import { describe, expect, it } from 'vitest';
import { ductSize, RECT_DUCT_SIZES } from '@/lib/calc/hvacDuct';

describe('H13 风管尺寸选择', () => {
  it('35640 m³/h、7 m/s → 截面积 ≈ 1.414 m²，圆直径 ≈ 1342 mm', () => {
    const r = ductSize({ flowM3h: 35640, velocity: 7, shape: 'round' });
    expect(r.areaM2).toBeCloseTo(1.4143, 3);
    expect(r.roundDiaMm).toBeCloseTo(1341.9, 0);
    expect(r.valid).toBe(true);
  });

  it('矩形：给出标准宽高，实际风速不超过推荐值', () => {
    const r = ductSize({ flowM3h: 35640, velocity: 7, shape: 'rect', aspectMax: 4 });
    expect(r.rectW).not.toBeNull();
    expect(r.rectH).not.toBeNull();
    expect(RECT_DUCT_SIZES).toContain(r.rectW as number);
    expect(RECT_DUCT_SIZES).toContain(r.rectH as number);
    expect(r.actualVelocity).toBeLessThanOrEqual(7 + 1e-6);
    expect(r.exceeds).toBe(false);
  });

  it('边界：风速 0 → valid=false，不产生 Infinity', () => {
    const r = ductSize({ flowM3h: 35640, velocity: 0, shape: 'round' });
    expect(r.valid).toBe(false);
    expect(r.areaM2).toBe(0);
    expect(r.roundDiaMm).toBe(0);
    expect(Number.isFinite(r.roundDiaMm)).toBe(true);
  });

  it('边界：风量 0 → 截面积 0；矩形兜底不为 null', () => {
    const r = ductSize({ flowM3h: 0, velocity: 7, shape: 'rect' });
    expect(r.areaM2).toBe(0);
    expect(r.rectW).not.toBeNull();
    expect(r.rectH).not.toBeNull();
  });

  it('长宽比约束越小，矩形更接近方形', () => {
    const a = ductSize({ flowM3h: 20000, velocity: 6, shape: 'rect', aspectMax: 4 });
    const b = ductSize({ flowM3h: 20000, velocity: 6, shape: 'rect', aspectMax: 1.5 });
    const ratioA = (a.rectW as number) / (a.rectH as number);
    const ratioB = (b.rectW as number) / (b.rectH as number);
    expect(ratioB).toBeLessThanOrEqual(ratioA + 1e-9);
  });
});
