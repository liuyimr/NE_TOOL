import { describe, expect, it } from 'vitest';
import { pointCount } from '@/lib/calc/pointCount';

describe('B3/B7 点位统计与 DDC 数量', () => {
  it('按类型统计并估算 DDC', () => {
    const r = pointCount({
      points: [
        { type: 'AI', count: 20 },
        { type: 'DI', count: 40 },
      ],
      capacityPerDdc: 48,
      loadFactor: 0.8,
      marginPct: 20,
    });
    expect(r.total).toBe(60);
    expect(r.byType.AI).toBe(20);
    expect(r.byType.DI).toBe(40);
    expect(r.marginPoints).toBe(12);
    expect(r.designPoints).toBe(72);
    expect(r.ddcCount).toBe(2); // ceil(72 / 38.4) = 2
  });

  it('同类型累加', () => {
    const r = pointCount({
      points: [
        { type: 'DI', count: 10 },
        { type: 'DI', count: 5 },
      ],
    });
    expect(r.byType.DI).toBe(15);
    expect(r.total).toBe(15);
  });

  it('空输入安全', () => {
    const r = pointCount({ points: [] });
    expect(r.total).toBe(0);
    expect(r.ddcCount).toBe(0);
  });
});
