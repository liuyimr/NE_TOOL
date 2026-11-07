import { describe, expect, it } from 'vitest';
import { vrvCheck, type VrvCheckInput } from '@/lib/calc/vrvCheck';

/** 默认输入：内机 60 kW / 外机 56 kW / 管长 80 m（基准 5 m）/ 高差 20 m（基准 10 m） */
function baseInput(overrides: Partial<VrvCheckInput> = {}): VrvCheckInput {
  return {
    indoorTotalKw: 60,
    outdoorKw: 56,
    pipeLengthM: 80,
    referenceLengthM: 5,
    heightDiffM: 20,
    heightReferenceM: 10,
    lengthCorrectionPerM: 0.003,
    heightCorrectionPerM: 0.001,
    ratioMin: 0.5,
    ratioMax: 1.3,
    maxPipeLengthM: 165,
    maxHeightDiffM: 50,
    ...overrides,
  };
}

describe('H19 VRV 多联机配比与管长校核', () => {
  it('默认算例：配比 1.0714、衰减 23.5%、修正后 42.84 kW、三项校核通过', () => {
    const r = vrvCheck(baseInput());
    expect(r.valid).toBe(true);
    // 60/56 = 1.0714286
    expect(r.ratio).toBeCloseTo(1.0714286, 7);
    expect(r.ratioOk).toBe(true);
    // (80−5)×0.003×100 = 22.5%；(20−10)×0.001×100 = 1%；合计 23.5%
    expect(r.lengthLossPct).toBeCloseTo(22.5, 9);
    expect(r.heightLossPct).toBeCloseTo(1, 9);
    expect(r.totalLossPct).toBeCloseTo(23.5, 9);
    // 56×(1−0.235) = 42.84 kW
    expect(r.correctedCapacityKw).toBeCloseTo(42.84, 9);
    expect(r.pipeOk).toBe(true);
    expect(r.heightOk).toBe(true);
    expect(r.overallOk).toBe(true);
    expect(r.note).toContain('厂家样本');
  });

  it('超配：内机 90 kW / 外机 56 kW → 配比 1.6071 超出 1.3，综合不通过', () => {
    const r = vrvCheck(baseInput({ indoorTotalKw: 90 }));
    expect(r.valid).toBe(true);
    expect(r.ratio).toBeCloseTo(1.6071429, 7);
    expect(r.ratioOk).toBe(false);
    expect(r.overallOk).toBe(false);
    expect(r.note).toContain('超配');
  });

  it('欠配：内机 20 kW / 外机 56 kW → 配比 0.3571 低于 0.5', () => {
    const r = vrvCheck(baseInput({ indoorTotalKw: 20 }));
    expect(r.ratio).toBeCloseTo(0.3571429, 7);
    expect(r.ratioOk).toBe(false);
    expect(r.note).toContain('欠配');
  });

  it('管长超限：200 m 超过 165 m 上限 → 衰减 58.5%，pipeOk=false 且给出整改提示', () => {
    const r = vrvCheck(baseInput({ pipeLengthM: 200 }));
    // (200−5)×0.003×100 = 58.5%
    expect(r.lengthLossPct).toBeCloseTo(58.5, 9);
    expect(r.totalLossPct).toBeCloseTo(59.5, 9);
    expect(r.correctedCapacityKw).toBeCloseTo(56 * (1 - 0.595), 9);
    expect(r.pipeOk).toBe(false);
    expect(r.heightOk).toBe(true);
    expect(r.overallOk).toBe(false);
    expect(r.note).toContain('超过上限');
  });

  it('高差超限：60 m 超过 50 m 上限 → heightOk=false', () => {
    const r = vrvCheck(baseInput({ heightDiffM: 60 }));
    // (60−10)×0.001×100 = 5%
    expect(r.heightLossPct).toBeCloseTo(5, 9);
    expect(r.heightOk).toBe(false);
    expect(r.overallOk).toBe(false);
    expect(r.note).toContain('高差');
  });

  it('不超基准：管长 5 m、高差 10 m → 无衰减，修正后等于外机容量', () => {
    const r = vrvCheck(baseInput({ pipeLengthM: 5, heightDiffM: 10 }));
    expect(r.lengthLossPct).toBe(0);
    expect(r.heightLossPct).toBe(0);
    expect(r.totalLossPct).toBe(0);
    expect(r.correctedCapacityKw).toBeCloseTo(56, 9);
    expect(r.overallOk).toBe(true);
  });

  it('边界：外机容量为 0、配比上下界非法、负长度、非有限输入 → valid=false 且输出有限', () => {
    const cases: VrvCheckInput[] = [
      baseInput({ outdoorKw: 0 }),
      baseInput({ ratioMin: 0 }),
      baseInput({ ratioMin: 1.4, ratioMax: 1.3 }),
      baseInput({ pipeLengthM: -1 }),
      baseInput({ maxPipeLengthM: 0 }),
      baseInput({ indoorTotalKw: Number.NaN }),
      baseInput({ lengthCorrectionPerM: -0.001 }),
    ];
    for (const input of cases) {
      const r = vrvCheck(input);
      expect(r.valid, `应判无效：${JSON.stringify(input)}`).toBe(false);
      expect(r.note.length).toBeGreaterThan(0);
      expect(Number.isFinite(r.ratio)).toBe(true);
      expect(Number.isFinite(r.totalLossPct)).toBe(true);
      expect(Number.isFinite(r.correctedCapacityKw)).toBe(true);
      expect(r.overallOk).toBe(false);
    }
  });

  it('边界：衰减率极大导致修正后容量按 0 钳制（不出现负能力，提示不可用）', () => {
    const r = vrvCheck(baseInput({ lengthCorrectionPerM: 1 }));
    expect(r.valid).toBe(true);
    // (80−5)×1×100 = 7500% → 衰减远超 100%，容量按 0 计
    expect(r.totalLossPct).toBeCloseTo(7501, 6);
    expect(r.correctedCapacityKw).toBe(0);
    expect(Number.isFinite(r.correctedCapacityKw)).toBe(true);
    expect(r.note).toContain('不可用');
  });

  it('边界：极大容量导致结果溢出被拦截', () => {
    const r = vrvCheck(baseInput({ indoorTotalKw: 1e308, outdoorKw: 1e-10 }));
    expect(r.valid).toBe(false);
    expect(Number.isFinite(r.ratio)).toBe(true);
  });
});
