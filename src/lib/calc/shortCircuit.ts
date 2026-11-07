/**
 * E14 · 短路电流估算（纯函数，三相/单相短路与峰值）
 * ------------------------------------------------------------------
 * 公式（阻抗法，折算到变压器低压侧，Ω/相）：
 *   In    = S_n×1000 / (√3 × U)                          变压器额定电流（A）
 *   Zt    = (uk%/100) × U² / (S_n×1000)                  变压器短路阻抗（Ω）
 *   Rt    = 0.1 × Zt ； Xt = sqrt(Zt² − Rt²)             变压器 R/X = 0.1
 *   Rc    = ρ × L / S                                     电缆电阻（Ω）
 *   Xc    = X_CABLE × L                                  电缆电抗（Ω）
 *   Ztot  = sqrt((Rt+Rc)² + (Xt+Xc)²)                    短路点总阻抗（Ω）
 *   ik3Ka = U / (√3 × Ztot) / 1000                       三相短路电流稳态值（kA）
 *   ik1Ka = (U/√3) / (2 × Ztot) / 1000                   单相短路电流（kA）
 *   ipKa  = √2 × κ × ik3Ka                               短路冲击电流峰值（kA）
 *   Icu   ≥ ik3Ka（取 ICU_SERIES_KA 中首个 ≥ 值）
 *
 * 常量来源与口径：
 *   RHO_CU = 0.0175 Ω·mm²/m、RHO_AL = 0.0283 Ω·mm²/m：20℃ 时铜/铝导体
 *            直流电阻率的工程近似（IEC 60228 铜 0.017241、铝 0.028264，取整）。
 *            未计入短路时温升导致的电阻上升，也未计入集肤效应与多根并联系数。
 *   X_CABLE = 0.00008 Ω/m（0.08 mΩ/m）：低压电缆单位长度电抗经验值，
 *             与敷设方式、间距有关，详见《工业与民用配电设计手册》常用取值。
 *   TRANSFORMER_RX_RATIO = 0.1：配电变压器 Rt/Xt ≈ 0.1 的工程近似（容量越大
 *             比值越小），此处取 Rt = 0.1·Zt 并按勾股分解出 Xt。
 *   κ（kappa，默认 1.8）：冲击系数，低压网络短路功率因数下常用 1.0~2.0，
 *             1.8 对应 R/X 较小的常见工况；ip = √2·κ·Ik 为 IEC 60909 形式。
 *   ik1 = ik3/2 的前提：相线与 N/PE 回路阻抗相等（Z1 ≈ Z2 ≈ Z0 的近似），
 *             实际单相短路电流受零序阻抗与接地方式影响，可能明显偏离此值。
 *   ICU_SERIES_KA：GB/T 14048.2 / IEC 60947-2 常见断路器额定极限短路分断
 *             能力 Icu 优先档（kA），非标准强制值。
 *   voltageV（默认 400 V）、transformerKva（1000 kVA）、ukPercent（6%）：
 *             常见 10/0.4 kV 配电变压器铭牌参数。
 *
 * ⚠ 工程近似声明（必须随结果展示）：本计算仅用于方案阶段初步校核开关分断
 *   能力；未计入上级电网阻抗、母线阻抗、电动机反馈电流与短路功率因数相角，
 *   正式设计按 IEC 60909 / GB/T 15544 由专业软件计算。
 *
 * 边界：S_n ≤ 0、uk% ≤ 0、U ≤ 0、S ≤ 0、L < 0、κ < 1、非法 material
 *       或任一输入非有限 → valid=false；结果溢出返回 valid=false。
 */

/** 铜导体 20℃ 电阻率（Ω·mm²/m） */
export const RHO_CU = 0.0175;
/** 铝导体 20℃ 电阻率（Ω·mm²/m） */
export const RHO_AL = 0.0283;
/** 低压电缆单位长度电抗（Ω/m） */
export const X_CABLE = 0.00008;
/** 变压器 Rt / Zt 比值 */
export const TRANSFORMER_RX_RATIO = 0.1;
/** 常用断路器额定极限短路分断能力 Icu 档位（kA） */
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
  /** 冲击系数 κ（≥1），默认 1.8 */
  kappa: number;
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
  /** 三相短路电流（kA） */
  ik3Ka: number;
  /** 单相短路电流（kA） */
  ik1Ka: number;
  /** 短路冲击电流峰值（kA） */
  ipKa: number;
  /** 首个 ≥ ik3Ka 的 Icu 档（kA）；超出序列为 null */
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
    ik1Ka: 0,
    ipKa: 0,
    recommendedIcuKa: null,
  };
}

function isMaterial(value: string): value is CableMaterial {
  return value === 'copper' || value === 'aluminium';
}

/**
 * 短路电流估算（阻抗法）
 * @param input 输入参数
 */
export function shortCircuit(input: ShortCircuitInput): ShortCircuitResult {
  const materialRaw: string = typeof input.material === 'string' ? input.material : '';
  if (!isMaterial(materialRaw)) {
    return invalidResult('未知的导体材料，请选择 copper（铜）或 aluminium（铝）');
  }
  const values = [
    input.transformerKva,
    input.ukPercent,
    input.voltageV,
    input.cableLengthM,
    input.cableSectionMm2,
    input.kappa,
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
    input.kappa < 1
  ) {
    return invalidResult('容量、阻抗电压、线电压与电缆截面须大于 0，电缆长度须非负，冲击系数须 ≥ 1');
  }

  const sqrt3 = Math.sqrt(3);
  const inA = (input.transformerKva * 1000) / (sqrt3 * input.voltageV);
  const ztOhm =
    ((input.ukPercent / 100) * input.voltageV ** 2) / (input.transformerKva * 1000);
  const rt = TRANSFORMER_RX_RATIO * ztOhm;
  const xt = Math.sqrt(ztOhm ** 2 - rt ** 2);
  const rho = materialRaw === 'copper' ? RHO_CU : RHO_AL;
  const rc = (rho * input.cableLengthM) / input.cableSectionMm2;
  const xc = X_CABLE * input.cableLengthM;
  const ztotOhm = Math.sqrt((rt + rc) ** 2 + (xt + xc) ** 2);
  const ik3Ka = input.voltageV / (sqrt3 * ztotOhm) / 1000;
  const ik1Ka = (input.voltageV / sqrt3) / (2 * ztotOhm) / 1000;
  const ipKa = Math.sqrt(2) * input.kappa * ik3Ka;
  const recommendedIcuKa = ICU_SERIES_KA.find((icu) => icu >= ik3Ka) ?? null;

  const outputs = [inA, ztOhm, rt, xt, rc, xc, ztotOhm, ik3Ka, ik1Ka, ipKa];
  if (!outputs.every((x) => Number.isFinite(x)) || ztotOhm <= 0) {
    return invalidResult('输入量级过大或阻抗为零导致结果溢出，请核对变压器与电缆参数');
  }

  const notes: string[] = [
    '工程近似，仅用于方案阶段初步校核开关分断能力；未计入上级电网阻抗、母线阻抗、电动机反馈电流与短路功率因数相角，正式设计按 IEC 60909 / GB/T 15544 由专业软件计算',
    'ik1 = ik3/2 基于相线与 N/PE 回路阻抗相等的近似，实际受零序阻抗与接地方式影响；导体电阻取 20℃ 值，未计短路温升',
  ];
  if (recommendedIcuKa === null) {
    notes.push('预期短路电流超出常用 Icu 档位，需采用更高分断能力开关或加装限流/分段措施');
  }

  return {
    valid: true,
    note: notes.join('；'),
    inA,
    ztOhm,
    ztotOhm,
    ik3Ka,
    ik1Ka,
    ipKa,
    recommendedIcuKa,
  };
}
