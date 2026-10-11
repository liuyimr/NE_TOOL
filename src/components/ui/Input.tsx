import type { InputHTMLAttributes } from 'react';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** 受控值（字符串） */
  value: string;
  /** 值变更回调（直接给出字符串） */
  onValueChange: (value: string) => void;
  /** 输入类型 */
  type?: 'text' | 'number';
  /** 单位后缀（仅展示） */
  unit?: string;
}

/**
 * 输入框（自研原子组件）
 * - 触控高度 ≥44px
 * - 数字类型使用 inputMode 提升移动端体验
 */
export default function Input({
  value,
  onValueChange,
  type = 'text',
  unit,
  className = '',
  ...rest
}: InputProps): JSX.Element {
  return (
    <div className="relative flex items-center">
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={[
          'min-h-touch w-full rounded border border-border bg-surface px-3 text-fg',
          'placeholder:text-muted ne-focus',
          unit ? 'pr-12' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {unit && (
        <span className="pointer-events-none absolute right-3 text-sm text-muted">{unit}</span>
      )}
    </div>
  );
}
