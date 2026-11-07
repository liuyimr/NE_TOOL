/**
 * H17 · 水力平衡 / 最不利环路压降计算（纯函数）
 * ------------------------------------------------------------------
 * 输入格式：每段 `流量m³/h,管内径mm,长度m,局部阻力系数ζ`，段间用 `;` 分隔。
 * 空白行忽略；字段数 ≠ 4、d ≤ 0、Q < 0、L < 0、ζ < 0 的行跳过并计入
 * skippedLines；全部行被跳过则 valid=false。
 *
 * 逐段公式（水，20℃）：
 *   A          = π·(d/1000/2)²                        管内截面积（m²）
 *   v          = (Q/3600) / A                        流速（m/s）
 *   Re         = v·(d/1000) / ν                      雷诺数（ν = 1.0e-6 m²/s）
 *   λ          = Re < 2300 ? 64/Re : 0.3164/Re^0.25  层流 Hagen–Poiseuille /
 *                                                     Blasius 光滑管近似
 *   frictionPaPerM = λ·(ρ·v²/2) / (d/1000)           沿程比摩阻（Pa/m），ρ=1000
 *   frictionPa = frictionPaPerM × L                   沿程阻力（Pa）
 *   localPa    = ζ·ρ·v²/2                             局部阻力（Pa）
 *   segmentPa  = frictionPa + localPa
 *   Q = 0 时该段阻力记 0，不得产生 Infinity（Re=0 不代入 64/Re）。
 *
 * 汇总：
 *   totalPa   = Σ segmentPa
 *   totalKPa  = totalPa / 1000
 *   headM     = totalPa / (ρ·g)，g = 9.81 m/s²
 *   worstSegmentIndex（1 基）/ worstSegmentPa 为阻力最大的段
 *   imbalancePct     = (totalKPa − nearLoopKPa) / totalKPa × 100
 *                     （仅 nearLoopKPa > 0 且 totalKPa > 0 时计算）
 *   balanceValveKPa  = max(0, totalKPa − nearLoopKPa)（仅 nearLoopKPa > 0 时）
 *   imbalancePct > 15% 时提示设置静态平衡阀，并给出所需附加阻力。
 *
 * 常量来源与口径：
 *   WATER_NU = 1.0e-6 m²/s：20℃ 水的运动黏度工程取值（约 1.004e-6，取整）。
 *   WATER_RHO = 1000 kg/m³：20℃ 水密度工程取值。
 *   GRAVITY = 9.81 m/s²：标准重力加速度。
 *   LAMINAR_RE = 2300：圆管层流/湍流临界雷诺数常规取值。
 *   BLASIUS_MAX_RE = 1e5：λ=0.3164/Re^0.25 为 Darcy 系数的 Blasius 光滑管公式，
 *                          适用于 Re≈4e3~1e5 且水力光滑管；实际钢管/镀锌钢管为
 *                          粗糙管，λ 可高 30~80%，本结果偏小。施工图宜按
 *                          Colebrook–White / Haaland 公式或《实用供热空调设计手册》
 *                          比摩阻表复核。Re=2300~4000 过渡区未单独处理，λ 在
 *                          临界点存在跳变，低流速小管径工况请人工复核。
 *   15% 不平衡率：暖通静态水力平衡经验判据，以设计院要求为准，非规范强制。
 *
 * 未计入：设备/末端、过滤器、软接、阀门全开阻力（需另计 ζ）、水温变化导致
 * 的黏度与密度变化、并联支路的流量再分配；结果为最不利串联环路的压降估算。
 *
 * 边界：任一输出非有限 → valid=false。
 */

/** 20℃ 水运动黏度（m²/s） */
export const WATER_NU = 1.0e-6;
/** 20℃ 水密度（kg/m³） */
export const WATER_RHO = 1000;
/** 标准重力加速度（m/s²） */
export const GRAVITY = 9.81;
/** 层流/湍流临界雷诺数 */
export const LAMINAR_RE = 2300;
/** Blasius 公式适用上限 */
export const BLASIUS_MAX_RE = 1e5;
/** 不平衡率提示阈值（%） */
export const IMBALANCE_LIMIT_PCT = 15;

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

export interface HydraulicSegmentDetail {
  /** 段序号（1 基） */
  index: number;
  /** 流速（m/s） */
  velocity: number;
  /** 雷诺数 */
  reynolds: number;
  /** 沿程阻力（Pa） */
  frictionPa: number;
  /** 局部阻力（Pa） */
  localPa: number;
  /** 该段总阻力（Pa） */
  totalPa: number;
}

export interface HydraulicBalanceInput {
  /** 分段串，格式 `Q,d,L,ζ;Q,d,L,ζ` */
  segments: string;
  /** 近端环路总压降（kPa），0 = 不计算不平衡率 */
  nearLoopKPa: number;
}

export interface HydraulicBalanceResult {
  /** 输入是否有效（至少一段解析成功） */
  valid: boolean;
  /** 中文提示（适用范围与平衡阀建议） */
  note: string;
  /** 成功解析的段数 */
  segmentCount: number;
  /** 解析失败被跳过的行数 */
  skippedLines: number;
  /** 最不利环路总压降（Pa） */
  totalPa: number;
  /** 最不利环路总压降（kPa） */
  totalKPa: number;
  /** 折算水头（m） */
  headM: number;
  /** 阻力最大段序号（1 基），无有效段时为 0 */
  worstSegmentIndex: number;
  /** 阻力最大段压降（Pa） */
  worstSegmentPa: number;
  /** 每段明细 */
  segmentsDetail: HydraulicSegmentDetail[];
  /** 不平衡率（%），不计算时为 null */
  imbalancePct: number | null;
  /** 平衡阀需附加阻力（kPa），不计算时为 null */
  balanceValveKPa: number | null;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数或 null */
function invalidResult(note: string, skippedLines: number): HydraulicBalanceResult {
  return {
    valid: false,
    note,
    segmentCount: 0,
    skippedLines,
    totalPa: 0,
    totalKPa: 0,
    headM: 0,
    worstSegmentIndex: 0,
    worstSegmentPa: 0,
    segmentsDetail: [],
    imbalancePct: null,
    balanceValveKPa: null,
  };
}

/** 解析单行；任何字段非法则返回 null */
function parseLine(line: string): { q: number; d: number; l: number; zeta: number } | null {
  const parts = line.split(',').map((p) => p.trim());
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (p === '' ? NaN : Number(p)));
  if (!nums.every((n) => Number.isFinite(n))) return null;
  const [q, d, l, zeta] = nums;
  if (d <= 0 || q < 0 || l < 0 || zeta < 0) return null;
  return { q, d, l, zeta };
}

/** 计算达西摩擦系数 λ；Re ≤ 0（含 Q=0）时返回 0，避免 Infinity */
function frictionFactor(reynolds: number): number {
  if (reynolds <= 0) return 0;
  if (reynolds < LAMINAR_RE) return 64 / reynolds;
  return 0.3164 / Math.pow(reynolds, 0.25);
}

/**
 * 水力平衡 / 最不利环路压降计算
 * @param input 输入参数
 */
export function hydraulicBalance(input: HydraulicBalanceInput): HydraulicBalanceResult {
  const rawSegments = typeof input.segments === 'string' ? input.segments : '';
  const lines = rawSegments
    .split(';')
    .map((line) => line.trim())
    .filter((line) => line !== '');

  let skippedLines = 0;
  const parsed: { q: number; d: number; l: number; zeta: number }[] = [];
  for (const line of lines) {
    const row = parseLine(line);
    if (row === null) skippedLines += 1;
    else parsed.push(row);
  }

  if (parsed.length === 0) {
    return invalidResult(
      '没有可计算的有效管段：请按「流量m³/h,管内径mm,长度m,局部阻力系数ζ」填写，段间用分号分隔；管径须大于 0，流量/长度/ζ 不得为负',
      skippedLines,
    );
  }

  const segmentsDetail: HydraulicSegmentDetail[] = [];
  let totalPa = 0;
  let worstSegmentIndex = 0;
  let worstSegmentPa = -Infinity;
  let maxReynolds = 0;

  parsed.forEach((seg, i) => {
    const dm = seg.d / 1000;
    const area = Math.PI * (dm / 2) ** 2;
    const velocity = seg.q / 3600 / area;
    const reynolds = (velocity * dm) / WATER_NU;
    const dynamicPa = (WATER_RHO * velocity ** 2) / 2;
    const lambda = frictionFactor(reynolds);
    const frictionPaPerM = lambda * dynamicPa / dm;
    const frictionPa = frictionPaPerM * seg.l;
    const localPa = seg.zeta * dynamicPa;
    const segmentPa = frictionPa + localPa;

    const detail: HydraulicSegmentDetail = {
      index: i + 1,
      velocity,
      reynolds,
      frictionPa,
      localPa,
      totalPa: segmentPa,
    };
    segmentsDetail.push(detail);
    totalPa += segmentPa;
    maxReynolds = Math.max(maxReynolds, reynolds);
    if (segmentPa > worstSegmentPa) {
      worstSegmentPa = segmentPa;
      worstSegmentIndex = i + 1;
    }
  });

  const totalKPa = totalPa / 1000;
  const headM = totalPa / (WATER_RHO * GRAVITY);
  const nearLoopKPa =
    typeof input.nearLoopKPa === 'number' && Number.isFinite(input.nearLoopKPa) && input.nearLoopKPa > 0
      ? input.nearLoopKPa
      : 0;
  const imbalancePct =
    nearLoopKPa > 0 && totalKPa > 0 ? ((totalKPa - nearLoopKPa) / totalKPa) * 100 : null;
  const balanceValveKPa = nearLoopKPa > 0 ? Math.max(0, totalKPa - nearLoopKPa) : null;

  const outputs = [totalPa, totalKPa, headM, worstSegmentPa, imbalancePct ?? 0, balanceValveKPa ?? 0];
  const detailFinite = segmentsDetail.every((d) =>
    [d.velocity, d.reynolds, d.frictionPa, d.localPa, d.totalPa].every((x) => Number.isFinite(x)),
  );
  if (!outputs.every((x) => Number.isFinite(x)) || !detailFinite) {
    return invalidResult('输入量级过大或管径过小导致结果溢出，请缩小流量或放大管径', skippedLines);
  }

  const notes: string[] = [];
  if (skippedLines > 0) notes.push(`已跳过 ${skippedLines} 行格式或数值非法的管段`);
  if (maxReynolds > BLASIUS_MAX_RE) {
    notes.push('部分管段雷诺数超出 Blasius 公式适用范围（Re ≤ 1e5），沿程阻力仅为光滑管粗估，宜按 Colebrook/Moody 并计入管壁粗糙度复核');
  }
  if (imbalancePct !== null && imbalancePct > IMBALANCE_LIMIT_PCT) {
    notes.push(
      `最不利环路与近端环路不平衡率 ${imbalancePct}% 超过 15%，近端需设置静态平衡阀，所需附加阻力约 ${balanceValveKPa} kPa`,
    );
  } else if (imbalancePct !== null) {
    notes.push(`不平衡率 ${imbalancePct}%，在常规 15% 判据以内`);
  }
  notes.push(
    '沿程阻力按 Blasius 光滑管公式估算（λ=0.3164/Re^0.25，适用 Re≈4e3~1e5 且水力光滑管；λ 为 Darcy 系数）。实际钢管/镀锌钢管为粗糙管，λ 可高 30~80%，本结果偏小；施工图宜按 Colebrook–White / Haaland 公式或《实用供热空调设计手册》比摩阻表复核。Re=2300~4000 过渡区未单独处理，λ 在临界点存在跳变，低流速小管径工况请人工复核。',
  );
  notes.push('不平衡率 ≤15% 为暖通经验判据，以设计院要求为准，非规范强制');
  notes.push('结果为最不利串联环路的沿程+局部阻力，未计入末端设备、过滤器与阀门阻力，20℃ 水物性；方案阶段估算，施工图须逐项复核');
  notes.push(GENERAL_DISCLAIMER);

  return {
    valid: true,
    note: notes.join('；'),
    segmentCount: parsed.length,
    skippedLines,
    totalPa,
    totalKPa,
    headM,
    worstSegmentIndex,
    worstSegmentPa: worstSegmentPa === -Infinity ? 0 : worstSegmentPa,
    segmentsDetail,
    imbalancePct,
    balanceValveKPa,
  };
}
