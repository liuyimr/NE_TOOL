import { describe, expect, it } from 'vitest';
import { CATEGORIES, convert, convertAll, listUnits } from '@/lib/calc/unitConvert';

describe('C5 工程单位换算', () => {
  it('压力：1 MPa = 10 bar', () => {
    expect(convert('pressure', 'MPa', 'bar', 1)).toBeCloseTo(10, 10);
    expect(convert('pressure', 'bar', 'kPa', 1)).toBeCloseTo(100, 10);
    expect(convert('pressure', 'MPa', 'psi', 1)).toBeCloseTo(145.0377, 3);
  });

  it('温度仿射：℃ ↔ ℉ ↔ K', () => {
    expect(convert('temperature', 'C', 'F', 100)).toBeCloseTo(212, 6);
    expect(convert('temperature', 'C', 'K', 0)).toBeCloseTo(273.15, 6);
    expect(convert('temperature', 'F', 'C', 32)).toBeCloseTo(0, 6);
  });

  it('长度 / 力 / 流量', () => {
    expect(convert('length', 'in', 'mm', 1)).toBeCloseTo(25.4, 6);
    expect(convert('force', 'kgf', 'N', 1)).toBeCloseTo(9.80665, 4);
    expect(convert('flow', 'm3/h', 'L/min', 1)).toBeCloseTo(16.6667, 3);
  });

  it('换算为全部单位', () => {
    const all = convertAll('pressure', 'MPa', 1);
    expect(all['kPa']).toBeCloseTo(1000, 6);
    expect(all['bar']).toBeCloseTo(10, 6);
    expect(Object.keys(all).length).toBe(listUnits('pressure').length);
  });

  it('类别齐全', () => {
    const ids = CATEGORIES.map((c) => c.id);
    for (const needed of ['pressure', 'temperature', 'length', 'force', 'flow']) {
      expect(ids).toContain(needed);
    }
  });
});
