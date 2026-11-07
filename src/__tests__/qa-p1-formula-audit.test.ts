/**
 * QA 独立验证 · P1 九组工程公式（修复后回归门禁 / 证伪式）
 * ==================================================================
 * 依据：formula-auditor 只读审核的 9 组数值锚点 + 4 项高风险口径裁决；
 *       team-lead《QA-P1口径修复规格.md》§0 范围裁决 / §1 逐文件改法 / §5 锚点总表 / §7 验收；
 *       team-lead 数值修正（ip 自动 59.3629、142.167 RT 精确等价、L=1m→35 kA）；
 *       formula-auditor 增量（撤回「强制性条文」、rcdRef 按行 id 定位、GB 13955-2005 已废止）；
 *       p1-calc-engineer 精确复算（κ 与规格锚点不自洽、规格 C3 边界举例失效）。
 *
 * 原则：
 *  1. **不复用工程师单测的任何断言**；期望值由本文件按第一性原理独立推导
 *     （κ 自动 ip 在测试内自算 kappaAt(R,X) 再乘，不硬编码规格舍入锚点）。
 *     ⚠ **禁止照抄审核清单/规格 §5 的舍入字面值**：1.744921 / 1.185097 /
 *     59.3523 / 18.960 / 61.2260 已由 formula-auditor 复算后撤回（对 R/X、ik3、
 *     √2 取中间舍入所致）。以 κ=1.02+0.98·e^(−3R/X) 自算结果为准：
 *     1.7449054460346953 / 1.185114488867464 / 59.362888780395735 /
 *     18.962584140915542 / 61.2372。新增/维护断言时先独立复算，勿回填旧清单数字。
 *  2. **修复后硬断言**：本文件固定的是规格 §5「修改后」列的最终实现目标，
 *     不再使用「部分修复态二态」宽容断言；A/C/D 段在常规 npm run test 中默认执行。
 *  3. A 段验「数值锚点守恒」（规格 E 段：公式主体/数值一个字符不动）；
 *     C 段是**规范性/口径门禁**（默认执行）；D 段是修复后边界与免责。
 *     B 段为 H1~H4 修复前取证的历史审计档案，用 describe.skip 存档、断言原文保留。
 *  4. 只读验证，不修改任何业务源码。
 *  5. C/D 段断言**不得越出规格 §0「本轮明确不做」范围**：
 *     Re 2300~4000 过渡区数值插值、Haaland/Colebrook 公式实现、roughnessMm 输入、
 *     电机储备系数分级表、新增 recommendedIcsKa 数值输出 —— 均**不作为门禁断言**。
 *
 * 运行：
 *   node scripts/run-tests.mjs run src/__tests__/qa-p1-formula-audit.test.ts
 */

import { describe, expect, it } from 'vitest';
import { poeBudget, POE_PORT_LIMIT_W } from '@/lib/calc/poeBudget';
import { iotGateway } from '@/lib/calc/iotGateway';
import { valveKv, KV_SELECTION_MARGIN, KVS_SERIES, KV_DN_TABLE } from '@/lib/calc/valveKv';
import { fanPower, FAN_POWER_DIVISOR } from '@/lib/calc/fanPower';
import { hydraulicBalance, WATER_NU } from '@/lib/calc/hydraulicBalance';
import {
  coolingTower,
  KW_PER_RT,
  TOWER_FLOW_COEF,
  VAPORIZATION_HEAT_KJ_KG,
} from '@/lib/calc/coolingTower';
import { rcdSelect, RCD_GRADING_MIN_RATIO } from '@/lib/calc/rcdSelect';
import {
  shortCircuit,
  VOLTAGE_FACTOR_C_MAX,
  TRANSFORMER_RZ_RATIO,
  ICU_SERIES_KA,
} from '@/lib/calc/shortCircuit';
import { reactivePower } from '@/lib/calc/reactivePower';
import { getQuickRef } from '@/data/catalog';

const SQRT3 = Math.sqrt(3);
/** 常见 Icu 档位（规格 §5 / 审核锚点，独立于实现常量 ICU_SERIES_KA 列出用于交叉校验） */
const ICU = [4.5, 6, 10, 15, 20, 25, 35, 50, 65, 100];
/** 规格 §3 通用免责句（9 个 calc note 末尾统一追加） */
const GENERAL_DISCLAIMER_TEXT = '不作为施工图设计、设备采购、产品验收或安全校验依据';

/** 短路电流审核锚点输入（1000 kVA / 6% / 400 V / L=0 / 铜 / 显式 κ=1.8 手动覆盖） */
const SC_BASE = {
  transformerKva: 1000,
  ukPercent: 6,
  voltageV: 400,
  cableLengthM: 0,
  cableSectionMm2: 185,
  material: 'copper' as const,
  kappa: 1.8, // 显式覆盖：规格 §5 保证该锚点修复前后不变（手动覆盖回归）
};

/** 冷却塔审核锚点输入（Qe=500 kW / 1.25 / Δt=5 / 显式 drift=0.0005 / N=4） */
const CT_BASE = {
  coolingLoadKw: 500,
  heatRejectionFactor: 1.25,
  deltaT: 5,
  driftRatio: 0.0005,
  cycles: 4,
  approach: 4,
  wetBulb: 28,
};

/** 无功补偿审核锚点输入（P=200 kW / 0.75 → 0.95 / 380 V / 25 kvar） */
const RP_BASE = {
  activeKw: 200,
  cosPhi1: 0.75,
  cosPhi2: 0.95,
  voltageV: 380,
  stepKvar: 25,
  transformerKva: 0,
};

/**
 * 历史兼容读取器 —— 仅供下方 B 段（修复前取证档案，describe.skip）使用。
 * 修复后 A/C/D 段一律直接访问 r.designBreakTimeMs（类型安全，符合规格 B1 改名）。
 */
function breakMs(r: ReturnType<typeof rcdSelect>): number | null {
  const v = r as unknown as Record<string, unknown>;
  if ('designBreakTimeMs' in v) {
    return typeof v.designBreakTimeMs === 'number' ? v.designBreakTimeMs : null;
  }
  return typeof v.maxBreakMs === 'number' ? v.maxBreakMs : null;
}

/** 历史二态断言 —— 仅供 B 段存档用例使用（修复后门禁已改为硬断言） */
function expectEither<T>(actual: T, pre: T, post: T): void {
  expect([pre, post]).toContain(actual);
}
function expectNearEither(actual: number, pre: number, post: number, digits: number): void {
  const tol = 0.5 * 10 ** -digits;
  expect(Math.abs(actual - pre) < tol || Math.abs(actual - post) < tol).toBe(true);
}

/** 按行 id 读 rcdRef 行 values（formula-auditor 要求：按 id 定位，不用行号/行数） */
function rcdRow(id: string): Record<string, string | number> {
  const table = getQuickRef('elec.rcdRef');
  const row = table?.rows.find((x) => x.id === id);
  return (row?.values ?? {}) as Record<string, string | number>;
}

// ==================================================================
// A. 9 组数值锚点独立复算 —— 验证「量纲/数值自洽」与 E 段锚点守恒
//    期望值按规格 §5「修改后」列 + 第一性原理独立推导
// ==================================================================

describe('A1 · PoE 供电预算（独立手算）', () => {
  const input = {
    camCount: 10, camW: 12, apCount: 4, apW: 15, otherCount: 2, otherW: 7,
    budgetW: 370, margin: 1.2, standard: 'af' as const,
  };

  it('锚点：194 W → 232.8 W → 剩余 137.2 W；端口 16、1 台交换机', () => {
    const demand = 10 * 12 + 4 * 15 + 2 * 7; // Σ(n_i·w_i)
    const design = demand * 1.2;
    const r = poeBudget(input);
    expect(r.valid).toBe(true);
    expect(demand).toBe(194);
    expect(r.totalDemandW).toBe(demand);
    expect(r.designDemandW).toBeCloseTo(design, 10);
    expect(r.remainingW).toBeCloseTo(370 - design, 10);
    expect(r.ports).toBe(16);
    expect(r.ok).toBe(true);
    expect(r.requiredSwitches).toBe(Math.ceil(design / 370));
    expect(r.requiredBudgetW).toBeCloseTo(design, 10);
  });

  it('af(12.95 W) 下 AP 15 W 触发 overPortLimit；at(25.5 W) 下不触发', () => {
    expect(poeBudget(input).overPortLimit).toBe(true);
    expect(poeBudget({ ...input, standard: 'at' }).overPortLimit).toBe(false);
  });

  it('四档 PD 侧单口保证功率 12.95 / 25.5 / 51 / 71.3 W（E 段守恒）', () => {
    expect(POE_PORT_LIMIT_W).toEqual({ af: 12.95, at: 25.5, bt3: 51, bt4: 71.3 });
  });
});

describe('A2 · IoT 网关带宽（独立手算）', () => {
  const input = {
    nodes: 500, intervalSec: 60, payloadBytes: 120, overheadBytes: 60,
    gatewayCapacity: 500, gatewayKbps: 1000,
  };

  it('锚点：180 B → 8.3333 pkt/s → 12 kbit/s → 129.6 MB → 1 台', () => {
    const packet = 120 + 60;
    const pps = 500 / 60;
    const bps = pps * packet * 8;
    const dailyBytes = (bps / 8) * 86400;
    const r = iotGateway(input);
    expect(r.valid).toBe(true);
    expect(r.packetBytes).toBe(packet);
    expect(r.packetsPerSec).toBeCloseTo(pps, 12);
    expect(r.uplinkBps).toBeCloseTo(bps, 9); // 12000
    expect(r.uplinkKbps).toBeCloseTo(12, 12);
    expect(r.dailyBytes).toBeCloseTo(dailyBytes, 6); // 129,600,000
    expect(r.dailyMB).toBeCloseTo(dailyBytes / 1e6, 10); // 129.6
    expect(r.dailyGB).toBeCloseTo(dailyBytes / 1e9, 10); // 0.1296
    expect(r.byNodes).toBe(1);
    expect(r.byBandwidth).toBe(1);
    expect(r.gatewayCount).toBe(1);
  });

  it('十进制 SI 口径：129.6 MB = 0.1296 GB（非 1024 进制，C8 明确不改）', () => {
    const r = iotGateway(input);
    expect(r.dailyGB * 1000).toBeCloseTo(r.dailyMB, 10);
  });
});

describe('A3 · 控制阀 Kv（独立手算 · 规格 §5 修复后 KV_SELECTION_MARGIN=1.25）', () => {
  it('锚点 A：Q=10、Δp=100、ρ=1 → Kv=10；选型余量后 Kvs=16 / DN40', () => {
    // 由定义 Q = Kv·√(Δp_bar/ρ_rel)，Δp_bar=Δp_kPa/100 ⇒ Kv=Q·√(ρ_rel·100/Δp_kPa)
    const kvExpected = 10 * Math.sqrt((1.0 * 100) / 100);
    const r = valveKv({ flowM3h: 10, dpKPa: 100, rhoRel: 1, dpTotalKPa: 200 });
    expect(r.valid).toBe(true);
    expect(kvExpected).toBe(10);
    expect(r.kv).toBeCloseTo(kvExpected, 12); // Kv 本身不变（C6 只改选型档）
    expect(r.valveAuthority).toBeCloseTo(100 / 200, 12); // S=0.5
    // 独立推导：targetKv = Kv × 1.25 = 12.5；KVS_SERIES 首个 ≥ 12.5 为 16
    const targetKv = kvExpected * 1.25;
    expect(targetKv).toBe(12.5);
    expect(KVS_SERIES.find((k) => k >= targetKv)).toBe(16);
    expect(KV_DN_TABLE.find((row) => row.kvs >= targetKv)?.dn).toBe(40);
    expect(r.recommendedKvs).toBe(16); // 规格 §5：10 → 16
    expect(r.recommendedDn).toBe(40);  // 规格 §5：DN32 → DN40
  });

  it('锚点 B：Q=10、Δp=50、ρ=1.04 → Kv≈14.422；选型余量后 Kvs=25 / DN50', () => {
    const kvExpected = 10 * Math.sqrt((1.04 * 100) / 50); // 10×√2.08
    const r = valveKv({ flowM3h: 10, dpKPa: 50, rhoRel: 1.04, dpTotalKPa: 0 });
    expect(kvExpected).toBeGreaterThan(14.42);
    expect(kvExpected).toBeLessThan(14.43);
    expect(r.kv).toBeCloseTo(kvExpected, 10);
    const targetKv = kvExpected * 1.25; // ≈18.0278
    expect(targetKv).toBeGreaterThan(18);
    expect(KVS_SERIES.find((k) => k >= targetKv)).toBe(25);
    expect(KV_DN_TABLE.find((row) => row.kvs >= targetKv)?.dn).toBe(50);
    expect(r.recommendedKvs).toBe(25); // 规格 §5：16 → 25
    expect(r.recommendedDn).toBe(50);  // 规格 §5：DN40 → DN50
  });
});

describe('A4 · 风机轴功率（独立手算）', () => {
  it('锚点：2.0886 kW → ×1.2=2.5063 → 3 kW（C7 不改数值/字段名）', () => {
    const shaft = (10000 * 500) / (3_600_000 * 0.7 * 0.95);
    const r = fanPower({ flowM3h: 10000, totalPa: 500, fanEff: 0.7, transEff: 0.95, motorMargin: 1.2 });
    expect(r.valid).toBe(true);
    expect(shaft).toBeCloseTo(2.0886, 4);
    expect(r.shaftKw).toBeCloseTo(shaft, 12);
    expect(r.requiredKw).toBeCloseTo(shaft * 1.2, 12);
    expect(r.recommendedMotorKw).toBe(3);
  });
});

describe('A5 · 水力平衡最不利环路（独立手算）', () => {
  it('锚点：单段 10 m³/h、d=50 mm、L=20 m、ζ=2 → ≈9.77 kPa / 0.9956 m', () => {
    // 完全独立 Darcy–Weisbach 链式复算（ν=1e-6、ρ=1000、g=9.81），C5 不改公式
    const dM = 50 / 1000;
    const area = Math.PI * (dM / 2) ** 2;
    const v = 10 / 3600 / area;
    const re = (v * dM) / 1e-6;
    const lambda = re < 2300 ? 64 / re : 0.3164 / Math.pow(re, 0.25);
    const dynPa = (1000 * v ** 2) / 2;
    const frictionPa = (lambda * dynPa / dM) * 20;
    const localPa = 2 * dynPa;
    const totalPa = frictionPa + localPa;
    const r = hydraulicBalance({ segments: '10,50,20,2', nearLoopKPa: 0 });
    expect(r.valid).toBe(true);
    expect(r.segmentCount).toBe(1);
    expect(r.segmentsDetail[0].velocity).toBeCloseTo(v, 12);
    expect(r.segmentsDetail[0].reynolds).toBeCloseTo(re, 6);
    expect(r.segmentsDetail[0].frictionPa).toBeCloseTo(frictionPa, 8);
    expect(r.segmentsDetail[0].localPa).toBeCloseTo(localPa, 8);
    expect(r.totalPa).toBeCloseTo(totalPa, 8);
    expect(r.totalKPa).toBeCloseTo(totalPa / 1000, 8);
    expect(r.headM).toBeCloseTo(totalPa / (1000 * 9.81), 8);
    expect(v).toBeCloseTo(1.4147, 3);
    expect(re).toBeCloseTo(70736, -2);
    expect(r.totalKPa).toBeCloseTo(9.77, 1);
    expect(r.headM).toBeCloseTo(0.9956, 3);
  });
});

describe('A6 · 冷却塔（独立手算，显式 drift=0.0005）', () => {
  it('锚点：Qc=625、W=107.5、E=0.92593、D=0.05375、B=0.25489、M=1.23457、RT=142.1666', () => {
    const qc = 500 * 1.25;
    const w = (qc * 0.86) / 5;
    const e = (qc * 3600) / (2430 * 1000);
    const d = w * 0.0005;
    const b = e / (4 - 1) - d;
    const m = e + d + b;
    const r = coolingTower(CT_BASE);
    expect(qc).toBe(625);
    expect(w).toBe(107.5);
    expect(e).toBeCloseTo(0.925926, 6);
    expect(d).toBe(0.05375);
    expect(b).toBeCloseTo(0.254892, 6);
    expect(m).toBeCloseTo(1.234568, 6);
    expect(r.valid).toBe(true);
    expect(r.qcKw).toBeCloseTo(qc, 12);
    expect(r.flowM3h).toBeCloseTo(w, 12);
    expect(r.evapM3h).toBeCloseTo(e, 12);
    expect(r.driftM3h).toBeCloseTo(d, 12); // 显式传入 0.0005，不受 C2 默认 0.0001 影响
    expect(r.blowdownM3h).toBeCloseTo(b, 12);
    expect(r.makeupM3h).toBeCloseTo(m, 12); // 规格 §5：M 恒等式修复前后不变
    expect(r.outletTempC).toBe(32);
    expect(r.inletTempC).toBe(37);
    expect(r.recommendedFlowM3h).toBe(125);
    expect(r.waterTons).toBe(r.flowM3h);
    // 规格 A3：rtNominal 改为「制冷量 / 3.517」，177.708 → 142.1666
    expect(r.rtNominal).toBeCloseTo(500 / 3.517, 10);
    expect(r.rtNominal).not.toBeCloseTo(625 / 3.517, 2); // 不得再用旧 Qc 口径
  });

  it('恒等式锚点：B>0 时 M ≡ E·N/(N−1) 精确成立；E/(W·Δt)=0.0017226', () => {
    const r = coolingTower(CT_BASE);
    expect(r.blowdownM3h).toBeGreaterThan(0);
    expect(r.makeupM3h).toBeCloseTo((r.evapM3h * 4) / 3, 10);
    expect(r.evapM3h / (r.flowM3h * 5)).toBeCloseTo(0.0017226, 6);
  });

  it('规格 C2 新默认值口径独立复算：显式 drift=0.0001 → D=0.01075、B=0.297892、M 不变', () => {
    const r = coolingTower({ ...CT_BASE, driftRatio: 0.0001 });
    const d = 107.5 * 0.0001; // 浮点：0.010750000000000001，用 toBeCloseTo 而非 toBe
    const e = (625 * 3600) / (2430 * 1000);
    expect(d).toBeCloseTo(0.01075, 12);
    expect(r.driftM3h).toBeCloseTo(d, 8);
    expect(r.blowdownM3h).toBeCloseTo(e / 3 - d, 6);
    expect(r.blowdownM3h).toBeCloseTo(0.297892, 6);
    expect(r.makeupM3h).toBeCloseTo(1.234568, 6); // M ≡ E·N/(N−1)，与 D 无关
  });

  it('名义冷吨口径：Qe/3.517 与 Qc/(3.517×1.25)=Qc/4.39625 精确相等；4.392 仅行业近似', () => {
    // team-lead 复算澄清：两种精确算式完全相等，规格审核清单的「0.14 RT 差异」是
    // 把行业近似系数 4.392 当成精确值造成的伪问题，不再作为待确认项。
    const byQe = 500 / 3.517;              // 142.1666192777936
    const byExact = 625 / (3.517 * 1.25);  // 4.39625，严格恒等
    const byApprox = 625 / 4.392;          // 142.304189，行业近似，偏大 ~0.14 RT
    expect(byExact).toBeCloseTo(byQe, 10);
    expect(byQe).toBeCloseTo(142.1666, 4);
    expect(byApprox).toBeGreaterThan(byQe);
    expect(byApprox - byQe).toBeCloseTo(0.13757, 4);
    // 规格 A3 采用 Qe/3.517 口径
    expect(coolingTower(CT_BASE).rtNominal).toBeCloseTo(byQe, 10);
    expect(coolingTower(CT_BASE).rtNominal).not.toBeCloseTo(177.708, 2);
  });
});

describe('A7 · RCD 选型与级配（独立手算 · 规格 B1 字段改名 designBreakTimeMs）', () => {
  it('锚点：socket → 30 mA / 100 ms / 一般型；上级 300 mA+延时 → ratio=10、OK', () => {
    const r = rcdSelect({ circuitType: 'socket', ratedCurrentA: 16, upstreamMa: 300, upstreamDelayed: 'yes' });
    expect(r.valid).toBe(true);
    expect(r.iDeltaNMa).toBe(30);
    expect(r.designBreakTimeMs).toBe(100); // B1 改名后仍为 100 ms
    expect(r.rcdType).toContain('一般型');
    expect(r.gradingRatio).toBe(300 / 30);
    expect(r.gradingOk).toBe(true);
    expect(r.ratedCurrentMinA).toBe(16);
  });

  it('锚点：上级 60 mA → ratio=2 → false；无上级 → null/true（E 段双条件守恒）', () => {
    const weak = rcdSelect({ circuitType: 'socket', ratedCurrentA: 16, upstreamMa: 60, upstreamDelayed: 'yes' });
    expect(weak.gradingRatio).toBe(2);
    expect(weak.gradingOk).toBe(false);
    const none = rcdSelect({ circuitType: 'socket', ratedCurrentA: 16, upstreamMa: 0, upstreamDelayed: 'no' });
    expect(none.gradingRatio).toBeNull();
    expect(none.gradingOk).toBe(true);
  });

  it('规格 §5：fire → null（不得 0 ms）、motor → 100、main → 500 且定性为 IΔn 下上限', () => {
    const fire = rcdSelect({ circuitType: 'fire', ratedCurrentA: 16, upstreamMa: 300, upstreamDelayed: 'yes' });
    expect(fire.designBreakTimeMs).toBeNull();
    expect(fire.note).toMatch(/不脱扣|不适用|仅报警/);
    expect(fire.note).not.toMatch(/0\s*ms/); // 不得出现「0 ms 动作」
    const motor = rcdSelect({ circuitType: 'motor', ratedCurrentA: 16, upstreamMa: 0, upstreamDelayed: 'no' });
    expect(motor.designBreakTimeMs).toBe(100); // 规格 §5：200 → 100
    expect(motor.rcdType).toContain('无延时');
    const main = rcdSelect({ circuitType: 'main', ratedCurrentA: 16, upstreamMa: 0, upstreamDelayed: 'no' });
    expect(main.designBreakTimeMs).toBe(500); // 规格 §5：main 不变
    expect(main.note).toContain('IΔn 下的分断时间上限'); // 定性：非「延时 500 ms」
    expect(main.note).toContain('大故障电流下更快');
    for (const ct of ['socket', 'wet', 'lighting'] as const) {
      const r = rcdSelect({ circuitType: ct, ratedCurrentA: 16, upstreamMa: 0, upstreamDelayed: 'no' });
      expect(r.designBreakTimeMs).toBe(100);
      expect(r.iDeltaNMa).toBe(30);
    }
  });
});

describe('A8 · 短路电流（独立手算）', () => {
  it('锚点（显式 κ=1.8 手动覆盖）：In=1443.4 A、Zt=0.0096、ik3=24.056、ik1=12.028、ip=61.2372、Icu=35 kA', () => {
    const inA = (1000 * 1000) / (SQRT3 * 400);
    const zt = ((6 / 100) * 400 ** 2) / (1000 * 1000);
    const rt = 0.1 * zt;
    const xt = Math.sqrt(zt ** 2 - rt ** 2);
    const ztot = Math.sqrt(rt ** 2 + xt ** 2);
    const ik3 = 400 / (SQRT3 * ztot) / 1000;
    const ik1 = (400 / SQRT3) / (2 * ztot) / 1000;
    const ip = Math.SQRT2 * 1.8 * ik3; // 手动覆盖路径
    const r = shortCircuit(SC_BASE);
    expect(r.valid).toBe(true);
    expect(r.inA).toBeCloseTo(inA, 9);
    expect(r.ztOhm).toBeCloseTo(zt, 12);
    expect(r.ztotOhm).toBeCloseTo(ztot, 12);
    expect(r.ik3Ka).toBeCloseTo(ik3, 9); // 规格 §5：ik3 不变
    expect(r.ik1Ka).toBeCloseTo(ik1, 9); // 规格 §5：ik1 不变
    expect(r.ipKa).toBeCloseTo(ip, 9);   // 规格 §5：显式 κ=1.8 手动覆盖 ip 不变
    expect(inA).toBeCloseTo(1443.4, 1);
    expect(ik3).toBeCloseTo(24.056, 3);
    expect(ip).toBeGreaterThan(61.23);
    expect(ip).toBeLessThan(61.24);
    expect(r.kappaUsed).toBe(1.8);
    expect(r.recommendedIcuKa).toBe(35); // 规格 §5：25 → 35（H1 核心证伪点）
  });

  it('H1 跨档实证：ik3×c_max(1.05)=25.2591 kA 越过 25 kA 档 → 35 kA；新增 ik3DesignKa', () => {
    const r = shortCircuit(SC_BASE);
    const corrected = r.ik3Ka * 1.05;
    expect(corrected).toBeGreaterThan(25);
    expect(corrected).toBeCloseTo(25.2591, 3);
    expect(r.ik3DesignKa).toBeCloseTo(corrected, 10);
    expect(r.ik3DesignKa).toBeCloseTo(25.2591, 3);
    expect(ICU.find((v) => v >= corrected)).toBe(35);
    expect(r.recommendedIcuKa).toBe(35);
  });

  it('κ 独立复算：κ=1.02+0.98·e^(−3R/X) → L=0 时 1.744905、100 m 铜 185 mm² 时 1.185114', () => {
    const zt = 0.0096;
    const rt0 = 0.1 * zt;
    const xt0 = Math.sqrt(zt ** 2 - rt0 ** 2);
    const kappaAt = (rTot: number, xTot: number) => 1.02 + 0.98 * Math.exp((-3 * rTot) / xTot);
    const ik3At = (rTot: number, xTot: number) => 400 / (SQRT3 * Math.sqrt(rTot ** 2 + xTot ** 2)) / 1000;
    const k0 = kappaAt(rt0, xt0);
    const rc100 = (0.0175 * 100) / 185;
    const xc100 = 0.00008 * 100;
    const k100 = kappaAt(rt0 + rc100, xt0 + xc100);
    // 按未舍入 R/X 独立复算的精确值（规格 §5 的 1.744921 / 1.185097 来自 R/X 舍入，不自洽）
    expect(k0).toBeCloseTo(1.7449054460346953, 9);
    expect(k100).toBeCloseTo(1.185114488867464, 9);
    expect(1.8 / k100).toBeGreaterThan(1.5); // 固定 κ 长电缆回路高估峰值 ~51%
    // ip 自动：测试内自算 κ 再乘，不硬编码规格舍入锚点 59.3523 / 18.960
    const ipL0 = Math.SQRT2 * k0 * ik3At(rt0, xt0);
    const ipL100 = Math.SQRT2 * k100 * ik3At(rt0 + rc100, xt0 + xc100);
    expect(ipL0).toBeCloseTo(59.362888780395735, 9);
    expect(ipL100).toBeCloseTo(18.962584140915542, 9);
    expect(ipL0).toBeCloseTo(59.3629, 2); // team-lead 复算锚点
  });

  it('κ 双路径回归：κ=0/省略 → 自动（ip 59.3629 / 18.9626）；显式 κ=1.8 → 手动覆盖（ip 61.2372）', () => {
    const zt = 0.0096;
    const rt0 = 0.1 * zt;
    const xt0 = Math.sqrt(zt ** 2 - rt0 ** 2);
    const kappaAt = (rTot: number, xTot: number) => 1.02 + 0.98 * Math.exp((-3 * rTot) / xTot);
    const k0 = kappaAt(rt0, xt0);
    const ik3L0 = 400 / (SQRT3 * zt) / 1000;
    const auto0 = shortCircuit({ ...SC_BASE, kappa: 0 });
    const omit = shortCircuit({
      transformerKva: 1000, ukPercent: 6, voltageV: 400,
      cableLengthM: 0, cableSectionMm2: 185, material: 'copper' as const,
    });
    expect(auto0.valid).toBe(true); // 规格 C1 守卫已放宽：κ=0 → 自动
    expect(omit.valid).toBe(true);
    expect(auto0.kappaUsed).toBeCloseTo(k0, 10);
    expect(omit.kappaUsed).toBeCloseTo(k0, 10);
    expect(auto0.ipKa).toBeCloseTo(Math.SQRT2 * k0 * ik3L0, 9);
    expect(auto0.ipKa).toBeCloseTo(59.3629, 2);
    // 手动覆盖仍保留旧 ip 锚点（team-lead 要求的回归用例；公式精确值 61.2372 而非舍入 61.2260）
    const manual = shortCircuit(SC_BASE);
    expect(manual.kappaUsed).toBe(1.8);
    expect(manual.ipKa).toBeCloseTo(Math.SQRT2 * 1.8 * ik3L0, 9);
    expect(manual.ipKa).toBeCloseTo(61.2372, 3);
    // 守卫：κ=0 自动可达；κ<0 或 0<κ<1 非法；κ≥1 手动覆盖
    expect(shortCircuit({ ...SC_BASE, kappa: -1 }).valid).toBe(false);
    expect(shortCircuit({ ...SC_BASE, kappa: 0.5 }).valid).toBe(false);
  });
});

describe('A9 · 无功补偿（独立手算）', () => {
  it('锚点：tan1=0.881917、tan2=0.328684、Qc=110.647、5 路/125 kvar/过补 14.353', () => {
    const tan1 = Math.sqrt(1 - 0.75 ** 2) / 0.75;
    const tan2 = Math.sqrt(1 - 0.95 ** 2) / 0.95;
    const qc = 200 * (tan1 - tan2);
    const sBefore = 200 / 0.75;
    const sAfter = 200 / 0.95;
    const iBefore = (200 * 1000) / (SQRT3 * 380 * 0.75);
    const iAfter = (200 * 1000) / (SQRT3 * 380 * 0.95);
    const circuits = Math.ceil(qc / 25);
    const installed = circuits * 25;
    const r = reactivePower(RP_BASE);
    expect(r.valid).toBe(true);
    expect(r.tan1).toBeCloseTo(tan1, 12);
    expect(r.tan2).toBeCloseTo(tan2, 12);
    expect(r.qcKvar).toBeCloseTo(qc, 9);
    expect(r.sBeforeKva).toBeCloseTo(sBefore, 9);
    expect(r.sAfterKva).toBeCloseTo(sAfter, 9);
    expect(r.savedKva).toBeCloseTo(sBefore - sAfter, 9);
    expect(r.currentBeforeA).toBeCloseTo(iBefore, 9);
    expect(r.currentAfterA).toBeCloseTo(iAfter, 9);
    expect(r.circuits).toBe(circuits);
    expect(r.installedKvar).toBe(installed);
    expect(r.overKvar).toBeCloseTo(installed - qc, 9);
    expect(tan1).toBeCloseTo(0.881917, 5);
    expect(tan2).toBeCloseTo(0.328684, 5);
    expect(qc).toBeCloseTo(110.647, 3);
    expect(iBefore).toBeCloseTo(405.16, 2);
    expect(iAfter).toBeCloseTo(319.86, 2);
    expect(circuits).toBe(5);
    expect(r.overKvar).toBeCloseTo(14.353, 3);
  });

  it('锚点：cosφ2 ≤ cosφ1 → Qc=0、circuits=0（E 段守恒）', () => {
    const r = reactivePower({ ...RP_BASE, cosPhi2: 0.75 });
    expect(r.qcKvar).toBe(0);
    expect(r.circuits).toBe(0);
    expect(r.note).toContain('无需补偿');
  });
});

// ==================================================================
// B. 修复前口径取证（历史审计档案）—— 用 describe.skip 存档，不参与回归
// ------------------------------------------------------------------
// 本节是 H1~H4 高风险项在 commit 0752b8b（修复前）的「现状取证」，
// 全部 it / expect 原文保留作为可追溯证据。修复完成后这些断言描述的是
// 「曾经存在的错误」，故整体跳过；如需复现当时的错误实现请回看 0752b8b。
// 修复后门禁见上方 A 段与下方 C / D 段。
// ==================================================================

describe.skip('B · 修复前口径取证（历史审计档案，修复后不适用）', () => {
  it('B-H1 Icu 只可能是 25（修复前）或 35（修复后），且 c_max 复核值必定跨过 25 kA 档', () => {
    const r = shortCircuit(SC_BASE);
    expectEither(r.recommendedIcuKa, 25, 35);
    expect(r.ik3Ka * 1.05).toBeGreaterThan(25);
    expect(ICU.find((v) => v >= r.ik3Ka * 1.05)).toBe(35);
  });

  it('B-H2 ik1 说明在两态都必须保留「零序阻抗」口径提示', () => {
    expect(shortCircuit(SC_BASE).note).toContain('零序阻抗');
  });

  it('B-H3 rtNominal 只可能是 177.708（Qc 口径）或 142.1666（Qe 口径）；「水吨」恒等于 m³/h', () => {
    const r = coolingTower(CT_BASE);
    expectNearEither(r.rtNominal, 625 / 3.517, 500 / 3.517, 3);
    expect(r.waterTons).toBe(r.flowM3h);
  });

  it('B-H4 rcdRef.json 两套口径裁决已落盘；计算器 fire / motor 动作时间二态取值', () => {
    const basis = String(rcdRow('trip-time').basis);
    expect(basis).toContain('JGJ/T 46-2024');
    expect(basis).toMatch(/不冲突|不矛盾|用途不同/);
    expect(basis).toContain('严禁将本表数值用于产品验收判定');
    const fire = rcdSelect({ circuitType: 'fire', ratedCurrentA: 16, upstreamMa: 300, upstreamDelayed: 'yes' });
    expectEither(breakMs(fire), 0, null);
    const motor = rcdSelect({ circuitType: 'motor', ratedCurrentA: 16, upstreamMa: 0, upstreamDelayed: 'no' });
    expectEither(breakMs(motor), 200, 100);
  });

  it('B-M4 B 截断：盐量平衡恒等式失效（M 偏离 E·N/(N−1) 62%，两态数值相同）', () => {
    const r = coolingTower({ ...CT_BASE, driftRatio: 0.01 });
    expect(r.blowdownM3h).toBe(0);
    const identity = (r.evapM3h * 4) / 3;
    expect(r.makeupM3h).toBeGreaterThan(identity * 1.5);
    expect(r.makeupM3h).toBeCloseTo(r.evapM3h + r.driftM3h, 10); // B=0 ⇒ M=E+D
  });

  it('B-M5 Re=2300 处 λ 跳升 >60%（C5 不改公式，两态数值相同）', () => {
    const dM = 50 / 1000;
    const area = Math.PI * (dM / 2) ** 2;
    const qForRe = (re: number) => ((re * WATER_NU) / dM) * 3600 * area;
    const low = hydraulicBalance({ segments: `${qForRe(2299.9)},50,1,0`, nearLoopKPa: 0 });
    const high = hydraulicBalance({ segments: `${qForRe(2300.1)},50,1,0`, nearLoopKPa: 0 });
    expect(qForRe(2300.1) / qForRe(2299.9)).toBeLessThan(1.001); // 流速几乎不变
    expect(high.segmentsDetail[0].frictionPa / low.segmentsDetail[0].frictionPa).toBeGreaterThan(1.5);
  });

  it('B-M10 容性/超前无符号通道：tanφ 恒正，同一数值无法区分滞后/超前', () => {
    const r = reactivePower(RP_BASE);
    expect(r.tan1).toBeGreaterThan(0);
    expect(reactivePower({ ...RP_BASE }).qcKvar).toBe(r.qcKvar);
  });

  it('B-M6 阀门选型余量只可能是 1.0×Kv（修复前）或 1.6×Kv（修复后）', () => {
    const r = valveKv({ flowM3h: 10, dpKPa: 100, rhoRel: 1, dpTotalKPa: 0 });
    expectNearEither((r.recommendedKvs ?? 0) / r.kv, 1.0, 1.6, 6);
  });

  it('B-M7 shaftKw 含传动效率（实为电机侧功率），两态数值相同', () => {
    const r = fanPower({ flowM3h: 10000, totalPa: 500, fanEff: 0.7, transEff: 0.95, motorMargin: 1.2 });
    const shaftOnly = (10000 * 500) / (3_600_000 * 0.7); // 1.9841 kW
    expect(r.shaftKw).toBeGreaterThan(shaftOnly); // 除 η_trans 后反而偏大 5.26%
    expect(r.shaftKw).toBeCloseTo(shaftOnly / 0.95, 10);
  });

  it('B-M8 IoT 仅算平均速率：1 台网关结论两态不变', () => {
    const r = iotGateway({ nodes: 500, intervalSec: 60, payloadBytes: 120, overheadBytes: 60, gatewayCapacity: 500, gatewayKbps: 1000 });
    expect(r.gatewayCount).toBe(1);
    expect(r.byBandwidth).toBe(1);
  });
});

// ==================================================================
// C. 规范性 / 口径门禁（默认执行，常规 npm run test 生效）
//    断言「按规范应有的正确行为」，对齐《QA-P1口径修复规格.md》§5 + §7。
//    不越出规格 §0「本轮明确不做」范围（过渡区插值/Haaland 实现/电机分级表/
//    recommendedIcsKa 数值均不作门禁）。
// ==================================================================

describe('C · 规范性/口径门禁（修复后回归，默认执行）', () => {
  // ---- A1 / A2 短路：电压系数 c 与 ik1 用途限制 ----
  it('C-H1a 按 IEC 60909 c_max=1.05 复核后，推荐 Icu 应为 35 kA', () => {
    expect(shortCircuit(SC_BASE).recommendedIcuKa).toBe(35);
  });

  it('C-H1b 须新增 ik3DesignKa=25.2591 kA 作为选档基准（规格 §5 / §7 跨档证伪）', () => {
    expect(shortCircuit(SC_BASE).ik3DesignKa).toBeCloseTo(25.2591, 3);
  });

  it('C-H1c 说明须给出电压系数 c 复核值（c_max 与 1.05）', () => {
    expect(shortCircuit(SC_BASE).note).toMatch(/c_max|电压系数|1\.05/);
  });

  it('C-H1d 临界算例 L=1 m：ik3≈23.834 kA，×1.05=25.026 kA 仍应推荐 35 kA', () => {
    // 独立复算：L=1m 铜 185 → ztot≈0.009689，ik3≈23.834203，×1.05≈25.025913 >25 → 35
    const r = shortCircuit({ ...SC_BASE, cableLengthM: 1 });
    expect(r.ik3Ka * VOLTAGE_FACTOR_C_MAX).toBeGreaterThan(25);
    expect(r.ik3DesignKa).toBeCloseTo(25.0259, 3);
    expect(ICU.find((v) => v >= r.ik3DesignKa)).toBe(35);
    expect(r.recommendedIcuKa).toBe(35);
  });

  it('C-H2a ik1 须明确禁止用于保护灵敏度/整定/自动切断时间校验', () => {
    expect(shortCircuit(SC_BASE).note).toMatch(/禁止.*(灵敏度|整定|切断时间)/);
  });

  it('C-H2b 须说明最小短路电流须按 c_min + 高温电阻另算', () => {
    expect(shortCircuit(SC_BASE).note).toMatch(/c_min|最小短路电流/);
  });

  it('C-C1 κ 按 R/X 自动计算（κ=0/省略可达），保留 κ≥1 手动覆盖', () => {
    // 规格 C1 的「κ<1 一律非法」与「κ=0 自动」冲突已由 A 组放宽为：
    //   κ=0 → 自动；κ<0 或 0<κ<1 → 非法；κ≥1 → 手动覆盖。
    const zt = 0.0096;
    const rt0 = 0.1 * zt;
    const xt0 = Math.sqrt(zt ** 2 - rt0 ** 2);
    const kappaAt = (rTot: number, xTot: number) => 1.02 + 0.98 * Math.exp((-3 * rTot) / xTot);
    const k0 = kappaAt(rt0, xt0);
    const rc100 = (0.0175 * 100) / 185;
    const xc100 = 0.00008 * 100;
    const k100 = kappaAt(rt0 + rc100, xt0 + xc100);
    const auto0 = shortCircuit({ ...SC_BASE, kappa: 0 });
    const auto100 = shortCircuit({ ...SC_BASE, kappa: 0, cableLengthM: 100 });
    expect(auto0.valid).toBe(true);
    expect(auto100.valid).toBe(true);
    expect(auto0.kappaUsed).toBeCloseTo(k0, 9);       // 1.744905446
    expect(auto100.kappaUsed).toBeCloseTo(k100, 9);   // 1.185114489
    expect(auto0.ipKa).toBeCloseTo(59.3629, 2);       // 自算 κ 推导，非规格舍入 59.3523
    expect(auto100.ipKa).toBeCloseTo(18.9626, 2);     // 非规格舍入 18.960
    // 显式 κ=1.8 手动覆盖仍应保留旧 ip 锚点
    expect(shortCircuit(SC_BASE).ipKa).toBeCloseTo(61.2372, 3);
  });

  // ---- A3 冷却塔：冷吨基准 / 水吨免责 / 盐量平衡 ----
  it('C-H3a 名义冷吨应采用 Qe/3.517=142.1666 RT（或 Qc/4.39625），不得为 177.7 RT', () => {
    const r = coolingTower(CT_BASE);
    expect(r.rtNominal).toBeCloseTo(500 / 3.517, 6);
    expect(r.rtNominal).toBeGreaterThan(142);
    expect(r.rtNominal).toBeLessThan(142.3);
    expect(r.rtNominal).not.toBeCloseTo(177.708, 2);
  });

  it('C-H3b 「水吨」须标注不同厂商 ±30% 波动与禁止用于精确选型', () => {
    expect(coolingTower(CT_BASE).note).toMatch(/±30%|禁止用于精确选型|不同厂家.*差异/);
  });

  it('C-H3c B 截断时须提示无法维持设定浓缩倍数 N、盐量平衡失效', () => {
    const r = coolingTower({ ...CT_BASE, driftRatio: 0.01 });
    expect(r.note).toMatch(/无法维持|达不到设定|漂水率过大|浓缩倍数过高/);
  });

  it('C-C3 须新增 saltBalanceHolds：默认 true、drift=0.01 时 false 且 M=E+D', () => {
    const ok = coolingTower(CT_BASE);
    const bad = coolingTower({ ...CT_BASE, driftRatio: 0.01 });
    expect(ok.saltBalanceHolds).toBe(true);
    expect(bad.saltBalanceHolds).toBe(false);
    expect(bad.makeupM3h).toBeCloseTo(bad.evapM3h + bad.driftM3h, 10);
  });

  // ---- B1/B2 RCD：字段改名 / 双口径 / 内部一致 ----
  it('C-H4a 字段须改名 designBreakTimeMs，不得再用 maxBreakMs', () => {
    const r = rcdSelect({ circuitType: 'socket', ratedCurrentA: 16, upstreamMa: 300, upstreamDelayed: 'yes' });
    expect('designBreakTimeMs' in r).toBe(true);
    expect('maxBreakMs' in r).toBe(false);
  });

  it('C-H4b 消防设备动作时间须为 null /「不适用」，不得输出 0 ms', () => {
    const fire = rcdSelect({ circuitType: 'fire', ratedCurrentA: 16, upstreamMa: 300, upstreamDelayed: 'yes' });
    expect(fire.designBreakTimeMs).toBeNull();
    expect(fire.note).toMatch(/不脱扣|不适用|仅报警/);
    expect(fire.note).not.toMatch(/0\s*ms/);
  });

  it('C-H4c 出处：JGJ/T 46-2024 3.3.4（推荐性）、GB 13955-2005 标注已废止、GB 50054-2011 不承担 0.1 s', () => {
    const basis = String(rcdRow('trip-time').basis);
    expect(basis).toContain('JGJ/T 46-2024');
    expect(basis).toContain('3.3.4');
    expect(basis).toContain('GB 13955-2005');
    expect(basis).toMatch(/已废止|历史沿用/);          // formula-auditor：不能作为现行依据
    expect(basis).toContain('GB/T 13955-2017');        // 替代标准
    expect(basis).toContain('GB 50054-2011');
    expect(basis).toContain('无 0.1 s 条文');
    // formula-auditor：撤回「强制性条文 / 现行强制出处」措辞
    expect(basis).not.toMatch(/强制性条文|现行强制出处/);
    expect(basis).not.toMatch(/≤0\.1 s 属 GB 50054|GB 50054\s*\/\s*GB 13955 口径/);
  });

  it('C-H4d 须并列展示两套口径：设计选用 0.1/0.3/0.5 s 与型式试验 0.3/0.15/0.04 s、S 型 0.13 s', () => {
    const basis = String(rcdRow('trip-time').basis);
    const timeText = String(rcdRow('trip-time').time);
    expect(timeText).toMatch(/设计选用|分级配合/);
    expect(timeText).toMatch(/型式试验|产品标准/);
    expect(timeText).toContain('≤0.1 s');       // 设计口径（带空格）
    expect(timeText).toContain('≤0.3 s');
    expect(timeText).toContain('≤0.5 s');
    // 产品型式试验口径为紧凑格式（≤0.04s / ≥0.13s，无空格），用正则兼容两种
    expect(timeText).toMatch(/≤0\.04\s*s/);
    expect(timeText).toMatch(/≥0\.13\s*s/);     // S 型最小不驱动
    expect(basis).toMatch(/不冲突|不矛盾|用途不同/);
    expect(basis).toMatch(/严禁.*验收判定|产品验收.*本栏/);
  });

  it('C-H4e S 型须写「IΔn 下最小不驱动 ≥0.13 s」，不得写「2IΔn 下不早于 0.1 s」', () => {
    const note = rcdSelect({ circuitType: 'main', ratedCurrentA: 16, upstreamMa: 0, upstreamDelayed: 'no' }).note;
    expect(note).toContain('0.13');
    expect(note).not.toMatch(/2IΔn 下不早于 0\.1 s/);
  });

  it('C-H4f 计算器 motor 与速查表 fixed-motor 须一致（100 mA / 无延时 / ≤0.1 s）', () => {
    const motor = rcdSelect({ circuitType: 'motor', ratedCurrentA: 16, upstreamMa: 0, upstreamDelayed: 'no' });
    expect(motor.designBreakTimeMs).toBe(100);
    expect(motor.rcdType).toContain('无延时');
    expect(String(rcdRow('fixed-motor').time)).toContain('0.1 s');
  });

  // ---- C5 / C6 / C9 中风险口径（仅文案/算法内断言，不越出规格 §0 范围）----
  it('C-M5 水力：Re≤1e5 也须无条件提示 Blasius 光滑管近似、粗糙度与 Colebrook 复核（仅文案）', () => {
    // 规格 §0 明确不做 Re 2300~4000 过渡区数值插值 / Haaland 公式实现，故仅断言文案提示。
    // 本算例 Re≈7.07e4 < 1e5，专门验证「无条件 push」（修复前仅 Re>1e5 才提示）。
    const r = hydraulicBalance({ segments: '10,50,20,2', nearLoopKPa: 0 });
    expect(r.segmentsDetail[0].reynolds).toBeLessThan(1e5);
    expect(r.note).toMatch(/光滑管|Blasius/);
    expect(r.note).toMatch(/粗糙管|粗糙度/); // 规格文案为「实际钢管/镀锌钢管为粗糙管」
    expect(r.note).toMatch(/Colebrook/);
    expect(r.note).toContain('过渡区'); // 文案提示存在即可，不要求数值插值
  });

  it('C-M6 阀门：推荐 Kvs 须留 ≥1.25×Kv 余量（Q=10/Δp=100 → Kvs=16 / DN40）', () => {
    const r = valveKv({ flowM3h: 10, dpKPa: 100, rhoRel: 1, dpTotalKPa: 0 });
    expect((r.recommendedKvs ?? 0) / r.kv).toBeGreaterThanOrEqual(1.25);
    expect(r.recommendedKvs).toBe(16);
    expect(r.recommendedDn).toBe(40);
  });

  it('C-M10 无功：须提示容性/超前功率因数符号与「仅适用于感性负载欠补偿」', () => {
    expect(reactivePower(RP_BASE).note).toMatch(/容性|超前|仅适用于感性/);
  });

  it('C-M8 IoT：须提示上报突发峰值 3~10× / 重传 / 下行 ACK', () => {
    const r = iotGateway({ nodes: 500, intervalSec: 60, payloadBytes: 120, overheadBytes: 60, gatewayCapacity: 500, gatewayKbps: 1000 });
    expect(r.note).toMatch(/突发|峰值|3~10/);
  });
});

// ==================================================================
// D. 修复后边界与免责（规格 §1 / §3 / §7 证伪用例）
//    期望值独立推导，覆盖 team-lead 指定的 6 个必测点 + E 段常量守恒。
// ==================================================================

describe('D · 修复后边界与免责', () => {
  it('D1 designBreakTimeMs=null：fire 不显示 0 ms，速查表 fire-equipment 行按 id 精确校验', () => {
    const fire = rcdSelect({ circuitType: 'fire', ratedCurrentA: 16, upstreamMa: 300, upstreamDelayed: 'yes' });
    expect(fire.designBreakTimeMs).toBeNull();               // calc 侧不再返回 0
    expect(fire.note).not.toMatch(/0\s*ms/);
    // team-lead：按行 id 限定，不做全表 0 ms 一刀切（main-incoming 有「500 ms」、
    // trip-time-general 有「20~40 ms」，是「0 ms」的合法子串）
    const feBasis = String(rcdRow('fire-equipment').basis);
    expect(feBasis).toContain('不适用');
    expect(feBasis).not.toMatch(/0 ms 动作/);
    expect(feBasis).not.toMatch(/0\s*ms/);
  });

  it('D2 ik3DesignKa 跨档证伪：显式 c_max=1.0 → 25 kA；默认 1.05 → 35 kA', () => {
    // 独立复算：ICU=[...,20,25,35,...]；关闭 c 时 ik3Design=ik3≈24.056（<25）
    // → 首个 ≥ 值取 25 kA；启用 c_max=1.05 后 ≈25.259（>25）→ 跨档取 35 kA。
    // 该对比直接证伪「选档改按 ik3DesignKa」：跨档确由电压系数引起，而非其它改动。
    const ik3 = 400 / (SQRT3 * 0.0096) / 1000;
    expect(ICU.find((v) => v >= ik3)).toBe(25);
    expect(ICU.find((v) => v >= ik3 * 1.05)).toBe(35);
    const noC = shortCircuit({ ...SC_BASE, voltageFactorCMax: 1.0 });
    const withC = shortCircuit(SC_BASE);
    expect(noC.ik3DesignKa).toBeCloseTo(ik3, 9);
    expect(noC.recommendedIcuKa).toBe(25);            // 跨档确由 c_max 引起
    expect(withC.ik3DesignKa).toBeCloseTo(ik3 * 1.05, 9);
    expect(withC.recommendedIcuKa).toBe(35);
  });

  it('D3 saltBalanceHolds=false 边界：0.0005/N=20 真触发（bRaw<0、M=E+D）；规格举例 0.002/N=4 不触发', () => {
    const qc = 500 * 1.25;
    const w = (qc * TOWER_FLOW_COEF) / 5;                       // 107.5
    const e = (qc * 3600) / (VAPORIZATION_HEAT_KJ_KG * 1000);  // 0.925926
    const d = w * 0.0005;
    const bRaw = e / (20 - 1) - d;
    expect(bRaw).toBeLessThan(0);                               // -0.005017
    const bad = coolingTower({ ...CT_BASE, driftRatio: 0.0005, cycles: 20 });
    expect(bad.saltBalanceHolds).toBe(false);
    expect(bad.blowdownM3h).toBe(0);
    expect(bad.makeupM3h).toBeCloseTo(bad.evapM3h + bad.driftM3h, 10); // M=E+D
    expect(bad.note).toMatch(/无法维持|漂水率过大|浓缩倍数过高/);
    // 规格 §1.2 C3 建议的 driftRatio=0.002, N=4 实测 bRaw=+0.0936>0，不足以触发；
    // p1-calc-engineer 已复核，此处固化该澄清作为取证（不作失败断言）。
    const specCase = coolingTower({ ...CT_BASE, driftRatio: 0.002, cycles: 4 });
    expect(e / 3 - w * 0.002).toBeGreaterThan(0);
    expect(specCase.saltBalanceHolds).toBe(true);
  });

  it('D4 KV_SELECTION_MARGIN=1.25 生效：两组 targetKv 独立复算并守住选档', () => {
    expect(KV_SELECTION_MARGIN).toBe(1.25);
    for (const [Q, dp, rho, kvs, dn] of [
      [10, 100, 1, 16, 40],
      [10, 50, 1.04, 25, 50],
    ] as const) {
      const r = valveKv({ flowM3h: Q, dpKPa: dp, rhoRel: rho, dpTotalKPa: 0 });
      const targetKv = r.kv * KV_SELECTION_MARGIN;
      expect(KVS_SERIES.find((k) => k >= targetKv)).toBe(kvs);
      expect(KV_DN_TABLE.find((row) => row.kvs >= targetKv)?.dn).toBe(dn);
      expect(r.recommendedKvs).toBe(kvs);
      expect(r.recommendedDn).toBe(dn);
    }
  });

  it('D5 cosφ2>0.95 过补偿提示（C9 新增文案）；默认 0.95 锚点数值零变化', () => {
    const base = reactivePower(RP_BASE);
    expect(base.qcKvar).toBeCloseTo(110.647, 3);
    expect(base.circuits).toBe(5);
    expect(base.installedKvar).toBe(125);
    expect(base.overKvar).toBeCloseTo(14.353, 3);
    expect(base.note).not.toMatch(/目标功率因数高于 0\.95/);
    const tan1 = Math.sqrt(1 - 0.75 ** 2) / 0.75;
    const tan2 = Math.sqrt(1 - 0.98 ** 2) / 0.98;
    const hi = reactivePower({ ...RP_BASE, cosPhi2: 0.98 });
    expect(hi.qcKvar).toBeCloseTo(200 * (tan1 - tan2), 9);
    expect(hi.note).toContain('目标功率因数高于 0.95');
    expect(hi.note).toMatch(/过补偿|倒送无功/);
  });

  it('D6 规格 §3 通用免责句：9 个 calc 模块 note 末尾均含同一句', () => {
    const notes: string[] = [
      poeBudget({ camCount: 10, camW: 12, apCount: 4, apW: 15, otherCount: 2, otherW: 7, budgetW: 370, margin: 1.2, standard: 'af' }).note,
      iotGateway({ nodes: 500, intervalSec: 60, payloadBytes: 120, overheadBytes: 60, gatewayCapacity: 500, gatewayKbps: 1000 }).note,
      valveKv({ flowM3h: 10, dpKPa: 100, rhoRel: 1, dpTotalKPa: 200 }).note,
      fanPower({ flowM3h: 10000, totalPa: 500, fanEff: 0.7, transEff: 0.95, motorMargin: 1.2 }).note,
      hydraulicBalance({ segments: '10,50,20,2', nearLoopKPa: 0 }).note,
      coolingTower(CT_BASE).note,
      rcdSelect({ circuitType: 'socket', ratedCurrentA: 16, upstreamMa: 300, upstreamDelayed: 'yes' }).note,
      shortCircuit(SC_BASE).note,
      reactivePower(RP_BASE).note,
    ];
    expect(notes).toHaveLength(9);
    for (const note of notes) expect(note).toContain(GENERAL_DISCLAIMER_TEXT);
  });

  it('D7 E 段常量守恒（规格 §0：一个字符都不动）与 C 补充改名', () => {
    expect(VOLTAGE_FACTOR_C_MAX).toBe(1.05);
    expect(TRANSFORMER_RZ_RATIO).toBe(0.1);      // C 补充：RX → RZ 改名，数值 0.1 不变
    expect(ICU_SERIES_KA).toEqual(ICU);          // 数组数值不变
    expect(KW_PER_RT).toBe(3.517);
    expect(TOWER_FLOW_COEF).toBe(0.86);
    expect(VAPORIZATION_HEAT_KJ_KG).toBe(2430);
    expect(KV_SELECTION_MARGIN).toBe(1.25);      // C6 新增
    expect(WATER_NU).toBe(1.0e-6);
    expect(FAN_POWER_DIVISOR).toBe(3_600_000);
    expect(RCD_GRADING_MIN_RATIO).toBe(3);       // E 段双条件守恒
    expect(POE_PORT_LIMIT_W).toEqual({ af: 12.95, at: 25.5, bt3: 51, bt4: 71.3 });
  });

  // ── C9 运行态出处口径：A 组已按最小补丁替换 reactivePower.ts:214 括号内旧串，
  //    以下 3 条已转正为门禁（原先因源码未改会红而只作注释占位）：
  //    (1) not.toContain('GB/T 50227')  旧口径已清除（负向）
  //    (2) toContain('基础电路关系')    新口径已落地（正向）
  //    (3) toContain('GB 50052')       出处固化（正向，formula-auditor 追加建议）
  //    判据为「口径一致」而非字符串全等：不要求与 JSDoc 第 24-27 行逐字相同、
  //    不复制 JSDoc 整段（避免与第 216-218 行独立 note 重复）。
  it('D8 C9 运行态免责文案（正向固化）：感性/容性适用边界、折减未计、过补偿提示均在 note', () => {
    const base = reactivePower(RP_BASE).note;
    expect(base).toContain('仅适用于感性负载欠补偿场景');
    expect(base).toContain('容性（超前）');
    expect(base).toContain('电容器实际输出容量');
    expect(base).toContain('未计变压器无功损耗、谐波放大与串联电抗器');
    const hi = reactivePower({ ...RP_BASE, cosPhi2: 0.98 }).note;
    expect(hi).toContain('目标功率因数高于 0.95');
    expect(hi).toContain('倒送无功');
  });

  it('D8b C9 运行态出处口径：旧「GB/T 50227 查表系数法」已清除，改为基础电路关系 + GB 50052', () => {
    const note = reactivePower(RP_BASE).note;
    expect(note).not.toContain('GB/T 50227');
    expect(note).toContain('基础电路关系');
    expect(note).toContain('GB 50052');
    expect(note).not.toContain('查表系数法的等价形式');
  });
});
