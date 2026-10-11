import CalculatorView from '@/features/shared/CalculatorView';
import { bool, num, res, str } from '@/features/shared/calcHelpers';
import { floatToHex, hexToFloat, type FloatPrecision } from '@/lib/calc/ieee754';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'value', label: '十进制浮点', type: 'number', default: 3.14, step: 0.0001 },
  { key: 'hex', label: '十六进制字节', type: 'text', default: '', placeholder: '如 3F 80 00 00' },
  {
    key: 'precision',
    label: '精度',
    type: 'select',
    default: 'single',
    options: [
      { label: '单精度（32 位 / 4 字节）', value: 'single' },
      { label: '双精度（64 位 / 8 字节）', value: 'double' },
    ],
  },
  {
    key: 'littleEndian',
    label: '字节序',
    type: 'select',
    default: '0',
    options: [
      { label: '大端（Big-Endian）', value: '0' },
      { label: '小端（Little-Endian）', value: '1' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const precision = str(v, 'precision', 'single') as FloatPrecision;
  const littleEndian = bool(v, 'littleEndian');
  const value = num(v, 'value');
  const hex = str(v, 'hex');
  const encoded = floatToHex(value, precision, littleEndian);
  const results: CalcResult[] = [
    res('hex', '十进制 → HEX', encoded, '', { highlight: true }),
    res('hexBE', '大端 HEX', floatToHex(value, precision, false)),
    res('hexLE', '小端 HEX', floatToHex(value, precision, true)),
  ];
  if (hex.trim() !== '') {
    const decoded = hexToFloat(hex, precision, littleEndian);
    results.push(res('decoded', 'HEX → 十进制', decoded));
  }
  return results;
}

/** C4 IEEE754 浮点转换 */
export default function Ieee754Converter({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
