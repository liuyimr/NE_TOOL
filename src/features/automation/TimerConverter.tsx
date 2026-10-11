import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { humanizeMillis, TIMER_BASES, timerConvert, timerMillis, type TimeUnit } from '@/lib/calc/timer';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'base',
    label: '时基',
    type: 'select',
    default: '1000',
    options: TIMER_BASES.map((b) => ({ label: b.label, value: String(b.baseMs) })),
  },
  { key: 'value', label: '设定值', type: 'number', default: 60, min: 0 },
  { key: 'convValue', label: '待换算数值', type: 'number', default: 2, min: 0 },
  {
    key: 'convUnit',
    label: '换算单位',
    type: 'select',
    default: 'min',
    options: [
      { label: '毫秒 ms', value: 'ms' },
      { label: '秒 s', value: 's' },
      { label: '分 min', value: 'min' },
      { label: '时 h', value: 'h' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const baseMs = num(v, 'base', 1000);
  const ms = timerMillis(baseMs, num(v, 'value'));
  const conv = timerConvert(num(v, 'convValue'), str(v, 'convUnit', 'min') as TimeUnit);
  return [
    res('actual', '时基 × 设定值', ms, 'ms', { highlight: true }),
    res('actualHuman', '实际时间', humanizeMillis(ms), '', { copyable: false }),
    res('ms', '换算（毫秒）', conv.ms, 'ms'),
    res('s', '换算（秒）', conv.s, 's'),
    res('min', '换算（分）', conv.min, 'min'),
    res('h', '换算（时）', conv.h, 'h'),
  ];
}

/** C14 定时器 / 计数器换算 */
export default function TimerConverter({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
