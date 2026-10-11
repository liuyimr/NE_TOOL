/**
 * C23 · 电功率计算（纯函数）
 * 单相 P = U·I·cosφ；三相 P = √3·U·I·cosφ
 */

import type { PhaseMode } from './motor';

const SQRT3 = Math.sqrt(3);

export interface PowerInput {
  /** 电压（V） */
  voltage: number;
  /** 电流（A） */
  current: number;
  /** 功率因数（默认 1.0） */
  powerFactor?: number;
  /** 相制（默认三相） */
  phase?: PhaseMode;
}

/**
 * 电功率（kW）
 * @param input 输入参数
 */
export function electricPower(input: PowerInput): number {
  const pf = input.powerFactor ?? 1;
  const phase = input.phase ?? 'three';
  const p =
    phase === 'three'
      ? SQRT3 * input.voltage * input.current * pf
      : input.voltage * input.current * pf;
  return p / 1000;
}

/**
 * 视在功率（kVA）
 * @param voltage 电压（V）
 * @param current 电流（A）
 * @param phase 相制
 */
export function apparentPower(voltage: number, current: number, phase: PhaseMode = 'three'): number {
  const s = phase === 'three' ? SQRT3 * voltage * current : voltage * current;
  return s / 1000;
}
