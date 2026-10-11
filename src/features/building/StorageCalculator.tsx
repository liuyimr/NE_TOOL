import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { storageCapacity, type VideoCodec } from '@/lib/calc/storage';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'channels', label: '摄像机路数', type: 'number', default: 50, min: 0, unit: '路' },
  { key: 'bitrateMbps', label: '单路码率', type: 'number', default: 4, min: 0, step: 0.5, unit: 'Mbps' },
  { key: 'days', label: '录像天数', type: 'number', default: 30, min: 0, unit: '天' },
  {
    key: 'codec',
    label: '编码格式',
    type: 'select',
    default: 'H265',
    options: [
      { label: 'H.264', value: 'H264' },
      { label: 'H.265（省约 50%）', value: 'H265' },
    ],
  },
  { key: 'h265Factor', label: 'H.265 系数', type: 'number', default: 0.5, step: 0.05, help: 'H.265 相对 H.264 的码率比' },
  { key: 'raidOverhead', label: 'RAID 冗余系数', type: 'number', default: 1, step: 0.05, help: 'RAID5 约 1.25' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = storageCapacity({
    channels: num(v, 'channels'),
    bitrateMbps: num(v, 'bitrateMbps'),
    days: num(v, 'days'),
    codec: str(v, 'codec', 'H265') as VideoCodec,
    h265Factor: num(v, 'h265Factor', 0.5),
    raidOverhead: num(v, 'raidOverhead', 1),
  });
  const plans = r.plans.map((p) =>
    res(`plan-${p.diskTB}`, `${p.diskTB} TB 硬盘`, `${p.diskCount} 块`, '', { copyable: false }),
  );
  return [
    res('totalTB', '所需总容量', r.totalTB, 'TB', { highlight: true }),
    res('totalGB', '所需总容量', Math.ceil(r.totalGB), 'GB'),
    res('perDay', '每日容量', r.perDayGB, 'GB'),
    res('perChannelDay', '单路每日容量', r.perChannelPerDayGB, 'GB'),
    ...plans,
  ];
}

/** B4 视频监控存储容量计算 */
export default function StorageCalculator({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
