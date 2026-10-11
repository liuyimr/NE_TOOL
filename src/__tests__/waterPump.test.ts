import { describe, expect, it } from 'vitest';
import { pumpHead, pumpPower, hazenWilliams, localLoss } from '@/lib/calc/waterPump';

describe('D9 给水所需扬程', () => {
  it('H = 几何 + 沿程 + 局部 + 自由', () => {
    const r = pumpHead({
      staticHead: 30,
      pipeLength: 80,
      frictionPerMeter: 0.02,
      localLoss: 3,
      freeHead: 5,
    });
    expect(r.frictionLoss).toBeCloseTo(1.6, 6);
    expect(r.totalHead).toBeCloseTo(30 + 1.6 + 3 + 5, 6);
  });

  it('边界：负值全部钳 0', () => {
    const r = pumpHead({ staticHead: -5, pipeLength: -1, frictionPerMeter: -1, localLoss: -1, freeHead: -1 });
    expect(r.totalHead).toBe(0);
  });

  it('海澄-威廉沿程损失随流量增大', () => {
    const a = hazenWilliams(10, 50, 100, 140);
    const b = hazenWilliams(20, 50, 100, 140);
    expect(b).toBeGreaterThan(a);
    expect(hazenWilliams(0, 50, 100, 140)).toBe(0);
  });

  it('局部损失 h_j = Σξ·v²/(2g)', () => {
    expect(localLoss(2, 1)).toBeCloseTo((2 * 1) / (2 * 9.81), 6);
  });
});

describe('D10 水泵轴功率', () => {
  it('P = Q·H/(367·η)，并给配套功率', () => {
    const r = pumpPower({ flow: 20, head: 40, efficiency: 0.7, margin: 1.15 });
    expect(r.shaftPowerKw).toBeCloseTo(800 / (367 * 0.7), 4);
    expect(r.motorPowerKw).toBeCloseTo(r.shaftPowerKw * 1.15, 6);
    expect(r.standardMotorKw).toBe(4);
  });

  it('边界：效率越界按默认 0.7；流量/扬程 0 → 轴功率 0', () => {
    const r = pumpPower({ flow: 0, head: 0, efficiency: 2 });
    expect(r.efficiency).toBeCloseTo(0.7, 6);
    expect(r.shaftPowerKw).toBe(0);
    expect(r.standardMotorKw).toBe(0.55);
  });

  it('超出常用电机档 → standardMotorKw 为 null', () => {
    const r = pumpPower({ flow: 5000, head: 200, efficiency: 0.7 });
    expect(r.standardMotorKw).toBeNull();
  });
});
