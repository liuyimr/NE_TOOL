/**
 * QA 独立验证（第 1 步 · 10 个 P0 工具 / 8 个计算模块）
 * ------------------------------------------------------------------
 * 本文件由 QA 独立编写，**不复用**工程师的测试断言；所有期望值由 QA 手工推导并注明过程。
 * 目标：证伪——重点查工程常量、边界与异常（NaN/Infinity/崩溃）。
 */
import { describe, expect, it } from 'vitest';

import { ddcSizing, DDC_MODULE_SPEC } from '@/lib/calc/ddcSizing';
import { hvacLoad, COLD_INDEX } from '@/lib/calc/hvacLoad';
import { hvacAirVolume, SUPPLY_AIR_COEF } from '@/lib/calc/hvacAirVolume';
import { ductSize } from '@/lib/calc/hvacDuct';
import { hvacWaterFlow, WATER_FLOW_COEF } from '@/lib/calc/hvacWaterFlow';
import { hvacFcuSelect, FCU_CAPACITIES } from '@/lib/calc/hvacFcu';
import { plcSizing, PLC_MODULE_SPEC } from '@/lib/calc/plcSizing';
import { servoGear } from '@/lib/calc/servoGear';
import { getAll, byDomain, getById } from '@/registry';
import { getQuickRef } from '@/data/catalog';

/** 断言一个结果对象里所有 number 字段都是有限数（非 NaN/Infinity） */
function allFinite(obj: Record<string, unknown>): boolean {
  for (const v of Object.values(obj)) {
    if (typeof v === 'number' && !Number.isFinite(v)) return false;
    if (v && typeof v === 'object') {
      for (const inner of Object.values(v as Record<string, unknown>)) {
        if (typeof inner === 'number' && !Number.isFinite(inner)) return false;
      }
    }
  }
  return true;
}

// ===========================================================================
// 工程常量与系数（重点证伪区）
// ===========================================================================
describe('工程常量正确性', () => {
  it('送风量系数 2970 ≈ 3600/(ρ·cp)=3600/(1.2×1.01)=2970.297（误差<0.02%）', () => {
    const theory = 3600 / (1.2 * 1.01);
    expect(theory).toBeCloseTo(2970.297, 2);
    expect(SUPPLY_AIR_COEF).toBe(2970);
    expect(Math.abs(SUPPLY_AIR_COEF - theory) / theory).toBeLessThan(0.0002);
  });

  it('水流量系数 0.86 ≈ 3600/(1000×4.187)=0.8598（误差<0.05%）', () => {
    const theory = 3600 / (1000 * 4.187);
    expect(theory).toBeCloseTo(0.8598, 3);
    expect(WATER_FLOW_COEF).toBe(0.86);
    expect(Math.abs(WATER_FLOW_COEF - theory) / theory).toBeLessThan(0.0005);
  });

  it('冷热指标落在工程常见区间，且量级次序正确（商场>厂房>医院>办公=酒店>住宅）', () => {
    // 常见方案阶段区间（W/m²）：住宅80~120、办公100~150、酒店100~150、商场150~250、医院120~180、厂房120~200
    const range: Record<string, [number, number]> = {
      residential: [80, 120],
      office: [100, 150],
      hotel: [100, 150],
      shopping: [150, 250],
      hospital: [120, 180],
      factory: [120, 200],
    };
    for (const [k, [lo, hi]] of Object.entries(range)) {
      const v = COLD_INDEX[k as keyof typeof COLD_INDEX];
      expect(v, `${k} 冷指标越界`).toBeGreaterThanOrEqual(lo);
      expect(v, `${k} 冷指标越界`).toBeLessThanOrEqual(hi);
    }
    expect(COLD_INDEX.shopping).toBeGreaterThan(COLD_INDEX.factory);
    expect(COLD_INDEX.factory).toBeGreaterThan(COLD_INDEX.hospital);
    expect(COLD_INDEX.hospital).toBeGreaterThan(COLD_INDEX.office);
    expect(COLD_INDEX.office).toBe(COLD_INDEX.hotel);
    expect(COLD_INDEX.office).toBeGreaterThan(COLD_INDEX.residential);
  });

  it('FCU 档位单调递增且量级合理（2.5~10.2 kW）', () => {
    expect(FCU_CAPACITIES).toEqual([2.5, 3.4, 4.5, 5.4, 6.8, 8.0, 10.2]);
    for (let i = 1; i < FCU_CAPACITIES.length; i++) {
      expect(FCU_CAPACITIES[i]).toBeGreaterThan(FCU_CAPACITIES[i - 1]);
    }
    expect(FCU_CAPACITIES[0]).toBeGreaterThan(2);
    expect(FCU_CAPACITIES[FCU_CAPACITIES.length - 1]).toBeLessThan(15);
  });

  it('DDC / PLC 模块规格与题面一致', () => {
    expect(DDC_MODULE_SPEC).toEqual({ ai: 8, ao: 4, di: 12, do: 8 });
    expect(PLC_MODULE_SPEC).toEqual({ di: 16, do: 16, ai: 8, ao: 8 });
  });
});

// ===========================================================================
// BA8 · DDC 选型
// ===========================================================================
describe('ddcSizing（独立复算）', () => {
  it('算例1：AI40/AO10/DI120/DO60，余量20% → 48/12/144/72，模块 6/3/12/9，2 台', () => {
    const r = ddcSizing({ ai: 40, ao: 10, di: 120, do: 60, marginPct: 20 });
    expect(r.required).toEqual({ ai: 48, ao: 12, di: 144, do: 72 });
    expect(r.totalPoints).toBe(276);
    expect(r.modules).toEqual({ ai: 6, ao: 3, di: 12, do: 9 });
    expect(r.totalModules).toBe(30);
    expect(r.ddcCount).toBe(2); // ceil(276/200)
    expect(r.avgPointsPerDdc).toBeCloseTo(138, 6);
    expect(r.needsSplit).toBe(true);
  });

  it('边界：48 点 AI 必须向上取整为 6 块 8AI（不能 5 块=40 点不够）', () => {
    const r = ddcSizing({ ai: 48, ao: 0, di: 0, do: 0, marginPct: 0 });
    expect(r.modules.ai).toBe(6);
    expect(r.modules.ai * DDC_MODULE_SPEC.ai).toBeGreaterThanOrEqual(48);
  });

  it('边界：总点数恰好=单台上限 200 → 不拆分；201 → 拆分 2 台', () => {
    const eq = ddcSizing({ ai: 0, ao: 0, di: 200, do: 0, marginPct: 0 });
    expect(eq.totalPoints).toBe(200);
    expect(eq.ddcCount).toBe(1);
    expect(eq.needsSplit).toBe(false);
    const over = ddcSizing({ ai: 0, ao: 0, di: 201, do: 0, marginPct: 0 });
    expect(over.totalPoints).toBe(201);
    expect(over.ddcCount).toBe(2);
    expect(over.needsSplit).toBe(true);
  });

  it('全 0：不崩、无 NaN，1 台、无需拆分', () => {
    const r = ddcSizing({ ai: 0, ao: 0, di: 0, do: 0 });
    expect(r.totalPoints).toBe(0);
    expect(r.ddcCount).toBe(1);
    expect(r.needsSplit).toBe(false);
    expect(allFinite(r as unknown as Record<string, unknown>)).toBe(true);
  });

  it('异常：负数/NaN 归零，余量>100% 截断为 100%', () => {
    const r = ddcSizing({ ai: -10, ao: NaN, di: 5, do: 0, marginPct: 150 });
    expect(r.required.ai).toBe(0);
    expect(r.required.ao).toBe(0);
    expect(r.required.di).toBe(10); // ceil(5*2)
  });
});

// ===========================================================================
// H11 · 冷/热负荷估算
// ===========================================================================
describe('hvacLoad（独立复算）', () => {
  it('算例1：1000m² 办公 → 冷 120kW / 热 80kW', () => {
    const r = hvacLoad({ area: 1000, buildingType: 'office' });
    expect(r.valid).toBe(true);
    expect(r.coldKw).toBeCloseTo(120, 6);
    expect(r.heatKw).toBeCloseTo(80, 6);
    expect(r.unitColdIndex).toBe(120);
    expect(r.unitHeatIndex).toBe(80);
  });

  it('算例2：2000m² 商场 → 400kW / 200kW；修正系数 2 → 翻倍', () => {
    const a = hvacLoad({ area: 2000, buildingType: 'shopping' });
    expect(a.coldKw).toBeCloseTo(400, 6);
    expect(a.heatKw).toBeCloseTo(200, 6);
    const b = hvacLoad({ area: 1000, buildingType: 'office', correction: 2 });
    expect(b.coldKw).toBeCloseTo(240, 6);
    expect(b.heatKw).toBeCloseTo(160, 6);
  });

  it('算例3：显式指标覆盖默认（150/90）', () => {
    const r = hvacLoad({ area: 100, buildingType: 'office', coldIndex: 150, heatIndex: 90 });
    expect(r.unitColdIndex).toBe(150);
    expect(r.coldKw).toBeCloseTo(15, 6);
    expect(r.heatKw).toBeCloseTo(9, 6);
  });

  it('边界：面积 0 → valid=false 且无 NaN', () => {
    const r = hvacLoad({ area: 0 });
    expect(r.valid).toBe(false);
    expect(r.coldKw).toBe(0);
    expect(allFinite(r as unknown as Record<string, unknown>)).toBe(true);
  });

  it('异常：修正系数 0 / 负数 → 回退 1；指标 0/负数 → 默认', () => {
    const c0 = hvacLoad({ area: 1000, buildingType: 'office', correction: 0 });
    expect(c0.correction).toBe(1);
    expect(c0.coldKw).toBeCloseTo(120, 6);
    const cneg = hvacLoad({ area: 1000, buildingType: 'office', correction: -2 });
    expect(cneg.correction).toBe(1);
    const iz = hvacLoad({ area: 1000, buildingType: 'office', coldIndex: 0, heatIndex: -5 });
    expect(iz.unitColdIndex).toBe(120);
    expect(iz.unitHeatIndex).toBe(80);
  });
});

// ===========================================================================
// H12 · 送风量 / 新风量
// ===========================================================================
describe('hvacAirVolume（独立复算）', () => {
  it('算例1：Q=120kW、Δt=10 → 35640 m³/h；新风 50人×30=1500、新风比≈4.21%', () => {
    const r = hvacAirVolume({ coolingLoadKw: 120, supplyDeltaT: 10, freshMode: 'people', people: 50 });
    expect(r.valid).toBe(true);
    expect(r.supplyM3h).toBeCloseTo(35640, 6);
    expect(r.freshM3h).toBeCloseTo(1500, 6);
    expect(r.freshRatioPct).toBeCloseTo((1500 / 35640) * 100, 6);
  });

  it('算例2：换气口径 500m³×2 次/h=1000 m³/h', () => {
    const r = hvacAirVolume({
      coolingLoadKw: 120, supplyDeltaT: 10, freshMode: 'ach', volumeM3: 500, ach: 2,
    });
    expect(r.freshM3h).toBeCloseTo(1000, 6);
    expect(r.freshRatioPct).toBeCloseTo((1000 / 35640) * 100, 6);
  });

  it('边界：Δt=0 → valid=false、送风量 0、无 NaN', () => {
    const r = hvacAirVolume({ coolingLoadKw: 120, supplyDeltaT: 0 });
    expect(r.valid).toBe(false);
    expect(r.supplyM3h).toBe(0);
    expect(allFinite(r as unknown as Record<string, unknown>)).toBe(true);
  });

  it('异常：Δt 负数 / 冷负荷 NaN → valid=false；人均新风量 0 → 默认 30', () => {
    expect(hvacAirVolume({ coolingLoadKw: 120, supplyDeltaT: -5 }).valid).toBe(false);
    expect(hvacAirVolume({ coolingLoadKw: NaN, supplyDeltaT: 10 }).supplyM3h).toBe(0);
    const r = hvacAirVolume({ coolingLoadKw: 120, supplyDeltaT: 10, people: 10, freshPerPerson: 0 });
    expect(r.freshM3h).toBe(300); // 10×30
  });

  it('常量硬编码但已注明近似来源（返回值携带 supplyCoef=2970）', () => {
    const r = hvacAirVolume({ coolingLoadKw: 10, supplyDeltaT: 5 });
    expect(r.supplyCoef).toBe(2970);
    expect(r.supplyM3h).toBeCloseTo((2970 * 10) / 5, 6);
  });
});

// ===========================================================================
// H13 · 风管尺寸
// ===========================================================================
describe('hvacDuct（独立复算）', () => {
  it('算例1（圆形）：35640 m³/h、7 m/s → 截面积 1.4143 m²、直径≈1342mm', () => {
    const r = ductSize({ flowM3h: 35640, velocity: 7, shape: 'round' });
    expect(r.valid).toBe(true);
    expect(r.areaM2).toBeCloseTo(35640 / 3600 / 7, 6); // 1.414286
    expect(r.roundDiaMm).toBeCloseTo(Math.sqrt((4 * 1.414285714) / Math.PI) * 1000, 1);
    expect(r.actualVelocity).toBeCloseTo(7, 6);
    expect(r.exceeds).toBe(false);
  });

  it('算例2（矩形）：同参数、长宽比≤4 → 2500×630，实际风速≈6.29', () => {
    const r = ductSize({ flowM3h: 35640, velocity: 7, shape: 'rect', aspectMax: 4 });
    expect(r.rectW).toBe(2500);
    expect(r.rectH).toBe(630);
    expect((r.rectW as number) / (r.rectH as number)).toBeLessThanOrEqual(4);
    expect(r.actualVelocity).toBeCloseTo(35640 / 3600 / (2.5 * 0.63), 6); // 6.2857
    expect(r.exceeds).toBe(false);
  });

  it('长宽比约束生效：aspectMax=1 → 近似正方形 1250×1250', () => {
    const r = ductSize({ flowM3h: 35640, velocity: 7, shape: 'rect', aspectMax: 1 });
    expect((r.rectW as number) / (r.rectH as number)).toBeLessThanOrEqual(1);
    expect(r.rectW).toBe(1250);
    expect(r.rectH).toBe(1250);
  });

  it('边界：风速 0 → valid=false；风量 0 → valid=false；均无 NaN', () => {
    expect(ductSize({ flowM3h: 1000, velocity: 0 }).valid).toBe(false);
    const z = ductSize({ flowM3h: 0, velocity: 7 });
    expect(z.valid).toBe(false);
    expect(allFinite(z as unknown as Record<string, unknown>)).toBe(true);
  });

  it('极端：风速 15 m/s（远超推荐 6~9）能算，但核算风速按设计值不误报', () => {
    const r = ductSize({ flowM3h: 36000, velocity: 15, shape: 'round' });
    expect(r.areaM2).toBeCloseTo(36000 / 3600 / 15, 6); // 0.6667
    expect(r.actualVelocity).toBeCloseTo(15, 6);
    expect(r.exceeds).toBe(false); // 语义为"实际>设计"，圆形恒 false
  });

  it('极端：超大风量矩形 → 兜底最大规格且 exceeds=true（实际风速>设计）', () => {
    const r = ductSize({ flowM3h: 200000, velocity: 5, shape: 'rect', aspectMax: 4 });
    expect(r.rectW).toBe(2500);
    expect(r.rectH).toBe(2500);
    expect(r.exceeds).toBe(true);
    expect(allFinite(r as unknown as Record<string, unknown>)).toBe(true);
  });
});

// ===========================================================================
// H14 · 冷/热水流量
// ===========================================================================
describe('hvacWaterFlow（独立复算）', () => {
  it('算例1：120kW、Δt=5 → 20.64 m³/h，推荐 DN80', () => {
    const r = hvacWaterFlow({ loadKw: 120, deltaT: 5 });
    expect(r.valid).toBe(true);
    expect(r.flowM3h).toBeCloseTo(20.64, 6);
    expect(r.flowLps).toBeCloseTo(20.64 / 3.6, 6);
    expect(r.recommendedDn).toBe(80);
    expect(r.velocity).toBe(1.5);
  });

  it('算例2：120kW、Δt=10 → 10.32 m³/h', () => {
    const r = hvacWaterFlow({ loadKw: 120, deltaT: 10 });
    expect(r.flowM3h).toBeCloseTo(10.32, 6);
  });

  it('边界：Δt=0 → valid=false、流量 0', () => {
    const r = hvacWaterFlow({ loadKw: 120, deltaT: 0 });
    expect(r.valid).toBe(false);
    expect(r.flowM3h).toBe(0);
    expect(allFinite(r as unknown as Record<string, unknown>)).toBe(true);
  });

  it('异常：Q=0 / NaN → 流量 0、valid=false；流速 0 → 回退 1.5', () => {
    expect(hvacWaterFlow({ loadKw: 0, deltaT: 5 }).flowM3h).toBe(0);
    expect(hvacWaterFlow({ loadKw: NaN, deltaT: 5 }).flowM3h).toBe(0);
    expect(hvacWaterFlow({ loadKw: 120, deltaT: 5, velocity: 0 }).velocity).toBe(1.5);
  });

  it('极端：超大流量 → 推荐管径超出常用序列 → null', () => {
    const r = hvacWaterFlow({ loadKw: 100000, deltaT: 5 });
    expect(r.recommendedDn).toBeNull();
  });
});

// ===========================================================================
// H15 · FCU 选型
// ===========================================================================
describe('hvacFcuSelect（独立复算）', () => {
  it('算例1：8kW 自动 → 1 台 8.0kW 档', () => {
    const r = hvacFcuSelect({ loadKw: 8, units: 0 });
    expect(r.valid).toBe(true);
    expect(r.count).toBe(1);
    expect(r.modelKw).toBe(8.0);
    expect(r.perUnitKw).toBeCloseTo(8, 6);
    expect(r.unitWaterFlowM3h).toBeCloseTo((0.86 * 8) / 5, 6);
  });

  it('算例2：8kW 指定 2 台 → 单台 4kW → 4.5kW 档', () => {
    const r = hvacFcuSelect({ loadKw: 8, units: 2 });
    expect(r.count).toBe(2);
    expect(r.modelKw).toBe(4.5);
    expect(r.perUnitKw).toBeCloseTo(4, 6);
    expect(r.totalWaterFlowM3h).toBeCloseTo(((0.86 * 4.5) / 5) * 2, 6);
  });

  it('算例3：25kW 自动 → 3 台（ceil(25/10.2)），单台 8.33 → 10.2 档', () => {
    const r = hvacFcuSelect({ loadKw: 25 });
    expect(r.count).toBe(3);
    expect(r.perUnitKw).toBeCloseTo(25 / 3, 6);
    expect(r.modelKw).toBe(10.2);
  });

  it('边界：负荷小于最小档 1kW → 选最小 2.5kW（不静默选大）', () => {
    const r = hvacFcuSelect({ loadKw: 1 });
    expect(r.modelKw).toBe(2.5);
    expect(r.count).toBe(1);
  });

  it('边界：负荷 0 → valid=false、model=null、无 NaN', () => {
    const r = hvacFcuSelect({ loadKw: 0 });
    expect(r.valid).toBe(false);
    expect(r.modelKw).toBeNull();
    expect(r.count).toBe(0);
    expect(allFinite(r as unknown as Record<string, unknown>)).toBe(true);
  });

  it('已知局限：负荷 25kW 但指定 1 台 → 单台 25kW 超最大档，返回 10.2 且无显式"容量不足"标志', () => {
    const r = hvacFcuSelect({ loadKw: 25, units: 1 });
    expect(r.count).toBe(1);
    expect(r.perUnitKw).toBeCloseTo(25, 6);
    expect(r.modelKw).toBe(10.2); // 无档可选时回落最大档（与 UI 仅靠 perUnit 提示）
  });
});

// ===========================================================================
// P16 · PLC 选型
// ===========================================================================
describe('plcSizing（独立复算）', () => {
  it('算例1：DI40/DO24/AI16/AO4 余量25% → 50/30/20/5，模块 4/2/3/1，小型，需机架', () => {
    const r = plcSizing({ di: 40, do: 24, ai: 16, ao: 4, marginPct: 25 });
    expect(r.required).toEqual({ di: 50, do: 30, ai: 20, ao: 5 });
    expect(r.totalPoints).toBe(105);
    expect(r.modules).toEqual({ di: 4, do: 2, ai: 3, ao: 1 });
    expect(r.totalModules).toBe(10);
    expect(r.cpuClass).toBe('小型');
    expect(r.needsRack).toBe(true); // 10 > 8
    expect(r.powerW).toBeCloseTo(45, 6); // 50*.3+30*.5+20*.6+5*.6
    expect(r.powerA).toBeCloseTo(45 / 24, 6);
  });

  it('CPU 档位边界：总点数 128 → 小型；129 → 中型；600 → 大型', () => {
    expect(plcSizing({ di: 128, do: 0, ai: 0, ao: 0, marginPct: 0 }).cpuClass).toBe('小型');
    expect(plcSizing({ di: 129, do: 0, ai: 0, ao: 0, marginPct: 0 }).cpuClass).toBe('中型');
    expect(plcSizing({ di: 600, do: 0, ai: 0, ao: 0, marginPct: 0 }).cpuClass).toBe('大型');
  });

  it('高速计数/脉冲：小点数量也升到中型', () => {
    const noHs = plcSizing({ di: 10, do: 0, ai: 0, ao: 0, marginPct: 0, highSpeed: false });
    expect(noHs.cpuClass).toBe('小型');
    const hs = plcSizing({ di: 10, do: 0, ai: 0, ao: 0, marginPct: 0, highSpeed: true });
    expect(hs.cpuClass).toBe('中型');
  });

  it('边界：全 0 点数 → 不崩、无 NaN、小型、无机架', () => {
    const r = plcSizing({ di: 0, do: 0, ai: 0, ao: 0 });
    expect(r.totalPoints).toBe(0);
    expect(r.totalModules).toBe(0);
    expect(r.cpuClass).toBe('小型');
    expect(r.needsRack).toBe(false);
    expect(allFinite(r as unknown as Record<string, unknown>)).toBe(true);
  });

  it('模块向上取整：17 点 DI → 2 块 16DI', () => {
    const r = plcSizing({ di: 17, do: 0, ai: 0, ao: 0, marginPct: 0 });
    expect(r.modules.di).toBe(2);
    expect(r.modules.di * PLC_MODULE_SPEC.di).toBeGreaterThanOrEqual(17);
  });

  it('异常：负数/NaN 归零', () => {
    const r = plcSizing({ di: -5, do: NaN, ai: 0, ao: 0, marginPct: 25 });
    expect(r.required.di).toBe(0);
    expect(r.required.do).toBe(0);
  });
});

// ===========================================================================
// P17 · 伺服电子齿轮比
// ===========================================================================
describe('servoGear（独立复算）', () => {
  it('算例1：E=131072、P=10、i=10、Δ=0.001 → ratio=131.072、最简比 16384/125', () => {
    const r = servoGear({ encoderRes: 131072, pitch: 10, gearRatio: 10, pulseEquiv: 0.001 });
    expect(r.valid).toBe(true);
    expect(r.ratio).toBeCloseTo(131.072, 6);
    expect(r.numerator).toBe(16384);
    expect(r.denominator).toBe(125);
    expect(r.numerator / r.denominator).toBeCloseTo(131.072, 6);
    expect(r.pulsesPerRev).toBeCloseTo(10000, 6);
    expect(r.inRange).toBe(false); // 131 > 50
  });

  it('算例2：E=131072、P=10、i=1、Δ=0.001 → ratio=13.1072、最简比 8192/625、在范围内', () => {
    const r = servoGear({ encoderRes: 131072, pitch: 10, gearRatio: 1, pulseEquiv: 0.001 });
    expect(r.ratio).toBeCloseTo(13.1072, 6);
    expect(r.numerator).toBe(8192);
    expect(r.denominator).toBe(625);
    expect(r.inRange).toBe(true);
  });

  it('边界：4 个输入任一 ≤0 → valid=false 且有中文错误提示，无 NaN', () => {
    for (const bad of [
      { encoderRes: 0, pitch: 10, gearRatio: 1, pulseEquiv: 0.001 },
      { encoderRes: 131072, pitch: 0, gearRatio: 1, pulseEquiv: 0.001 },
      { encoderRes: 131072, pitch: 10, gearRatio: 0, pulseEquiv: 0.001 },
      { encoderRes: 131072, pitch: 10, gearRatio: 1, pulseEquiv: 0 },
    ]) {
      const r = servoGear(bad);
      expect(r.valid).toBe(false);
      expect(typeof r.error).toBe('string');
      expect(allFinite(r as unknown as Record<string, unknown>)).toBe(true);
    }
  });

  it('范围边界：ratio=50 恰在上限内、ratio 略大于 50 提示超范围', () => {
    // ratio = E*Δ*i/P；取 E=1000,P=10,i=1,Δ=0.5 → 50
    expect(servoGear({ encoderRes: 1000, pitch: 10, gearRatio: 1, pulseEquiv: 0.5 }).inRange).toBe(true);
   
    expect(servoGear({ encoderRes: 1000, pitch: 10, gearRatio: 1, pulseEquiv: 0.51 }).inRange).toBe(false);
  });

  it('极端：脉冲当量极小（精度过高）→ inRange=false 且不崩、ratio 有限', () => {
    const r = servoGear({ encoderRes: 131072, pitch: 10, gearRatio: 1, pulseEquiv: 1e-9 });
    expect(r.valid).toBe(true);
    expect(r.inRange).toBe(false);
    expect(Number.isFinite(r.ratio)).toBe(true);
  });
});

// ===========================================================================
// 结构一致性：78 个工具 / 5 类目 14-12-18-19-15 / 速查 id 改名
// ===========================================================================
describe('注册表结构（第 1 步）', () => {
  it('全量 78 个工具 = 14+12+18+19+15', () => {
    expect(getAll()).toHaveLength(78);
    expect(byDomain('network')).toHaveLength(14);
    expect(byDomain('building')).toHaveLength(12);
    expect(byDomain('hvac')).toHaveLength(18);
    expect(byDomain('automation')).toHaveLength(19);
    expect(byDomain('elec')).toHaveLength(15);
  });

  it('每类目首个工具为本次新增 P0（network 无新增，为首个 N1）', () => {
    expect(byDomain('building')[0].id).toBe('building.ddcSizing');
    expect(byDomain('hvac')[0].id).toBe('hvac.loadEstimate');
    expect(byDomain('automation')[0].id).toBe('automation.plcSizing');
    expect(byDomain('elec')[0].id).toBe('elec.cableTypes');
    expect(byDomain('network')[0].id).toBe('network.subnet');
  });

  it('10 个新工具逐一可回取且为 P0', () => {
    const ids = [
      'building.ddcSizing', 'hvac.loadEstimate', 'hvac.airVolume', 'hvac.ductSize',
      'hvac.waterFlow', 'hvac.fcuSelect', 'automation.plcSizing', 'automation.servoGear',
      'elec.cableTypes', 'elec.installLimits',
    ];
    for (const id of ids) {
      const t = getById(id);
      expect(t, `${id} 缺失`).toBeTruthy();
      expect(t?.priority).toBe('P0');
      expect(t?.Component).toBeTruthy();
    }
  });

  it('速查表 id 已从 water.* 改为 elec.* / hvac.*', () => {
    const expected = {
      'elec.cableTypes': 'elec',
      'elec.installLimits': 'elec',
      'elec.groundingLimits': 'elec',
      'hvac.pipeSpecs': 'hvac',
      'hvac.drainSlope': 'hvac',
    };
    for (const [id, domain] of Object.entries(expected)) {
      const t = getQuickRef(id);
      expect(t, `${id} 缺失`).toBeTruthy();
      expect(t?.domain).toBe(domain);
    }
    // 旧 water.* 速查 id 不应再存在
    for (const oldId of ['water.cableTypes', 'water.installLimits', 'water.pipeSpecs', 'water.drainSlope', 'water.groundingLimits']) {
      expect(getQuickRef(oldId), `${oldId} 仍存在`).toBeUndefined();
    }
  });

  it('E11/E12 为 quickref 且绑定对应表', () => {
    expect(getById('elec.cableTypes')?.kind).toBe('quickref');
    expect(getById('elec.cableTypes')?.quickRefId).toBe('elec.cableTypes');
    expect(getById('elec.installLimits')?.kind).toBe('quickref');
    expect(getById('elec.installLimits')?.quickRefId).toBe('elec.installLimits');
  });
});
