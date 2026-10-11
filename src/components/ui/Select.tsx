export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  /** 受控值 */
  value: string;
  /** 值变更回调 */
  onValueChange: (value: string) => void;
  /** 选项 */
  options: SelectOption[];
  /** 无障碍标签 */
  ariaLabel?: string;
  className?: string;
}

/**
 * 下拉选择（自研原子组件）—— 原生 select，移动端体验最佳，触控 ≥44px
 */
export default function Select({
  value,
  onValueChange,
  options,
  ariaLabel,
  className = '',
}: SelectProps): JSX.Element {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={[
        'min-h-touch w-full rounded border border-border bg-surface px-2 text-fg ne-focus',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
