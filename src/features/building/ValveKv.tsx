import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { valveKv } from '@/lib/calc/valveKv';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'flowM3h', label: '流量 Q', type: 'number', default: 10, min: 0, step: 0.1, unit: 'm³/h' },
  { key: 'dpKPa', label: '阀前后压差 Δp', type: 'number', default: 100, min: 0, unit: 'kPa' },
  {
    key: 'rhoRel',
    label: '介质相对密度',
    type: 'number',
    default: 1.0,
    min: 0,
    step: 0.01,
    help: '水 = 1.0，30% 乙二醇约 1.04',
  },
  {
    key: 'dpTotalKPa',
    label: '系统可用总压差',
    type: 'number',
    default: 0,
    min: 0,
    unit: 'kPa',
    help: '填 0 表示不计算阀权度',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = valveKv({
    flowM3h: num(v, 'flowM3h'),
    dpKPa: num(v, 'dpKPa', 100),
    rhoRel: num(v, 'rhoRel', 1.0),
    dpTotalKPa: num(v, 'dpTotalKPa', 0),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('kv', '计算 Kv 值', r.kv, 'm³/h', { highlight: true }),
    res('recommendedKvs', '推荐额定 Kvs 档', r.recommendedKvs ?? '超出常用范围', '', {
      highlight: true,
    }),
    res(
      'recommendedDn',
      '推荐阀门口径',
      r.recommendedDn !== null ? `DN${r.recommendedDn}` : '超出常用范围',
      '',
      { highlight: true },
    ),
    res('valveAuthority', '阀权度 S', r.valveAuthority ?? '未计算（总压差为 0）', '', {
      copyable: false,
    }),
    res('actuator', '执行器建议', r.actuator, '', { copyable: false }),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** BA11 控制阀门 Kv 值计算与选型 */
export default function ValveKv({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
