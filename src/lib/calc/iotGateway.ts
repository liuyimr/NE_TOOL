/**
 * N14 · 物联网网关点位容量与带宽估算（纯函数）
 * ------------------------------------------------------------------
 * 公式：
 *   packetBytes   = payloadBytes + overheadBytes               单包线上字节数（B）
 *   packetsPerSec = nodes / intervalSec                        全网每秒上行包数
 *   uplinkBps     = packetsPerSec × packetBytes × 8            上行比特率（bit/s）
 *   uplinkKbps    = uplinkBps / 1000                           上行带宽（kbit/s，十进制）
 *   dailyBytes    = uplinkBps / 8 × 86400                      每日上行字节数（B）
 *   dailyMB       = dailyBytes / 1e6                           每日流量（十进制 MB）
 *   dailyGB       = dailyBytes / 1e9                           每日流量（十进制 GB）
 *   byNodes       = ceil(nodes / gatewayCapacity)              按节点数所需网关数
 *   byBandwidth   = ceil(uplinkKbps / gatewayKbps)             按带宽所需网关数
 *   gatewayCount  = max(byNodes, byBandwidth)，nodes = 0 时为 0
 *
 * 经验常量口径：
 *   overheadBytes（默认 60 B）：MQTT 固定头/可变头 + TCP 20 B + IPv4 20 B +
 *                              链路层开销的方案阶段取整经验值；不含 TLS、重传、
 *                              心跳与以太网前导码，故估算偏低，属保守下限。
 *   payloadBytes（默认 120 B）：常见温湿度/电参量传感器单周期有效载荷示例值。
 *   intervalSec（默认 60 s）：常见低频监测上报周期。
 *   gatewayCapacity（默认 500 点）：工业网关常见「可管理节点数」标称中值，
 *                                  实际受轮询并发、协议与内存限制，须按样本取值。
 *   gatewayKbps（默认 1000 kbit/s）：单网关上行链路可用带宽示例值（1 Mbps）。
 *   86400 = 24×3600 s/日。
 *
 * 单位口径（重要）：dailyMB / dailyGB 采用十进制 SI 口径，即 1 MB = 10⁶ B、
 * 1 GB = 10⁹ B，与运营商流量计费口径一致；不是 1024 进制的 MiB/GiB。
 *
 * 边界：任一输入非有限或为负 → valid=false；intervalSec / gatewayCapacity /
 * gatewayKbps ≤ 0 → valid=false（避免除零）；结果溢出返回 valid=false。
 */

/** 每字节比特数 */
export const BITS_PER_BYTE = 8;
/** 每日秒数（24 h × 3600 s） */
export const SECONDS_PER_DAY = 86400;
/** 十进制 MB 口径（1 MB = 10⁶ B） */
export const BYTES_PER_MB = 1e6;
/** 十进制 GB 口径（1 GB = 10⁹ B） */
export const BYTES_PER_GB = 1e9;

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

export interface IotGatewayInput {
  /** 节点（点位）数量，默认 500 */
  nodes: number;
  /** 上报周期（s），默认 60 */
  intervalSec: number;
  /** 单包有效载荷字节数，默认 120 */
  payloadBytes: number;
  /** 单包协议开销字节数，默认 60 */
  overheadBytes: number;
  /** 单网关可带节点数，默认 500 */
  gatewayCapacity: number;
  /** 单网关上行带宽上限（kbit/s），默认 1000 */
  gatewayKbps: number;
}

/**
 * 方案阶段默认经验参数表（显式导出便于审计，与组件字段默认值一致）
 * 其中 overheadBytes=60 B 为 MQTT+TCP/IP 头经验值、gatewayCapacity=500 点、
 * gatewayKbps=1000 kbit/s 均为常见产品标称中值，须按实际样本覆盖。
 */
export const IOT_GATEWAY_DEFAULTS: Readonly<IotGatewayInput> = Object.freeze({
  nodes: 500,
  intervalSec: 60,
  payloadBytes: 120,
  overheadBytes: 60,
  gatewayCapacity: 500,
  gatewayKbps: 1000,
});

export interface IotGatewayResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（口径与控制因素说明） */
  note: string;
  /** 单包字节数（B） */
  packetBytes: number;
  /** 全网每秒包数（pkt/s） */
  packetsPerSec: number;
  /** 上行比特率（bit/s） */
  uplinkBps: number;
  /** 上行带宽（kbit/s） */
  uplinkKbps: number;
  /** 每日上行字节数（B） */
  dailyBytes: number;
  /** 每日上行流量（十进制 MB） */
  dailyMB: number;
  /** 每日上行流量（十进制 GB） */
  dailyGB: number;
  /** 按节点数所需网关台数 */
  byNodes: number;
  /** 按带宽所需网关台数 */
  byBandwidth: number;
  /** 最终所需网关台数 */
  gatewayCount: number;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数 */
function invalidResult(note: string): IotGatewayResult {
  return {
    valid: false,
    note,
    packetBytes: 0,
    packetsPerSec: 0,
    uplinkBps: 0,
    uplinkKbps: 0,
    dailyBytes: 0,
    dailyMB: 0,
    dailyGB: 0,
    byNodes: 0,
    byBandwidth: 0,
    gatewayCount: 0,
  };
}

/**
 * 物联网网关点位容量与带宽估算
 * @param input 输入参数
 */
export function iotGateway(input: IotGatewayInput): IotGatewayResult {
  const values = [
    input.nodes,
    input.intervalSec,
    input.payloadBytes,
    input.overheadBytes,
    input.gatewayCapacity,
    input.gatewayKbps,
  ];
  if (!values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return invalidResult('所有输入必须为有限数值');
  }
  if (
    input.nodes < 0 ||
    input.payloadBytes < 0 ||
    input.overheadBytes < 0 ||
    input.intervalSec <= 0 ||
    input.gatewayCapacity <= 0 ||
    input.gatewayKbps <= 0
  ) {
    return invalidResult('上报周期、单网关节点容量与上行带宽须大于 0，节点数与字节数须非负');
  }

  const packetBytes = input.payloadBytes + input.overheadBytes;
  const packetsPerSec = input.nodes / input.intervalSec;
  const uplinkBps = packetsPerSec * packetBytes * BITS_PER_BYTE;
  const uplinkKbps = uplinkBps / 1000;
  const dailyBytes = (uplinkBps / BITS_PER_BYTE) * SECONDS_PER_DAY;
  const dailyMB = dailyBytes / BYTES_PER_MB;
  const dailyGB = dailyBytes / BYTES_PER_GB;
  const byNodes = Math.ceil(input.nodes / input.gatewayCapacity);
  const byBandwidth = Math.ceil(uplinkKbps / input.gatewayKbps);
  const gatewayCount = input.nodes === 0 ? 0 : Math.max(byNodes, byBandwidth);

  const outputs = [
    packetBytes,
    packetsPerSec,
    uplinkBps,
    uplinkKbps,
    dailyBytes,
    dailyMB,
    dailyGB,
    byNodes,
    byBandwidth,
    gatewayCount,
  ];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请缩小节点数或单包长度');
  }

  const notes: string[] = [
    `单包 ${packetBytes} B（有效载荷 ${input.payloadBytes} B + 协议开销 ${input.overheadBytes} B）；按节点数需 ${byNodes} 台、按上行带宽需 ${byBandwidth} 台，取较大者 ${gatewayCount} 台`,
    '每日流量按十进制 SI 口径（1 MB = 10⁶ B，1 GB = 10⁹ B）；不含 TLS、心跳、重传与链路层前导码，结果为方案阶段下限估算',
  ];
  if (byBandwidth > byNodes) {
    notes.push('带宽是网关数量的控制因素，缩短上报周期时须同步核算上行链路');
  }
  notes.push('按平均速率估算，未计上报突发（常见峰值 3~10×）、重传与下行 ACK；链路与网关台数须按峰值复核');
  notes.push(GENERAL_DISCLAIMER);

  return {
    valid: true,
    note: notes.join('；'),
    packetBytes,
    packetsPerSec,
    uplinkBps,
    uplinkKbps,
    dailyBytes,
    dailyMB,
    dailyGB,
    byNodes,
    byBandwidth,
    gatewayCount,
  };
}
