import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { valveKv } from '@/lib/calc/valveKv';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'flowM3h', label: '流量 Q', type: 'number', default: 10, min: 0, step: 0.1, unit: 'm³/h' },
  {
    key: 'dpKPa',
    label: '阀前后压差 Δp',
    type: 'number',
    default: 100,
    min: 0,
    unit: 'kPa',
    help: 'Δp 应取设计流量下系统分配给该阀的压差（泵扬程扣除其余管路与设备损失），不能随意填，否则 Kv 与阀权度自相矛盾；1 bar = 100 kPa',
  },
  {
    key: 'rhoRel',
    label: '介质相对密度',
    type: 'number',
    default: 1.0,
    min: 0,
    step: 0.01,
    help: '介质相对密度 SG（无量纲，水=1.0，30% 乙二醇水溶液约 1.04）；请勿填 kg/m³',
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
    res('kv', '计算 Kv（流量系数）', r.kv, 'm³/h @ 1 bar', { highlight: true }),
    res(
      'recommendedKvs',
      '推荐额定 Kvs 档',
      r.recommendedKvs ?? '超出常用范围',
      'm³/h @ 1 bar',
      {
        highlight: true,
      },
    ),
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
    res(
      'kvDisclaimer',
      'Kv 口径',
      'Kv 按阀全开、Δp=1 bar、水 5~30℃ 定义（IEC 60534-2-1 / GB/T 17213.2）；Cv = 1.156·Kv，混用误差约 15.6%；Kvs/DN 为厂商样本常用档位，非标准强制值，最终以厂家样本与允许关断压差校核为准',
      '',
      { copyable: false },
    ),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** BA11 控制阀门 Kv 值计算与选型 */
export default function ValveKv({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
