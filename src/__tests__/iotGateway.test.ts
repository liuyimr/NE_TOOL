import { describe, expect, it } from 'vitest';
import {
  iotGateway,
  BITS_PER_BYTE,
  SECONDS_PER_DAY,
  BYTES_PER_MB,
  BYTES_PER_GB,
  IOT_GATEWAY_DEFAULTS,
  type IotGatewayInput,
} from '@/lib/calc/iotGateway';

function baseInput(overrides: Partial<IotGatewayInput> = {}): IotGatewayInput {
  return {
    nodes: 500,
    intervalSec: 60,
    payloadBytes: 120,
    overheadBytes: 60,
    gatewayCapacity: 500,
    gatewayKbps: 1000,
    ...overrides,
  };
}

describe('N14 物联网网关点位容量与带宽估算', () => {
  it('默认锚点：180 B/包、12 kbit/s、129.6 MB/日、1 台网关', () => {
    const r = iotGateway(baseInput());
    // 120 + 60 = 180 B；500/60 = 8.3333 pkt/s；8.3333×180×8 = 12000 bit/s
    // 12000/8×86400 = 129600000 B = 129.6 MB（十进制）
    expect(r.valid).toBe(true);
    expect(r.packetBytes).toBe(180);
    expect(r.packetsPerSec).toBeCloseTo(8.333333333333334, 6);
    expect(r.uplinkBps).toBeCloseTo(12000, 6);
    expect(r.uplinkKbps).toBeCloseTo(12, 6);
    expect(r.dailyBytes).toBeCloseTo(129600000, 4);
    expect(r.dailyMB).toBeCloseTo(129.6, 6);
    expect(r.dailyGB).toBeCloseTo(0.1296, 6);
    expect(r.byNodes).toBe(1);
    expect(r.byBandwidth).toBe(1);
    expect(r.gatewayCount).toBe(1);
    expect(BITS_PER_BYTE).toBe(8);
    expect(SECONDS_PER_DAY).toBe(86400);
    expect(BYTES_PER_MB).toBe(1e6);
    expect(BYTES_PER_GB).toBe(1e9);
    expect(IOT_GATEWAY_DEFAULTS.overheadBytes).toBe(60);
    expect(IOT_GATEWAY_DEFAULTS.gatewayCapacity).toBe(500);
  });

  it('带宽成为控制因素：40000 kbit/s → 40 台网关，日流量 432000 MB', () => {
    const r = iotGateway(
      baseInput({ nodes: 5000, intervalSec: 1, payloadBytes: 1000, overheadBytes: 0, gatewayCapacity: 10000 }),
    );
    // 1000 B/包 × 5000 pkt/s × 8 = 4e7 bit/s = 40000 kbit/s
    // ceil(5000/10000)=1；ceil(40000/1000)=40 → 40 台
    // 4e7/8×86400 = 4.32e11 B = 432000 MB = 432 GB
    expect(r.packetBytes).toBe(1000);
    expect(r.uplinkKbps).toBeCloseTo(40000, 6);
    expect(r.byNodes).toBe(1);
    expect(r.byBandwidth).toBe(40);
    expect(r.gatewayCount).toBe(40);
    expect(r.dailyMB).toBeCloseTo(432000, 4);
    expect(r.dailyGB).toBeCloseTo(432, 6);
    expect(r.note).toContain('带宽是网关数量的控制因素');
  });

  it('边界：nodes=0 时网关数为 0、带宽为 0，且结果仍有效（无除零）', () => {
    const r = iotGateway(baseInput({ nodes: 0 }));
    expect(r.valid).toBe(true);
    expect(r.packetsPerSec).toBe(0);
    expect(r.uplinkKbps).toBe(0);
    expect(r.byNodes).toBe(0);
    expect(r.byBandwidth).toBe(0);
    expect(r.gatewayCount).toBe(0);
    expect(r.dailyMB).toBe(0);
  });

  it('边界：分母为 0 / 负数 / 非法数值 → valid=false，输出全为 0 且有限', () => {
    const cases = [
      baseInput({ intervalSec: 0 }),
      baseInput({ gatewayCapacity: 0 }),
      baseInput({ gatewayKbps: 0 }),
      baseInput({ nodes: -1 }),
      baseInput({ payloadBytes: -1 }),
      baseInput({ overheadBytes: -1 }),
      baseInput({ intervalSec: Number.NaN }),
    ];
    for (const input of cases) {
      const r = iotGateway(input);
      expect(r.valid).toBe(false);
      expect(r.uplinkKbps).toBe(0);
      expect(r.gatewayCount).toBe(0);
      expect(Number.isFinite(r.dailyBytes)).toBe(true);
    }
  });

  it('边界：极大值导致 bit/s 溢出 → valid=false 且不泄漏 Infinity', () => {
    const r = iotGateway(baseInput({ nodes: 1e308, payloadBytes: 1e308 }));
    expect(r.valid).toBe(false);
    expect(r.note).toContain('溢出');
    expect(Number.isFinite(r.uplinkBps)).toBe(true);
    expect(Number.isFinite(r.dailyMB)).toBe(true);
  });
});
