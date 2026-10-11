/**
 * D3 电压降计算 —— 复用 C10（`features/automation/CableDropCalculator`）。
 * 需求明确：水电类目下的电压降不重复实现，直接指向同一工具（同一份代码、同一套算法），
 * 既包含按电流的精确式，也包含「按功率」的简化系数法。
 */
export { default } from '@/features/automation/CableDropCalculator';
