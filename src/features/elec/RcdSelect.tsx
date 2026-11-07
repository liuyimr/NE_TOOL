import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import {
  rcdSelect,
  type RcdCircuitType,
  type RcdDelayed,
} from '@/lib/calc/rcdSelect';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'circuitType',
    label: '回路类型',
    type: 'select',
    default: 'socket',
    options: [
      { label: '插座回路', value: 'socket' },
      { label: '潮湿场所（浴室/户外）', value: 'wet' },
      { label: '照明回路', value: 'lighting' },
      { label: '电动机回路', value: 'motor' },
      { label: '总进线 / 上级', value: 'main' },
      { label: '消防设备', value: 'fire' },
    ],
  },
  { key: 'ratedCurrentA', label: '回路额定电流', type: 'number', default: 16, min: 0, unit: 'A' },
  {
    key: 'upstreamMa',
    label: '上级 RCD 动作电流 IΔn',
    type: 'number',
    default: 300,
    min: 0,
    unit: 'mA',
    help: '填 0 表示无上级 RCD',
  },
  {
    key: 'upstreamDelayed',
    label: '上级是否延时型（S）',
    type: 'select',
    default: 'yes',
    options: [
      { label: '是（延时型 S）', value: 'yes' },
      { label: '否（一般型）', value: 'no' },
    ],
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = rcdSelect({
    circuitType: str(v, 'circuitType', 'socket') as RcdCircuitType,
    ratedCurrentA: num(v, 'ratedCurrentA', 16),
    upstreamMa: num(v, 'upstreamMa', 300),
    upstreamDelayed: str(v, 'upstreamDelayed', 'yes') as RcdDelayed,
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('iDeltaNMa', '推荐额定剩余动作电流 IΔn', r.iDeltaNMa, 'mA', { highlight: true }),
    res('rcdType', '推荐 RCD 型式', r.rcdType, '', { highlight: true, copyable: false }),
    res('maxBreakMs', '最大分断时间', r.maxBreakMs, 'ms'),
    res(
      'ratedCurrentMinA',
      '推荐额定电流档',
      r.ratedCurrentMinA ?? '超出常用档位',
      r.ratedCurrentMinA === null ? '' : 'A',
    ),
    res(
      'gradingRatio',
      '上级 / 下级 IΔn 比值',
      r.gradingRatio ?? '无上级 RCD',
      r.gradingRatio === null ? '' : '倍',
      { copyable: false },
    ),
    res('gradingOk', '级配结论', r.gradingOk ? '满足选择性 ✅' : '存在越级跳闸风险 ❌', '', {
      copyable: false,
    }),
    res('note', '选型说明', r.note, '', { copyable: false }),
  ];
}

/** E13 漏电保护 RCD 选型与级配 */
export default function RcdSelect({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView
      toolId={tool.id}
      fields={fields}
      run={run}
      quickRefIds={['elec.rcdRef']}
    />
  );
}
