/**
 * C5 · 常用工程单位换算（压力/温度/流量/长度/力…）（纯函数）
 * 直接封装通用单位引擎（lib/engine/unitEngine），供 C5 页面与 A4 等复用。
 */
import { CATEGORIES, convert, convertAll, getCategory, listUnits } from '@/lib/engine/unitEngine';

export type { Unit, UnitCategory } from '@/lib/engine/unitEngine';
export { CATEGORIES, getCategory, listUnits, convert, convertAll };

/**
 * 类别内一次换算
 * @param catId 类别 id
 * @param fromId 源单位
 * @param toId 目标单位
 * @param value 数值
 */
export function convertUnit(
  catId: string,
  fromId: string,
  toId: string,
  value: number,
): number {
  return convert(catId, fromId, toId, value);
}

/**
 * 类别内换算为全部单位
 * @param catId 类别 id
 * @param fromId 源单位
 * @param value 数值
 */
export function convertUnitAll(
  catId: string,
  fromId: string,
  value: number,
): Record<string, number> {
  return convertAll(catId, fromId, value);
}

/**
 * 便捷：温度换算（以 ℃ 为输入）
 * @param celsius 摄氏度
 */
export function temperatureFromCelsius(celsius: number): { fahrenheit: number; kelvin: number } {
  return {
    fahrenheit: convert('temperature', 'C', 'F', celsius),
    kelvin: convert('temperature', 'C', 'K', celsius),
  };
}
