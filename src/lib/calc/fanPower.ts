/**
 * H16 · 风机选型与轴功率（纯函数）
 * ------------------------------------------------------------------
 * 公式：
 *   P_空气(W) = Q(m³/h) × Δp(Pa) / 3600
 *   shaftKw   = Q × Δp / (3_600_000 × η_fan × η_trans)
 *   requiredKw = shaftKw × motorMargin
 *   其中 3_600_000 = 3600 s/h × 1000 W/kW：Q[m³/h] × Δp[Pa] 的量纲为
 *   (m³/s)·(N/m²) = W，除以 3600 得 W，再除以 1000 得 kW，故常数为 3.6e6。
 *
 * 经验常量口径：
 *   fanEff（默认 0.7）：风机全压效率，方案阶段中值；轴流/后倾离心约 0.6~0.85，
 *                      须以厂家性能曲线为准。
 *   transEff（默认 0.95）：传动效率，皮带/联轴器传动损失；直联取 1.0。
 *   motorMargin（默认 1.2）：电机储备（安全）系数，覆盖启动、工况波动与
 *                           网侧电压偏差，暖通设计常用 1.1~1.3；< 1 按 1 处理。
 *   MOTOR_SERIES_KW：GB/T 4772.1 / IEC 60034 常用的三相异步电动机额定功率
 *                    优先数序列（Y/YX3/YVF 系列常见档位），非标准强制值。
 *   fanTypeNote：按全压的经验分档（<500 Pa 轴流/低压离心，500~1500 Pa 中压
 *                离心，>1500 Pa 高压离心/罗茨），仅作初选提示，必须以厂家曲线
 *                与系统阻力曲线交点确定工况点。
 *
 * 边界：Q ≤ 0、Δp ≤ 0、效率不在 (0,1] 内、或任一输入非有限 → valid=false；
 *       margin < 1 按 1 处理；结果溢出返回 valid=false。
 */

/** 常用三相异步电动机额定功率序列（kW） */
export const MOTOR_SERIES_KW: number[] = [
  0.12, 0.18, 0.25, 0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30,
  37, 45, 55, 75, 90, 110, 132, 160, 200, 250,
];

/** 风机全压—功率换算常数：3600 s/h × 1000 W/kW */
export const FAN_POWER_DIVISOR = 3_600_000;

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

export interface FanPowerInput {
  /** 风量 Q（m³/h），默认 10000 */
  flowM3h: number;
  /** 风机全压（Pa），默认 500 */
  totalPa: number;
  /** 风机效率（0~1），默认 0.7 */
  fanEff: number;
  /** 传动效率（0~1，直联取 1），默认 0.95 */
  transEff: number;
  /** 电机储备系数（≥1，<1 按 1），默认 1.2 */
  motorMargin: number;
}

export interface FanPowerResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（机型与选型口径） */
  note: string;
  /** 风机轴功率（kW） */
  shaftKw: number;
  /** 实际采用的电机储备系数 */
  motorMargin: number;
  /** 所需电机功率（kW） */
  requiredKw: number;
  /** 首个 ≥ requiredKw 的标准电机功率（kW）；超出序列为 null */
  recommendedMotorKw: number | null;
  /** 按全压给出的风机形式经验提示 */
  fanTypeNote: string;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数或 null */
function invalidResult(note: string): FanPowerResult {
  return {
    valid: false,
    note,
    shaftKw: 0,
    motorMargin: 1,
    requiredKw: 0,
    recommendedMotorKw: null,
    fanTypeNote: '输入无效，无法给出风机形式建议',
  };
}

/** 按全压给出风机形式经验提示 */
function fanTypeFor(totalPa: number): string {
  if (totalPa < 500) return '轴流风机 / 低压离心风机';
  if (totalPa <= 1500) return '中压离心风机';
  return '高压离心风机 / 罗茨风机';
}

/**
 * 风机选型与轴功率计算
 * @param input 输入参数
 */
export function fanPower(input: FanPowerInput): FanPowerResult {
  const values = [input.flowM3h, input.totalPa, input.fanEff, input.transEff, input.motorMargin];
  if (!values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return invalidResult('所有输入必须为有限数值');
  }
  if (
    input.flowM3h <= 0 ||
    input.totalPa <= 0 ||
    input.fanEff <= 0 ||
    input.fanEff > 1 ||
    input.transEff <= 0 ||
    input.transEff > 1
  ) {
    return invalidResult('风量与全压须大于 0，风机效率与传动效率须落在 (0, 1] 区间');
  }

  const motorMargin = Math.max(1, input.motorMargin);
  const shaftKw =
    (input.flowM3h * input.totalPa) / (FAN_POWER_DIVISOR * input.fanEff * input.transEff);
  const requiredKw = shaftKw * motorMargin;
  const recommendedMotorKw = MOTOR_SERIES_KW.find((kw) => kw >= requiredKw) ?? null;
  const fanTypeNote = fanTypeFor(input.totalPa);

  const outputs = [shaftKw, requiredKw, motorMargin];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请缩小风量或全压');
  }

  const notes: string[] = [];
  if (input.motorMargin < 1) notes.push('电机储备系数小于 1，已按 1 处理');
  notes.push(
    `按全压 ${input.totalPa} Pa 初选 ${fanTypeNote}；仅为经验分档，须以厂家性能曲线与系统阻力曲线的交点确定工况点`,
  );
  if (recommendedMotorKw === null) {
    notes.push('所需功率超出常用电机序列，需多台并联或按厂家定制校核');
  }
  notes.push(
    '严格定义：风机轴功率 = Q·P/(3.6e6·η_fan)；本项已计入传动效率 η_trans，实为电机侧输入功率，与风机样本「轴功率」对比时须先除以 η_trans',
  );
  notes.push(GENERAL_DISCLAIMER);

  return {
    valid: true,
    note: notes.join('；'),
    shaftKw,
    motorMargin,
    requiredKw,
    recommendedMotorKw,
    fanTypeNote,
  };
}
