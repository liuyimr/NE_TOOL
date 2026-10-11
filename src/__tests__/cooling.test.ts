import { describe, expect, it } from 'vitest';
import { coolingBilling } from '@/lib/calc/cooling';

describe('B9 冷量计费', () => {
  it('Q = ρ·V·c·ΔT', () => {
    const r = coolingBilling({ flowM3h: 10, returnTemp: 12, supplyTemp: 7, hours: 8 });
    // 质量流量 = 1000×10/3600 kg/s；功率 = ×4.186×5
    expect(r.deltaT).toBe(5);
    expect(r.powerKW).toBeCloseTo(58.139, 2);
    expect(r.energyKWh).toBeCloseTo(58.139 * 8, 1);
  });

  it('含单价时计算费用', () => {
    const r = coolingBilling({
      flowM3h: 10,
      returnTemp: 12,
      supplyTemp: 7,
      hours: 8,
      pricePerKWh: 0.6,
    });
    expect(r.costYuan).toBeCloseTo(r.energyKWh * 0.6, 6);
  });

  it('温差为负（制热）也成立', () => {
    const r = coolingBilling({ flowM3h: 5, returnTemp: 5, supplyTemp: 10, hours: 1 });
    expect(r.deltaT).toBe(-5);
    expect(r.powerKW).toBeLessThan(0);
  });
});
