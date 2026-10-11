/**
 * A1 · IP 子网计算（纯函数）
 * 位运算统一使用 >>> 0 转为无符号 32 位；主机数用 Math.pow（2^32 内安全）。
 * 参考 PRD 第 4 章：网络地址 = IP AND 掩码；广播 = 网络地址 OR (NOT 掩码)；
 * 可用主机数 = 2^(32−前缀) − 2（/31、/32 按 RFC 3021 特殊处理）。
 */

export interface SubnetInput {
  /** IPv4 地址，如 '192.168.1.10' */
  ip: string;
  /** 掩码：点分十进制（'255.255.255.0'）或前缀长度（'24'） */
  mask: string;
}

export interface SubnetResult {
  valid: boolean;
  error?: string;
  /** 网络地址 */
  network: string;
  /** 广播地址 */
  broadcast: string;
  /** 第一个可用主机 */
  firstHost: string;
  /** 最后一个可用主机 */
  lastHost: string;
  /** 可用主机数 */
  usableHosts: number;
  /** 地址总数 2^(32-前缀) */
  totalAddresses: number;
  /** 点分掩码 */
  mask: string;
  /** 反掩码（wildcard） */
  wildcard: string;
  /** 前缀长度 */
  prefix: number;
  /** IP 类别 */
  ipClass: string;
  /** 是否私有地址 */
  isPrivate: boolean;
  /** IP 二进制表示 */
  ipBinary: string;
  /** 掩码二进制表示 */
  maskBinary: string;
}

/**
 * 解析点分十进制 IPv4 为无符号 32 位整数
 * @param ip 地址字符串
 * @returns 数值；非法返回 null
 */
export function parseIPv4(ip: string): number | null {
  if (typeof ip !== 'string') return null;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

/**
 * 将无符号 32 位整数格式化为点分十进制
 * @param value 32 位整数
 */
export function formatIPv4(value: number): string {
  const v = value >>> 0;
  return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff].join('.');
}

/**
 * 前缀长度 → 点分掩码（数值）
 * @param prefix 0-32
 */
export function maskFromPrefix(prefix: number): number {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xffffffff;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

/**
 * 点分掩码 → 前缀长度
 * @param mask 掩码数值
 * @returns 连续 1 的前缀长度；非法返回 -1
 */
export function prefixFromMask(mask: number): number {
  const m = mask >>> 0;
  const binary = m.toString(2).padStart(32, '0');
  // 掩码必须为「连续 1 + 连续 0」
  const ones = binary.indexOf('0');
  const firstZero = ones === -1 ? 32 : ones;
  if (binary.slice(firstZero).includes('1')) return -1;
  return firstZero;
}

/**
 * 判断是否为私有地址（RFC 1918 + 回环 + 链路本地）
 * @param value 32 位整数
 */
export function isPrivateIPv4(value: number): boolean {
  const v = value >>> 0;
  const a = (v >>> 24) & 0xff;
  const b = (v >>> 16) & 0xff;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 127) return true; // 回环
  if (a === 169 && b === 254) return true; // 链路本地
  return false;
}

/**
 * 判断 IPv4 类别
 * @param value 32 位整数
 */
export function ipClass(value: number): string {
  const a = (value >>> 24) & 0xff;
  if (a === 0) return '保留 (0.x)';
  if (a < 127) return 'A 类 (1-126)';
  if (a === 127) return '回环 (127.x)';
  if (a < 192) return 'B 类 (128-191)';
  if (a < 224) return 'C 类 (192-223)';
  if (a < 240) return 'D 类 组播 (224-239)';
  return 'E 类 保留 (240-255)';
}

/** 数值 → 32 位二进制字符串（按位分组便于阅读） */
function toBinary(value: number): string {
  return (value >>> 0).toString(2).padStart(32, '0');
}

/**
 * 子网计算主函数
 * @param input { ip, mask }
 */
export function subnetCalc(input: SubnetInput): SubnetResult {
  const empty: SubnetResult = {
    valid: false,
    network: '',
    broadcast: '',
    firstHost: '',
    lastHost: '',
    usableHosts: 0,
    totalAddresses: 0,
    mask: '',
    wildcard: '',
    prefix: 0,
    ipClass: '',
    isPrivate: false,
    ipBinary: '',
    maskBinary: '',
  };

  const ipValue = parseIPv4(input.ip ?? '');
  if (ipValue === null) {
    return { ...empty, error: 'IP 地址格式非法' };
  }

  const maskRaw = (input.mask ?? '').trim();
  let maskValue: number;
  let prefix: number;
  if (/^\d{1,2}$/.test(maskRaw)) {
    prefix = Number(maskRaw);
    if (prefix < 0 || prefix > 32) {
      return { ...empty, error: '前缀长度需在 0-32 之间' };
    }
    maskValue = maskFromPrefix(prefix);
  } else {
    const parsedMask = parseIPv4(maskRaw);
    if (parsedMask === null) {
      return { ...empty, error: '掩码格式非法' };
    }
    prefix = prefixFromMask(parsedMask);
    if (prefix < 0) {
      return { ...empty, error: '掩码不是连续的 1 序列' };
    }
    maskValue = parsedMask >>> 0;
  }

  const network = (ipValue & maskValue) >>> 0;
  const wildcard = (~maskValue & 0xffffffff) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);

  let usableHosts: number;
  let firstHost: string;
  let lastHost: string;
  // 可用主机数：
  //  - 常规前缀（/0~/30）：按 PRD 第 4 章公式 2^(32−前缀) − 2（扣网络号与广播号）。
  //  - /31、/32：PRD 字面公式会得到 0 / 负数，不适用；此处按 RFC 3021 特例处理，
  //    保留更正确的行为，切勿改回 −2 公式：
  //      · /32（单主机路由）：仅 1 个可用地址（即该地址本身）。
  //      · /31（点对点链路）：网络号与广播号均作为主机使用，共 2 个可用地址。
  if (prefix === 32) {
    usableHosts = 1;
    firstHost = formatIPv4(network);
    lastHost = formatIPv4(network);
  } else if (prefix === 31) {
    // RFC 3021：点对点链路，两个地址均可用
    usableHosts = 2;
    firstHost = formatIPv4(network);
    lastHost = formatIPv4(broadcast);
  } else {
    usableHosts = totalAddresses - 2;
    firstHost = formatIPv4(network + 1);
    lastHost = formatIPv4(broadcast - 1);
  }

  return {
    valid: true,
    network: formatIPv4(network),
    broadcast: formatIPv4(broadcast),
    firstHost,
    lastHost,
    usableHosts,
    totalAddresses,
    mask: formatIPv4(maskValue),
    wildcard: formatIPv4(wildcard),
    prefix,
    ipClass: ipClass(ipValue),
    isPrivate: isPrivateIPv4(ipValue),
    ipBinary: toBinary(ipValue),
    maskBinary: toBinary(maskValue),
  };
}
