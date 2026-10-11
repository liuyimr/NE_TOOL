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
 * 行为：
 *   1. 若 `dist-single/index.html` 不存在 → 报错退出（提示先跑 `npm run build:single`）。
 *   2. 复制到 `docs/index.html`（只写这一个文件，不清空 docs/）。
 *   3. 读取产物并断言：不存在外部资源引用（形如 href="./…" / src="./…" / href="/…" / src="/…"，
 *      data: URI 不算），且不含 `navigator.serviceWorker`。
 *   4. 校验失败 → 打印命中的字符串并以非 0 退出；成功 → 打印输出路径与体积（KB）。
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'dist-single', 'index.html');
const targetDir = join(root, 'docs');
const target = join(targetDir, 'index.html');

// ① 前置检查
if (!existsSync(source)) {
  console.error('[standalone] 未找到 dist-single/index.html。');
  console.error('[standalone] 请先执行：npm run build:single');
  process.exit(1);
}

// ② 复制（仅写目标文件，保留 docs/ 中的其它文件，如 README.md）
mkdirSync(targetDir, { recursive: true });
const html = readFileSync(source, 'utf8');
writeFileSync(target, html, 'utf8');

// ③ 自包含校验
// 外部资源引用：href/src 以 "./" 或 "/" 开头（data: / http(s): / touch-icon: 等不算）
const externalRefPattern = /(?:href|src)\s*=\s*["'](?:\.?\/)/g;
const externalRefs = [...html.matchAll(externalRefPattern)].map((m) => m[0]);
const swUsages = html.includes('navigator.serviceWorker') ? ['navigator.serviceWorker'] : [];
const problems = [...externalRefs, ...swUsages];

if (problems.length > 0) {
  console.error('[standalone] 自包含校验失败，产物仍存在外部依赖：');
  for (const item of problems) {
    console.error('  - 命中：' + item);
  }
  console.error('[standalone] 请确认以 single 模式（npm run build:single）构建，且未引入外部资源。');
  process.exit(1);
}

// ④ 成功输出
const sizeKb = (statSync(target).size / 1024).toFixed(1);
console.log('[standalone] 已生成 docs/index.html');
console.log('  路径：' + target);
console.log('  体积：' + sizeKb + ' KB');
console.log('  自包含校验：通过（无外部 href/src 引用，无 navigator.serviceWorker）');
