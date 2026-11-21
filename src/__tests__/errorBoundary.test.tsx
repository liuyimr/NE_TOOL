// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

/** 故意抛错的子组件 */
function Boom(): JSX.Element {
  throw new Error('模拟工具渲染崩溃');
}

/** 正常子组件 */
function Fine(): JSX.Element {
  return <p>工具正常渲染</p>;
}

/**
 * 错误边界测试
 * - 子组件抛错 → 渲染兜底 UI，错误不外抛（否则测试进程会直接失败）
 * - 正常子组件 → 原样渲染
 * - 点「重试」→ 重置错误状态并恢复渲染
 */
describe('ErrorBoundary 工具级错误边界', () => {
  beforeEach(() => {
    // React 会把捕获到的错误打到 console.error，测试内抑制噪声
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('子组件抛错 → 渲染兜底提示，且不向外抛出', () => {
    expect(() =>
      render(
        <ErrorBoundary title="IP 子网计算器">
          <Boom />
        </ErrorBoundary>,
      ),
    ).not.toThrow();

    expect(screen.getByText('「IP 子网计算器」加载失败')).toBeTruthy();
    expect(screen.getByText('该工具渲染时出错，其他工具与页面不受影响。')).toBeTruthy();
    expect(screen.getByText('模拟工具渲染崩溃')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy();
    const home = screen.getByText('返回首页') as HTMLAnchorElement;
    expect(home.getAttribute('href')).toBe('#/');
    // 兜底 UI 已替换子树
    expect(screen.queryByText('工具正常渲染')).toBeNull();
    // 错误已按约定格式上报
    expect(console.error).toHaveBeenCalledWith(
      '[tool-error]',
      expect.any(Error),
      expect.anything(),
    );
  });

  it('未提供 title 时使用通用文案', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('「该工具」加载失败')).toBeTruthy();
  });

  it('正常子组件原样渲染', () => {
    render(
      <ErrorBoundary title="对话型工具">
        <Fine />
      </ErrorBoundary>,
    );
    expect(screen.getByText('工具正常渲染')).toBeTruthy();
    expect(screen.queryByText('「对话型工具」加载失败')).toBeNull();
  });

  it('点「重试」后（子树已可正常渲染）恢复显示', () => {
    /** 外层状态控制子树是否抛错，模拟「修好后再重试」 */
    function Harness(): JSX.Element {
      const [broken, setBroken] = useState(true);
      return (
        <div>
          <button type="button" onClick={() => setBroken(false)}>
            换入正常组件
          </button>
          <ErrorBoundary title="测试工具">{broken ? <Boom /> : <Fine />}</ErrorBoundary>
        </div>
      );
    }

    render(<Harness />);
    expect(screen.getByText('「测试工具」加载失败')).toBeTruthy();

    // 换入不抛错的子组件，此时边界仍显示兜底
    fireEvent.click(screen.getByRole('button', { name: '换入正常组件' }));
    expect(screen.getByText('「测试工具」加载失败')).toBeTruthy();

    // 重试 → 重新挂载子树并恢复正常渲染
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(screen.getByText('工具正常渲染')).toBeTruthy();
    expect(screen.queryByText('「测试工具」加载失败')).toBeNull();
  });
});
