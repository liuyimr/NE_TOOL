/**
 * W3 / W4 · 给水所需扬程 + 水泵轴功率（纯函数）
 * 公式（PRD #16）：H = H_几何 + Σh_f + Σh_j + H_自由  （m）
 * 公式（PRD #17）：h_f = 10.67·L·Q^1.852/(C^1.852·d^4.87)   （海澄-威廉，m；d 单位 m、Q 单位 m³/s）
 * 公式（PRD #18）：h_j = Σξ·v²/(2g)                        （m，g = 9.81）
 * 公式（PRD #19）：P = Q·H/(367·η)                          （kW；Q 单位 m³/h、H 单位 m）
 */

/** 重力加速度（m/s²） */
const G = 9.81;

/** 常用水泵效率（默认） */
const DEFAULT_EFFICIENCY = 0.7;

/** 常用电机裕量系数（轴功率 → 配套功率建议） */
const DEFAULT_MARGIN = 1.15;

/** 标准电机功率档（kW） */
export const MOTOR_POWERS = [
  0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110,
];

// —— 扬程 ——

export interface PumpHeadInput {
  /** 几何高差 H_几何（m，取水最低水位到出水最高点） */
  staticHead: number;
  /** 管路总长度（m） */
  pipeLength: number;
  /** 单位长度沿程损失（m/m），如 0.02 表示每米损失 0.02 m */
  frictionPerMeter: number;
  /** 局部损失 Σh_j（m） */
  localLoss: number;
  /** 末端自由水头 H_自由（m） */
  freeHead: number;
}

export interface PumpHeadResult {
  /** 计算扬程 H（m） */
  totalHead: number;
  /** 沿程损失合计（m） */
  frictionLoss: number;
  /** 几何高差（m） */
  staticHead: number;
  /** 局部损失（m） */
  localLoss: number;
  /** 自由水头（m） */
  freeHead: number;
}

/**
 * 给水所需扬程
 * @param input 输入参数
 */
export function pumpHead(input: PumpHeadInput): PumpHeadResult {
  const staticHead = Math.max(0, input.staticHead || 0);
  const pipeLength = Math.max(0, input.pipeLength || 0);
  const frictionPerMeter = Math.max(0, input.frictionPerMeter || 0);
  const localLoss = Math.max(0, input.localLoss || 0);
  const freeHead = Math.max(0, input.freeHead || 0);

  const frictionLoss = pipeLength * frictionPerMeter;
  const totalHead = staticHead + frictionLoss + localLoss + freeHead;
  return { totalHead, frictionLoss, staticHead, localLoss, freeHead };
}

/**
 * 海澄-威廉沿程水头损失
 * @param flowM3h 流量（m³/h）
 * @param diaMm 管内径（mm）
 * @param lengthM 管长（m）
 * @param c 管材系数 C（PVC≈150、铸铁 100~130、钢管 120~140）
 */
export function hazenWilliams(
  flowM3h: number,
  diaMm: number,
  lengthM: number,
  c: number,
): number {
  const flowM3s = Math.max(0, flowM3h || 0) / 3600;
  const d = (diaMm || 0) / 1000;
  const l = Math.max(0, lengthM || 0);
  const cc = c && c > 0 ? c : 140;
  if (d <= 0 || flowM3s <= 0 || l <= 0) return 0;
  return (10.67 * l * flowM3s ** 1.852) / (cc ** 1.852 * d ** 4.87);
}

/**
 * 局部水头损失
 * @param xiSum 局部阻力系数合计 Σξ
 * @param velocity 流速（m/s）
 */
export function localLoss(xiSum: number, velocity: number): number {
  const v = Math.max(0, velocity || 0);
  return Math.max(0, xiSum || 0) * (v * v) / (2 * G);
}

// —— 轴功率 ——

export interface PumpPowerInput {
  /** 流量 Q（m³/h） */
  flow: number;
  /** 扬程 H（m） */
  head: number;
  /** 水泵效率 η（默认 0.7） */
  efficiency?: number;
  /** 电机裕量系数（默认 1.15） */
  margin?: number;
}

export interface PumpPowerResult {
  /** 流量（m³/h） */
  flow: number;
  /** 扬程（m） */
  head: number;
  /** 效率 */
  efficiency: number;
  /** 轴功率（kW） */
  shaftPowerKw: number;
  /** 建议配套功率（kW）= 轴功率 × 裕量系数 */
  motorPowerKw: number;
  /** 就近上取的标准电机功率（kW）；超出常用档时为 null */
  standardMotorKw: number | null;
}

/**
 * 水泵轴功率与配套功率
 * @param input 输入参数
 */
export function pumpPower(input: PumpPowerInput): PumpPowerResult {
  const flow = Math.max(0, input.flow || 0);
  const head = Math.max(0, input.head || 0);
  const efficiency =
    input.efficiency && input.efficiency > 0 && input.efficiency <= 1
      ? input.efficiency
      : DEFAULT_EFFICIENCY;
  const margin = input.margin && input.margin > 0 ? input.margin : DEFAULT_MARGIN;

  const shaftPowerKw = (flow * head) / (367 * efficiency);
  const motorPowerKw = shaftPowerKw * margin;
  const standardMotorKw = MOTOR_POWERS.find((p) => p >= motorPowerKw) ?? null;

  return { flow, head, efficiency, shaftPowerKw, motorPowerKw, standardMotorKw };
}
