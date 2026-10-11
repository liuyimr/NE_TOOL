import { useLocation, useNavigate } from 'react-router-dom';
import { getById } from '@/registry';
import { useAppStore } from '@/store/useAppStore';
import Button from '@/components/ui/Button';

/** 固定页面标题 */
const PAGE_TITLES: Record<string, string> = {
  '/': '工程师工具箱 · NewE',
  '/search': '全局搜索',
  '/favorites': '我的收藏',
  '/about': '关于',
};

/**
 * 顶栏：返回、标题、主题切换、收藏按钮
 */
export default function Header(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const isTool = location.pathname.startsWith('/tool/');
  const toolId = isTool ? decodeURIComponent(location.pathname.replace('/tool/', '')) : '';
  const tool = isTool ? getById(toolId) : undefined;
  const isFav = tool ? favorites.includes(tool.id) : false;
  const title = tool ? tool.title : (PAGE_TITLES[location.pathname] ?? '工程师工具箱');

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 pt-safe-top backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-2 py-1.5 lg:max-w-5xl lg:px-4">
        {location.pathname !== '/' ? (
          <button
            type="button"
            aria-label="返回"
            className="flex min-h-touch min-w-touch items-center justify-center text-xl text-fg"
            onClick={() => navigate(-1)}
          >
            ‹
          </button>
        ) : (
          <span className="min-w-touch pl-2 text-xl">🧰</span>
        )}

        <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-fg">
          {title}
        </h1>

        {tool && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={isFav ? '取消收藏' : '收藏'}
            onClick={() => toggleFavorite(tool.id)}
            className="min-w-touch text-lg"
          >
            {isFav ? '★' : '☆'}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          aria-label="切换主题"
          onClick={toggleTheme}
          className="min-w-touch text-lg"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </Button>
      </div>
    </header>
  );
}
