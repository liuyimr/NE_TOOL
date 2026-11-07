import { describe, expect, it } from 'vitest';
import { poeBudget, POE_PORT_LIMIT_W, type PoeBudgetInput, type PoeStandard } from '@/lib/calc/poeBudget';

/** 默认输入：10×12 W 摄像机、4×15 W AP、2×7 W 其他设备，370 W 预算，1.2 余量 */
function baseInput(overrides: Partial<PoeBudgetInput> = {}): PoeBudgetInput {
  return {
    camCount: 10,
    camW: 12,
    apCount: 4,
    apW: 15,
    otherCount: 2,
    otherW: 7,
    budgetW: 370,
    margin: 1.2,
    standard: 'at',
    ...overrides,
  };
}

describe('N12 PoE 供电功率预算', () => {
  it('默认算例：194 W 需求、232.8 W 设计需求、剩余 137.2 W、at 单口 25.5 W', () => {
    const r = poeBudget(baseInput());
    // 手工复算：10×12 + 4×15 + 2×7 = 120 + 60 + 14 = 194 W
    expect(r.valid).toBe(true);
    expect(r.totalDemandW).toBe(194);
    expect(r.ports).toBe(16);
    // 194 × 1.2 = 232.8 W；370 − 232.8 = 137.2 W
    expect(r.designDemandW).toBeCloseTo(232.8, 6);
    expect(r.remainingW).toBeCloseTo(137.2, 6);
    expect(r.ok).toBe(true);
    expect(r.requiredSwitches).toBe(1);
    expect(r.requiredBudgetW).toBeCloseTo(232.8, 6);
    expect(r.portLimitW).toBe(25.5);
    expect(r.overPortLimit).toBe(false);
    expect(POE_PORT_LIMIT_W.af).toBe(12.95);
    expect(POE_PORT_LIMIT_W.at).toBe(25.5);
    expect(POE_PORT_LIMIT_W.bt3).toBe(51);
    expect(POE_PORT_LIMIT_W.bt4).toBe(71.3);
  });

  it('af 标准：单台 AP 15 W > 12.95 W 触发单口超限并给出整改提示', () => {
    const r = poeBudget(baseInput({ standard: 'af' }));
    expect(r.valid).toBe(true);
    expect(r.portLimitW).toBe(12.95);
    expect(r.overPortLimit).toBe(true);
    expect(r.note).toContain('需提高 PoE 标准或改为本地供电');
    // 预算结论与标准无关，仍由 370 W 与 232.8 W 比较
    expect(r.remainingW).toBeCloseTo(137.2, 6);
  });

  it('预算不足：100 W 预算 → 缺 132.8 W、需 3 台交换机、最小预算 232.8 W', () => {
    const r = poeBudget(baseInput({ budgetW: 100 }));
    // 232.8 − 100 = 132.8 W；ceil(232.8/100) = 3
    expect(r.valid).toBe(true);
    expect(r.remainingW).toBeCloseTo(-132.8, 6);
    expect(r.ok).toBe(false);
    expect(r.requiredSwitches).toBe(3);
    expect(r.requiredBudgetW).toBeCloseTo(232.8, 6);
    expect(r.note).toContain('PoE 预算不足');
  });

  it('边界：无设备 / 预算为 0 / 非法标准 → valid=false，且所有输出为有限数', () => {
    const noDevice = poeBudget(baseInput({ camCount: 0, apCount: 0, otherCount: 0 }));
    expect(noDevice.valid).toBe(false);
    expect(noDevice.note).toContain('至少一组设备数量大于 0');

    const zeroBudget = poeBudget(baseInput({ budgetW: 0 }));
    expect(zeroBudget.valid).toBe(false);
    expect(zeroBudget.requiredSwitches).toBe(0);

    const badStandard = poeBudget(baseInput({ standard: 'zz' as PoeStandard }));
    expect(badStandard.valid).toBe(false);
    expect(badStandard.note).toContain('未知的 PoE 标准');

    for (const r of [noDevice, zeroBudget, badStandard]) {
      expect(Number.isFinite(r.totalDemandW)).toBe(true);
      expect(Number.isFinite(r.designDemandW)).toBe(true);
      expect(Number.isFinite(r.remainingW)).toBe(true);
    }
  });

  it('边界：负数量按 0、margin<1 按 1、极大值溢出被拦截', () => {
    const clamped = poeBudget(baseInput({ camCount: -5, margin: 0.5 }));
    // 摄像机 −5 台按 0 处理：需求 = 4×15 + 2×7 = 74 W；margin 0.5 → 1
    expect(clamped.valid).toBe(true);
    expect(clamped.totalDemandW).toBe(74);
    expect(clamped.ports).toBe(6);
    expect(clamped.margin).toBe(1);
    expect(clamped.designDemandW).toBe(74);
    expect(clamped.remainingW).toBe(296);

    const huge = poeBudget(baseInput({ camCount: 1e308, camW: 1e308 }));
    expect(huge.valid).toBe(false);
    expect(Number.isFinite(huge.totalDemandW)).toBe(true);
    expect(huge.note).toContain('溢出');
  });
});
