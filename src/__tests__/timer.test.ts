import { describe, expect, it } from 'vitest';
import { humanizeMillis, timerConvert, timerMillis } from '@/lib/calc/timer';

describe('C14 定时器换算', () => {
  it('时基 × 设定值 = 实际时间(ms)', () => {
    expect(timerMillis(1000, 60)).toBe(60000);
    expect(timerMillis(100, 30)).toBe(3000);
    expect(timerMillis(10, 100)).toBe(1000);
  });

  it('单位互转', () => {
    const r = timerConvert(2, 'min');
    expect(r.s).toBeCloseTo(120, 6);
    expect(r.ms).toBeCloseTo(120000, 6);
    expect(r.h).toBeCloseTo(2 / 60, 6);
  });

  it('人类可读', () => {
    expect(humanizeMillis(60000)).toContain('1 分');
    expect(humanizeMillis(1000)).toContain('1 秒');
  });

  it('负值/非法安全', () => {
    expect(timerMillis(-5, 10)).toBe(0);
    expect(humanizeMillis(-1)).toBe('—');
  });
});
