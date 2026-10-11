import { describe, expect, it } from 'vitest';
import { bandwidthConvert, fromBps, toBps } from '@/lib/calc/bandwidth';

describe('A4 带宽 / 流量换算', () => {
  it('100 Mbps 换算', () => {
    const r = bandwidthConvert(100, 'Mbps');
    expect(r['Mbps']).toBe(100);
    expect(r['Kbps']).toBe(100000);
    expect(r['Gbps']).toBeCloseTo(0.1, 10);
    expect(r['MB/s']).toBeCloseTo(12.5, 10);
    expect(r['MB/s']).toBeCloseTo(r['B/s'] / 1e6, 6);
  });

  it('1 Byte = 8 bit', () => {
    expect(toBps(1, 'B/s')).toBe(8);
    expect(fromBps(8, 'B/s')).toBe(1);
  });

  it('二进制口径影响字节类', () => {
    // 1 MB/s 二进制 = 8 × 1024² bps
    expect(toBps(1, 'MB/s', true)).toBe(8 * 1024 ** 2);
    expect(toBps(1, 'MB/s', false)).toBe(8e6);
  });

  it('未知单位抛错', () => {
    expect(() => toBps(1, 'Xbps')).toThrow();
  });
});
