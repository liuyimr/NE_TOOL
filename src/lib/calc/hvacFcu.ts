/**
 * H15 · FCU / AHU 选型速查（纯函数）
 * 说明：按冷量档位对常见 FCU 进行粗选，给出型号档、台数、单台负荷与水流量。
 * 「以厂家样本为准」——本工具只做方案阶段按冷量匹配，不替代样本选型。
 */

/** 常见 FCU 冷量档（kW，按主流样本归纳，可维护调整） */
export const FCU_CAPACITIES = [2.5, 3.4, 4.5, 5.4, 6.8, 8.0, 10.2];

export interface FcuSelectInput {
  /** 房间/区域冷负荷（kW） */
  loadKw: number;
  /** 指定台数（可选；不给则自动按档位拆分） */
  units?: number;
  /** 供回水温差（℃，默认 5） */
  deltaT?: number;
}

export interface FcuSelectResult {
  valid: boolean;
  /** 匹配到的单台冷量档（kW）；无有效输入时为 null */
  modelKw: number | null;
  /** 台数 */
  count: number;
  /** 单台承担负荷（kW） */
  perUnitKw: number;
  /** 单台水流量（m³/h） */
  unitWaterFlowM3h: number;
  /** 总水流量（m³/h） */
  totalWaterFlowM3h: number;
  /** 说明 */
  note: string;
}

/**
 * FCU / AHU 选型速查
 * @param input 输入参数
 */
export function hvacFcuSelect(input: FcuSelectInput): FcuSelectResult {
  const load = Number.isFinite(input.loadKw) && input.loadKw > 0 ? input.loadKw : 0;
  const deltaT = input.deltaT && input.deltaT > 0 ? input.deltaT : 5;
  const maxCap = FCU_CAPACITIES[FCU_CAPACITIES.length - 1];
  const note = '按冷量档位粗选，以厂家样本为准';

  if (load <= 0) {
    return {
      valid: false,
      modelKw: null,
      count: 0,
      perUnitKw: 0,
      unitWaterFlowM3h: 0,
      totalWaterFlowM3h: 0,
      note,
    };
  }

  const count =
    input.units && input.units > 0 ? Math.floor(input.units) : load <= maxCap ? 1 : Math.ceil(load / maxCap);
  const perUnitKw = load / count;
  const model = FCU_CAPACITIES.find((c) => c >= perUnitKw) ?? maxCap;
  const unitWaterFlowM3h = (0.86 * model) / deltaT;

  return {
    valid: true,
    modelKw: model,
    count,
    perUnitKw,
    unitWaterFlowM3h,
    totalWaterFlowM3h: unitWaterFlowM3h * count,
    note,
  };
}
