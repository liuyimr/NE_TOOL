/**
 * A5 · 传输时间估算（纯函数）
 * 公式（PRD #4）：t = 数据量(bit) ÷ 带宽(bps)；可选叠加协议开销。
 */

export interface TransmissionInput {
  /** 数据量数值 */
  size: number;
  /** 数据量单位（'bit' | 'Kb' | 'Mb' | 'Gb' | 'KB' | 'MB' | 'GB' | 'TB'） */
  sizeUnit: string;
  /** 带宽数值 */
  bandwidth: number;
  /** 带宽单位（'bps' | 'Kbps' | 'Mbps' | 'Gbps'） */
  bandwidthUnit: string;
  /** 协议开销百分比（0-100），默认 0，如以太网 +3%；≥100 会按 99% 钳制以避免除零 */
  overheadPct?: number;
}

export interface TransmissionResult {
  /** 有效比特率（含开销折减后） */
  effectiveBps: number;
  /** 数据总比特数（含开销放大） */
  totalBits: number;
  /** 理论传输秒数（不含开销） */
  theoreticalSeconds: number;
  /** 实际传输秒数（含开销） */
  actualSeconds: number;
  /** 人类可读文本 */
  human: string;
}

/** 数据量单位 → 比特数 */
const SIZE_FACTORS: Record<string, number> = {
  bit: 1,
  Kb: 1e3,
  Mb: 1e6,
  Gb: 1e9,
  KB: 8e3,
  MB: 8e6,
  GB: 8e9,
  TB: 8e12,
};

/** 带宽单位 → bps */
const RATE_FACTORS: Record<string, number> = {
  bps: 1,
  Kbps: 1e3,
  Mbps: 1e6,
  Gbps: 1e9,
};

/** 协议开销上限（%）：达到 100% 时有效码率为 0 会引发除零/无穷大，故钳制到 99%。 */
const MAX_OVERHEAD_PCT = 99;

/**
 * 归一化协议开销：非有限值按 0，负值钳到 0，超上限（≥100）钳到 99。
 * 目的：保证有效码率恒 > 0，结果有限且语义明确（不再出现 Infinity / 负码率）。
 * @param pct 原始开销百分比
 */
function clampOverheadPct(pct: number | undefined): number {
  if (!Number.isFinite(pct)) return 0;
  const n = pct as number;
  if (n < 0) return 0;
  if (n > MAX_OVERHEAD_PCT) return MAX_OVERHEAD_PCT;
  return n;
}

/**
 * 将秒数格式化为「x 天 y 时 z 分 w 秒」
 * @param seconds 秒
 */
export function humanizeSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} 毫秒`;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} 天`);
  if (h) parts.push(`${h} 时`);
  if (m) parts.push(`${m} 分`);
  if (s || parts.length === 0) parts.push(`${s} 秒`);
  return parts.join(' ');
}

/**
 * 传输时间估算
 * @param input 输入参数
 */
export function transmissionTime(input: TransmissionInput): TransmissionResult {
  const sizeFactor = SIZE_FACTORS[input.sizeUnit] ?? 1;
  const rateFactor = RATE_FACTORS[input.bandwidthUnit] ?? 1;
  // 协议开销：钳制到 [0, 99]，避免有效码率为 0（除零）或为负（无穷大 / 语义不清）
  const overhead = clampOverheadPct(input.overheadPct);
  const overheadRatio = 1 - overhead / 100; // ∈ [0.01, 1]，恒 > 0

  const rawBits = (input.size ?? 0) * sizeFactor;
  const bps = (input.bandwidth ?? 0) * rateFactor;
  const effectiveBps = bps * overheadRatio;
  const totalBits = rawBits / overheadRatio;

  const theoreticalSeconds = bps > 0 ? rawBits / bps : Infinity;
  const actualSeconds = effectiveBps > 0 ? rawBits / effectiveBps : Infinity;

  return {
    effectiveBps,
    totalBits,
    theoreticalSeconds,
    actualSeconds,
    human: humanizeSeconds(actualSeconds),
  };
}
