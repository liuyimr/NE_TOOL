/**
 * 剪贴板工具（含降级方案）
 * 优先使用异步 Clipboard API；不可用时回退到隐藏 textarea + execCommand。
 */

/**
 * 复制文本到剪贴板
 * @param text 待复制文本
 * @returns 是否成功
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  // 首选：异步 Clipboard API（要求安全上下文）
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 落入降级方案
  }

  return fallbackCopy(text);
}

/**
 * 降级复制：创建隐藏 textarea，选中后 execCommand('copy')
 * @param text 待复制文本
 */
function fallbackCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
