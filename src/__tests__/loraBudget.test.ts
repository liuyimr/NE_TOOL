import { describe, expect, it } from 'vitest';
import {
  LORA_SENSITIVITY_DBM,
  loraBudget,
  type LoraBudgetInput,
} from '@/lib/calc/loraBudget';

/** 默认输入：14 dBm、收发增益各 2 dBi、馈线 0.5 dB、衰落 10 dB、470 MHz、SF9、n=2.8 */
function baseInput(overrides: Partial<LoraBudgetInput> = {}): LoraBudgetInput {
  return {
    txPowerDbm: 14,
    txGainDbi: 2,
    rxGainDbi: 2,
    cableLossDb: 0.5,
    fadeMarginDb: 10,
    freqMhz: 470,
    sf: 9,
    envFactor: 2.8,
    ...overrides,
  };
}

describe('N15 LoRa 链路预算与覆盖距离', () => {
  it('默认算例：146.5 dB 预算、136.5 dB 可用、约 8.93 km 覆盖', () => {
    const r = loraBudget(baseInput());
    // 手工复算：14 + 2 + 2 − 0.5 − (−129) = 146.5 dB；146.5 − 10 = 136.5 dB
    expect(r.valid).toBe(true);
    expect(r.budgetDb).toBeCloseTo(146.5, 9);
    expect(r.usableDb).toBeCloseTo(136.5, 9);
    expect(r.rxSensitivityDbm).toBe(-129);
    expect(r.sensitivityOverridden).toBe(false);
    // 1 m 参考损耗：32.44 + 20·lg470 + 20·lg0.001 = 32.44 + 53.44196 − 60 = 25.88196 dB
    expect(r.plRefDb).toBeCloseTo(25.882, 3);
    // 10^((136.5 − 25.88196)/(10×2.8)) = 8925.7 m
    expect(r.maxDistanceM).toBeCloseTo(8925.74, 1);
    expect(r.maxDistanceKm).toBeCloseTo(8.9257, 3);
    // 1 km 处：25.88196 + 28×3 = 109.88196 dB；余量 136.5 − 109.88196 = 26.61804 dB
    expect(r.pathLossAt1kmDb).toBeCloseTo(109.882, 3);
    expect(r.marginAt1kmDb).toBeCloseTo(26.618, 3);
    expect(r.reachBeyond1km).toBe(true);
    expect(r.note).toContain('×0.3~0.6');
    expect(r.note).toContain('须现场勘测');
  });

  it('接收灵敏度查表：SF7/8/9/10/11/12 典型值齐全，SF12 覆盖距离最远', () => {
    expect(LORA_SENSITIVITY_DBM[7]).toBe(-123);
    expect(LORA_SENSITIVITY_DBM[8]).toBe(-126);
    expect(LORA_SENSITIVITY_DBM[9]).toBe(-129);
    expect(LORA_SENSITIVITY_DBM[10]).toBe(-132);
    expect(LORA_SENSITIVITY_DBM[11]).toBe(-134.5);
    expect(LORA_SENSITIVITY_DBM[12]).toBe(-137);

    const sf7 = loraBudget(baseInput({ sf: 7 }));
    const sf12 = loraBudget(baseInput({ sf: 12 }));
    // SF7：14+2+2−0.5−(−123) = 140.5 dB；SF12：14+2+2−0.5−(−137) = 154.5 dB
    expect(sf7.budgetDb).toBeCloseTo(140.5, 9);
    expect(sf12.budgetDb).toBeCloseTo(154.5, 9);
    expect(sf12.maxDistanceM).toBeGreaterThan(sf7.maxDistanceM);
  });

  it('灵敏度覆盖值优先于查表值：按 −137 dBm 计算时预算增加 8 dB', () => {
    const r = loraBudget(baseInput({ rxSensitivityDbm: -137 }));
    expect(r.valid).toBe(true);
    expect(r.sensitivityOverridden).toBe(true);
    expect(r.rxSensitivityDbm).toBe(-137);
    // 14 + 2 + 2 − 0.5 + 137 = 154.5 dB；154.5 − 10 = 144.5 dB
    expect(r.budgetDb).toBeCloseTo(154.5, 9);
    expect(r.usableDb).toBeCloseTo(144.5, 9);
    expect(r.maxDistanceM).toBeGreaterThan(8925.74);
  });

  it('环境衰减指数放大：n 从 2.8 → 5.6 时覆盖距离按平方关系缩短（约 1/√n 关系）', () => {
    const flat = loraBudget(baseInput({ envFactor: 2.8 }));
    const urban = loraBudget(baseInput({ envFactor: 5.6 }));
    // 指数线性关系：10^((usable−plRef)/(10·n))，n 翻倍 → 指数减半
    const expectedExponent = (flat.usableDb - flat.plRefDb) / (10 * 2.8) / 2;
    expect(urban.maxDistanceM).toBeCloseTo(Math.pow(10, expectedExponent), 6);
    expect(urban.maxDistanceM).toBeLessThan(flat.maxDistanceM);
  });

  it('衰落余量过大 → 覆盖不足 1 km，note 给出整改建议', () => {
    const r = loraBudget(baseInput({ fadeMarginDb: 130 }));
    expect(r.valid).toBe(true);
    // 146.5 → 16.5 dB 可用损耗，远小于 1 m 参考损耗以外的距离需求
    expect(r.usableDb).toBeCloseTo(16.5, 9);
    expect(r.reachBeyond1km).toBe(false);
    expect(r.maxDistanceM).toBeLessThan(1000);
    expect(r.note).toContain('理论覆盖半径不足 1 km');
  });

  it('边界：频率/衰减指数非正、SF 越界或非整数、非有限输入 → valid=false 且输出全为有限数', () => {
    const cases: LoraBudgetInput[] = [
      baseInput({ freqMhz: 0 }),
      baseInput({ envFactor: 0 }),
      baseInput({ sf: 6 }),
      baseInput({ sf: 13 }),
      baseInput({ sf: 9.5 }),
      baseInput({ txPowerDbm: Number.NaN }),
      baseInput({ cableLossDb: -1 }),
      baseInput({ rxSensitivityDbm: Number.NaN }),
    ];
    for (const input of cases) {
      const r = loraBudget(input);
      expect(r.valid, `应判无效：${JSON.stringify(input)}`).toBe(false);
      expect(r.note.length).toBeGreaterThan(0);
      expect(Number.isFinite(r.budgetDb)).toBe(true);
      expect(Number.isFinite(r.usableDb)).toBe(true);
      expect(Number.isFinite(r.maxDistanceM)).toBe(true);
      expect(Number.isFinite(r.maxDistanceKm)).toBe(true);
      expect(Number.isFinite(r.marginAt1kmDb)).toBe(true);
    }
  });

  it('边界：sf 越界与非整数分别给出对应提示', () => {
    expect(loraBudget(baseInput({ sf: 13 })).note).toContain('扩频因子');
    expect(loraBudget(baseInput({ freqMhz: -1 })).note).toContain('工作频率');
    expect(loraBudget(baseInput({ envFactor: -2 })).note).toContain('环境衰减指数');
    expect(loraBudget(baseInput({ rxSensitivityDbm: Number.POSITIVE_INFINITY })).note).toContain(
      '接收灵敏度覆盖值',
    );
  });

  it('边界：极大功率导致结果溢出被拦截', () => {
    const r = loraBudget(baseInput({ txPowerDbm: 1e300, txGainDbi: 1e300 }));
    expect(r.valid).toBe(false);
    expect(Number.isFinite(r.maxDistanceM)).toBe(true);
    expect(r.note).toContain('溢出');
  });
});
