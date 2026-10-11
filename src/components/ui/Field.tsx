import type { ReactNode } from 'react';

export interface FieldProps {
  /** 字段名 */
  label: ReactNode;
  /** 控件 */
  children: ReactNode;
  /** 帮助文案 */
  help?: string;
  /** 错误提示 */
  error?: string;
  /** 是否必填（展示 *） */
  required?: boolean;
  className?: string;
}

/**
 * 表单字段包装（自研原子组件）：label + help + error
 */
export default function Field({
  label,
  children,
  help,
  error,
  required = false,
  className = '',
}: FieldProps): JSX.Element {
  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      <label className="text-sm font-medium text-muted">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {help && !error && <p className="text-xs text-muted">{help}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
