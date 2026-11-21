// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from '@/App';
import { LEGACY_ID_ALIASES, getById } from '@/registry';
import type { ToolDef } from '@/types/tool';

import SubnetCalculator from '@/features/network/SubnetCalculator';
import BandwidthConverter from '@/features/network/BandwidthConverter';
import WifiCombined from '@/features/network/WifiCombined';
import SensorCombined from '@/features/building/SensorCombined';
import IlluminanceCalc from '@/features/building/IlluminanceCalc';
import Grounding from '@/features/elec/Grounding';
import DataRepresentation from '@/features/automation/DataRepresentation';
import BillingCombined from '@/features/building/BillingCombined';
import DdcSizing from '@/features/building/DdcSizing';

/**
 * 第 0 步（5 类目重构）验收：
 * - 被合并的 5 项确实内嵌在宿主页面里（A2→A1、A5→A4、B11→B10、D3→E3、D14→E13）
 * - 旧 id 别名全部解析到新工具（收藏 / 已分享链接不失效）
 * - 首页 6 个 Tab（含「全部」）
 * v1.6 第一批：N10→N9、P13→BA10
 * v1.6 第二批：N2 进制 / P6 IEEE754 / P14 定时器 → P5 数据表示容器；
 *              H7 冷量计费 → H6 计费宿主；BA4 点位统计 / BA7 点位模板 → BA1 DDC 选型
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

  it('N9 无线信道页内可见「信道与频率」与「信号强度换算」两段（原 N10）', () => {
    mount(<WifiCombined tool={tool('network.wifiChannels')} />);
    expect(screen.getByText('信道与频率')).toBeTruthy();
    expect(screen.getByText('信号强度换算')).toBeTruthy();
    // 两张速查表同屏：信道表 + RSSI 参考表
    expect(screen.getByText('无线信道频率（2.4G / 5G）')).toBeTruthy();
    expect(screen.getByText('WiFi 信号强度参考（RSSI）')).toBeTruthy();
  });

  it('BA10 传感器页内可见「楼控视角」与「工控视角」两段（原 P13）', () => {
    mount(<SensorCombined />);
    expect(screen.getByText('楼控视角（量程 / 精度 / 安装）')).toBeTruthy();
    expect(screen.getByText('工控视角（信号类型 / 接线）')).toBeTruthy();
    expect(screen.getByText('传感器量程与精度选型')).toBeTruthy();
    expect(screen.getByText('常用传感器输出信号')).toBeTruthy();
  });
});

describe('v1.6 第二批 · 三组合并页内验证', () => {
  it('P5 数据类型页含三个页签，切到「IEEE754 / 字序」后出现字序表（原 N2 / P6 / P14）', async () => {
    mount(<DataRepresentation tool={tool('automation.datatype')} />);

    // 三个页签：进制与位宽 / 数据类型 / IEEE754 / 字序
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(3);
    expect(screen.getByRole('tab', { name: /进制与位宽/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /数据类型/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /IEEE754/ })).toBeTruthy();

    // 默认 radix 页签：原进制转换器的结果区（十进制 / 十六进制）
    expect(screen.getByText('十进制')).toBeTruthy();

    // 切到 ieee 页签：IEEE754 换算 + 字序表
    fireEvent.click(screen.getByRole('tab', { name: /IEEE754/ }));
    await waitFor(() => expect(screen.getByText('重排后 HEX')).toBeTruthy());
    expect(screen.getByText('字序', { selector: 'th' })).toBeTruthy();
    // 四行结果表：ABCD / CDAB / BADC / DCBA
    for (const order of ['ABCD', 'CDAB', 'BADC', 'DCBA']) {
      expect(screen.getByText(order, { selector: 'span' })).toBeTruthy();
    }
  });

  it('P5 数据类型页的「数据类型 / BCD」页签内含定时器 / 计数器换算折叠块', async () => {
    mount(<DataRepresentation tool={tool('automation.datatype')} />);
    fireEvent.click(screen.getByRole('tab', { name: /数据类型/ }));
    await waitFor(() => expect(screen.getByText('定时器 / 计数器换算')).toBeTruthy());
    // 折叠块内的定时器换算表单默认值仍在（时基 × 设定值）
    expect(screen.getAllByText('时基').length).toBeGreaterThan(0);
  });

  it('H6 空调计费页含「时间型」「能量型」两个页签（原 H7）', async () => {
    mount(<BillingCombined tool={tool('hvac.billing')} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(2);
    expect(screen.getByRole('tab', { name: /时间型/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /能量型/ })).toBeTruthy();
    // 时间型（默认）：按 FCU 档位运行时长计费
    expect(screen.getByText('高档运行时长')).toBeTruthy();

    // 切到能量型：按流量与供回水温差累计冷量
    fireEvent.click(screen.getByRole('tab', { name: /能量型/ }));
    await waitFor(() => expect(screen.getByText('累计冷量')).toBeTruthy());
    expect(screen.getByText('供回水温差')).toBeTruthy();
  });

  it('BA1 DDC 选型页内保留点位类型与 DDC 模板两张速查表（原 BA4 / BA7）', () => {
    mount(<DdcSizing tool={tool('building.ddcSizing')} />);
    // 计算区仍在
    expect(screen.getByText('含余量总点数')).toBeTruthy();
    // 两张速查表标题
    expect(screen.getByText('弱电点位类型与统计口径')).toBeTruthy();
    expect(screen.getByText('BA / DDC 点位模板与容量规则')).toBeTruthy();
  });
});

describe('旧 id 别名映射', () => {
  it('全部别名（36 条：合并项 17 条 + 前缀改名 19 条）均解析到存在的新工具', () => {
    const entries = Object.entries(LEGACY_ID_ALIASES);
    expect(entries.length).toBe(36);
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

  it('v1.6 新增别名：旧无线 / 传感器 / 伺服链接命中宿主', () => {
    expect(getById('network.wifiSignal')?.id).toBe('network.wifiChannels');
    expect(getById('automation.sensors')?.id).toBe('building.sensorSelection');
    expect(getById('automation.servo')?.id).toBe('automation.servoGear');
  });

  it('v1.6 第二批：进制 / IEEE754 / 定时器三条旧链接均命中 P5 数据表示宿主', () => {
    expect(getById('network.radix')?.id).toBe('automation.datatype');
    expect(getById('automation.ieee754')?.id).toBe('automation.datatype');
    expect(getById('automation.timer')?.id).toBe('automation.datatype');
    // 三条旧 id 解析到同一个工具对象（宿主）
    const host = getById('automation.datatype');
    expect(getById('network.radix')).toBe(host);
    expect(getById('automation.ieee754')).toBe(host);
    expect(getById('automation.timer')).toBe(host);
  });

  it('v1.6 第二批：冷量计费旧链接命中 H6 计费宿主', () => {
    expect(getById('hvac.cooling')?.id).toBe('hvac.billing');
    expect(getById('hvac.cooling')).toBe(getById('hvac.billing'));
  });

  it('v1.6 第二批：点位统计 / BA 点位模板旧链接命中 BA1 DDC 选型宿主', () => {
    expect(getById('building.pointCount')?.id).toBe('building.ddcSizing');
    expect(getById('building.ddc')?.id).toBe('building.ddcSizing');
    expect(getById('building.pointCount')).toBe(getById('building.ddcSizing'));
    expect(getById('building.ddc')).toBe(getById('building.ddcSizing'));
  });

  it('v1.6 第三批：管径 / 扬程 / 水泵三条旧链接均命中 H10 给水系统设计宿主', () => {
    expect(getById('hvac.pipeSize')?.id).toBe('hvac.demandFlow');
    expect(getById('hvac.pumpHead')?.id).toBe('hvac.demandFlow');
    expect(getById('hvac.pumpPower')?.id).toBe('hvac.demandFlow');
    // 三条旧 id 解析到同一个工具对象（宿主）
    const host = getById('hvac.demandFlow');
    expect(getById('hvac.pipeSize')).toBe(host);
    expect(getById('hvac.pumpHead')).toBe(host);
    expect(getById('hvac.pumpPower')).toBe(host);
    // 原 water.* 前缀别名也统一指向宿主
    expect(getById('water.pipeSize')?.id).toBe('hvac.demandFlow');
    expect(getById('water.pumpHead')?.id).toBe('hvac.demandFlow');
    expect(getById('water.pumpPower')?.id).toBe('hvac.demandFlow');
  });

  it('被合并的 6 个旧 id 已不在注册表中（只作为别名存在）', () => {
    const ids = new Set(
      ['network.radix', 'automation.ieee754', 'automation.timer', 'hvac.cooling', 'building.pointCount', 'building.ddc'],
    );
    // 注册表内不再有这些 id 的条目：别名解析结果 id 与旧 id 不同
    for (const oldId of ids) {
      expect(getById(oldId)?.id).not.toBe(oldId);
    }
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
