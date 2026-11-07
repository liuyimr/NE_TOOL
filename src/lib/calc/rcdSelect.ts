/**
 * E13 · 漏电保护 RCD 选型与级配（纯函数）
 * ------------------------------------------------------------------
 * 依据：GB 50054《低压配电设计规范》、GB 13955《剩余电流动作保护装置
 * 安装和运行》、GB/T 16916/16917（RCD 产品标准）、IEC 60364-4-41。
 *
 * 选型表口径（RCD_RULES）：
 *   socket / wet / lighting → IΔn = 30 mA、一般型（无延时）、最大分断时间 100 ms。
 *     30 mA 属「直接接触的附加防护」（不能替代基本绝缘/接地），GB 50054 对
 *     干燥场所固定式照明并不强制装 RCD，此处按住宅/公共建筑常规配置统一取 30 mA；
 *     潮湿场所（浴室、厨房、户外插座）则属强制要求。
 *   motor → 100 mA、一般型、200 ms：设备与电缆防火/接地故障保护，兼顾电机
 *     正常泄漏电流避免误动作。
 *   main → 300 mA、延时型 S、500 ms：总进线/上级，利用延时实现选择性。
 *   fire → 300 mA、报警不脱扣、0 ms：消防设备（消防泵、应急照明、防火卷帘）
 *     供电不应自动切断，剩余电流只作用于报警（GB 50054 / GB 50116 原则）。
 *
 * 动作时间口径说明（与配套速查表 elec.rcdRef 并列一致，避免混淆）：
 *   RCD_RULES 中的 100 / 200 / 500 ms 是「设计/工程口径」的选型提示值
 *   （末端附加防护要求快速切断，常按 ≤0.1 s 表述；上级 S 型按 ≤0.5 s 且
 *   须有 ≥0.1 s 延时实现选择性），并非产品标准的型式试验限值。
 *   GB/T 16916 / GB/T 16917（对应 IEC 61008 / IEC 61009）对一般型 RCD 规定的是
 *   IΔn 下 ≤0.3 s、2IΔn 下 ≤0.15 s、5IΔn 下 ≤0.04 s；延时型 S 在 IΔn 下
 *   ≤0.5 s 且在 2IΔn 下不早于 0.1 s 脱扣。两者不可互相替代，校核时须说明口径；
 *   本工具的 maxBreakMs 仅用于选型提示，不作为产品合格判定依据。
 *
 * 级配判据（选择性）：
 *   gradingRatio = upstreamMa / IΔn（upstreamMa = 0 表示无上级，返回 null）
 *   gradingOk    = upstreamMa === 0 || (gradingRatio ≥ 3 && upstreamDelayed === 'yes')
 *   上级 IΔn 至少为下级的 3 倍、且上级为延时型（S 型），才能避免越级跳闸；
 *   该 3 倍判据为 GB 13955 与厂商选择性配合表的常用工程经验值。
 *
 * 电流档口径：RCD_CURRENT_SERIES_A 为 GB/T 16916/16917 与 IEC 60898 常见的
 * 额定电流优先数序列（6~250 A），RCD 额定电流须 ≥ 回路计算电流并 ≤ 导线载流量。
 *
 * 边界：非法 circuitType / upstreamDelayed、ratedCurrentA ≤ 0、
 * upstreamMa < 0、任一输入非有限 → valid=false；结果溢出返回 valid=false。
 * 结果仅供选型参考，最终须按接地系统型式（TN/TT/IT）、线路泄漏电流实测值、
 * 产品样本与设计规范复核。
 */

/** 回路类型 */
export type RcdCircuitType = 'socket' | 'wet' | 'lighting' | 'motor' | 'main' | 'fire';
/** 上级是否延时型 */
export type RcdDelayed = 'yes' | 'no';

export interface RcdRule {
  /** 额定剩余动作电流 IΔn（mA） */
  iDeltaNMa: number;
  /** RCD 型式 */
  rcdType: string;
  /** 选型用的动作时间提示（ms，设计/工程口径，非产品型式试验限值）；报警不脱扣记 0 */
  maxBreakMs: number;
  /** 该回路类型的说明 */
  note: string;
}

/** 回路类型 → RCD 选型规则，显式导出便于审计 */
export const RCD_RULES: Record<RcdCircuitType, RcdRule> = {
  socket: {
    iDeltaNMa: 30,
    rcdType: '一般型（无延时）',
    maxBreakMs: 100,
    note: '插座回路：30 mA 为直接接触附加防护',
  },
  wet: {
    iDeltaNMa: 30,
    rcdType: '一般型（无延时）',
    maxBreakMs: 100,
    note: '潮湿场所插座：强制装设 30 mA RCD',
  },
  lighting: {
    iDeltaNMa: 30,
    rcdType: '一般型（无延时）',
    maxBreakMs: 100,
    note: 'GB 50054 对干燥场所固定照明不强制装 RCD，此处按住宅常规配置取 30 mA',
  },
  motor: {
    iDeltaNMa: 100,
    rcdType: '一般型（无延时）',
    maxBreakMs: 200,
    note: '设备与防火保护，兼顾电机正常泄漏电流避免误动作',
  },
  main: {
    iDeltaNMa: 300,
    rcdType: '延时型 S',
    maxBreakMs: 500,
    note: '总进线/上级，靠延时实现上下级选择性',
  },
  fire: {
    iDeltaNMa: 300,
    rcdType: '报警不脱扣',
    maxBreakMs: 0,
    note: '消防设备不应自动切断电源，剩余电流只报警不脱扣',
  },
};

/** 常用 RCD 额定电流档（A） */
export const RCD_CURRENT_SERIES_A: number[] = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250,
];

/** 上级选择性倍数判据 */
export const RCD_GRADING_MIN_RATIO = 3;

export interface RcdSelectInput {
  /** 回路类型，默认 socket */
  circuitType: RcdCircuitType;
  /** 回路额定电流（A），默认 16 */
  ratedCurrentA: number;
  /** 上级 RCD 动作电流（mA），0 = 无上级，默认 300 */
  upstreamMa: number;
  /** 上级是否延时型，默认 yes */
  upstreamDelayed: RcdDelayed;
}

export interface RcdSelectResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（规范引用、级配风险与选型说明） */
  note: string;
  /** 采用的回路类型 */
  circuitType: RcdCircuitType;
  /** 推荐额定剩余动作电流 IΔn（mA） */
  iDeltaNMa: number;
  /** 推荐 RCD 型式 */
  rcdType: string;
  /** 最大分断时间（ms） */
  maxBreakMs: number;
  /** 首个 ≥ ratedCurrentA 的额定电流档（A）；超出序列为 null */
  ratedCurrentMinA: number | null;
  /** 上级/下级 IΔn 比值；无上级时为 null */
  gradingRatio: number | null;
  /** 级配是否满足 */
  gradingOk: boolean;
  /** 上级 IΔn（mA） */
  upstreamMa: number;
  /** 上级是否延时型 */
  upstreamDelayed: RcdDelayed;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数或 null */
function invalidResult(note: string): RcdSelectResult {
  return {
    valid: false,
    note,
    circuitType: 'socket',
    iDeltaNMa: 0,
    rcdType: '输入无效',
    maxBreakMs: 0,
    ratedCurrentMinA: null,
    gradingRatio: null,
    gradingOk: false,
    upstreamMa: 0,
    upstreamDelayed: 'no',
  };
}

function isCircuitType(value: string): value is RcdCircuitType {
  return Object.prototype.hasOwnProperty.call(RCD_RULES, value);
}

function isDelayed(value: string): value is RcdDelayed {
  return value === 'yes' || value === 'no';
}

/**
 * 漏电保护 RCD 选型与级配校核
 * @param input 输入参数
 */
export function rcdSelect(input: RcdSelectInput): RcdSelectResult {
  const circuitTypeRaw: string = typeof input.circuitType === 'string' ? input.circuitType : '';
  const delayedRaw: string = typeof input.upstreamDelayed === 'string' ? input.upstreamDelayed : '';
  if (!isCircuitType(circuitTypeRaw)) {
    return invalidResult('未知的回路类型，请选择 socket / wet / lighting / motor / main / fire 之一');
  }
  if (!isDelayed(delayedRaw)) {
    return invalidResult('未知的上级延时选项，请选择 yes（延时型 S）或 no');
  }
  if (
    !Number.isFinite(input.ratedCurrentA) ||
    !Number.isFinite(input.upstreamMa) ||
    input.ratedCurrentA <= 0 ||
    input.upstreamMa < 0
  ) {
    return invalidResult('回路额定电流须为大于 0 的有限数，上级 IΔn 须非负有限（0 表示无上级）');
  }

  const circuitType: RcdCircuitType = circuitTypeRaw;
  const upstreamDelayed: RcdDelayed = delayedRaw;
  const rule = RCD_RULES[circuitType];
  const iDeltaNMa = rule.iDeltaNMa;
  const ratedCurrentMinA = RCD_CURRENT_SERIES_A.find((a) => a >= input.ratedCurrentA) ?? null;
  const gradingRatio = input.upstreamMa > 0 ? input.upstreamMa / iDeltaNMa : null;
  const gradingOk =
    input.upstreamMa === 0 ||
    (gradingRatio !== null && gradingRatio >= RCD_GRADING_MIN_RATIO && upstreamDelayed === 'yes');

  const outputs = [iDeltaNMa, rule.maxBreakMs, gradingRatio ?? 0, input.ratedCurrentA, input.upstreamMa];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请缩小回路电流或上级 IΔn');
  }

  const notes: string[] = [rule.note];
  if (!gradingOk) {
    notes.push('存在越级跳闸风险：上级 IΔn 应 ≥ 3× 下级且上级为延时型（S）');
  }
  if (ratedCurrentMinA === null) {
    notes.push('回路额定电流超出常用 RCD 电流档，需按厂家样本或改用框架式/互感器式方案');
  }
  notes.push(
    `动作时间 ${rule.maxBreakMs} ms 为设计/工程口径的选型提示；GB/T 16916/16917 产品标准另规定一般型在 IΔn / 2IΔn / 5IΔn 下分别 ≤0.3 s / 0.15 s / 0.04 s，S 型在 IΔn 下 ≤0.5 s 且延时 ≥0.1 s，详见配套速查表 elec.rcdRef`,
  );
  notes.push(
    `依据 GB 50054《低压配电设计规范》/ GB 13955《剩余电流动作保护装置安装和运行》；30 mA 属直接接触附加防护，结果仅供选型参考，须按接地系统型式与实测泄漏电流复核`,
  );

  return {
    valid: true,
    note: notes.join('；'),
    circuitType,
    iDeltaNMa,
    rcdType: rule.rcdType,
    maxBreakMs: rule.maxBreakMs,
    ratedCurrentMinA,
    gradingRatio,
    gradingOk,
    upstreamMa: input.upstreamMa,
    upstreamDelayed,
  };
}
