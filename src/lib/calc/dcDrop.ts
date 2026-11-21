/**
 * E18 · 24V DC 供电压降与线径（纯函数）
 * ------------------------------------------------------------------
 * 直流回路为「去 + 回」两倍长度：
 *   ΔU = 2 · ρ · L · I / S
 *   pct = ΔU / V · 100
 *   U_end = V − ΔU
 * 反算：
 *   满足允许压降的最大单程长度  L_max = (V · pct%/100) · S / (2 · ρ · I)
 *   满足允许压降的最小截面      S_min = 2 · ρ · L · I / (V · pct%/100)
 * ρ（Ω·mm²/m，20℃）：铜 0.0175、铝 0.0282。
 * 典型场景：门禁电锁、风阀/水阀执行器、弱电箱 24V 长距离供电，
 *   末端电压不足（<21.6V，即 −10%）导致电锁吸合无力、执行器不动作是最常见故障。
 */

/** 导体材质 */
export type DcMaterial = 'copper' | 'aluminum';

/** 电阻率 ρ（Ω·mm²/m，20℃） */
export const DC_RESISTIVITY: Record<DcMaterial, number> = {
  copper: 0.0175,
  aluminum: 0.0282,
};

/** 常用标准截面档位（mm²） */
export const STANDARD_SECTIONS_MM2: number[] = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25];

/** 输入参数 */
export interface DcDropInput {
  /** 负载电流（A） */
  currentA: number;
  /** 单程线路长度（m） */
  lengthM: number;
  /** 导体截面（mm²） */
  sectionMm2: number;
  /** 材质（默认铜） */
  material?: DcMaterial;
  /** 系统电压（V，默认 24） */
  systemV?: number;
  /** 允许压降百分比（%，默认 10） */
  allowablePct?: number;
}

/** 计算结果 */
export interface DcDropResult {
  /** 输入是否有效（无效时数值字段全 0、compliant=false） */
  valid: boolean;
  /** 压降（V） */
  deltaV: number;
  /** 压降百分比（%） */
  pct: number;
  /** 末端电压（V） */
  endV: number;
  /** 满足允许压降的最大单程长度（m；电流为 0 时置 0） */
  maxLengthM: number;
  /** 满足允许压降的最小截面（mm²） */
  minSectionMm2: number;
  /** 就近推荐的标准截面（mm²） */
  recommendedSectionMm2: number;
  /** 是否合规（pct ≤ allowablePct） */
  compliant: boolean;
}

/** 判定是否为有限数 */
function isFiniteNum(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 从标准截面档中取第一个 ≥ 目标值的档位（超出则取最大档）
 * @param target 目标截面（mm²）
 * @param sections 标准档位（升序）
 */
export function pickStandardSection(target: number, sections = STANDARD_SECTIONS_MM2): number {
  if (!isFiniteNum(target) || target <= 0) return sections[0];
  for (const s of sections) if (s >= target) return s;
  return sections[sections.length - 1];
}

/**
 * 24V（或任意直流系统）供电压降计算
 * @param input 输入参数
 */
export function dcDrop(input: DcDropInput): DcDropResult {
  const material = input.material ?? 'copper';
  const rho = DC_RESISTIVITY[material];
  const systemV = input.systemV ?? 24;
  const allowablePct = input.allowablePct ?? 10;

  const raw = [input.currentA, input.lengthM, input.sectionMm2, systemV, allowablePct];
  const invalid =
    !raw.every(isFiniteNum) ||
    input.currentA < 0 ||
    input.lengthM < 0 ||
    input.sectionMm2 <= 0 ||
    systemV <= 0 ||
    allowablePct <= 0;

  if (invalid) {
    return {
      valid: false,
      deltaV: 0,
      pct: 0,
      endV: 0,
      maxLengthM: 0,
      minSectionMm2: 0,
      recommendedSectionMm2: STANDARD_SECTIONS_MM2[0],
      compliant: false,
    };
  }

  const deltaV = (2 * rho * input.lengthM * input.currentA) / input.sectionMm2;
  const pct = (deltaV / systemV) * 100;
  const endV = systemV - deltaV;
  const allowedV = (systemV * allowablePct) / 100;
  // 电流为 0 时最大长度无意义，置 0（避免 Infinity 进入展示层）
  const maxLengthM =
    input.currentA > 0 ? (allowedV * input.sectionMm2) / (2 * rho * input.currentA) : 0;
  const minSectionMm2 = (2 * rho * input.lengthM * input.currentA) / allowedV;

  return {
    valid: true,
    deltaV,
    pct,
    endV,
    maxLengthM,
    minSectionMm2,
    recommendedSectionMm2: pickStandardSection(minSectionMm2),
    compliant: pct <= allowablePct,
  };
}
