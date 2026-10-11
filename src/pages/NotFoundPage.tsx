import { Link } from 'react-router-dom';

/**
 * 404 页面
 */
export default function NotFoundPage(): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-4xl">🧭</span>
      <h1 className="text-lg font-semibold text-fg">未找到该工具</h1>
      <p className="text-sm text-muted">请检查链接，或返回首页重新选择。</p>
      <Link to="/" className="text-sm text-accent">
        返回首页 →
      </Link>
    </div>
  );
}
