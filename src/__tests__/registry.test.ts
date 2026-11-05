import { describe, expect, it } from 'vitest';
import { buildSearchDocs, byDomain, byPriority, getAll, getById } from '@/registry';
import { buildIndex, resetSearchIndex, search } from '@/lib/search';

describe('工具注册表', () => {
  it('共 63 个工具', () => {
    expect(getAll().length).toBe(63);
  });

  it('各领域数量：网络/IoT 11 / BA 8 / 暖通 15 / 工控 17 / 电工 12', () => {
    expect(byDomain('network').length).toBe(11);
    expect(byDomain('building').length).toBe(8);
    expect(byDomain('hvac').length).toBe(15);
    expect(byDomain('automation').length).toBe(17);
    expect(byDomain('elec').length).toBe(12);
  });

  it('P0 共 30 个', () => {
    expect(byPriority('P0').length).toBe(30);
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
    expect(docs.length).toBeGreaterThan(63);
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
