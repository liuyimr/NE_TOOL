import { lazy } from 'react';
import type { ToolDef } from '@/types/tool';

/**
 * 楼宇自控与弱电领域（BA 组）工具注册项：BA1~BA14（现存 11 项）
 * 说明：原 B6 精密空调 / B8 时间计费 / B9 冷量计费 / B13 设备参数 已迁入「暖通/水暖」；
 *      原 B10 照度 / B11 灯具数量 已迁入「电气与配电」（B11 并入 B10）。
 *      v1.6：BA8「弱电系统图例 / 符号速查」已淘汰；BA10 宿主并入原「工控 C13 传感器输出信号速查」
 *      （两张速查表保留，数据不删）。
 *      v1.6 第二批：BA4「弱电点位统计与工程量估算」与 BA7「BA 点位表模板 / DDC 点位统计」
 *      并入 BA1 宿主（两张速查表 building.pointTypes / building.ddcTemplate 保留并在 BA1 页内展示）。
 *      v1.7 第一批：新增 BA14「监控镜头与识别距离」（视场角 / 覆盖宽度 / DORI，IEC 62676-4）。
 */
const CableLengthEstimator = lazy(() => import('@/features/building/CableLengthEstimator'));
const TrayFill = lazy(() => import('@/features/building/TrayFill'));
const StorageCalculator = lazy(() => import('@/features/building/StorageCalculator'));
const UpsCalculator = lazy(() => import('@/features/building/UpsCalculator'));
/** BA1 宿主：DDC 选型计算 + 点位类型 / DDC 模板两张速查表（原 BA4 / BA7 并入） */
const DdcSizing = lazy(() => import('@/features/building/DdcSizing'));
const BaControlStrategy = lazy(() => import('@/features/building/BaControlStrategy'));
/** BA10 宿主：楼控视角 + 工控视角两张传感器速查表（原 P13 并入） */
const SensorCombined = lazy(() => import('@/features/building/SensorCombined'));
const ValveKv = lazy(() => import('@/features/building/ValveKv'));
const BacnetRef = lazy(() => import('@/features/building/BacnetRef'));
const AccessControl = lazy(() => import('@/features/building/AccessControl'));
/** BA14 监控镜头与识别距离（v1.7 第一批新增） */
const CameraLens = lazy(() => import('@/features/building/CameraLens'));

export const buildingTools: ToolDef[] = [
  {
    id: 'building.ddcSizing',
    code: 'BA1',
    domain: 'building',
    kind: 'calculator',
    priority: 'P0',
    title: 'DDC 选型与 I/O 模块配置',
    subtitle: '点数 → 模块数 → DDC 台数，自动留足余量；页内含点位类型与 DDC 模板速查',
    keywords: [
      'ddc',
      '选型',
      'io',
      '点位',
      '模块',
      'ba',
      '控制器',
      'sizing',
      '统计',
      '工程量',
      'point',
      '点位表',
      '点位统计',
      '点表',
      'ai',
      'ao',
      'di',
      'do',
      '模板',
    ],
    /*
     * tags 只进入搜索索引的 body 字段（见 src/lib/searchDocs.ts），不参与任何 UI 渲染。
     * 「点位表」同时放进 tags 是必要的：Fuse 对长字段有 field-norm 惩罚，关键词串
     * （12+ 个词）里命中 3 字查询的得分很弱，压不过 N14「物联网网关点位容量…」
     * （标题含「点位」，title 权重 0.5）。让短字段 body 也命中后，实测可把本工具
     * 在「点位表」查询下从第 5 位提到第 1 位（0.598 → 0.424，v1.8 实测）。
     */
    tags: ['弱电', 'BA', '点位表'],
    icon: '🧩',
    calcId: 'ddcSizing',
    quickRefIds: ['building.pointTypes', 'building.ddcTemplate'],
    Component: DdcSizing,
  },
  {
    id: 'building.cableLength',
    code: 'BA2',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '综合布线线缆长度估算',
    subtitle: '按点位与平均距离估算线缆量与箱数',
    keywords: ['线缆长度', '估算', '备料', '综合布线', 'cable length', '箱数'],
    tags: ['弱电', '综合布线'],
    icon: '📏',
    calcId: 'cableLength',
    Component: CableLengthEstimator,
  },
  {
    id: 'building.trayFill',
    code: 'BA3',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '桥架 / 管路填充率计算',
    subtitle: '计算填充率并判定是否合规',
    keywords: ['填充率', '桥架', '管路', '穿管', 'fill', '截面', '利用率'],
    tags: ['弱电', '综合布线'],
    icon: '🪜',
    calcId: 'trayFill',
    quickRefId: 'building.fillRate',
    Component: TrayFill,
  },
  {
    id: 'building.storage',
    code: 'BA5',
    domain: 'building',
    kind: 'calculator',
    priority: 'P0',
    title: '视频监控存储容量计算',
    subtitle: '按路数/码率/天数/编码算容量与硬盘配置',
    keywords: ['存储', '监控', '容量', 'h.265', 'h265', '硬盘', 'storage', 'nvr'],
    tags: ['弱电', '监控'],
    icon: '💾',
    calcId: 'storage',
    Component: StorageCalculator,
  },
  {
    id: 'building.ups',
    code: 'BA6',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '机房 UPS 容量计算',
    subtitle: '按负载算 UPS 容量与后备电池容量',
    keywords: ['ups', '容量', '电池', '机房', '后备时间', 'kva', 'ah'],
    tags: ['弱电', '机房'],
    icon: '🔋',
    calcId: 'ups',
    Component: UpsCalculator,
  },
  {
    id: 'building.controlStrategy',
    code: 'BA9',
    domain: 'building',
    kind: 'quickref',
    priority: 'P1',
    title: 'BA 控制策略速查（冷冻站 / 空调箱 / 新风机）',
    subtitle: '冷冻站台数控制与联锁、AHU/FAU 启停顺序、防冻保护与手自动无扰动切换',
    keywords: ['ba', '控制策略', '冷冻站', '空调箱', '新风机', 'ahu', 'fau', '联锁', '台数控制', '防冻'],
    tags: ['弱电', 'BA'],
    icon: '🎛️',
    quickRefId: 'building.controlStrategy',
    Component: BaControlStrategy,
  },
  {
    id: 'building.sensorSelection',
    code: 'BA10',
    domain: 'building',
    kind: 'quickref',
    priority: 'P1',
    title: '传感器量程与精度选型',
    subtitle: '楼控视角（量程 / 精度 / 安装）与工控视角（信号类型 / 接线）双表并列',
    keywords: [
      '传感器',
      '量程',
      '精度',
      '选型',
      'sensor',
      'pt100',
      'pt1000',
      '热电偶',
      '4-20ma',
      '称重',
      '流量计',
      '楼控',
      '测点',
      '信号',
      '接线',
      '输出信号',
    ],
    tags: ['弱电', '仪表'],
    icon: '🌡️',
    quickRefIds: ['building.sensorSelection', 'automation.sensors'],
    Component: SensorCombined,
  },
  {
    id: 'building.valveKv',
    code: 'BA11',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '控制阀门 Kv 值计算与选型',
    subtitle: 'Kv = Q/√Δp，含密度修正、阀权度校核与标准 Kvs 系列就近选型',
    keywords: ['阀门', 'kv', 'kvs', '阀权度', '压差', '选型', '调节阀', '流量'],
    tags: ['弱电', 'BA'],
    icon: '🎚️',
    calcId: 'valveKv',
    Component: ValveKv,
  },
  {
    id: 'building.bacnetRef',
    code: 'BA12',
    domain: 'building',
    kind: 'quickref',
    priority: 'P1',
    title: 'BACnet 对象与服务速查',
    subtitle: 'AI/AO/AV/BI/BO 对象属性、ReadProperty / COV 服务与 BACnet/IP、MS/TP 要点',
    keywords: ['bacnet', '对象', '服务', 'ai', 'ao', 'cov', '47808', 'mstp', 'bbmd', 'bacnet/ip'],
    tags: ['弱电', 'BA'],
    icon: '🔗',
    quickRefId: 'building.bacnetRef',
    Component: BacnetRef,
  },
  {
    id: 'building.accessControl',
    code: 'BA13',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '门禁系统容量与选型',
    subtitle: '按门数算控制器台数与读卡器数量，按电锁同时动作率算峰值功率、电源容量与后备电池容量',
    keywords: ['门禁', 'access control', '控制器', '读卡器', '电锁', '磁力锁', '门禁电源', '后备电池', '同时动作率', '出入口'],
    tags: ['弱电', '门禁'],
    icon: '🚪',
    calcId: 'accessControl',
    Component: AccessControl,
  },
  {
    id: 'building.cameraLens',
    code: 'BA14',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '监控镜头与识别距离',
    subtitle: '焦距/靶面 → 视场角、覆盖宽度与 DORI 识别距离（IEC 62676-4）',
    keywords: [
      '监控',
      '摄像机',
      '镜头',
      '焦距',
      '视场角',
      'fov',
      'dori',
      '识别距离',
      '像素密度',
      '4mm',
      '6mm',
      'ipc',
      '摄像头',
      '靶面',
      '覆盖宽度',
    ],
    tags: ['弱电', '监控'],
    icon: '📹',
    calcId: 'cameraLens',
    Component: CameraLens,
  },
];
