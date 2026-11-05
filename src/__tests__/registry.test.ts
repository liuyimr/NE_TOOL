import { describe, expect, it } from 'vitest';
import { buildSearchDocs, byDomain, byPriority, getAll, getById } from '@/registry';
import { buildIndex, resetSearchIndex, search } from '@/lib/search';

describe('工具注册表', () => {
  it('共 53 个工具', () => {
    expect(getAll().length).toBe(53);
  });

  it('各领域数量：网络/IoT 11 / BA 7 / 暖通 10 / 工控 15 / 电工 10', () => {
    expect(byDomain('network').length).toBe(11);
    expect(byDomain('building').length).toBe(7);
    expect(byDomain('hvac').length).toBe(10);
    expect(byDomain('automation').length).toBe(15);
    expect(byDomain('elec').length).toBe(10);
  });

  it('P0 共 20 个', () => {
    expect(byPriority('P0').length).toBe(20);
  });

  it('getById 命中（新 id 与旧 id 别名一致）', () => {
    expect(getById('network.subnet')?.code).toBe('N1');
    expect(getById('automation.modbus')?.code).toBe('P13');
    expect(getById('elec.load')?.code).toBe('E1');
    // 旧 id 别名：水电类目 water.* 已迁移，仍可命中同一工具
    expect(getById('water.loadCalc')?.id).toBe('elec.load');
    expect(getById('water.demandFlow')?.id).toBe('hvac.demandFlow');
    expect(getById('nope')).toBeUndefined();
  });

  it('buildSearchDocs 含工具与速查行', () => {
    const docs = buildSearchDocs();
    expect(docs.length).toBeGreaterThan(53);
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

  it('自定义索引可查询', () => {
    const index = buildIndex(buildSearchDocs());
    const hits = search('t568b', 10, index);
    expect(hits.some((h) => h.doc.toolId === 'network.cableColor')).toBe(true);
  });

  it('空查询返回空数组', () => {
    expect(search('')).toEqual([]);
  });
});
