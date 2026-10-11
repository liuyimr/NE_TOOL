import { describe, expect, it } from 'vitest';
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  pt100Resistance,
  pt100Temperature,
  tempToThermocouple,
  thermocoupleToTemp,
} from '@/lib/calc/temperature';

describe('C2 PT100 / 热电偶温度换算', () => {
  it('PT100 0℃ = 100Ω，100℃ ≈ 138.51Ω', () => {
    expect(pt100Resistance(0)).toBeCloseTo(100, 6);
    expect(pt100Resistance(100)).toBeCloseTo(138.5055, 3);
  });

  it('PT100 反算：电阻 → 温度', () => {
    expect(pt100Temperature(100)).toBeCloseTo(0, 3);
    expect(pt100Temperature(138.5055)).toBeCloseTo(100, 2);
    // 负温段
    expect(pt100Temperature(pt100Resistance(-50))).toBeCloseTo(-50, 2);
  });

  it('热电偶 K 型 41µV/℃', () => {
    expect(thermocoupleToTemp(41, 'K')).toBeCloseTo(1000, 6);
    expect(tempToThermocouple(1000, 'K')).toBeCloseTo(41, 6);
  });

  it('摄氏/华氏互转', () => {
    expect(celsiusToFahrenheit(100)).toBeCloseTo(212, 10);
    expect(fahrenheitToCelsius(212)).toBeCloseTo(100, 10);
    expect(celsiusToFahrenheit(0)).toBeCloseTo(32, 10);
  });
});
