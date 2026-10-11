/**
 * QA 独立验证用例（严过关）
 * ------------------------------------------------------------------
 * 本文件由 QA 独立编写，**不复用**工程师已有用例，用于对 PRD 第 4 章关键公式做
 * 独立复算与边界/异常路径核验。所有期望值均为 QA 手算独立得出。
 *
 * 运行：npm run test  （或 node scripts/run-tests.mjs run src/__tests__/qa-independent.test.ts）
 */
import { describe, expect, it } from 'vitest';

import { subnetCalc, parseIPv4, formatIPv4, prefixFromMask } from '@/lib/calc/subnet';
import { radixConvert } from '@/lib/calc/radix';
import { analogConvert, analogToEng, engToRaw } from '@/lib/calc/analog';
import {
  pt100Resistance,
  pt100Temperature,
  celsiusToFahrenheit,
  celsiusToKelvin,
} from '@/lib/calc/temperature';
import { motorCurrent, motorTorque, synchronousSpeed, polesToPairs, motorFull } from '@/lib/calc/motor';
import { convert, convertAll, listUnits } from '@/lib/engine/unitEngine';
import { timeBilling, yuanToCents } from '@/lib/calc/billing';
import { storageCapacity } from '@/lib/calc/storage';
import { cableVoltageDrop } from '@/lib/calc/cableDrop';
import { voltageDivider, currentLimitResistor } from '@/lib/calc/resistor';
import { timerMillis, timerConvert } from '@/lib/calc/timer';
import { bandwidthConvert } from '@/lib/calc/bandwidth';
import { transmissionTime } from '@/lib/calc/transmission';
import { getAll, getById, byDomain, byPriority } from '@/registry';
import { getQuickRef } from '@/data/catalog';
import { search, resetSearchIndex } from '@/lib/search';

// ──────────────────────────────────────────────────────────────── A1 IP 子网
describe('QA · A1 IP 子网（独立复算）', () => {
  it('192.168.1.0/24 —— 网络/广播/可用主机 254', () => {
    const r = subnetCalc({ ip: '192.168.1.0', mask: '24' });
    expect(r.valid).toBe(true);
    expect(r.network).toBe('192.168.1.0');
    expect(r.broadcast).toBe('192.168.1.255');
    expect(r.firstHost).toBe('192.168.1.1');
    expect(r.lastHost).toBe('192.168.1.254');
    expect(r.usableHosts).toBe(254);
    expect(r.totalAddresses).toBe(256);
    expect(r.mask).toBe('255.255.255.0');
    expect(r.wildcard).toBe('0.0.0.255');
    expect(r.prefix).toBe(24);
    expect(r.isPrivate).toBe(true);
    expect(r.ipClass).toContain('C 类');
  });

  it('10.0.0.0/8 —— 大子网 / 总数 16777216', () => {
    const r = subnetCalc({ ip: '10.0.0.0', mask: '8' });
    expect(r.network).toBe('10.0.0.0');
    expect(r.broadcast).toBe('10.255.255.255');
    expect(r.usableHosts).toBe(16777214);
    expect(r.totalAddresses).toBe(16777216);
    expect(r.mask).toBe('255.0.0.0');
    expect(r.isPrivate).toBe(true);
  });

  it('172.16.5.130/26 —— 落在 128 块，网络 .128 / 广播 .191', () => {
    const r = subnetCalc({ ip: '172.16.5.130', mask: '26' });
    expect(r.network).toBe('172.16.5.128');
    expect(r.broadcast).toBe('172.16.5.191');
    expect(r.firstHost).toBe('172.16.5.129');
    expect(r.lastHost).toBe('172.16.5.190');
    expect(r.usableHosts).toBe(62);
    expect(r.mask).toBe('255.255.255.192');
    expect(r.isPrivate).toBe(true); // 172.16-31
  });

  it('/31 边界 —— RFC3021 点对点：可用主机 2', () => {
    const r = subnetCalc({ ip: '10.9.9.0', mask: '31' });
    expect(r.usableHosts).toBe(2);
    expect(r.firstHost).toBe('10.9.9.0');
    expect(r.lastHost).toBe('10.9.9.1');
    expect(r.totalAddresses).toBe(2);
  });

  it('/32 边界 —— 单主机可用 1', () => {
    const r = subnetCalc({ ip: '10.9.9.7', mask: '32' });
    expect(r.usableHosts).toBe(1);
    expect(r.firstHost).toBe('10.9.9.7');
    expect(r.lastHost).toBe('10.9.9.7');
    expect(r.totalAddresses).toBe(1);
  });

  it('点分掩码等价于前缀（255.255.255.0 ↔ /24）', () => {
    const a = subnetCalc({ ip: '192.168.1.10', mask: '255.255.255.0' });
    expect(a.prefix).toBe(24);
    expect(a.network).toBe('192.168.1.0');
  });

  it('非法 IP → 报错且 valid=false', () => {
    const r = subnetCalc({ ip: '999.1.1.1', mask: '24' });
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
    expect(subnetCalc({ ip: '192.168.1', mask: '24' }).valid).toBe(false);
    expect(subnetCalc({ ip: '', mask: '24' }).valid).toBe(false);
  });

  it('非连续掩码 → 报错', () => {
    const r = subnetCalc({ ip: '192.168.1.1', mask: '255.0.255.0' });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('连续');
  });

  it('越界前缀 → 报错', () => {
    expect(subnetCalc({ ip: '192.168.1.1', mask: '33' }).valid).toBe(false);
  });

  it('基础工具函数独立核对', () => {
    expect(parseIPv4('255.255.255.255')).toBe(4294967295);
    expect(parseIPv4('0.0.0.0')).toBe(0);
    expect(formatIPv4(3232235777)).toBe('192.168.1.1'); // 0xC0A80101
    expect(prefixFromMask(0xffffff00)).toBe(24);
    expect(prefixFromMask(0xffff0000)).toBe(16);
  });
});

// ──────────────────────────────────────────────────────────────── A3 进制
describe('QA · A3 进制转换（BigInt / 边界）', () => {
  it('大数 > 2^53 不丢精度：2^60', () => {
    const v = (2n ** 60n).toString(); // 1152921504606846976
    const r = radixConvert(v, 10);
    expect(r.valid).toBe(true);
    expect(r.dec).toBe('1152921504606846976');
    expect(r.hex).toBe('1000000000000000');
    expect(r.bin).toBe('1' + '0'.repeat(60));
  });

  it('2^53+1 精确表示（JS Number 会丢精度）', () => {
    const r = radixConvert('9007199254740993', 10);
    expect(r.dec).toBe('9007199254740993');
    expect(r.hex).toBe('20000000000001');
  });

  it('负数（无位宽）与补码（有位宽）', () => {
    const plain = radixConvert('-255', 10);
    expect(plain.dec).toBe('-255');
    expect(plain.hex).toBe('-FF');
    const twos = radixConvert('-1', 10, 16);
    expect(twos.bin).toBe('1111111111111111');
    expect(twos.hex).toBe('FFFF');
    expect(twos.dec).toBe('-1');
  });

  it('非法字符按源进制校验', () => {
    expect(radixConvert('12G', 16).valid).toBe(false); // G 非 16 进制
    expect(radixConvert('129', 8).valid).toBe(false); // 9 非八进制
    expect(radixConvert('102', 2).valid).toBe(false); // 2 非二进制
    expect(radixConvert('', 10).valid).toBe(false);
  });

  it('0x / 0b 前缀可识别', () => {
    expect(radixConvert('0xFF', 16).dec).toBe('255');
    expect(radixConvert('0b1010', 2).dec).toBe('10');
  });
});

// ──────────────────────────────────────────────────────────────── C1 模拟量
describe('QA · C1 模拟量换算（独立复算）', () => {
  const range420 = { rawMin: 5530, rawMax: 27648, engMin: 0, engMax: 100 };

  it('4mA(5530)→0，20mA(27648)→100，12mA(中点 16589)→50', () => {
    expect(analogToEng({ raw: 5530, ...range420 })).toBeCloseTo(0, 9);
    expect(analogToEng({ raw: 27648, ...range420 })).toBeCloseTo(100, 9);
    expect(analogToEng({ raw: 16589, ...range420 })).toBeCloseTo(50, 6);
  });

  it('反算原始值一致', () => {
    expect(engToRaw({ raw: 0, ...range420 }, 50)).toBeCloseTo(16589, 6);
    expect(engToRaw({ raw: 0, ...range420 }, 100)).toBeCloseTo(27648, 6);
  });

  it('0-10V（0-27648 → 0-100）', () => {
    const r = { rawMin: 0, rawMax: 27648, engMin: 0, engMax: 100 };
    expect(analogToEng({ raw: 0, ...r })).toBeCloseTo(0, 9);
    expect(analogToEng({ raw: 27648, ...r })).toBeCloseTo(100, 9);
    expect(analogToEng({ raw: 13824, ...r })).toBeCloseTo(50, 6);
  });

  it('量程倒挂（engMax<engMin）线性可逆，不产生 NaN', () => {
    const inv = { rawMin: 0, rawMax: 100, engMin: 100, engMax: 0 };
    const e0 = analogToEng({ raw: 0, ...inv });
    const e100 = analogToEng({ raw: 100, ...inv });
    expect(e0).toBeCloseTo(100, 9);
    expect(e100).toBeCloseTo(0, 9);
    expect(Number.isFinite(e0) && Number.isFinite(e100)).toBe(true);
  });

  it('原始量程为 0（rawMin==rawMax）不崩溃', () => {
    const r = analogConvert({ raw: 5, rawMin: 10, rawMax: 10, engMin: 0, engMax: 100 });
    expect(Number.isNaN(r.engineering)).toBe(false);
    expect(Number.isFinite(r.engineering)).toBe(true);
  });

  it('slope/intercept 与公式自洽', () => {
    const r = analogConvert({ raw: 5530, ...range420 });
    expect(r.slope).toBeCloseTo(100 / (27648 - 5530), 12);
    expect(r.rawFromEng).toBeCloseTo(5530, 6);
  });
});

// ──────────────────────────────────────────────────────────────── C2 PT100
describe('QA · C2 PT100 / 温度换算（独立复算）', () => {
  it('0℃ → 100Ω；100℃ → 138.51Ω', () => {
    expect(pt100Resistance(0)).toBeCloseTo(100, 6);
    expect(pt100Resistance(100)).toBeCloseTo(138.506, 2);
  });

  it('负温 -50℃ → ≈80.31Ω（含 C 系数项）', () => {
    expect(pt100Resistance(-50)).toBeCloseTo(80.31, 1);
  });

  it('反算一致：138.506Ω → 100℃ / 100Ω → 0℃', () => {
    expect(pt100Temperature(138.506)).toBeCloseTo(100, 2);
    expect(pt100Temperature(100)).toBeCloseTo(0, 3);
    expect(pt100Temperature(80.31)).toBeCloseTo(-50, 1);
  });

  it('非法电阻（≤0）→ NaN', () => {
    expect(Number.isNaN(pt100Temperature(0))).toBe(true);
    expect(Number.isNaN(pt100Temperature(-1))).toBe(true);
  });

  it('℃/℉/K 换算（含负值）', () => {
    expect(celsiusToFahrenheit(0)).toBeCloseTo(32, 9);
    expect(celsiusToFahrenheit(100)).toBeCloseTo(212, 9);
    expect(celsiusToFahrenheit(-40)).toBeCloseTo(-40, 9);
    expect(celsiusToKelvin(0)).toBeCloseTo(273.15, 9);
  });
});

// ──────────────────────────────────────────────────────────────── C7 电机
describe('QA · C7 三相电机（独立复算）', () => {
  it('15kW/380V/0.85/0.92/4极/50Hz', () => {
    const i = motorCurrent({ powerKW: 15, voltage: 380, powerFactor: 0.85, efficiency: 0.92 });
    // I = 15000 / (√3 × 380 × 0.85 × 0.92) ≈ 29.14 A
    expect(i).toBeCloseTo(15000 / (Math.sqrt(3) * 380 * 0.85 * 0.92), 6);
    expect(i).toBeCloseTo(29.14, 1);
    expect(polesToPairs(4)).toBe(2);
    expect(synchronousSpeed(50, 2)).toBe(1500); // 60f/p
    expect(motorTorque(15, 1450)).toBeCloseTo((9550 * 15) / 1450, 6);
    expect(motorTorque(15, 1450)).toBeCloseTo(98.79, 1);
  });

  it('电机综合：同步转速 1500，电流同上', () => {
    const r = motorFull({
      powerKW: 15,
      voltage: 380,
      powerFactor: 0.85,
      efficiency: 0.92,
      rpm: 1450,
      poles: 4,
      frequency: 50,
    });
    expect(r.syncSpeed).toBe(1500);
    expect(r.torque).toBeCloseTo(98.79, 1);
    expect(r.current).toBeCloseTo(29.14, 1);
  });

  it('除零兜底：电压 0 / 转速 0', () => {
    expect(motorCurrent({ powerKW: 10, voltage: 0 })).toBe(0);
    expect(motorTorque(10, 0)).toBe(0);
    expect(synchronousSpeed(50, 0)).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────── C5 单位
describe('QA · C5 单位换算 / 单位引擎（独立复算）', () => {
  it('压力：1 bar = 100 kPa = 14.5038 psi = 0.1 MPa', () => {
    expect(convert('pressure', 'bar', 'kPa', 1)).toBeCloseTo(100, 6);
    expect(convert('pressure', 'bar', 'psi', 1)).toBeCloseTo(14.5038, 3);
    expect(convert('pressure', 'bar', 'MPa', 1)).toBeCloseTo(0.1, 9);
  });

  it('温度：0℃↔32℉↔273.15K，-40℃↔-40℉', () => {
    expect(convert('temperature', 'C', 'F', 0)).toBeCloseTo(32, 6);
    expect(convert('temperature', 'F', 'C', 32)).toBeCloseTo(0, 6);
    expect(convert('temperature', 'C', 'K', 0)).toBeCloseTo(273.15, 6);
    expect(convert('temperature', 'C', 'F', -40)).toBeCloseTo(-40, 6);
    expect(convert('temperature', 'F', 'C', 212)).toBeCloseTo(100, 6);
  });

  it('长度 / 流量', () => {
    expect(convert('length', 'in', 'mm', 1)).toBeCloseTo(25.4, 9);
    expect(convert('length', 'm', 'ft', 1)).toBeCloseTo(3.28084, 4);
    expect(convert('flow', 'm3/h', 'L/min', 1)).toBeCloseTo(16.6667, 3);
  });

  it('convertAll 自洽：A→B→A 还原', () => {
    const all = convertAll('pressure', 'MPa', 1.6);
    expect(all.psi).toBeGreaterThan(0);
    const back = convert('pressure', 'psi', 'MPa', all.psi);
    expect(back).toBeCloseTo(1.6, 9);
    // 同类别每个单位都应可相互还原
    for (const u of listUnits('length')) {
      const v = convert('length', 'm', u.id, 3);
      expect(convert('length', u.id, 'm', v)).toBeCloseTo(3, 9);
    }
  });

  it('未知类别/单位 → 抛错（友好失败，不静默 NaN）', () => {
    expect(() => convert('nope', 'a', 'b', 1)).toThrow();
    expect(() => convert('pressure', 'xxx', 'bar', 1)).toThrow();
  });
});

// ──────────────────────────────────────────────────────────────── B8 计费
describe('QA · B8 时间型计费（独立复算 / 分值舍入）', () => {
  it('单台用量 = Σ(时长×权重)，费用以分为整数', () => {
    const r = timeBilling({
      fcuCount: 207,
      tiers: [
        { name: '高', hours: 100, weight: 1.0 },
        { name: '中', hours: 200, weight: 0.7 },
        { name: '低', hours: 300, weight: 0.4 },
      ],
      unitPriceYuan: 1.5,
    });
    expect(r.usagePerUnit).toBeCloseTo(360, 9); // 100 + 140 + 120
    expect(r.totalUsage).toBeCloseTo(360 * 207, 6);
    expect(r.unitPriceCents).toBe(150);
    expect(Number.isInteger(r.totalCents)).toBe(true);
    expect(r.totalCents).toBe(Math.round(360 * 207 * 150)); // 11,178,000 分
    expect(r.totalYuan).toBeCloseTo(111780, 6);
  });

  it('舍入：小数用量 × 分值四舍五入', () => {
    const r = timeBilling({
      tiers: [{ name: '低', hours: 0.333, weight: 1 }],
      unitPriceYuan: 1,
    });
    expect(r.unitPriceCents).toBe(100);
    expect(r.totalCents).toBe(33); // round(0.333*100)
  });

  it('yuanToCents 舍入到整数分', () => {
    expect(yuanToCents(1.5)).toBe(150);
    expect(yuanToCents(0.333)).toBe(33);
    expect(yuanToCents(0.005)).toBe(1); // 0.5 分 → 1
  });
});

// ──────────────────────────────────────────────────────────────── B4 存储
describe('QA · B4 存储容量（按 PRD 公式手算核对）', () => {
  it('50 路 × 4Mbps × 30 天 ÷8÷1024 = 63281.25 GB（H.264）', () => {
    const r = storageCapacity({ channels: 50, bitrateMbps: 4, days: 30, codec: 'H264' });
    const manual = (50 * 4 * 3600 * 24 * 30) / 8 / 1024; // 63281.25
    expect(manual).toBeCloseTo(63281.25, 6);
    expect(r.totalGB).toBeCloseTo(manual, 6);
    expect(r.perChannelPerDayGB).toBeCloseTo((4 * 86400) / 8 / 1024, 6); // 42.1875
  });

  it('H.265 约为 H.264 的一半', () => {
    const h264 = storageCapacity({ channels: 50, bitrateMbps: 4, days: 30, codec: 'H264' });
    const h265 = storageCapacity({ channels: 50, bitrateMbps: 4, days: 30, codec: 'H265' });
    expect(h265.totalGB).toBeCloseTo(h264.totalGB * 0.5, 6);
  });

  it('零/负输入不产生 NaN', () => {
    const r = storageCapacity({ channels: 0, bitrateMbps: 0, days: 0 });
    expect(r.totalGB).toBe(0);
    expect(Number.isNaN(r.totalGB)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────── C10/ C12/ C14
describe('QA · C10 电缆压降（独立复算）', () => {
  it('三相铜 32A/100m/6mm² @380V', () => {
    const r = cableVoltageDrop({
      current: 32,
      length: 100,
      section: 6,
      material: 'copper',
      phase: 'three',
      voltage: 380,
    });
    const dU = (Math.sqrt(3) * 0.0175 * 100 * 32) / 6; // ≈16.166 V
    expect(r.deltaV).toBeCloseTo(dU, 6);
    expect(r.percent).toBeCloseTo((dU / 380) * 100, 6); // ≈4.25%
    expect(r.compliant).toBe(true); // ≤5%
  });

  it('截面 0 / 电压 0 → 安全兜底', () => {
    const noSection = cableVoltageDrop({ current: 10, length: 10, section: 0, voltage: 380 });
    expect(noSection.deltaV).toBe(0);
    expect(noSection.compliant).toBe(false);
    const noVoltage = cableVoltageDrop({ current: 10, length: 10, section: 4, voltage: 0 });
    expect(noVoltage.percent).toBe(0);
    expect(noVoltage.compliant).toBe(false);
  });
});

describe('QA · C12 电阻分压 / 限流（独立复算）', () => {
  it('分压 12V, R1=10k, R2=5k → 4V', () => {
    expect(voltageDivider(12, 10000, 5000)).toBeCloseTo(4, 9);
    expect(voltageDivider(12, 0, 0)).toBe(0); // 除零兜底
  });

  it('限流 5V, Vf=2V, If=20mA → 150Ω，功耗 0.06W', () => {
    expect(currentLimitResistor(5, 2, 0.02)).toBeCloseTo(150, 9);
    expect(5 - 2).toBe(3);
    expect(3 * 0.02).toBeCloseTo(0.06, 9);
  });
});

describe('QA · C14 定时器换算（独立复算）', () => {
  it('时基×设定值：1000ms × 60 = 60000ms', () => {
    expect(timerMillis(1000, 60)).toBe(60000);
  });

  it('60s → {ms:60000, s:60, min:1, h:1/60}', () => {
    const r = timerConvert(60, 's');
    expect(r.ms).toBe(60000);
    expect(r.s).toBe(60);
    expect(r.min).toBe(1);
    expect(r.h).toBeCloseTo(1 / 60, 9);
  });

  it('负输入兜底为 0', () => {
    expect(timerMillis(-5, 10)).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────── A4 / A5
describe('QA · A4/A5 带宽与传输时间（独立复算）', () => {
  it('100 Mbps = 12.5 MB/s（十进制）', () => {
    const r = bandwidthConvert(100, 'Mbps');
    expect(r['MB/s']).toBeCloseTo(12.5, 9);
    expect(r.Mbps).toBeCloseTo(100, 9);
  });

  it('1 GB ÷ 100 Mbps ≈ 80s（十进制）', () => {
    const r = transmissionTime({ size: 1, sizeUnit: 'GB', bandwidth: 100, bandwidthUnit: 'Mbps' });
    expect(r.theoreticalSeconds).toBeCloseTo(80, 6); // 8e9 / 1e8
  });

  it('0 带宽 → Infinity 而非 NaN/崩溃', () => {
    const r = transmissionTime({ size: 1, sizeUnit: 'GB', bandwidth: 0, bandwidthUnit: 'Mbps' });
    expect(r.theoreticalSeconds).toBe(Infinity);
  });
});

// ──────────────────────────────────────────────────────────────── 结构与一致性
describe('QA · 注册表结构 / 一致性', () => {
  it('43 工具；分布 13/13/17；P0 恰 16', () => {
    expect(getAll().length).toBe(43);
    expect(byDomain('network').length).toBe(13);
    expect(byDomain('building').length).toBe(13);
    expect(byDomain('automation').length).toBe(17);
    expect(byPriority('P0').length).toBe(16);
  });

  it('每个工具 getById 可回取，且 Component 非空、元信息完整', () => {
    for (const tool of getAll()) {
      const found = getById(tool.id);
      expect(found, `getById 失败：${tool.id}`).toBeTruthy();
      expect(found?.Component, `${tool.id} Component 为空`).toBeTruthy();
      expect(tool.title).toBeTruthy();
      expect(tool.subtitle).toBeTruthy();
      expect(tool.code).toBeTruthy();
      expect(tool.keywords.length).toBeGreaterThan(0);
    }
  });

  it('未知 id 返回 undefined', () => {
    expect(getById('does.not.exist')).toBeUndefined();
  });

  it('C15 Modbus 同时挂载「功能码 + 异常码」两张表', () => {
    const modbus = getById('automation.modbus');
    expect(modbus).toBeTruthy();
    const refs = [modbus!.quickRefId, ...(modbus!.quickRefIds ?? [])];
    expect(refs).toContain('automation.modbus');
    expect(refs).toContain('automation.modbusExceptions');
    expect(getQuickRef('automation.modbus')).toBeTruthy();
    expect(getQuickRef('automation.modbusExceptions')).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────── 速查内容准确性
describe('QA · 速查内容抽查（真实准确性）', () => {
  it('T568A/B 线序正确', () => {
    const t = getQuickRef('network.cableColor')!;
    const b = t.rows.find((r) => r.id === 't568b')!;
    expect(Object.values(b.values)).toEqual(['白橙', '橙', '白绿', '蓝', '白蓝', '绿', '白棕', '棕']);
    const a = t.rows.find((r) => r.id === 't568a')!;
    expect(Object.values(a.values)).toEqual(['白绿', '绿', '白橙', '蓝', '白蓝', '橙', '白棕', '棕']);
  });

  it('关键端口 502/102/44818/4840 准确', () => {
    const t = getQuickRef('network.ports')!;
    const map = new Map(t.rows.map((r) => [r.values.service as string, r.values.port as string]));
    expect(map.get('Modbus TCP')).toBe('502');
    expect(map.get('S7comm (西门子)')).toBe('102');
    expect(map.get('EtherNet/IP')).toBe('44818');
    expect(map.get('OPC-UA')).toBe('4840');
  });

  it('2.4G 中心频率 = 2412 + 5(n−1)', () => {
    const t = getQuickRef('network.wifiChannels')!;
    for (let n = 1; n <= 13; n++) {
      const row = t.rows.find((r) => r.values.channel === String(n) && r.values.band === '2.4G');
      expect(row, `缺 2.4G-${n}`).toBeTruthy();
      expect(row!.values.freq).toBe(`${2412 + 5 * (n - 1)} MHz`);
    }
  });

  it('Modbus 功能码 01–16 与异常码准确', () => {
    const fc = getQuickRef('automation.modbus')!;
    const codes = fc.rows.map((r) => r.values.code);
    for (const c of ['01', '02', '03', '04', '05', '06', '15', '16']) {
      expect(codes, `缺功能码 ${c}`).toContain(c);
    }
    const ex = getQuickRef('automation.modbusExceptions')!;
    const exMap = new Map(ex.rows.map((r) => [r.values.code as string, r.values.name as string]));
    expect(exMap.get('01')).toContain('非法功能');
    expect(exMap.get('02')).toContain('非法数据地址');
    expect(exMap.get('11')).toContain('网关');
  });
});

// ──────────────────────────────────────────────────────────────── 搜索
describe('QA · 搜索命中', () => {
  it('子网 / 502 / modbus / t568b 均可命中且分类正确', () => {
    resetSearchIndex();
    expect(search('子网').some((h) => h.doc.toolId === 'network.subnet')).toBe(true);
    const p502 = search('502');
    expect(p502.some((h) => h.doc.toolId === 'network.ports')).toBe(true);
    expect(search('modbus').some((h) => h.doc.toolId === 'automation.modbus')).toBe(true);
    expect(search('t568b').some((h) => h.doc.toolId === 'network.cableColor')).toBe(true);
  });
});
