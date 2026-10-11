/**
 * QA 独立验证（水电类目 D1~D15 / C10 增强）
 * ------------------------------------------------------------------
 * 本文件由 QA 独立编写，**不复用**工程师的测试断言；所有期望值均由 QA 手工推导，
 * 并在注释中给出推导过程。目标是「证伪」：覆盖边界 / 异常路径。
 */
import { describe, expect, it } from 'vitest';

import { calcLoad, parseDeviceList } from '@/lib/calc/waterLoad';
import { powerCurrent } from '@/lib/calc/waterPower';
import { selectBreaker } from '@/lib/calc/waterBreaker';
import { sizeConduit } from '@/lib/calc/waterConduit';
import { emergencyBattery } from '@/lib/calc/waterEmergency';
import { demandFlow } from '@/lib/calc/waterDemand';
import { pipeSize } from '@/lib/calc/waterPipe';
import { hazenWilliams, localLoss, pumpHead, pumpPower } from '@/lib/calc/waterPump';
import { drainSlope } from '@/lib/calc/waterDrain';
import { waterHeater } from '@/lib/calc/waterHeater';
import { groundingResistance } from '@/lib/calc/waterGrounding';
import { lightningProtection } from '@/lib/calc/waterLightning';
import {
  cableVoltageDrop,
  maxLengthForDrop,
  simpleVoltageDrop,
} from '@/lib/calc/cableDrop';
import {
  cableVoltageDrop as oldCableVoltageDrop,
  maxLengthForDrop as oldMaxLengthForDrop,
} from './fixtures/cableDrop.old';
import { ALL_TOOLS, byDomain, getById } from '@/registry';

// ===========================================================================
// D1 · 计算负荷（需要系数法）
// ===========================================================================
describe('D1 waterLoad（独立复算）', () => {
  it('算例1：单类设备 Kd=0.8、cosφ=0.8、2 台',
    // Pc = 10·2·0.8 = 16 kW；tanφ = √(1-0.64)/0.8 = 0.75 ⇒ Qc = 12 kvar
    // Sc = √(16²+12²) = 20 kVA；Ic = 20000/(√3·380) = 30.387 A；avgPf = 16/20 = 0.8
    () => {
      const r = calcLoad({ devices: [{ powerKw: 10, kd: 0.8, pf: 0.8, count: 2 }], voltage: 380 });
      expect(r.installedKw).toBeCloseTo(20, 6);
      expect(r.activeKw).toBeCloseTo(16, 6);
      expect(r.reactiveKvar).toBeCloseTo(12, 6);
      expect(r.apparentKva).toBeCloseTo(20, 6);
      expect(r.currentA).toBeCloseTo(20000 / (Math.sqrt(3) * 380), 6);
      expect(r.avgPf).toBeCloseTo(0.8, 6);
    });

  it('边界：空清单 → 全 0', () => {
    const r = calcLoad({ devices: [] });
    expect(r.installedKw).toBe(0);
    expect(r.activeKw).toBe(0);
    expect(r.apparentKva).toBe(0);
    expect(r.currentA).toBe(0);
    expect(r.avgPf).toBe(0);
  });

  it('异常：cosφ=0 越界 → 按 0.85 兜底（tanφ≈0.619744）', () => {
    const r = calcLoad({ devices: [{ powerKw: 10, kd: 1, pf: 0, count: 1 }] });
    const tan = Math.sqrt(1 - 0.85 * 0.85) / 0.85;
    expect(r.activeKw).toBeCloseTo(10, 6);
    expect(r.reactiveKvar).toBeCloseTo(10 * tan, 6);
    expect(r.avgPf).toBeCloseTo(0.85, 6);
  });

  it('parseDeviceList：多分隔符 / 忽略非法行与短行', () => {
    const devs = parseDeviceList('7.5,0.8,0.85,2\n   \nabc\n2.2 1 0.9\n3，0.5，0.8、4');
    expect(devs).toHaveLength(3);
    expect(devs[0]).toMatchObject({ powerKw: 7.5, kd: 0.8, pf: 0.85, count: 2 });
    expect(devs[1]).toMatchObject({ powerKw: 2.2, kd: 1, pf: 0.9, count: 1 });
    expect(devs[2]).toMatchObject({ powerKw: 3, kd: 0.5, pf: 0.8, count: 4 });
  });
});

// ===========================================================================
// D2 · 单相 / 三相 功率电流换算
// ===========================================================================
describe('D2 waterPower（独立复算）', () => {
  it('算例1：三相 30 kW / 380 V / cosφ0.85 → I=53.624A', () => {
    const r = powerCurrent({ mode: 'powerToCurrent', phase: 'three', voltage: 380, cosPhi: 0.85, powerKw: 30 });
    expect(r.currentA).toBeCloseTo(30000 / (Math.sqrt(3) * 380 * 0.85), 6);
    expect(r.apparentKva).toBeCloseTo(30 / 0.85, 6);
    expect(r.powerFactor).toBeCloseTo(0.85, 6);
  });

  it('算例2：单相 10A / 220V / cosφ0.85 → P=1.87kW', () => {
    const r = powerCurrent({ mode: 'currentToPower', phase: 'single', currentA: 10, cosPhi: 0.85 });
    expect(r.powerKw).toBeCloseTo(1.87, 6);
    expect(r.apparentKva).toBeCloseTo(2.2, 6);
  });

  it('边界：功率 0 → 电流 0', () => {
    const r = powerCurrent({ mode: 'powerToCurrent', phase: 'three', powerKw: 0 });
    expect(r.currentA).toBe(0);
    expect(r.apparentKva).toBe(0);
  });

  it('边界：cosφ=1 三相 30kW → I=45.58A', () => {
    const r = powerCurrent({ mode: 'powerToCurrent', phase: 'three', voltage: 380, cosPhi: 1, powerKw: 30 });
    expect(r.currentA).toBeCloseTo(30000 / (Math.sqrt(3) * 380), 6);
  });
});

// ===========================================================================
// D4 · 断路器选型与导线配合
// ===========================================================================
describe('D4 waterBreaker（独立复算）', () => {
  it('算例1：Ib=25、Iz=32、电机 → In=25、D 曲线、合规', () => {
    const r = selectBreaker({ ib: 25, iz: 32, loadType: 'motor' });
    expect(r.recommendedIn).toBe(25);
    expect(r.curve).toBe('D');
    expect(r.i2).toBeCloseTo(36.25, 6);
    expect(r.rangeOk).toBe(true);
    expect(r.thermalOk).toBe(true);
    expect(r.compliant).toBe(true);
  });

  it('算例2：Ib=25、Iz=20 → 区间不满足且 I₂>1.45Iz，不合规', () => {
    const r = selectBreaker({ ib: 25, iz: 20, loadType: 'general' });
    expect(r.recommendedIn).toBe(25);
    expect(r.curve).toBe('C');
    expect(r.rangeOk).toBe(false); // 25 <= 20 假
    expect(r.thermalOk).toBe(false); // 36.25 <= 29 假
    expect(r.compliant).toBe(false);
  });

  it('边界：Ib=500 超出常用档 → In=null，不合规', () => {
    const r = selectBreaker({ ib: 500, iz: 600 });
    expect(r.recommendedIn).toBeNull();
    expect(r.i2).toBe(0);
    expect(r.rangeOk).toBe(false);
    expect(r.compliant).toBe(false);
  });

  it('边界：Ib=0 → In=6（最小档）合规', () => {
    const r = selectBreaker({ ib: 0, iz: 16 });
    expect(r.recommendedIn).toBe(6);
    expect(r.compliant).toBe(true);
  });
});

// ===========================================================================
// D5 · 穿线管管径选择
// ===========================================================================
describe('D5 waterConduit（独立复算）', () => {
  it('算例1：2.5mm²×3 根 → allowance=0.4，推荐 16mm，填充率≈18.75%', () => {
    const r = sizeConduit({ section: 2.5, count: 3 });
    expect(r.wireOd).toBeCloseTo(3.2, 6);
    expect(r.allowance).toBe(0.4);
    const area = 3 * Math.PI * 1.6 ** 2;
    expect(r.bundleDia).toBeCloseTo(Math.sqrt(3) * 3.2, 6);
    expect(r.recommendedOd).toBe(16);
    expect(r.fillRate).toBeCloseTo((area / (Math.PI * 6.4 ** 2)) * 100, 3);
    expect(r.compliant).toBe(true);
  });

  it('算例2：2 根 → allowance=0.6', () => {
    const r = sizeConduit({ section: 2.5, count: 2 });
    expect(r.allowance).toBe(0.6);
    expect(r.compliant).toBe(true);
  });

  it('边界：95mm²×10 根 → 所需内径 75mm，无标准管，不合规', () => {
    const r = sizeConduit({ section: 95, count: 10 });
    expect(r.wireOd).toBeCloseTo(15, 6);
    // idFromFill = √((10·π·7.5²/0.4)·4/π) = √5625 = 75
    expect(r.minConduitId).toBeCloseTo(75, 3);
    expect(r.recommendedOd).toBeNull();
    expect(r.fillOk).toBe(false);
    expect(r.compliant).toBe(false);
  });

  it('边界：count=0 → 视作 1 根', () => {
    const r = sizeConduit({ section: 2.5, count: 0 });
    expect(r.allowance).toBe(0.6);
    expect(r.compliant).toBe(true);
  });
});

// ===========================================================================
// D6 · 应急照明时长与电池容量
// ===========================================================================
describe('D6 waterEmergency（独立复算）', () => {
  it('算例1：40W·1.5h → C=60/(24·0.85·0.8)=3.676Ah', () => {
    const r = emergencyBattery({ lampW: 10, count: 4, durationMin: 90 });
    expect(r.totalPowerW).toBe(40);
    expect(r.durationH).toBeCloseTo(1.5, 6);
    expect(r.capacityAh).toBeCloseTo(60 / 16.32, 6);
    expect(r.energyWh).toBeCloseTo(60, 6);
    expect(r.meets30).toBe(true);
    expect(r.meets90).toBe(true);
  });

  it('边界：30 min → meets30 真、meets90 假', () => {
    const r = emergencyBattery({ lampW: 20, count: 2, durationMin: 30 });
    expect(r.durationH).toBeCloseTo(0.5, 6);
    expect(r.capacityAh).toBeCloseTo(20 / 16.32, 6);
    expect(r.meets30).toBe(true);
    expect(r.meets90).toBe(false);
  });

  it('异常：效率 2 → 截断为 1', () => {
    const r = emergencyBattery({ lampW: 10, count: 1, durationMin: 60, efficiency: 2 });
    expect(r.capacityAh).toBeCloseTo(10 / (24 * 1 * 0.8), 6);
  });

  it('边界：功率 0 → 容量 0', () => {
    const r = emergencyBattery({ lampW: 0, count: 5, durationMin: 90 });
    expect(r.capacityAh).toBe(0);
    expect(r.energyWh).toBe(0);
  });
});

// ===========================================================================
// D7 · 给水设计秒流量（当量法）
// ===========================================================================
describe('D7 waterDemand（独立复算）', () => {
  it('算例1：Ng=100、宾馆 α=2.5 → 5 L/s', () => {
    const r = demandFlow({ ng: 100, buildingType: 'hotel' });
    expect(r.alpha).toBe(2.5);
    expect(r.flowLps).toBeCloseTo(5, 6);
    expect(r.flowM3h).toBeCloseTo(18, 6);
  });

  it('边界：Ng=0 → 0', () => {
    const r = demandFlow({ ng: 0 });
    expect(r.flowLps).toBe(0);
  });

  it('算例2：显式 α=1.0 覆盖预设', () => {
    const r = demandFlow({ ng: 100, buildingType: 'hotel', alpha: 1 });
    expect(r.alpha).toBe(1);
    expect(r.flowLps).toBeCloseTo(2, 6);
  });

  it('异常：α=0 → 回落到预设（住宅 1.5）', () => {
    const r = demandFlow({ ng: 100, buildingType: 'residential', alpha: 0 });
    expect(r.alpha).toBe(1.5);
    expect(r.flowLps).toBeCloseTo(3, 6);
  });
});

// ===========================================================================
// D8 · 管径选择（按流量与流速）
// ===========================================================================
describe('D8 waterPipe（独立复算）', () => {
  it('算例1：5 L/s、v=1 → d=79.79mm → 选 DN80', () => {
    const r = pipeSize({ flow: 5, flowUnit: 'L/s', velocity: 1 });
    expect(r.flowM3s).toBeCloseTo(0.005, 9);
    expect(r.computedDiaMm).toBeCloseTo(Math.sqrt(0.02 / Math.PI) * 1000, 3);
    expect(r.recommendedDn).toBe(80);
    const v = 0.005 / (Math.PI * (80.5 / 1000 / 2) ** 2);
    expect(r.actualVelocity).toBeCloseTo(v, 6);
  });

  it('边界：流量 0 → 就近选最小 DN15', () => {
    const r = pipeSize({ flow: 0 });
    expect(r.computedDiaMm).toBe(0);
    expect(r.recommendedDn).toBe(15);
    expect(r.actualVelocity).toBe(0);
  });

  it('等价单位：18 m³/h ≡ 5 L/s', () => {
    const a = pipeSize({ flow: 18, flowUnit: 'm3/h', velocity: 1 });
    const b = pipeSize({ flow: 5, flowUnit: 'L/s', velocity: 1 });
    expect(a.computedDiaMm).toBeCloseTo(b.computedDiaMm, 9);
    expect(a.recommendedDn).toBe(b.recommendedDn);
  });

  it('边界：超大流量 1000 L/s → 超出常用 DN，返回 null', () => {
    const r = pipeSize({ flow: 1000, flowUnit: 'L/s', velocity: 1 });
    expect(r.computedDiaMm).toBeCloseTo(Math.sqrt(4 / Math.PI) * 1000, 1);
    expect(r.recommendedDn).toBeNull();
  });
});

// ===========================================================================
// D9 · 给水扬程
// ===========================================================================
describe('D9 waterPumpHead（独立复算）', () => {
  it('算例1：20+1+2+3 = 26 m', () => {
    const r = pumpHead({ staticHead: 20, pipeLength: 50, frictionPerMeter: 0.02, localLoss: 2, freeHead: 3 });
    expect(r.frictionLoss).toBeCloseTo(1, 6);
    expect(r.totalHead).toBeCloseTo(26, 6);
  });

  it('边界：全 0 → 0', () => {
    const r = pumpHead({ staticHead: 0, pipeLength: 0, frictionPerMeter: 0, localLoss: 0, freeHead: 0 });
    expect(r.totalHead).toBe(0);
  });

  it('异常：负值 → 截断为 0', () => {
    const r = pumpHead({ staticHead: -5, pipeLength: -10, frictionPerMeter: -1, localLoss: -2, freeHead: -3 });
    expect(r.totalHead).toBe(0);
  });
});

// ===========================================================================
// 海澄-威廉 / 局部损失
// ===========================================================================
describe('waterPump 沿程/局部损失（独立复算）', () => {
  it('算例：Q=10m³/h、d=50mm、L=100m、C=140 → hf≈4.49m', () => {
    const hf = hazenWilliams(10, 50, 100, 140);
    const q = 10 / 3600;
    const manual = (10.67 * 100 * q ** 1.852) / (140 ** 1.852 * 0.05 ** 4.87);
    expect(hf).toBeCloseTo(manual, 9);
    expect(hf).toBeCloseTo(4.49, 1);
  });

  it('边界：管径 0 / 流量 0 / 长度 0 → 均返回 0', () => {
    expect(hazenWilliams(10, 0, 100, 140)).toBe(0);
    expect(hazenWilliams(0, 50, 100, 140)).toBe(0);
    expect(hazenWilliams(10, 50, 0, 140)).toBe(0);
  });

  it('异常：C=0 → 按 140 兜底', () => {
    expect(hazenWilliams(10, 50, 100, 0)).toBeCloseTo(hazenWilliams(10, 50, 100, 140), 9);
  });

  it('局部损失：Σξ=10、v=2 → 10·4/(2·9.81)=2.0387m', () => {
    expect(localLoss(10, 2)).toBeCloseTo((10 * 4) / (2 * 9.81), 9);
    expect(localLoss(10, 0)).toBe(0);
  });
});

// ===========================================================================
// D10 · 水泵轴功率
// ===========================================================================
describe('D10 waterPumpPower（独立复算）', () => {
  it('算例1：Q=36、H=30、η=0.7、裕量1.15 → 轴4.204kW、配套5.5kW', () => {
    const r = pumpPower({ flow: 36, head: 30 });
    expect(r.shaftPowerKw).toBeCloseTo(1080 / (367 * 0.7), 6);
    expect(r.motorPowerKw).toBeCloseTo((1080 / (367 * 0.7)) * 1.15, 6);
    expect(r.standardMotorKw).toBe(5.5);
  });

  it('算例2：η=1 → 轴2.943kW、就近 4kW', () => {
    const r = pumpPower({ flow: 36, head: 30, efficiency: 1 });
    expect(r.shaftPowerKw).toBeCloseTo(1080 / 367, 6);
    expect(r.standardMotorKw).toBe(4);
  });

  it('边界：Q=0 → 轴 0、就近最小 0.55kW', () => {
    const r = pumpPower({ flow: 0, head: 30 });
    expect(r.shaftPowerKw).toBe(0);
    expect(r.standardMotorKw).toBe(0.55);
  });

  it('边界：超大参数 → 超出电机档 → null', () => {
    const r = pumpPower({ flow: 10000, head: 1000 });
    expect(r.standardMotorKw).toBeNull();
  });
});

// ===========================================================================
// D11 · 排水管径与坡度
// ===========================================================================
describe('D11 waterDrain（独立复算）', () => {
  it('算例1：DN100、坡度 0.02 → 达标、落差 200mm', () => {
    const r = drainSlope({ dn: 100, actualSlope: 0.02, length: 10 });
    expect(r.spec?.dn).toBe(100);
    expect(r.atLeastMin).toBe(true);
    expect(r.meetsStandard).toBe(true);
    expect(r.perMille).toBeCloseTo(20, 6);
    expect(r.dropMm).toBeCloseTo(200, 6);
    expect(r.compliant).toBe(true);
  });

  it('算例2：DN100、坡度 0.01 < 最小 0.012 → 不合规', () => {
    const r = drainSlope({ dn: 100, actualSlope: 0.01, length: 10 });
    expect(r.atLeastMin).toBe(false);
    expect(r.compliant).toBe(false);
  });

  it('边界：DN999 未在表中 → spec=null，不合规', () => {
    const r = drainSlope({ dn: 999, actualSlope: 0.02, length: 10 });
    expect(r.spec).toBeNull();
    expect(r.atLeastMin).toBe(false);
    expect(r.compliant).toBe(false);
  });

  it('边界：DN200 恰好等于最小坡度 0.005 → 合规', () => {
    const r = drainSlope({ dn: 200, actualSlope: 0.005 });
    expect(r.atLeastMin).toBe(true);
    expect(r.compliant).toBe(true);
  });
});

// ===========================================================================
// D12 · 热水加热功率
// ===========================================================================
describe('D12 waterHeater（独立复算）', () => {
  it('算例1：100L、ΔT=40、1h、η0.9 → 5.169kW', () => {
    const r = waterHeater({ volumeL: 100, coldTemp: 15, hotTemp: 55, heatHours: 1 });
    expect(r.deltaT).toBe(40);
    expect(r.powerKw).toBeCloseTo((1.163 * 100 * 40) / (1 * 1000 * 0.9), 6);
    expect(r.energyKwh).toBeCloseTo(r.powerKw, 6);
    expect(r.volumePerHour).toBeCloseTo(100, 6);
    expect(r.heatPerHourMJ).toBeCloseTo((4.187 * 100 * 40) / 1000, 6);
  });

  it('边界：出水<进水 → ΔT=0 → 功率 0', () => {
    const r = waterHeater({ volumeL: 100, coldTemp: 55, hotTemp: 15, heatHours: 1 });
    expect(r.deltaT).toBe(0);
    expect(r.powerKw).toBe(0);
  });

  it('边界：加热时间 0 → 按 1h', () => {
    const r = waterHeater({ volumeL: 100, coldTemp: 15, hotTemp: 55, heatHours: 0 });
    expect(r.volumePerHour).toBeCloseTo(100, 6);
    expect(r.powerKw).toBeCloseTo((1.163 * 100 * 40) / 900, 6);
  });

  it('异常：η=0 → 按 0.9 兜底', () => {
    const r = waterHeater({ volumeL: 100, coldTemp: 15, hotTemp: 55, heatHours: 1, efficiency: 0 });
    expect(r.powerKw).toBeCloseTo((1.163 * 100 * 40) / 900, 6);
  });
});

// ===========================================================================
// D13 · 接地电阻
// ===========================================================================
describe('D13 waterGrounding（独立复算）', () => {
  it('算例1：ρ=100、L=2.5、d=0.05、目标4Ω → R₁≈33.73Ω、需12根', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, diameter: 0.05, targetR: 4 });
    const r1 = (100 / (2 * Math.PI * 2.5)) * Math.log((4 * 2.5) / 0.05);
    expect(r.singleR).toBeCloseTo(r1, 6);
    expect(r.neededRods).toBe(Math.ceil(r1 / (4 * 0.75)));
    expect(r.achievedR).toBeCloseTo(r1 / (r.neededRods * 0.75), 6);
    expect(r.compliant).toBe(true);
  });

  it('算例2：仅 3 根 → 不达标', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, targetR: 4, rods: 3 });
    expect(r.plannedRods).toBe(3);
    expect(r.achievedR).toBeCloseTo(r.singleR / (3 * 0.75), 6);
    expect(r.compliant).toBe(false);
  });

  it('边界：目标 100Ω → 1 根即达标', () => {
    const r = groundingResistance({ rho: 100, length: 2.5, targetR: 100 });
    expect(r.neededRods).toBe(1);
    expect(r.compliant).toBe(true);
  });
});

// ===========================================================================
// D15 · 防雷保护范围（滚球法）
// ===========================================================================
describe('D15 waterLightning（独立复算）', () => {
  it('算例1：III 类、h=30 → hr=60、地面半径 √2700≈51.96m', () => {
    const r = lightningProtection({ rodHeight: 30, protectionClass: 'III' });
    expect(r.rollingSphere).toBe(60);
    expect(r.maxSpacing).toBe(20);
    expect(r.effectiveHeight).toBe(30);
    expect(r.groundRadius).toBeCloseTo(Math.sqrt(2700), 6);
    expect(r.protectedRadius).toBeCloseTo(Math.sqrt(2700), 6);
  });

  it('边界：I 类、h=40 超滚球半径 → 按 hr=30 处理，半径 30m', () => {
    const r = lightningProtection({ rodHeight: 40, protectionClass: 'I' });
    expect(r.rollingSphere).toBe(30);
    expect(r.effectiveHeight).toBe(30);
    expect(r.groundRadius).toBeCloseTo(Math.sqrt(30 * (60 - 30)), 6);
  });

  it('边界：被保护高度=杆高 → 半径 0', () => {
    const r = lightningProtection({ rodHeight: 30, protectedHeight: 30, protectionClass: 'III' });
    expect(r.protectedRadius).toBeCloseTo(0, 6);
  });

  it('算例2：周长 100m、III 类 → 引下线 5 根', () => {
    const r = lightningProtection({ rodHeight: 20, protectionClass: 'III', perimeter: 100 });
    expect(r.downLeaders).toBe(5);
  });

  it('边界：周长 10m → 至少 2 根', () => {
    const r = lightningProtection({ rodHeight: 20, protectionClass: 'III', perimeter: 10 });
    expect(r.downLeaders).toBe(2);
  });
});

// ===========================================================================
// C10 增强：新旧版逐字段一致性（向后兼容）
// ===========================================================================
describe('C10 向后兼容（旧版 fixtures/cableDrop.old 对照）', () => {
  const cases = [
    // 三相铜
    { current: 32, length: 100, section: 6, material: 'copper' as const, phase: 'three' as const, voltage: 380 },
    // 单相铜（照明）
    { current: 16, length: 30, section: 2.5, material: 'copper' as const, phase: 'single' as const, voltage: 220, lighting: true },
    // 三相铝
    { current: 50, length: 80, section: 10, material: 'aluminum' as const, phase: 'three' as const, voltage: 380 },
    // 单相铝
    { current: 20, length: 45, section: 4, material: 'aluminum' as const, phase: 'single' as const, voltage: 220 },
    // 大截面
    { current: 100, length: 200, section: 35, material: 'copper' as const, phase: 'three' as const, voltage: 400 },
    // 边界：截面 0 → 早退分支
    { current: 10, length: 10, section: 0, material: 'copper' as const, phase: 'three' as const, voltage: 380 },
    // 边界：无电压 → 早退分支
    { current: 10, length: 10, section: 4, material: 'copper' as const, phase: 'three' as const, voltage: 0 },
  ];

  it('cableVoltageDrop 逐字段一致', () => {
    for (const c of cases) {
      const nw = cableVoltageDrop(c);
      const old = oldCableVoltageDrop(c);
      expect(nw).toEqual(old);
    }
  });

  it('maxLengthForDrop 一致（含自定义目标）', () => {
    for (const c of cases) {
      expect(maxLengthForDrop(c, 5)).toBe(oldMaxLengthForDrop(c, 5));
      expect(maxLengthForDrop(c, 3)).toBe(oldMaxLengthForDrop(c, 3));
    }
  });

  it('简单系数法：ΔU%=P·L/(C·S)，三相铜 C=76.5', () => {
    // P=10kW、L=100m、S=6 ⇒ 10·100/(76.5·6) = 1000/459 = 2.1786%
    const r = simpleVoltageDrop({ powerKw: 10, length: 100, section: 6, phase: 'three', material: 'copper' });
    expect(r.coefficient).toBeCloseTo(76.5, 6);
    expect(r.percent).toBeCloseTo((10 * 100) / (76.5 * 6), 6);
    expect(r.limit).toBe(5);
  });

  it('简单系数法边界：S=0 → percent 0 且不合规', () => {
    const r = simpleVoltageDrop({ powerKw: 10, length: 100, section: 0 });
    expect(r.percent).toBe(0);
    expect(r.compliant).toBe(false);
  });
});

// ===========================================================================
// 结构一致性：D 组 15 个工具接入注册表
// ===========================================================================
describe('注册表结构（水电类目）', () => {
  it('水领域恰好 15 个工具，编号 D1~D15', () => {
    const w = byDomain('water');
    expect(w).toHaveLength(15);
    const codes = [...w].sort((a, b) => a.order - b.order).map((t) => t.code);
    expect(codes).toEqual(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']);
  });

  it('全量 58 个工具（43 + 15）', () => {
    expect(ALL_TOOLS).toHaveLength(58);
  });

  it('D3 电压降复用 C10：calcId=cableDrop', () => {
    const t = getById('water.voltageDrop');
    expect(t?.calcId).toBe('cableDrop');
    expect(t?.Component).toBeTruthy();
  });

  it('D14 接地限值速查为 quickref 且绑定 water.groundingLimits', () => {
    const t = getById('water.groundingRef');
    expect(t?.kind).toBe('quickref');
    expect(t?.quickRefId).toBe('water.groundingLimits');
  });

  it('工具 id 全局唯一', () => {
    const ids = ALL_TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
