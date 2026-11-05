import { Link } from 'react-router-dom';
import FavoritesBar from '@/components/FavoritesBar';
import ToolGrid from '@/components/ToolGrid';
import { byDomain, getAll } from '@/registry';
import { recentTools } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import type { Domain } from '@/types/tool';

const DOMAIN_TABS: { key: Domain | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'network', label: '网络/IoT' },
  { key: 'building', label: 'BA/弱电' },
  { key: 'hvac', label: '暖通/水暖' },
  { key: 'automation', label: '工控' },
  { key: 'elec', label: '电工' },
];

/**
 * 首页：搜索入口 + 收藏区 + 最近使用 + 领域筛选 + 九宫格工具入口
 */
export default function HomePage(): JSX.Element {
  const lastDomain = useAppStore((s) => s.lastDomain);
  const setLastDomain = useAppStore((s) => s.setLastDomain);
  const recents = useAppStore((s) => s.recents);

  // 兼容旧版本本地存储里可能残留的已废弃领域值（如 'water'）：无效时回退到「全部」
  const effectiveDomain: Domain | 'all' =
    lastDomain === 'all' || DOMAIN_TABS.some((tab) => tab.key === lastDomain) ? lastDomain : 'all';
  const tools = effectiveDomain === 'all' ? getAll() : byDomain(effectiveDomain);
  const recent = recentTools(recents, 8);

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/search"
        className="ne-surface flex min-h-touch items-center gap-2 px-3 text-muted ne-focus hover:border-accent"
      >
        <span>🔍</span>
        <span className="text-sm">搜索工具、端口、功能码…</span>
      </Link>

      <FavoritesBar />

      {recent.length > 0 && <ToolGrid tools={recent} title="🕘 最近使用" />}

      <section className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DOMAIN_TABS.map((tab) => {
            const active = effectiveDomain === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setLastDomain(tab.key)}
                className={[
                  'min-h-touch shrink-0 rounded-full border px-4 text-sm ne-focus',
                  active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-surface text-muted',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <ToolGrid tools={tools} title={`共 ${tools.length} 个工具`} />
      </section>
    </div>
  );
}
