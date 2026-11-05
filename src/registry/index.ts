import { QUICK_REF_TABLES, getQuickRef } from '@/data/catalog';
import type { Domain, Priority, SearchDoc, ToolDef } from '@/types/tool';
import { networkTools } from './network';
import { buildingTools } from './building';
import { hvacTools } from './hvac';
import { automationTools } from './automation';
import { elecTools } from './elec';

/**
 * 工具注册表（配置驱动核心）
 * ------------------------------------------------------------------
 * 汇总五大领域注册项，提供检索与搜索索引构建能力。
 * 「加一个工具 = 加一份配置」：在 registry/<domain>.ts 追加一条 ToolDef 即可，
 * 无需修改路由（/tool/:id 动态匹配）与首页（九宫格由注册表渲染）。
 */

/** 全部工具（按 order 稳定排序） */
export const ALL_TOOLS: ToolDef[] = [
  ...networkTools,
  ...buildingTools,
  ...hvacTools,
  ...automationTools,
  ...elecTools,
];

/**
 * 旧 id → 新 id 别名表（类目重构兼容）
 * ------------------------------------------------------------------
 * 5 类目重构后部分工具改了 id 前缀（water→elec/hvac、building→hvac/elec 等），
 * 被合并的 5 项（A2/A5/B11/D3/D14）指向各自宿主。
 * 目的：旧的收藏记录与已分享的 #/tool/... 链接不失效。
 */
export const LEGACY_ID_ALIASES: Record<string, string> = {
  // 合并项 → 宿主
  'network.ip': 'network.subnet',
  'network.transmission': 'network.bandwidth',
  'building.fixtureCount': 'elec.illuminance',
  'water.voltageDrop': 'elec.cableDrop',
  'water.groundingRef': 'elec.grounding',
  // 改前缀：智能化 → 暖通
  'building.precisionAc': 'hvac.precisionAc',
  'building.billing': 'hvac.billing',
  'building.cooling': 'hvac.cooling',
  'building.deviceParams': 'hvac.deviceParams',
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
  // 改前缀：水电 给排水 → 暖通
  'water.demandFlow': 'hvac.demandFlow',
  'water.pipeSize': 'hvac.pipeSize',
  'water.pumpHead': 'hvac.pumpHead',
  'water.pumpPower': 'hvac.pumpPower',
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

/**
 * 速查表 id → 拥有该表（引用该表）的工具 id 映射
 * 一个工具可通过 quickRefId / quickRefIds 引用一张或多张速查表。
 */
function buildQuickRefOwnerMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const tool of ALL_TOOLS) {
    const ids = [tool.quickRefId, ...(tool.quickRefIds ?? [])].filter(
      (id): id is string => Boolean(id),
    );
    for (const refId of ids) {
      if (!map.has(refId)) map.set(refId, tool.id);
    }
  }
  return map;
}

/**
 * 构建统一搜索文档：工具元信息 + 速查行内容
 * @returns SearchDoc[]，可直接交给 Fuse 建立索引
 */
export function buildSearchDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  // ① 工具本身
  for (const tool of ALL_TOOLS) {
    docs.push({
      id: `tool:${tool.id}`,
      type: 'tool',
      title: tool.title,
      subtitle: tool.subtitle,
      keywords: tool.keywords.join(' '),
      body: `${tool.code} ${tool.tags.join(' ')}`,
      toolId: tool.id,
      domain: tool.domain,
    });
  }

  // ② 速查行内容（仅纳入 searchable 的表）
  const ownerMap = buildQuickRefOwnerMap();
  for (const table of QUICK_REF_TABLES) {
    if (!table.searchable) continue;
    const toolId = ownerMap.get(table.id);
    if (!toolId) continue; // 未被任何工具引用则跳过
    for (const row of table.rows) {
      docs.push({
        id: `ref:${table.id}:${row.id}`,
        type: 'quickref-item',
        title: row.label,
        subtitle: table.title,
        keywords: '',
        body: `${Object.values(row.values).join(' ')}${row.note ? ` ${row.note}` : ''}`,
        toolId,
        anchor: row.id,
        domain: table.domain,
      });
    }
  }

  return docs;
}

// 便于外部按需引用
export { getQuickRef };
export type { ToolDef, SearchDoc, Domain, Priority };
