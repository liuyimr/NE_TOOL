import { Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getById } from '@/registry';
import { useAppStore } from '@/store/useAppStore';
import NotFoundPage from './NotFoundPage';

/**
 * 动态工具页：按 :id 从注册表取 ToolDef 并渲染其懒加载 Component；未知 id → 404
 */
export default function ToolPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const tool = id ? getById(decodeURIComponent(id)) : undefined;
  const pushRecent = useAppStore((s) => s.pushRecent);

  useEffect(() => {
    if (tool) pushRecent(tool.id);
  }, [tool, pushRecent]);

  if (!tool) return <NotFoundPage />;

  const Component = tool.Component;
  return (
    <Suspense
      fallback={<p className="py-8 text-center text-sm text-muted">正在加载工具…</p>}
    >
      {Component ? (
        <Component tool={tool} />
      ) : (
        <p className="py-8 text-center text-sm text-muted">
          「{tool.title}」组件尚未接入。
        </p>
      )}
    </Suspense>
  );
}
