import { describe, expect, it } from 'vitest';
import {
  rcdSelect,
  RCD_RULES,
  RCD_CURRENT_SERIES_A,
  RCD_GRADING_MIN_RATIO,
  type RcdCircuitType,
  type RcdDelayed,
  type RcdSelectInput,
} from '@/lib/calc/rcdSelect';

function baseInput(overrides: Partial<RcdSelectInput> = {}): RcdSelectInput {
  return {
    circuitType: 'socket',
    ratedCurrentA: 16,
    upstreamMa: 300,
    upstreamDelayed: 'yes',
    ...overrides,
  };
}

describe('E13 漏电保护 RCD 选型与级配', () => {
  it('默认算例：30 mA 一般型 / 100 ms、16 A 档、级配比 10 且合格', () => {
    const r = rcdSelect(baseInput());
    // 300/30 = 10 ≥ 3 且上级 delayed=yes → gradingOk
    expect(r.valid).toBe(true);
    expect(r.iDeltaNMa).toBe(30);
    expect(r.rcdType).toContain('一般型');
    expect(r.maxBreakMs).toBe(100);
    expect(r.ratedCurrentMinA).toBe(16);
    expect(r.gradingRatio).toBeCloseTo(10, 9);
    expect(r.gradingOk).toBe(true);
    expect(r.note).toContain('GB 50054');
    expect(r.note).toContain('GB 13955');
    expect(r.note).toContain('30 mA 属直接接触附加防护');
    expect(RCD_GRADING_MIN_RATIO).toBe(3);
    expect(RCD_CURRENT_SERIES_A[0]).toBe(6);
    expect(RCD_CURRENT_SERIES_A[RCD_CURRENT_SERIES_A.length - 1]).toBe(250);
  });

  it('规则表：main 延时型 S/300 mA/500 ms，fire 报警不脱扣/0 ms', () => {
    const main = rcdSelect(baseInput({ circuitType: 'main' }));
    expect(main.iDeltaNMa).toBe(300);
    expect(main.rcdType).toContain('延时型 S');
    expect(main.maxBreakMs).toBe(500);

    const fire = rcdSelect(baseInput({ circuitType: 'fire' }));
    expect(fire.iDeltaNMa).toBe(300);
    expect(fire.rcdType).toContain('报警不脱扣');
    expect(fire.maxBreakMs).toBe(0);
    expect(fire.note).toContain('消防设备不应自动切断电源');

    expect(RCD_RULES.wet.iDeltaNMa).toBe(30);
    expect(RCD_RULES.motor.iDeltaNMa).toBe(100);
    expect(RCD_RULES.motor.maxBreakMs).toBe(200);
    expect(RCD_RULES.lighting.note).toContain('不强制');
  });

  it('级配不满足：上级 30 mA 且非延时 → gradingOk=false 并给出越级跳闸提示', () => {
    const r = rcdSelect(baseInput({ upstreamMa: 30, upstreamDelayed: 'no' }));
    expect(r.gradingRatio).toBeCloseTo(1, 9);
    expect(r.gradingOk).toBe(false);
    expect(r.note).toContain('存在越级跳闸风险：上级 IΔn 应 ≥ 3× 下级且上级为延时型（S）');

    // 上级 IΔn 足够但非延时，同样不合格
    const r2 = rcdSelect(baseInput({ upstreamMa: 300, upstreamDelayed: 'no' }));
    expect(r2.gradingRatio).toBeCloseTo(10, 9);
    expect(r2.gradingOk).toBe(false);
  });

  it('边界：无上级（0 mA）→ 比值为 null 且级配合格', () => {
    const r = rcdSelect(baseInput({ upstreamMa: 0 }));
    expect(r.valid).toBe(true);
    expect(r.gradingRatio).toBeNull();
    expect(r.gradingOk).toBe(true);
  });

  it('边界：非法枚举 / 负电流 / 非有限数 → valid=false，输出无 NaN', () => {
    const badCircuit = rcdSelect(baseInput({ circuitType: 'xyz' as RcdCircuitType }));
    expect(badCircuit.valid).toBe(false);
    expect(badCircuit.note).toContain('未知的回路类型');

    const badDelayed = rcdSelect(baseInput({ upstreamDelayed: 'maybe' as RcdDelayed }));
    expect(badDelayed.valid).toBe(false);
    expect(badDelayed.note).toContain('未知的上级延时选项');

    const cases = [
      baseInput({ ratedCurrentA: -1 }),
      baseInput({ ratedCurrentA: 0 }),
      baseInput({ upstreamMa: -1 }),
      baseInput({ ratedCurrentA: Number.POSITIVE_INFINITY }),
    ];
    for (const input of cases) {
      const r = rcdSelect(input);
      expect(r.valid).toBe(false);
      expect(r.gradingOk).toBe(false);
      expect(Number.isFinite(r.iDeltaNMa)).toBe(true);
    }
  });

  it('边界：极大额定电流 → 超出常用档位返回 null，其余结果仍有限', () => {
    const r = rcdSelect(baseInput({ ratedCurrentA: 1e308 }));
    expect(r.valid).toBe(true);
    expect(r.ratedCurrentMinA).toBeNull();
    expect(r.gradingRatio).toBeCloseTo(10, 9);
    expect(Number.isFinite(r.iDeltaNMa)).toBe(true);
    expect(r.note).toContain('超出常用 RCD 电流档');
  });
});
