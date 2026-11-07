import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { hydraulicBalance } from '@/lib/calc/hydraulicBalance';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const DEFAULT_SEGMENTS = '30,53,20,2.5;15,40,12,1.5';

const fields: FieldDef[] = [
  {
    key: 'segments',
    label: '最不利环路管段',
    type: 'text',
    default: DEFAULT_SEGMENTS,
    placeholder: '流量m³/h,管内径mm,长度m,局部阻力系数ζ',
    help: '每段 4 个字段，段间用分号「;」分隔',
  },
  {
    key: 'nearLoopKPa',
    label: '近端环路总压降',
    type: 'number',
    default: 0,
    min: 0,
    unit: 'kPa',
    help: '填 0 表示不计算不平衡率',
  },
];

/** 将逐段明细拼为可阅读文本 */
function formatDetail(
  segments: { index: number; velocity: number; reynolds: number; frictionPa: number; localPa: number; totalPa: number }[],
): string {
  if (segments.length === 0) return '无有效管段';
  return segments
    .map(
      (s) =>
        `#${s.index} v=${s.velocity.toFixed(3)} m/s, Re=${s.reynolds.toFixed(0)}, 沿程=${s.frictionPa.toFixed(1)} Pa, 局部=${s.localPa.toFixed(1)} Pa, 合计=${s.totalPa.toFixed(1)} Pa`,
    )
    .join(' | ');
}

function run(v: Record<string, string>): CalcResult[] {
  const r = hydraulicBalance({
    segments: str(v, 'segments', DEFAULT_SEGMENTS),
    nearLoopKPa: num(v, 'nearLoopKPa', 0),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('totalKPa', '最不利环路总压降', r.totalKPa, 'kPa', { highlight: true }),
    res('totalPa', '总压降', r.totalPa, 'Pa'),
    res('headM', '折算水头', r.headM, 'm'),
    res('worstSegmentIndex', '阻力最大段序号', r.worstSegmentIndex, '', { copyable: false }),
    res('worstSegmentPa', '阻力最大段压降', r.worstSegmentPa, 'Pa'),
    res('segmentCount', '有效管段数', r.segmentCount, '', { copyable: false }),
    res('skippedLines', '跳过的非法行数', r.skippedLines, '', { copyable: false }),
    res(
      'imbalancePct',
      '不平衡率',
      r.imbalancePct === null ? '未计算（近端压降为 0）' : r.imbalancePct,
      r.imbalancePct === null ? '' : '%',
      { copyable: false },
    ),
    res(
      'balanceValveKPa',
      '平衡阀需附加阻力',
      r.balanceValveKPa ?? '未计算',
      r.balanceValveKPa === null ? '' : 'kPa',
      { copyable: false },
    ),
    res('segmentsDetail', '逐段计算明细', formatDetail(r.segmentsDetail), '', {
      copyable: true,
    }),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** H17 水力平衡 / 最不利环路 */
export default function HydraulicBalance({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
