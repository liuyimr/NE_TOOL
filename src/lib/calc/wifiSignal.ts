/**
 * A12 · WiFi 信号强度换算（纯函数）
 * P(dBm) = 10·log₁₀(P(mW)/1mW)；反算 P(mW) = 10^(dBm/10)。
 */

export interface SignalLevel {
  level: string;
  quality: string;
  use: string;
}

/**
 * mW → dBm
 * @param mw 功率（毫瓦），须 > 0
 */
export function mwToDbm(mw: number): number {
  if (mw <= 0) return Number.NEGATIVE_INFINITY;
  return 10 * Math.log10(mw);
}

/**
 * dBm → mW
 * @param dbm 功率（dBm）
 */
export function dbmToMw(dbm: number): number {
  return 10 ** (dbm / 10);
}

/**
 * 按 RSSI(dBm) 判定信号等级
 * @param dbm 信号强度（dBm）
 */
export function signalLevel(dbm: number): SignalLevel {
  if (dbm >= -30) return { level: '极强', quality: '100%', use: '紧邻 AP' };
  if (dbm >= -50) return { level: '优', quality: '最佳', use: '高清视频 / 低延迟' };
  if (dbm >= -67) return { level: '良', quality: '良好', use: '网页 / 视频流畅' };
  if (dbm >= -70) return { level: '临界', quality: '一般', use: '语音可用，视频偶卡' };
  if (dbm >= -80) return { level: '弱', quality: '较差', use: '掉线 / 丢包增多' };
  if (dbm >= -90) return { level: '极弱', quality: '差', use: '基本无法使用' };
  return { level: '掉线', quality: '不可用', use: '断开连接' };
}

/**
 * 综合换算
 * @param value 数值
 * @param unit 输入单位（'dBm' | 'mW'）
 * @returns { dbm, mw, level, quality, use }
 */
export function wifiSignal(value: number, unit: 'dBm' | 'mW'): {
  dbm: number;
  mw: number;
  level: string;
  quality: string;
  use: string;
} {
  const dbm = unit === 'mW' ? mwToDbm(value) : value;
  const mw = unit === 'mW' ? value : dbmToMw(value);
  const info = signalLevel(dbm);
  return { dbm, mw, ...info };
}
