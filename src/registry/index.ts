import { QUICK_REF_TABLES, getQuickRef } from '@/data/catalog';
import type { Domain, Priority, SearchDoc, ToolDef } from '@/types/tool';
import { networkTools } from './network';
import { buildingTools } from './building';
import { automationTools } from './automation';
import { waterTools } from './water';

/**
 * 工具注册表（配置驱动核心）
 * ------------------------------------------------------------------
 * 汇总四大领域注册项，提供检索与搜索索引构建能力。
 * 「加一个工具 = 加一份配置」：在 registry/<domain>.ts 追加一条 ToolDef 即可，
 * 无需修改路由（/tool/:id 动态匹配）与首页（九宫格由注册表渲染）。
 */

/** 全部工具（按 order 稳定排序） */
export const ALL_TOOLS: ToolDef[] = [
  ...networkTools,
  ...buildingTools,
  ...automationTools,
  ...waterTools,
];

/** 全部工具列表（返回副本，避免外部改动污染注册表） */
export function getAll(): ToolDef[] {
  return [...ALL_TOOLS];
}

/** 按 id 获取工具 */
export function getById(id: string): ToolDef | undefined {
  return ALL_TOOLS.find((tool) => tool.id === id);
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
