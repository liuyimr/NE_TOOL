import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { iotGateway } from '@/lib/calc/iotGateway';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'nodes', label: '节点（点位）数量', type: 'number', default: 500, min: 0, unit: '个' },
  { key: 'intervalSec', label: '上报周期', type: 'number', default: 60, min: 1, step: 1, unit: 's' },
  { key: 'payloadBytes', label: '单包有效载荷', type: 'number', default: 120, min: 0, unit: 'B' },
  {
    key: 'overheadBytes',
    label: '单包协议开销',
    type: 'number',
    default: 60,
    min: 0,
    unit: 'B',
    help: 'MQTT + TCP/IP 头经验值',
  },
  {
    key: 'gatewayCapacity',
    label: '单网关可带节点数',
    type: 'number',
    default: 500,
    min: 1,
    unit: '点',
  },
  {
    key: 'gatewayKbps',
    label: '单网关上行带宽上限',
    type: 'number',
    default: 1000,
    min: 1,
    unit: 'kbit/s',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = iotGateway({
    nodes: num(v, 'nodes'),
    intervalSec: num(v, 'intervalSec', 60),
    payloadBytes: num(v, 'payloadBytes', 120),
    overheadBytes: num(v, 'overheadBytes', 60),
    gatewayCapacity: num(v, 'gatewayCapacity', 500),
    gatewayKbps: num(v, 'gatewayKbps', 1000),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('gatewayCount', '所需网关台数', r.gatewayCount, '台', { highlight: true }),
    res('byNodes', '按节点数所需', r.byNodes, '台'),
    res('byBandwidth', '按带宽所需', r.byBandwidth, '台'),
    res('packetBytes', '单包线上字节数', r.packetBytes, 'B'),
    res('packetsPerSec', '全网每秒上行包数', r.packetsPerSec, 'pkt/s'),
    res('uplinkKbps', '上行带宽', r.uplinkKbps, 'kbit/s', { highlight: true }),
    res('uplinkBps', '上行比特率', r.uplinkBps, 'bit/s'),
    res('dailyMB', '每日上行流量', r.dailyMB, 'MB/日'),
    res('dailyGB', '每日上行流量', r.dailyGB, 'GB/日'),
    res('dailyBytes', '每日上行字节数', r.dailyBytes, 'B/日'),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** N14 物联网网关点位容量与带宽估算 */
export default function IotGateway({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
