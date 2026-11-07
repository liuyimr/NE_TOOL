import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { reactivePower } from '@/lib/calc/reactivePower';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'activeKw', label: '有功功率 P', type: 'number', default: 200, min: 0, unit: 'kW' },
  {
    key: 'cosPhi1',
    label: '当前功率因数 cosφ1',
    type: 'number',
    default: 0.75,
    min: 0.01,
    max: 1,
    step: 0.01,
  },
  {
    key: 'cosPhi2',
    label: '目标功率因数 cosφ2',
    type: 'number',
    default: 0.95,
    min: 0.01,
    max: 1,
    step: 0.01,
  },
  { key: 'voltageV', label: '线电压 U', type: 'number', default: 380, min: 0, unit: 'V' },
  { key: 'stepKvar', label: '单步电容器容量', type: 'number', default: 25, min: 0.1, unit: 'kvar' },
  {
    key: 'transformerKva',
    label: '变压器容量',
    type: 'number',
    default: 0,
    min: 0,
    unit: 'kVA',
    help: '填 0 表示不计算负载率',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = reactivePower({
    activeKw: num(v, 'activeKw'),
    cosPhi1: num(v, 'cosPhi1', 0.75),
    cosPhi2: num(v, 'cosPhi2', 0.95),
    voltageV: num(v, 'voltageV', 380),
    stepKvar: num(v, 'stepKvar', 25),
    transformerKva: num(v, 'transformerKva', 0),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('qcKvar', '所需补偿容量 Qc', r.qcKvar, 'kvar', { highlight: true }),
    res('circuits', '投切路数', r.circuits, '路'),
    res('installedKvar', '实装电容器容量', r.installedKvar, 'kvar', { highlight: true }),
    res('overKvar', '过补偿余量', r.overKvar, 'kvar'),
    res('sBeforeKva', '补偿前视在功率', r.sBeforeKva, 'kVA'),
    res('sAfterKva', '补偿后视在功率', r.sAfterKva, 'kVA'),
    res('savedKva', '节省视在功率', r.savedKva, 'kVA'),
    res('currentBeforeA', '补偿前线电流', r.currentBeforeA, 'A'),
    res('currentAfterA', '补偿后线电流', r.currentAfterA, 'A'),
    res(
      'loadBeforePct',
      '补偿前变压器负载率',
      r.loadBeforePct ?? '未计算',
      r.loadBeforePct === null ? '' : '%',
      { copyable: false },
    ),
    res(
      'loadAfterPct',
      '补偿后变压器负载率',
      r.loadAfterPct ?? '未计算',
      r.loadAfterPct === null ? '' : '%',
      { copyable: false },
    ),
    res('tan1', '补偿前 tanφ1', r.tan1, '', { copyable: false }),
    res('tan2', '补偿后 tanφ2', r.tan2, '', { copyable: false }),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** E15 无功补偿容量计算 */
export default function ReactivePower({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
