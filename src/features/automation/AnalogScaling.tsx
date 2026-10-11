import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { ANALOG_PRESETS, analogConvert } from '@/lib/calc/analog';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'preset',
    label: 'PLC 量程预设',
    type: 'select',
    default: 'custom',
    help: '选择预设后自动采用其原始量程',
    options: [
      { label: '自定义', value: 'custom' },
      ...ANALOG_PRESETS.map((p, i) => ({ label: p.name, value: String(i) })),
    ],
  },
  { key: 'raw', label: '原始值', type: 'number', default: 13824 },
  { key: 'rawMin', label: '原始下限', type: 'number', default: 0, help: '预设选择后此项被覆盖' },
  { key: 'rawMax', label: '原始上限', type: 'number', default: 27648 },
  { key: 'engMin', label: '工程量下限', type: 'number', default: 0 },
  { key: 'engMax', label: '工程量上限', type: 'number', default: 100 },
];

function run(v: Record<string, string>): CalcResult[] {
  const preset = str(v, 'preset', 'custom');
  let rawMin = num(v, 'rawMin');
  let rawMax = num(v, 'rawMax');
  if (preset !== 'custom') {
    const p = ANALOG_PRESETS[Number(preset)];
    if (p) {
      rawMin = p.rawMin;
      rawMax = p.rawMax;
    }
  }
  const r = analogConvert({
    raw: num(v, 'raw'),
    rawMin,
    rawMax,
    engMin: num(v, 'engMin'),
    engMax: num(v, 'engMax'),
  });
  return [
    res('eng', '工程量', r.engineering, '', { highlight: true }),
    res('rawFromEng', '反算原始值', r.rawFromEng),
    res('slope', '线性斜率 k', r.slope),
    res('intercept', '线性截距 b', r.intercept),
    res('span', '原始量程', `${rawMin} ~ ${rawMax}`, '', { copyable: false }),
  ];
}

/** C1 模拟量换算（4-20mA / 0-10V ↔ 工程量） */
export default function AnalogScaling({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
