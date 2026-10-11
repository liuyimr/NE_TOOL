/**
 * B4 · 视频监控存储容量计算（纯函数）
 * 公式（PRD #6）：容量(GB) = 路数 × 码率(Mbps) × 3600 × 24 × 天数 ÷ 8 ÷ 1024
 * H.265 相较 H.264 约节省 50%，可通过编码系数体现。
 */

export type VideoCodec = 'H264' | 'H265';

export interface StorageInput {
  /** 摄像机路数 */
  channels: number;
  /** 单路码率（Mbps） */
  bitrateMbps: number;
  /** 录像天数 */
  days: number;
  /** 编码格式 */
  codec?: VideoCodec;
  /** H.265 相对 H.264 的码率系数（默认 0.5） */
  h265Factor?: number;
  /** 单个硬盘容量（TB，用于配置建议，默认 6） */
  diskTB?: number;
  /** RAID 冗余系数（如 RAID5 约 1.25 的有效放大），默认 1 */
  raidOverhead?: number;
}

export interface DiskPlan {
  /** 硬盘容量（TB） */
  diskTB: number;
  /** 需要的裸盘数量 */
  diskCount: number;
}

export interface StorageResult {
  /** 编码系数 */
  codecFactor: number;
  /** 总容量（GB，含 RAID 冗余） */
  totalGB: number;
  /** 总容量（TB） */
  totalTB: number;
  /** 每日容量（GB） */
  perDayGB: number;
  /** 单路每日容量（GB） */
  perChannelPerDayGB: number;
  /** 硬盘配置建议 */
  plans: DiskPlan[];
}

/**
 * 视频监控存储容量
 * @param input 输入参数
 */
export function storageCapacity(input: StorageInput): StorageResult {
  const channels = Math.max(0, input.channels || 0);
  const bitrate = Math.max(0, input.bitrateMbps || 0);
  const days = Math.max(0, input.days || 0);
  const h265Factor = input.h265Factor ?? 0.5;
  const codecFactor = input.codec === 'H265' ? h265Factor : 1;
  const raidOverhead = input.raidOverhead && input.raidOverhead > 0 ? input.raidOverhead : 1;

  // 每日容量：路数 × 码率(Mbps) × 86400 s ÷ 8 ÷ 1024 → GB
  const perChannelPerDayGB = (bitrate * 86400) / 8 / 1024;
  const perDayGB = channels * perChannelPerDayGB * codecFactor;
  const rawTotalGB = perDayGB * days;
  const totalGB = rawTotalGB * raidOverhead;
  const totalTB = totalGB / 1024;

  const targetDiskTB = input.diskTB && input.diskTB > 0 ? input.diskTB : 6;
  const diskOptions = [4, 6, 8, 10, 16, 18, 20];
  const plans: DiskPlan[] = diskOptions.map((diskTB) => ({
    diskTB,
    diskCount: Math.ceil(totalGB / (diskTB * 1024)),
  }));
  // 若用户指定非标准盘容量，则额外给出该容量的方案
  if (!diskOptions.includes(targetDiskTB)) {
    plans.push({ diskTB: targetDiskTB, diskCount: Math.ceil(totalGB / (targetDiskTB * 1024)) });
  }

  return { codecFactor, totalGB, totalTB, perDayGB, perChannelPerDayGB, plans };
}
