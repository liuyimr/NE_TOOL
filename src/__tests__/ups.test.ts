import { describe, expect, it } from 'vitest';
import { upsCapacity } from '@/lib/calc/ups';

describe('B5 UPS 容量与电池', () => {
  it('S(kVA) = P(kW) / cosφ', () => {
    const r = upsCapacity({ loadKW: 10, powerFactor: 0.9, backupHours: 2 });
    expect(r.apparentKVA).toBeCloseTo(11.1111, 3);
    expect(r.recommendedKVA).toBeCloseTo(13.8889, 3);
    expect(r.activeKW).toBe(10);
  });

  it('电池容量 Ah 公式', () => {
    const r = upsCapacity({
      loadKW: 10,
      powerFactor: 0.9,
      backupHours: 2,
      batteryVoltage: 240,
      efficiency: 0.9,
      dischargeFactor: 0.8,
    });
    // 10000W × 2h / (240 × 0.9 × 0.8) = 20000 / 172.8
    expect(r.batteryAh).toBeCloseTo(115.74, 1);
    expect(r.batteryKWh).toBeCloseTo((240 * r.batteryAh) / 1000, 6);
  });

  it('零负载边界', () => {
    const r = upsCapacity({ loadKW: 0, backupHours: 4 });
    expect(r.apparentKVA).toBe(0);
    expect(r.batteryAh).toBe(0);
  });
});
