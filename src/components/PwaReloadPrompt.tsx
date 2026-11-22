import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * PWA 更新 / 离线就绪提示
 * ------------------------------------------------------------------
 * - 「新版本可用」：提示用户刷新以启用最新版本（registerType: 'prompt'）。
 * - 「已可离线使用」：首访缓存完成后提示一次，告知用户断网也能用。
 * 说明：单文件构建模式下 `virtual:pwa-register/react` 被别名到空实现，
 *       本组件届时不会展示任何提示（行为一致、无副作用）。
 */

/** 周期性检查更新的间隔（毫秒）：1 小时 */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export default function PwaReloadPrompt(): JSX.Element | null {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // 已注册则开启周期检查；SW 自身也会在页面重访时自动校验
      if (!registration) return;
      window.setInterval(() => {
        void registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(error) {
      // 注册失败不影响主功能，仅打印便于排查
      console.error('[PWA] Service Worker 注册失败：', error);
    },
  });

  // 用户点击“关闭”：两个提示都收起
  const close = (): void => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  /*
   * 位置：bottom-28（112px）。
   * 页脚版本行在 `pb-20`（80px）之上，即文字底边约在距底 80px 处；
   * bottom-20 会让提示条底边正好压在文字底边上（重叠 16px），
   * bottom-24 只是贴住页脚文字顶边，故取 bottom-28 留出 16px 间隙，且仍在 TabBar 之上。
   */
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-28 z-50 mx-auto flex w-[min(92vw,28rem)] items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 shadow-lg"
    >
      <span className="text-sm text-fg">
        {needRefresh ? '发现新版本，刷新后即可使用。' : '已缓存，可离线使用。'}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {needRefresh && (
          <button
            type="button"
            className="ne-focus rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg"
            onClick={() => {
              void updateServiceWorker(true);
            }}
          >
            刷新
          </button>
        )}
        <button
          type="button"
          className="ne-focus rounded px-2 py-1.5 text-sm text-muted hover:text-fg"
          onClick={close}
          aria-label="关闭提示"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
