/**
 * BA11 · 控制阀门 Kv 值计算与选型（纯函数）
 * ------------------------------------------------------------------
 * 公式：Kv = Q × sqrt(ρ_rel × 100 / Δp_kPa)
 *   由 Kv 定义出发：Q = Kv × sqrt(Δp_bar / ρ_rel)，其中 Δp_bar = Δp_kPa / 100
 *   （1 bar = 100 kPa），故 Kv = Q × sqrt(ρ_rel × 100 / Δp_kPa)。
 *   Kv 定义（IEC 60534-2-1 / GB/T 17213.2）：阀门全开、Δp = 1 bar、介质为
 *   水（ρ_rel = 1）时，流经阀门的体积流量 Q（m³/h）即为 Kv 值。
 *   ρ_rel 为介质相对密度（无量纲，水 = 1.0；30% 乙二醇水溶液约 1.04）。
 *
 * 选型档位来源与口径：
 *   KVS_SERIES：调节阀额定流通能力 Kvs 的常用优先数档（近似 R10/R5 优先数系，
 *               0.16→630），为各厂家样本普遍采用的标称序列，非标准强制值。
 *   KV_DN_TABLE：常见二通/三通调节阀「公称直径 DN → 额定 Kvs」经验对应表，
 *                取行业样本中值；不同厂家/阀型（单座、双座、球阀、蝶阀）
 *                差异较大，仅用于方案阶段初选。
 *   推荐规则：取首个 ≥ 计算 Kv 的 Kvs / 首个额定 Kvs ≥ Kv 的 DN。
 *
 * 阀权度：S = Δp_阀 / Δp_系统总（dpKPa / dpTotalKPa），dpTotalKPa = 0 时
 *   不计算（返回 null）。工程上 S ≥ 0.3 才能保持较好的调节特性（暖通自控
 *   常规设计判据）；S < 0.3 时等百分比/线性特性明显畸变。
 *
 * 执行器建议口径：按推荐 DN 分档，属经验提示，最终以执行器力矩/推力、
 *   关断压差与阀座允许压差由厂家样本校核。
 *
 * 边界：Q ≤ 0、Δp ≤ 0、ρ_rel ≤ 0、dpTotalKPa < 0 或任一输入非有限 →
 *   valid=false；结果溢出返回 valid=false。
 */

/** 常用调节阀额定 Kvs 优先数档（m³/h @ Δp=1 bar） */
export const KVS_SERIES: number[] = [
  0.16, 0.25, 0.4, 0.63, 1, 1.6, 2.5, 4, 6.3, 10, 16, 25, 40, 63, 100, 160, 250, 400, 630,
];

/** 常见二通/三通调节阀口径 → 额定 Kvs */
export const KV_DN_TABLE: { dn: number; kvs: number }[] = [
  { dn: 15, kvs: 2.5 },
  { dn: 20, kvs: 4 },
  { dn: 25, kvs: 6.3 },
  { dn: 32, kvs: 10 },
  { dn: 40, kvs: 16 },
  { dn: 50, kvs: 25 },
  { dn: 65, kvs: 40 },
  { dn: 80, kvs: 63 },
  { dn: 100, kvs: 100 },
  { dn: 125, kvs: 160 },
  { dn: 150, kvs: 250 },
  { dn: 200, kvs: 400 },
];

export interface ValveKvInput {
  /** 流量 Q（m³/h），默认 10 */
  flowM3h: number;
  /** 阀前后压差 Δp（kPa），默认 100 */
  dpKPa: number;
  /** 介质相对密度（水 = 1.0，30% 乙二醇约 1.04），默认 1.0 */
  rhoRel: number;
  /** 系统可用总压差（kPa），默认 0 = 不计算阀权度 */
  dpTotalKPa: number;
}

export interface ValveKvResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（阀权度、执行器与口径说明） */
  note: string;
  /** 计算所得 Kv（m³/h @ 1 bar） */
  kv: number;
  /** 首个 ≥ Kv 的额定 Kvs 档；超出序列为 null */
  recommendedKvs: number | null;
  /** 首个额定 Kvs ≥ Kv 的 DN；超出表格为 null */
  recommendedDn: number | null;
  /** 阀权度 S = dpKPa / dpTotalKPa；不计算时为 null */
  valveAuthority: number | null;
  /** 执行器形式建议 */
  actuator: string;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数或 null */
function invalidResult(note: string): ValveKvResult {
  return {
    valid: false,
    note,
    kv: 0,
    recommendedKvs: null,
    recommendedDn: null,
    valveAuthority: null,
    actuator: '输入无效，无法给出执行器建议',
  };
}

/**
 * 控制阀门 Kv 值计算与选型
 * @param input 输入参数
 */
export function valveKv(input: ValveKvInput): ValveKvResult {
  const values = [input.flowM3h, input.dpKPa, input.rhoRel, input.dpTotalKPa];
  if (!values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return invalidResult('所有输入必须为有限数值');
  }
  if (input.flowM3h <= 0 || input.dpKPa <= 0 || input.rhoRel <= 0 || input.dpTotalKPa < 0) {
    return invalidResult('流量、阀前后压差与相对密度须大于 0，系统总压差不得为负');
  }

  const kv = input.flowM3h * Math.sqrt((input.rhoRel * 100) / input.dpKPa);
  const recommendedKvs = KVS_SERIES.find((k) => k >= kv) ?? null;
  const dnEntry = KV_DN_TABLE.find((row) => row.kvs >= kv) ?? null;
  const recommendedDn = dnEntry === null ? null : dnEntry.dn;
  const valveAuthority = input.dpTotalKPa > 0 ? input.dpKPa / input.dpTotalKPa : null;

  const outputs = [kv, valveAuthority ?? 0];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请缩小流量或压差');
  }

  let actuator: string;
  if (recommendedDn === null) {
    actuator = '所需 Kv 超出常用 DN 对应范围，需并联多台阀门或按厂家样本定制';
  } else if (recommendedDn <= 40) {
    actuator = '电动比例积分（PI）执行器';
  } else if (recommendedDn <= 100) {
    actuator = '电动执行器（浮点 / 比例调节）';
  } else {
    actuator = '大口径电动 / 电液执行器';
  }

  const notes: string[] = [];
  if (valveAuthority !== null && valveAuthority < 0.3) {
    notes.push('阀权度过低，调节特性变差，建议提高阀上压差占比');
  }
  if (valveAuthority !== null && valveAuthority > 1) {
    notes.push('阀上压差大于系统可用总压差，输入数据可能不合理，请核对');
  }
  notes.push(
    'Kv 按 Δp=1 bar、ρ_rel=1 定义；Kvs/DN 取常用样本档位，最终以厂家样本、允许关断压差与阀权度校核为准',
  );

  return {
    valid: true,
    note: notes.join('；'),
    kv,
    recommendedKvs,
    recommendedDn,
    valveAuthority,
    actuator,
  };
}
