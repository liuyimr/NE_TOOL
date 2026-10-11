#!/usr/bin/env node
/**
 * 跨平台测试启动器（零依赖）
 *
 * 背景：Vitest 会把「SSR 模块运行缓存」写入 `os.tmpdir()/<nanoid>/ssr/<hash>`。
 * 在部分 Windows 环境（组策略 / 安全软件 / 沙箱）下，系统临时目录 `%TEMP%`
 * 可能被限制写入，导致 Vitest 抛出 `EPERM ... writeFile` 的 Unhandled Error，
 * 进而使 `vitest` 以非零码退出（即便所有断言均通过）。
 *
 * 方案：
 *   1) 将 TMPDIR/TMP/TEMP 指向项目内可写的 `.tmp/vitest/`，摆脱对系统临时目录写权限的依赖；
 *   2) 默认使用单线程 worker（`--pool=threads --poolOptions.threads.singleThread`），
 *      规避沙箱/安全软件对「多 worker 并发新建随机目录 + 写文件」的竞态拦截
 *      （表现为偶发 `EPERM ... writeFile`）。本项目测试量小，单线程耗时反而更低且完全确定。
 *      如需并行，可自行传入 `--pool=forks` 等参数覆盖。
 *
 * 用法：node scripts/run-tests.mjs [vitest 参数...]
 *   无参数时等价于 `vitest run --pool=threads --poolOptions.threads.singleThread`。
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const tmpDir = join(root, '.tmp', 'vitest');
mkdirSync(tmpDir, { recursive: true });

// 覆盖系统临时目录 → 项目内（Node 的 os.tmpdir() 会优先读取这些变量）
process.env.TMPDIR = tmpDir;
process.env.TMP = tmpDir;
process.env.TEMP = tmpDir;

const vitestBin = join(root, 'node_modules', 'vitest', 'vitest.mjs');
const passthrough = process.argv.slice(2);
// 默认单线程，除非调用方显式指定了池/并发相关参数
const userControlsPool = passthrough.some((arg) => arg.startsWith('--pool') || arg.startsWith('--maxWorkers'));
const defaults = userControlsPool ? [] : ['--pool=threads', '--poolOptions.threads.singleThread=true'];
const args = passthrough.length > 0 ? [...passthrough, ...defaults] : ['run', ...defaults];

const child = spawn(process.execPath, [vitestBin, ...args], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
