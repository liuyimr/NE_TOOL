// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from '@/App';
import { getAll } from '@/registry';

/**
 * 集成/冒烟测试（jsdom）：
 * - 全部 58 个工具均有 Component（无占位）
 * - 首页可渲染，标题与工具卡片链接存在
 */
afterEach(() => cleanup());

describe('应用渲染与注册完整性', () => {
  it('58 个工具均具备 Component', () => {
    const tools = getAll();
    expect(tools.length).toBe(58);
    const missing = tools.filter((t) => !t.Component).map((t) => t.id);
    expect(missing).toEqual([]);
  });

  it('首页渲染标题与工具卡片', () => {
    const { container } = render(<App />);
    // Header 默认标题
    expect(screen.getByText(/工程师工具箱 · NewE/)).toBeTruthy();
    // 首页搜索入口
    expect(screen.getByText(/搜索工具、端口、功能码/)).toBeTruthy();
    // 至少渲染出若干工具卡片链接
    const links = container.querySelectorAll('a[href^="#/tool/"]');
    expect(links.length).toBe(58);
  });

  it('含 P0 关键工具文案', () => {
    render(<App />);
    expect(screen.getByText('IP 子网计算器')).toBeTruthy();
    expect(screen.getByText('视频监控存储容量计算')).toBeTruthy();
  });
});
