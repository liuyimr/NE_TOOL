import { Component, type ErrorInfo, type ReactNode } from 'react';
import Button from './ui/Button';

export interface ErrorBoundaryProps {
  /** 被保护的子树 */
  children: ReactNode;
  /** 出错工具的名称（用于提示文案：「{title}」加载失败） */
  title?: string;
}

interface ErrorBoundaryState {
  /** 捕获到的错误；null 表示未出错 */
  error: Error | null;
}

/**
 * 工具级错误边界
 * ------------------------------------------------------------------
 * 单个工具组件在渲染期抛错时，只把该工具的结果区替换为兜底提示，
 * 其余工具、导航与页面框架不受影响，避免「一个工具白屏整个应用」。
 * 使用方式：`<ErrorBoundary key={tool.id} title={tool.title}>…</ErrorBoundary>`，
 * 由 key 的变化保证切换工具时错误状态自动重置。
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  /** 渲染期抛错 → 转为 state，触发兜底 UI（不做副作用） */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  /** 上报错误（仅本地 console，不上送任何远端服务） */
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[tool-error]', error, info.componentStack);
  }

  /** 重试：清空错误状态后重新挂载子树 */
  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    const { children, title } = this.props;

    if (error) {
      return (
        <section className="ne-surface flex flex-col gap-3 p-4">
          <h2 className="text-base font-semibold text-fg">「{title ?? '该工具'}」加载失败</h2>
          <p className="text-sm text-muted">该工具渲染时出错，其他工具与页面不受影响。</p>
          <p className="whitespace-pre-wrap break-words text-xs text-muted">{error.message}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={this.handleRetry}>
              重试
            </Button>
            <a href="#/" className="ne-focus text-sm text-accent underline decoration-dotted">
              返回首页
            </a>
          </div>
        </section>
      );
    }

    return children;
  }
}
