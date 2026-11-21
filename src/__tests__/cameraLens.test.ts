import { describe, expect, it } from 'vitest';
import {
  DORI_CRITERIA,
  SENSOR_PRESETS,
  cameraLens,
  findDoriLevel,
  type CameraLensInput,
} from '@/lib/calc/cameraLens';

/**
 * BA14 监控镜头焦距 / 视场角 / DORI 识别距离
 * 独立复算口径：
 *   hFOV = 2·atan(W/(2f))，覆盖宽度 = 2·D·tan(hFOV/2) = D·W/f，
 *   px/m = N_px / 覆盖宽度，DORI 最远距离 D = N_px/(2·tan(hFOV/2)·px_per_m)。
 */

/** 基准输入：1/2.7" 靶面 5.37×4.03、1920px、4mm、10m */
const BASE: CameraLensInput = {
  sensorWidthMm: 5.37,
  sensorHeightMm: 4.03,
  resolutionPx: 1920,
  focalMm: 4,
  distanceM: 10,
};

describe('cameraLens · 靶面预设', () => {
  it('提供 1/3" ~ 1/1.8" 四个常用靶面且尺寸升序', () => {
    expect(SENSOR_PRESETS.map((p) => p.label)).toEqual(['1/3"', '1/2.8"', '1/2.7"', '1/1.8"']);
    expect(SENSOR_PRESETS[0]).toEqual({ label: '1/3"', w: 4.8, h: 3.6 });
    expect(SENSOR_PRESETS[3]).toEqual({ label: '1/1.8"', w: 7.2, h: 5.4 });
    for (const preset of SENSOR_PRESETS) {
      expect(preset.w).toBeGreaterThan(preset.h);
    }
  });
});

describe('cameraLens · 1/2.7" / 1920px / 4mm / 10m', () => {
  const r = cameraLens(BASE);

  it('输入有效', () => {
    expect(r.valid).toBe(true);
  });

  it('水平视场角 ≈ 67.74°，垂直视场角 ≈ 53.47°', () => {
    // 2·atan(5.37/8) = 1.182307 rad = 67.74297°
    expect(r.hFovDeg).toBeCloseTo(67.743, 2);
    // 2·atan(4.03/8) = 53.47336°
    expect(r.vFovDeg).toBeCloseTo(53.4734, 3);
  });

  it('覆盖宽度 ≈ 13.43 m、覆盖高度 ≈ 10.08 m（= D·W/f、D·H/f）', () => {
    expect(r.coverageWidthM).toBeCloseTo(13.425, 2);
    expect(r.coverageHeightM).toBeCloseTo(10.075, 2);
  });

  it('水平像素密度 ≈ 143.02 px/m → 当前等级「辨认」', () => {
    expect(r.pxPerM).toBeCloseTo(143.017, 2);
    expect(r.currentLevel).toBe('辨认');
  });

  it('DORI 最远距离：识别 5.72 / 辨认 11.44 / 观察 22.88 / 监视 57.21 m', () => {
    expect(findDoriLevel(r.dori, '识别')?.maxDistanceM).toBeCloseTo(5.7207, 3);
    expect(findDoriLevel(r.dori, '辨认')?.maxDistanceM).toBeCloseTo(11.4413, 3);
    expect(findDoriLevel(r.dori, '观察')?.maxDistanceM).toBeCloseTo(22.8827, 3);
    expect(findDoriLevel(r.dori, '监视')?.maxDistanceM).toBeCloseTo(57.2067, 3);
  });

  it('DORI 四级按 px/m 升序，且距离随等级升高而缩短', () => {
    expect(r.dori.map((d) => d.level)).toEqual(['监视', '观察', '辨认', '识别']);
    expect(r.dori.map((d) => d.minPxPerM)).toEqual([25, 62.5, 125, 250]);
    for (let i = 1; i < r.dori.length; i += 1) {
      expect(r.dori[i].maxDistanceM).toBeLessThan(r.dori[i - 1].maxDistanceM);
    }
  });
});

describe('cameraLens · 焦距变长 / 距离变远 → 等级下降', () => {
  const wide = cameraLens(BASE);
  const tele = cameraLens({ ...BASE, focalMm: 8, distanceM: 25 });

  it('8mm / 25m：视场角收窄、像素密度下降、等级由「辨认」降为「观察」', () => {
    expect(tele.valid).toBe(true);
    expect(tele.hFovDeg).toBeCloseTo(37.1061, 3);
    expect(tele.pxPerM).toBeCloseTo(114.413, 3);
    expect(tele.pxPerM).toBeLessThan(wide.pxPerM);
    expect(wide.currentLevel).toBe('辨认');
    expect(tele.currentLevel).toBe('观察');
  });

  it('2.8mm / 45m：像素密度不足 25 px/m → 等级「不足」', () => {
    // 覆盖宽度 = 45 × 5.37 / 2.8 = 86.30 m → 1920/86.30 ≈ 22.25 px/m < 25
    const far = cameraLens({ ...BASE, focalMm: 2.8, distanceM: 45 });
    expect(far.valid).toBe(true);
    expect(far.pxPerM).toBeCloseTo(22.248, 2);
    expect(far.pxPerM).toBeLessThan(25);
    expect(far.currentLevel).toBe('不足');
  });

  it('分辨率提高到 3840px 时像素密度与识别距离近似翻倍', () => {
    const k4 = cameraLens({ ...BASE, resolutionPx: 3840 });
    expect(k4.pxPerM).toBeCloseTo(286.03, 1);
    expect(k4.currentLevel).toBe('识别');
    expect(findDoriLevel(k4.dori, '识别')?.maxDistanceM).toBeCloseTo(11.4413, 3);
  });
});

describe('cameraLens · 输入校验', () => {
  const zeroed = {
    hFovDeg: 0,
    vFovDeg: 0,
    coverageWidthM: 0,
    coverageHeightM: 0,
    pxPerM: 0,
  };

  it('焦距为 0 → valid:false 且数值全 0、dori 为空', () => {
    const r = cameraLens({ ...BASE, focalMm: 0 });
    expect(r.valid).toBe(false);
    expect(r).toMatchObject(zeroed);
    expect(r.dori).toEqual([]);
    expect(r.currentLevel).toBe('不足');
  });

  it('负距离 / 负分辨率 / 0 靶面宽 → valid:false', () => {
    for (const patch of [
      { distanceM: -1 },
      { resolutionPx: -1920 },
      { sensorWidthMm: 0 },
      { sensorHeightMm: -4.03 },
    ]) {
      const r = cameraLens({ ...BASE, ...patch });
      expect(r.valid, JSON.stringify(patch)).toBe(false);
      expect(r).toMatchObject(zeroed);
    }
  });

  it('非有限值（NaN / Infinity）→ valid:false', () => {
    expect(cameraLens({ ...BASE, focalMm: Number.NaN }).valid).toBe(false);
    expect(cameraLens({ ...BASE, distanceM: Number.POSITIVE_INFINITY }).valid).toBe(false);
  });
});

describe('cameraLens · DORI 判据常量（IEC 62676-4）', () => {
  it('监视 25 / 观察 62.5 / 辨认 125 / 识别 250 px/m', () => {
    expect(DORI_CRITERIA).toEqual([
      { level: '监视', minPxPerM: 25 },
      { level: '观察', minPxPerM: 62.5 },
      { level: '辨认', minPxPerM: 125 },
      { level: '识别', minPxPerM: 250 },
    ]);
  });

  it('findDoriLevel 未命中返回 undefined', () => {
    const r = cameraLens(BASE);
    expect(findDoriLevel(r.dori, '识别')?.level).toBe('识别');
    expect(findDoriLevel([], '识别')).toBeUndefined();
  });
});
