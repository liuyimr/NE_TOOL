import { describe, expect, it } from 'vitest';
import { FILL_LIMITS, trayFill } from '@/lib/calc/trayFill';

describe('B2 桥架 / 管路填充率', () => {
  it('40% 填充率合规（弱电）', () => {
    const r = trayFill({
      cables: [{ count: 4, section: 100 }],
      containerArea: 1000,
      kind: 'weak',
    });
    expect(r.cableArea).toBe(400);
    expect(r.fillRate).toBeCloseTo(40, 6);
    expect(r.limit).toBe(50);
    expect(r.compliant).toBe(true);
  });

  it('超限不合规（电力 40%）', () => {
    const r = trayFill({
      cables: [{ count: 10, section: 100 }],
      containerArea: 2000,
      kind: 'power',
    });
    expect(r.fillRate).toBeCloseTo(50, 6);
    expect(r.compliant).toBe(false);
  });

  it('由宽 × 高计算容器面积', () => {
    const r = trayFill({
      cables: [{ count: 4, section: 100 }],
      width: 100,
      height: 20,
      kind: 'weak',
    });
    expect(r.containerArea).toBe(2000);
    expect(r.fillRate).toBeCloseTo(20, 6);
  });

  it('限值常量', () => {
    expect(FILL_LIMITS.power).toBe(40);
    expect(FILL_LIMITS.weak).toBe(50);
    expect(FILL_LIMITS.conduit).toBe(40);
  });
});
