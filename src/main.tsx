import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * 应用入口
 * - 初始化默认主题（GitHub 暗色）。T03 起由 Zustand persist 读取并同步 --- 保持默认 dark 作为兜底。
 * - PWA 的 Service Worker 由 vite-plugin-pwa（injectRegister: 'auto'）自动注入注册，
 *   此处无需手动注册，从而与单文件构建模式天然兼容。
 */
function initTheme(): void {
  const root = document.documentElement;
  // 兜底：未持久化偏好时使用 GitHub 暗色
  if (!root.classList.contains('dark') && !root.classList.contains('light')) {
    root.classList.add('dark');
  }
}

initTheme();

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
