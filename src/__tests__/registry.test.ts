import { describe, expect, it } from 'vitest';
import { byDomain, byPriority, getAll, getById } from '@/registry';
import { getQuickRef } from '@/data/catalog';
import { buildSearchDocs } from '@/lib/searchDocs';
import { buildIndex, resetSearchIndex, search } from '@/lib/search';

describe('工具注册表', () => {
  it('共 70 个工具（v1.7 第一批：新增 BA14 / E18）', () => {
    expect(getAll().length).toBe(70);
  });

  it('各领域数量：网络/IoT 12 / BA 11 / 暖通 14 / 工控 15 / 电工 18', () => {
    expect(byDomain('network').length).toBe(12);
    expect(byDomain('building').length).toBe(11);
    expect(byDomain('hvac').length).toBe(14);
    expect(byDomain('automation').length).toBe(15);
    expect(byDomain('elec').length).toBe(18);
  });

  it('P0 共 22 个', () => {
    expect(byPriority('P0').length).toBe(22);
  });

  it('getById 命中（新 id 与旧 id 别名一致）', () => {
    expect(getById('network.subnet')?.code).toBe('N1');
    expect(getById('automation.modbus')?.code).toBe('P15');
    expect(getById('elec.load')?.code).toBe('E3');
    expect(getById('elec.cableTypes')?.code).toBe('E1');
    expect(getById('hvac.loadEstimate')?.code).toBe('H1');
    expect(getById('building.ddcSizing')?.code).toBe('BA1');
    expect(getById('automation.servoGear')?.code).toBe('P2');
    // 旧 id 别名：水电类目 water.* 已迁移，仍可命中同一工具
    expect(getById('water.loadCalc')?.id).toBe('elec.load');
    expect(getById('water.demandFlow')?.id).toBe('hvac.demandFlow');
    expect(getById('nope')).toBeUndefined();
  });

  it('buildSearchDocs 含工具与速查行', () => {
    const docs = buildSearchDocs();
    expect(docs.length).toBeGreaterThan(70);
    expect(docs.some((d) => d.type === 'tool')).toBe(true);
    expect(docs.some((d) => d.type === 'quickref-item')).toBe(true);
  });
});

describe('全文检索（Fuse）', () => {
  it('命中「子网」', () => {
    resetSearchIndex();
    const hits = search('子网');
    expect(hits.some((h) => h.doc.toolId === 'network.subnet')).toBe(true);
  });

  it('命中「502」→ 端口速查', () => {
    resetSearchIndex();
    const hits = search('502');
    expect(hits.some((h) => h.doc.toolId === 'network.ports')).toBe(true);
  });

  it('命中「modbus」', () => {
    resetSearchIndex();
    const hits = search('modbus');
    expect(hits.some((h) => h.doc.toolId === 'automation.modbus')).toBe(true);
  });

  it('v1.6 合并后：RSSI 与传感器信号仍可命中各自宿主', () => {
    resetSearchIndex();
    // 原 N10 的关键词并入 N9 宿主
    expect(search('rssi').some((h) => h.doc.toolId === 'network.wifiChannels')).toBe(true);
    // 原 P13 的关键词并入 BA10 宿主
    expect(search('热电偶').some((h) => h.doc.toolId === 'building.sensorSelection')).toBe(true);
    // 两张被并入的速查表仍在数据目录中（行内容可被检索到宿主）
    expect(getQuickRef('network.wifiSignal')).toBeTruthy();
    expect(getQuickRef('automation.sensors')).toBeTruthy();
  });

  it('v1.6 第二批合并后：进制 / IEEE754 / 定时器 / 冷量 / 点位关键词均命中宿主', () => {
    resetSearchIndex();
    // 原 N2 进制转换器的关键词并入 P5 宿主
    expect(search('radix').some((h) => h.doc.toolId === 'automation.datatype')).toBe(true);
    expect(search('进制').some((h) => h.doc.toolId === 'automation.datatype')).toBe(true);
    // 原 P6 IEEE754 的关键词并入 P5 宿主
    expect(search('ieee754').some((h) => h.doc.toolId === 'automation.datatype')).toBe(true);
    expect(search('字序').some((h) => h.doc.toolId === 'automation.datatype')).toBe(true);
    // 原 P14 定时器的关键词并入 P5 宿主
    expect(search('时基').some((h) => h.doc.toolId === 'automation.datatype')).toBe(true);
    // 原 H7 冷量计费的关键词并入 H6 宿主
    expect(search('能量型').some((h) => h.doc.toolId === 'hvac.billing')).toBe(true);
    // 原 BA4 / BA7 的点位关键词并入 BA1 宿主
    expect(search('工程量').some((h) => h.doc.toolId === 'building.ddcSizing')).toBe(true);
    expect(search('点位表').some((h) => h.doc.toolId === 'building.ddcSizing')).toBe(true);
    // 两张被并入的速查表仍在数据目录中，且归入 BA1 宿主
    expect(getQuickRef('building.pointTypes')).toBeTruthy();
    expect(getQuickRef('building.ddcTemplate')).toBeTruthy();
  });

  it('自定义索引可查询', () => {
    const index = buildIndex(buildSearchDocs());
    const hits = search('t568b', 10, index);
    expect(hits.some((h) => h.doc.toolId === 'network.cableColor')).toBe(true);
  });

  it('空查询返回空数组', () => {
    expect(search('')).toEqual([]);
  });
});
