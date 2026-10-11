import type { Domain } from './tool';

/**
 * 主题模式：默认 'dark'（GitHub 暗色）
 */
export type ThemeMode = 'dark' | 'light';

/**
 * 最近使用项
 */
export interface RecentItem {
  /** 工具 id */
  id: string;
  /** 使用时间戳（ms） */
  at: number;
}

/**
 * 应用全局状态（持久化到 localStorage，key 前缀 'ne:'）
 */
export interface AppState {
  /** 当前主题 */
  theme: ThemeMode;
  /** 收藏的工具 id 列表 */
  favorites: string[];
  /** 最近使用（最多 10 条，最新在前） */
  recents: RecentItem[];
  /** 上次停留的领域筛选 */
  lastDomain: Domain | 'all';
  /** 各工具上次选择的单位，如 { 'unit.pressure': 'MPa' } */
  customUnits?: Record<string, string>;
}
