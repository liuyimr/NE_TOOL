import { describe, expect, it } from 'vitest';
import { byDomain, getById } from '@/registry';
import { getQuickRef } from '@/data/catalog';

/**
 * 水电类目已按 5 类目重构拆入 elec / hvac：本文件校验拆分后注册与数据的完整性。
 */
describe('原「水电」类目拆分后注册完整性', () => {
  it('拆入后 elec 10 个、hvac 10 个', () => {
    expect(byDomain('elec').length).toBe(10);
    expect(byDomain('hvac').length).toBe(10);
  });

  it('强电工具全部具备 Component（无占位）', () => {
    expect(byDomain('elec').filter((t) => !t.Component).map((t) => t.id)).toEqual([]);
  });

  it('关键工具可回取（新 id 编号 E/H 系列）', () => {
    expect(getById('elec.load')?.code).toBe('E1');
    expect(getById('elec.grounding')?.code).toBe('E8');
    expect(getById('elec.lightning')?.code).toBe('E9');
    expect(getById('hvac.demandFlow')?.code).toBe('H5');
    expect(getById('hvac.waterHeater')?.code).toBe('H10');
  });

  it('旧 id 别名解析到对应新工具', () => {
    expect(getById('water.loadCalc')?.id).toBe('elec.load');
    expect(getById('water.lightning')?.id).toBe('elec.lightning');
    expect(getById('water.pumpPower')?.id).toBe('hvac.pumpPower');
    // 合并项
    expect(getById('water.voltageDrop')?.id).toBe('elec.cableDrop');
    expect(getById('water.groundingRef')?.id).toBe('elec.grounding');
  });

  it('elec / hvac 工具引用的速查表均存在', () => {
    for (const t of [...byDomain('elec'), ...byDomain('hvac')]) {
      const refs = [t.quickRefId, ...(t.quickRefIds ?? [])].filter(
        (id): id is string => Boolean(id),
      );
      for (const ref of refs) {
        expect(getQuickRef(ref), `${t.id} 引用不存在的速查表 ${ref}`).toBeTruthy();
      }
    }
  });

  it('原水电 5 张速查表领域改为 hvac / elec 且 searchable', () => {
    const expectDomain: Record<string, string> = {
      'water.cableTypes': 'elec',
      'water.installLimits': 'elec',
      'water.groundingLimits': 'elec',
      'water.pipeSpecs': 'hvac',
      'water.drainSlope': 'hvac',
    };
    for (const [id, domain] of Object.entries(expectDomain)) {
      const table = getQuickRef(id);
      expect(table, `${id} 缺失`).toBeTruthy();
      expect(table?.domain).toBe(domain);
      expect(table?.searchable).toBe(true);
    }
  });
});
