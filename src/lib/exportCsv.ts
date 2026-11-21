import { formatNumber } from '@/lib/format';

/**
 * CSV 导出（纯函数 + 一个极薄的 DOM 下载封装）
 * ------------------------------------------------------------------
 * 目标：把「计算结果」导出成 Excel / WPS 双击即可打开的 CSV。
 * 关键点：
 *   1) 首部写入 UTF-8 BOM（`\uFEFF`）——否则 Excel/WPS 按本地编码解码，中文变乱码；
 *   2) 行结束符用 CRLF（RFC 4180），Windows 下 Excel 兼容性最好；
 *   3) 字段含逗号 / 双引号 / 换行时整体加双引号，内部双引号翻倍转义；
 *   4) 下载走 Blob + `<a download>`，不依赖后端，`file://` 下同样可用。
 * 说明：本模块不做任何业务计算，测试与 UI 共用同一套转义规则，避免口径分叉。
 */

/** 一行导出数据（项目 / 数值 / 单位） */
export interface CsvRow {
  /** 项目名（结果标签） */
  label: string;
  /** 数值（字符串原样输出，数值按显示口径格式化） */
  value: string | number;
  /** 单位（可空） */
  unit?: string;
}

/** 导出元信息 */
export interface CsvMeta {
  /** 工具名（取注册表 title，缺省退化为 id） */
  tool: string;
  /** 导出时间（本地 `YYYY-MM-DD HH:mm`） */
  time: string;
}

/** 行结束符（RFC 4180，Windows Excel/WPS 最佳兼容） */
const LINE_END = '\r\n';

/** 表头 */
const HEADER: readonly string[] = ['项目', '数值', '单位'];

/** 需要加引号包裹的字符：逗号、双引号、CR、LF */
const NEEDS_QUOTE = /[",\r\n]/;

/**
 * 单个字段转义
 * @param input 原始字段内容
 * @returns 转义后可安全拼接的字段
 */
function escapeField(input: string): string {
  if (!NEEDS_QUOTE.test(input)) return input;
  return `"${input.replace(/"/g, '""')}"`;
}

/**
 * 整行拼接（字段以逗号分隔，逐字段转义）
 * @param fields 字段数组
 */
function joinRow(fields: readonly string[]): string {
  return fields.map(escapeField).join(',');
}

/**
 * 数值 → 文本：与界面保持一致（数值走 formatNumber，字符串原样）
 * @param value 结果值
 */
function valueToText(value: string | number): string {
  return typeof value === 'number' ? formatNumber(value) : value;
}

/**
 * 生成 CSV 文本
 * @param rows 结果行
 * @param meta 工具名与导出时间
 * @returns 含 BOM 的 CSV 文本（`rows` 为空时仍输出元信息与表头）
 */
export function toCsv(rows: CsvRow[], meta: CsvMeta): string {
  const lines: string[] = [];
  // 元信息两行 + 空行 + 表头
  lines.push(joinRow(['工具', meta.tool]));
  lines.push(joinRow(['导出时间', meta.time]));
  lines.push('');
  lines.push(joinRow(HEADER));
  for (const row of rows) {
    lines.push(joinRow([row.label, valueToText(row.value), row.unit ?? '']));
  }
  return `\uFEFF${lines.join(LINE_END)}`;
}

/** 两位补零 */
function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * 生成本地时间戳文本 `YYYY-MM-DD HH:mm`
 * @param date 时间（默认当前时间）
 */
export function formatTimestamp(date: Date = new Date()): string {
  const y = date.getFullYear();
  const mo = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

/** 文件名中不允许出现的字符（Windows / macOS 通用非法集合） */
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

/**
 * 生成下载文件名 `<tool>-YYYYMMDD-HHmm.csv`
 * 去掉 `\ / : * ? " < > |` 与首尾空格；清洗后为空时退化为 `tool`。
 * @param tool 工具名
 * @param date 时间（默认当前时间）
 */
export function csvFilename(tool: string, date: Date = new Date()): string {
  const cleaned = tool.replace(ILLEGAL_FILENAME_CHARS, '').trim();
  const safeTool = cleaned === '' ? 'tool' : cleaned;
  const stamp =
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `-${pad2(date.getHours())}${pad2(date.getMinutes())}`;
  return `${safeTool}-${stamp}.csv`;
}

/**
 * 触发浏览器下载（Blob + ObjectURL + 临时 `<a download>`）
 * 在无 DOM（如 SSR / 单元测试环境）或缺少 ObjectURL 能力时静默跳过，绝不抛错。
 * @param filename 文件名
 * @param content CSV 文本（含 BOM）
 */
export function downloadCsv(filename: string, content: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    // 立即释放会偶发导致下载中断（Safari / file://），延后到下一个任务释放
    if (typeof URL.revokeObjectURL === 'function') {
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}
