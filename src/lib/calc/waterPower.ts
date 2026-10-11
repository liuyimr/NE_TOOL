/**
 * S2 · 单相 / 三相 功率 ↔ 电流换算（纯函数）
 * 公式（PRD #2）：三相 P = √3·Un·I·cosφ；单相 P = Un·I·cosφ（把 √3 换成 1）
 * 单位：P 输入输出以 kW 计。
 */

export type CircuitPhase = 'single' | 'three';

export interface PowerCurrentInput {
  /** 计算方向 */
  mode: 'powerToCurrent' | 'currentToPower';
  /** 相制（默认三相） */
  phase?: CircuitPhase;
  /** 系统电压（V），默认三相 380 / 单相 220 */
  voltage?: number;
  /** 功率因数 cosφ（默认 0.85） */
  cosPhi?: number;
  /** 功率（kW，mode=powerToCurrent 时使用） */
  powerKw?: number;
  /** 电流（A，mode=currentToPower 时使用） */
  currentA?: number;
}

export interface PowerCurrentResult {
  /** 功率（kW） */
  powerKw: number;
  /** 电流（A） */
  currentA: number;
  /** 视在功率（kVA） */
  apparentKva: number;
  /** 功率因数（实际采用值） */
  powerFactor: number;
}

/**
 * 单相/三相 功率电流换算
 * @param input 输入参数
 */
export function powerCurrent(input: PowerCurrentInput): PowerCurrentResult {
  const phase = input.phase ?? 'three';
  const defaultV = phase === 'three' ? 380 : 220;
  const voltage = input.voltage && input.voltage > 0 ? input.voltage : defaultV;
  const cos = input.cosPhi && input.cosPhi > 0 && input.cosPhi <= 1 ? input.cosPhi : 0.85;
  const k = phase === 'three' ? Math.sqrt(3) : 1;

  let powerKw: number;
  let currentA: number;

  if (input.mode === 'currentToPower') {
    currentA = Math.max(0, input.currentA || 0);
    powerKw = (k * voltage * currentA * cos) / 1000;
  } else {
    powerKw = Math.max(0, input.powerKw || 0);
    currentA = (powerKw * 1000) / (k * voltage * cos);
  }

  const apparentKva = (k * voltage * currentA) / 1000;
  return { powerKw, currentA, apparentKva, powerFactor: cos };
}
