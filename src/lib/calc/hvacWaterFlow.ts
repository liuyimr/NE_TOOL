/**
 * H14 · 冷冻水 / 热水流量计算（纯函数）
 * 公式：G = 0.86·Q/Δt（m³/h，Q 为 kW，Δt 为供回水温差 ℃）
 * 并据 d = √(4Q/(π·v)) 反算推荐管径（复用给水管径序列 DN_INNER）。
 */

import { DN_INNER } from '@/lib/calc/waterPipe';

/** 流量工程系数：0.86 = 3600/(4.187×1000) 取整 */
export const WATER_FLOW_COEF = 0.86;

export interface HvacWaterFlowInput {
  /** 冷/热量（kW） */
  loadKw: number;
  /** 供回水温差（℃），必须 >0 */
  deltaT: number;
  /** 推荐流速（m/s，默认 1.5，参考 1.0~2.0） */
  velocity?: number;
}

export interface HvacWaterFlowResult {
  valid: boolean;
  /** 流量（m³/h） */
  flowM3h: number;
  /** 流量（L/s） */
  flowLps: number;
  /** 推荐公称直径 DN；超出常用范围时为 null */
  recommendedDn: number | null;
  /** 推荐 DN 下的实际流速（m/s） */
  actualVelocity: number;
  /** 采用流速（m/s） */
  velocity: number;
}

/**
 * 冷冻水 / 热水流量计算
 * @param input 输入参数
 */
export function hvacWaterFlow(input: HvacWaterFlowInput): HvacWaterFlowResult {
  const q = Number.isFinite(input.loadKw) && input.loadKw > 0 ? input.loadKw : 0;
  const dt = input.deltaT;

  if (!(Number.isFinite(dt) && dt > 0)) {
    return { valid: false, flowM3h: 0, flowLps: 0, recommendedDn: null, actualVelocity: 0, velocity: 0 };
  }

  const flowM3h = (WATER_FLOW_COEF * q) / dt;
  const flowLps = flowM3h / 3.6;

  const velocity = input.velocity && input.velocity > 0 ? input.velocity : 1.5;
  const flowM3s = flowM3h / 3600;
  const diaMm = flowM3s > 0 ? Math.sqrt((4 * flowM3s) / (Math.PI * velocity)) * 1000 : 0;
  const chosen = diaMm > 0 ? DN_INNER.find((d) => d.id >= diaMm) ?? null : DN_INNER[0];
  const recommendedDn = chosen?.dn ?? null;
  const actualVelocity =
    chosen && chosen.id > 0 ? flowM3s / (Math.PI * (chosen.id / 1000 / 2) ** 2) : 0;

  return { valid: q > 0, flowM3h, flowLps, recommendedDn, actualVelocity, velocity };
}
