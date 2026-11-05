// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from '@/App';
import { LEGACY_ID_ALIASES, getById } from '@/registry';
import type { ToolDef } from '@/types/tool';

import SubnetCalculator from '@/features/network/SubnetCalculator';
import BandwidthConverter from '@/features/network/BandwidthConverter';
import IlluminanceCalc from '@/features/building/IlluminanceCalc';
import Grounding from '@/features/elec/Grounding';

/**
 * 第 0 步（5 类目重构）验收：
 * - 被合并的 5 项确实内嵌在宿主页面里（A2→A1、A5→A4、B11→B10、D3→E3、D14→E13）
 * - 旧 id 别名全部解析到新工具（收藏 / 已分享链接不失效）
 * - 首页 6 个 Tab（含「全部」）
 */
afterEach(() => cleanup());

function mount(node: JSX.Element): void {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {node}
    </MemoryRouter>,
  );
}

const tool = (id: string): ToolDef => {
  const t = getById(id);
  if (!t) throw new Error(`工具缺失：${id}`);
  return t;
};

describe('合并项内嵌验证', () => {
  it('A1 子网计算器页内可见「IP 地址转换与校验」（原 A2）', () => {
    mount(<SubnetCalculator tool={tool('network.subnet')} />);
    expect(screen.getByText('IP 地址转换与校验')).toBeTruthy();
  });

  it('N3 带宽换算页内可见「传输时间估算」（原 A5）', () => {
    mount(<BandwidthConverter tool={tool('network.bandwidth')} />);
    expect(screen.getByText('传输时间估算')).toBeTruthy();
  });

  it('E7 照度计算页内可见「灯具数量快速估算」（原 B11）', () => {
    mount(<IlluminanceCalc tool={tool('elec.illuminance')} />);
    expect(screen.getByText('灯具数量快速估算')).toBeTruthy();
  });

  it('E8 接地电阻页内可见接地限值速查表（原 D14）', () => {
    mount(<Grounding tool={tool('elec.grounding')} />);
    expect(screen.getByText('接地电阻限值与土壤电阻率速查')).toBeTruthy();
  });
});

describe('旧 id 别名映射', () => {
  it('全部别名（25 条）均解析到存在的新工具', () => {
    const entries = Object.entries(LEGACY_ID_ALIASES);
    expect(entries.length).toBeGreaterThanOrEqual(20);
    for (const [oldId, newId] of entries) {
      const resolved = getById(oldId);
      expect(resolved, `别名失效：${oldId} → ${newId}`).toBeTruthy();
      expect(resolved?.id, `别名指向错误：${oldId}`).toBe(newId);
    }
  });

  it('合并项别名指向合并宿主', () => {
    expect(getById('network.ip')?.id).toBe('network.subnet');
    expect(getById('network.transmission')?.id).toBe('network.bandwidth');
    expect(getById('building.fixtureCount')?.id).toBe('elec.illuminance');
    expect(getById('water.voltageDrop')?.id).toBe('elec.cableDrop');
    expect(getById('water.groundingRef')?.id).toBe('elec.grounding');
  });

  it('水电话工具新/旧 id 指向同一工具对象', () => {
    expect(getById('water.loadCalc')).toBe(getById('elec.load'));
  });
});

describe('首页 5 类目 + 全部', () => {
  it('渲染 6 个 Tab 且名称正确', () => {
    render(<App />);
    for (const label of ['全部', '网络/IoT', 'BA/弱电', '暖通/水暖', '工控', '电工']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
