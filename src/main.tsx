import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

declare global {
  interface Window {
    /**
     * index.html 的旧浏览器门禁（纯 ES5 内联脚本）在能力缺失时**同步**置为 true。
     * 主包入口据此不挂载应用，避免 React 并发首渲染覆盖门禁写好的升级提示卡。
     */
    __NE_LEGACY_BLOCKED__?: boolean;
  }
}

/**
 * 应用入口
 * - 初始化默认主题（GitHub 暗色）。T03 起由 Zustand persist 读取并同步 --- 保持默认 dark 作为兜底。
 * - PWA 的 Service Worker 由 vite-plugin-pwa（injectRegister: 'auto'）自动注入注册，
 *   此处无需手动注册，从而与单文件构建模式天然兼容。
 * - v1.8：先看 index.html 旧浏览器门禁留下的标记。基线浏览器只是缺个别运行期 API
 *   （Array.prototype.flat / Object.fromEntries 等），ES2018 主包仍会下载执行；
 *   这里不挂载应用，卡片才不会被覆盖（现代浏览器无标记，行为与原实现完全一致）。
 */
function initTheme(): void {
  const root = document.documentElement;
  // 兜底：未持久化偏好时使用 GitHub 暗色
  if (!root.classList.contains('dark') && !root.classList.contains('light')) {
    root.classList.add('dark');
  }
}

/** 门禁已判定浏览器过低：保留 index.html 渲染的提示卡，不挂载应用 */
const legacyBlocked = window.__NE_LEGACY_BLOCKED__ === true;

if (!legacyBlocked) {
  initTheme();

  const container = document.getElementById('root');
  if (container) {
    createRoot(container).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
}
