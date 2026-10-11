import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { radixConvert, type Radix } from '@/lib/calc/radix';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'value', label: '数值', type: 'text', default: '255', placeholder: '如 255 / FF / 1010' },
  {
    key: 'fromBase',
    label: '源进制',
    type: 'select',
    default: '10',
    options: [
      { label: '二进制 (2)', value: '2' },
      { label: '八进制 (8)', value: '8' },
      { label: '十进制 (10)', value: '10' },
      { label: '十六进制 (16)', value: '16' },
    ],
  },
  {
    key: 'bitWidth',
    label: '位宽',
    type: 'select',
    default: '0',
    help: '>0 时对负数采用二进制补码并按位宽补零',
    options: [
      { label: '自动', value: '0' },
      { label: '8 位', value: '8' },
      { label: '16 位', value: '16' },
      { label: '32 位', value: '32' },
      { label: '64 位', value: '64' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const base = num(v, 'fromBase', 10) as Radix;
  const r = radixConvert(str(v, 'value'), base, num(v, 'bitWidth', 0));
  if (!r.valid) return [res('error', '错误', r.error ?? '数值非法')];
  return [
    res('dec', '十进制', r.dec, '', { highlight: true }),
    res('bin', '二进制', r.bin),
    res('oct', '八进制', r.oct),
    res('hex', '十六进制', r.hex),
    res('bitLength', '位宽（去符号）', r.bitLength, 'bit', { copyable: false }),
  ];
}

/** A3 进制转换器 */
export default function RadixConverter({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
