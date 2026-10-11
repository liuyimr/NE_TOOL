import { describe, expect, it } from 'vitest';
import { decimalToIp, ipInfo } from '@/lib/calc/ipConvert';

describe('A2 IP 地址转换与校验', () => {
  it('十进制 / 二进制 / 十六进制', () => {
    const r = ipInfo('192.168.1.1');
    expect(r.valid).toBe(true);
    expect(r.decimal).toBe('3232235777');
    expect(r.binary).toBe('11000000.10101000.00000001.00000001');
    expect(r.hex).toBe('0xC0A80101');
    expect(r.isPrivate).toBe(true);
  });

  it('十进制回填为点分', () => {
    expect(decimalToIp(3232235777)).toBe('192.168.1.1');
  });

  it('非法输入', () => {
    expect(ipInfo('999.1.1.1').valid).toBe(false);
    expect(ipInfo('abc').valid).toBe(false);
  });
});
