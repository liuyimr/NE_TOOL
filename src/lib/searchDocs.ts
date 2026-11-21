import { QUICK_REF_TABLES } from '@/data/catalog';
import { ALL_TOOLS } from '@/registry';
import type { SearchDoc } from '@/types/tool';

/**
 * 搜索文档构建（主包瘦身专用模块）
 * ------------------------------------------------------------------
 * v1.6 B3-1：从 `@/registry` 迁出。速查数据（39 张表，约 165 KiB JSON）只在
 * 搜索场景需要，独立成模块后由懒加载的 SearchPage 引入，不再捆绑进主包。
 * 逻辑与原 `registry/index.ts` 中的实现逐行一致，仅改变存放位置。
 */

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
