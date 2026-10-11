import { describe, expect, it } from 'vitest';
import { macInfo } from '@/lib/calc/mac';

describe('A9 MAC 地址工具', () => {
  it('格式归一化', () => {
    const r = macInfo('aa:bb:cc:dd:ee:ff');
    expect(r.valid).toBe(true);
    expect(r.canonical).toBe('AA:BB:CC:DD:EE:FF');
    expect(r.hyphen).toBe('AA-BB-CC-DD-EE-FF');
    expect(r.dotted).toBe('AABB.CCDD.EEFF');
    expect(r.oui).toBe('AA:BB:CC');
  });

  it('单播/本地管理位判定', () => {
    const r = macInfo('AA:BB:CC:DD:EE:FF');
    expect(r.multicast).toBe(false);
    expect(r.locallyAdministered).toBe(true);
    const m = macInfo('01:00:5E:00:00:01');
    expect(m.multicast).toBe(true);
  });

  it('非法输入', () => {
    expect(macInfo('zz:zz').valid).toBe(false);
    expect(macInfo('aa:bb:cc:dd:ee').valid).toBe(false);
  });
});
