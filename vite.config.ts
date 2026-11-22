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
 * 构建日期（本地时区 YYYY-MM-DD）
 * 不能用 toISOString()：它返回 UTC 日期，中国时区 0~8 点构建会显示前一天。
 */
function localDate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * 构建产物语法补丁（v1.8 A1 配套）
 * ------------------------------------------------------------------
 * Vite 内部的 `vite:build-import-analysis` 会给每个动态 import 包一层
 * `__vitePreload(fn, deps, import.meta.url)`，其中 `import.meta` 是 ES2020 语法。
 * 本项目已设 `build.modulePreload: false`，因此 `deps` 恒为 `[]`，而 Vite 的
 * preload 实现里第三个参数只在 `deps.length > 0` 分支内被读取
 * （源码：`function(t,n,r){ if(n && n.length>0){ ... new URL(dep, r) ... } return t() }`）。
 * 替换成 `document.baseURI`：语义上等价于「当前页面 URL」（base 为 './' 时正是要的基准），
 * 即使将来重新打开 modulePreload 也不会抛 URL 解析错误；同时让产物语法落在 ES2018。
 */
function stripImportMetaUrl(): PluginOption {
  return {
    name: 'ne:strip-import-meta-url',
    apply: 'build',
    /*
     * 不加 enforce: 'post'：必须排在 vite-plugin-singlefile 之前执行
     * （后者同样在 generateBundle 里读取 chunk.code 并内联进 HTML，
     *  若我们晚于它，单文件产物里会残留 import.meta.url）。
     */
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        if (!output.code.includes('import.meta.url')) continue;
        output.code = output.code.split('import.meta.url').join('document.baseURI');
      }
    },
  };
}

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
      __BUILD_TIME__: JSON.stringify(localDate()),
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
          // 说明：public/ 下已无独立 SVG 静态资源（favicon / NewE 标识分别以
          // index.html 的 data URI 与 assetsInlineLimit 内联的 webp 提供），
          // 因此无需 includeAssets；其余产物（JS/CSS/HTML/PNG/manifest）由下面
          // workbox.globPatterns 全量登记，审计时预缓存条目数 = dist/ 实际文件数。
          manifest: {
            name: '工程师工具箱',
            short_name: '工程工具箱',
            description: '网络与物联网 / 楼宇自控 / 暖通空调 / 工业自动化 / 电气配电工程师常用计算与速查，离线可用',
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
            // manifest.icons 里的三张 PWA 图标会被插件按其自身的 revision 注入预缓存清单，
            // 若同时被 globPatterns 的 `**/*.png` 再扫一遍，就会出现同 URL 的两条重复条目
            // （条目数虚高、体积统计翻倍）。这里把这三张图从 glob 中排除，图标仍由 manifest 注入，
            // 离线可用性不变，预缓存条目数 = 实际文件数。
            globIgnores: ['icons/pwa-*.png'],
            cleanupOutdatedCaches: true,
            navigateFallback: 'index.html',
            // 全量预缓存，首访后 100% 离线可用
          },
          devOptions: { enabled: false },
        }),
      // 单文件：仅 single 模式启用
      isSingle && viteSingleFile({ removeViteModuleLoader: true }),
      // 产物语法补丁：去掉 import.meta.url（ES2020），见函数注释
      stripImportMetaUrl(),
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
      /*
       * 浏览器兼容基线（v1.8）：语法降到 ES2018，配合 index.html 的特性检测覆盖 Chrome 64+。
       * - 唯一曾抬高目标的是 BigInt **字面量**（`1n` 等，ES2020 语法），已改为 `BigInt(1)`；
       *   BigInt 的**运行时**能力 Chrome 67+ / Firefox 68+ / Safari 14+ 早已具备，
       *   不影响补码、位宽等计算逻辑。
       * - ES2018 下 esbuild 会转译 `?.` / `??` / `??=` 等新语法，这部分会让代码略增；
       *   但同一版关掉了 modulePreload（见下），省下的 preload 辅助代码更多，
       *   实测主包 214.78 kB（v1.7.0 为 219.05 kB），未膨胀。
       * - 低于基线的旧浏览器由 index.html 里的纯 ES5 内联脚本检测并给出升级提示。
       */
      target: 'es2018',
      cssTarget: 'chrome61',
      /*
       * 关闭 modulePreload：Vite 的动态 import 包装器 `__vitePreload` 会注入
       * `import.meta.url`（ES2020 语法），会让 `npm run check:es`（es2018）失败。
       * 本项目是 SPA + PWA 全量预缓存，首个路由之后的 chunk 都已离线在本地，
       * 少一层 preload 对体验几乎无影响，换来产物语法真正落在 ES2018。
       */
      modulePreload: false,
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
