/**
 * 防雷保护范围（滚球法）（纯函数）
 * 依据（GB 50057）：按防雷类别取滚球半径 h_r：一类 30 m、二类 45 m、三类 60 m。
 * 单支接闪杆在高度 h_x 处的保护半径：
 *   r_x = √(h·(2h_r − h)) − √(h_x·(2h_r − h_x))
 * 地面（h_x = 0）保护半径 r = √(h·(2h_r − h))。
 * 引下线：按类别最大间距估算所需根数（一/二/三类 10/15/20 m）。
 */

/** 防雷保护类别 */
export type ProtectionClass = 'I' | 'II' | 'III';

/** 类别 → 滚球半径 h_r（m） */
export const ROLLING_SPHERE: Record<ProtectionClass, number> = { I: 30, II: 45, III: 60 };

/** 类别 → 引下线最大间距（m） */
export const MAX_DOWNLEADER_SPACING: Record<ProtectionClass, number> = {
  I: 10,
  II: 15,
  III: 20,
};

export interface LightningInput {
  /** 接闪杆相对地面高度 h（m） */
  rodHeight: number;
  /** 被保护物高度 h_x（m，相对地面；默认 0，即地面） */
  protectedHeight?: number;
  /** 防雷类别（默认 III 类） */
  protectionClass?: ProtectionClass;
  /** 建筑物周长（m，可选，用于估算引下线根数） */
  perimeter?: number;
}

export interface LightningResult {
  /** 滚球半径 h_r（m） */
  rollingSphere: number;
  /** 接闪杆有效高度（不超过 h_r） */
  effectiveHeight: number;
  /** 被保护高度 h_x（m） */
  protectedHeight: number;
  /** h_x 处保护半径 r_x（m） */
  protectedRadius: number;
  /** 地面保护半径 r（m） */
  groundRadius: number;
  /** 所需引下线根数（未给周长时为 0） */
  downLeaders: number;
  /** 引下线最大间距（m） */
  maxSpacing: number;
}

/**
 * 防雷保护范围（滚球法，单支接闪杆）
 * @param input 输入参数
 */
export function lightningProtection(input: LightningInput): LightningResult {
  const cls = input.protectionClass ?? 'III';
  const hr = ROLLING_SPHERE[cls];
  const maxSpacing = MAX_DOWNLEADER_SPACING[cls];
  // 接闪杆高度不得超过滚球半径，超出时按 h_r 处理（r 取最大值）
  const effectiveHeight = Math.min(Math.max(0, input.rodHeight || 0), hr);
  const protectedHeight = Math.min(Math.max(0, input.protectedHeight || 0), hr);

  const baseR = Math.sqrt(Math.max(0, effectiveHeight * (2 * hr - effectiveHeight)));
  const atHx = Math.sqrt(Math.max(0, protectedHeight * (2 * hr - protectedHeight)));
  const protectedRadius = Math.max(0, baseR - atHx);
  const groundRadius = baseR;

  const perimeter = Math.max(0, input.perimeter || 0);
  const downLeaders = perimeter > 0 ? Math.max(2, Math.ceil(perimeter / maxSpacing)) : 0;

  return {
    rollingSphere: hr,
    effectiveHeight,
    protectedHeight,
    protectedRadius,
    groundRadius,
    downLeaders,
    maxSpacing,
  };
}
