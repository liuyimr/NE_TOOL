import { describe, expect, it } from 'vitest';
import { emergencyBattery } from '@/lib/calc/waterEmergency';

describe('D6 应急照明时长与电池容量', () => {
  it('C = P·t/(U·η·DoD)', () => {
    const r = emergencyBattery({
      lampW: 5,
      count: 20,
      durationMin: 90,
      batteryV: 24,
      efficiency: 0.85,
      dod: 0.8,
    });
    expect(r.totalPowerW).toBeCloseTo(100, 6);
    expect(r.durationH).toBeCloseTo(1.5, 6);
    expect(r.capacityAh).toBeCloseTo((100 * 1.5) / (24 * 0.85 * 0.8), 4);
    expect(r.meets30).toBe(true);
    expect(r.meets90).toBe(true);
  });

  it('30 min 场景：满足 30 不满足 90', () => {
    const r = emergencyBattery({ lampW: 3, count: 10, durationMin: 30 });
    expect(r.meets30).toBe(true);
    expect(r.meets90).toBe(false);
  });

  it('边界：时长为 0 → 容量 0；效率/DoD 越界按默认', () => {
    const r = emergencyBattery({ lampW: 5, count: 10, durationMin: 0, efficiency: 2, dod: 0 });
    expect(r.capacityAh).toBe(0);
    // 效率钳到默认 0.85、DoD 默认 0.8 → 结果有限
    expect(Number.isFinite(r.capacityAh)).toBe(true);
  });

  it('电池电压非正时按默认 24V', () => {
    const r = emergencyBattery({ lampW: 5, count: 10, durationMin: 60, batteryV: 0 });
    expect(Number.isFinite(r.capacityAh)).toBe(true);
    expect(r.capacityAh).toBeCloseTo((50 * 1) / (24 * 0.85 * 0.8), 4);
  });
});
