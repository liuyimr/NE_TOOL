// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Suspense } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getById } from '@/registry';
import type { ToolDef } from '@/types/tool';

/**
 * v1.7 第一批新增 / 升级工具的界面渲染断言（jsdom）
 * ------------------------------------------------------------------
 * 与 tools.smoke（只验「能挂载、DOM 非空」）互补：这里校验真实渲染出了
 * 结果标签与真实数值，是「新工具确实可用」的直接证据。
 *   - BA14 监控镜头与识别距离：默认 1/2.7" / 1920px / 4mm / 10m
 *   - E18 24V DC 压降与线径：默认铜 1A / 50m / 1.0mm² / 24V / 10%
 *   - E5 电缆选型页新增的「载流量校核」卡：默认 6mm² 穿管 32A 30℃ 单回路
 */
afterEach(() => cleanup());

/** 按 id 取出注册项并在 MemoryRouter 中渲染其懒加载组件 */
function renderTool(toolId: string): void {
  const tool = getById(toolId);
  expect(tool, `${toolId} 未注册`).toBeTruthy();
  const Component = (tool as ToolDef).Component;
  expect(Component, `${toolId} 缺少 Component`).toBeTruthy();
  if (!Component) return;
  render(
    <MemoryRouter
      initialEntries={[`/tool/${toolId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Suspense fallback={null}>
        <Component tool={tool as ToolDef} />
      </Suspense>
    </MemoryRouter>,
  );
}

describe('BA14 监控镜头与识别距离 · 界面', () => {
  it('渲染输入区与 DORI 结果（默认 1/2.7" / 1920px / 4mm / 10m）', async () => {
    renderTool('building.cameraLens');

    // 输入区标签
    expect(await screen.findByText('传感器靶面尺寸')).toBeTruthy();
    expect(screen.getByText('水平分辨率')).toBeTruthy();
    expect(screen.getByText('镜头焦距 f')).toBeTruthy();
    expect(screen.getByText('安装距离（物距 D）')).toBeTruthy();

    // 结果区标签
    expect(screen.getByText('水平视场角')).toBeTruthy();
    expect(screen.getByText('垂直视场角')).toBeTruthy();
    expect(screen.getByText('覆盖宽度')).toBeTruthy();
    expect(screen.getByText('覆盖高度')).toBeTruthy();
    expect(screen.getByText('水平像素密度')).toBeTruthy();
    expect(screen.getByText('当前距离成像等级（DORI）')).toBeTruthy();
    expect(screen.getByText('识别最远距离（250 px/m）')).toBeTruthy();
    expect(screen.getByText('辨认最远距离（125 px/m）')).toBeTruthy();
    expect(screen.getByText('观察最远距离（62.5 px/m）')).toBeTruthy();
    expect(screen.getByText('监视最远距离（25 px/m）')).toBeTruthy();

    // 真实数值：hFOV ≈ 67.74°、覆盖宽 ≈ 13.43m、px/m ≈ 143.02、等级「辨认」
    expect(screen.getAllByText(/67\.7/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/13\.4/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/143\.0/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/辨认/).length).toBeGreaterThan(0);
    // 识别最远 ≈ 5.72m
    expect(screen.getAllByText(/5\.72/).length).toBeGreaterThan(0);
  });
});

describe('E18 24V DC 压降与线径 · 界面', () => {
  it('渲染输入区与压降结果（默认铜 1A / 50m / 1.0mm² / 24V / 10%）', async () => {
    renderTool('elec.dcDrop');

    expect(await screen.findByText('负载电流 I')).toBeTruthy();
    expect(screen.getByText('线路长度（单程）')).toBeTruthy();
    expect(screen.getByText('导体截面 S')).toBeTruthy();
    expect(screen.getByText('导体材质')).toBeTruthy();
    expect(screen.getByText('系统电压')).toBeTruthy();
    expect(screen.getByText('允许压降')).toBeTruthy();

    expect(screen.getByText('压降百分比')).toBeTruthy();
    expect(screen.getByText('压降 ΔU')).toBeTruthy();
    expect(screen.getByText('末端电压')).toBeTruthy();
    expect(screen.getByText('压降结论')).toBeTruthy();
    expect(screen.getByText('推荐标准截面')).toBeTruthy();

    // 7.29% / 1.75V / 22.25V / 合规 ✅ / 0.75mm²
    expect(screen.getAllByText(/7\.29/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.75/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/22\.25/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/合规/).length).toBeGreaterThan(0);
  });
});

describe('E5 电缆选型页 · 载流量校核卡', () => {
  it('在原电压降结果之下渲染载流量校核卡（默认 6mm² 穿管 32A 30℃ 单回路 → 超限）', async () => {
    renderTool('elec.cableDrop');

    // 原有电压降结果仍在（未破坏既有行为）
    expect(await screen.findByText('电压降百分比')).toBeTruthy();
    expect(screen.getByText('满足 5% 的最大长度')).toBeTruthy();

    // 新增卡片与字段
    expect(screen.getByText('载流量校核（按敷设条件修正）')).toBeTruthy();
    expect(screen.getByText('校核截面')).toBeTruthy();
    expect(screen.getByText('回路计算电流 I_b')).toBeTruthy();
    expect(screen.getByText('敷设方式')).toBeTruthy();
    expect(screen.getByText('环境温度')).toBeTruthy();
    expect(screen.getByText('并列（成组）回路数')).toBeTruthy();

    // 结果：6mm² 穿管 31A × 1.0 × 1.0 = 31A < 32A → 超限 ❌，推荐 10mm²
    expect(screen.getByText('修正后允许载流量 I_z')).toBeTruthy();
    expect(screen.getByText('基准载流量（表内值）')).toBeTruthy();
    expect(screen.getByText('温度修正系数 k_t')).toBeTruthy();
    expect(screen.getByText('并列回路修正系数 k_g')).toBeTruthy();
    expect(screen.getAllByText(/超限/).length).toBeGreaterThan(0);
    expect(screen.getByText('推荐最小截面')).toBeTruthy();
    // 断路器配合提示
    expect(
      screen.getAllByText(/断路器整定 In 须满足 In ≤ Iz，请到断路器选型页校核/).length,
    ).toBeGreaterThan(0);
  });
});

describe('v1.7 结果导出 CSV · 界面入口', () => {
  it('H19 VRV 多联机页渲染「导出 CSV」按钮', async () => {
    renderTool('hvac.vrvCheck');

    // 结果区正常渲染（计算仍然可用）
    expect(await screen.findByText('室内外机容量配比')).toBeTruthy();
    expect(screen.getByText('导出 CSV')).toBeTruthy();
  });
});
