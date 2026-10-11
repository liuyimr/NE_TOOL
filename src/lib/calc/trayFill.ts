/**
 * B2 · 桥架 / 管路填充率计算（纯函数）
 * 公式（PRD #7/#8）：填充率 = Σ线缆截面积 ÷ 桥架(管)截面积 × 100%
 * 限值（PRD 速查 #8）：电力桥架 ≤40%、弱电桥架 ≤50%、穿管 ≤40%。
 */

export type FillKind = 'power' | 'weak' | 'conduit';

export interface CableItem {
  /** 数量 */
  count: number;
  /** 单根线缆外径截面（mm²，含绝缘/护层） */
  section: number;
}

export interface TrayFillInput {
  /** 线缆清单 */
  cables: CableItem[];
  /** 桥架/管 内截面积（mm²）；若为空则用宽 × 高 计算 */
  containerArea?: number;
  /** 桥架宽度（mm） */
  width?: number;
  /** 桥架高度（mm） */
  height?: number;
  /** 敷设类型，决定限值 */
  kind: FillKind;
}

export interface TrayFillResult {
  /** 线缆占位总面积（mm²） */
  cableArea: number;
  /** 容器截面积（mm²） */
  containerArea: number;
  /** 填充率（%） */
  fillRate: number;
  /** 限值（%） */
  limit: number;
  /** 是否合规 */
  compliant: boolean;
}

/** 敷设类型 → 限值 */
export const FILL_LIMITS: Record<FillKind, number> = {
  power: 40,
  weak: 50,
  conduit: 40,
};

/**
 * 桥架 / 管路填充率
 * @param input 输入参数
 */
export function trayFill(input: TrayFillInput): TrayFillResult {
  const cableArea = (input.cables ?? []).reduce(
    (sum, item) => sum + Math.max(0, item.count || 0) * Math.max(0, item.section || 0),
    0,
  );

  let containerArea = input.containerArea ?? 0;
  if (!containerArea && input.width && input.height) {
    containerArea = input.width * input.height;
  }

  const fillRate = containerArea > 0 ? (cableArea / containerArea) * 100 : 0;
  const limit = FILL_LIMITS[input.kind] ?? 40;

  return {
    cableArea,
    containerArea,
    fillRate,
    limit,
    compliant: containerArea > 0 && fillRate <= limit,
  };
}
