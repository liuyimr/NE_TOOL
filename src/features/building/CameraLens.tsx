import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { SENSOR_PRESETS, cameraLens, findDoriLevel, type DoriLevel } from '@/lib/calc/cameraLens';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

/** 靶面预设选项（值为预设 label，run 内映射到 w/h） */
const SENSOR_OPTIONS = SENSOR_PRESETS.map((preset) => ({
  label: `${preset.label}（${preset.w} × ${preset.h} mm）`,
  value: preset.label,
}));

const fields: FieldDef[] = [
  {
    key: 'sensor',
    label: '传感器靶面尺寸',
    type: 'select',
    default: '1/2.7"',
    options: SENSOR_OPTIONS,
    help: '常见 200 万像素 IPC 为 1/2.7" 或 1/2.8"，400 万以上多为 1/1.8"；以厂家样本标称有效成像区为准',
  },
  {
    key: 'resolutionPx',
    label: '水平分辨率',
    type: 'number',
    default: 1920,
    min: 1,
    step: 1,
    unit: 'px',
    help: '1080P 为 1920，400 万（2K）为 2560，800 万（4K）为 3840',
  },
  {
    key: 'focalMm',
    label: '镜头焦距 f',
    type: 'number',
    default: 4,
    min: 0,
    step: 0.1,
    unit: 'mm',
    help: '常见 2.8 / 4 / 6 / 8 / 12 mm；焦距越大看得越远、视场角越小',
  },
  {
    key: 'distanceM',
    label: '安装距离（物距 D）',
    type: 'number',
    default: 10,
    min: 0,
    step: 0.5,
    unit: 'm',
    help: '摄像机到被摄目标（如出入口、车道）的实际距离',
  },
];

/** 取某等级的最大识别距离（未命中返回 0） */
function distanceOf(dori: DoriLevel[], level: DoriLevel['level']): number {
  return findDoriLevel(dori, level)?.maxDistanceM ?? 0;
}

function run(v: Record<string, string>): CalcResult[] {
  const label = str(v, 'sensor', '1/2.7"');
  const preset = SENSOR_PRESETS.find((item) => item.label === label) ?? SENSOR_PRESETS[2];

  const r = cameraLens({
    sensorWidthMm: preset.w,
    sensorHeightMm: preset.h,
    resolutionPx: num(v, 'resolutionPx', 1920),
    focalMm: num(v, 'focalMm', 4),
    distanceM: num(v, 'distanceM', 10),
  });

  if (!r.valid) {
    return [
      res('error', '错误', '输入无效：分辨率 / 焦距 / 安装距离必须为大于 0 的数值', '', {
        copyable: false,
      }),
    ];
  }

  return [
    res('currentLevel', '当前距离成像等级（DORI）', r.currentLevel, '', { highlight: true }),
    res('hFov', '水平视场角', r.hFovDeg, '°', { highlight: true }),
    res('vFov', '垂直视场角', r.vFovDeg, '°'),
    res('coverageWidth', '覆盖宽度', r.coverageWidthM, 'm'),
    res('coverageHeight', '覆盖高度', r.coverageHeightM, 'm'),
    res('pxPerM', '水平像素密度', r.pxPerM, 'px/m'),
    res('doriIdentify', '识别最远距离（250 px/m）', distanceOf(r.dori, '识别'), 'm'),
    res('doriRecognise', '辨认最远距离（125 px/m）', distanceOf(r.dori, '辨认'), 'm'),
    res('doriObserve', '观察最远距离（62.5 px/m）', distanceOf(r.dori, '观察'), 'm'),
    res('doriMonitor', '监视最远距离（25 px/m）', distanceOf(r.dori, '监视'), 'm'),
    res(
      'doriStandard',
      '判据口径',
      'DORI 依 IEC 62676-4：监视 25 / 观察 62.5 / 辨认 125 / 识别 250 px/m；视场角按 hFOV = 2·atan(W/(2f)) 的几何近似，未计畸变与镜头解析力上限，验收须以现场实拍可辨识细节为准',
      '',
      { copyable: false },
    ),
    res(
      'sensorUsed',
      '本次使用靶面',
      `${preset.label}：${preset.w} × ${preset.h} mm（分辨率 ${num(v, 'resolutionPx', 1920)} px，f=${num(v, 'focalMm', 4)} mm）`,
      '',
      { copyable: false },
    ),
  ];
}

/** BA14 监控镜头与识别距离 */
export default function CameraLens({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
