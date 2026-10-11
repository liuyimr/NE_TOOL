/**
 * A4 · 带宽 / 流量单位换算（纯函数）
 * 核心：1 Byte = 8 bit；1 MB/s = 8 Mbps（十进制）。
 * 支持十进制（1000）与二进制（1024，仅字节类）两种口径。
 */

export interface BandwidthUnitDef {
  id: string;
  label: string;
  /** 到 bps 的进制因子（十进制口径） */
  factorDec: number;
  /** 到 bps 的进制因子（二进制口径，仅字节类不同） */
  factorBin: number;
}

export const BANDWIDTH_UNITS: BandwidthUnitDef[] = [
  { id: 'bps', label: 'bps', factorDec: 1, factorBin: 1 },
  { id: 'Kbps', label: 'Kbps', factorDec: 1e3, factorBin: 1e3 },
  { id: 'Mbps', label: 'Mbps', factorDec: 1e6, factorBin: 1e6 },
  { id: 'Gbps', label: 'Gbps', factorDec: 1e9, factorBin: 1e9 },
  { id: 'Tbps', label: 'Tbps', factorDec: 1e12, factorBin: 1e12 },
  { id: 'B/s', label: 'B/s', factorDec: 8, factorBin: 8 },
  { id: 'KB/s', label: 'KB/s', factorDec: 8e3, factorBin: 8 * 1024 },
  { id: 'MB/s', label: 'MB/s', factorDec: 8e6, factorBin: 8 * 1024 ** 2 },
  { id: 'GB/s', label: 'GB/s', factorDec: 8e9, factorBin: 8 * 1024 ** 3 },
  { id: 'TB/s', label: 'TB/s', factorDec: 8e12, factorBin: 8 * 1024 ** 4 },
];

const UNIT_MAP = new Map(BANDWIDTH_UNITS.map((u) => [u.id, u]));

/**
 * 换算为 bps（基准单位）
 * @param value 数值
 * @param unitId 单位 id
 * @param binary 是否二进制口径（影响字节类）
 */
export function toBps(value: number, unitId: string, binary = false): number {
  const def = UNIT_MAP.get(unitId);
  if (!def) throw new Error(`未知带宽单位：${unitId}`);
  return value * (binary ? def.factorBin : def.factorDec);
}

/**
 * 从 bps 换算到目标单位
 * @param bps 比特/秒
 * @param unitId 目标单位
 * @param binary 是否二进制口径
 */
export function fromBps(bps: number, unitId: string, binary = false): number {
  const def = UNIT_MAP.get(unitId);
  if (!def) throw new Error(`未知带宽单位：${unitId}`);
  return bps / (binary ? def.factorBin : def.factorDec);
}

/**
 * 带宽 / 流量换算：给定值与单位，换算为该口径下全部单位
 * @param value 数值
 * @param unitId 源单位
 * @param binary 是否二进制口径
 * @returns { 单位id: 换算值 }
 */
export function bandwidthConvert(
  value: number,
  unitId: string,
  binary = false,
): Record<string, number> {
  const bps = toBps(value, unitId, binary);
  const result: Record<string, number> = {};
  for (const unit of BANDWIDTH_UNITS) {
    result[unit.id] = fromBps(bps, unit.id, binary);
  }
  return result;
}
