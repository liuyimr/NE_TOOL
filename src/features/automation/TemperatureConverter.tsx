import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import {
  celsiusToFahrenheit,
  celsiusToKelvin,
  pt100Resistance,
  pt100Temperature,
  thermocoupleToTemp,
  THERMOCOUPLE_SENSITIVITY,
} from '@/lib/calc/temperature';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'resistance', label: 'PT100 电阻值', type: 'number', default: 109.73, unit: 'Ω' },
  { key: 'tempC', label: '已知温度（反算电阻）', type: 'number', default: 25, unit: '℃' },
  { key: 'mv', label: '热电偶热电势', type: 'number', default: 1.025, unit: 'mV' },
  {
    key: 'tcType',
    label: '热电偶分度号',
    type: 'select',
    default: 'K',
    options: Object.keys(THERMOCOUPLE_SENSITIVITY).map((t) => ({ label: `${t} 型`, value: t })),
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const resistance = num(v, 'resistance');
  const tempC = num(v, 'tempC');
  const mv = num(v, 'mv');
  const tcType = str(v, 'tcType', 'K');
  const results: CalcResult[] = [];
  if (resistance > 0) {
    results.push(res('ptTemp', 'PT100 温度', pt100Temperature(resistance), '℃', { highlight: true }));
  }
  results.push(res('ptR', '温度对应 PT100 电阻', pt100Resistance(tempC), 'Ω'));
  results.push(res('tcTemp', `${tcType} 型热电偶温度`, thermocoupleToTemp(mv, tcType), '℃'));
  results.push(res('f', '温度（华氏）', celsiusToFahrenheit(tempC), '℉'));
  results.push(res('k', '温度（开尔文）', celsiusToKelvin(tempC), 'K'));
  return results;
}

/** C2 PT100 / 热电偶温度换算 */
export default function TemperatureConverter({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
