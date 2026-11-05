/**
 * P16 · PLC 选型与 I/O 点数估算（纯函数）
 * 由 I/O 点数（含余量）估算模块数量、CPU 档位、是否需扩展机架与 24V 电源容量。
 * 模块规格与单点功耗为常用工程近似值，可维护调整。
 */

/** 常见 PLC 模块规格（每模块点数） */
export const PLC_MODULE_SPEC = { di: 16, do: 16, ai: 8, ao: 8 } as const;

/** 每点典型 24V 功耗（W，工程近似） */
const POINT_POWER_W = { di: 0.3, do: 0.5, ai: 0.6, ao: 0.6 } as const;

/** CPU 档位 */
export type CpuClass = '小型' | '中型' | '大型';

export interface PlcSizingInput {
  di: number;
  do: number;
  ai: number;
  ao: number;
  /** 余量百分比（默认 25） */
  marginPct?: number;
  /** 是否需要高速计数/脉冲输出 */
  highSpeed?: boolean;
}

export interface PlcSizingResult {
  valid: boolean;
  required: { di: number; do: number; ai: number; ao: number };
  totalPoints: number;
  modules: { di: number; do: number; ai: number; ao: number };
  totalModules: number;
  cpuClass: CpuClass;
  needsRack: boolean;
  /** 24V 电源容量估算（W） */
  powerW: number;
  /** 24V 电源容量估算（A） */
  powerA: number;
}

function nonNeg(x: number | undefined): number {
  return Number.isFinite(x) && (x as number) > 0 ? (x as number) : 0;
}

/**
 * PLC 选型与 I/O 点数估算
 * @param input 输入参数
 */
export function plcSizing(input: PlcSizingInput): PlcSizingResult {
  const marginPct = Number.isFinite(input.marginPct)
    ? Math.min(100, Math.max(0, input.marginPct as number))
    : 25;
  const k = 1 + marginPct / 100;

  const required = {
    di: Math.ceil(nonNeg(input.di) * k),
    do: Math.ceil(nonNeg(input.do) * k),
    ai: Math.ceil(nonNeg(input.ai) * k),
    ao: Math.ceil(nonNeg(input.ao) * k),
  };
  const totalPoints = required.di + required.do + required.ai + required.ao;

  const modules = {
    di: Math.ceil(required.di / PLC_MODULE_SPEC.di),
    do: Math.ceil(required.do / PLC_MODULE_SPEC.do),
    ai: Math.ceil(required.ai / PLC_MODULE_SPEC.ai),
    ao: Math.ceil(required.ao / PLC_MODULE_SPEC.ao),
  };
  const totalModules = modules.di + modules.do + modules.ai + modules.ao;

  let cpuClass: CpuClass =
    totalPoints <= 128 && !input.highSpeed ? '小型' : totalPoints <= 512 ? '中型' : '大型';
  if (input.highSpeed && cpuClass === '小型') cpuClass = '中型';

  const needsRack = totalModules > 8;

  const powerW =
    required.di * POINT_POWER_W.di +
    required.do * POINT_POWER_W.do +
    required.ai * POINT_POWER_W.ai +
    required.ao * POINT_POWER_W.ao;
  const powerA = powerW / 24;

  return { valid: true, required, totalPoints, modules, totalModules, cpuClass, needsRack, powerW, powerA };
}
