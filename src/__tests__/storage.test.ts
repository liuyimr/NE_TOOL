import { describe, expect, it } from 'vitest';
import { storageCapacity } from '@/lib/calc/storage';

describe('B4 视频监控存储容量', () => {
  it('单路 1Mbps 单日 ≈ 10.55 GB（H.264）', () => {
    const r = storageCapacity({ channels: 1, bitrateMbps: 1, days: 1, codec: 'H264' });
    expect(r.perChannelPerDayGB).toBeCloseTo(10.546875, 6);
    expect(r.totalGB).toBeCloseTo(10.546875, 6);
    expect(r.codecFactor).toBe(1);
  });

  it('路数/码率/天数线性叠加', () => {
    const r = storageCapacity({ channels: 2, bitrateMbps: 4, days: 30, codec: 'H264' });
    expect(r.perDayGB).toBeCloseTo(84.375, 6);
    expect(r.totalGB).toBeCloseTo(2531.25, 6);
  });

  it('H.265 约为 H.264 的 50%', () => {
    const h264 = storageCapacity({ channels: 10, bitrateMbps: 4, days: 30, codec: 'H264' });
    const h265 = storageCapacity({ channels: 10, bitrateMbps: 4, days: 30, codec: 'H265' });
    expect(h265.totalGB).toBeCloseTo(h264.totalGB * 0.5, 6);
  });

  it('给出硬盘配置建议', () => {
    const r = storageCapacity({ channels: 50, bitrateMbps: 4, days: 30, codec: 'H265' });
    expect(r.plans.length).toBeGreaterThan(0);
    for (const p of r.plans) {
      expect(p.diskCount).toBeGreaterThanOrEqual(1);
    }
  });
});
