/**
 * 单位换算引擎（类别 / 单位 / 因子注册式）
 * ------------------------------------------------------------------
 * 设计：每个类别选定一个基准单位（base），每个单位记录到基准的线性/仿射变换：
 *   toBase(v)   = v * factor + offset
 *   fromBase(b) = (b - offset) / factor
 * 线性单位 offset=0；温度等仿射单位用 offset。
 * 该引擎被 C5（通用单位换算）直接使用，并可复用于 A4（数据速率）等场景。
 */

export interface Unit {
  /** 单位 id，如 'MPa' */
  id: string;
  /** 显示名，如 '兆帕' */
  label: string;
  /** 到基准单位的比例因子 */
  factor: number;
  /** 到基准单位的偏移（仿射变换，默认 0） */
  offset?: number;
}

export interface UnitCategory {
  /** 类别 id，如 'pressure' */
  id: string;
  /** 类别显示名，如 '压力' */
  label: string;
  /** 基准单位 id */
  base: string;
  /** 该类别下的单位列表 */
  units: Unit[];
}

/** 构建类别（小工具，便于声明式定义） */
function cat(
  id: string,
  label: string,
  base: string,
  units: Unit[],
): UnitCategory {
  return { id, label, base, units };
}

/**
 * 全部单位类别注册表
 * 基准单位：压力 Pa、温度 K、长度 m、面积 m²、体积 L、质量 kg、
 * 力 N、功率 W、能量 J、数据速率 bps、时间 s、速度 m/s、角度 deg、流量 m³/h。
 */
export const CATEGORIES: UnitCategory[] = [
  cat('pressure', '压力', 'Pa', [
    { id: 'Pa', label: '帕 Pa', factor: 1 },
    { id: 'kPa', label: '千帕 kPa', factor: 1e3 },
    { id: 'MPa', label: '兆帕 MPa', factor: 1e6 },
    { id: 'bar', label: '巴 bar', factor: 1e5 },
    { id: 'mbar', label: '毫巴 mbar', factor: 100 },
    { id: 'kgf/cm2', label: '千克力/平方厘米 kgf/cm²', factor: 98066.5 },
    { id: 'psi', label: '磅/平方英寸 psi', factor: 6894.757293168 },
    { id: 'mmHg', label: '毫米汞柱 mmHg', factor: 133.322387415 },
    { id: 'atm', label: '标准大气压 atm', factor: 101325 },
  ]),
  cat('temperature', '温度', 'K', [
    // 以 K 为基准：C: K = v + 273.15；F: K = (v - 32)×5/9 + 273.15
    { id: 'C', label: '摄氏度 ℃', factor: 1, offset: 273.15 },
    { id: 'F', label: '华氏度 ℉', factor: 5 / 9, offset: 273.15 - (32 * 5) / 9 },
    { id: 'K', label: '开尔文 K', factor: 1, offset: 0 },
  ]),
  cat('length', '长度', 'm', [
    { id: 'mm', label: '毫米 mm', factor: 0.001 },
    { id: 'cm', label: '厘米 cm', factor: 0.01 },
    { id: 'm', label: '米 m', factor: 1 },
    { id: 'km', label: '千米 km', factor: 1000 },
    { id: 'in', label: '英寸 in', factor: 0.0254 },
    { id: 'ft', label: '英尺 ft', factor: 0.3048 },
    { id: 'mil', label: '密尔 mil', factor: 0.0000254 },
  ]),
  cat('area', '面积', 'm2', [
    { id: 'mm2', label: '平方毫米 mm²', factor: 1e-6 },
    { id: 'cm2', label: '平方厘米 cm²', factor: 1e-4 },
    { id: 'm2', label: '平方米 m²', factor: 1 },
    { id: 'km2', label: '平方千米 km²', factor: 1e6 },
  ]),
  cat('volume', '体积', 'L', [
    { id: 'mL', label: '毫升 mL', factor: 0.001 },
    { id: 'L', label: '升 L', factor: 1 },
    { id: 'm3', label: '立方米 m³', factor: 1000 },
    { id: 'galUS', label: '美制加仑 gal', factor: 3.785411784 },
    { id: 'ft3', label: '立方英尺 ft³', factor: 28.316846592 },
  ]),
  cat('mass', '质量', 'kg', [
    { id: 'g', label: '克 g', factor: 0.001 },
    { id: 'kg', label: '千克 kg', factor: 1 },
    { id: 't', label: '吨 t', factor: 1000 },
    { id: 'lb', label: '磅 lb', factor: 0.45359237 },
    { id: 'oz', label: '盎司 oz', factor: 0.028349523125 },
  ]),
  cat('force', '力', 'N', [
    { id: 'N', label: '牛顿 N', factor: 1 },
    { id: 'kN', label: '千牛 kN', factor: 1000 },
    { id: 'kgf', label: '千克力 kgf', factor: 9.80665 },
    { id: 'gf', label: '克力 gf', factor: 0.00980665 },
    { id: 'lbf', label: '磅力 lbf', factor: 4.4482216152605 },
  ]),
  cat('power', '功率', 'W', [
    { id: 'W', label: '瓦 W', factor: 1 },
    { id: 'kW', label: '千瓦 kW', factor: 1000 },
    { id: 'MW', label: '兆瓦 MW', factor: 1e6 },
    { id: 'hp', label: '英制马力 hp', factor: 745.6998715823 },
    { id: 'PS', label: '米制马力 PS', factor: 735.49875 },
  ]),
  cat('energy', '能量', 'J', [
    { id: 'J', label: '焦耳 J', factor: 1 },
    { id: 'kJ', label: '千焦 kJ', factor: 1000 },
    { id: 'kWh', label: '千瓦时 kWh', factor: 3.6e6 },
    { id: 'cal', label: '卡 cal', factor: 4.184 },
    { id: 'kcal', label: '千卡 kcal', factor: 4184 },
    { id: 'BTU', label: '英热单位 BTU', factor: 1055.05585262 },
  ]),
  cat('dataRate', '数据速率', 'bps', [
    { id: 'bps', label: '比特/秒 bps', factor: 1 },
    { id: 'Kbps', label: 'Kbps', factor: 1e3 },
    { id: 'Mbps', label: 'Mbps', factor: 1e6 },
    { id: 'Gbps', label: 'Gbps', factor: 1e9 },
    { id: 'Tbps', label: 'Tbps', factor: 1e12 },
  ]),
  cat('time', '时间', 's', [
    { id: 'ms', label: '毫秒 ms', factor: 0.001 },
    { id: 's', label: '秒 s', factor: 1 },
    { id: 'min', label: '分 min', factor: 60 },
    { id: 'h', label: '时 h', factor: 3600 },
    { id: 'd', label: '天 d', factor: 86400 },
  ]),
  cat('speed', '速度', 'm/s', [
    { id: 'm/s', label: '米/秒 m/s', factor: 1 },
    { id: 'km/h', label: '千米/时 km/h', factor: 1 / 3.6 },
    { id: 'mph', label: '英里/时 mph', factor: 0.44704 },
  ]),
  cat('angle', '角度', 'deg', [
    { id: 'deg', label: '度 °', factor: 1 },
    { id: 'rad', label: '弧度 rad', factor: 57.29577951308232 },
  ]),
  cat('flow', '流量', 'm3/h', [
    { id: 'm3/h', label: '立方米/时 m³/h', factor: 1 },
    { id: 'm3/min', label: '立方米/分 m³/min', factor: 60 },
    { id: 'L/min', label: '升/分 L/min', factor: 0.06 },
    { id: 'L/s', label: '升/秒 L/s', factor: 3.6 },
    { id: 'gpmUS', label: '美制加仑/分 gpm', factor: 0.22712470704 },
    { id: 'CFM', label: '立方英尺/分 CFM', factor: 1.69901079552 },
  ]),
];

/** 类别 id → 类别 的映射 */
const CATEGORY_MAP: Map<string, UnitCategory> = new Map(
  CATEGORIES.map((category) => [category.id, category]),
);

/**
 * 获取类别
 * @param catId 类别 id
 */
export function getCategory(catId: string): UnitCategory | undefined {
  return CATEGORY_MAP.get(catId);
}

/**
 * 列出某类别下的所有单位
 * @param catId 类别 id
 */
export function listUnits(catId: string): Unit[] {
  return CATEGORY_MAP.get(catId)?.units ?? [];
}

/**
 * 在类别内查找单位
 * @param catId 类别 id
 * @param unitId 单位 id
 */
export function findUnit(catId: string, unitId: string): Unit | undefined {
  return listUnits(catId).find((unit) => unit.id === unitId);
}

/**
 * 单位换算：v 从 fromId 换算到 toId（同一类别内）
 * @param catId 类别 id
 * @param fromId 源单位 id
 * @param toId 目标单位 id
 * @param value 源数值
 * @returns 目标单位下的数值
 * @throws 当类别或单位不存在时抛出错误
 */
export function convert(catId: string, fromId: string, toId: string, value: number): number {
  const category = CATEGORY_MAP.get(catId);
  if (!category) {
    throw new Error(`未知单位类别：${catId}`);
  }
  const from = findUnit(catId, fromId);
  const to = findUnit(catId, toId);
  if (!from) {
    throw new Error(`类别 ${catId} 中不存在单位：${fromId}`);
  }
  if (!to) {
    throw new Error(`类别 ${catId} 中不存在单位：${toId}`);
  }
  const base = value * from.factor + (from.offset ?? 0);
  return (base - (to.offset ?? 0)) / to.factor;
}

/**
 * 将一个数值换算为类别内全部单位的等价表示
 * @param catId 类别 id
 * @param fromId 源单位 id
 * @param value 源数值（源单位）
 * @returns { 单位id: 换算值 } 映射（含源单位自身）
 */
export function convertAll(
  catId: string,
  fromId: string,
  value: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const unit of listUnits(catId)) {
    result[unit.id] = convert(catId, fromId, unit.id, value);
  }
  return result;
}
