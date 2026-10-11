/**
 * S1 · 计算负荷（需要系数法）（纯函数）
 * 公式（PRD #1）：Pc = Kd·Pe；Qc = Pc·tanφ；Sc = √(Pc²+Qc²)；Ic = Sc/(√3·Un)
 * 说明：设备清单逐条累加，tanφ 由功率因数 cosφ 换算（tanφ = √(1−cos²φ)/cosφ）。
 */

export interface LoadDevice {
  /** 单台功率（kW） */
  powerKw: number;
  /** 需要系数 Kd（0~1） */
  kd: number;
  /** 功率因数 cosφ（0~1] */
  pf: number;
  /** 台数（默认 1） */
  count?: number;
}

export interface LoadInput {
  /** 设备清单 */
  devices: LoadDevice[];
  /** 系统电压（V），默认 380 */
  voltage?: number;
  /** 同时系数（默认 1） */
  simultaneousFactor?: number;
}

export interface LoadResult {
  /** 设备总装机容量 Pe（kW） */
  installedKw: number;
  /** 计算有功功率 Pc（kW） */
  activeKw: number;
  /** 计算无功功率 Qc（kvar） */
  reactiveKvar: number;
  /** 计算视在功率 Sc（kVA） */
  apparentKva: number;
  /** 计算电流 Ic（A） */
  currentA: number;
  /** 综合功率因数 */
  avgPf: number;
}

/** 由 cosφ 求 tanφ（cosφ 越界时按 0.85 兜底） */
function tanFromPt(pf: number): number {
  const p = pf > 0 && pf <= 1 ? pf : 0.85;
  return Math.sqrt(1 - p * p) / p;
}

/**
 * 解析「设备清单」文本，每行一台设备，格式：功率kW, Kd, cosφ [, 台数]
 * 分隔符支持英文/中文逗号、空格、制表符；空行与非法行忽略。
 * @param text 多行文本
 */
export function parseDeviceList(text: string): LoadDevice[] {
  const devices: LoadDevice[] = [];
  for (const rawLine of (text ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;
    const parts = line.split(/[\s,，、]+/).filter((s) => s !== '');
    if (parts.length < 3) continue;
    const powerKw = Number(parts[0]);
    const kd = Number(parts[1]);
    const pf = Number(parts[2]);
    const count = parts.length >= 4 ? Number(parts[3]) : 1;
    if (!Number.isFinite(powerKw) || !Number.isFinite(kd) || !Number.isFinite(pf)) continue;
    devices.push({ powerKw, kd, pf, count: Number.isFinite(count) ? count : 1 });
  }
  return devices;
}

/**
 * 计算负荷（需要系数法）
 * @param input 输入参数
 */
export function calcLoad(input: LoadInput): LoadResult {
  const voltage = input.voltage && input.voltage > 0 ? input.voltage : 380;
  const sim = input.simultaneousFactor && input.simultaneousFactor > 0 ? input.simultaneousFactor : 1;

  let installedKw = 0;
  let activeKw = 0;
  let reactiveKvar = 0;
  for (const device of input.devices ?? []) {
    const n = device.count && device.count > 0 ? device.count : 1;
    const p = Math.max(0, device.powerKw || 0);
    const kd = device.kd >= 0 ? device.kd : 1;
    installedKw += p * n;
    const pci = p * n * kd;
    activeKw += pci;
    reactiveKvar += pci * tanFromPt(device.pf);
  }
  activeKw *= sim;
  reactiveKvar *= sim;

  const apparentKva = Math.sqrt(activeKw * activeKw + reactiveKvar * reactiveKvar);
  const currentA = (apparentKva * 1000) / (Math.sqrt(3) * voltage);
  const avgPf = apparentKva > 0 ? activeKw / apparentKva : 0;

  return { installedKw, activeKw, reactiveKvar, apparentKva, currentA, avgPf };
}
