/**
 * BA13 · 门禁系统容量与选型（纯函数）
 * ------------------------------------------------------------------
 * 公式：
 *   controllerCount      = ceil(doorCount / doorsPerController)          控制器台数
 *   readerCount          = doorCount × readersPerDoor                    读卡器数量
 *   lockPeakCurrentA     = doorCount × lockCurrentA × lockDutyRatio      电锁峰值电流（A）
 *   lockPeakPowerW       = lockPeakCurrentA × lockVoltageV               电锁峰值功率（W）
 *   controllerTotalPowerW= controllerCount × controllerPowerW            控制器总功耗（W）
 *   totalPowerW          = lockPeakPowerW + controllerTotalPowerW        峰值总功率（W）
 *   psuRequiredW         = totalPowerW × psuMargin                       电源容量（W，含余量）
 *   batteryAh            = (totalPowerW × backupHours) / (lockVoltageV × 0.8)
 *                         后备电池容量（Ah，按 DoD 0.8）
 *
 * 常量与口径：
 *   lockDutyRatio（电锁同时动作率）：电锁为短时工作制（每次开门仅通电数百毫秒到数秒），
 *        电源容量按「同时动作率」折减，工程常取 0.2~0.3；消防联动/集中断电开门时
 *        可能接近 1.0，须单独按最不利工况校核。
 *   0.8：蓄电池允许放电深度（DoD，Depth of Discharge）的工程取值；铅酸电池长期浅放
 *        可延长寿命，实际容量按放电电流—时间曲线（不同倍率下容量下降）与厂家样本修正。
 *   psuMargin（电源余量）：控制器自带电源或集中供电电源的容量余量，常取 1.2~1.5
 *        （本项目默认 1.3），用于覆盖线损、老化与后期扩容。
 *   controllerPowerW：单台门禁控制器（含读卡器供电、通信模块）的方案阶段功耗经验值，
 *        实际以厂家样本为准（4 门控制器常见 8~20 W）。
 *
 * 边界：任一输入非有限、doorCount/readersPerDoor/lockCurrentA/controllerPowerW 为负、
 *       doorsPerController 不属 {1,2,4}、lockVoltageV ≤ 0、lockDutyRatio 不在 [0,1]、
 *       backupHours < 0、psuMargin < 1 → valid=false；结果溢出 → valid=false。
 */

/** 允许的单控制器门数档位 */
export const DOORS_PER_CONTROLLER_OPTIONS: readonly number[] = Object.freeze([1, 2, 4]);
/** 蓄电池放电深度（DoD）工程取值 */
export const BATTERY_DOD = 0.8;

/** 通用免责句（§3）：所有计算模块 note 末尾统一追加 */
const GENERAL_DISCLAIMER =
  '本结果为方案阶段工程估算，含多项经验系数与简化假设（详见各字段说明），不作为施工图设计、设备采购、产品验收或安全校验依据；实际须按现行国家/行业标准、厂家样本与注册工程师复核。';

export interface AccessControlInput {
  /** 门数，默认 20 */
  doorCount: number;
  /** 单控制器门数：1 / 2 / 4，默认 2 */
  doorsPerController: number;
  /** 每门读卡器数（进/出），默认 2 */
  readersPerDoor: number;
  /** 单锁动作电流（A），默认 0.5 */
  lockCurrentA: number;
  /** 电锁工作电压（V），默认 12 */
  lockVoltageV: number;
  /** 电锁同时动作率，默认 0.2 */
  lockDutyRatio: number;
  /** 单控制器功耗（W），默认 10 */
  controllerPowerW: number;
  /** 后备时间（h），默认 4 */
  backupHours: number;
  /** 电源容量余量系数，默认 1.3 */
  psuMargin: number;
}

/** 方案阶段默认参数表（显式导出便于审计，与组件字段默认值一致） */
export const ACCESS_CONTROL_DEFAULTS: Readonly<AccessControlInput> = Object.freeze({
  doorCount: 20,
  doorsPerController: 2,
  readersPerDoor: 2,
  lockCurrentA: 0.5,
  lockVoltageV: 12,
  lockDutyRatio: 0.2,
  controllerPowerW: 10,
  backupHours: 4,
  psuMargin: 1.3,
});

export interface AccessControlResult {
  /** 输入是否有效 */
  valid: boolean;
  /** 中文提示（工作制与电池口径说明） */
  note: string;
  /** 控制器台数（向上取整） */
  controllerCount: number;
  /** 读卡器数量 */
  readerCount: number;
  /** 电锁峰值电流（A） */
  lockPeakCurrentA: number;
  /** 电锁峰值功率（W） */
  lockPeakPowerW: number;
  /** 控制器总功耗（W） */
  controllerTotalPowerW: number;
  /** 峰值总功率（W） */
  totalPowerW: number;
  /** 电源容量（W，含余量） */
  psuRequiredW: number;
  /** 后备电池容量（Ah，DoD 0.8） */
  batteryAh: number;
}

/** 构造无效输入的零值结果，保证所有输出均为有限数 */
function invalidResult(note: string): AccessControlResult {
  return {
    valid: false,
    note,
    controllerCount: 0,
    readerCount: 0,
    lockPeakCurrentA: 0,
    lockPeakPowerW: 0,
    controllerTotalPowerW: 0,
    totalPowerW: 0,
    psuRequiredW: 0,
    batteryAh: 0,
  };
}

/**
 * 门禁系统容量与选型计算
 * @param input 输入参数
 */
export function accessControl(input: AccessControlInput): AccessControlResult {
  const values = [
    input.doorCount,
    input.doorsPerController,
    input.readersPerDoor,
    input.lockCurrentA,
    input.lockVoltageV,
    input.lockDutyRatio,
    input.controllerPowerW,
    input.backupHours,
    input.psuMargin,
  ];
  if (!values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return invalidResult('所有输入必须为有限数值');
  }
  if (!DOORS_PER_CONTROLLER_OPTIONS.includes(input.doorsPerController)) {
    return invalidResult('单控制器门数只能取 1 / 2 / 4');
  }
  if (input.doorCount < 0 || input.readersPerDoor < 0 || input.lockCurrentA < 0) {
    return invalidResult('门数、每门读卡器数与单锁电流须非负');
  }
  if (input.lockVoltageV <= 0) {
    return invalidResult('电锁工作电压须大于 0');
  }
  if (input.lockDutyRatio < 0 || input.lockDutyRatio > 1) {
    return invalidResult('电锁同时动作率须在 0~1 之间');
  }
  if (input.controllerPowerW < 0 || input.backupHours < 0) {
    return invalidResult('控制器功耗与后备时间须非负');
  }
  if (input.psuMargin < 1) {
    return invalidResult('电源余量系数须大于等于 1');
  }

  const controllerCount = Math.ceil(input.doorCount / input.doorsPerController);
  const readerCount = input.doorCount * input.readersPerDoor;
  const lockPeakCurrentA = input.doorCount * input.lockCurrentA * input.lockDutyRatio;
  const lockPeakPowerW = lockPeakCurrentA * input.lockVoltageV;
  const controllerTotalPowerW = controllerCount * input.controllerPowerW;
  const totalPowerW = lockPeakPowerW + controllerTotalPowerW;
  const psuRequiredW = totalPowerW * input.psuMargin;
  const batteryAh = (totalPowerW * input.backupHours) / (input.lockVoltageV * BATTERY_DOD);

  const outputs = [
    controllerCount,
    readerCount,
    lockPeakCurrentA,
    lockPeakPowerW,
    controllerTotalPowerW,
    totalPowerW,
    psuRequiredW,
    batteryAh,
  ];
  if (!outputs.every((x) => Number.isFinite(x))) {
    return invalidResult('输入量级过大导致结果溢出，请缩小门数或单锁电流');
  }

  const notes: string[] = [
    `${input.doorCount} 门按每控制器 ${input.doorsPerController} 门向上取整得 ${controllerCount} 台控制器；每门 ${input.readersPerDoor} 只读卡器共 ${readerCount} 只`,
    `电锁按同时动作率 ${input.lockDutyRatio} 折减，峰值电流 ${lockPeakCurrentA.toFixed(2)} A、峰值功率 ${lockPeakPowerW.toFixed(1)} W；控制器功耗 ${controllerTotalPowerW.toFixed(1)} W，合计 ${totalPowerW.toFixed(1)} W，电源按 ${input.psuMargin} 倍余量取 ${psuRequiredW.toFixed(1)} W`,
    '电锁为短时工作制，同时动作率取 0.2~0.3；蓄电池按 DoD 0.8 估算，须按电池放电曲线与厂家样本校核；消防联动开门要求另计',
  ];
  notes.push(GENERAL_DISCLAIMER);

  return {
    valid: true,
    note: notes.join('；'),
    controllerCount,
    readerCount,
    lockPeakCurrentA,
    lockPeakPowerW,
    controllerTotalPowerW,
    totalPowerW,
    psuRequiredW,
    batteryAh,
  };
}
