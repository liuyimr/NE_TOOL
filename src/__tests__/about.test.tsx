// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from '@/App';
import { APP_VERSION, AUTHOR, REPO_URL } from '@/config/appInfo';

/**
 * 关于页与底部导航测试
 * （同时校验 vite define 注入的版本号、NewE 标识内联、仓库链接）
 */
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('关于页与导航', () => {
  it('底部导航含「关于」入口', () => {
    window.location.hash = '#/';
    render(<App />);
    const about = document.querySelector('a[href="#/about"]');
    expect(about).not.toBeNull();
    expect(about?.textContent).toContain('关于');
  });

  it('关于页展示版本、作者、仓库地址与 NewE 标识', async () => {
    window.location.hash = '#/about';
    render(<App />);

    const versionPattern = new RegExp(`v${APP_VERSION.replace(/\./g, '\\.')}`);
    expect((await screen.findAllByText(versionPattern)).length).toBeGreaterThan(0);
    expect(await screen.findByText(AUTHOR)).toBeTruthy();

    // 仓库链接指向当前账号
    expect(document.querySelector(`a[href="${REPO_URL}"]`)).not.toBeNull();

    // NewE 标识已挂载（生产构建会内联为 data URI，开发/测试环境为资源 URL）
    const logo = screen.getByAltText('新易科技工作室 NewE') as HTMLImageElement;
    expect((logo.getAttribute('src') ?? '').length).toBeGreaterThan(0);
  });
});
