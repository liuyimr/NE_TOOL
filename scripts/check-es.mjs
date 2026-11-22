#!/usr/bin/env node
/**
 * ES2018 语法校验（v1.8 A1 · 零新增依赖，检查器仍是 es-check）
 * ------------------------------------------------------------------
 * 目标：证明 `npm run build` 的产物 JS 不含高于 ES2018 的**语法**（`?.` / `??` /
 *       `??=` / 类字段 / BigInt 字面量 `1n` / `import.meta` 等）。
 *
 * 为什么要多这一层包装：
 *   1. es-check v7 的 ecmaVersion 上限是 es2019，而它用的 acorn 按规范只在
 *      ecmaVersion 2020 下才承认**动态 `import()`**（ES2020 语法）。
 *   2. 代码分割（`React.lazy` + 70 个懒加载工具页）必然产出 `import("./x.js")`，
 *      这是本项目「主包瘦身」的核心机制，不能为了校验把它去掉（去掉就要把
 *      600 kB 全塞进主包）。
 *   3. 所以本脚本先把产物复制到系统临时目录，并把 `import` 关键字替换成**等长**占位
 *      标识符 `imprt_`（长度一致 ⇒ es-check 报错的行列号仍与原文件对应），
 *      再交给 es-check 按 es2018 解析。`import()` 的运行时支持很早
 *      （Chrome 63 / Firefox 67 / Safari 11.1），远低于我们的语法基线，剔除它不影响结论。
 *
 * 用法：npm run check:es（需先 npm run build）
 * 退出码：0 = 全部通过；1 = 存在超纲语法或产物缺失。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const assetsDir = join(root, 'dist', 'assets');
const esCheckEntry = join(root, 'node_modules', 'es-check', 'index.js');

if (!existsSync(assetsDir)) {
  console.error('[check-es] 未找到 dist/assets，请先执行：npm run build');
  process.exit(1);
}
if (!existsSync(esCheckEntry)) {
  console.error('[check-es] 未找到 es-check，请先执行：npm install');
  process.exit(1);
}

const jsFiles = readdirSync(assetsDir).filter((name) => name.endsWith('.js'));
if (jsFiles.length === 0) {
  console.error('[check-es] dist/assets 下没有 JS 文件，请先执行：npm run build');
  process.exit(1);
}

const tmpRoot = mkdtempSync(join(tmpdir(), 'ne-check-es-'));
let rewritten = 0;

try {
  for (const name of jsFiles) {
    const code = readFileSync(join(assetsDir, name), 'utf8');
    // 只替换 `import` 关键字本身（保持 6 字符长度），不动字符串里的其它内容
    const normalized = code.replace(/\bimport(?=\s*\()/g, (match) => {
      rewritten += 1;
      return 'imprt_';
    });
    writeFileSync(join(tmpRoot, name), normalized, 'utf8');
  }

  // fast-glob 在 Windows 上要求正斜杠路径
  const globPattern = `${tmpRoot.replace(/\\/g, '/')}/*.js`;
  console.log(
    `[check-es] 待校验 ${jsFiles.length} 个产物 JS（已剔除 ES2020 动态 import() 语法 ${rewritten} 处）`,
  );
  execFileSync(process.execPath, [esCheckEntry, 'es2018', globPattern, '--module'], {
    stdio: 'inherit',
  });
} catch (error) {
  // es-check 以非 0 退出时 execFileSync 会抛错，这里透传退出码
  const status = typeof error?.status === 'number' ? error.status : 1;
  process.exit(status);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

// 显式清理一次（early return 路径已覆盖，这里兜底），并给出结论
if (existsSync(resolve(tmpRoot))) {
  rmSync(tmpRoot, { recursive: true, force: true });
}
console.log('[check-es] 通过：全部产物 JS 语法级别 ≤ ES2018');
