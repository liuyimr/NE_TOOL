import { describe, expect, it } from 'vitest';
import { cableLength } from '@/lib/calc/cableLength';

describe('B1 线缆长度估算', () => {
  it('L = (水平 + 垂直) × 点数 × 余量', () => {
    const r = cableLength({ points: 100, horizontal: 60, vertical: 10, margin: 1.1 });
    expect(r.perPoint).toBe(70);
    expect(r.totalLength).toBeCloseTo(7700, 6);
    expect(r.boxes).toBe(26); // ceil(7700 / 305)
  });

  it('默认余量 1.1、箱长 305', () => {
    const r = cableLength({ points: 10, horizontal: 50, vertical: 0 });
    expect(r.margin).toBe(1.1);
    expect(r.totalLength).toBeCloseTo(550, 6);
    expect(r.boxes).toBe(2); // ceil(550/305)
  });

  it('零输入安全', () => {
    const r = cableLength({ points: 0, horizontal: 0, vertical: 0 });
    expect(r.totalLength).toBe(0);
    expect(r.boxes).toBe(0);
  });
});
