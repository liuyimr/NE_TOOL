import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Domain } from '@/types/tool';
import type { AppState, ThemeMode } from '@/types/store';

/** 最近使用最多保存条数 */
const MAX_RECENTS = 10;

/**
 * 全局应用状态（Zustand + persist → localStorage，key 前缀 'ne:'）
 */
export interface AppStore extends AppState {
  /** 设置主题 */
  setTheme: (theme: ThemeMode) => void;
  /** 切换深浅主题 */
  toggleTheme: () => void;
  /** 切换收藏 */
  toggleFavorite: (id: string) => void;
  /** 是否已收藏 */
  isFavorite: (id: string) => boolean;
  /** 记录最近使用（去重、最新在前、上限 10） */
  pushRecent: (id: string) => void;
  /** 清空最近使用 */
  clearRecents: () => void;
  /** 清空收藏 */
  clearFavorites: () => void;
  /** 清空全部本地数据（收藏、最近、自定义单位、领域筛选；保留主题偏好） */
  resetLocalData: () => void;
  /** 记录上次领域筛选 */
  setLastDomain: (domain: Domain | 'all') => void;
  /** 记录某工具上次选择的单位 */
  setCustomUnit: (key: string, unit: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      favorites: [],
      recents: [],
      lastDomain: 'all',
      customUnits: {},

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),

      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((x) => x !== id)
            : [id, ...state.favorites],
        })),

      isFavorite: (id) => get().favorites.includes(id),

      pushRecent: (id) =>
        set((state) => ({
          recents: [{ id, at: Date.now() }, ...state.recents.filter((r) => r.id !== id)].slice(
            0,
            MAX_RECENTS,
          ),
        })),

      clearRecents: () => set({ recents: [] }),

      clearFavorites: () => set({ favorites: [] }),

      resetLocalData: () =>
        set({ favorites: [], recents: [], customUnits: {}, lastDomain: 'all' }),

      setLastDomain: (lastDomain) => set({ lastDomain }),

      setCustomUnit: (key, unit) =>
        set((state) => ({ customUnits: { ...state.customUnits, [key]: unit } })),
    }),
    {
      name: 'ne:app',
      version: 1,
    },
  ),
);
