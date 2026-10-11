import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { pumpHead } from '@/lib/calc/waterPump';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'staticHead', label: '几何高差 H_几何', type: 'number', default: 30, min: 0, unit: 'm' },
  { key: 'pipeLength', label: '管路总长度', type: 'number', default: 80, min: 0, unit: 'm' },
  {
    key: 'frictionPerMeter',
    label: '单位长度沿程损失',
    type: 'number',
    default: 0.02,
    min: 0,
    step: 0.005,
    unit: 'm/m',
  },
  { key: 'localLoss', label: '局部损失 Σh_j', type: 'number', default: 3, min: 0, unit: 'm' },
  { key: 'freeHead', label: '末端自由水头 H_自由', type: 'number', default: 5, min: 0, unit: 'm' },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = pumpHead({
    staticHead: num(v, 'staticHead'),
    pipeLength: num(v, 'pipeLength'),
    frictionPerMeter: num(v, 'frictionPerMeter'),
    localLoss: num(v, 'localLoss'),
    freeHead: num(v, 'freeHead'),
  });
  return [
    res('totalHead', '所需扬程 H', r.totalHead, 'm', { highlight: true }),
    res('staticHead', '几何高差', r.staticHead, 'm', { copyable: false }),
    res('frictionLoss', '沿程损失 Σh_f', r.frictionLoss, 'm'),
    res('localLoss', '局部损失 Σh_j', r.localLoss, 'm', { copyable: false }),
    res('freeHead', '自由水头', r.freeHead, 'm', { copyable: false }),
  ];
}

/** D9 给水所需压力 / 扬程计算 */
export default function PumpHead({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
