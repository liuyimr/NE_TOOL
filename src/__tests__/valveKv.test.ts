import { describe, expect, it } from 'vitest';
import {
  valveKv,
  KVS_SERIES,
  KV_DN_TABLE,
  KV_SELECTION_MARGIN,
  type ValveKvInput,
} from '@/lib/calc/valveKv';

function baseInput(overrides: Partial<ValveKvInput> = {}): ValveKvInput {
  return { flowM3h: 10, dpKPa: 100, rhoRel: 1.0, dpTotalKPa: 0, ...overrides };
}

describe('BA11 控制阀门 Kv 值计算与选型', () => {
  it('锚点：10 m³/h、100 kPa、ρ=1 → Kv=10、Kvs=16、DN40（C6 选型余量 1.25）', () => {
    const r = valveKv(baseInput());
    // Kv = 10 × sqrt(1×100/100) = 10；targetKv = 10×1.25 = 12.5
    // 首个 ≥12.5 的 Kvs 档为 16；首个额定 Kvs ≥12.5 的 DN 为 DN40(16)
    expect(r.valid).toBe(true);
    expect(r.kv).toBeCloseTo(10, 9);
    expect(r.recommendedKvs).toBe(16);
    expect(r.recommendedDn).toBe(40);
    expect(r.valveAuthority).toBeNull();
    expect(r.actuator).toContain('电动比例积分');
    expect(KVS_SERIES[0]).toBe(0.16);
    expect(KVS_SERIES[KVS_SERIES.length - 1]).toBe(630);
    expect(KV_DN_TABLE[0]).toEqual({ dn: 15, kvs: 2.5 });
    expect(KV_DN_TABLE[KV_DN_TABLE.length - 1]).toEqual({ dn: 200, kvs: 400 });
    expect(KV_SELECTION_MARGIN).toBe(1.25);
    expect(r.note).toContain('Cv = 1.156·Kv');
  });

  it('相对密度 1.04：Kv≈10.198 → Kvs=16、DN40', () => {
    const r = valveKv(baseInput({ rhoRel: 1.04 }));
    // sqrt(1.04) = 1.0198039027 → Kv = 10.19803902718557；targetKv = 12.74755 → Kvs 16 / DN40
    expect(r.kv).toBeCloseTo(10.19803902718557, 8);
    expect(r.recommendedKvs).toBe(16);
    expect(r.recommendedDn).toBe(40);
  });

  it('C6 第二锚点：Q=10、Δp=50、ρ=1.04 → Kv≈14.422、Kvs=25、DN50', () => {
    const r = valveKv(baseInput({ dpKPa: 50, rhoRel: 1.04 }));
    // Kv = 10×sqrt(1.04×100/50) = 10×√2.08 = 14.422205101855958
    // targetKv = 14.422205101855958×1.25 = 18.027756377319946 → Kvs 25 / DN50
    expect(r.kv).toBeCloseTo(14.422205101855958, 8);
    expect(r.recommendedKvs).toBe(25);
    expect(r.recommendedDn).toBe(50);
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

  it('D：note 末尾含通用免责句，且注明 Kv 单位与选型余量口径', () => {
    const r = valveKv(baseInput());
    expect(r.note).toContain('不作为施工图设计、设备采购、产品验收或安全校验依据');
    expect(r.note).toContain('选型按 Kv × 1.25 留余量取档');
    expect(r.note).toContain('阀权度 S≥0.3 为暖通自控经验判据');
  });
});
