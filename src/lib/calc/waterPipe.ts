/**
 * W2 · 管径选择（按流量与流速）（纯函数）
 * 公式（PRD #15）：d = √(4Q/(π·v))，Q(m³/s)、v(m/s)、d(m) → mm
 * 说明：由设计流量与推荐流速反算所需管内径，再就近上取标准公称直径 DN，
 *      并回算该 DN 下的实际流速（用于与推荐流速区间比对）。
 */

/** 流量单位 */
export type FlowUnit = 'L/s' | 'm3/h';

/** 流量单位 → m³/s 换算系数 */
const FLOW_TO_M3S: Record<FlowUnit, number> = {
  'L/s': 0.001,
  'm3/h': 1 / 3600,
};

/** 标准公称直径 DN → 近似内径（mm，常用钢管/工程近似值），用于反算流速与就近选管 */
export const DN_INNER: { dn: number; id: number }[] = [
  { dn: 15, id: 15.7 },
  { dn: 20, id: 21.0 },
  { dn: 25, id: 27.0 },
  { dn: 32, id: 35.8 },
  { dn: 40, id: 41.0 },
  { dn: 50, id: 53.0 },
  { dn: 65, id: 68.0 },
  { dn: 80, id: 80.5 },
  { dn: 100, id: 106.0 },
  { dn: 125, id: 131.0 },
  { dn: 150, id: 156.0 },
];

/** 推荐流速区间（m/s）——供结果提示用，不参与强制判定 */
export const RECOMMENDED_VELOCITY: { min: number; max: number; note: string }[] = [
  { min: 0.6, max: 1.0, note: 'DN15~20' },
  { min: 0.8, max: 1.2, note: 'DN25~40' },
  { min: 1.1, max: 1.5, note: 'DN50~70' },
  { min: 1.2, max: 1.8, note: 'DN80 以上' },
];

export interface PipeSizeInput {
  /** 设计流量（按 unit 指定单位） */
  flow: number;
  /** 流量单位（默认 L/s） */
  flowUnit?: FlowUnit;
  /** 推荐流速（m/s，默认 1.0） */
  velocity?: number;
}

export interface PipeSizeResult {
  /** 计算流量（m³/s） */
  flowM3s: number;
  /** 采用流速（m/s） */
  velocity: number;
  /** 理论所需内径（mm） */
  computedDiaMm: number;
  /** 就近上取的标准公称直径 DN；超出常用范围时为 null */
  recommendedDn: number | null;
  /** 推荐 DN 对应内径（mm） */
  recommendedId: number;
  /** 推荐 DN 下的实际流速（m/s） */
  actualVelocity: number;
}

/**
 * 管径选择（按流量与流速反算）
 * @param input 输入参数
 */
export function pipeSize(input: PipeSizeInput): PipeSizeResult {
  const unit = input.flowUnit ?? 'L/s';
  const flowM3s = Math.max(0, input.flow || 0) * (FLOW_TO_M3S[unit] ?? 0.001);
  const velocity = input.velocity && input.velocity > 0 ? input.velocity : 1.0;

  const areaM2 = flowM3s / velocity; // 所需过流面积（m²）
  const computedDiaMm = Math.sqrt((4 * areaM2) / Math.PI) * 1000;

  const chosen = DN_INNER.find((d) => d.id >= computedDiaMm) ?? null;
  const recommendedId = chosen?.id ?? 0;
  const actualVelocity =
    recommendedId > 0 ? flowM3s / (Math.PI * (recommendedId / 1000 / 2) ** 2) : 0;

  return {
    flowM3s,
    velocity,
    computedDiaMm,
    recommendedDn: chosen?.dn ?? null,
    recommendedId,
    actualVelocity,
  };
}
