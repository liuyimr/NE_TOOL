import { describe, expect, it } from 'vitest';
import { pipeSize, DN_INNER } from '@/lib/calc/waterPipe';

describe('D8 管径选择（按流量与流速）', () => {
  it('2 L/s、v=1.0 → 理论内径约 50.5mm，选 DN50', () => {
    const r = pipeSize({ flow: 2, flowUnit: 'L/s', velocity: 1.0 });
    expect(r.flowM3s).toBeCloseTo(0.002, 9);
    expect(r.computedDiaMm).toBeCloseTo(50.46, 1);
    expect(r.recommendedDn).toBe(50);
    expect(r.actualVelocity).toBeCloseTo(0.002 / (Math.PI * (0.053 / 2) ** 2), 4);
  });

  it('m³/h 单位换算正确', () => {
    const a = pipeSize({ flow: 7.2, flowUnit: 'm3/h', velocity: 1.0 });
    const b = pipeSize({ flow: 2, flowUnit: 'L/s', velocity: 1.0 });
    expect(a.computedDiaMm).toBeCloseTo(b.computedDiaMm, 3);
  });

  it('流速越大所需管径越小', () => {
    const slow = pipeSize({ flow: 2, flowUnit: 'L/s', velocity: 0.8 });
    const fast = pipeSize({ flow: 2, flowUnit: 'L/s', velocity: 1.8 });
    expect(fast.computedDiaMm).toBeLessThan(slow.computedDiaMm);
  });

  it('边界：流量 0 → 内径 0，返回最小标准管', () => {
    const r = pipeSize({ flow: 0 });
    expect(r.computedDiaMm).toBe(0);
    expect(r.recommendedDn).toBe(DN_INNER[0].dn);
  });

  it('流量极大且流速小时可能超出常用范围 → null', () => {
    const r = pipeSize({ flow: 1000, flowUnit: 'L/s', velocity: 0.1 });
    expect(r.recommendedDn).toBeNull();
  });
});
