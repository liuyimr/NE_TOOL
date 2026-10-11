/**
 * B8 · 中央空调时间型计费计算（纯函数）
 * 公式（PRD #12）：计费用量 = Σ(运行时长 × 档位权重)；费用 = 用量 × 单价
 * 金额精度：单价以「分」为单位累加，规避浮点误差。
 */

export interface BillingTier {
  /** 档位名，如 '高' | '中' | '低' */
  name: string;
  /** 运行时长（小时） */
  hours: number;
  /** 档位权重（如 高=1.0 / 中=0.7 / 低=0.4） */
  weight: number;
}

export interface BillingInput {
  /** 该 FCU 数量 */
  fcuCount?: number;
  /** 各档位运行情况 */
  tiers: BillingTier[];
  /** 单价（元 / 计费用量单位） */
  unitPriceYuan: number;
}

export interface BillingResult {
  /** 单台计费用量（h·权重） */
  usagePerUnit: number;
  /** FCU 数量 */
  fcuCount: number;
  /** 计费用量合计 */
  totalUsage: number;
  /** 单价（分） */
  unitPriceCents: number;
  /** 费用（分，整数） */
  totalCents: number;
  /** 费用（元） */
  totalYuan: number;
}

/** 元 → 分（四舍五入到整数分） */
export function yuanToCents(yuan: number): number {
  return Math.round((yuan || 0) * 100);
}

/** 分 → 元 */
export function centsToYuan(cents: number): number {
  return cents / 100;
}

/**
 * 单台 FCU 的计费用量：Σ(运行时长 × 档位权重)
 * 统一「时长校验/钳制」规则：负时长按 0 计（与单条路径保持完全一致）。
 * 单条 timeBilling 与批量 timeBillingBatch 共用此函数，消除两条路径的行为分叉。
 * @param tiers 各档位运行情况
 */
function unitUsage(tiers: BillingTier[]): number {
  return (tiers ?? []).reduce(
    (sum, tier) => sum + Math.max(0, tier.hours || 0) * (tier.weight || 0),
    0,
  );
}

/**
 * 时间型计费：单台与合计
 * @param input 输入参数
 */
export function timeBilling(input: BillingInput): BillingResult {
  const fcuCount = input.fcuCount && input.fcuCount > 0 ? input.fcuCount : 1;
  const usagePerUnit = unitUsage(input.tiers);
  const totalUsage = usagePerUnit * fcuCount;
  const unitPriceCents = yuanToCents(input.unitPriceYuan);
  // 用量可能为小数 → 以「分」为整数：用量 × 单价分，四舍五入
  const totalCents = Math.round(totalUsage * unitPriceCents);

  return {
    usagePerUnit,
    fcuCount,
    totalUsage,
    unitPriceCents,
    totalCents,
    totalYuan: centsToYuan(totalCents),
  };
}

/**
 * 多台 FCU 计费汇总（各 FCU 档位不同）
 * 时长校验/钳制复用 unitUsage，与单条 timeBilling 行为一致（负时长按 0 计）。
 * @param units 各 FCU 的档位配置
 * @param unitPriceYuan 单价（元）
 */
export function timeBillingBatch(
  units: BillingTier[][],
  unitPriceYuan: number,
): { perUnitUsage: number[]; totalUsage: number; totalCents: number; totalYuan: number } {
  const unitPriceCents = yuanToCents(unitPriceYuan);
  const perUnitUsage = (units ?? []).map(unitUsage);
  const totalUsage = perUnitUsage.reduce((a, b) => a + b, 0);
  const totalCents = Math.round(totalUsage * unitPriceCents);
  return { perUnitUsage, totalUsage, totalCents, totalYuan: centsToYuan(totalCents) };
}
