/**
 * H13 · 风管尺寸选择（纯函数）
 * 由风量与推荐风速反算所需截面积 A = Q/(3600·v)，再给出圆形直径或矩形标准规格。
 * 矩形规格取常用标准宽度/高度序列，按长宽比上限择优选型，并回算实际风速。
 */

/** 矩形风管标准规格（mm，常用序列） */
export const RECT_DUCT_SIZES = [120, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500];

/** 风管型式 */
export type DuctShape = 'rect' | 'round';

export interface DuctSizeInput {
  /** 风量（m³/h） */
  flowM3h: number;
  /** 推荐风速（m/s），必须 >0 */
  velocity: number;
  /** 风管型式（默认圆形） */
  shape?: DuctShape;
  /** 矩形长宽比上限（默认 4） */
  aspectMax?: number;
}

export interface DuctSizeResult {
  /** 输入是否有效（风速必须 >0） */
  valid: boolean;
  /** 所需截面积（m²） */
  areaM2: number;
  /** 圆形直径（mm） */
  roundDiaMm: number;
  /** 矩形宽（mm）；圆形时为 null */
  rectW: number | null;
  /** 矩形高（mm）；圆形时为 null */
  rectH: number | null;
  /** 实际风速（m/s） */
  actualVelocity: number;
  /** 是否超过推荐风速 */
  exceeds: boolean;
}

/** 在标准规格中找到不小于 need 的最小值 */
function ceilToSize(need: number): number | null {
  return RECT_DUCT_SIZES.find((s) => s >= need) ?? null;
}

/**
 * 风管尺寸选择
 * @param input 输入参数
 */
export function ductSize(input: DuctSizeInput): DuctSizeResult {
  const flow = Number.isFinite(input.flowM3h) && input.flowM3h > 0 ? input.flowM3h : 0;
  const v = input.velocity;

  if (!(Number.isFinite(v) && v > 0)) {
    return {
      valid: false,
      areaM2: 0,
      roundDiaMm: 0,
      rectW: null,
      rectH: null,
      actualVelocity: 0,
      exceeds: false,
    };
  }

  const areaM2 = flow / 3600 / v;
  const roundDiaMm = Math.sqrt((4 * areaM2) / Math.PI) * 1000;

  const shape: DuctShape = input.shape === 'rect' ? 'rect' : 'round';
  if (shape === 'round') {
    return {
      valid: flow > 0,
      areaM2,
      roundDiaMm,
      rectW: null,
      rectH: null,
      actualVelocity: v,
      exceeds: false,
    };
  }

  const aspectMax = input.aspectMax && input.aspectMax >= 1 ? input.aspectMax : 4;
  let rectW: number | null = null;
  let rectH: number | null = null;
  let actualVelocity = 0;

  for (const h of RECT_DUCT_SIZES) {
    const needW = (areaM2 * 1e6) / h; // mm
    const w = ceilToSize(needW);
    if (w !== null && w / h <= aspectMax) {
      rectH = h;
      rectW = w;
      actualVelocity = flow / 3600 / ((w / 1000) * (h / 1000));
      break;
    }
  }

  // 极端情况兜底：取最大规格，允许长宽比超限，避免返回 null
  if (rectW === null || rectH === null) {
    const h = RECT_DUCT_SIZES[RECT_DUCT_SIZES.length - 1];
    const w = RECT_DUCT_SIZES[RECT_DUCT_SIZES.length - 1];
    rectH = h;
    rectW = w;
    actualVelocity = flow / 3600 / ((w / 1000) * (h / 1000));
  }

  return {
    valid: flow > 0,
    areaM2,
    roundDiaMm,
    rectW,
    rectH,
    actualVelocity,
    exceeds: actualVelocity > v + 1e-6,
  };
}
