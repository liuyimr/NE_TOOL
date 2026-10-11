// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { favoriteTools, recentTools, selectFavorites, selectTheme } from '@/store/selectors';
import { getAll } from '@/registry';

/**
 * 应用状态（Zustand + persist）测试
 * 覆盖：主题切换、收藏增删、最近使用（去重/最新在前/上限 10）、持久化写入 localStorage。
 */
const PERSIST_KEY = 'ne:app';

/** 复位为初始状态 */
function resetState(): void {
  useAppStore.setState({
    theme: 'dark',
    favorites: [],
    recents: [],
    lastDomain: 'all',
    customUnits: {},
  });
}

describe('应用状态与持久化', () => {
  beforeEach(() => {
    localStorage.clear();
    resetState();
  });

  it('默认主题为 dark，可 setTheme / toggleTheme', () => {
    expect(useAppStore.getState().theme).toBe('dark');
    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().theme).toBe('light');
    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().theme).toBe('dark');
    expect(selectTheme(useAppStore.getState())).toBe('dark');
  });

  it('收藏可切换与查询，最新在前', () => {
    const store = useAppStore.getState();
    expect(store.isFavorite('network.subnet')).toBe(false);
    store.toggleFavorite('network.subnet');
    store.toggleFavorite('automation.modbus');
    expect(useAppStore.getState().favorites).toEqual(['automation.modbus', 'network.subnet']);
    expect(useAppStore.getState().isFavorite('network.subnet')).toBe(true);
    // 再次切换 → 取消收藏
    useAppStore.getState().toggleFavorite('network.subnet');
    expect(useAppStore.getState().isFavorite('network.subnet')).toBe(false);
    expect(selectFavorites(useAppStore.getState())).toEqual(['automation.modbus']);
  });

  it('最近使用：去重、最新在前、上限 10', () => {
    const ids = getAll()
      .slice(0, 12)
      .map((t) => t.id);
    for (const id of ids) useAppStore.getState().pushRecent(id);

    const recents = useAppStore.getState().recents;
    expect(recents.length).toBe(10);
    // 最新一条应为最后 push 的
    expect(recents[0].id).toBe(ids[ids.length - 1]);
    // 去重：重复 push 已存在项不会产生重复条目
    useAppStore.getState().pushRecent(ids[0]);
    expect(useAppStore.getState().recents.filter((r) => r.id === ids[0]).length).toBe(1);
    expect(useAppStore.getState().recents[0].id).toBe(ids[0]);

    useAppStore.getState().clearRecents();
    expect(useAppStore.getState().recents).toEqual([]);
  });

  it('自定义单位映射可增量写入', () => {
    useAppStore.getState().setCustomUnit('automation.unit.cat', 'temperature');
    useAppStore.getState().setCustomUnit('automation.unit.from', 'C');
    expect(useAppStore.getState().customUnits).toEqual({
      'automation.unit.cat': 'temperature',
      'automation.unit.from': 'C',
    });
  });

  it('持久化：变更写入 localStorage（key = ne:app，含 version）', () => {
    useAppStore.getState().toggleFavorite('network.subnet');
    useAppStore.getState().setTheme('light');

    const raw = localStorage.getItem(PERSIST_KEY);
    expect(raw, '未写入持久化键').toBeTruthy();
    const parsed = JSON.parse(raw as string) as {
      state: { favorites: string[]; theme: string };
      version: number;
    };
    expect(parsed.version).toBe(1);
    expect(parsed.state.theme).toBe('light');
    expect(parsed.state.favorites).toContain('network.subnet');
  });

  it('selectors：解析工具对象并过滤非法 id', () => {
    const tools = recentTools([{ id: 'network.subnet', at: 1 }], 6);
    expect(tools.map((t) => t.id)).toEqual(['network.subnet']);
    // 非法 id 被过滤
    expect(favoriteTools(['network.subnet', 'does.not.exist']).map((t) => t.id)).toEqual([
      'network.subnet',
    ]);
    // n 限制条数
    const many = getAll()
      .slice(0, 8)
      .map((t) => ({ id: t.id, at: 0 }));
    expect(recentTools(many, 3).length).toBe(3);
  });
});
