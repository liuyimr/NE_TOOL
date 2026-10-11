import type { Domain } from './tool';

/**
 * 速查表列定义
 */
export interface ColumnDef {
  /** 列键，对应 QuickRefItem.values 的 key */
  key: string;
  /** 列显示名 */
  label: string;
  /** 对齐方式 */
  align?: 'left' | 'right';
  /** 是否等宽字体 */
  mono?: boolean;
}

/**
 * 速查表行
 */
export interface QuickRefItem {
  /** 行唯一 id */
  id: string;
  /** 主键显示，如 'T568B'、'502' */
  label: string;
  /** 各列取值 */
  values: Record<string, string | number>;
  /** 备注 */
  note?: string;
  /** 彩色单元（如线序色标，可选） */
  cells?: { text: string; color?: string }[];
}

/**
 * 速查表
 */
export interface QuickRefTable {
  /** 表 id：'network.cableColor' */
  id: string;
  /** 表标题 */
  title: string;
  /** 所属领域 */
  domain: Domain;
  /** 列定义 */
  columns: ColumnDef[];
  /** 数据行 */
  rows: QuickRefItem[];
  /** 是否纳入全局搜索 */
  searchable: boolean;
  /** 标准依据 / 数据来源 */
  source?: string;
  /** 更新时间（ISO 日期），便于维护追踪 */
  updatedAt: string;
}
