import type { CalcResult } from '@/types/calculator';

/**
 * 计算类工具组件的通用取值与结果构造辅助
 */

/** 从表单值中安全取数值 */
export function num(values: Record<string, string>, key: string, fallback = 0): number {
  const raw = values[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** 从表单值中取字符串 */
export function str(values: Record<string, string>, key: string, fallback = ''): string {
  const raw = values[key];
  return raw === undefined || raw === '' ? fallback : raw;
}

/** 从表单值中取布尔（'1'/'true'） */
export function bool(values: Record<string, string>, key: string): boolean {
  const raw = values[key];
  return raw === '1' || raw === 'true';
}

/** 构造结果项（减少样板代码） */
export function res(
  key: string,
  label: string,
  value: string | number,
  unit?: string,
  opts: Partial<CalcResult> = {},
): CalcResult {
  return { key, label, value, unit, ...opts };
}

/** 构造错误结果项 */
export function errResult(message: string): CalcResult {
  return { key: 'error', label: '错误', value: message };
}
