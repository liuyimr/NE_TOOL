import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import {
  rcdSelect,
  type RcdCircuitType,
  type RcdDelayed,
} from '@/lib/calc/rcdSelect';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

/** §4 RCD 总免责文案（与 rcdRef.json 的 trip-time.basis 同口径） */
const RCD_DISCLAIMER =
  '本表动作时间并列展示两套不同口径，请勿混用：『设计选用/分级配合值（末级 ≤0.1 s、中间级 ≤0.3 s、上级 ≤0.5 s）』系工程设计与运行管理的选型、级配要求，≤0.1 s 的条文依据为 JGJ/T 46-2024 第 3.3.4 条（推荐性标准，只写条文号，不标注强制性属性）；一般民用建筑沿用 GB 13955-2005 三级保护（该标准已废止，由 GB/T 13955-2017 替代，2018-07-01 实施）与《全国民用建筑工程设计技术措施·电气》2009 第 6.4.7 条的设计手册口径。GB 50054-2011 无 0.1 s 条文（其对应 TN 系统末端自动切断时间 ≤0.4 s，IEC 60364-4-41）。涉及人身电击防护的强制要求以全文强制性工程建设规范与设计说明为准。『产品型式试验最大分断时间』为 GB/T 16916.1、GB/T 16917.1（IEC 61008-1、IEC 61009-1）规定的合格判据上限（一般型 IΔn ≤0.3 s、2IΔn ≤0.15 s、5IΔn ≤0.04 s；S 型 IΔn ≤0.5 s 且最小不驱动 ≥0.13 s）。两者不矛盾：0.1 s 为更严的设计选用目标，0.3 s 为型式试验允许上限，一般型产品实测通常远小于两者。实际动作时间随剩余电流倍数、产品型号、环境温度与电源条件变化；严禁将本表数值用于产品验收判定或替代厂家样本。涉及人身电击防护、消防设备供电与分级选择性的回路，须由注册电气工程师按现行规范、接地系统型式（TN/TT/IT）与实测泄漏电流复核。';

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
    res(
      'designBreakTimeMs',
      '设计选用/配合动作时间（提示值）',
      r.designBreakTimeMs ?? '不适用（不脱扣，仅报警）',
      r.designBreakTimeMs === null ? '' : 'ms',
      { copyable: false },
    ),
    res(
      'typeTestBreak',
      '产品型式试验最大分断时间（GB/T 16916.1/16917.1）',
      '一般型：IΔn≤0.3s｜2IΔn≤0.15s｜5IΔn(或0.25A)≤0.04s｜500A≤0.04s；' +
        'S型：IΔn≤0.5s(最小不驱动≥0.13s)｜2IΔn≤0.2s(≥0.06s)｜5IΔn≤0.15s(≥0.05s)｜500A≤0.15s(≥0.04s)',
      '',
      { copyable: false },
    ),
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
    res('rcdDisclaimer', '口径与免责', RCD_DISCLAIMER, '', { copyable: false }),
    res('note', '选型说明与免责', r.note, '', { copyable: false }),
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
