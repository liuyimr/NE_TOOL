import { describe, expect, it } from 'vitest';
import {
  formatIPv4,
  ipClass,
  isPrivateIPv4,
  maskFromPrefix,
  parseIPv4,
  prefixFromMask,
  subnetCalc,
} from '@/lib/calc/subnet';

describe('A1 IP 子网计算', () => {
  it('解析与格式化 IPv4', () => {
    expect(parseIPv4('192.168.1.10')).toBe(3232235786);
    expect(formatIPv4(3232235786)).toBe('192.168.1.10');
    expect(parseIPv4('256.1.1.1')).toBeNull();
    expect(parseIPv4('1.2.3')).toBeNull();
  });

  it('掩码与前缀互转', () => {
    expect(maskFromPrefix(24)).toBe(4294967040);
    expect(prefixFromMask(maskFromPrefix(26))).toBe(26);
    expect(prefixFromMask(0xffffffff)).toBe(32);
  });

  it('/26 子网计算', () => {
    const r = subnetCalc({ ip: '192.168.1.10', mask: '26' });
    expect(r.valid).toBe(true);
    expect(r.mask).toBe('255.255.255.192');
    expect(r.network).toBe('192.168.1.0');
    expect(r.broadcast).toBe('192.168.1.63');
    expect(r.firstHost).toBe('192.168.1.1');
    expect(r.lastHost).toBe('192.168.1.62');
    expect(r.usableHosts).toBe(62);
    expect(r.totalAddresses).toBe(64);
    expect(r.ipClass).toContain('C 类');
    expect(r.isPrivate).toBe(true);
  });

  it('点分掩码输入等价于前缀', () => {
    const byMask = subnetCalc({ ip: '10.0.0.5', mask: '255.255.255.0' });
    const byPrefix = subnetCalc({ ip: '10.0.0.5', mask: '24' });
    expect(byMask.network).toBe(byPrefix.network);
    expect(byMask.broadcast).toBe('10.0.0.255');
    expect(byMask.usableHosts).toBe(254);
  });

  it('/31（RFC3021）与 /32 边界：不适用 2^(32−前缀)−2 公式', () => {
    // /31 点对点：网络号与广播号均作为主机，共 2 个可用地址
    const r31 = subnetCalc({ ip: '192.168.0.1', mask: '31' });
    expect(r31.valid).toBe(true);
    expect(r31.usableHosts).toBe(2);
    expect(r31.network).toBe('192.168.0.0');
    expect(r31.broadcast).toBe('192.168.0.1');
    expect(r31.firstHost).toBe('192.168.0.0');
    expect(r31.lastHost).toBe('192.168.0.1');

    // /32 单主机：仅 1 个可用地址（该地址本身）
    const r32 = subnetCalc({ ip: '192.168.0.1', mask: '32' });
    expect(r32.usableHosts).toBe(1);
    expect(r32.firstHost).toBe('192.168.0.1');
    expect(r32.lastHost).toBe('192.168.0.1');

    // 对照：常规前缀仍按 −2 公式（/30 → 2）
    expect(subnetCalc({ ip: '192.168.0.1', mask: '30' }).usableHosts).toBe(2);
  });

  it('私有地址与类别判定', () => {
    expect(isPrivateIPv4(parseIPv4('172.16.5.5')!)).toBe(true);
    expect(isPrivateIPv4(parseIPv4('8.8.8.8')!)).toBe(false);
    expect(ipClass(parseIPv4('224.0.0.1')!)).toContain('组播');
  });

  it('非法输入返回错误', () => {
    const r = subnetCalc({ ip: 'abc', mask: '24' });
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });
});
