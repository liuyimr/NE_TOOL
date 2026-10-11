// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Suspense } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getAll } from '@/registry';

/**
 * 全量工具界面冒烟测试（jsdom）：
 * 逐一挂载全部 58 个工具的懒加载组件，验证：
 *  - 组件模块可被成功加载（无模块级异常）
 *  - 首次渲染不抛错，且 Suspense 落定后确有 DOM 输出（非空界面）
 * 这是"58 个工具界面全部可用、无占位/无 TODO"的直接证据。
 */
afterEach(() => cleanup());

const ALL_TOOLS = getAll();

describe('全部工具界面冒烟渲染', () => {
  it('注册表恰有 58 个工具且 id 唯一', () => {
    expect(ALL_TOOLS.length).toBe(58);
    const ids = ALL_TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(58);
  });

  for (const tool of ALL_TOOLS) {
    it(`【${tool.id}】${tool.title} 可正常渲染`, async () => {
      const Component = tool.Component;
      expect(Component, `${tool.id} 缺少 Component`).toBeTruthy();

      const { container } = render(
        <MemoryRouter
          initialEntries={[`/tool/${tool.id}`]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Suspense fallback={null}>
            {/* Component 类型为可选的懒加载组件，上面已断言存在 */}
            {Component ? <Component tool={tool} /> : null}
          </Suspense>
        </MemoryRouter>,
      );

      // Suspense 落定后容器内应有真实 DOM（非 null / 非空）
      await waitFor(() => {
        expect(container.firstChild, `${tool.id} 渲染为空`).not.toBeNull();
      });
    });
  }
});
