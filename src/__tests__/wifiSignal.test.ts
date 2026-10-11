import { describe, expect, it } from 'vitest';
import { dbmToMw, mwToDbm, signalLevel, wifiSignal } from '@/lib/calc/wifiSignal';

describe('A12 WiFi 信号强度换算', () => {
  it('dBm ↔ mW', () => {
    expect(dbmToMw(0)).toBeCloseTo(1, 9);
    expect(dbmToMw(20)).toBeCloseTo(100, 6);
    expect(mwToDbm(1)).toBeCloseTo(0, 9);
    expect(mwToDbm(100)).toBeCloseTo(20, 6);
  });

  it('信号等级判定', () => {
    expect(signalLevel(-40).level).toBe('优');
    expect(signalLevel(-65).level).toBe('良');
    expect(signalLevel(-75).level).toBe('弱');
    expect(signalLevel(-95).level).toBe('掉线');
  });

  it('综合换算', () => {
    const r = wifiSignal(0, 'dBm');
    expect(r.mw).toBeCloseTo(1, 9);
    expect(r.level).toBe('极强');
    const r2 = wifiSignal(100, 'mW');
    expect(r2.dbm).toBeCloseTo(20, 6);
  });
});
