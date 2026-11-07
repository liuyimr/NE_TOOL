import { describe, expect, it } from 'vitest';
import {
  coolingTower,
  TOWER_FLOW_SERIES,
  TOWER_FLOW_COEF,
  KW_PER_RT,
  VAPORIZATION_HEAT_KJ_KG,
  type CoolingTowerInput,
} from '@/lib/calc/coolingTower';

function baseInput(overrides: Partial<CoolingTowerInput> = {}): CoolingTowerInput {
  return {
    coolingLoadKw: 500,
    heatRejectionFactor: 1.25,
    deltaT: 5,
    driftRatio: 0.0001,
    cycles: 4,
    approach: 4,
    wetBulb: 28,
    ...overrides,
  };
}

describe('H18 冷却塔选型与冷却水量', () => {
  it('锚点：Qc=625 kW、107.5 m³/h、补水 1.2346 m³/h、125 档、142.166 RT', () => {
    const r = coolingTower(baseInput());
    // Qc = 500×1.25 = 625 kW；flow = 625×0.86/5 = 107.5 m³/h
    // evap = 625×3600/(2430×1000) = 0.9259259259259259 m³/h
    // drift = 107.5×0.0001 = 0.01075；blowdown = 0.9259259/3 − 0.01075 = 0.2978919753
    // makeup = 0.9259259 + 0.01075 + 0.2978919753 = 1.234567901234568（与漂水率无关）
    // A3：rtNominal = 制冷量/3.517 = 500/3.517 = 142.1666192777936 RT
    expect(r.valid).toBe(true);
    expect(r.qcKw).toBe(625);
    expect(r.flowM3h).toBeCloseTo(107.5, 9);
    expect(r.evapM3h).toBeCloseTo(0.9259259259259259, 9);
    expect(r.driftM3h).toBeCloseTo(0.01075, 9);
    expect(r.blowdownM3h).toBeCloseTo(0.297891975308642, 9);
    expect(r.makeupM3h).toBeCloseTo(1.2345679012345678, 9);
    expect(r.recommendedFlowM3h).toBe(125);
    expect(r.rtNominal).toBeCloseTo(142.1666192777936, 6);
    expect(r.waterTons).toBeCloseTo(107.5, 9);
    expect(r.outletTempC).toBe(32);
    expect(r.inletTempC).toBe(37);
    expect(r.saltBalanceHolds).toBe(true);
    expect(r.note).toContain('不同厂家吨位定义不同，以样本为准');
    expect(r.note).toContain('±30%');
    expect(TOWER_FLOW_COEF).toBe(0.86);
    expect(VAPORIZATION_HEAT_KJ_KG).toBe(2430);
    expect(KW_PER_RT).toBe(3.517);
    expect(TOWER_FLOW_SERIES[0]).toBe(8);
    expect(TOWER_FLOW_SERIES[TOWER_FLOW_SERIES.length - 1]).toBe(1000);
  });

  it('水量平衡恒等式：补水量 ≈ 蒸发量 × N/(N−1)', () => {
    const r = coolingTower(baseInput());
    // 0.9259259259259259 × 4/3 = 1.2345679012345678
    expect(r.makeupM3h).toBeCloseTo((r.evapM3h * 4) / 3, 9);
    expect(r.makeupM3h).toBeCloseTo(1.2345679012345678, 9);
    // 换一个浓缩倍数仍成立（N=6 时 blowdown 仍为正）
    const r6 = coolingTower(baseInput({ cycles: 6 }));
    expect(r6.makeupM3h).toBeCloseTo((r6.evapM3h * 6) / 5, 9);
    // 显式改回旧默认漂水率 0.0005，恒等式仍成立（M 与 D 无关）
    const rOld = coolingTower(baseInput({ driftRatio: 0.0005 }));
    expect(rOld.driftM3h).toBeCloseTo(0.05375, 9);
    expect(rOld.blowdownM3h).toBeCloseTo(0.25489197530864194, 9);
    expect(rOld.makeupM3h).toBeCloseTo(1.2345679012345678, 9);
  });

  it('高温工况：湿球 30℃ → 进水 39℃，给出高温修正提示', () => {
    const r = coolingTower(baseInput({ wetBulb: 30 }));
    expect(r.outletTempC).toBe(34);
    expect(r.inletTempC).toBe(39);
    expect(r.note).toContain('高温工况');
    expect(r.note).toContain('37/32℃');
  });

  it('C4：判定扩为湿球偏离标准工况 —— 湿球 27℃（进水 36℃）也给出标准工况提示', () => {
    const r = coolingTower(baseInput({ wetBulb: 27 }));
    expect(r.inletTempC).toBe(36);
    expect(r.note).toContain('标准工况 I');
    expect(r.note).toContain('标准工况 II');
  });

  it('C3：盐量平衡失效边界（漂水率 0.0005 + N=20）→ saltBalanceHolds=false 且 M=E+D', () => {
    const r = coolingTower(baseInput({ driftRatio: 0.0005, cycles: 20 }));
    // bRaw = E/(N−1) − D = 0.9259259/19 − 0.05375 = −0.005017 < 0 → 排污截断为 0
    expect(r.valid).toBe(true);
    expect(r.saltBalanceHolds).toBe(false);
    expect(r.blowdownM3h).toBe(0);
    expect(r.makeupM3h).toBeCloseTo(r.evapM3h + r.driftM3h, 9);
    expect(r.note).toContain('无法维持');
  });

  it('C3：漂水率 0.01 时排污为 0，盐量平衡失效并给出整改提示', () => {
    const r = coolingTower(baseInput({ driftRatio: 0.01 }));
    expect(r.saltBalanceHolds).toBe(false);
    expect(r.blowdownM3h).toBe(0);
    expect(r.makeupM3h).toBeCloseTo(r.evapM3h + r.driftM3h, 9);
    expect(r.note).toContain('请降低漂水率');
  });

  it('边界：浓缩倍数 ≤1（除零）/ 温差 0 / 负制冷量 / 负系数 → valid=false', () => {
    const cases = [
      baseInput({ cycles: 1 }),
      baseInput({ cycles: 0 }),
      baseInput({ deltaT: 0 }),
      baseInput({ coolingLoadKw: -1 }),
      baseInput({ driftRatio: -0.1 }),
      baseInput({ heatRejectionFactor: Number.NaN }),
    ];
    for (const input of cases) {
      const r = coolingTower(input);
      expect(r.valid).toBe(false);
      expect(r.makeupM3h).toBe(0);
      expect(r.recommendedFlowM3h).toBeNull();
      expect(Number.isFinite(r.flowM3h)).toBe(true);
    }
  });

  it('边界：极大制冷量导致冷凝热溢出 → valid=false', () => {
    const r = coolingTower(baseInput({ coolingLoadKw: 1e308, heatRejectionFactor: 1e308 }));
    expect(r.valid).toBe(false);
    expect(r.note).toContain('溢出');
    expect(Number.isFinite(r.qcKw)).toBe(true);
    expect(Number.isFinite(r.flowM3h)).toBe(true);
  });

  it('D：note 末尾含通用免责句', () => {
    const r = coolingTower(baseInput());
    expect(r.note).toContain('不作为施工图设计、设备采购、产品验收或安全校验依据');
  });
});
