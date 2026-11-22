#!/usr/bin/env node
/**
 * 单文件版发布脚本（零依赖，仅用 Node 内置模块）
 * ------------------------------------------------------------------
 * 职责：把 `dist-single/index.html` 复制为 `docs/index.html`，作为 GitHub Pages 站点根目录。
 *
 * 为什么需要它：
 *   - GitHub Pages 的站点目录只能是「仓库根目录」或 `docs/`。根目录被 Vite 入口
 *     （index.html 指向 /src/main.tsx）占用，故选用 `docs/`。
 *   - 单文件产物必须**真正自包含**（JS/CSS/图标全部内联、无外部引用、无 Service Worker），
 *     才能保证「拷一个文件就能用、断网也能用」。本脚本在复制后做强制校验。
 *
 * 用法：
 *   node scripts/copy-standalone.mjs
 *     → 默认流程：校验 dist-single/index.html 存在 → 复制到 docs/index.html → 校验产物。
 *   node scripts/copy-standalone.mjs <某个 html 文件>
 *     → 「校验模式」：只校验指定文件（不复制）。用于对篡改副本做反例/证伪测试。
 *
 * 自包含校验覆盖（任一命中即失败、退出码非 0）：
 *   1. <link> / <script> 的 href / src 以 `/`、`./`、`../`、`//`、`http`(含 https) 开头
 *      （data: URI 不算；无引号属性 `${"<script src=/x.js>"}` 也能命中）。
 *   2. CSS 资源：`@import` 出现即失败；`url(...)` 内容为非 data:（且非 `#` 内部引用）即失败。
 *   3. 媒体 / 嵌入标签的外部引用：<img> <source> <video> <audio> <iframe> <object> <embed>
 *      <use> <image> 的 src / srcset / poster / data / href / xlink:href；`srcset` 按逗号
 *      拆分逐项判定（先去掉 `1x` / `640w` 这类描述符）。防止「单文件里混入外部图片」回归。
 *   4. 含 `navigator.serviceWorker`。
 *   5. 版本号断言：产物 HTML 必须包含 package.json 的 version（__APP_VERSION__ 注入值）。
 *   6. 构建日期断言：产物 HTML 必须包含今天日期 YYYY-MM-DD（__BUILD_TIME__ 注入值），
 *      跨天未重建会失败，避免发布「新版号 + 旧产物」。
 *   注意：产物 JS 字符串含大量 `https://`（React 报错链接、W3C 命名空间等）属正常，
 *   因校验只针对标签属性与 CSS url()/@import，故不会误报。
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));

/** 外部资源判定：以 / ./ ../ // http(s) 开头即视为外部依赖 */
const EXTERNAL_PREFIX = /^(?:\/|\.\.?\/|\/\/|https?:)/i;

/** 截取索引附近的上下文（用于失败时打印具体位置） */
function contextAround(html, index, before = 40, after = 80) {
  const start = Math.max(0, index - before);
  const end = Math.min(html.length, index + after);
  const snippet = html.slice(start, end).replace(/\s+/g, ' ');
  return (start > 0 ? '…' : '') + snippet + (end < html.length ? '…' : '');
}

/** 判断某个属性值是否指向外部资源 */
function isExternal(value) {
  const v = (value ?? '').trim();
  if (v === '') return false;
  if (v.startsWith('data:')) return false; // 内联资源，放行
  return EXTERNAL_PREFIX.test(v);
}

/** 校验全部 <link>/<script> 标签的 href/src */
function collectTagProblems(html) {
  const problems = [];
  const tagRe = /<(link|script)\b[^>]*>/gi;
  let tag;
  while ((tag = tagRe.exec(html)) !== null) {
    const rawTag = tag[0];
    const attrRe = /\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let attr;
    while ((attr = attrRe.exec(rawTag)) !== null) {
      const value = attr[2] ?? attr[3] ?? attr[4] ?? '';
      if (isExternal(value)) {
        problems.push({
          kind: `<${tag[1]}> 的 ${attr[1]} 指向外部资源`,
          value: `"${value}"`,
          context: contextAround(html, tag.index),
        });
      }
    }
  }
  return problems;
}

/**
 * 媒体 / 嵌入标签 → 需要检查的资源属性
 * 覆盖图片、音视频、内嵌框架与 SVG 引用；`use` / `image` 在 SVG 内用 href / xlink:href。
 */
const MEDIA_ATTR_MAP = {
  img: ['src', 'srcset'],
  source: ['src', 'srcset'],
  video: ['src', 'poster'],
  audio: ['src'],
  iframe: ['src'],
  object: ['data'],
  embed: ['src'],
  use: ['href', 'xlink:href'],
  image: ['href', 'xlink:href'],
};

/**
 * 拆分 srcset，取出每个候选 URL
 * 规则：按逗号分项 → 去掉首尾空白 → 丢弃 `1x` / `2x` / `640w` 之类的描述符。
 * @param {string} value srcset 原始属性值
 * @returns {string[]} 候选 URL 列表
 */
function splitSrcset(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => (item.trim().split(/\s+/)[0] ?? '').trim())
    .filter((url) => url !== '');
}

/**
 * 校验媒体 / 嵌入标签的资源属性是否指向外部（防「单文件里混入外部图片」回归）
 * @param {string} html 待校验的 HTML
 * @returns {Array<{kind: string, value: string, context: string}>} 问题列表
 */
function collectMediaProblems(html) {
  const problems = [];
  const tagNames = Object.keys(MEDIA_ATTR_MAP).join('|');
  const tagRe = new RegExp(`<(${tagNames})\\b[^>]*>`, 'gi');
  let tag;
  while ((tag = tagRe.exec(html)) !== null) {
    const rawTag = tag[0];
    const tagName = String(tag[1]).toLowerCase();
    for (const attrName of MEDIA_ATTR_MAP[tagName]) {
      // `xlink:href` 里的冒号需转义，否则正则语义会漂移
      const attrRe = new RegExp(
        `\\b${attrName.replace(/:/g, '\\:')}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
        'gi',
      );
      let attr;
      while ((attr = attrRe.exec(rawTag)) !== null) {
        // `href` 的匹配也会命中 `xlink:href` 内部，跳过以免同一属性被重复报告
        if (attrName === 'href' && rawTag.charAt(attr.index - 1) === ':') continue;
        const value = attr[1] ?? attr[2] ?? attr[3] ?? '';
        const candidates = attrName === 'srcset' ? splitSrcset(value) : [value.trim()];
        for (const candidate of candidates) {
          if (!isExternal(candidate)) continue;
          problems.push({
            kind: `<${tagName}> 的 ${attrName} 指向外部资源`,
            value: `"${candidate}"`,
            context: contextAround(html, tag.index),
          });
        }
      }
    }
  }
  return problems;
}

/** 提取所有 <style> 块的内容（CSS 只在这些块里；避免误伤 JS 中的 `new URL(...)` 等） */
function extractStyleBlocks(html) {
  const blocks = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(html)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

/** 校验 CSS（仅扫描 <style> 块）：@import 与 url() */
function collectCssProblems(html) {
  const problems = [];
  for (const css of extractStyleBlocks(html)) {
    const importRe = /@import\b/gi;
    let imp;
    while ((imp = importRe.exec(css)) !== null) {
      problems.push({
        kind: 'CSS @import',
        value: '@import',
        context: contextAround(css, imp.index),
      });
    }

    const urlRe = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)/gi;
    let u;
    while ((u = urlRe.exec(css)) !== null) {
      const value = (u[1] ?? u[2] ?? u[3] ?? '').trim();
      // 放行：data: 内联 与 # 内部引用；其余（含 / ./ // http 及相对路径）判失败
      if (value === '' || value.startsWith('data:') || value.startsWith('#')) continue;
      problems.push({
        kind: 'CSS url() 指向外部资源',
        value: `url(${value})`,
        context: contextAround(css, u.index),
      });
    }
  }
  return problems;
}

/** 综合自包含校验：返回问题列表（空 = 通过） */
function validate(html) {
  const problems = [
    ...collectTagProblems(html),
    ...collectMediaProblems(html),
    ...collectCssProblems(html),
  ];
  if (html.includes('navigator.serviceWorker')) {
    const index = html.indexOf('navigator.serviceWorker');
    problems.push({
      kind: '存在 Service Worker 注册痕迹',
      value: 'navigator.serviceWorker',
      context: contextAround(html, index),
    });
  }
  return problems;
}

/** 校验一个文件并在失败时打印详情（返回是否通过） */
function validateFileOrFail(filePath) {
  const html = readFileSync(filePath, 'utf8');
  const problems = validate(html);
  if (problems.length > 0) {
    console.error('[standalone] 自包含校验失败，产物仍存在外部依赖：');
    for (const item of problems) {
      console.error(`  - ${item.kind}：${item.value}`);
      console.error(`      位置：… ${item.context} …`);
    }
    return false;
  }
  return true;
}

const positional = process.argv.slice(2);

// 模式二：校验模式（传入文件路径 → 只校验，不复制）
if (positional.length > 0) {
  const file = resolve(positional[0]);
  if (!existsSync(file)) {
    console.error('[standalone] 待校验文件不存在：' + file);
    process.exit(1);
  }
  if (!validateFileOrFail(file)) {
    process.exit(1);
  }
  console.log('[standalone] 校验通过（未复制）：' + file);
  process.exit(0);
}

// 模式一：默认流程（复制 dist-single/index.html → docs/index.html，再校验）
const source = join(root, 'dist-single', 'index.html');
const targetDir = join(root, 'docs');
const target = join(targetDir, 'index.html');

if (!existsSync(source)) {
  console.error('[standalone] 未找到 dist-single/index.html。');
  console.error('[standalone] 请先执行：npm run build:single');
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
const html = readFileSync(source, 'utf8');
writeFileSync(target, html, 'utf8');

if (!validateFileOrFail(target)) {
  console.error('[standalone] 请确认以 single 模式（npm run build:single）构建，且未引入外部资源。');
  process.exit(1);
}

const sizeKb = (statSync(target).size / 1024).toFixed(1);
console.log('[standalone] 已生成 docs/index.html');
console.log('  路径：' + target);
console.log('  体积：' + sizeKb + ' KB');
console.log('  自包含校验：通过（link/script 无外部引用、CSS 无外部 url/@import、无 navigator.serviceWorker）');

// ---------------------------------------------------------------------------
// 产物内容断言：版本号与构建日期必须与实际注入值一致
// 日期必须按本地时区计算，与 vite.config.ts 的 localDate() 同源；toISOString 是 UTC，会差一天
function localDate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
//   版本：dist-single 构建时由 vite.config.ts 的 __APP_VERSION__ 注入（取自 package.json），
//         若产物是旧版本编译的，这里会立即失败，避免「新版号 + 旧产物」发布。
//   日期：__BUILD_TIME__ 为构建当天日期；跨天未重建即失败，提醒重新构建。
// ---------------------------------------------------------------------------
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const expectedVersion = String(pkg.version ?? '');
const expectedDate = localDate();
const builtHtml = readFileSync(target, 'utf8');

if (expectedVersion === '' || !builtHtml.includes(expectedVersion)) {
  console.error('[standalone] 版本号断言失败：产物未包含 package.json 的 version（' + expectedVersion + '）。');
  console.error('[standalone] 请重新执行：npm run build:standalone');
  process.exit(1);
}

if (!builtHtml.includes(expectedDate)) {
  console.error('[standalone] 构建日期断言失败：产物未包含今天的日期（' + expectedDate + '）。');
  console.error('[standalone] 产物可能不是今天构建的，请重新执行：npm run build:standalone');
  process.exit(1);
}

console.log('  版本 ' + expectedVersion + ' / 构建日期 ' + expectedDate + ' 校验通过');
