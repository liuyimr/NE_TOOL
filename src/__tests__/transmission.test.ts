import { describe, expect, it } from 'vitest';
import { humanizeSeconds, transmissionTime } from '@/lib/calc/transmission';

describe('A5 传输时间估算', () => {
  it('1 GB @ 100 Mbps ≈ 80 秒', () => {
    const r = transmissionTime({
      size: 1,
      sizeUnit: 'GB',
      bandwidth: 100,
      bandwidthUnit: 'Mbps',
    });
    // 8e9 bit / 100e6 bps = 80 s
    expect(r.theoreticalSeconds).toBeCloseTo(80, 6);
    expect(r.human).toBe('1 分 20 秒');
  });

  it('协议开销增加耗时', () => {
    const r = transmissionTime({
      size: 1,
      sizeUnit: 'GB',
      bandwidth: 100,
      bandwidthUnit: 'Mbps',
      overheadPct: 20,
    });
    // 80 / 0.8 = 100 s
    expect(r.actualSeconds).toBeCloseTo(100, 6);
  });

  it('协议开销边界：≥100% 钳制到 99%（结果有限，无 Infinity/负码率）', () => {
    const r100 = transmissionTime({
      size: 1,
      sizeUnit: 'GB',
      bandwidth: 100,
      bandwidthUnit: 'Mbps',
      overheadPct: 100,
    });
    // 有效码率 = 100e6 × (1 − 0.99) = 1e6 bps，仍为正、有限
    expect(Number.isFinite(r100.effectiveBps)).toBe(true);
    expect(r100.effectiveBps).toBeGreaterThan(0);
    expect(Number.isFinite(r100.actualSeconds)).toBe(true);
    // 80 / 0.01 = 8000 s
    expect(r100.actualSeconds).toBeCloseTo(8000, 4);

    // >100 同样钳制到 99，不会出现负码率
    const r200 = transmissionTime({
      size: 1,
      sizeUnit: 'GB',
      bandwidth: 100,
      bandwidthUnit: 'Mbps',
      overheadPct: 200,
    });
    expect(r200.effectiveBps).toBeCloseTo(r100.effectiveBps, 6);

    // 负开销钳到 0
    const rNeg = transmissionTime({
      size: 1,
      sizeUnit: 'GB',
      bandwidth: 100,
      bandwidthUnit: 'Mbps',
      overheadPct: -10,
    });
    expect(rNeg.effectiveBps).toBeCloseTo(100e6, 3);
    expect(rNeg.actualSeconds).toBeCloseTo(80, 6);
  });

  it('人类可读格式化', () => {
    expect(humanizeSeconds(3661)).toBe('1 时 1 分 1 秒');
    expect(humanizeSeconds(0.5)).toBe('500 毫秒');
  });
});
