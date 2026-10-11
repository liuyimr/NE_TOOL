import { describe, expect, it } from 'vitest';
import { getAll } from '@/registry';
import { QUICK_REF_TABLES, getQuickRef } from '@/data/catalog';

/**
 * 数据/注册表引用完整性测试
 * 目的：确保「配置驱动」体系不发生断裂——工具引用的速查表真实存在、速查表结构合法、
 * id 全局唯一。这类问题不会在类型层面暴露（JSON 为宽泛类型），必须在运行时守护。
 */
describe('数据与注册表引用完整性', () => {
  it('全部速查表 id 唯一且元信息完整', () => {
    expect(QUICK_REF_TABLES.length).toBeGreaterThan(0);
    const ids = QUICK_REF_TABLES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const table of QUICK_REF_TABLES) {
      expect(table.title, `${table.id} 缺 title`).toBeTruthy();
      expect(table.updatedAt, `${table.id} 缺 updatedAt`).toBeTruthy();
      expect(table.columns.length, `${table.id} 无列`).toBeGreaterThan(0);
      expect(table.rows.length, `${table.id} 无数据行`).toBeGreaterThan(0);
    }
  });

  it('速查表行结构合法：values 的键均为已声明列', () => {
    for (const table of QUICK_REF_TABLES) {
      const columnKeys = new Set(table.columns.map((c) => c.key));
      for (const row of table.rows) {
        expect(row.id, `${table.id} 行缺 id`).toBeTruthy();
        expect(row.label, `${table.id} 行缺 label`).toBeTruthy();
        for (const key of Object.keys(row.values)) {
          expect(columnKeys.has(key), `${table.id}#${row.id} 列 ${key} 未声明`).toBe(true);
        }
      }
    }
  });

  it('工具引用的每张速查表均可在数据目录解析', () => {
    for (const tool of getAll()) {
      const refs = [tool.quickRefId, ...(tool.quickRefIds ?? [])].filter(
        (id): id is string => Boolean(id),
      );
      for (const ref of refs) {
        expect(getQuickRef(ref), `${tool.id} 引用了不存在的速查表 ${ref}`).toBeTruthy();
      }
    }
  });

  it('工具 id 与业务编号 code 均唯一', () => {
    const tools = getAll();
    const ids = tools.map((t) => t.id);
    const codes = tools.map((t) => t.code);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('注册表覆盖三大领域且总数为 43', () => {
    const tools = getAll();
    expect(tools.length).toBe(43);
    expect(tools.filter((t) => t.domain === 'network').length).toBe(13);
    expect(tools.filter((t) => t.domain === 'building').length).toBe(13);
    expect(tools.filter((t) => t.domain === 'automation').length).toBe(17);
  });
});
