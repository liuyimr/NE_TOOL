/**
 * E13 · 漏电保护 RCD 选型与级配（纯函数）
 * ------------------------------------------------------------------
 * 依据：GB 50054-2011（应装 RCD 的场所；TN 系统末端自动切断时间 ≤0.4 s，
 * IEC 60364-4-41）、GB/T 13955-2017（现行，5.7 动作参数与级配）、
 * GB 13955-2005 三级保护分断时间（历史沿用，已废止，由 GB/T 13955-2017 替代）、
 * JGJ/T 46-2024 3.3.3/3.3.4、《技术措施·电气》2009 6.4.7、
 * GB/T 16916.1/16917.1、IEC 60364-4-41。
 * **GB 50054 不承担 0.1 s 依据**：其对应 TN 系统末端自动切断时间 ≤0.4 s；
 * 末级 ≤0.1 s 的设计选用依据为 JGJ/T 46-2024 第 3.3.4 条（推荐性标准）。
 *
 * 选型表口径（RCD_RULES）：
 *   socket / wet / lighting → IΔn = 30 mA、一般型（无延时）、设计选用/分级配合
 *     动作时间提示 100 ms（工程口径，非产品型式试验限值、非产品额定动作时间
 *     保证值）。30 mA 属「直接接触的附加防护」（不能替代基本绝缘/接地），
 *     GB 50054 对干燥场所固定式照明并不强制装 RCD，此处按住宅/公共建筑常规
 *     配置统一取 30 mA；潮湿场所（浴室、厨房、户外插座）则属强制要求。
 *   motor → 100 mA、一般型（无延时）、100 ms：依据 GB/T 13955-2017 5.7 b)，
 *     单台电气机械设备可选 30 mA 以上、100 mA 及以下、无延时 RCD。
 *   main → 300 mA、延时型 S、500 ms：总进线/上级，利用延时实现选择性；
 *     0.5 s 是 IΔn 下的分断时间上限，2IΔn ≤0.2 s、5IΔn ≤0.15 s，大故障
 *     电流下更快，不写作「延时 500 ms」。
 *   fire → 300 mA、报警不脱扣、动作时间不适用（null）：消防设备（消防泵、
 *     应急照明、防火卷帘）供电不应自动切断，剩余电流只作用于报警
 *     （GB 50054 / GB 50116 原则）。
 *
 * 动作时间口径说明（与配套速查表 elec.rcdRef 并列一致，避免混淆）：
 *   RCD_RULES 中的 100 / 500 ms 是「设计选用/分级配合动作时间」提示值
 *   （工程口径：末级 ≤0.1 s、中间级 ≤0.3 s、上级 ≤0.5 s），并非产品标准的
 *   型式试验限值，也不是产品额定动作时间保证值。
 *   GB/T 16916.1 / GB/T 16917.1（IEC 61008-1 / IEC 61009-1 表 1）规定一般型
 *   IΔn ≤0.3 s、2IΔn ≤0.15 s、5IΔn（或 0.25 A）≤0.04 s、500 A ≤0.04 s；
 *   S 型 IΔn ≤0.5 s（IΔn 下最小不驱动时间 ≥0.13 s、2IΔn 下 ≥0.06 s）、
 *   2IΔn ≤0.2 s、5IΔn ≤0.15 s、500 A ≤0.15 s。两者用途不同、不可互相替代；
 *   本工具的 designBreakTimeMs 仅用于选型提示，不作为产品合格判定依据。
 *
 * 级配判据（选择性）：
 *   gradingRatio = upstreamMa / IΔn（upstreamMa = 0 表示无上级，返回 null）
 *   gradingOk    = upstreamMa === 0 || (gradingRatio ≥ 3 && upstreamDelayed === 'yes')
 *   上级 IΔn 至少为下级的 3 倍、且上级为延时型（S 型），才能避免越级跳闸；
 *   该 3 倍判据为 GB/T 13955 与厂商选择性配合表的常用工程经验值。
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

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

export interface RcdRule {
  /** 额定剩余动作电流 IΔn（mA） */
  iDeltaNMa: number;
  /** RCD 型式 */
  rcdType: string;
  /** 设计选用/分级配合动作时间提示（ms，工程口径，非产品型式试验限值）；不适用为 null */
  designBreakTimeMs: number | null;
  /** 该回路类型的说明 */
  note: string;
}

/** 回路类型 → RCD 选型规则，显式导出便于审计 */
export const RCD_RULES: Record<RcdCircuitType, RcdRule> = {
  socket: {
    iDeltaNMa: 30,
    rcdType: '一般型（无延时）',
    designBreakTimeMs: 100,
    note: '插座回路：30 mA 为直接接触附加防护；100 ms 为设计选用/分级配合动作时间提示值（工程口径，非产品型式试验限值、非产品额定动作时间保证值）',
  },
  wet: {
    iDeltaNMa: 30,
    rcdType: '一般型（无延时）',
    designBreakTimeMs: 100,
    note: '潮湿场所插座：强制装设 30 mA RCD；100 ms 为设计选用/分级配合动作时间提示值（工程口径，非产品型式试验限值）',
  },
  lighting: {
    iDeltaNMa: 30,
    rcdType: '一般型（无延时）',
    designBreakTimeMs: 100,
    note: 'GB 50054 对干燥场所固定照明不强制装 RCD，此处按住宅常规配置取 30 mA；100 ms 为设计选用/分级配合提示值（工程口径）',
  },
  motor: {
    iDeltaNMa: 100,
    rcdType: '一般型（无延时）',
    designBreakTimeMs: 100,
    note: '依据 GB/T 13955-2017 5.7 b)：单台电气机械设备可选 30 mA 以上、100 mA 及以下、无延时 RCD；100 ms 为设计选用/分级配合提示值（工程口径）',
  },
  main: {
    iDeltaNMa: 300,
    rcdType: '延时型 S',
    designBreakTimeMs: 500,
    note: '总进线/上级，靠延时实现上下级选择性；0.5 s 是 IΔn 下的分断时间上限，2IΔn ≤0.2 s、5IΔn ≤0.15 s，大故障电流下更快；500 ms 为设计选用/配合动作时间提示值（工程口径，非「延时 500 ms」）',
  },
  fire: {
    iDeltaNMa: 300,
    rcdType: '报警不脱扣',
    designBreakTimeMs: null,
    note: '消防设备不应自动切断电源，剩余电流只报警不脱扣；动作时间不适用（不脱扣，仅报警）',
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
  /** 设计选用/分级配合动作时间提示（ms，工程口径，非产品型式试验限值）；不适用为 null */
  designBreakTimeMs: number | null;
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
    designBreakTimeMs: null,
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

  const outputs = [
    iDeltaNMa,
    rule.designBreakTimeMs ?? 0,
    gradingRatio ?? 0,
    input.ratedCurrentA,
    input.upstreamMa,
  ];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请缩小回路电流或上级 IΔn');
  }

  const breakText =
    rule.designBreakTimeMs === null
      ? '不适用（不脱扣，仅报警）'
      : `${rule.designBreakTimeMs} ms`;
  const notes: string[] = [rule.note];
  if (!gradingOk) {
    notes.push('存在越级跳闸风险：上级 IΔn 应 ≥ 3× 下级且上级为延时型（S）');
  }
  if (ratedCurrentMinA === null) {
    notes.push('回路额定电流超出常用 RCD 电流档，需按厂家样本或改用框架式/互感器式方案');
  }
  notes.push(
    `本回路动作时间：${breakText}（「设计选用/分级配合」提示值，工程口径，不是产品标准分断时间）。设计口径：末级 ≤0.1 s、中间级 ≤0.3 s、上级 ≤0.5 s（JGJ/T 46-2024 3.3.4；GB 13955-2005 三级保护，已由 GB/T 13955-2017 替代；《技术措施·电气》2009 6.4.7）。产品型式试验最大分断时间（GB/T 16916.1 / 16917.1，IEC 61008-1 / 61009-1 表 1）：一般型 IΔn ≤0.3 s、2IΔn ≤0.15 s、5IΔn（或 0.25 A）≤0.04 s、500 A ≤0.04 s；S 型 IΔn ≤0.5 s（最小不驱动 ≥0.13 s）、2IΔn ≤0.2 s（≥0.06 s）、5IΔn ≤0.15 s（≥0.05 s）、500 A ≤0.15 s（≥0.04 s）。两者不冲突、用途不同：工程选型按设计口径，产品验收按型式试验口径；严禁将本工具数值用于产品合格判定或替代厂家样本。`,
  );
  notes.push(
    `依据 GB 50054《低压配电设计规范》/ GB 13955《剩余电流动作保护装置安装和运行》；30 mA 属直接接触附加防护，结果仅供选型参考，须按接地系统型式与实测泄漏电流复核`,
  );
  notes.push(GENERAL_DISCLAIMER);

  return {
    valid: true,
    note: notes.join('；'),
    circuitType,
    iDeltaNMa,
    rcdType: rule.rcdType,
    designBreakTimeMs: rule.designBreakTimeMs,
    ratedCurrentMinA,
    gradingRatio,
    gradingOk,
    upstreamMa: input.upstreamMa,
    upstreamDelayed,
  };
}
