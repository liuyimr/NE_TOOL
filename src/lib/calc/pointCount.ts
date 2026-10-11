/**
 * B3 / B7 · 弱电点位统计与工程量估算（纯函数）
 * 汇总各类型点位数，并按 DDC / 单点点位容量反算控制器数量与余量。
 */

export interface PointItem {
  /** 点位类型，如 'AI' | 'DI' */
  type: string;
  /** 数量 */
  count: number;
}

export interface PointCountInput {
  /** 点位清单 */
  points: PointItem[];
  /** 单台 DDC/控制器点位数（默认 48） */
  capacityPerDdc?: number;
  /** 目标负载率（0-1，默认 0.8） */
  loadFactor?: number;
  /** 预留余量百分比（0-100，默认 20） */
  marginPct?: number;
}

export interface PointCountResult {
  /** 总点数 */
  total: number;
  /** 按类型统计 */
  byType: Record<string, number>;
  /** 单台容量 */
  capacityPerDdc: number;
  /** 含余量的有效设计点数 */
  designPoints: number;
  /** DDC 数量（向上取整） */
  ddcCount: number;
  /** 余量点位数 */
  marginPoints: number;
}

/**
 * 点位统计与 DDC 数量估算
 * @param input 输入参数
 */
export function pointCount(input: PointCountInput): PointCountResult {
  const byType: Record<string, number> = {};
  let total = 0;
  for (const item of input.points ?? []) {
    const c = Math.max(0, item.count || 0);
    byType[item.type] = (byType[item.type] ?? 0) + c;
    total += c;
  }

  const capacityPerDdc = input.capacityPerDdc && input.capacityPerDdc > 0 ? input.capacityPerDdc : 48;
  const loadFactor = input.loadFactor && input.loadFactor > 0 ? input.loadFactor : 0.8;
  const marginPct = input.marginPct && input.marginPct >= 0 ? input.marginPct : 20;

  const marginPoints = Math.ceil((total * marginPct) / 100);
  const designPoints = total + marginPoints;
  const ddcCount = capacityPerDdc > 0 ? Math.ceil(designPoints / (capacityPerDdc * loadFactor)) : 0;

  return { total, byType, capacityPerDdc, designPoints, ddcCount, marginPoints };
}
