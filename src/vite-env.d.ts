/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * 构建期常量：由 vite.config.ts 的 define 注入。
 * 版本号唯一来源是 package.json，避免代码里再抄一份。
 */
declare const __APP_VERSION__: string;
/** 构建日期，格式 YYYY-MM-DD */
declare const __BUILD_TIME__: string;
