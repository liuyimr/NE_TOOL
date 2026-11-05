import { describe, expect, it } from 'vitest';
import { plcSizing, PLC_MODULE_SPEC } from '@/lib/calc/plcSizing';

describe('P16 PLC 选型与 I/O 点数估算', () => {
  it('DI40/DO24/AI16/AO4、余量 25% → 50/30/20/5，共 105 点', () => {
    const r = plcSizing({ di: 40, do: 24, ai: 16, ao: 4, marginPct: 25 });
    expect(r.required).toEqual({ di: 50, do: 30, ai: 20, ao: 5 });
    expect(r.totalPoints).toBe(105);
  });

  it('模块数按 16DI/16DO/8AI/8AO 向上取整', () => {
    const r = plcSizing({ di: 40, do: 24, ai: 16, ao: 4, marginPct: 25 });
    expect(r.modules).toEqual({ di: 4, do: 2, ai: 3, ao: 1 });
    expect(r.totalModules).toBe(10);
    expect(PLC_MODULE_SPEC).toEqual({ di: 16, do: 16, ai: 8, ao: 8 });
  });

  it('105 点、无高速 → 小型 CPU，模块 >8 需扩展机架', () => {
    const r = plcSizing({ di: 40, do: 24, ai: 16, ao: 4, marginPct: 25 });
    expect(r.cpuClass).toBe('小型');
    expect(r.needsRack).toBe(true);
  });

  it('高速计数 → 小型升中型', () => {
    const r = plcSizing({ di: 10, do: 10, ai: 0, ao: 0, marginPct: 0, highSpeed: true });
    expect(r.cpuClass).toBe('中型');
  });

  it('大点数 → 大型 CPU', () => {
    const r = plcSizing({ di: 500, do: 500, ai: 0, ao: 0, marginPct: 0 });
    expect(r.cpuClass).toBe('大型');
  });

  it('24V 电源估算：50×0.3 + 30×0.5 + 20×0.6 + 5×0.6 = 45 W', () => {
    const r = plcSizing({ di: 40, do: 24, ai: 16, ao: 4, marginPct: 25 });
    expect(r.powerW).toBeCloseTo(45, 6);
    expect(r.powerA).toBeCloseTo(45 / 24, 6);
  });

  it('边界：全 0 → 点数/模块/功耗为 0，无 NaN', () => {
    const r = plcSizing({ di: 0, do: 0, ai: 0, ao: 0 });
    expect(r.totalPoints).toBe(0);
    expect(r.totalModules).toBe(0);
    expect(r.powerW).toBe(0);
    expect(r.powerA).toBe(0);
    expect(Number.isFinite(r.powerA)).toBe(true);
    expect(r.cpuClass).toBe('小型');
  });
});
