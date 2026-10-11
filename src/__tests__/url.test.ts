import { describe, expect, it } from 'vitest';
import { buildToolHash, encodeParams, parseParams, readToolParams, toBool, toNumber } from '@/lib/url';

describe('URL 参数工具', () => {
  it('序列化并跳过空值', () => {
    expect(encodeParams({ ip: '192.168.1.1', mask: 26, empty: '', skip: undefined })).toBe(
      'ip=192.168.1.1&mask=26',
    );
  });

  it('解析查询串', () => {
    const p = parseParams('?ip=10.0.0.1&mask=24');
    expect(p.ip).toBe('10.0.0.1');
    expect(p.mask).toBe('24');
  });

  it('构建工具 Hash 路由', () => {
    expect(buildToolHash('network.subnet', { ip: '10.0.0.1', mask: 24 })).toBe(
      '#/tool/network.subnet?ip=10.0.0.1&mask=24',
    );
    expect(buildToolHash('network.radix')).toBe('#/tool/network.radix');
  });

  it('从 hash 读取参数', () => {
    const p = readToolParams('#/tool/network.subnet?ip=10.0.0.1&mask=24');
    expect(p.ip).toBe('10.0.0.1');
    expect(p.mask).toBe('24');
  });

  it('数值 / 布尔解析', () => {
    expect(toNumber('42')).toBe(42);
    expect(Number.isNaN(toNumber('abc'))).toBe(true);
    expect(toNumber('abc', 7)).toBe(7);
    expect(toBool('true')).toBe(true);
    expect(toBool('0')).toBe(false);
  });
});
