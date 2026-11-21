import { useSearchParams } from 'react-router-dom';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import CoolingBilling from '@/features/building/CoolingBilling';
import FcuBilling from '@/features/building/FcuBilling';
import type { ToolDef } from '@/types/tool';

/**
 * H6 中央空调计费（宿主）
 * ------------------------------------------------------------------
 * v1.6 第二批合并：原「H7 冷量计费计算」并入本页，两种计费口径并列：
 *   time   时间型（按运行时长）→ FcuBilling（档位加权时长 × FCU 台数）
 *   energy 能量型（按冷量）    → CoolingBilling（流量 × 供回水温差 × 时长）
 * 页签与 URL 同步（?mode=time|energy），可直接分享 `#/tool/hvac.billing?mode=energy`。
 */
const TAB_ITEMS: TabItem[] = [
  { id: 'time', label: '时间型（按运行时长）' },
  { id: 'energy', label: '能量型（按冷量）' },
];

/** 合法页签 id 列表（用于过滤 URL 上的非法值） */
const MODE_IDS: string[] = TAB_ITEMS.map((item) => item.id);

export default function BillingCombined({ tool }: { tool: ToolDef }): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get('mode');
  const activeMode = fromUrl && MODE_IDS.includes(fromUrl) ? fromUrl : 'time';

  /** 切换计费口径并把 mode 写回 URL（replace，避免污染浏览历史） */
  function changeMode(id: string): void {
    const next = new URLSearchParams(searchParams);
    next.set('mode', id);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs items={TAB_ITEMS} value={activeMode} onChange={changeMode} ariaLabel="计费方式" />
      {activeMode === 'time' ? <FcuBilling tool={tool} /> : <CoolingBilling tool={tool} />}
    </div>
  );
}
