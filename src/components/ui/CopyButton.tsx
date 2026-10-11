import { useState } from 'react';
import { copyText } from '@/lib/clipboard';
import Button from './Button';

export interface CopyButtonProps {
  /** 待复制文本 */
  text: string;
  /** 按钮文案（默认「复制」） */
  label?: string;
  /** 按钮尺寸 */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * 一键复制按钮（自研原子组件）
 * 点击后调用 clipboard.copyText，并给出「已复制」反馈（1.2s 后复原）。
 */
export default function CopyButton({
  text,
  label = '复制',
  size = 'sm',
  className = '',
}: CopyButtonProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <Button
      variant={copied ? 'primary' : 'ghost'}
      size={size}
      className={className}
      onClick={handleCopy}
      aria-label={copied ? '已复制' : label}
    >
      {copied ? '✓ 已复制' : label}
    </Button>
  );
}
