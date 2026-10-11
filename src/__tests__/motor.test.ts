import { describe, expect, it } from 'vitest';
import {
  motorCurrent,
  motorPower,
  motorTorque,
  polesToPairs,
  synchronousSpeed,
} from '@/lib/calc/motor';

describe('C7 三相电机计算', () => {
  it('额定电流 I = P / (√3·U·cosφ·η)', () => {
    const i = motorCurrent({ powerKW: 7.5, voltage: 380, powerFactor: 0.85, efficiency: 0.9 });
    expect(i).toBeCloseTo(14.9, 1);
  });

  it('由电流反算功率', () => {
    const p = motorPower({ voltage: 380, current: 15, powerFactor: 0.85, efficiency: 0.9 });
    expect(p).toBeCloseTo(7.55, 1);
  });

  it('扭矩 T = 9550·P(kW)/n', () => {
    expect(motorTorque(7.5, 1440)).toBeCloseTo(49.74, 2);
    expect(motorTorque(7.5, 0)).toBe(0);
  });

  it('同步转速 n = 60·f/p', () => {
    expect(synchronousSpeed(50, 2)).toBe(1500);
    expect(synchronousSpeed(50, 1)).toBe(3000);
    expect(synchronousSpeed(60, 2)).toBe(1800);
  });

  it('极数 → 极对数', () => {
    expect(polesToPairs(4)).toBe(2);
    expect(polesToPairs(2)).toBe(1);
  });
});
