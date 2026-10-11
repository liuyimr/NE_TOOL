import type { ComponentType } from 'react';

/**
 * 工具领域：网络 / 建筑智能化（弱电） / 工业自动化 / 水电（强电与给排水）
 */
export type Domain = 'network' | 'building' | 'automation' | 'water';

/** 工具形态：计算器 / 速查 / 换算器 */
export type ToolKind = 'calculator' | 'quickref' | 'converter';

/** 优先级：P0 首发必做 / P1 迭代 / P2 远期 */
export type Priority = 'P0' | 'P1' | 'P2';

/**
 * 工具元信息（ToolDef 的基础字段）
 */
export interface ToolMeta {
  /** 唯一 ID，点号命名：'network.subnet' */
  id: string;
  /** 业务编号：'A1' | 'B4' | 'C1' */
  code: string;
  /** 所属领域 */
  domain: Domain;
  /** 工具形态 */
  kind: ToolKind;
  /** 优先级 */
  priority: Priority;
  /** 中文名：'IP 子网计算器' */
  title: string;
  /** 副标题 / 一句话说明 */
  subtitle?: string;
  /** 中英别名，供搜索：['子网','subnet','cidr','掩码'] */
  keywords: string[];
  /** 分类标签：['网络','IP'] */
  tags: string[];
  /** emoji 或图标名 */
  icon: string;
  /** 排序权重 */
  order: number;
}

/**
 * 工具定义（注册表条目）
 * 说明：`Component` 为可选，T02 阶段统一指向占位组件，T04 起替换为各工具真实懒加载组件；
 * `calcId` 为对 `src/lib/calc/**` 中纯计算函数的映射标识（计算器型工具），
 * `quickRefId` 为对 `src/data/**` 中速查表的映射标识（速查型工具）。
 */
export interface ToolDef<I = unknown, O = unknown> extends ToolMeta {
  /** 懒加载组件 */
  Component?: ComponentType<{ tool: ToolDef<I, O> }>;
  /** URL 回填默认值 */
  defaultInput?: Partial<I>;
  /** 关联速查数据 ID（quickref 型） */
  quickRefId?: string;
  /** 关联的多个速查表 ID（一个工具可挂多张速查表，如 Modbus 功能码 + 异常码） */
  quickRefIds?: string[];
  /** 关联计算模块标识（calculator 型），如 'subnet' | 'analog' */
  calcId?: string;
}

/**
 * 统一搜索文档：工具元信息 + 速查行内容 → 供 Fuse 索引
 */
export interface SearchDoc {
  /** 'tool:network.subnet' | 'ref:network.ports:80' */
  id: string;
  /** 文档类型 */
  type: 'tool' | 'quickref-item';
  /** 标题（工具名 或 速查行主键） */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 合并中英别名 */
  keywords: string;
  /** 速查行内容拼接 */
  body?: string;
  /** 跳转目标工具 id */
  toolId: string;
  /** 定位锚点（速查行 id） */
  anchor?: string;
  /** 领域 */
  domain: Domain;
}
