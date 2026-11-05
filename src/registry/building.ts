import { lazy } from 'react';
import type { ToolDef } from '@/types/tool';

/**
 * 楼宇自控与弱电领域（BA 组）工具注册项：BA1~BA7
 * 说明：原 B6 精密空调 / B8 时间计费 / B9 冷量计费 / B13 设备参数 已迁入「暖通/水暖」；
 *      原 B10 照度 / B11 灯具数量 已迁入「电气与配电」（B11 并入 B10）。
 */
const CableLengthEstimator = lazy(() => import('@/features/building/CableLengthEstimator'));
const TrayFill = lazy(() => import('@/features/building/TrayFill'));
const PointCount = lazy(() => import('@/features/building/PointCount'));
const StorageCalculator = lazy(() => import('@/features/building/StorageCalculator'));
const UpsCalculator = lazy(() => import('@/features/building/UpsCalculator'));
const DdcTemplate = lazy(() => import('@/features/building/DdcTemplate'));
const Symbols = lazy(() => import('@/features/building/Symbols'));

export const buildingTools: ToolDef[] = [
  {
    id: 'building.cableLength',
    code: 'BA1',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '综合布线线缆长度估算',
    subtitle: '按点位与平均距离估算线缆量与箱数',
    keywords: ['线缆长度', '估算', '备料', '综合布线', 'cable length', '箱数'],
    tags: ['弱电', '综合布线'],
    icon: '📏',
    order: 1,
    calcId: 'cableLength',
    Component: CableLengthEstimator,
  },
  {
    id: 'building.trayFill',
    code: 'BA2',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '桥架 / 管路填充率计算',
    subtitle: '计算填充率并判定是否合规',
    keywords: ['填充率', '桥架', '管路', '穿管', 'fill', '截面', '利用率'],
    tags: ['弱电', '综合布线'],
    icon: '🪜',
    order: 2,
    calcId: 'trayFill',
    quickRefId: 'building.fillRate',
    Component: TrayFill,
  },
  {
    id: 'building.pointCount',
    code: 'BA3',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '弱电点位统计与工程量估算',
    subtitle: '分系统点位数统计与 DDC 数量估算',
    keywords: ['点位', '统计', '工程量', '弱电', 'point', 'ddc'],
    tags: ['弱电', '工程量'],
    icon: '🗂️',
    order: 3,
    calcId: 'pointCount',
    quickRefId: 'building.pointTypes',
    Component: PointCount,
  },
  {
    id: 'building.storage',
    code: 'BA4',
    domain: 'building',
    kind: 'calculator',
    priority: 'P0',
    title: '视频监控存储容量计算',
    subtitle: '按路数/码率/天数/编码算容量与硬盘配置',
    keywords: ['存储', '监控', '容量', 'h.265', 'h265', '硬盘', 'storage', 'nvr'],
    tags: ['弱电', '监控'],
    icon: '💾',
    order: 4,
    calcId: 'storage',
    defaultInput: { channels: 50, bitrateMbps: 4, days: 30, codec: 'H265' },
    Component: StorageCalculator,
  },
  {
    id: 'building.ups',
    code: 'BA5',
    domain: 'building',
    kind: 'calculator',
    priority: 'P1',
    title: '机房 UPS 容量计算',
    subtitle: '按负载算 UPS 容量与后备电池容量',
    keywords: ['ups', '容量', '电池', '机房', '后备时间', 'kva', 'ah'],
    tags: ['弱电', '机房'],
    icon: '🔋',
    order: 5,
    calcId: 'ups',
    Component: UpsCalculator,
  },
  {
    id: 'building.ddc',
    code: 'BA6',
    domain: 'building',
    kind: 'quickref',
    priority: 'P1',
    title: 'BA 点位表模板 / DDC 点位统计',
    subtitle: 'AI/AO/DI/DO 规则与 DDC 容量余量',
    keywords: ['ba', 'ddc', '点位', '点位表', 'ai', 'ao', 'di', 'do', '模板'],
    tags: ['弱电', 'BA'],
    icon: '📋',
    order: 6,
    quickRefId: 'building.ddcTemplate',
    Component: DdcTemplate,
  },
  {
    id: 'building.symbols',
    code: 'BA7',
    domain: 'building',
    kind: 'quickref',
    priority: 'P2',
    title: '弱电系统图例 / 符号速查',
    subtitle: '看图纸识别常见弱电符号',
    keywords: ['图例', '符号', '弱电', '图纸', 'symbol', 'legend'],
    tags: ['弱电', '制图'],
    icon: '🗺️',
    order: 7,
    quickRefId: 'building.symbols',
    Component: Symbols,
  },
];
