/**
 * A9 · MAC 地址工具（纯函数）
 * 格式转换（: / - / .）与单播/组播、本地/全局（U/L 位）判定。
 * 注：OUI 厂商查询需离线库（P2 预留），此处仅做格式与位判定。
 */

export interface MacResult {
  valid: boolean;
  error?: string;
  /** 归一化（大写，冒号分隔） */
  canonical: string;
  /** 冒号分隔 */
  colon: string;
  /** 连字符分隔 */
  hyphen: string;
  /** 点分（Cisco 风格，xxxx.xxxx.xxxx） */
  dotted: string;
  /** 无分隔 */
  bare: string;
  /** OUI（前三字节） */
  oui: string;
  /** 是否组播（首字节最低位为 1） */
  multicast: boolean;
  /** 是否本地管理（首字节次低位为 1） */
  locallyAdministered: boolean;
}

/**
 * 解析并规范化 MAC 地址
 * @param input 任意常见格式的 MAC
 */
export function macInfo(input: string): MacResult {
  const raw = (input ?? '').trim();
  const clean = raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  const fail: MacResult = {
    valid: false,
    canonical: '',
    colon: '',
    hyphen: '',
    dotted: '',
    bare: '',
    oui: '',
    multicast: false,
    locallyAdministered: false,
  };
  if (!/^[0-9A-F]{12}$/.test(clean)) {
    return { ...fail, error: 'MAC 地址需为 12 位十六进制（可含 : - . 分隔）' };
  }

  const pairs: string[] = [];
  for (let i = 0; i < 12; i += 2) pairs.push(clean.slice(i, i + 2));

  const firstByte = parseInt(pairs[0], 16);
  const multicast = (firstByte & 0x01) === 1;
  const locallyAdministered = (firstByte & 0x02) === 2;

  return {
    valid: true,
    canonical: pairs.join(':'),
    colon: pairs.join(':'),
    hyphen: pairs.join('-'),
    dotted: `${pairs.slice(0, 2).join('')}.${pairs.slice(2, 4).join('')}.${pairs.slice(4, 6).join('')}`,
    bare: clean,
    oui: pairs.slice(0, 3).join(':'),
    multicast,
    locallyAdministered,
  };
}
