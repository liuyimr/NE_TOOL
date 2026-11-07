import { describe, expect, it } from 'vitest';
import { accessControl, type AccessControlInput } from '@/lib/calc/accessControl';

/** 默认输入：20 门 / 2 门每控 / 每门 2 只读卡器 / 0.5 A、12 V 电锁 / 同时动作率 0.2 / 4 h 后备 */
function baseInput(overrides: Partial<AccessControlInput> = {}): AccessControlInput {
  return {
    doorCount: 20,
    doorsPerController: 2,
    readersPerDoor: 2,
    lockCurrentA: 0.5,
    lockVoltageV: 12,
    lockDutyRatio: 0.2,
    controllerPowerW: 10,
    backupHours: 4,
    psuMargin: 1.3,
    ...overrides,
  };
}

describe('BA13 门禁系统容量与选型', () => {
  it('默认算例：10 台控制器、40 只读卡器、124 W 总功率、161.2 W 电源、51.67 Ah 电池', () => {
    const r = accessControl(baseInput());
    // 手工复算：ceil(20/2) = 10 台；20×2 = 40 只
    expect(r.valid).toBe(true);
    expect(r.controllerCount).toBe(10);
    expect(r.readerCount).toBe(40);
    // 20×0.5×0.2 = 2 A；2×12 = 24 W
    expect(r.lockPeakCurrentA).toBeCloseTo(2, 9);
    expect(r.lockPeakPowerW).toBeCloseTo(24, 9);
    // 10×10 = 100 W；24+100 = 124 W；124×1.3 = 161.2 W
    expect(r.controllerTotalPowerW).toBeCloseTo(100, 9);
    expect(r.totalPowerW).toBeCloseTo(124, 9);
    expect(r.psuRequiredW).toBeCloseTo(161.2, 9);
    // 124×4/(12×0.8) = 496/9.6 = 51.667 Ah
    expect(r.batteryAh).toBeCloseTo(51.667, 3);
    expect(r.note).toContain('同时动作率');
    expect(r.note).toContain('DoD 0.8');
    expect(r.note).toContain('消防联动开门要求另计');
  });

  it('四门控制器：20 门 → 5 台、控制器功耗 50 W、总功率 74 W', () => {
    const r = accessControl(baseInput({ doorsPerController: 4 }));
    expect(r.valid).toBe(true);
    expect(r.controllerCount).toBe(5);
    expect(r.controllerTotalPowerW).toBeCloseTo(50, 9);
    expect(r.totalPowerW).toBeCloseTo(74, 9);
    // 74×1.3 = 96.2 W；74×4/9.6 = 30.833 Ah
    expect(r.psuRequiredW).toBeCloseTo(96.2, 9);
    expect(r.batteryAh).toBeCloseTo(30.833, 3);
  });

  it('单门控制器：20 门 → 20 台、控制器功耗 200 W、总功率 224 W', () => {
    const r = accessControl(baseInput({ doorsPerController: 1 }));
    expect(r.controllerCount).toBe(20);
    expect(r.controllerTotalPowerW).toBeCloseTo(200, 9);
    expect(r.totalPowerW).toBeCloseTo(224, 9);
    expect(r.psuRequiredW).toBeCloseTo(291.2, 9);
    expect(r.batteryAh).toBeCloseTo(93.333, 3);
  });

  it('门数不整除：21 门 / 每控制器 2 门 → 向上取整 11 台', () => {
    const r = accessControl(baseInput({ doorCount: 21 }));
    expect(r.controllerCount).toBe(11);
    expect(r.readerCount).toBe(42);
    // 21×0.5×0.2 = 2.1 A；2.1×12 = 25.2 W；25.2+110 = 135.2 W
    expect(r.lockPeakCurrentA).toBeCloseTo(2.1, 9);
    expect(r.totalPowerW).toBeCloseTo(135.2, 9);
  });

  it('单向读卡与同时动作率提高：读卡器减半、峰值电流与电池容量同比例上升', () => {
    const single = accessControl(baseInput({ readersPerDoor: 1, lockDutyRatio: 0.3 }));
    expect(single.readerCount).toBe(20);
    // 20×0.5×0.3 = 3 A；3×12 = 36 W；36+100 = 136 W
    expect(single.lockPeakCurrentA).toBeCloseTo(3, 9);
    expect(single.totalPowerW).toBeCloseTo(136, 9);
    expect(single.batteryAh).toBeCloseTo((136 * 4) / 9.6, 6);
  });

  it('边界：非法门数档位/电压/动作率/余量/负值 → valid=false 且输出有限', () => {
    const cases: AccessControlInput[] = [
      baseInput({ doorsPerController: 3 }),
      baseInput({ lockVoltageV: 0 }),
      baseInput({ lockDutyRatio: 1.5 }),
      baseInput({ lockDutyRatio: -0.1 }),
      baseInput({ psuMargin: 0.9 }),
      baseInput({ doorCount: -1 }),
      baseInput({ backupHours: Number.NaN }),
    ];
    for (const input of cases) {
      const r = accessControl(input);
      expect(r.valid, `应判无效：${JSON.stringify(input)}`).toBe(false);
      expect(r.note.length).toBeGreaterThan(0);
      expect(Number.isFinite(r.controllerCount)).toBe(true);
      expect(Number.isFinite(r.readerCount)).toBe(true);
      expect(Number.isFinite(r.totalPowerW)).toBe(true);
      expect(Number.isFinite(r.psuRequiredW)).toBe(true);
      expect(Number.isFinite(r.batteryAh)).toBe(true);
    }
  });

  it('边界：0 门 → 全部为 0 且判定有效（无门禁需求的空表）', () => {
    const r = accessControl(baseInput({ doorCount: 0 }));
    expect(r.valid).toBe(true);
    expect(r.controllerCount).toBe(0);
    expect(r.readerCount).toBe(0);
    expect(r.totalPowerW).toBe(0);
    expect(r.psuRequiredW).toBe(0);
    expect(r.batteryAh).toBe(0);
  });

  it('边界：极大门数导致结果溢出被拦截', () => {
    const r = accessControl(baseInput({ doorCount: 1e306, lockCurrentA: 1e306 }));
    expect(r.valid).toBe(false);
    expect(Number.isFinite(r.totalPowerW)).toBe(true);
  });
});
