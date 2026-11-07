import { describe, expect, it } from 'vitest';
import {
  shortCircuit,
  RHO_CU,
  RHO_AL,
  X_CABLE,
  TRANSFORMER_RZ_RATIO,
  VOLTAGE_FACTOR_C_MAX,
  ICU_SERIES_KA,
  type CableMaterial,
  type ShortCircuitInput,
} from '@/lib/calc/shortCircuit';

function baseInput(overrides: Partial<ShortCircuitInput> = {}): ShortCircuitInput {
  return {
    transformerKva: 1000,
    ukPercent: 6,
    voltageV: 400,
    cableLengthM: 0,
    cableSectionMm2: 185,
    material: 'copper',
    kappa: 1.8,
    ...overrides,
  };
}

describe('E14 短路电流估算', () => {
  it('锚点：1000 kVA/6%/400 V 且 L=0 → Ik3≈24.0563 kA、Ip≈61.2372 kA（显式 κ=1.8）、Icu 35 kA', () => {
    const r = shortCircuit(baseInput());
    // In = 1e6/(√3×400) = 1443.3756729740644 A
    // Zt = 0.06×400²/1e6 = 0.0096 Ω；Rt=0.00096，Xt=sqrt(Zt²−Rt²)
    // Ik3 = 400/(√3×0.0096)/1000 = 24.056261216234407 kA
    // Ik1 = Ik3/2 = 12.028130608117205 kA；Ip = √2×1.8×Ik3 = 61.23724356957946 kA
    // A1：ik3DesignKa = Ik3×c_max(1.05) = 25.25907427704613 kA → 跨过 25 kA 档取 35 kA
    expect(r.valid).toBe(true);
    expect(r.inA).toBeCloseTo(1443.3756729740644, 6);
    expect(r.ztOhm).toBeCloseTo(0.0096, 9);
    expect(r.ztotOhm).toBeCloseTo(0.0096, 9);
    expect(r.ik3Ka).toBeCloseTo(24.056261216234407, 6);
    expect(r.ik1Ka).toBeCloseTo(12.028130608117205, 6);
    expect(r.ipKa).toBeCloseTo(61.23724356957946, 6);
    expect(r.recommendedIcuKa).toBe(35);
    expect(r.ik1Ka).toBeCloseTo(r.ik3Ka / 2, 9);
    expect(r.note).toContain('工程近似');
    expect(r.note).toContain('IEC 60909 / GB/T 15544');
    expect(r.note).toContain('未计入上级电网阻抗');
    expect(RHO_CU).toBe(0.0175);
    expect(RHO_AL).toBe(0.0283);
    expect(X_CABLE).toBe(0.00008);
    expect(TRANSFORMER_RZ_RATIO).toBe(0.1);
    expect(ICU_SERIES_KA[0]).toBe(4.5);
    expect(ICU_SERIES_KA[ICU_SERIES_KA.length - 1]).toBe(100);
    expect(VOLTAGE_FACTOR_C_MAX).toBe(1.05);
    expect(r.ik3DesignKa).toBeCloseTo(25.25907427704613, 6);
    expect(r.kappaUsed).toBe(1.8);
    expect(r.note).toContain('c_max=1.05');
  });

  it('电缆长度 50 m（铜 185 mm²）：Ztot≈0.014698 Ω，Ik3≈15.7125 kA → Icu 20 kA', () => {
    const r = shortCircuit(baseInput({ cableLengthM: 50 }));
    // Rc = 0.0175×50/185 = 0.0047297 Ω；Xc = 0.00008×50 = 0.004 Ω
    // Ztot = sqrt((0.00096+Rc)² + (0.0095519+Xc)²) = 0.014697838601888332 Ω
    // ik3DesignKa = 15.71252167962845×1.05 = 16.49814776360987 kA → 20 kA
    expect(r.ztotOhm).toBeCloseTo(0.014697838601888332, 9);
    expect(r.ik3Ka).toBeCloseTo(15.71252167962845, 6);
    expect(r.ik1Ka).toBeCloseTo(7.856260839814225, 6);
    expect(r.recommendedIcuKa).toBe(20);
    expect(r.ik3DesignKa).toBeCloseTo(16.49814776360987, 6);
  });

  it('铝导体电阻率更大 → 同样 50 m 下短路电流更小', () => {
    const copper = shortCircuit(baseInput({ cableLengthM: 50, material: 'copper' }));
    const aluminium = shortCircuit(baseInput({ cableLengthM: 50, material: 'aluminium' }));
    // 铝：Ztot = 0.016054976385085983 Ω → Ik3 = 14.384331819408871 kA
    // ×1.05 = 15.103548410379315 kA > 15 kA 档 → 20 kA
    expect(aluminium.ztotOhm).toBeCloseTo(0.016054976385085983, 9);
    expect(aluminium.ik3Ka).toBeCloseTo(14.384331819408871, 6);
    expect(aluminium.ik3Ka).toBeLessThan(copper.ik3Ka);
    expect(aluminium.recommendedIcuKa).toBe(20);
  });

  it('边界：容量/uk/电压/截面为 0、κ 非法、非法材料 → valid=false', () => {
    const cases = [
      baseInput({ transformerKva: 0 }),
      baseInput({ ukPercent: 0 }),
      baseInput({ voltageV: 0 }),
      baseInput({ cableSectionMm2: 0 }),
      baseInput({ cableLengthM: -1 }),
      baseInput({ kappa: 0.5 }),
      baseInput({ kappa: -0.5 }),
      baseInput({ material: 'iron' as CableMaterial }),
      baseInput({ transformerKva: Number.NaN }),
    ];
    for (const input of cases) {
      const r = shortCircuit(input);
      expect(r.valid).toBe(false);
      expect(r.ik3Ka).toBe(0);
      expect(r.recommendedIcuKa).toBeNull();
      expect(Number.isFinite(r.ztotOhm)).toBe(true);
    }
  });

  it('边界：极大容量与电压导致阻抗计算溢出 → valid=false 且不泄漏 Infinity', () => {
    const r = shortCircuit(baseInput({ transformerKva: 1e308, voltageV: 1e308 }));
    expect(r.valid).toBe(false);
    expect(r.note).toContain('溢出');
    expect(Number.isFinite(r.ik3Ka)).toBe(true);
    expect(Number.isFinite(r.ztOhm)).toBe(true);
  });

  it('A1/C1：κ=0 时按 R/X 自动计算（L=0）→ κ≈1.744905、ip≈59.362889 kA', () => {
    const r = shortCircuit(baseInput({ kappa: 0 }));
    // Rtot/Xtot = 0.00096/0.009551879396223551 = 0.1005037815259212
    // κ = 1.02 + 0.98·e^(−3×0.1005037815259212) = 1.7449054460346953
    // ip = √2 × κ × 24.056261216234407 = 59.362888780395735 kA
    expect(r.valid).toBe(true);
    expect(r.kappaUsed).toBeCloseTo(1.7449054460346953, 8);
    expect(r.ipKa).toBeCloseTo(59.362888780395735, 6);
    expect(r.ik3Ka).toBeCloseTo(24.056261216234407, 6);
    expect(r.ik3DesignKa).toBeCloseTo(25.25907427704613, 6);
    expect(r.recommendedIcuKa).toBe(35);
  });

  it('A1/C1：L=100 m 铜 185 mm² 且 κ=0 → κ≈1.185114、ip≈18.962584 kA', () => {
    const auto = shortCircuit(baseInput({ kappa: 0, cableLengthM: 100 }));
    // Rtot/Xtot = 0.5936378221526124；κ = 1.185114488867464
    // ip = √2 × κ × 11.314157375356663 = 18.962584140915542 kA
    expect(auto.valid).toBe(true);
    expect(auto.kappaUsed).toBeCloseTo(1.185114488867464, 8);
    expect(auto.ipKa).toBeCloseTo(18.962584140915542, 6);
    // 手动覆盖回归：显式 κ=1.8 时 ip 保持 28.801143 kA
    const manual = shortCircuit(baseInput({ kappa: 1.8, cableLengthM: 100 }));
    expect(manual.kappaUsed).toBe(1.8);
    expect(manual.ipKa).toBeCloseTo(28.801142652695354, 6);
    expect(manual.ipKa).toBeGreaterThan(auto.ipKa);
  });

  it('A1：c_max 跨档证伪 —— L=1 m 时 Ik3≈23.8342 kA，×1.05≈25.026 kA 仍应取 35 kA', () => {
    const r = shortCircuit(baseInput({ cableLengthM: 1 }));
    expect(r.ik3Ka).toBeCloseTo(23.834202951981915, 6);
    expect(r.ik3DesignKa).toBeCloseTo(25.02591309958101, 6);
    expect(r.recommendedIcuKa).toBe(35);
  });

  it('A2/C10/D：note 明确 ik1 用途限制、Icu/Ics 口径与通用免责句', () => {
    const r = shortCircuit(baseInput());
    expect(r.note).toContain('零序阻抗');
    expect(r.note).toContain('禁止用于保护灵敏度、断路器整定与自动切断时间校验');
    expect(r.note).toContain('c_min');
    expect(r.note).toContain('Ics');
    expect(r.note).toContain('不作为施工图设计、设备采购、产品验收或安全校验依据');
  });
});
