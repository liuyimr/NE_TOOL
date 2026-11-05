import { describe, expect, it } from 'vitest';
import { servoGear, GEAR_RATIO_MIN, GEAR_RATIO_MAX } from '@/lib/calc/servoGear';

describe('P17 伺服电子齿轮比与脉冲当量', () => {
  it('E=131072、Δ=0.001、i=10、P=10 → 齿轮比 131.072', () => {
    const r = servoGear({ encoderRes: 131072, pitch: 10, gearRatio: 10, pulseEquiv: 0.001 });
    expect(r.valid).toBe(true);
    expect(r.ratio).toBeCloseTo(131.072, 6);
  });

  it('最简整数比 16384/125，每转指令脉冲 10000', () => {
    const r = servoGear({ encoderRes: 131072, pitch: 10, gearRatio: 10, pulseEquiv: 0.001 });
    expect(r.numerator).toBe(16384);
    expect(r.denominator).toBe(125);
    expect(r.pulsesPerRev).toBeCloseTo(10000, 6);
  });

  it('131.072 超出可设范围（1/50~50）→ inRange=false', () => {
    const r = servoGear({ encoderRes: 131072, pitch: 10, gearRatio: 10, pulseEquiv: 0.001 });
    expect(r.inRange).toBe(false);
    expect(GEAR_RATIO_MAX).toBe(50);
    expect(GEAR_RATIO_MIN).toBeCloseTo(0.02, 9);
  });

  it('减速比 1 → 齿轮比 13.1072，在可设范围内', () => {
    const r = servoGear({ encoderRes: 131072, pitch: 10, gearRatio: 1, pulseEquiv: 0.001 });
    expect(r.ratio).toBeCloseTo(13.1072, 6);
    expect(r.inRange).toBe(true);
  });

  it('边界：导程 0 → valid=false 并给错误信息，无 NaN', () => {
    const r = servoGear({ encoderRes: 131072, pitch: 0, gearRatio: 10, pulseEquiv: 0.001 });
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
    expect(Number.isFinite(r.ratio)).toBe(true);
  });

  it('边界：脉冲当量 0 / 编码器 0 → 无效', () => {
    expect(servoGear({ encoderRes: 131072, pitch: 10, gearRatio: 10, pulseEquiv: 0 }).valid).toBe(false);
    expect(servoGear({ encoderRes: 0, pitch: 10, gearRatio: 10, pulseEquiv: 0.001 }).valid).toBe(false);
  });
});
