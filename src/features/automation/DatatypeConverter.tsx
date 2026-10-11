import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { DATA_TYPES, datatypeInfo, fromBcd, toBcd, type DataTypeId } from '@/lib/calc/datatype';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'value', label: '数值', type: 'number', default: 255, help: '非负整数用于 BCD 换算' },
  {
    key: 'type',
    label: '数据类型',
    type: 'select',
    default: 'WORD',
    options: DATA_TYPES.map((t) => ({ label: t.label, value: t.id })),
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const value = num(v, 'value');
  const typeId = str(v, 'type', 'WORD') as DataTypeId;
  const info = datatypeInfo(value, typeId);
  const bcd = toBcd(value);
  const bcdValue = fromBcd(value);
  return [
    res('bin', '二进制', info.bin, '', { highlight: true }),
    res('hex', '十六进制', info.hex),
    res('dec', '十进制', info.dec),
    res('bits', '位宽', info.type.bits, 'bit', { copyable: false }),
    res('range', '取值范围', `${info.type.min} ~ ${info.type.max}`, '', { copyable: false }),
    res('inRange', '是否在范围内', info.inRange ? '是' : '否（溢出）', '', { copyable: false }),
    res('bcd', `BCD（${value} → HEX）`, Number.isNaN(bcd) ? '—' : `0x${bcd.toString(16).toUpperCase()}`),
    res('bcdDec', 'BCD 反解（输入按 BCD 解释）', Number.isNaN(bcdValue) ? '—' : bcdValue),
  ];
}

/** C3 数据类型 / 进制换算（INT/DINT/WORD/BCD） */
export default function DatatypeConverter({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
