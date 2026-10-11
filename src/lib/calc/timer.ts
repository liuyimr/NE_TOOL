/**
 * C14 · 定时器 / 计数器换算（纯函数）
 * 公式（PRD #26）：时基 × 设定值 = 实际时间
 */

export type TimeUnit = 'ms' | 's' | 'min' | 'h';

/** 时间单位 → 毫秒 */
export const TIME_UNIT_MS: Record<TimeUnit, number> = {
  ms: 1,
  s: 1000,
  min: 60000,
  h: 3600000,
};

/** PLC（如西门子 S5TIME）常见时基（ms） */
export const TIMER_BASES: { label: string; baseMs: number }[] = [
  { label: '10 ms', baseMs: 10 },
  { label: '100 ms', baseMs: 100 },
  { label: '1 s', baseMs: 1000 },
  { label: '10 s', baseMs: 10000 },
];

/**
 * 时基 × 设定值 → 实际时间（ms）
 * @param baseMs 时基（ms）
 * @param value 设定值
 */
export function timerMillis(baseMs: number, value: number): number {
  return Math.max(0, baseMs) * Math.max(0, value);
}

/**
 * 实际时间 → 各时间单位
 * @param value 数值
 * @param fromUnit 源单位
 * @returns 各单位的换算结果
 */
export function timerConvert(value: number, fromUnit: TimeUnit): Record<TimeUnit, number> {
  const ms = value * TIME_UNIT_MS[fromUnit];
  const result = {} as Record<TimeUnit, number>;
  (Object.keys(TIME_UNIT_MS) as TimeUnit[]).forEach((unit) => {
    result[unit] = ms / TIME_UNIT_MS[unit];
  });
  return result;
}

/**
 * 将毫秒格式化为「x 时 x 分 x 秒」人类可读文本
 * @param ms 毫秒
 */
export function humanizeMillis(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = ms / 1000;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} 时`);
  if (m) parts.push(`${m} 分`);
  if (s || parts.length === 0) parts.push(`${Number(s.toFixed(3))} 秒`);
  return parts.join(' ');
}
