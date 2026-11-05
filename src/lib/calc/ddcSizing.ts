/**
 * BA8 · DDC 选型与 I/O 模块配置（纯函数）
 * 说明：B7 只统计点数；本工具把「点数 → 模块数 → DDC 台数」一步算清。
 * 点数按余量百分比放大；模块规格取常用 DDC I/O 模块（8AI / 4AO / 12DI / 8DO，可常量调整）。
 */

/** 单个 I/O 模块的点数规格 */
export interface DdcModuleSpec {
  ai: number;
  ao: number;
  di: number;
  do: number;
}

/** 常用 DDC 模块规格（可按主流产品线调整） */
export const DDC_MODULE_SPEC: DdcModuleSpec = { ai: 8, ao: 4, di: 12, do: 8 };

/** 单台 DDC 默认最大点数（超出建议拆分） */
export const DEFAULT_MAX_POINTS_PER_DDC = 200;

export interface DdcSizingInput {
  ai: number;
  ao: number;
  di: number;
  do: number;
  /** 点数余量百分比（默认 20） */
  marginPct?: number;
  /** 单台 DDC 最大点数（默认 200） */
  maxPointsPerDdc?: number;
}

export interface DdcSizingResult {
  /** 输入是否有效（点数为非负即有效） */
  valid: boolean;
  /** 含余量后的各类型点数量 */
  required: { ai: number; ao: number; di: number; do: number };
  /** 含余量总点数 */
  totalPoints: number;
  /** 各类型模块数量 */
  modules: { ai: number; ao: number; di: number; do: number };
  /** 模块总数 */
  totalModules: number;
  /** DDC 台数 */
  ddcCount: number;
  /** 每台平均点数 */
  avgPointsPerDdc: number;
  /** 采用的最大单台点数 */
  maxPointsPerDdc: number;
  /** 是否超过单台上限（需拆分） */
  needsSplit: boolean;
}

/** 非负有限数归一 */
function nonNeg(x: number | undefined): number {
  return Number.isFinite(x) && (x as number) > 0 ? (x as number) : 0;
}

/**
 * DDC 选型与 I/O 模块配置
 * @param input 输入参数
 */
export function ddcSizing(input: DdcSizingInput): DdcSizingResult {
  const marginPct = Number.isFinite(input.marginPct) ? Math.min(100, Math.max(0, input.marginPct as number)) : 20;
  const maxPointsPerDdc =
    input.maxPointsPerDdc && input.maxPointsPerDdc > 0
      ? input.maxPointsPerDdc
      : DEFAULT_MAX_POINTS_PER_DDC;
  const k = 1 + marginPct / 100;

  const required = {
    ai: Math.ceil(nonNeg(input.ai) * k),
    ao: Math.ceil(nonNeg(input.ao) * k),
    di: Math.ceil(nonNeg(input.di) * k),
    do: Math.ceil(nonNeg(input.do) * k),
  };
  const totalPoints = required.ai + required.ao + required.di + required.do;

  const modules = {
    ai: Math.ceil(required.ai / DDC_MODULE_SPEC.ai),
    ao: Math.ceil(required.ao / DDC_MODULE_SPEC.ao),
    di: Math.ceil(required.di / DDC_MODULE_SPEC.di),
    do: Math.ceil(required.do / DDC_MODULE_SPEC.do),
  };
  const totalModules = modules.ai + modules.ao + modules.di + modules.do;

  const ddcCount = Math.max(1, Math.ceil(totalPoints / maxPointsPerDdc));
  const avgPointsPerDdc = ddcCount > 0 ? totalPoints / ddcCount : 0;

  return {
    valid: true,
    required,
    totalPoints,
    modules,
    totalModules,
    ddcCount,
    avgPointsPerDdc,
    maxPointsPerDdc,
    needsSplit: totalPoints > maxPointsPerDdc,
  };
}
