import { describe, expect, it } from 'vitest';
import { centsToYuan, timeBilling, timeBillingBatch, yuanToCents } from '@/lib/calc/billing';

describe('B8 中央空调时间型计费', () => {
  it('金额以整数分累加', () => {
    expect(yuanToCents(1.23)).toBe(123);
    expect(centsToYuan(2400)).toBe(24);
  });

  it('单台用量 = Σ(时长 × 权重)', () => {
    const r = timeBilling({
      fcuCount: 1,
      tiers: [
        { name: '高', hours: 10, weight: 1.0 },
        { name: '中', hours: 20, weight: 0.7 },
      ],
      unitPriceYuan: 1,
    });
    expect(r.usagePerUnit).toBeCloseTo(24, 10);
    expect(r.totalUsage).toBeCloseTo(24, 10);
    expect(r.unitPriceCents).toBe(100);
    expect(r.totalCents).toBe(2400);
    expect(r.totalYuan).toBe(24);
  });

  it('多台 FCU 计数', () => {
    const r = timeBilling({
      fcuCount: 5,
      tiers: [{ name: '高', hours: 2, weight: 1 }],
      unitPriceYuan: 0.5,
    });
    expect(r.totalUsage).toBeCloseTo(10, 10);
    expect(r.totalCents).toBe(500); // 10 × 50 分
  });

  it('批量各 FCU 汇总', () => {
    const r = timeBillingBatch(
      [
        [{ name: '高', hours: 10, weight: 1 }],
        [{ name: '中', hours: 10, weight: 0.5 }],
      ],
      1,
    );
    expect(r.perUnitUsage).toEqual([10, 5]);
    expect(r.totalUsage).toBe(15);
    expect(r.totalCents).toBe(1500);
  });

  it('批量与单条对负时长使用同一套钳制（均按 0 计）', () => {
    const tiers = [
      { name: '高', hours: -5, weight: 1.0 },
      { name: '中', hours: 10, weight: 0.7 },
    ];
    // 单条：-5 按 0 计 → 仅 10 × 0.7 = 7
    const single = timeBilling({ fcuCount: 1, tiers, unitPriceYuan: 1 });
    expect(single.usagePerUnit).toBeCloseTo(7, 10);
    // 批量：应与单条一致（消除行为分叉）
    const batch = timeBillingBatch([tiers, [{ name: '低', hours: -3, weight: 1 }]], 1);
    expect(batch.perUnitUsage[0]).toBeCloseTo(7, 10);
    expect(batch.perUnitUsage[1]).toBe(0); // 全负时长 → 0
    expect(batch.totalUsage).toBeCloseTo(7, 10);
    expect(batch.totalCents).toBe(700);
  });
});
