import { describe, expect, it } from 'vitest';
import { fanPower, MOTOR_SERIES_KW, FAN_POWER_DIVISOR, type FanPowerInput } from '@/lib/calc/fanPower';

function baseInput(overrides: Partial<FanPowerInput> = {}): FanPowerInput {
  return {
    flowM3h: 10000,
    totalPa: 500,
    fanEff: 0.7,
    transEff: 0.95,
    motorMargin: 1.2,
    ...overrides,
  };
}

describe('H16 风机选型与轴功率', () => {
  it('锚点：10000 m³/h、500 Pa → 轴功率 2.0886 kW，需 2.5063 kW，选 3 kW', () => {
    const r = fanPower(baseInput());
    // 10000×500/(3.6e6×0.7×0.95) = 5e6/2394000 = 2.0885547201336676 kW
    // ×1.2 = 2.506265664160401 kW → 首个 ≥ 的电机档为 3 kW
    expect(r.valid).toBe(true);
    expect(r.shaftKw).toBeCloseTo(2.0885547201336676, 8);
    expect(r.requiredKw).toBeCloseTo(2.506265664160401, 8);
    expect(r.recommendedMotorKw).toBe(3);
    expect(r.fanTypeNote).toContain('中压离心');
    expect(FAN_POWER_DIVISOR).toBe(3600000);
    expect(MOTOR_SERIES_KW[0]).toBe(0.12);
    expect(MOTOR_SERIES_KW[MOTOR_SERIES_KW.length - 1]).toBe(250);
  });

  it('全压分档：<500 Pa 轴流、500~1500 中压、>1500 高压', () => {
    expect(fanPower(baseInput({ totalPa: 200 })).fanTypeNote).toContain('轴流');
    expect(fanPower(baseInput({ totalPa: 500 })).fanTypeNote).toContain('中压离心');
    expect(fanPower(baseInput({ totalPa: 1500 })).fanTypeNote).toContain('中压离心');
    expect(fanPower(baseInput({ totalPa: 2000 })).fanTypeNote).toContain('高压离心');
  });

  it('边界：储备系数 <1 按 1 处理（requiredKw 等于轴功率）', () => {
    const r = fanPower(baseInput({ motorMargin: 0.5 }));
    expect(r.valid).toBe(true);
    expect(r.motorMargin).toBe(1);
    expect(r.requiredKw).toBeCloseTo(r.shaftKw, 9);
    expect(r.note).toContain('已按 1 处理');
  });

  it('边界：效率越界 / 风量或全压为 0 / 非有限输入 → valid=false', () => {
    const cases = [
      baseInput({ fanEff: 0 }),
      baseInput({ fanEff: 1.2 }),
      baseInput({ transEff: 0 }),
      baseInput({ transEff: 1.5 }),
      baseInput({ flowM3h: 0 }),
      baseInput({ totalPa: 0 }),
      baseInput({ fanEff: Number.NaN }),
    ];
    for (const input of cases) {
      const r = fanPower(input);
      expect(r.valid).toBe(false);
      expect(r.shaftKw).toBe(0);
      expect(r.recommendedMotorKw).toBeNull();
      expect(Number.isFinite(r.requiredKw)).toBe(true);
    }
  });

  it('边界：极大风量与全压导致功率溢出 → valid=false', () => {
    const r = fanPower(baseInput({ flowM3h: 1e308, totalPa: 1e308 }));
    expect(r.valid).toBe(false);
    expect(r.note).toContain('溢出');
    expect(Number.isFinite(r.shaftKw)).toBe(true);
  });
});
