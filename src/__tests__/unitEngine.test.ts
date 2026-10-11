import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  convert,
  convertAll,
  findUnit,
  getCategory,
  listUnits,
} from '@/lib/engine/unitEngine';

/**
 * 单位换算引擎测试（纯函数，无 React 依赖）
 * 覆盖：压力 / 温度（仿射）/ 长度 / 数据速率，以及 convertAll 自洽性与异常分支。
 */
describe('单位换算引擎', () => {
  it('注册了 14 个类别且每类基准单位存在', () => {
    expect(CATEGORIES.length).toBe(14);
    for (const category of CATEGORIES) {
      expect(findUnit(category.id, category.base), `${category.id} 缺少基准单位`).toBeTruthy();
    }
  });

  it('压力：1 MPa = 1000 kPa = 1e6 Pa', () => {
    expect(convert('pressure', 'MPa', 'kPa', 1)).toBeCloseTo(1000, 6);
    expect(convert('pressure', 'MPa', 'Pa', 1)).toBeCloseTo(1e6, 3);
    expect(convert('pressure', 'bar', 'kPa', 1)).toBeCloseTo(100, 6);
  });

  it('温度（仿射）：0℃ = 32℉ = 273.15K，100℃ = 212℉', () => {
    expect(convert('temperature', 'C', 'F', 0)).toBeCloseTo(32, 6);
    expect(convert('temperature', 'C', 'K', 0)).toBeCloseTo(273.15, 6);
    expect(convert('temperature', 'C', 'F', 100)).toBeCloseTo(212, 6);
    expect(convert('temperature', 'F', 'C', 32)).toBeCloseTo(0, 6);
  });

  it('长度：1 in = 25.4 mm，1 ft = 12 in', () => {
    expect(convert('length', 'in', 'mm', 1)).toBeCloseTo(25.4, 6);
    expect(convert('length', 'ft', 'in', 1)).toBeCloseTo(12, 6);
  });

  it('数据速率：1 Gbps = 1000 Mbps = 1e6 Kbps', () => {
    expect(convert('dataRate', 'Gbps', 'Mbps', 1)).toBeCloseTo(1000, 6);
    expect(convert('dataRate', 'Gbps', 'Kbps', 1)).toBeCloseTo(1e6, 3);
  });

  it('convertAll 返回全部单位且源单位自身等值', () => {
    const all = convertAll('length', 'm', 1);
    expect(Object.keys(all).length).toBe(listUnits('length').length);
    expect(all['m']).toBeCloseTo(1, 9);
    expect(all['mm']).toBeCloseTo(1000, 6);
    expect(all['km']).toBeCloseTo(0.001, 9);
  });

  it('未知类别 / 单位抛出明确错误', () => {
    expect(() => convert('nope', 'a', 'b', 1)).toThrow();
    expect(() => convert('pressure', 'nope', 'Pa', 1)).toThrow();
    expect(() => convert('pressure', 'Pa', 'nope', 1)).toThrow();
    expect(getCategory('nope')).toBeUndefined();
    expect(listUnits('nope')).toEqual([]);
  });
});
