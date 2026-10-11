import { describe, expect, it } from 'vitest';
import { lightningProtection, ROLLING_SPHERE, MAX_DOWNLEADER_SPACING } from '@/lib/calc/waterLightning';

describe('D15 防雷保护范围（滚球法）', () => {
  it('三类 h_r=60，杆高 10m 地面保护半径 √(h(2hr−h))', () => {
    const r = lightningProtection({ rodHeight: 10, protectedHeight: 0, protectionClass: 'III' });
    expect(r.rollingSphere).toBe(60);
    expect(r.groundRadius).toBeCloseTo(Math.sqrt(10 * (120 - 10)), 4);
    expect(r.protectedRadius).toBeCloseTo(r.groundRadius, 6);
  });

  it('被保护高度越高，保护半径越小', () => {
    const ground = lightningProtection({ rodHeight: 10, protectedHeight: 0, protectionClass: 'III' });
    const high = lightningProtection({ rodHeight: 10, protectedHeight: 5, protectionClass: 'III' });
    expect(high.protectedRadius).toBeLessThan(ground.protectedRadius);
  });

  it('一类滚球半径最小 → 同高度保护半径最小', () => {
    const a = lightningProtection({ rodHeight: 10, protectedHeight: 0, protectionClass: 'I' });
    const c = lightningProtection({ rodHeight: 10, protectedHeight: 0, protectionClass: 'III' });
    expect(a.groundRadius).toBeLessThan(c.groundRadius);
  });

  it('超出滚球半径的高度按 h_r 处理', () => {
    const r = lightningProtection({ rodHeight: 100, protectionClass: 'III' });
    expect(r.effectiveHeight).toBe(60);
    expect(r.groundRadius).toBeCloseTo(Math.sqrt(60 * (120 - 60)), 4);
  });

  it('给定周长估算引下线根数（三类间距 20m）', () => {
    const r = lightningProtection({ rodHeight: 10, protectionClass: 'III', perimeter: 200 });
    expect(r.maxSpacing).toBe(MAX_DOWNLEADER_SPACING.III);
    expect(r.downLeaders).toBe(10);
  });

  it('边界：杆高 0 → 半径 0；未给周长 → 引下线 0', () => {
    const r = lightningProtection({ rodHeight: 0 });
    expect(r.groundRadius).toBe(0);
    expect(r.downLeaders).toBe(0);
    expect(ROLLING_SPHERE.III).toBe(60);
  });
});
