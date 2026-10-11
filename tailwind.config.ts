import type { Config } from 'tailwindcss';

/**
 * Tailwind 主题配置
 * 颜色全部映射到 CSS 变量（见 src/index.css），由 :root / .dark / .light 驱动，
 * 因此深浅主题一键切换，且品牌色（--ne-accent）可随时替换而不改代码。
 * 默认主题：GitHub 暗色（#0d1117 bg / #161b22 surface / #c9d1d9 fg / #58a6ff accent）。
 */
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--ne-bg)',
        surface: 'var(--ne-surface)',
        'surface-2': 'var(--ne-surface-2)',
        border: 'var(--ne-border)',
        fg: 'var(--ne-fg)',
        muted: 'var(--ne-muted)',
        accent: 'var(--ne-accent)',
        'accent-fg': 'var(--ne-accent-fg)',
        success: 'var(--ne-success)',
        warning: 'var(--ne-warning)',
        danger: 'var(--ne-danger)',
      },
      borderColor: {
        DEFAULT: 'var(--ne-border)',
      },
      // 触控目标 ≥44px（NFR 移动端适配）
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      spacing: {
        // 底部导航安全区（iPhone 横条）
        safe: 'env(safe-area-inset-bottom, 0px)',
        // 顶部安全区（刘海屏 / PWA 独立窗口下状态栏）
        'safe-top': 'env(safe-area-inset-top, 0px)',
      },
    },
  },
  plugins: [],
};

export default config;
