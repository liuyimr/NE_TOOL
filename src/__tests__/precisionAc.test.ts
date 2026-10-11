import { describe, expect, it } from 'vitest';
import { precisionAc } from '@/lib/calc/precisionAc';

describe('B6 精密空调制冷量', () => {
  it('IT 负荷放大 + 建筑负荷 + 余量', () => {
    const r = precisionAc({
      itLoadKW: 20,
      area: 50,
      buildingLoadWPerM2: 60,
      itFactor: 1.15,
      margin: 1.1,
    });
    expect(r.itCoolingKW).toBeCloseTo(23, 6);
    expect(r.buildingCoolingKW).toBeCloseTo(3, 6);
    expect(r.totalKW).toBeCloseTo(28.6, 6);
    expect(r.totalBTU).toBeCloseTo(28.6 * 3412, 3);
  });

  it('面积为零时仅 IT 负荷', () => {
    const r = precisionAc({ itLoadKW: 10, itFactor: 1, margin: 1 });
    expect(r.totalKW).toBeCloseTo(10, 6);
  });

  it('冷吨换算', () => {
    const r = precisionAc({ itLoadKW: 3.5168525, itFactor: 1, margin: 1 });
    expect(r.tonsRT).toBeCloseTo(1, 6);
  });
});
