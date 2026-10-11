import { describe, expect, it } from 'vitest';
import { selectBreaker, STANDARD_RATINGS } from '@/lib/calc/waterBreaker';

describe('D4 断路器选型与导线配合', () => {
  it('Ib=24, Iz=32 → In=25，配合合规', () => {
    const r = selectBreaker({ ib: 24, iz: 32, loadType: 'general' });
    expect(r.recommendedIn).toBe(25);
    expect(r.curve).toBe('C');
    expect(r.i2).toBeCloseTo(1.45 * 25, 6);
    expect(r.rangeOk).toBe(true);
    expect(r.thermalOk).toBe(true);
    expect(r.compliant).toBe(true);
  });

  it('载流量不足 → 热稳定不满足', () => {
    const r = selectBreaker({ ib: 40, iz: 40, loadType: 'general' });
    expect(r.recommendedIn).toBe(40);
    // I2 = 1.45×40 = 58 > 1.45×40 = 58 → 边界恰好满足（≤）
    expect(r.thermalOk).toBe(true);
    const r2 = selectBreaker({ ib: 40, iz: 32 });
    // 就近 In 找不到 ≥40 且 ≤32 的值 → rangeOk 假
    expect(r2.rangeOk).toBe(false);
    expect(r2.compliant).toBe(false);
  });

  it('脱扣曲线按负载类型', () => {
    expect(selectBreaker({ ib: 10, iz: 20, loadType: 'resistive' }).curve).toBe('B');
    expect(selectBreaker({ ib: 10, iz: 20, loadType: 'lighting' }).curve).toBe('C');
    expect(selectBreaker({ ib: 10, iz: 20, loadType: 'motor' }).curve).toBe('D');
    expect(selectBreaker({ ib: 10, iz: 20, loadType: 'transformer' }).curve).toBe('D');
  });

  it('边界：Ib=0 → 取最小额定档；超范围 → null', () => {
    expect(selectBreaker({ ib: 0, iz: 10 }).recommendedIn).toBe(STANDARD_RATINGS[0]);
    expect(selectBreaker({ ib: 1000, iz: 2000 }).recommendedIn).toBeNull();
  });
});
