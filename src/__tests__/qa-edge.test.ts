/**
 * QA 独立验证 · 边界与异常路径（严过关）
 * ------------------------------------------------------------------
 * 针对「空 / 0 / 负 / 超大 / 非数字 / 除零」等边界，独立核验各计算模块
 * 是否给出合理兜底而非静默 NaN/Infinity/崩溃；并覆盖其余计算模块的独立复算。
 */
import { describe, expect, it } from 'vitest';

import { floatToHex, hexToFloat } from '@/lib/calc/ieee754';
import { toBcd, fromBcd, datatypeInfo } from '@/lib/calc/datatype';
import { mwToDbm, dbmToMw, signalLevel } from '@/lib/calc/wifiSignal';
import { macInfo } from '@/lib/calc/mac';
import { illuminanceCalc } from '@/lib/calc/illuminance';
import { trayFill } from '@/lib/calc/trayFill';
import { upsCapacity } from '@/lib/calc/ups';
import { cableLength } from '@/lib/calc/cableLength';
import { pointCount } from '@/lib/calc/pointCount';
import { coolingBilling } from '@/lib/calc/cooling';
import { precisionAc } from '@/lib/calc/precisionAc';
import { round, roundSig, formatNumber, thousands, formatBytes, formatSI } from '@/lib/format';
import { encodeParams, parseParams, buildToolHash, toNumber, toBool } from '@/lib/url';

describe('QA · C4 IEEE754 双向转换', () => {
  it('1.0 单精度大端 = 3F 80 00 00；小端字节序反转', () => {
    expect(floatToHex(1.0, 'single')).toBe('3F 80 00 00');
    expect(floatToHex(1.0, 'single', true)).toBe('00 00 80 3F');
  });

  it('1.0 双精度 = 3F F0 00 00 00 00 00 00', () => {
    expect(floatToHex(1.0, 'double')).toBe('3F F0 00 00 00 00 00 00');
  });

  it('往返一致：3.14 单/双精度', () => {
    expect(hexToFloat(floatToHex(3.14, 'single'), 'single')).toBeCloseTo(3.14, 5);
    expect(hexToFloat(floatToHex(3.14, 'double'), 'double')).toBeCloseTo(3.14, 12);
  });
});

describe('QA · C3 数据类型 / BCD', () => {
  it('BCD 往返 1234 ↔ 0x1234', () => {
    expect(toBcd(1234)).toBe(0x1234);
    expect(fromBcd(0x1234)).toBe(1234);
    expect(toBcd(99)).toBe(0x99);
  });

  it('非法 BCD 半字节（>9）返回 NaN', () => {
    expect(Number.isNaN(fromBcd(0x1a))).toBe(true);
  });

  it('负数按位宽掩码表示（WORD）', () => {
    const info = datatypeInfo(-1, 'WORD');
    expect(info.bin).toBe('1'.repeat(16));
    expect(info.hex).toBe('0xFFFF');
    expect(info.inRange).toBe(false);
  });
});

describe('QA · A12 WiFi 信号', () => {
  it('mW↔dBm 往返', () => {
    expect(mwToDbm(1)).toBeCloseTo(0, 9);
    expect(mwToDbm(100)).toBeCloseTo(20, 9);
    expect(dbmToMw(-30)).toBeCloseTo(0.001, 12);
  });

  it('mW≤0 → -Infinity（不产生 NaN）', () => {
    expect(mwToDbm(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(mwToDbm(-1)).toBe(Number.NEGATIVE_INFINITY);
  });

  it('信号等级分级边界', () => {
    expect(signalLevel(-50).level).toBe('优');
    expect(signalLevel(-67).level).toBe('良');
    expect(signalLevel(-91).level).toBe('掉线');
  });
});

describe('QA · A9 MAC 工具', () => {
  it('规范化与 OUI / 单播判定', () => {
    const r = macInfo('00:1A:2B:3C:4D:5E');
    expect(r.valid).toBe(true);
    expect(r.canonical).toBe('00:1A:2B:3C:4D:5E');
    expect(r.oui).toBe('00:1A:2B');
    expect(r.multicast).toBe(false);
    expect(r.dotted).toBe('001A.2B3C.4D5E');
  });

  it('组播地址（首字节最低位=1）', () => {
    expect(macInfo('01-00-5E-00-00-01').multicast).toBe(true);
  });

  it('非法输入 → valid=false', () => {
    const r = macInfo('xx:yy:zz');
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });
});

describe('QA · B10/B11 照度 / B2 填充率 / B5 UPS / B1 线缆 / B3 点位 / B9 冷量 / B6 空调', () => {
  it('照度：面积 100 / 300lx / 3000lm / U0.7 / K0.8 → 需 18 盏', () => {
    const r = illuminanceCalc({
      area: 100,
      targetLux: 300,
      lumens: 3000,
      utilization: 0.7,
      maintenance: 0.8,
      fixtures: 18,
      wattPerLamp: 20,
    });
    expect(r.requiredFixtures).toBe(18); // ceil(300*100/(3000*0.7*0.8)) = ceil(17.857)
    expect(r.averageLux).toBeCloseTo(302.4, 3);
    expect(r.powerDensity).toBeCloseTo(3.6, 6);
  });

  it('填充率：10×50mm² / 100×50 桥架 = 10% 合规', () => {
    const r = trayFill({
      cables: [{ count: 10, section: 50 }],
      width: 100,
      height: 50,
      kind: 'conduit',
    });
    expect(r.cableArea).toBe(500);
    expect(r.containerArea).toBe(5000);
    expect(r.fillRate).toBeCloseTo(10, 6);
    expect(r.compliant).toBe(true);
  });

  it('UPS：10kW / 0.9 → 11.11kVA，推荐 13.89kVA，1h 电池 57.9Ah', () => {
    const r = upsCapacity({ loadKW: 10, powerFactor: 0.9, backupHours: 1 });
    expect(r.apparentKVA).toBeCloseTo(11.111, 3);
    expect(r.recommendedKVA).toBeCloseTo(13.889, 3);
    expect(r.batteryAh).toBeCloseTo(10000 / (240 * 0.9 * 0.8), 3); // 57.87
  });

  it('线缆长度：(30+5)×100×1.1=3850m → 13 箱', () => {
    const r = cableLength({ points: 100, horizontal: 30, vertical: 5, margin: 1.1 });
    expect(r.perPoint).toBe(35);
    expect(r.totalLength).toBeCloseTo(3850, 6);
    expect(r.boxes).toBe(13);
  });

  it('点位统计：50 点 + 20% 余量 → 2 台 DDC', () => {
    const r = pointCount({
      points: [
        { type: 'AI', count: 20 },
        { type: 'DI', count: 30 },
      ],
    });
    expect(r.total).toBe(50);
    expect(r.byType).toEqual({ AI: 20, DI: 30 });
    expect(r.designPoints).toBe(60); // 50 + ceil(10)
    expect(r.ddcCount).toBe(2); // ceil(60 / (48*0.8))
  });

  it('冷量：10m³/h ΔT5K → 58.14kW，8h=465.1kWh', () => {
    const r = coolingBilling({ flowM3h: 10, returnTemp: 12, supplyTemp: 7, hours: 8 });
    expect(r.deltaT).toBe(5);
    expect(r.powerKW).toBeCloseTo((1000 * 10 / 3600) * 4.186 * 5, 3); // 58.14
    expect(r.energyKWh).toBeCloseTo(465.11, 1);
  });

  it('精密空调：100kW IT / 50m² → 总 129.8kW', () => {
    const r = precisionAc({ itLoadKW: 100, area: 50 });
    expect(r.itCoolingKW).toBeCloseTo(115, 6);
    expect(r.buildingCoolingKW).toBeCloseTo(3, 6);
    expect(r.totalKW).toBeCloseTo(129.8, 6);
  });

  it('全零/负输入不崩溃、不产生 NaN', () => {
    for (const v of [
      illuminanceCalc({ area: 0, targetLux: 0 }).averageLux,
      trayFill({ cables: [], kind: 'power' }).fillRate,
      upsCapacity({ loadKW: 0, backupHours: 0 }).batteryAh,
      cableLength({ points: 0, horizontal: 0, vertical: 0 }).totalLength,
      pointCount({ points: [] }).ddcCount,
      coolingBilling({ flowM3h: 0, returnTemp: 0, supplyTemp: 0, hours: 0 }).energyKWh,
      precisionAc({ itLoadKW: 0, area: 0 }).totalKW,
    ]) {
      expect(Number.isNaN(v)).toBe(false);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('QA · 显示格式化（format）', () => {
  it('round / roundSig', () => {
    expect(round(1.005, 2)).toBeCloseTo(1.01, 9);
    expect(roundSig(12345, 3)).toBe(12300);
    expect(roundSig(0.0012345, 3)).toBeCloseTo(0.00123, 9);
  });

  it('formatNumber / thousands', () => {
    expect(formatNumber(1000)).toBe('1000');
    expect(thousands(1234567)).toBe('1,234,567');
  });

  it('formatSI / formatBytes', () => {
    expect(formatSI(1500)).toBe('1.5 k');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });
});

describe('QA · URL 参数（分享链接）', () => {
  it('encode/parse 往返', () => {
    const s = encodeParams({ ip: '192.168.1.10', mask: 26, empty: '' });
    expect(s).toBe('ip=192.168.1.10&mask=26');
    expect(parseParams(`?${s}`)).toEqual({ ip: '192.168.1.10', mask: '26' });
  });

  it('buildToolHash 生成可回填 hash', () => {
    const h = buildToolHash('network.subnet', { ip: '10.0.0.1', mask: '8' });
    expect(h).toBe('#/tool/network.subnet?ip=10.0.0.1&mask=8');
  });

  it('toNumber / toBool 安全解析', () => {
    expect(toNumber('12.5')).toBe(12.5);
    expect(toNumber('abc', 7)).toBe(7);
    expect(toNumber('')).toBeNaN();
    expect(toBool('1')).toBe(true);
    expect(toBool('off')).toBe(false);
  });
});
