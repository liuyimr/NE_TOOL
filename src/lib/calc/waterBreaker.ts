/**
 * S6 · 断路器选型与导线配合（纯函数）
 * 判据（PRD #7）：I_b ≤ I_n ≤ I_z 且 I₂ ≤ 1.45·I_z
 * 其中 I₂ 为断路器约定不熔断电流（家用/小型断路器取 1.45·I_n，IEC 60898）；
 * 脱扣曲线按负载类型推荐：B（阻性/长线路）、C（一般/照明）、D（电机/变压器）。
 */

/** 脱扣曲线 */
export type TripCurve = 'B' | 'C' | 'D';

/** 负载类型 */
export type LoadType = 'resistive' | 'lighting' | 'general' | 'motor' | 'transformer';

/** 常用断路器额定电流（A） */
export const STANDARD_RATINGS = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400,
];

export interface BreakerInput {
  /** 计算电流 I_b（A） */
  ib: number;
  /** 导线允许载流量 I_z（A） */
  iz: number;
  /** 负载类型 */
  loadType?: LoadType;
}

export interface BreakerResult {
  /** 推荐额定电流 I_n（A）；超出常用范围时为 null */
  recommendedIn: number | null;
  /** 推荐脱扣曲线 */
  curve: TripCurve;
  /** 约定不熔断电流 I₂（A） */
  i2: number;
  /** I_b ≤ I_n ≤ I_z 是否满足 */
  rangeOk: boolean;
  /** I₂ ≤ 1.45·I_z 是否满足 */
  thermalOk: boolean;
  /** 综合是否合规 */
  compliant: boolean;
}

/** 负载类型 → 推荐曲线 */
function curveForLoad(loadType: LoadType): TripCurve {
  switch (loadType) {
    case 'resistive':
      return 'B';
    case 'lighting':
      return 'C';
    case 'general':
      return 'C';
    case 'motor':
      return 'D';
    case 'transformer':
      return 'D';
    default:
      return 'C';
  }
}

/**
 * 断路器选型与导线配合校核
 * @param input 输入参数
 */
export function selectBreaker(input: BreakerInput): BreakerResult {
  const ib = Math.max(0, input.ib || 0);
  const iz = Math.max(0, input.iz || 0);
  const curve = curveForLoad(input.loadType ?? 'general');

  const recommendedIn = STANDARD_RATINGS.find((r) => r >= ib) ?? null;
  const inValue = recommendedIn ?? 0;
  const i2 = 1.45 * inValue;

  const rangeOk = recommendedIn !== null && inValue >= ib && inValue <= iz;
  const thermalOk = i2 <= 1.45 * iz;
  return {
    recommendedIn,
    curve,
    i2,
    rangeOk,
    thermalOk,
    compliant: rangeOk && thermalOk,
  };
}
