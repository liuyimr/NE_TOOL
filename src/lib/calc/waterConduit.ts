/**
 * S9 · 穿线管管径选择与填充率（纯函数）
 * 判据（PRD #9）：Σ导线外截面 ≤ 40%×管内截面（3 根及以上）/ ≤ 60%（2 根）；
 * 且管内径 ≥ 1.5×线束外径。
 * 说明：导线外径取常用 BV 单芯线（450/750V）含绝缘的近似外径；线束外径按等圆束等效
 *      直径 √n·d 估算；管材内径取常用 PVC/钢导管公称内径近似值。结果用于初选，施工以实物为准。
 */

/** 常用 BV 单芯线外径（mm，含绝缘，近似值） */
const WIRE_OD: Record<number, number> = {
  1.5: 2.8,
  2.5: 3.2,
  4: 3.6,
  6: 4.4,
  10: 5.6,
  16: 7.0,
  25: 8.8,
  35: 10.0,
  50: 11.5,
  70: 13.0,
  95: 15.0,
};

/** 标准管径（公称外径 → 近似内径，mm） */
const CONDUITS: { od: number; id: number }[] = [
  { od: 16, id: 12.8 },
  { od: 20, id: 16.5 },
  { od: 25, id: 21.0 },
  { od: 32, id: 27.0 },
  { od: 40, id: 34.0 },
  { od: 50, id: 42.0 },
  { od: 63, id: 53.0 },
];

export interface ConduitInput {
  /** 单根导线截面（mm²） */
  section: number;
  /** 导线根数 */
  count: number;
}

export interface ConduitResult {
  /** 单根导线外径（mm） */
  wireOd: number;
  /** 填充率允许上限（0.4 / 0.6） */
  allowance: number;
  /** 线束外径（mm） */
  bundleDia: number;
  /** 所需最小管内径（mm） */
  minConduitId: number;
  /** 推荐管径（公称外径，mm）；无可用标准管时为 null */
  recommendedOd: number | null;
  /** 推荐管内径（mm） */
  recommendedId: number;
  /** 实际填充率（%） */
  fillRate: number;
  /** 是否满足填充率要求 */
  fillOk: boolean;
  /** 是否满足 管内径 ≥1.5×线束外径 */
  minDiaOk: boolean;
  /** 综合是否合规 */
  compliant: boolean;
}

/**
 * 穿线管管径选择
 * @param input 输入参数
 */
export function sizeConduit(input: ConduitInput): ConduitResult {
  const section = input.section > 0 ? input.section : 1.5;
  const count = input.count && input.count > 0 ? Math.floor(input.count) : 1;
  const wireOd = WIRE_OD[section] ?? Math.sqrt(section) * 2.2; // 未知截面按近似外径估算
  const allowance = count >= 3 ? 0.4 : 0.6;

  const bundleArea = count * Math.PI * (wireOd / 2) ** 2;
  const bundleDia = Math.sqrt(count) * wireOd;

  // 由填充率求所需内径
  const idFromFill = Math.sqrt((bundleArea / allowance) * (4 / Math.PI));
  // 由「内径 ≥1.5×线束外径」求所需内径
  const idFromBundle = 1.5 * bundleDia;
  const minConduitId = Math.max(idFromFill, idFromBundle);

  const chosen = CONDUITS.find((c) => c.id >= minConduitId) ?? null;
  const recommendedId = chosen?.id ?? 0;
  const fillRate = recommendedId > 0 ? (bundleArea / (Math.PI * (recommendedId / 2) ** 2)) * 100 : 0;

  const fillOk = chosen !== null && fillRate / 100 <= allowance + 1e-9;
  const minDiaOk = chosen !== null && recommendedId >= idFromBundle - 1e-9;

  return {
    wireOd,
    allowance,
    bundleDia,
    minConduitId,
    recommendedOd: chosen?.od ?? null,
    recommendedId,
    fillRate,
    fillOk,
    minDiaOk,
    compliant: fillOk && minDiaOk,
  };
}
