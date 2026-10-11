import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import PwaReloadPrompt from '@/components/PwaReloadPrompt';
import Header from './Header';
import TabBar from './TabBar';

/**
 * 页面外框：Header + 内容区 + 底部导航（移动优先 + 底部安全区）
 * 同时负责把 Zustand 中的主题同步到 <html> 的 class 上（深浅主题切换）。
 */
export default function AppShell(): JSX.Element {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    root.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-24 pt-3 sm:px-4 lg:max-w-5xl lg:px-6 lg:pt-4">
        <Outlet />
      </main>
      <TabBar />
      <PwaReloadPrompt />
    </div>
  );
}
