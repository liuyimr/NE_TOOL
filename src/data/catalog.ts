import type { QuickRefTable } from '@/types/quickref';

// —— 网络 domain
import cableColor from './network/cableColor.json';
import rj45 from './network/rj45.json';
import ports from './network/ports.json';
import wifiChannels from './network/wifiChannels.json';
import cableSpec from './network/cableSpec.json';
import wifiSignal from './network/wifiSignal.json';
import troubleshoot from './network/troubleshoot.json';
// —— 建筑智能化 domain
import billingModes from './building/billingModes.json';
import illuminance from './building/illuminance.json';
import fillRate from './building/fillRate.json';
import pointTypes from './building/pointTypes.json';
import ddcTemplate from './building/ddcTemplate.json';
import deviceParams from './building/deviceParams.json';
import symbols from './building/symbols.json';
// —— 工业自动化 domain
import modbus from './automation/modbus.json';
import modbusExceptions from './automation/modbusExceptions.json';
import sensors from './automation/sensors.json';
import vfdParams from './automation/vfdParams.json';
import plcErrors from './automation/plcErrors.json';
import pidParams from './automation/pidParams.json';
import cableAmpacity from './automation/cableAmpacity.json';
import unitFactors from './automation/unitFactors.json';
import servo from './automation/servo.json';
import opcua from './automation/opcua.json';

/**
 * 速查数据目录
 * ------------------------------------------------------------------
 * 所有速查表在此集中登记（数据驱动的唯一汇聚点）。
 * JSON 仅承载数据，结构遵循 QuickRefTable；因 JSON 导入为宽泛类型，此处统一断言为 QuickRefTable。
 * 新增速查表：写 src/data/<domain>/xxx.json → 在此 import 并加入 QUICK_REF_TABLES。
 */
const rawTables: QuickRefTable[] = [
  cableColor,
  rj45,
  ports,
  wifiChannels,
  cableSpec,
  wifiSignal,
  troubleshoot,
  billingModes,
  illuminance,
  fillRate,
  pointTypes,
  ddcTemplate,
  deviceParams,
  symbols,
  modbus,
  modbusExceptions,
  sensors,
  vfdParams,
  plcErrors,
  pidParams,
  cableAmpacity,
  unitFactors,
  servo,
  opcua,
] as unknown as QuickRefTable[];

/** 全部速查表（按 id 建立索引以避免重复） */
export const QUICK_REF_TABLES: QuickRefTable[] = rawTables;

/** id → 速查表 的映射 */
const TABLE_MAP: Map<string, QuickRefTable> = new Map(
  QUICK_REF_TABLES.map((table) => [table.id, table]),
);

/**
 * 按 id 获取速查表
 * @param id 速查表 id，如 'network.cableColor'
 * @returns 命中的速查表；未找到返回 undefined
 */
export function getQuickRef(id: string): QuickRefTable | undefined {
  return TABLE_MAP.get(id);
}

/**
 * 按领域获取速查表列表
 * @param domain 领域
 */
export function quickRefsByDomain(domain: QuickRefTable['domain']): QuickRefTable[] {
  return QUICK_REF_TABLES.filter((table) => table.domain === domain);
}
