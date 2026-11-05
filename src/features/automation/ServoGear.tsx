import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { servoGear, GEAR_RATIO_MIN, GEAR_RATIO_MAX } from '@/lib/calc/servoGear';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'encoderRes', label: '编码器分辨率 E', type: 'number', default: 131072, min: 0, step: 1, unit: 'pulses/rev' },
  { key: 'pitch', label: '丝杠导程 P（每转行程）', type: 'number', default: 10, min: 0, step: 0.5, unit: 'mm/rev' },
  { key: 'gearRatio', label: '减速比 i', type: 'number', default: 10, min: 0, step: 0.5 },
  { key: 'pulseEquiv', label: '目标脉冲当量 Δ', type: 'number', default: 0.001, min: 0, step: 0.0001, unit: 'mm/pulse' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = servoGear({
    encoderRes: num(v, 'encoderRes'),
    pitch: num(v, 'pitch'),
    gearRatio: num(v, 'gearRatio'),
    pulseEquiv: num(v, 'pulseEquiv'),
  });
  if (!r.valid) {
    return [res('error', '错误', r.error ?? '输入非法', '', { copyable: false })];
  }
  const out: CalcResult[] = [
    res('ratio', '电子齿轮比', r.ratio, '', { highlight: true }),
    res(
      'fraction',
      '最简整数比',
      r.fractionAvailable ? `${r.numerator} / ${r.denominator}` : '无法给出整数比（量级过大/过小）',
      '',
      { highlight: true, copyable: r.fractionAvailable },
    ),
    res('pulsesPerRev', '每转指令脉冲数', r.pulsesPerRev, 'pulses/rev'),
    res('pulseEquiv', '脉冲当量（定位精度）', r.pulseEquiv, 'mm/pulse', { copyable: false }),
    res(
      'range',
      '可设范围校核',
      r.inRange
        ? `在常见范围（1/50 ~ 50）内 ✅`
        : `超出常见范围（1/50 ~ 50），请核对参数 ⚠️`,
      '',
      { copyable: false },
    ),
    res('rangeText', '范围参考', `1/${Math.round(1 / GEAR_RATIO_MIN)} ~ ${GEAR_RATIO_MAX}`, '', {
      copyable: false,
    }),
  ];
  if (r.note) out.push(res('note', '提示', r.note, '', { copyable: false }));
  return out;
}

/** P17 伺服电子齿轮比与脉冲当量 */
export default function ServoGear({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
