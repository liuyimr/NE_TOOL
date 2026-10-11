import { describe, expect, it } from 'vitest';
import { byDomain, getAll, getById } from '@/registry';
import { getQuickRef } from '@/data/catalog';

describe('水电领域注册完整性', () => {
  const water = byDomain('water');

  it('共 15 个工具，id 唯一', () => {
    expect(water.length).toBe(15);
    expect(new Set(water.map((t) => t.id)).size).toBe(15);
  });

  it('全部具备 Component（无占位）', () => {
    expect(water.filter((t) => !t.Component).map((t) => t.id)).toEqual([]);
  });

  it('关键工具可回取且编号正确', () => {
    expect(getById('water.loadCalc')?.code).toBe('D1');
    expect(getById('water.powerCurrent')?.code).toBe('D2');
    expect(getById('water.groundingRef')?.code).toBe('D14');
    expect(getById('water.lightning')?.code).toBe('D15');
  });

  it('水电工具引用的速查表均存在', () => {
    for (const t of water) {
      const refs = [t.quickRefId, ...(t.quickRefIds ?? [])].filter(
        (id): id is string => Boolean(id),
      );
      for (const ref of refs) {
        expect(getQuickRef(ref), `${t.id} 引用不存在的速查表 ${ref}`).toBeTruthy();
      }
    }
  });

  it('5 张水电速查表领域正确且 searchable', () => {
    for (const id of [
      'water.cableTypes',
      'water.installLimits',
      'water.pipeSpecs',
      'water.drainSlope',
      'water.groundingLimits',
    ]) {
      const table = getQuickRef(id);
      expect(table, `${id} 缺失`).toBeTruthy();
      expect(table?.domain).toBe('water');
      expect(table?.searchable).toBe(true);
    }
  });

  it('水电工具 id 前缀统一为 water.', () => {
    expect(water.every((t) => t.id.startsWith('water.'))).toBe(true);
    expect(getAll().filter((t) => t.domain === 'water').length).toBe(15);
  });
});
