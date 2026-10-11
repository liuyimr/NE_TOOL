/**
 * B1 · 综合布线线缆长度估算（纯函数）
 * 公式（PRD #9）：L = (水平距离 + 垂直距离) × 点数 × 余量系数
 */

export interface CableLengthInput {
  /** 总点数 */
  points: number;
  /** 平均水平距离（m） */
  horizontal: number;
  /** 垂直距离（m） */
  vertical: number;
  /** 余量系数（默认 1.1） */
  margin?: number;
  /** 单箱/单卷线缆长度（m，默认 305） */
  boxLength?: number;
}

export interface CableLengthResult {
  /** 单点平均长度（m） */
  perPoint: number;
  /** 总长度（m，含余量） */
  totalLength: number;
  /** 需要的箱数 */
  boxes: number;
  /** 所用余量系数 */
  margin: number;
}

/**
 * 线缆长度估算
 * @param input 输入参数
 */
export function cableLength(input: CableLengthInput): CableLengthResult {
  const margin = input.margin && input.margin > 0 ? input.margin : 1.1;
  const boxLength = input.boxLength && input.boxLength > 0 ? input.boxLength : 305;
  const perPoint = Math.max(0, input.horizontal || 0) + Math.max(0, input.vertical || 0);
  const totalLength = perPoint * Math.max(0, input.points || 0) * margin;
  const boxes = totalLength > 0 ? Math.ceil(totalLength / boxLength) : 0;
  return { perPoint, totalLength, boxes, margin };
}
