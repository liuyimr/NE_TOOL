/**
 * A2 · IP 地址转换与校验（纯函数）
 * 输入单个 IPv4，输出十进制/二进制/十六进制三种表示、合法性、公/私网判定。
 */
import { formatIPv4, ipClass, isPrivateIPv4, parseIPv4 } from './subnet';

export interface IpInfo {
  valid: boolean;
  error?: string;
  /** 点分十进制 */
  dotted: string;
  /** 十进制整数 */
  decimal: string;
  /** 二进制（点分分组） */
  binary: string;
  /** 十六进制（大写，点分分组可选） */
  hex: string;
  /** 类别 */
  ipClass: string;
  /** 是否私有 */
  isPrivate: boolean;
}

/** 数值 → 每 8 位用分隔的二进制字符串 */
function binaryDotted(value: number): string {
  const v = value >>> 0;
  return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]
    .map((b) => b.toString(2).padStart(8, '0'))
    .join('.');
}

/**
 * 解析并转换单个 IPv4
 * @param ip 地址字符串
 */
export function ipInfo(ip: string): IpInfo {
  const fail: IpInfo = {
    valid: false,
    dotted: '',
    decimal: '0',
    binary: '',
    hex: '',
    ipClass: '',
    isPrivate: false,
  };
  const value = parseIPv4(ip ?? '');
  if (value === null) {
    return { ...fail, error: 'IP 地址格式非法' };
  }
  return {
    valid: true,
    dotted: formatIPv4(value),
    decimal: String(value),
    binary: binaryDotted(value),
    hex: `0x${value.toString(16).toUpperCase().padStart(8, '0')}`,
    ipClass: ipClass(value),
    isPrivate: isPrivateIPv4(value),
  };
}

/** 十进制整数 → IPv4 点分（对外暴露便捷方法） */
export function decimalToIp(decimal: number | string): string {
  const n = typeof decimal === 'string' ? Number(decimal) : decimal;
  if (!Number.isFinite(n) || n < 0 || n > 0xffffffff) return '';
  return formatIPv4(Math.floor(n) >>> 0);
}
