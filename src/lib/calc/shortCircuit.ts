/**
 * E14 · 短路电流估算（纯函数，三相/单相短路与峰值）
 * ------------------------------------------------------------------
 * 公式（阻抗法，折算到变压器低压侧，Ω/相）：
 *   In    = S_n×1000 / (√3 × U)                          变压器额定电流（A）
 *   Zt    = (uk%/100) × U² / (S_n×1000)                  变压器短路阻抗（Ω）
 *   Rt    = 0.1 × Zt ； Xt = sqrt(Zt² − Rt²)             按 Rt/Zt≈0.1 近似（等价 Rt/Xt≈0.1005）
 *   Rc    = ρ × L / S                                     电缆电阻（Ω）
 *   Xc    = X_CABLE × L                                  电缆电抗（Ω）
 *   Ztot  = sqrt((Rt+Rc)² + (Xt+Xc)²)                    短路点总阻抗（Ω）
 *   ik3Ka = U / (√3 × Ztot) / 1000                       三相短路电流稳态值（kA，标称电压下 I"k）
 *   ik3DesignKa = ik3Ka × c_max                          最大短路电流（引入电压系数 c）
 *   ik1Ka = (U/√3) / (2 × Ztot) / 1000                   单相短路电流（kA，粗略近似、忽略零序阻抗）
 *   ipKa  = √2 × κ × ik3Ka                               短路冲击电流峰值（kA）
 *   Icu   ≥ ik3DesignKa（取 ICU_SERIES_KA 中首个 ≥ 值）
 *
 * 常量来源与口径：
 *   VOLTAGE_FACTOR_C_MAX = 1.05：IEC 60909-0 表 1 低压最大短路电流电压系数 c_max；
 *             用于最大短路电流/开关分断能力校核。最小短路电流/保护灵敏度须另取
 *             c_min≈0.95，两者不是同一计算。
 *   RHO_CU = 0.0175 Ω·mm²/m、RHO_AL = 0.0283 Ω·mm²/m：20℃ 时铜/铝导体
 *             直流电阻率的工程近似（IEC 60228 铜 0.017241、铝 0.028264，取整）。
 *             20℃ 电阻用于最大短路电流是 IEC 60909 规定；最小短路电流须改用
 *             导体 70~150℃ 高温电阻。未计入集肤效应与多根并联系数。
 *   X_CABLE = 0.00008 Ω/m（0.08 mΩ/m）：低压电缆单位长度电抗经验值，
 *             与敷设方式、间距有关，详见《工业与民用配电设计手册》常用取值。
 *   TRANSFORMER_RZ_RATIO = 0.1：按 Rt/Zt≈0.1 近似（等价 Rt/Xt≈0.1005），
 *             容量越大比值越小；此处取 Rt = 0.1·Zt 并按勾股分解出 Xt。
 *   κ（kappa）：冲击系数，IEC 60909-0 按 R/X 计算
 *             κ = 1.02 + 0.98·exp(−3·Rtot/Xtot)，范围 1.0~2.0；输入 0 时自动计算，
 *             显式传入 ≥1 的数值时手动覆盖。ip = √2·κ·Ik 为 IEC 60909 形式。
 *   ik1 = ik3/2 的前提：相线与 N/PE 回路阻抗相等的粗略近似，忽略零序阻抗 Z0、
 *             变压器接线与接地方式、故障点阻抗；实际值可能明显偏离，禁止用于
 *             保护灵敏度、断路器整定与自动切断时间校验。
 *   ICU_SERIES_KA：常见厂商样本的断路器额定极限短路分断能力 Icu 档位示例（kA），
 *             非标准强制序列；4.5/6/10 kA 常见于 GB/T 10963.1 家用 MCB 的 Icn，
 *             与 GB/T 14048.2 MCCB 的 Icu 口径不同。
 *   voltageV（默认 400 V）、transformerKva（1000 kVA）、ukPercent（6%）：
 *             常见 10/0.4 kV 配电变压器铭牌参数。
 *
 * ⚠ 工程近似声明（必须随结果展示）：本计算仅用于方案阶段初步校核开关分断
 *   能力；未计入上级电网阻抗、母线阻抗、电动机反馈电流与短路功率因数相角，
 *   正式设计按 IEC 60909 / GB/T 15544 由专业软件计算。
 *
 * 边界：S_n ≤ 0、uk% ≤ 0、U ≤ 0、S ≤ 0、L < 0、κ 非法、非法 material
 *       或任一输入非有限 → valid=false；结果溢出返回 valid=false。
 *       κ=0（或省略）表示按 R/X 自动计算；κ<0 或 0<κ<1 为非法；κ≥1 手动覆盖。
 */

/** 铜导体 20℃ 电阻率（Ω·mm²/m） */
export const RHO_CU = 0.0175;
/** 铝导体 20℃ 电阻率（Ω·mm²/m） */
export const RHO_AL = 0.0283;
/** 低压电缆单位长度电抗（Ω/m） */
export const X_CABLE = 0.00008;
/** 变压器 Rt / Zt 比值（等价 Rt/Xt≈0.1005） */
export const TRANSFORMER_RZ_RATIO = 0.1;
/** IEC 60909-0 表 1 低压最大短路电流电压系数 c_max */
export const VOLTAGE_FACTOR_C_MAX = 1.05;
/** 常见厂商样本的断路器额定极限短路分断能力 Icu 档位示例（kA） */
export const ICU_SERIES_KA: number[] = [4.5, 6, 10, 15, 20, 25, 35, 50, 65, 100];

/** 电缆导体材料 */
export type CableMaterial = 'copper' | 'aluminium';

export interface ShortCircuitInput {
  /** 变压器额定容量（kVA），默认 1000 */
  transformerKva: number;
  /** 阻抗电压 uk（%），默认 6 */
  ukPercent: number;
  /** 低压侧线电压（V），默认 400 */
  voltageV: number;
  /** 电缆长度（m），默认 0 */
  cableLengthM: number;
  /** 电缆截面（mm²），默认 185 */
  cableSectionMm2: number;
  /** 导体材料，默认 copper */
  material: CableMaterial;
  /** 冲击系数 κ；0 或省略 = 按 R/X 自动计算，≥1 = 手动覆盖 */
  kappa?: number;
  /** 电压系数 c_max（默认 1.05，IEC 60909-0 表 1） */
  voltageFactorCMax?: number;
}

export interface ShortCircuitResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（工程近似声明与 ik1 口径） */
  note: string;
  /** 变压器额定电流（A） */
  inA: number;
  /** 变压器短路阻抗 Zt（Ω） */
  ztOhm: number;
  /** 总短路阻抗 Ztot（Ω） */
  ztotOhm: number;
  /** 三相短路电流（kA，标称电压下 I"k） */
  ik3Ka: number;
  /** 按 c_max 复核的最大短路电流（kA） */
  ik3DesignKa: number;
  /** 单相短路电流（kA，量级估算） */
  ik1Ka: number;
  /** 短路冲击电流峰值（kA） */
  ipKa: number;
  /** 实际采用的冲击系数 κ */
  kappaUsed: number;
  /** 首个 ≥ ik3DesignKa 的 Icu 档（kA）；超出序列为 null */
  recommendedIcuKa: number | null;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数或 null */
function invalidResult(note: string): ShortCircuitResult {
  return {
    valid: false,
    note,
    inA: 0,
    ztOhm: 0,
    ztotOhm: 0,
    ik3Ka: 0,
    ik3DesignKa: 0,
    ik1Ka: 0,
    ipKa: 0,
    kappaUsed: 0,
    recommendedIcuKa: null,
  };
}

function isMaterial(value: string): value is CableMaterial {
  return value === 'copper' || value === 'aluminium';
}

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

/**
 * 短路电流估算（阻抗法）
 * @param input 输入参数
 */
export function shortCircuit(input: ShortCircuitInput): ShortCircuitResult {
  const materialRaw: string = typeof input.material === 'string' ? input.material : '';
  if (!isMaterial(materialRaw)) {
    return invalidResult('未知的导体材料，请选择 copper（铜）或 aluminium（铝）');
  }
  // κ 可省略（=0 自动）；c_max 省略时取 IEC 60909-0 表 1 的 1.05
  const kappaInput =
    typeof input.kappa === 'number' && Number.isFinite(input.kappa) ? input.kappa : 0;
  const c = input.voltageFactorCMax ?? VOLTAGE_FACTOR_C_MAX;
  const values = [
    input.transformerKva,
    input.ukPercent,
    input.voltageV,
    input.cableLengthM,
    input.cableSectionMm2,
    kappaInput,
    c,
  ];
  if (!values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return invalidResult('所有输入必须为有限数值');
  }
  if (
    input.transformerKva <= 0 ||
    input.ukPercent <= 0 ||
    input.voltageV <= 0 ||
    input.cableSectionMm2 <= 0 ||
    input.cableLengthM < 0 ||
    kappaInput < 0 ||
    (kappaInput > 0 && kappaInput < 1)
  ) {
    return invalidResult('容量、阻抗电压、线电压与电缆截面须大于 0，电缆长度须非负，冲击系数 κ 取 0（自动）或 ≥1（手动）');
  }

  const sqrt3 = Math.sqrt(3);
  const inA = (input.transformerKva * 1000) / (sqrt3 * input.voltageV);
  const ztOhm =
    ((input.ukPercent / 100) * input.voltageV ** 2) / (input.transformerKva * 1000);
  const rt = TRANSFORMER_RZ_RATIO * ztOhm;
  const xt = Math.sqrt(ztOhm ** 2 - rt ** 2);
  const rho = materialRaw === 'copper' ? RHO_CU : RHO_AL;
  const rc = (rho * input.cableLengthM) / input.cableSectionMm2;
  const xc = X_CABLE * input.cableLengthM;
  const rTot = rt + rc;
  const xTot = xt + xc;
  const ztotOhm = Math.sqrt(rTot ** 2 + xTot ** 2);
  const ik3Ka = input.voltageV / (sqrt3 * ztotOhm) / 1000;
  const ik3DesignKa = ik3Ka * c;
  const ik1Ka = (input.voltageV / sqrt3) / (2 * ztotOhm) / 1000;
  const kappaAuto = xTot > 0 ? 1.02 + 0.98 * Math.exp(-3 * (rTot / xTot)) : 1.8;
  const kappa = kappaInput > 0 ? kappaInput : kappaAuto;
  const ipKa = Math.sqrt(2) * kappa * ik3Ka;
  const recommendedIcuKa = ICU_SERIES_KA.find((icu) => icu >= ik3DesignKa) ?? null;

  const outputs = [
    inA,
    ztOhm,
    rt,
    xt,
    rc,
    xc,
    ztotOhm,
    ik3Ka,
    ik3DesignKa,
    ik1Ka,
    ipKa,
    kappa,
  ];
  if (!outputs.every((x) => Number.isFinite(x)) || ztotOhm <= 0) {
    return invalidResult('输入量级过大或阻抗为零导致结果溢出，请核对变压器与电缆参数');
  }

  const notes: string[] = [
    '工程近似，仅用于方案阶段初步校核开关分断能力；未计入上级电网阻抗、母线阻抗、电动机反馈电流与短路功率因数相角，正式设计按 IEC 60909 / GB/T 15544 由专业软件计算',
    '按 IEC 60909-0 引入 c_max=1.05 复核最大短路电流并据此选择 Icu；c_min≈0.95 用于最小短路电流/保护灵敏度校验，两者不是同一计算。',
    'ik1 = ik3/2 基于相线与 N/PE 回路阻抗相等的粗略近似，忽略零序阻抗 Z0、变压器接线与接地方式、故障点阻抗，且导体电阻取 20℃ 值；禁止用于保护灵敏度、断路器整定与自动切断时间校验。最小短路电流须按 IEC 60909 取 c_min≈0.95、导体 70~150℃ 高温电阻并按对称分量法计入 Z0 另行计算；正式设计按 GB/T 15544 / IEC 60909 由专业软件复核。',
    'Icu 为额定极限短路分断能力（GB/T 14048.2 / IEC 60947-2，试验后不要求继续承载额定电流）；额定运行短路分断能力 Ics 按 Icu 的 25%/50%/75%/100% 标准化比值选取，重要负荷宜选 Ics = 100% Icu。分断能力档位为常见厂商样本示例，非标准强制序列。',
  ];
  if (recommendedIcuKa === null) {
    notes.push('预期短路电流超出常用 Icu 档位，需采用更高分断能力开关或加装限流/分段措施');
  }
  notes.push(GENERAL_DISCLAIMER);

  return {
    valid: true,
    note: notes.join('；'),
    inA,
    ztOhm,
    ztotOhm,
    ik3Ka,
    ik3DesignKa,
    ik1Ka,
    ipKa,
    kappaUsed: kappa,
    recommendedIcuKa,
  };
}
