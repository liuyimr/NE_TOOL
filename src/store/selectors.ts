import { getById } from '@/registry';
import type { AppStore } from './useAppStore';
import type { RecentItem } from '@/types/store';
import type { ToolDef } from '@/types/tool';

/** 取最近使用原始项 */
export const selectRecents = (state: AppStore): RecentItem[] => state.recents;

/** 取收藏 id 列表 */
export const selectFavorites = (state: AppStore): string[] => state.favorites;

/** 取主题 */
export const selectTheme = (state: AppStore): AppStore['theme'] => state.theme;

/**
 * 由最近使用项解析为工具对象（过滤已不存在的 id，最多 n 条）
 * @param recents 最近使用列表
 * @param n 最多返回条数
 */
export function recentTools(recents: RecentItem[], n = 6): ToolDef[] {
  return recents
    .map((r) => getById(r.id))
    .filter((t): t is ToolDef => Boolean(t))
    .slice(0, n);
}

/**
 * 由收藏 id 列表解析为工具对象（过滤已不存在的 id）
 * @param favorites 收藏 id 列表
 */
export function favoriteTools(favorites: string[]): ToolDef[] {
  return favorites.map((id) => getById(id)).filter((t): t is ToolDef => Boolean(t));
}
