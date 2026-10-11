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
 *   3. 含 `navigator.serviceWorker`。
 *   注意：产物 JS 字符串含大量 `https://`（React 报错链接、W3C 命名空间等）属正常，
 *   因校验只针对 <link>/<script> 标签属性与 CSS url()/@import，故不会误报。
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
  const problems = [...collectTagProblems(html), ...collectCssProblems(html)];
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
