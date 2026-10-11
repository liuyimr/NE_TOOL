import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: '首页', icon: '🏠', end: true },
  { to: '/search', label: '搜索', icon: '🔍', end: false },
  { to: '/favorites', label: '收藏', icon: '⭐', end: false },
  { to: '/about', label: '关于', icon: 'ℹ️', end: false },
];

/**
 * 底部导航（移动优先，触控 ≥44px，底部安全区适配）
 */
export default function TabBar(): JSX.Element {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe">
      <ul className="mx-auto flex w-full max-w-3xl lg:max-w-5xl">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                [
                  'flex min-h-touch flex-col items-center justify-center gap-0.5 py-1 text-xs ne-focus',
                  isActive ? 'text-accent' : 'text-muted',
                ].join(' ')
              }
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
