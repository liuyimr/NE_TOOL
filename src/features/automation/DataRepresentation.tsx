import { useSearchParams } from 'react-router-dom';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import RadixConverter from '@/features/network/RadixConverter';
import DatatypeConverter from './DatatypeConverter';
import Ieee754Converter from './Ieee754Converter';
import TimerConverter from './TimerConverter';
import WordOrderPanel from './WordOrderPanel';
import type { ToolDef } from '@/types/tool';

/**
 * P5 数据类型 / 进制换算（宿主）
 * ------------------------------------------------------------------
 * v1.6 第二批合并：原「N2 进制转换器」「P6 IEEE754 浮点转换」「P14 定时器 / 计数器换算」
 * 三页并入本页，各自表单与结果口径保持不变（计算仍由原纯函数模块完成）：
 *   radix    进制与位宽      → RadixConverter
 *   datatype 数据类型 / BCD  → DatatypeConverter（下方折叠「定时器 / 计数器换算」→ TimerConverter）
 *   ieee     IEEE754 / 字序  → Ieee754Converter + 新增 WordOrderPanel（四种字节排列对照）
 * 页签状态与 URL 同步（?tab=radix|datatype|ieee），可直接分享 `#/tool/automation.datatype?tab=ieee`。
 */
const TAB_ITEMS: TabItem[] = [
  { id: 'radix', label: '进制与位宽' },
  { id: 'datatype', label: '数据类型 / BCD' },
  { id: 'ieee', label: 'IEEE754 / 字序' },
];

/** 合法页签 id 列表（用于过滤 URL 上的非法值） */
const TAB_IDS: string[] = TAB_ITEMS.map((item) => item.id);

export default function DataRepresentation({ tool }: { tool: ToolDef }): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get('tab');
  const activeTab = fromUrl && TAB_IDS.includes(fromUrl) ? fromUrl : 'radix';

  /** 切换页签并把 tab 写回 URL（replace，避免污染浏览历史） */
  function changeTab(id: string): void {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs items={TAB_ITEMS} value={activeTab} onChange={changeTab} ariaLabel="数据表示方式" />

      {activeTab === 'radix' && <RadixConverter tool={tool} />}

      {activeTab === 'datatype' && (
        <div className="flex flex-col gap-3">
          <DatatypeConverter tool={tool} />
          <details className="ne-surface px-3 py-2">
            <summary className="min-h-touch cursor-pointer py-2 text-sm font-semibold text-fg ne-focus">
              定时器 / 计数器换算
            </summary>
            <div className="mt-1">
              <TimerConverter tool={tool} />
            </div>
          </details>
        </div>
      )}

      {activeTab === 'ieee' && (
        <div className="flex flex-col gap-4">
          <Ieee754Converter tool={tool} />
          <WordOrderPanel />
        </div>
      )}
    </div>
  );
}
