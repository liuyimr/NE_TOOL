/**
 * 计算器输入字段定义
 */
export interface FieldDef {
  /** 字段键（作为 calc 输入的 key） */
  key: string;
  /** 字段显示名 */
  label: string;
  /** 字段类型 */
  type: 'number' | 'text' | 'select' | 'radio';
  /** 单位 */
  unit?: string;
  /** 选项（select / radio 使用） */
  options?: { label: string; value: string | number }[];
  /** 默认值 */
  default?: string | number;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步进 */
  step?: number;
  /** 占位提示 */
  placeholder?: string;
  /** 帮助文案 */
  help?: string;
}

/**
 * 计算结果项
 */
export interface CalcResult {
  /** 结果键 */
  key: string;
  /** 结果显示名 */
  label: string;
  /** 结果值（已格式化或原始数值） */
  value: string | number;
  /** 单位 */
  unit?: string;
  /** 是否主结果高亮 */
  highlight?: boolean;
  /** 是否可复制 */
  copyable?: boolean;
  /** 补充说明 */
  note?: string;
}

/**
 * 计算器契约：字段定义 + 纯计算函数
 */
export interface Calculator<I = Record<string, unknown>> {
  /** 计算器 id，与工具 id 对应 */
  id: string;
  /** 输入字段 */
  fields: FieldDef[];
  /** 纯函数：输入 → 结果数组（无副作用、无 React 依赖） */
  calc: (input: I) => CalcResult[];
}
