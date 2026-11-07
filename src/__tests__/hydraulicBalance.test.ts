import { describe, expect, it } from 'vitest';
import {
  hydraulicBalance,
  WATER_NU,
  WATER_RHO,
  GRAVITY,
  BLASIUS_MAX_RE,
} from '@/lib/calc/hydraulicBalance';

const DEFAULT_SEGMENTS = '30,53,20,2.5;15,40,12,1.5';

describe('H17 水力平衡 / 最不利环路', () => {
  it('默认锚点：2 段、总压降 93.6891 kPa、水头 9.5504 m、第 1 段最不利', () => {
    const r = hydraulicBalance({ segments: DEFAULT_SEGMENTS, nearLoopKPa: 0 });
    // 独立复算（20℃ 水、Blasius）：
    // 段1 d=53mm → v=3.7772622069988215 m/s，Re=200194.89697093755，
    //      λ=0.014957989501781338，沿程 40267.21756792629 Pa、局部 17834.63722552701 Pa
    // 段2 d=40mm → v=3.315727981081153 m/s，Re=132629.11924324615，
    //      λ=0.016579703262040883，沿程 27341.718081847514 Pa、局部 8245.539033393376 Pa
    // 合计 93689.11190869419 Pa → 93.68911190869419 kPa，水头 93689.1119/9810 = 9.550368 m
    expect(r.valid).toBe(true);
    expect(r.segmentCount).toBe(2);
    expect(r.skippedLines).toBe(0);
    expect(r.totalPa).toBeCloseTo(93689.11190869419, 3);
    expect(r.totalKPa).toBeCloseTo(93.68911190869419, 6);
    expect(r.headM).toBeCloseTo(9.550368186411232, 6);
    expect(r.worstSegmentIndex).toBe(1);
    expect(r.worstSegmentPa).toBeCloseTo(58101.8547934533, 3);
    expect(r.imbalancePct).toBeNull();
    expect(r.balanceValveKPa).toBeNull();

    const s1 = r.segmentsDetail[0];
    expect(s1.velocity).toBeCloseTo(3.7772622069988215, 8);
    expect(s1.reynolds).toBeCloseTo(200194.89697093755, 3);
    expect(s1.frictionPa).toBeCloseTo(40267.21756792629, 3);
    expect(s1.localPa).toBeCloseTo(17834.63722552701, 3);
    expect(s1.totalPa).toBeCloseTo(58101.8547934533, 3);
    expect(r.note).toContain('Blasius');
    expect(WATER_NU).toBe(1e-6);
    expect(WATER_RHO).toBe(1000);
    expect(GRAVITY).toBe(9.81);
    expect(BLASIUS_MAX_RE).toBe(1e5);
  });

  it('Q=0 的管段阻力记 0，不产生 Infinity（含 Re=0 的 64/Re 除零）', () => {
    const r = hydraulicBalance({ segments: '0,100,10,2;0,50,5,1', nearLoopKPa: 0 });
    expect(r.valid).toBe(true);
    expect(r.segmentCount).toBe(2);
    expect(r.totalPa).toBe(0);
    expect(r.totalKPa).toBe(0);
    expect(r.headM).toBe(0);
    expect(r.worstSegmentPa).toBe(0);
    for (const s of r.segmentsDetail) {
      expect(s.velocity).toBe(0);
      expect(s.reynolds).toBe(0);
      expect(s.frictionPa).toBe(0);
      expect(s.localPa).toBe(0);
      expect(s.totalPa).toBe(0);
      expect(Number.isFinite(s.frictionPa)).toBe(true);
    }
  });

  it('层流段：λ=64/Re，沿程阻力满足闭式 0.032·v·L/d²', () => {
    // Q=0.1 m³/h、d=100mm → v=0.0035367765131532297 m/s，Re=353.6777 < 2300
    // 层流化简：frictionPa = 0.032 × v × L / d² = 0.11317684842090334 Pa
    const r = hydraulicBalance({ segments: '0.1,100,10,1', nearLoopKPa: 0 });
    expect(r.valid).toBe(true);
    expect(r.segmentsDetail[0].reynolds).toBeCloseTo(353.67765131532303, 6);
    expect(r.segmentsDetail[0].frictionPa).toBeCloseTo(0.11317684842090334, 8);
    expect(r.segmentsDetail[0].localPa).toBeCloseTo(0.006254394051996159, 9);
    expect(r.segmentsDetail[0].totalPa).toBeCloseTo(0.11943124247289949, 8);
  });

  it('解析：非法行被跳过并计数，空白行忽略', () => {
    const r = hydraulicBalance({
      segments: 'bad;1,2,3;0,-1,2,3;10,50,-5,1;10,50,5,-1;10,50,10,2;  ;',
      nearLoopKPa: 0,
    });
    expect(r.valid).toBe(true);
    expect(r.skippedLines).toBe(5);
    expect(r.segmentCount).toBe(1);
    // 单段 10 m³/h、DN50、10 m、ζ=2 → 5884.360491739094 Pa = 5.884360491739094 kPa
    expect(r.totalKPa).toBeCloseTo(5.884360491739094, 8);
    expect(r.worstSegmentIndex).toBe(1);
    expect(r.note).toContain('已跳过 5 行');
  });

  it('不平衡率：近端 1 kPa → 83.0058%，需附加阻力 4.8844 kPa 并提示平衡阀', () => {
    const r = hydraulicBalance({ segments: '10,50,10,2', nearLoopKPa: 1 });
    // (5.884360491739094 − 1)/5.884360491739094 × 100 = 83.00579984173514 %
    expect(r.imbalancePct).toBeCloseTo(83.00579984173514, 6);
    expect(r.balanceValveKPa).toBeCloseTo(4.884360491739094, 8);
    expect(r.note).toContain('静态平衡阀');
    expect(r.note).toContain('超过 15%');
  });

  it('边界：全部行非法 → valid=false 且中文说明；极大值溢出 → valid=false', () => {
    const allBad = hydraulicBalance({ segments: 'x;1,2,3;4,0,1,1', nearLoopKPa: 0 });
    expect(allBad.valid).toBe(false);
    expect(allBad.segmentCount).toBe(0);
    expect(allBad.skippedLines).toBe(3);
    expect(allBad.note).toContain('没有可计算的有效管段');

    const huge = hydraulicBalance({ segments: '1e308,1e-300,10,1', nearLoopKPa: 0 });
    expect(huge.valid).toBe(false);
    expect(huge.note).toContain('溢出');
    expect(Number.isFinite(huge.totalPa)).toBe(true);
  });
});
