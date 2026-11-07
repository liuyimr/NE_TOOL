import { describe, expect, it } from 'vitest';
import {
  reactivePower,
  NO_COMPENSATION_NOTE,
  SQRT3,
  KW_TO_W,
  POWER_FACTOR_RANGE,
  REACTIVE_POWER_DEFAULTS,
  type ReactivePowerInput,
} from '@/lib/calc/reactivePower';

function baseInput(overrides: Partial<ReactivePowerInput> = {}): ReactivePowerInput {
  return {
    activeKw: 200,
    cosPhi1: 0.75,
    cosPhi2: 0.95,
    voltageV: 380,
    stepKvar: 25,
    transformerKva: 0,
    ...overrides,
  };
}

describe('E15 无功补偿容量计算', () => {
  it('锚点：P=200 kW、0.75→0.95 → Qc≈110.6466 kvar、5 路×25=125 kvar', () => {
    const r = reactivePower(baseInput());
    // tan1 = sqrt(1−0.75²)/0.75 = 0.8819171036881969
    // tan2 = sqrt(1−0.95²)/0.95 = 0.32868410517886315
    // Qc = 200×(tan1−tan2) = 110.64659970186675 kvar
    expect(r.valid).toBe(true);
    expect(r.tan1).toBeCloseTo(0.8819171036881969, 9);
    expect(r.tan2).toBeCloseTo(0.32868410517886315, 9);
    expect(r.qcKvar).toBeCloseTo(110.64659970186675, 8);
    expect(r.circuits).toBe(5);
    expect(r.installedKvar).toBe(125);
    expect(r.overKvar).toBeCloseTo(14.35340029813325, 8);
    // S: 200/0.75 = 266.6667 kVA → 200/0.95 = 210.5263 kVA
    expect(r.sBeforeKva).toBeCloseTo(266.6666666666667, 8);
    expect(r.sAfterKva).toBeCloseTo(210.5263157894737, 8);
    expect(r.savedKva).toBeCloseTo(56.140350877193, 8);
    // I = 200000/(√3×380×cosφ)
    expect(r.currentBeforeA).toBeCloseTo(405.15808364184267, 6);
    expect(r.currentAfterA).toBeCloseTo(319.86164498040216, 6);
    expect(r.currentAfterA).toBeLessThan(r.currentBeforeA);
    expect(SQRT3).toBeCloseTo(1.7320508075688772, 9);
    expect(KW_TO_W).toBe(1000);
    expect(POWER_FACTOR_RANGE).toEqual({ min: 0, max: 1 });
    expect(REACTIVE_POWER_DEFAULTS.stepKvar).toBe(25);
    expect(REACTIVE_POWER_DEFAULTS.cosPhi2).toBe(0.95);
  });

  it('变压器容量 400 kVA → 负载率由 66.6667% 降至 52.6316%', () => {
    const r = reactivePower(baseInput({ transformerKva: 400 }));
    expect(r.loadBeforePct).toBeCloseTo(66.66666666666667, 8);
    expect(r.loadAfterPct).toBeCloseTo(52.63157894736843, 8);
    const none = reactivePower(baseInput());
    expect(none.loadBeforePct).toBeNull();
    expect(none.loadAfterPct).toBeNull();
  });

  it('目标功率因数不高于当前值 → 无需补偿，Qc/路数/实装容量均为 0', () => {
    const r = reactivePower(baseInput({ cosPhi2: 0.7 }));
    expect(r.valid).toBe(true);
    expect(r.qcKvar).toBe(0);
    expect(r.circuits).toBe(0);
    expect(r.installedKvar).toBe(0);
    expect(r.overKvar).toBe(0);
    expect(r.note).toContain(NO_COMPENSATION_NOTE);
    expect(r.note).toContain('目标功率因数不高于当前值，无需补偿');

    // 相等时同样无需补偿
    const same = reactivePower(baseInput({ cosPhi2: 0.75 }));
    expect(same.qcKvar).toBe(0);
    expect(same.circuits).toBe(0);
  });

  it('边界：功率因数越界 / P、U、step 为 0 / 非有限数 → valid=false', () => {
    const cases = [
      baseInput({ cosPhi1: 0 }),
      baseInput({ cosPhi1: 1.2 }),
      baseInput({ cosPhi2: 0 }),
      baseInput({ cosPhi2: 1.5 }),
      baseInput({ activeKw: 0 }),
      baseInput({ voltageV: 0 }),
      baseInput({ stepKvar: 0 }),
      baseInput({ voltageV: Number.POSITIVE_INFINITY }),
    ];
    for (const input of cases) {
      const r = reactivePower(input);
      expect(r.valid).toBe(false);
      expect(r.qcKvar).toBe(0);
      expect(r.circuits).toBe(0);
      expect(Number.isFinite(r.currentBeforeA)).toBe(true);
    }
  });

  it('边界：极大 P 与极小 step 导致投切路数溢出 → valid=false', () => {
    const r = reactivePower(baseInput({ activeKw: 1e308, stepKvar: 1e-308 }));
    expect(r.valid).toBe(false);
    expect(r.note).toContain('溢出');
    expect(Number.isFinite(r.qcKvar)).toBe(true);
    expect(Number.isFinite(r.installedKvar)).toBe(true);
  });
});
