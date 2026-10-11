import Fuse, { type IFuseOptions } from 'fuse.js';
import { buildSearchDocs } from '@/registry';
import type { SearchDoc } from '@/types/tool';

/**
 * 全文检索（Fuse.js）
 * ------------------------------------------------------------------
 * 索引在运行时由注册表 + 速查数据构建（数据驱动，加数据即被搜到）。
 * 覆盖：工具名 + 中英关键词 + 速查行内容。
 */

/** Fuse 检索选项（PRD/ARCH 1.6 建议配置，中文场景宁松勿紧） */
const FUSE_OPTIONS: IFuseOptions<SearchDoc> = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'keywords', weight: 0.3 },
    { name: 'subtitle', weight: 0.1 },
    { name: 'body', weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
  shouldSort: true,
};

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

/**
 * 基于给定文档构建 Fuse 索引
 * @param docs 搜索文档（默认由注册表构建）
 */
export function buildIndex(docs: SearchDoc[] = buildSearchDocs()): Fuse<SearchDoc> {
  return new Fuse(docs, FUSE_OPTIONS);
}

/** 单例索引（惰性构建，避免重复计算） */
let singleton: Fuse<SearchDoc> | undefined;

/**
 * 获取（或惰性构建）全局索引
 */
export function getSearchIndex(): Fuse<SearchDoc> {
  if (!singleton) singleton = buildIndex();
  return singleton;
}

/**
 * 执行搜索
 * @param query 查询关键词
 * @param limit 最大返回条数（默认 30）
 * @param index 可选自定义索引
 */
export function search(query: string, limit = 30, index?: Fuse<SearchDoc>): SearchHit[] {
  const q = (query ?? '').trim();
  if (!q) return [];
  const fuse = index ?? getSearchIndex();
  return fuse
    .search(q, { limit })
    .map((result) => ({ doc: result.item, score: result.score ?? 0 }));
}

/**
 * 仅搜索工具（过滤掉速查行），用于「只找工具」场景
 * @param query 查询
 * @param limit 最大条数
 */
export function searchTools(query: string, limit = 30): SearchHit[] {
  return search(query, limit * 2)
    .filter((hit) => hit.doc.type === 'tool')
    .slice(0, limit);
}

/** 重置单例索引（数据变更或测试使用） */
export function resetSearchIndex(): void {
  singleton = undefined;
}
