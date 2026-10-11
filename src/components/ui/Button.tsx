import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 视觉风格 */
  variant?: ButtonVariant;
  /** 尺寸（md 触控高度 ≥44px） */
  size?: ButtonSize;
  /** 是否占满宽度 */
  block?: boolean;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-90 active:opacity-80',
  secondary: 'bg-surface-2 text-fg border border-border hover:border-accent',
  ghost: 'bg-transparent text-muted hover:text-fg',
  danger: 'bg-danger text-white hover:opacity-90',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'min-h-touch px-4 text-base',
};

/**
 * 通用按钮（自研原子组件）
 * - 触控目标 ≥44px（size=md）
 * - 支持 primary/secondary/ghost/danger 四种风格
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const classes = [
    'inline-flex items-center justify-center gap-1 rounded font-medium ne-focus transition',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    block ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
