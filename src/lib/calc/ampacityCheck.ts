/**
 * C10 增强 · 导线载流量校核（按敷设条件修正，纯函数）
 * ------------------------------------------------------------------
 * 数据唯一来源：`src/data/automation/cableAmpacity.json`（rows[].values.section/air/pipe），
 * 本模块不复制任何载流量数字，只做「查表 + 修正 + 校核」。
 *
 * 修正口径（方案阶段常用值）：
 *   I_z = I_table × k_温度 × k_并列
 *   温度修正 k_t 与并列（成组）修正 k_g 取自 GB/T 16895.15 / IEC 60364-5-52 常用表，
 *   环境 30℃、单回路为基准（k=1）。实际工程应以所选电缆型号的厂家载流量表与
 *   现场敷设方式（导管材质、埋深、桥架层数）复核，本页仅用于方案阶段初选。
 *
 * 校核判据：I_b ≤ I_z（回路计算电流不大于修正后允许载流量）；
 *   断路器整定还须满足 I_n ≤ I_z（见断路器选型页），本函数不做 I_n 校核。
 */

import cableAmpacityTable from '@/data/automation/cableAmpacity.json';

/** 敷设方式：明敷 / 空气，或穿管 */
export type CableInstallMethod = 'air' | 'pipe';

/** 温度修正系数（环境温度 ℃ → k_t，基准 30℃） */
export const TEMP_FACTOR: Record<number, number> = {
  30: 1,
  35: 0.94,
  40: 0.87,
  45: 0.79,
  50: 0.71,
};

/** 并列（成组）回路修正系数（回路数 → k_g，GB/T 16895.15 / IEC 60364-5-52 常用值） */
export const GROUP_FACTOR: Record<number, number> = {
  1: 1,
  2: 0.8,
  3: 0.7,
  4: 0.65,
  5: 0.6,
  6: 0.57,
};

/** 载流量表行（与 JSON `values` 字段对应，数值以字符串存放） */
interface AmpacityRowValues {
  section: string;
  air: string;
  pipe: string;
  breaker?: string;
}

/** 载流量表行 */
interface AmpacityRow {
  id: string;
  label: string;
  values: AmpacityRowValues;
}

/** 解析后的表项（数值化、按截面升序） */
export interface AmpacityEntry {
  /** 截面（mm²） */
  sectionMm2: number;
  /** 明敷 / 空气基准载流量（A） */
  airA: number;
  /** 穿管基准载流量（A） */
  pipeA: number;
}

/** 由 JSON 解析出升序表项（模块级只解析一次） */
export const AMPACITY_ENTRIES: AmpacityEntry[] = (cableAmpacityTable.rows as AmpacityRow[])
  .map((row) => ({
    sectionMm2: Number(row.values.section),
    airA: Number(row.values.air),
    pipeA: Number(row.values.pipe),
  }))
  .filter(
    (entry) =>
      Number.isFinite(entry.sectionMm2) &&
      Number.isFinite(entry.airA) &&
      Number.isFinite(entry.pipeA),
  )
  .sort((a, b) => a.sectionMm2 - b.sectionMm2);

/** 输入参数 */
export interface AmpacityCheckInput {
  /** 回路计算电流 I_b（A） */
  ib: number;
  /** 敷设方式 */
  method: CableInstallMethod;
  /** 环境温度（℃，可选 30/35/40/45/50） */
  ambientC: number;
  /** 并列回路数（1~6） */
  circuits: number;
  /** 被校核截面（mm²，默认取表中 4 mm² 或最近的档） */
  sectionMm2?: number;
}

/** 计算结果 */
export interface AmpacityCheckResult {
  /** 输入是否有效（无效时数值字段全 0、compliant=false） */
  valid: boolean;
  /** 被校核截面的基准载流量（A） */
  baseA: number;
  /** 温度修正系数 */
  tempFactor: number;
  /** 并列回路修正系数 */
  groupFactor: number;
  /** 修正后允许载流量 I_z（A） */
  izA: number;
  /** 是否合规（I_b ≤ I_z） */
  compliant: boolean;
  /** 推荐最小截面（mm²，按修正后载流量从表内升序取第一个满足者） */
  recommendedSectionMm2: number;
  /** 补充说明 */
  note: string;
}

/** 取表内某敷设方式的基准载流量 */
function baseAmpacity(entry: AmpacityEntry, method: CableInstallMethod): number {
  return method === 'pipe' ? entry.pipeA : entry.airA;
}

/** 按截面取最近表项（优先精确匹配，其次绝对差最小） */
function findEntry(sectionMm2: number): AmpacityEntry {
  let best = AMPACITY_ENTRIES[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const entry of AMPACITY_ENTRIES) {
    const diff = Math.abs(entry.sectionMm2 - sectionMm2);
    if (diff < bestDiff) {
      best = entry;
      bestDiff = diff;
    }
    if (diff === 0) break;
  }
  return best;
}

/** 查修正系数：优先精确命中，否则取最近档位（越界钳制到端点） */
function lookupFactor(table: Record<number, number>, key: number): number {
  if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
  const keys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  if (keys.length === 0) return 1;
  if (key <= keys[0]) return table[keys[0]];
  if (key >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
  let nearest = keys[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const k of keys) {
    const diff = Math.abs(k - key);
    if (diff < bestDiff) {
      nearest = k;
      bestDiff = diff;
    }
  }
  return table[nearest];
}

/** 默认校核截面（表内第一档 ≥4mm²，用于未指定截面时给出可解释的基准值） */
const DEFAULT_SECTION_MM2 = 4;

/** 判定是否为有限数 */
function isFiniteNum(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 按敷设条件修正后校核载流量
 * @param input 输入参数
 */
export function checkAmpacity(input: AmpacityCheckInput): AmpacityCheckResult {
  const sectionMm2 = input.sectionMm2 ?? DEFAULT_SECTION_MM2;
  const ambientC = input.ambientC;
  const circuits = input.circuits;
  const method = input.method;

  const invalid =
    !isFiniteNum(input.ib) ||
    input.ib <= 0 ||
    !isFiniteNum(sectionMm2) ||
    sectionMm2 <= 0 ||
    !isFiniteNum(ambientC) ||
    ambientC < 30 ||
    ambientC > 50 ||
    !isFiniteNum(circuits) ||
    !Number.isInteger(circuits) ||
    circuits < 1 ||
    circuits > 6 ||
    (method !== 'air' && method !== 'pipe') ||
    AMPACITY_ENTRIES.length === 0;

  if (invalid) {
    return {
      valid: false,
      baseA: 0,
      tempFactor: 0,
      groupFactor: 0,
      izA: 0,
      compliant: false,
      recommendedSectionMm2: 0,
      note: '输入无效：I_b 须为正数，截面须为正数，环境温度取 30~50℃，并列回路数取 1~6，敷设方式取明敷或穿管',
    };
  }

  const tempFactor = lookupFactor(TEMP_FACTOR, ambientC);
  const groupFactor = lookupFactor(GROUP_FACTOR, circuits);

  const entry = findEntry(sectionMm2);
  const baseA = baseAmpacity(entry, method);
  const izA = baseA * tempFactor * groupFactor;
  const compliant = input.ib <= izA;

  // 推荐截面：从表内按截面升序找第一个「修正后 Iz ≥ I_b」的档位
  let recommendedSectionMm2 = AMPACITY_ENTRIES[AMPACITY_ENTRIES.length - 1].sectionMm2;
  let found = false;
  for (const candidate of AMPACITY_ENTRIES) {
    const candidateIz = baseAmpacity(candidate, method) * tempFactor * groupFactor;
    if (candidateIz >= input.ib) {
      recommendedSectionMm2 = candidate.sectionMm2;
      found = true;
      break;
    }
  }

  const methodText = method === 'pipe' ? '穿管' : '明敷/空气';
  const noteParts: string[] = [
    `按${methodText}基准值 ${formatA(baseA)}A × 温度 ${tempFactor} × 并列 ${groupFactor} 修正，I_z ≈ ${formatA(izA)}A（${ambientC}℃、${circuits} 回路，GB/T 16895.15 常用值）`,
  ];
  if (!found) {
    noteParts.push(
      `表内最大截面 ${recommendedSectionMm2}mm² 仍不满足 I_b=${formatA(input.ib)}A，需并联合并回路或采用更大截面/铜排，超出本表范围`,
    );
  }
  if (!compliant) {
    noteParts.push('不满足 I_b ≤ I_z，须加大截面或改善敷设条件（降温、减少并列回路）');
  }
  noteParts.push('断路器整定 I_n 还须满足 I_n ≤ I_z，请到断路器选型页校核');

  return {
    valid: true,
    baseA,
    tempFactor,
    groupFactor,
    izA,
    compliant,
    recommendedSectionMm2,
    note: noteParts.join('；'),
  };
}

/**
 * 载流量数值展示（保留 2 位小数后去尾零，仅用于说明文案）
 * @param value 数值
 */
function formatA(value: number): string {
  return String(Math.round(value * 100) / 100);
}
