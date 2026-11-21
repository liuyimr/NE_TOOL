import QuickRefTable from '@/components/QuickRefTable';
import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { wifiSignal } from '@/lib/calc/wifiSignal';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

/**
 * N9 无线信道规划（宿主）
 * ------------------------------------------------------------------
 * v1.6 合并：原 N10「WiFi 信号强度换算」并入本页。
 * 上半：信道与频率速查表（network.wifiChannels）；
 * 下半：RSSI ↔ mW 换算计算器（原 N10 的表单与结果口径保持不变，
 *       计算仍由纯函数 `@/lib/calc/wifiSignal` 完成）。
 */
const fields: FieldDef[] = [
  { key: 'value', label: '数值', type: 'number', default: -65, step: 1 },
  {
    key: 'unit',
    label: '输入单位',
    type: 'select',
    default: 'dBm',
    options: [
      { label: 'dBm', value: 'dBm' },
      { label: 'mW', value: 'mW' },
    ],
  },
];

/** 表单值 → 换算结果（与原 N10 完全一致） */
function run(v: Record<string, string>): CalcResult[] {
  const unit = str(v, 'unit', 'dBm') === 'mW' ? 'mW' : 'dBm';
  const r = wifiSignal(num(v, 'value'), unit);
  return [
    res('dbm', 'RSSI', `${r.dbm.toFixed(2)}`, 'dBm', { highlight: true }),
    res('mw', '功率', r.mw, 'mW'),
    res('level', '信号等级', r.level, '', { copyable: false }),
    res('quality', '信号质量', r.quality, '', { copyable: false }),
    res('use', '典型体验', r.use, '', { copyable: false }),
  ];
}

export default function WifiCombined({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-fg">信道与频率</h2>
        <p className="px-1 text-xs text-muted">
          2.4G（1-13）与 5G 各信道的中心频率、重叠情况与不重叠信道建议（原「无线信道规划速查」）。
        </p>
        <QuickRefTable tableId="network.wifiChannels" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-fg">信号强度换算</h2>
        <p className="px-1 text-xs text-muted">
          RSSI（dBm）与 mW 互转，并给出信号等级、质量与典型体验（原「WiFi 信号强度换算」已并入本页）。
        </p>
        <CalculatorView
          toolId={tool.id}
          fields={fields}
          run={run}
          quickRefIds={['network.wifiSignal']}
        />
      </section>
    </div>
  );
}
