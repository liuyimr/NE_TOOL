import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type PluginOption } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** package.json 作为版本号唯一来源 */
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

/**
 * Vite 配置
 * - 默认构建（npm run build）→ 标准 PWA 产物（多文件 + Service Worker），输出 dist/
 * - 单文件构建（npm run build:single，mode=single）→ 关闭 PWA、启用 singlefile，
 *   JS/CSS 全部内联进单个 HTML，输出 dist-single/，可直接双击离线使用。
 */
export default defineConfig(({ mode }) => {
  const isSingle = mode === 'single';

  return {
    // 构建期常量：「关于」页展示的版本与构建日期，版本取自 package.json
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    },
    // 相对路径基准：HashRouter + 单文件本地打开均兼容
    base: './',
    plugins: [
      react(),
      // PWA：仅标准构建启用
      !isSingle &&
        VitePWA({
          // 'prompt'：新版本就绪后由 src/components/PwaReloadPrompt 提示用户刷新，
          // 避免用户正在计算时被静默刷新打断；离线能力仍由全量预缓存保证。
          registerType: 'prompt',
          // 关闭自动注入，改由 useRegisterSW（PwaReloadPrompt）统一注册与更新提示
          injectRegister: false,
          includeAssets: ['favicon.svg', 'logo.svg'],
          manifest: {
            name: '工程师工具箱',
            short_name: '工程工具箱',
            description: '网络 / 建筑智能化 / 工业自动化工程师常用计算与速查，离线可用',
            lang: 'zh-CN',
            start_url: './',
            scope: './',
            display: 'standalone',
            orientation: 'portrait',
            background_color: '#0d1117',
            theme_color: '#0d1117',
            icons: [
              { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
              {
                // maskable 单独一张：内容收在安全区内，避免被圆形/圆角裁到字标两端
                src: 'icons/pwa-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
            cleanupOutdatedCaches: true,
            navigateFallback: 'index.html',
            // 全量预缓存，首访后 100% 离线可用
          },
          devOptions: { enabled: false },
        }),
      // 单文件：仅 single 模式启用
      isSingle && viteSingleFile({ removeViteModuleLoader: true }),
    ].filter((plugin): plugin is PluginOption => Boolean(plugin)),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // 单文件构建不含 Service Worker：将 PWA 注册虚拟模块别名到空实现，
        // 使 PwaReloadPrompt 在两套构建下都能被解析（详见 src/pwa/pwaRegisterStub.ts）。
        ...(isSingle
          ? {
              'virtual:pwa-register/react': fileURLToPath(
                new URL('./src/pwa/pwaRegisterStub.ts', import.meta.url),
              ),
            }
          : {}),
      },
    },
    build: {
      outDir: isSingle ? 'dist-single' : 'dist',
      emptyOutDir: true,
      // BigInt 字面量（IP / 进制换算引擎）要求 ES2020+，故目标不低于 es2020
      target: 'es2020',
      cssTarget: 'chrome80',
      // 小图直接内联为 data URI：NewE 标识（约 12KB）随页面走，
      // 使单文件产物保持自包含、PWA 预缓存不增加独立资源条目
      assetsInlineLimit: 32 * 1024,
      // 单文件模式下无需分块
      chunkSizeWarningLimit: 1500,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      globals: false,
    },
  };
});
