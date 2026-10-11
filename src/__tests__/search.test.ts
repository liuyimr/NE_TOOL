import { describe, expect, it } from 'vitest';
import { resetSearchIndex, search, searchTools } from '@/lib/search';

/**
 * 全文检索测试（Fuse.js 运行时索引）
 * 覆盖：空查询、工具名命中、中英关键词命中、速查行内容命中、只搜工具过滤。
 */
describe('全文检索', () => {
  it('空/纯空白查询返回空数组', () => {
    resetSearchIndex();
    expect(search('')).toEqual([]);
    expect(search('   ')).toEqual([]);
  });

  it('“子网”可命中 IP 子网计算器', () => {
    const hits = search('子网');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.doc.toolId === 'network.subnet')).toBe(true);
  });

  it('“modbus”可命中 Modbus 速查工具', () => {
    const hits = search('modbus');
    expect(hits.some((h) => h.doc.toolId === 'automation.modbus')).toBe(true);
  });

  it('“T568B”可命中网线线序速查（速查行内容也被索引）', () => {
    const hits = search('T568B');
    expect(hits.length).toBeGreaterThan(0);
  });

  it('“502”有命中结果', () => {
    expect(search('502').length).toBeGreaterThan(0);
  });

  it('limit 生效', () => {
    const hits = search('a', 5);
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  it('searchTools 仅返回工具类文档', () => {
    const hits = searchTools('modbus');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.doc.type === 'tool')).toBe(true);
  });
});
