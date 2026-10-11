import { Link } from 'react-router-dom';
import ToolGrid from '@/components/ToolGrid';
import { favoriteTools } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';

/**
 * 收藏页：展示已收藏工具
 */
export default function FavoritesPage(): JSX.Element {
  const favorites = useAppStore((s) => s.favorites);
  const tools = favoriteTools(favorites);

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-4xl">⭐</span>
        <p className="text-sm text-muted">还没有收藏任何工具</p>
        <Link to="/" className="text-sm text-accent">
          去首页挑几个 →
        </Link>
      </div>
    );
  }

  return <ToolGrid tools={tools} title={`共 ${tools.length} 个收藏`} />;
}
