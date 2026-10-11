import { describe, expect, it } from 'vitest';
import {
  approxEqual,
  fixed,
  formatBytes,
  formatNumber,
  formatSI,
  round,
  roundSig,
  thousands,
} from '@/lib/format';

describe('数值格式化', () => {
  it('round 小数位', () => {
    expect(round(1.005, 2)).toBeCloseTo(1.01, 2);
    expect(round(3.14159, 3)).toBeCloseTo(3.142, 3);
  });

  it('roundSig 有效数字', () => {
    expect(roundSig(123456, 3)).toBe(123000);
    expect(roundSig(0.0012345, 2)).toBeCloseTo(0.0012, 6);
  });

  it('formatNumber 自适应', () => {
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(3.14159)).toBe('3.142');
  });

  it('thousands 千分位', () => {
    expect(thousands(1234567)).toBe('1,234,567');
  });

  it('fixed 固定小数位', () => {
    expect(fixed(1.5, 3)).toBe('1.500');
  });

  it('formatSI / formatBytes', () => {
    expect(formatSI(1500, 'Hz')).toBe('1.5 kHz');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('approxEqual 容差', () => {
    expect(approxEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(approxEqual(1, 1.001)).toBe(false);
  });
});
