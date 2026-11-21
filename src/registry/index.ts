import type { Domain, Priority, ToolDef } from '@/types/tool';
import { networkTools } from './network';
import { buildingTools } from './building';
import { hvacTools } from './hvac';
import { automationTools } from './automation';
import { elecTools } from './elec';

/**
 * 工具注册表（配置驱动核心）
 * ------------------------------------------------------------------
 * 汇总五大领域注册项，提供按 id / 领域 / 优先级检索的能力。
 * 「加一个工具 = 加一份配置」：在 registry/<domain>.ts 追加一条 ToolDef 即可，
 * 无需修改路由（/tool/:id 动态匹配）与首页（九宫格由注册表渲染）。
 * 注：搜索索引（含速查行内容）由 `@/lib/searchDocs` 单独构建，
 * 使速查数据只在懒加载的搜索页被引入，不进主包。
 */

/** 全部工具（按注册顺序） */
export const ALL_TOOLS: ToolDef[] = [
  ...networkTools,
  ...buildingTools,
  ...hvacTools,
  ...automationTools,
  ...elecTools,
];

/**
 * 旧 id → 新 id 别名表（类目重构 / v1.6 合并兼容）
 * ------------------------------------------------------------------
 * 5 类目重构后部分工具改了 id 前缀（water→elec/hvac、building→hvac/elec 等），
 * 被合并的 5 项（A2/A5/B11/D3/D14）指向各自宿主。
 * v1.6 第一批合并 2 组：N10 无线信号 → N9 宿主；P13 传感器 → BA10 宿主；P11 伺服参考 → P2 伺服齿轮比。
 * v1.6 第二批合并 3 组：
 *   N2 进制 / P6 IEEE754 / P14 定时器 → P5 数据表示容器（automation.datatype）
 *   H7 冷量计费 → H6 中央空调计费（hvac.billing）
 *   BA4 点位统计 / BA7 BA 点位模板 → BA1 DDC 选型（building.ddcSizing）
 * v1.6 第三批合并 1 组：
 *   H11 管径选择 / H12 给水扬程 / H13 水泵轴功率 → H10 给水系统设计（hvac.demandFlow）
 * 目的：旧的收藏记录与已分享的 #/tool/... 链接不失效。
 * 说明：v1.6 淘汰项（N7 MAC / BA8 图例 / H9 设备参数 / P16 OPC-UA）不再设别名，旧链接按 404 处理。
 */
export const LEGACY_ID_ALIASES: Record<string, string> = {
  // 合并项 → 宿主
  'network.ip': 'network.subnet',
  'network.transmission': 'network.bandwidth',
  'building.fixtureCount': 'elec.illuminance',
  'water.voltageDrop': 'elec.cableDrop',
  'water.groundingRef': 'elec.grounding',
  // v1.6 第一批合并项 → 宿主
  'network.wifiSignal': 'network.wifiChannels',
  'automation.sensors': 'building.sensorSelection',
  // v1.6 淘汰 P11 伺服功率档参考 → 同属伺服的 P2 电子齿轮比
  'automation.servo': 'automation.servoGear',
  // v1.6 第二批合并项 → 宿主
  'network.radix': 'automation.datatype',
  'automation.ieee754': 'automation.datatype',
  'automation.timer': 'automation.datatype',
  'hvac.cooling': 'hvac.billing',
  'building.pointCount': 'building.ddcSizing',
  'building.ddc': 'building.ddcSizing',
  // v1.6 第三批合并项 → 给水系统设计宿主
  'hvac.pipeSize': 'hvac.demandFlow',
  'hvac.pumpHead': 'hvac.demandFlow',
  'hvac.pumpPower': 'hvac.demandFlow',
  // 改前缀：智能化 → 暖通
  'building.precisionAc': 'hvac.precisionAc',
  'building.billing': 'hvac.billing',
  'building.cooling': 'hvac.billing',
  // 改前缀：智能化 / 工控 → 电气
  'building.illuminance': 'elec.illuminance',
  'automation.cableDrop': 'elec.cableDrop',
  'automation.ampacity': 'elec.ampacity',
  // 改前缀：水电 强电 → 电气
  'water.loadCalc': 'elec.load',
  'water.powerCurrent': 'elec.powerCurrent',
  'water.breaker': 'elec.breaker',
  'water.conduit': 'elec.conduit',
  'water.emergencyLight': 'elec.emergencyLight',
  'water.grounding': 'elec.grounding',
  'water.lightning': 'elec.lightning',
  // 改前缀：水电 给排水 → 暖通（管径 / 扬程 / 水泵 三项已并入给水系统设计宿主）
  'water.demandFlow': 'hvac.demandFlow',
  'water.pipeSize': 'hvac.demandFlow',
  'water.pumpHead': 'hvac.demandFlow',
  'water.pumpPower': 'hvac.demandFlow',
  'water.drainSlope': 'hvac.drainSlope',
  'water.waterHeater': 'hvac.waterHeater',
};

/** id → 工具 索引（含新 id） */
const ID_INDEX: Map<string, ToolDef> = new Map(ALL_TOOLS.map((tool) => [tool.id, tool]));

/** 全部工具列表（返回副本，避免外部改动污染注册表） */
export function getAll(): ToolDef[] {
  return [...ALL_TOOLS];
}

/**
 * 按 id 获取工具
 * 先查当前 id；查不到再查历史别名（类目重构前的旧链接 / 收藏仍可命中）。
 * @param id 工具 id（新 id 或旧别名）
 */
export function getById(id: string): ToolDef | undefined {
  const direct = ID_INDEX.get(id);
  if (direct) return direct;
  const alias = LEGACY_ID_ALIASES[id];
  return alias ? ID_INDEX.get(alias) : undefined;
}

/** 按领域获取工具 */
export function byDomain(domain: Domain): ToolDef[] {
  return ALL_TOOLS.filter((tool) => tool.domain === domain);
}

/** 按优先级获取工具 */
export function byPriority(priority: Priority): ToolDef[] {
  return ALL_TOOLS.filter((tool) => tool.priority === priority);
}

// 便于外部按需引用
export type { ToolDef, Domain, Priority };
