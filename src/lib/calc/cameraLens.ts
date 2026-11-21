/**
 * BA14 · 监控镜头焦距 / 视场角 / DORI 识别距离（纯函数）
 * ------------------------------------------------------------------
 * 几何关系（薄透镜 + 靶面近似，工程常用口径）：
 *   水平视场角 hFOV = 2 · atan(W_sensor / (2 · f))
 *   垂直视场角 vFOV = 2 · atan(H_sensor / (2 · f))
 *   覆盖宽度     = 2 · D · tan(hFOV / 2) = D · W_sensor / f
 *   覆盖高度     = 2 · D · tan(vFOV / 2) = D · H_sensor / f
 *   水平像素密度 = 水平分辨率 / 覆盖宽度   (px/m)
 *
 * DORI（IEC 62676-4 视频监控系统设计与验收常用判据）：
 *   监视 Monitor  25 px/m、观察 Observe 62.5 px/m、
 *   辨认 Recognise 125 px/m、识别 Identify 250 px/m。
 *   某等级的最大作用距离：D = N_px / (2 · tan(hFOV/2) · px_per_m)
 *
 * 说明：以上为「镜头 + 传感器 + 物距」的几何近似，未计入畸变、镜头分辨率上限、
 * 大气与照度影响；实际验收应按现场实拍帧率与可辨识细节复核。
 */

/** 输入参数 */
export interface CameraLensInput {
  /** 传感器靶面宽度（mm） */
  sensorWidthMm: number;
  /** 传感器靶面高度（mm） */
  sensorHeightMm: number;
  /** 水平分辨率（px） */
  resolutionPx: number;
  /** 镜头焦距（mm） */
  focalMm: number;
  /** 安装距离 / 物距（m） */
  distanceM: number;
}

/** DORI 等级条目 */
export interface DoriLevel {
  /** 等级名 */
  level: '监视' | '观察' | '辨认' | '识别';
  /** 该等级所需最低像素密度（px/m） */
  minPxPerM: number;
  /** 该等级的最大作用距离（m） */
  maxDistanceM: number;
}

/** 计算结果 */
export interface CameraLensResult {
  /** 输入是否有效（全部有限且 > 0；无效时数值字段全为 0、dori 为空数组） */
  valid: boolean;
  /** 水平视场角（°） */
  hFovDeg: number;
  /** 垂直视场角（°） */
  vFovDeg: number;
  /** 在给定距离处的覆盖宽度（m） */
  coverageWidthM: number;
  /** 在给定距离处的覆盖高度（m） */
  coverageHeightM: number;
  /** 水平像素密度（px/m） */
  pxPerM: number;
  /** 当前距离处的成像等级（'识别' | '辨认' | '观察' | '监视' | '不足'） */
  currentLevel: string;
  /** 四个 DORI 等级及其最大作用距离（按像素密度升序：监视 → 识别） */
  dori: DoriLevel[];
}

/** 常用传感器靶面预设（有效成像区，单位 mm） */
export interface SensorPreset {
  /** 显示名，如 '1/2.7"' */
  label: string;
  /** 靶面宽度（mm） */
  w: number;
  /** 靶面高度（mm） */
  h: number;
}

/** 常见 1/3" ~ 1/1.8" CMOS 靶面尺寸（厂商样本典型值） */
export const SENSOR_PRESETS: SensorPreset[] = [
  { label: '1/3"', w: 4.8, h: 3.6 },
  { label: '1/2.8"', w: 5.18, h: 3.89 },
  { label: '1/2.7"', w: 5.37, h: 4.03 },
  { label: '1/1.8"', w: 7.2, h: 5.4 },
];

/** DORI 判据（IEC 62676-4 常用取值，px/m） */
export const DORI_CRITERIA: { level: DoriLevel['level']; minPxPerM: number }[] = [
  { level: '监视', minPxPerM: 25 },
  { level: '观察', minPxPerM: 62.5 },
  { level: '辨认', minPxPerM: 125 },
  { level: '识别', minPxPerM: 250 },
];

/** 弧度 → 度 */
const RAD_TO_DEG = 180 / Math.PI;

/** 判定是否为有限数 */
function isFiniteNum(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 计算视场角、覆盖范围与 DORI 识别距离
 * @param input 输入参数
 * @returns 计算结果（输入无效时 valid=false，数值字段全 0、dori 为空）
 */
export function cameraLens(input: CameraLensInput): CameraLensResult {
  const raw = [
    input.sensorWidthMm,
    input.sensorHeightMm,
    input.resolutionPx,
    input.focalMm,
    input.distanceM,
  ];

  const invalid = !raw.every(isFiniteNum) || raw.some((v) => v <= 0);
  if (invalid) {
    return {
      valid: false,
      hFovDeg: 0,
      vFovDeg: 0,
      coverageWidthM: 0,
      coverageHeightM: 0,
      pxPerM: 0,
      currentLevel: '不足',
      dori: [],
    };
  }

  // 半视场角的正切：tan(hFOV/2) = W/(2f)，避免先算角度再反算的精度损失
  const halfH = Math.atan(input.sensorWidthMm / (2 * input.focalMm));
  const halfV = Math.atan(input.sensorHeightMm / (2 * input.focalMm));
  const tanHalfH = Math.tan(halfH);
  const tanHalfV = Math.tan(halfV);

  const hFovDeg = 2 * halfH * RAD_TO_DEG;
  const vFovDeg = 2 * halfV * RAD_TO_DEG;
  const coverageWidthM = 2 * input.distanceM * tanHalfH;
  const coverageHeightM = 2 * input.distanceM * tanHalfV;
  const pxPerM = input.resolutionPx / coverageWidthM;

  // 最大作用距离：D = N_px / (2 · tan(hFOV/2) · px_per_m)
  const dori: DoriLevel[] = DORI_CRITERIA.map((criterion) => ({
    level: criterion.level,
    minPxPerM: criterion.minPxPerM,
    maxDistanceM: input.resolutionPx / (2 * tanHalfH * criterion.minPxPerM),
  }));

  let currentLevel = '不足';
  for (let i = dori.length - 1; i >= 0; i -= 1) {
    if (pxPerM >= dori[i].minPxPerM) {
      currentLevel = dori[i].level;
      break;
    }
  }

  return {
    valid: true,
    hFovDeg,
    vFovDeg,
    coverageWidthM,
    coverageHeightM,
    pxPerM,
    currentLevel,
    dori,
  };
}

/**
 * 按等级名取 DORI 条目（未命中返回 undefined）
 * @param dori 计算结果中的 DORI 数组
 * @param level 等级名
 */
export function findDoriLevel(dori: DoriLevel[], level: DoriLevel['level']): DoriLevel | undefined {
  return dori.find((item) => item.level === level);
}
