import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { timeBilling } from '@/lib/calc/billing';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'fcuCount', label: 'FCU 数量', type: 'number', default: 1, min: 1, unit: '台' },
  { key: 'hoursHigh', label: '高档运行时长', type: 'number', default: 0, min: 0, step: 0.5, unit: 'h' },
  { key: 'hoursMid', label: '中档运行时长', type: 'number', default: 0, min: 0, step: 0.5, unit: 'h' },
  { key: 'hoursLow', label: '低档运行时长', type: 'number', default: 0, min: 0, step: 0.5, unit: 'h' },
  {
    key: 'unitPrice',
    label: '单价',
    type: 'number',
    default: 1,
    min: 0,
    step: 0.01,
    unit: '元',
    help: '每计费用量单位的单价',
  },
];

/** 固定档位权重：高 1.0 / 中 0.7 / 低 0.4 */
const WEIGHTS = { high: 1.0, mid: 0.7, low: 0.4 } as const;

function run(v: Record<string, string>): CalcResult[] {
  const r = timeBilling({
    fcuCount: num(v, 'fcuCount', 1),
    tiers: [
      { name: '高', hours: num(v, 'hoursHigh'), weight: WEIGHTS.high },
      { name: '中', hours: num(v, 'hoursMid'), weight: WEIGHTS.mid },
      { name: '低', hours: num(v, 'hoursLow'), weight: WEIGHTS.low },
    ],
    unitPriceYuan: num(v, 'unitPrice'),
  });
  return [
    res('cost', '总费用', r.totalYuan, '元', { highlight: true }),
    res('costCents', '总费用（分）', r.totalCents, '分'),
    res('perUnit', '单台计费用量', r.usagePerUnit, 'h'),
    res('totalUsage', '计费用量合计', r.totalUsage, 'h'),
    res('fcuCount', 'FCU 数量', r.fcuCount, '台', { copyable: false }),
  ];
}

/** B8 中央空调时间型计费计算 */
export default function FcuBilling({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView
      toolId={tool.id}
      fields={fields}
      run={run}
      quickRefIds={['building.billingModes']}
    />
  );
}
