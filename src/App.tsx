import { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import HomePage from '@/pages/HomePage';
import ToolPage from '@/pages/ToolPage';
import FavoritesPage from '@/pages/FavoritesPage';
import NotFoundPage from '@/pages/NotFoundPage';

/** 关于页按需加载：内置的 NewE 标识以 data URI 形式随该 chunk 走，不进主包 */
const AboutPage = lazy(() => import('@/pages/AboutPage'));
/**
 * 搜索页按需加载：速查数据（39 张表，约 165 KiB）随该 chunk 走，不进主包。
 * 首页 / 工具页 / 收藏页均不依赖搜索索引，首屏无需承担这部分体积。
 */
const SearchPage = lazy(() => import('@/pages/SearchPage'));

/**
 * 应用根组件：HashRouter 路由表
 * 路由（Hash 模式，离线深链 + 单文件兼容）：
 *   /            → 首页（九宫格 + 收藏 + 最近）
 *   /tool/:id    → 动态工具页
 *   /search      → 搜索页
 *   /favorites   → 收藏页
 *   /about       → 关于（版本 / 作者 / 许可）
 *   *            → 404
 */
export default function App(): JSX.Element {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/tool/:id" element={<ToolPage />} />
          <Route
            path="/search"
            element={
              <Suspense
                fallback={<p className="py-8 text-center text-sm text-muted">正在加载…</p>}
              >
                <SearchPage />
              </Suspense>
            }
          />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route
            path="/about"
            element={
              <Suspense
                fallback={<p className="py-8 text-center text-sm text-muted">正在加载…</p>}
              >
                <AboutPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
