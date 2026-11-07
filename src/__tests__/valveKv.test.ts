import { describe, expect, it } from 'vitest';
import { valveKv, KVS_SERIES, KV_DN_TABLE, type ValveKvInput } from '@/lib/calc/valveKv';

function baseInput(overrides: Partial<ValveKvInput> = {}): ValveKvInput {
  return { flowM3h: 10, dpKPa: 100, rhoRel: 1.0, dpTotalKPa: 0, ...overrides };
}

describe('BA11 控制阀门 Kv 值计算与选型', () => {
  it('锚点：10 m³/h、100 kPa、ρ=1 → Kv=10、Kvs=10、DN32', () => {
    const r = valveKv(baseInput());
    // Kv = 10 × sqrt(1×100/100) = 10；首个 ≥10 的 Kvs 档为 10；DN32 额定 Kvs=10
    expect(r.valid).toBe(true);
    expect(r.kv).toBeCloseTo(10, 9);
    expect(r.recommendedKvs).toBe(10);
    expect(r.recommendedDn).toBe(32);
    expect(r.valveAuthority).toBeNull();
    expect(r.actuator).toContain('电动比例积分');
    expect(KVS_SERIES[0]).toBe(0.16);
    expect(KVS_SERIES[KVS_SERIES.length - 1]).toBe(630);
    expect(KV_DN_TABLE[0]).toEqual({ dn: 15, kvs: 2.5 });
    expect(KV_DN_TABLE[KV_DN_TABLE.length - 1]).toEqual({ dn: 200, kvs: 400 });
  });

  it('相对密度 1.04：Kv≈10.198 → 提升一档 Kvs=16、DN40', () => {
    const r = valveKv(baseInput({ rhoRel: 1.04 }));
    // sqrt(1.04) = 1.0198039027 → Kv = 10.19803902718557
    expect(r.kv).toBeCloseTo(10.19803902718557, 8);
    expect(r.recommendedKvs).toBe(16);
    expect(r.recommendedDn).toBe(40);
  });

  it('阀权度：总压差 400 kPa → S=0.25 并给出过低提示；总压差 0 时不计算', () => {
    const low = valveKv(baseInput({ dpTotalKPa: 400 }));
    // 100/400 = 0.25 < 0.3
    expect(low.valveAuthority).toBeCloseTo(0.25, 9);
    expect(low.note).toContain('阀权度过低，调节特性变差');

    const skipped = valveKv(baseInput());
    expect(skipped.valveAuthority).toBeNull();
  });

  it('边界：压差为 0 / 流量为负 / ρ=0 / 总压差为负 → valid=false', () => {
    const cases = [
      baseInput({ dpKPa: 0 }),
      baseInput({ dpKPa: -10 }),
      baseInput({ flowM3h: -1 }),
      baseInput({ flowM3h: 0 }),
      baseInput({ rhoRel: 0 }),
      baseInput({ dpTotalKPa: -1 }),
      baseInput({ dpKPa: Number.POSITIVE_INFINITY }),
    ];
    for (const input of cases) {
      const r = valveKv(input);
      expect(r.valid).toBe(false);
      expect(r.kv).toBe(0);
      expect(r.recommendedDn).toBeNull();
      expect(Number.isFinite(r.kv)).toBe(true);
    }
  });

  it('边界：极大流量 + 极小压差导致 Kv 溢出 → valid=false', () => {
    const r = valveKv(baseInput({ flowM3h: 1e308, dpKPa: 1e-308 }));
    expect(r.valid).toBe(false);
    expect(r.note).toContain('溢出');
    expect(Number.isFinite(r.kv)).toBe(true);
  });
});
