import { describe, expect, it } from 'vitest';
import { waterHeater } from '@/lib/calc/waterHeater';

describe('D12 热水耗热量与加热功率', () => {
  it('P = 1.163·V·ΔT/(t·1000·η)', () => {
    const r = waterHeater({ volumeL: 1000, coldTemp: 10, hotTemp: 60, heatHours: 4, efficiency: 0.9 });
    expect(r.deltaT).toBeCloseTo(50, 6);
    expect(r.powerKw).toBeCloseTo((1.163 * 1000 * 50) / (4 * 1000 * 0.9), 4);
    expect(r.energyKwh).toBeCloseTo(r.powerKw * 4, 4);
    expect(r.volumePerHour).toBeCloseTo(250, 6);
  });

  it('加热时间越短功率越大', () => {
    const slow = waterHeater({ volumeL: 500, coldTemp: 15, hotTemp: 55, heatHours: 4, efficiency: 0.9 });
    const fast = waterHeater({ volumeL: 500, coldTemp: 15, hotTemp: 55, heatHours: 1, efficiency: 0.9 });
    expect(fast.powerKw).toBeGreaterThan(slow.powerKw);
  });

  it('边界：出水温度低于进水 → ΔT 钳 0，功率 0', () => {
    const r = waterHeater({ volumeL: 500, coldTemp: 60, hotTemp: 10, heatHours: 2, efficiency: 0.9 });
    expect(r.deltaT).toBe(0);
    expect(r.powerKw).toBe(0);
  });

  it('边界：时间为 0 按 1h；效率越界按默认 0.9', () => {
    const r = waterHeater({ volumeL: 100, coldTemp: 10, hotTemp: 60, heatHours: 0, efficiency: 5 });
    expect(r.powerKw).toBeCloseTo((1.163 * 100 * 50) / (1 * 1000 * 0.9), 4);
  });
});
