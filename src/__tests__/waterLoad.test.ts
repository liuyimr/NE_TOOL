import { describe, expect, it } from 'vitest';
import { calcLoad, parseDeviceList } from '@/lib/calc/waterLoad';

describe('D1 计算负荷（需要系数法）', () => {
  it('单类设备：Pc/Qc/Sc/Ic', () => {
    const r = calcLoad({ devices: [{ powerKw: 7.5, kd: 0.8, pf: 0.85, count: 2 }], voltage: 380 });
    expect(r.installedKw).toBeCloseTo(15, 6);
    expect(r.activeKw).toBeCloseTo(12, 6);
    expect(r.apparentKva).toBeCloseTo(14.12, 1);
    expect(r.avgPf).toBeCloseTo(0.85, 3);
    // Ic = Sc/(√3·Un)
    expect(r.currentA).toBeCloseTo((r.apparentKva * 1000) / (Math.sqrt(3) * 380), 6);
  });

  it('多类设备累加并计入同时系数', () => {
    const r = calcLoad({
      devices: [
        { powerKw: 10, kd: 1, pf: 1, count: 1 },
        { powerKw: 10, kd: 1, pf: 1, count: 1 },
      ],
      simultaneousFactor: 0.8,
    });
    expect(r.installedKw).toBeCloseTo(20, 6);
    expect(r.activeKw).toBeCloseTo(16, 6);
    expect(r.reactiveKvar).toBeCloseTo(0, 6); // pf=1 → 无功为 0
  });

  it('空清单：结果全 0，不崩溃', () => {
    const r = calcLoad({ devices: [] });
    expect(r.installedKw).toBe(0);
    expect(r.apparentKva).toBe(0);
    expect(r.currentA).toBe(0);
    expect(r.avgPf).toBe(0);
  });

  it('边界：cosφ 越界按 0.85 兜底，负功率被钳到 0', () => {
    const r = calcLoad({ devices: [{ powerKw: -5, kd: 1, pf: 1.5, count: 1 }] });
    expect(r.installedKw).toBe(0);
    expect(r.activeKw).toBe(0);
  });

  it('parseDeviceList 解析多行/中文逗号/空格', () => {
    const list = parseDeviceList('7.5,0.8,0.85,2\n3，0.7，0.8\n1.5 1.0 0.9 10');
    expect(list).toHaveLength(3);
    expect(list[0]).toMatchObject({ powerKw: 7.5, kd: 0.8, pf: 0.85, count: 2 });
    expect(list[1]).toMatchObject({ powerKw: 3, kd: 0.7, pf: 0.8, count: 1 });
    expect(list[2]).toMatchObject({ powerKw: 1.5, kd: 1.0, pf: 0.9, count: 10 });
  });

  it('parseDeviceList 忽略非法行', () => {
    expect(parseDeviceList('乱码\n\nabc\ndef,ghi')).toEqual([]);
  });
});
