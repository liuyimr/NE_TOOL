import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { favoriteTools } from '@/store/selectors';

/**
 * 首页收藏区：横向滚动的收藏工具快捷入口
 */
export default function FavoritesBar(): JSX.Element | null {
  const favorites = useAppStore((s) => s.favorites);
  const tools = favoriteTools(favorites);
  if (tools.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-semibold text-muted">⭐ 我的收藏</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={`/tool/${tool.id}`}
            className="ne-surface flex min-h-touch shrink-0 items-center gap-2 px-3 py-2 ne-focus hover:border-accent"
          >
            <span className="text-lg">{tool.icon}</span>
            <span className="whitespace-nowrap text-sm text-fg">{tool.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
