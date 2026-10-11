import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { coolingBilling } from '@/lib/calc/cooling';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'flow', label: '水体积流量', type: 'number', default: 10, min: 0, unit: 'm³/h' },
  { key: 'returnTemp', label: '回水温度', type: 'number', default: 12, unit: '℃' },
  { key: 'supplyTemp', label: '供水温度', type: 'number', default: 7, unit: '℃' },
  { key: 'hours', label: '运行小时数', type: 'number', default: 8, min: 0, unit: 'h' },
  { key: 'price', label: '冷量单价', type: 'number', default: 0.6, min: 0, step: 0.01, unit: '元/kWh' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = coolingBilling({
    flowM3h: num(v, 'flow'),
    returnTemp: num(v, 'returnTemp'),
    supplyTemp: num(v, 'supplyTemp'),
    hours: num(v, 'hours'),
    pricePerKWh: num(v, 'price'),
  });
  return [
    res('energy', '累计冷量', r.energyKWh, 'kWh', { highlight: true }),
    res('power', '瞬时冷功率', r.powerKW, 'kW'),
    res('deltaT', '供回水温差', r.deltaT, 'K'),
    res('cost', '冷量费用', r.costYuan ?? 0, '元'),
  ];
}

/** B9 冷量计费计算 */
export default function CoolingBilling({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
