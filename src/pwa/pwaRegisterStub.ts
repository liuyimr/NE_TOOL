import type { Dispatch, SetStateAction } from 'react';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

/**
 * Service Worker 注册 Hook 的「单文件构建」占位实现
 * ------------------------------------------------------------------
 * 背景：`virtual:pwa-register/react` 由 vite-plugin-pwa 在标准构建（非 single 模式）下
 * 注入。单文件构建（npm run build:single）为输出**单个可双击离线运行的 HTML**，
 * 不包含也不应包含 Service Worker。
 *
 * 因此 `vite.config.ts` 在 single 模式下把 `virtual:pwa-register/react` 别名指向本文件，
 * 使同一个业务组件 `PwaReloadPrompt` 在两套构建下都能被正确解析、且行为一致（单文件下恒为“无更新”）。
 *
 * 本文件刻意保持与 `vite-plugin-pwa/react.d.ts` 完全一致的对外签名。
 */

export type { RegisterSWOptions };

interface UseRegisterSWResult {
  /** [是否需要刷新, setter] */
  needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
  /** [是否已可离线, setter] */
  offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
  /** 触发 Service Worker 更新（单文件模式下为空操作） */
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

/**
 * 单文件模式下的空实现：不注册 Service Worker，恒返回“无更新 / 非离线就绪”。
 * @param _options 与真实实现保持一致的入参（未使用）
 */
export function useRegisterSW(_options?: RegisterSWOptions): UseRegisterSWResult {
  const noop: Dispatch<SetStateAction<boolean>> = () => {
    /* 单文件模式无需处理状态变更 */
  };
  return {
    needRefresh: [false, noop],
    offlineReady: [false, noop],
    updateServiceWorker: async () => {
      /* 单文件模式不会注册 SW，故无更新动作 */
    },
  };
}
