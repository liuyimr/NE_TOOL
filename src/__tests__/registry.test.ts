import { describe, expect, it } from 'vitest';
import { buildSearchDocs, byDomain, byPriority, getAll, getById } from '@/registry';
import { buildIndex, resetSearchIndex, search } from '@/lib/search';

describe('工具注册表', () => {
  it('共 58 个工具', () => {
    expect(getAll().length).toBe(58);
  });

  it('各领域数量：网络13 / 智能化13 / 工控17 / 水电15', () => {
    expect(byDomain('network').length).toBe(13);
    expect(byDomain('building').length).toBe(13);
    expect(byDomain('automation').length).toBe(17);
    expect(byDomain('water').length).toBe(15);
  });

  it('P0 共 27 个', () => {
    expect(byPriority('P0').length).toBe(27);
  });

  it('getById 命中', () => {
    expect(getById('network.subnet')?.code).toBe('A1');
    expect(getById('automation.modbus')?.code).toBe('C15');
    expect(getById('water.loadCalc')?.code).toBe('D1');
    expect(getById('nope')).toBeUndefined();
  });

  it('buildSearchDocs 含工具与速查行', () => {
    const docs = buildSearchDocs();
    expect(docs.length).toBeGreaterThan(58);
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
