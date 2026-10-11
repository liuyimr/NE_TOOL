/**
 * URL 参数工具（纯函数）
 * 面向 HashRouter：形如 `#/tool/network.subnet?ip=192.168.1.10&mask=26`。
 * 用于「结果可分享链接」：序列化工具输入参数、并从 URL 回填。
 */

/** 可序列化的参数值类型 */
export type ParamValue = string | number | boolean | null | undefined;

/**
 * 将参数对象序列化为查询字符串（不含前导 '?'）
 * 自动跳过 undefined / null；字符串统一 encodeURIComponent。
 * @param params 参数对象
 */
export function encodeParams(params: Record<string, ParamValue>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.join('&');
}

/**
 * 解析查询字符串为参数对象
 * @param search 查询字符串（可含前导 '?'），或完整 URL
 */
export function parseParams(search: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!search) return result;
  const idx = search.indexOf('?');
  const query = idx >= 0 ? search.slice(idx + 1) : search.replace(/^[#]/, '');
  const clean = query.split('#')[0];
  if (!clean) return result;
  for (const pair of clean.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq < 0) {
      result[decodeURIComponent(pair)] = '';
    } else {
      const key = decodeURIComponent(pair.slice(0, eq));
      const value = decodeURIComponent(pair.slice(eq + 1));
      result[key] = value;
    }
  }
  return result;
}

/**
 * 构建工具页的 Hash 路由（可直接作为 <a href> 或 window.location.hash 使用）
 * @param toolId 工具 id
 * @param params 输入参数
 * @returns 形如 `#/tool/network.subnet?ip=...`
 */
export function buildToolHash(
  toolId: string,
  params?: Record<string, ParamValue>,
): string {
  const query = params ? encodeParams(params) : '';
  return `#/tool/${encodeURIComponent(toolId)}${query ? `?${query}` : ''}`;
}

/**
 * 从 HashRouter 的 location 中解析工具页参数
 * @param hash location.hash（形如 '#/tool/xxx?a=1'）
 * @param search location.search（BrowserRouter 场景，可忽略）
 */
export function readToolParams(hash: string, search = ''): Record<string, string> {
  // 优先取 hash 内的 query，HashRouter 场景参数位于 hash 中
  const fromHash = parseParams(hash);
  const fromSearch = parseParams(search);
  return { ...fromHash, ...fromSearch };
}

/**
 * 从字符串安全解析数值（无效返回 fallback）
 * @param raw 原始字符串
 * @param fallback 回退值
 */
export function toNumber(raw: string | undefined, fallback = NaN): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 从字符串解析布尔值（'1'/'true'/'on' → true）
 * @param raw 原始字符串
 */
export function toBool(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  return ['1', 'true', 'on', 'yes'].includes(raw.toLowerCase());
}
