/**
 * N12 · PoE 供电功率预算（纯函数）
 * ------------------------------------------------------------------
 * 公式：
 *   totalDemandW     = Σ(count_i × w_i)              设备总需求功率（W）
 *   ports            = Σ count_i                     占用 PoE 端口数
 *   designDemandW    = totalDemandW × margin         设计需求功率，margin < 1 时按 1
 *   remainingW       = budgetW − designDemandW       剩余预算（可为负）
 *   ok               = remainingW ≥ 0
 *   requiredSwitches = ceil(designDemandW / budgetW) budgetW > 0，否则 0
 *   requiredBudgetW  = designDemandW
 *
 * 单口可用功率表（PD 侧，W）来源与口径：
 *   IEEE 802.3af / 802.3at / 802.3bt 规定 PSE 侧单口标称最大输出分别为
 *   15.4 / 30 / 60 / 90 W；扣除 100 m 水平线缆、连接器与线对损耗后，标准保证
 *   到达受电设备（PD）侧的最小可用功率约为 12.95 / 25.5 / 51 / 71.3 W。
 *   本表用于校核「单台设备功率」是否超过该标准单口上限；超过则必须提升 PoE
 *   标准（af→at→bt）或改为本地供电，否则交换机将拒绝供电或端口反复掉线。
 *
 * 经验常量口径：
 *   margin（默认 1.2）：工程余量系数，覆盖线缆损耗、设备启动/红外补光峰值与
 *                      后期扩容，方案阶段常用 1.1~1.3，非标准强制值。
 *   budgetW（默认 370）：常见 24 口 PoE+ 交换机整机 PoE 预算示例值，须按实际
 *                      交换机铭牌/样本填写（不同机型 130 / 370 / 740 W 不等）。
 *   设备功率 w_i（12 / 15 / 7 W）：常见固定枪机、Wi-Fi AP、门禁/传感器示例值。
 *
 * 边界：非有限数值按 0 处理（margin 按 1）；负的 count / w 按 0 处理；
 *       非法 standard 枚举返回 valid=false；任何中间结果溢出为 Infinity/NaN
 *       亦返回 valid=false，绝不让非有限数流向 UI。
 */

/** PoE 供电标准 */
export type PoeStandard = 'af' | 'at' | 'bt3' | 'bt4';

/** 各标准保证到达 PD 侧的单口可用功率（W），显式导出便于审计 */
export const POE_PORT_LIMIT_W: Record<PoeStandard, number> = {
  af: 12.95,
  at: 25.5,
  bt3: 51,
  bt4: 71.3,
};

export interface PoeBudgetInput {
  /** 摄像机数量（默认 10） */
  camCount: number;
  /** 单台摄像机功率（W，默认 12） */
  camW: number;
  /** 无线 AP 数量（默认 4） */
  apCount: number;
  /** 单台 AP 功率（W，默认 15） */
  apW: number;
  /** 其他 PoE 设备数量（默认 2） */
  otherCount: number;
  /** 单台其他设备功率（W，默认 7） */
  otherW: number;
  /** 交换机 PoE 总功率预算（W，默认 370） */
  budgetW: number;
  /** 余量系数（默认 1.2，<1 按 1 处理） */
  margin: number;
  /** PoE 标准 */
  standard: PoeStandard;
}

export interface PoeBudgetResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（口径、风险与整改建议） */
  note: string;
  /** 设备总需求功率（W） */
  totalDemandW: number;
  /** 占用 PoE 端口数 */
  ports: number;
  /** 实际采用的余量系数 */
  margin: number;
  /** 设计需求功率（W） */
  designDemandW: number;
  /** 剩余可用预算（W，负值表示超预算） */
  remainingW: number;
  /** 预算是否满足 */
  ok: boolean;
  /** 所需交换机台数 */
  requiredSwitches: number;
  /** 所需最小 PoE 总预算（W） */
  requiredBudgetW: number;
  /** 采用的 PoE 标准 */
  standard: PoeStandard;
  /** 该标准 PD 侧单口可用功率（W） */
  portLimitW: number;
  /** 是否存在单台设备功率超过单口上限 */
  overPortLimit: boolean;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数 */
function invalidResult(note: string): PoeBudgetResult {
  return {
    valid: false,
    note,
    totalDemandW: 0,
    ports: 0,
    margin: 1,
    designDemandW: 0,
    remainingW: 0,
    ok: false,
    requiredSwitches: 0,
    requiredBudgetW: 0,
    standard: 'af',
    portLimitW: POE_PORT_LIMIT_W.af,
    overPortLimit: false,
  };
}

/** 运行时校验 PoE 标准枚举（URL 回填可能带入非法值） */
function isPoeStandard(value: string): value is PoeStandard {
  return Object.prototype.hasOwnProperty.call(POE_PORT_LIMIT_W, value);
}

/** 安全取数：非有限值回退到默认值 */
function safe(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * PoE 供电功率预算校核
 * @param input 输入参数
 */
export function poeBudget(input: PoeBudgetInput): PoeBudgetResult {
  const standardRaw: string = typeof input.standard === 'string' ? input.standard : '';
  if (!isPoeStandard(standardRaw)) {
    return invalidResult('未知的 PoE 标准，请选择 802.3af / at / bt3 / bt4 之一');
  }
  const standard: PoeStandard = standardRaw;
  const portLimitW = POE_PORT_LIMIT_W[standard];

  const groups: { name: string; count: number; w: number }[] = [
    { name: '摄像机', count: Math.max(0, safe(input.camCount, 0)), w: Math.max(0, safe(input.camW, 0)) },
    { name: '无线 AP', count: Math.max(0, safe(input.apCount, 0)), w: Math.max(0, safe(input.apW, 0)) },
    { name: '其他设备', count: Math.max(0, safe(input.otherCount, 0)), w: Math.max(0, safe(input.otherW, 0)) },
  ];
  const budgetW = Math.max(0, safe(input.budgetW, 0));
  const margin = Math.max(1, safe(input.margin, 1));

  const totalDemandW = groups.reduce((sum, g) => sum + g.count * g.w, 0);
  const ports = groups.reduce((sum, g) => sum + g.count, 0);
  const designDemandW = totalDemandW * margin;
  const remainingW = budgetW - designDemandW;
  const ok = remainingW >= 0;
  const requiredSwitches = budgetW > 0 ? Math.ceil(designDemandW / budgetW) : 0;
  const overPortLimit = groups.some((g) => g.w > portLimitW);

  const outputs = [totalDemandW, ports, designDemandW, remainingW, requiredSwitches];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请缩小设备数量或单台功率');
  }
  if (ports <= 0 || budgetW <= 0) {
    return invalidResult('需至少一组设备数量大于 0，且交换机 PoE 总预算大于 0');
  }

  const notes: string[] = [];
  if (input.margin < 1) notes.push('余量系数小于 1，已按 1 处理');
  if (overPortLimit) {
    const over = groups
      .filter((g) => g.w > portLimitW)
      .map((g) => `${g.name} ${g.w} W`)
      .join('、');
    notes.push(
      `超过 ${standard.toUpperCase()} 标准 PD 侧单口上限 ${portLimitW} W：${over}；该组需提高 PoE 标准或改为本地供电`,
    );
  }
  if (!ok) {
    notes.push(
      `PoE 预算不足，尚缺 ${Math.abs(remainingW)} W；建议增设交换机（共需 ${requiredSwitches} 台）或将整机预算提高至 ${designDemandW} W`,
    );
  }
  notes.push(
    '单口可用功率取 PD 侧保证值（PSE 侧 15.4/30/60/90 W 扣除线缆损耗），结果仅供方案阶段校核，以交换机与受电设备样本为准',
  );

  return {
    valid: true,
    note: notes.join('；'),
    totalDemandW,
    ports,
    margin,
    designDemandW,
    remainingW,
    ok,
    requiredSwitches,
    requiredBudgetW: designDemandW,
    standard,
    portLimitW,
    overPortLimit,
  };
}
