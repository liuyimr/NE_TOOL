// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from '@/App';
import { APP_VERSION, AUTHOR, REPO_URL } from '@/config/appInfo';

/**
 * 关于页与底部导航测试（同时校验 vite define 注入的版本号可用）
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

  it('关于页展示版本、作者与仓库地址', () => {
    window.location.hash = '#/about';
    render(<App />);
    const versionPattern = new RegExp(`v${APP_VERSION.replace(/\./g, '\\.')}`);
    expect(screen.getAllByText(versionPattern).length).toBeGreaterThan(0);
    expect(screen.getByText(AUTHOR)).toBeTruthy();
    expect(document.querySelector(`a[href="${REPO_URL}"]`)).not.toBeNull();
  });
});
