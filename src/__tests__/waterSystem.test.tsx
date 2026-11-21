// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import WaterSystem from '@/features/hvac/WaterSystem';
import { getById } from '@/registry';
import { formatNumber } from '@/lib/format';
import { ALPHA_PRESET, demandFlow } from '@/lib/calc/waterDemand';
import { pipeSize } from '@/lib/calc/waterPipe';
import { pumpHead, pumpPower } from '@/lib/calc/waterPump';
import type { ToolDef } from '@/types/tool';

/**
 * H10 给水系统设计（四步串联容器）验收
 * ------------------------------------------------------------------
 * - 默认输入下四步结果与纯函数一致：q_g / DN / H / 轴功率 / 配套功率
 * - 汇总卡常驻展示 4 个关键结果
 * - ?step= 深链可直达指定步骤（含非法值回落第 1 步）
 * - 修改上游输入后下游结果随之重算（不沿用旧值）
 * 数值均由实际调用纯函数得出，不硬编码估算值。
 */
afterEach(() => cleanup());

const tool = (): ToolDef => {
  const t = getById('hvac.demandFlow');
  if (!t) throw new Error('工具缺失：hvac.demandFlow');
  return t;
};

/** 在指定步骤挂载容器 */
function mountAt(step?: number): void {
  const entry = step === undefined ? '/tool/hvac.demandFlow' : `/tool/hvac.demandFlow?step=${step}`;
  render(
    <MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <WaterSystem tool={tool()} />
    </MemoryRouter>,
  );
}

/** 默认输入（与容器默认值一致） */
const DEFAULT_DEMAND = demandFlow({ ng: 20, buildingType: 'residential' });
const DEFAULT_PIPE = pipeSize({ flow: DEFAULT_DEMAND.flowLps, flowUnit: 'L/s', velocity: 1.0 });
const DEFAULT_HEAD = pumpHead({
  staticHead: 30,
  pipeLength: 80,
  frictionPerMeter: 0.02,
  localLoss: 3,
  freeHead: 5,
});
const DEFAULT_POWER = pumpPower({
  flow: DEFAULT_DEMAND.flowM3h,
  head: DEFAULT_HEAD.totalHead,
  efficiency: 0.7,
  margin: 1.15,
});

/** 断言某段展示文本至少出现一次 */
function expectVisibleText(text: string): void {
  expect(screen.getAllByText(text).length, `未找到展示文本：${text}`).toBeGreaterThan(0);
}

describe('给水系统设计 · 纯函数计算链路', () => {
  it('默认输入：q_g ≈ 1.3416 L/s（0.2×1.5×√20）', () => {
    expect(ALPHA_PRESET.residential).toBeCloseTo(1.5, 6);
    expect(DEFAULT_DEMAND.flowLps).toBeCloseTo(0.2 * 1.5 * Math.sqrt(20), 6);
    expect(DEFAULT_DEMAND.flowLps).toBeCloseTo(1.3416, 3);
    expect(DEFAULT_DEMAND.flowM3h).toBeCloseTo(DEFAULT_DEMAND.flowLps * 3.6, 6);
  });

  it('默认输入：流速 1.0 m/s 下理论内径 41.33 mm → 就近 DN50', () => {
    expect(DEFAULT_PIPE.computedDiaMm).toBeCloseTo(41.33, 1);
    expect(DEFAULT_PIPE.recommendedDn).toBe(50);
    expect(DEFAULT_PIPE.actualVelocity).toBeCloseTo(0.6081, 3);
  });

  it('默认输入：所需扬程 39.6 m（30 + 80×0.02 + 3 + 5）', () => {
    expect(DEFAULT_HEAD.frictionLoss).toBeCloseTo(1.6, 6);
    expect(DEFAULT_HEAD.totalHead).toBeCloseTo(39.6, 6);
  });

  it('默认输入：轴功率与配套功率按 waterPump 公式计算', () => {
    expect(DEFAULT_POWER.shaftPowerKw).toBeCloseTo(
      (DEFAULT_DEMAND.flowM3h * DEFAULT_HEAD.totalHead) / (367 * 0.7),
      6,
    );
    expect(DEFAULT_POWER.shaftPowerKw).toBeCloseTo(0.7445, 3);
    expect(DEFAULT_POWER.motorPowerKw).toBeCloseTo(DEFAULT_POWER.shaftPowerKw * 1.15, 6);
    expect(DEFAULT_POWER.standardMotorKw).toBe(1.1);
  });
});

describe('给水系统设计 · 步骤条与汇总卡', () => {
  it('顶部渲染四步按钮且第 1 步高亮', () => {
    mountAt();
    const labels = ['① 当量 → 秒流量', '② 流量 → 管径', '③ 管路 → 扬程', '④ 流量+扬程 → 轴功率'];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    // 第 1 步 aria-current="step"
    expect(
      screen.getByRole('button', { name: '① 当量 → 秒流量' }).getAttribute('aria-current'),
    ).toBe('step');
  });

  it('汇总卡常驻展示 q_g / DN / H / P 四项关键结果', () => {
    mountAt();
    expectVisibleText('汇总（q_g · DN · H · P）');
    expectVisibleText(formatNumber(DEFAULT_DEMAND.flowLps));
    expectVisibleText(`DN${DEFAULT_PIPE.recommendedDn}`);
    expectVisibleText(formatNumber(DEFAULT_HEAD.totalHead));
    expectVisibleText(formatNumber(DEFAULT_POWER.shaftPowerKw));
  });
});

describe('给水系统设计 · 各步结果', () => {
  it('第 1 步：显示当量输入与设计秒流量结果', () => {
    mountAt(1);
    expect(screen.getByText('卫生器具给水当量总数 N_g')).toBeTruthy();
    expect(screen.getByDisplayValue('20')).toBeTruthy();
    expectVisibleText('① 结果：设计秒流量');
    expectVisibleText(formatNumber(DEFAULT_DEMAND.flowLps));
    expectVisibleText(formatNumber(DEFAULT_DEMAND.flowM3h));
  });

  it('第 2 步：显示推荐流速输入与 DN 结果（消费第 1 步流量）', () => {
    mountAt(2);
    expect(screen.getByText('② 输入：推荐流速（流量来自第 1 步）')).toBeTruthy();
    expectVisibleText('② 结果：管径选择');
    expectVisibleText(`DN${DEFAULT_PIPE.recommendedDn}`);
    expectVisibleText(formatNumber(DEFAULT_PIPE.actualVelocity));
  });

  it('第 3 步：显示管路输入与所需扬程结果', () => {
    mountAt(3);
    expect(screen.getByText('③ 输入：管路参数')).toBeTruthy();
    expectVisibleText('③ 结果：所需扬程');
    expectVisibleText(formatNumber(DEFAULT_HEAD.totalHead));
    expectVisibleText(formatNumber(DEFAULT_HEAD.frictionLoss));
  });

  it('第 4 步：显示效率/裕量输入与轴功率结果（消费上游流量与扬程）', () => {
    mountAt(4);
    expect(screen.getByText('④ 输入：水泵效率与裕量（流量、扬程来自前几步）')).toBeTruthy();
    expectVisibleText('④ 结果：轴功率与配套功率');
    expectVisibleText(formatNumber(DEFAULT_POWER.shaftPowerKw));
    expectVisibleText(formatNumber(DEFAULT_POWER.motorPowerKw));
  });
});

describe('给水系统设计 · ?step 深链', () => {
  it('?step=3 直接打开第 3 步', () => {
    mountAt(3);
    expect(
      screen.getByRole('button', { name: '③ 管路 → 扬程' }).getAttribute('aria-current'),
    ).toBe('step');
    // 第 3 步特有输入可见，第 1 步特有输入不可见
    expect(screen.getByText('③ 输入：管路参数')).toBeTruthy();
    expect(screen.queryByText('卫生器具给水当量总数 N_g')).toBeNull();
  });

  it('非法 step（如 9 / abc）回落第 1 步', () => {
    mountAt(9);
    expect(
      screen.getByRole('button', { name: '① 当量 → 秒流量' }).getAttribute('aria-current'),
    ).toBe('step');
    expect(screen.getByText('卫生器具给水当量总数 N_g')).toBeTruthy();
  });
});

describe('给水系统设计 · 输入联动重算', () => {
  it('N_g 20 → 40：q_g 与轴功率随之变化，扬程（与流量无关）保持 39.6 m', () => {
    mountAt(1);
    expectVisibleText(formatNumber(DEFAULT_DEMAND.flowLps));

    const ngInput = screen.getByDisplayValue('20');
    fireEvent.change(ngInput, { target: { value: '40' } });

    const d40 = demandFlow({ ng: 40, buildingType: 'residential' });
    const p40 = pumpPower({ flow: d40.flowM3h, head: DEFAULT_HEAD.totalHead, efficiency: 0.7, margin: 1.15 });

    // q_g 与轴功率变化
    expectVisibleText(formatNumber(d40.flowLps));
    expectVisibleText(formatNumber(p40.shaftPowerKw));
    // 扬程仅由管路参数决定，仍为 39.6 m
    expectVisibleText(formatNumber(DEFAULT_HEAD.totalHead));
    // 40 当量在 1.0 m/s 下理论内径 49.15 mm，仍落在 DN50
    expectVisibleText(`DN${pipeSize({ flow: d40.flowLps, flowUnit: 'L/s', velocity: 1.0 }).recommendedDn}`);
  });

  it('N_g 增大到 60：流量跨档后管径由 DN50 变为 DN65（下游不沿用旧值）', () => {
    mountAt(1);
    const ngInput = screen.getByDisplayValue('20');
    fireEvent.change(ngInput, { target: { value: '60' } });

    const d60 = demandFlow({ ng: 60, buildingType: 'residential' });
    const pipe60 = pipeSize({ flow: d60.flowLps, flowUnit: 'L/s', velocity: 1.0 });

    expect(pipe60.recommendedDn).toBe(65);
    expectVisibleText(formatNumber(d60.flowLps));
    expectVisibleText('DN65');
  });
});
