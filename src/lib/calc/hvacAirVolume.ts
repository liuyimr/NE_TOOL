/**
 * H12 · 送风量 / 新风量计算（纯函数）
 * 送风量：L = 3600·Q/(ρ·cp·Δt)，取 ρ=1.2 kg/m³、cp=1.01 kJ/(kg·K)
 *         → 3600/(1.2×1.01) ≈ 2970，即 L ≈ 2970·Q/Δt（m³/h，Q 为 kW）
 * 新风量：① 人数 × 人均新风量；② 换气次数 × 房间体积
 */

/** 送风量工程系数（3600/(1.2×1.01) 取整） */
export const SUPPLY_AIR_COEF = 2970;

/** 默认人均新风量 m³/(h·人) */
export const DEFAULT_FRESH_PER_PERSON = 30;

/** 新风口径 */
export type FreshAirMode = 'people' | 'ach';

export interface AirVolumeInput {
  /** 室内冷负荷（kW） */
  coolingLoadKw: number;
  /** 送风温差 Δt（℃） */
  supplyDeltaT: number;
  /** 新风口径（默认按人数） */
  freshMode?: FreshAirMode;
  /** 人数（按人数口径） */
  people?: number;
  /** 人均新风量（默认 30） */
  freshPerPerson?: number;
  /** 房间体积（m³，按换气次数口径） */
  volumeM3?: number;
  /** 换气次数（次/h，按换气次数口径） */
  ach?: number;
}

export interface AirVolumeResult {
  /** 输入是否有效（ΔT 必须 >0） */
  valid: boolean;
  /** 送风量（m³/h） */
  supplyM3h: number;
  /** 新风量（m³/h） */
  freshM3h: number;
  /** 新风比（%） */
  freshRatioPct: number;
  /** 采用的送风系数 */
  supplyCoef: number;
}

/**
 * 送风量 / 新风量计算
 * @param input 输入参数
 */
export function hvacAirVolume(input: AirVolumeInput): AirVolumeResult {
  const q = Number.isFinite(input.coolingLoadKw) && input.coolingLoadKw > 0 ? input.coolingLoadKw : 0;
  const dt = input.supplyDeltaT;

  if (!(Number.isFinite(dt) && dt > 0)) {
    return { valid: false, supplyM3h: 0, freshM3h: 0, freshRatioPct: 0, supplyCoef: SUPPLY_AIR_COEF };
  }

  const supplyM3h = (SUPPLY_AIR_COEF * q) / dt;

  const mode: FreshAirMode = input.freshMode === 'ach' ? 'ach' : 'people';
  let freshM3h = 0;
  if (mode === 'ach') {
    const vol = Number.isFinite(input.volumeM3) && (input.volumeM3 as number) > 0 ? (input.volumeM3 as number) : 0;
    const ach = Number.isFinite(input.ach) && (input.ach as number) > 0 ? (input.ach as number) : 0;
    freshM3h = vol * ach;
  } else {
    const people = Number.isFinite(input.people) && (input.people as number) > 0 ? (input.people as number) : 0;
    const per =
      input.freshPerPerson && input.freshPerPerson > 0
        ? input.freshPerPerson
        : DEFAULT_FRESH_PER_PERSON;
    freshM3h = people * per;
  }

  const freshRatioPct = supplyM3h > 0 ? (freshM3h / supplyM3h) * 100 : 0;

  return { valid: q > 0, supplyM3h, freshM3h, freshRatioPct, supplyCoef: SUPPLY_AIR_COEF };
}
