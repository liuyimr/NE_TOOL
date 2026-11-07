import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { poeBudget, type PoeStandard } from '@/lib/calc/poeBudget';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'camCount', label: '摄像机数量', type: 'number', default: 10, min: 0, unit: '台' },
  { key: 'camW', label: '单台摄像机功率', type: 'number', default: 12, min: 0, step: 0.5, unit: 'W' },
  { key: 'apCount', label: '无线 AP 数量', type: 'number', default: 4, min: 0, unit: '台' },
  { key: 'apW', label: '单台 AP 功率', type: 'number', default: 15, min: 0, step: 0.5, unit: 'W' },
  { key: 'otherCount', label: '其他 PoE 设备数量', type: 'number', default: 2, min: 0, unit: '台' },
  { key: 'otherW', label: '单台其他设备功率', type: 'number', default: 7, min: 0, step: 0.5, unit: 'W' },
  {
    key: 'budgetW',
    label: '交换机 PoE 总预算',
    type: 'number',
    default: 370,
    min: 0,
    unit: 'W',
    help: '常见 24 口 PoE+ 交换机整机预算示例值，须按实际交换机铭牌/样本填写（130/370/740 W 不等）',
  },
  { key: 'margin', label: '余量系数', type: 'number', default: 1.2, min: 1, step: 0.1 },
  {
    key: 'standard',
    label: 'PoE 标准',
    type: 'select',
    default: 'at',
    options: [
      { label: '802.3af（PD 侧 12.95 W）', value: 'af' },
      { label: '802.3at（PD 侧 25.5 W）', value: 'at' },
      { label: '802.3bt Type3（PD 侧 51 W）', value: 'bt3' },
      { label: '802.3bt Type4（PD 侧 71.3 W）', value: 'bt4' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = poeBudget({
    camCount: num(v, 'camCount'),
    camW: num(v, 'camW'),
    apCount: num(v, 'apCount'),
    apW: num(v, 'apW'),
    otherCount: num(v, 'otherCount'),
    otherW: num(v, 'otherW'),
    budgetW: num(v, 'budgetW'),
    margin: num(v, 'margin', 1.2),
    standard: str(v, 'standard', 'at') as PoeStandard,
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('totalDemandW', '设备总需求功率', r.totalDemandW, 'W', { highlight: true }),
    res('ports', '占用 PoE 端口数', r.ports, '个'),
    res('designDemandW', '设计需求功率（含余量）', r.designDemandW, 'W', { highlight: true }),
    res('remainingW', '剩余可用预算', r.remainingW, 'W'),
    res('ok', '预算结论', r.ok ? '满足 ✅' : '超预算 ❌', '', { copyable: false }),
    res('requiredSwitches', '所需交换机台数', r.requiredSwitches, '台'),
    res('requiredBudgetW', '所需最小 PoE 预算', r.requiredBudgetW, 'W'),
    res('portLimitW', '单口可用功率（PD 侧）', r.portLimitW, 'W', { copyable: false }),
    res('overPortLimit', '单台设备超单口上限', r.overPortLimit ? '是 ❌' : '否 ✅', '', {
      copyable: false,
    }),
    res('margin', '采用的余量系数', r.margin, '', { copyable: false }),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** N12 PoE 供电功率预算 */
export default function PoeBudget({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
