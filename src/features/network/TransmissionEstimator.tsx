import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { transmissionTime } from '@/lib/calc/transmission';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'size', label: '数据量', type: 'number', default: 1, min: 0 },
  {
    key: 'sizeUnit',
    label: '数据量单位',
    type: 'select',
    default: 'GB',
    options: [
      { label: 'bit', value: 'bit' },
      { label: 'Kb', value: 'Kb' },
      { label: 'Mb', value: 'Mb' },
      { label: 'Gb', value: 'Gb' },
      { label: 'KB', value: 'KB' },
      { label: 'MB', value: 'MB' },
      { label: 'GB', value: 'GB' },
      { label: 'TB', value: 'TB' },
    ],
  },
  { key: 'bandwidth', label: '带宽', type: 'number', default: 100, min: 0 },
  {
    key: 'bandwidthUnit',
    label: '带宽单位',
    type: 'select',
    default: 'Mbps',
    options: [
      { label: 'bps', value: 'bps' },
      { label: 'Kbps', value: 'Kbps' },
      { label: 'Mbps', value: 'Mbps' },
      { label: 'Gbps', value: 'Gbps' },
    ],
  },
  { key: 'overheadPct', label: '协议开销', type: 'number', default: 0, min: 0, max: 100, unit: '%' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = transmissionTime({
    size: num(v, 'size'),
    sizeUnit: str(v, 'sizeUnit', 'GB'),
    bandwidth: num(v, 'bandwidth'),
    bandwidthUnit: str(v, 'bandwidthUnit', 'Mbps'),
    overheadPct: num(v, 'overheadPct', 0),
  });
  return [
    res('actual', '实际传输时间', r.human, '', { highlight: true }),
    res('seconds', '实际（秒）', r.actualSeconds, 's'),
    res('theoretical', '理论（秒）', r.theoreticalSeconds, 's'),
    res('effectiveBps', '有效码率', r.effectiveBps, 'bps'),
    res('totalBits', '数据量', r.totalBits, 'bit'),
  ];
}

/** A5 传输时间估算 */
export default function TransmissionEstimator({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
