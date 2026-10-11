import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { demandFlow, type WaterBuildingType } from '@/lib/calc/waterDemand';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'ng', label: '卫生器具给水当量总数 N_g', type: 'number', default: 20, min: 0, step: 0.5 },
  {
    key: 'buildingType',
    label: '建筑类型（取默认 α）',
    type: 'select',
    default: 'residential',
    options: [
      { label: '住宅', value: 'residential' },
      { label: '办公', value: 'office' },
      { label: '旅馆', value: 'hotel' },
      { label: '学校', value: 'school' },
      { label: '商场', value: 'shopping' },
      { label: '医院', value: 'hospital' },
    ],
  },
  {
    key: 'alpha',
    label: '系数 α（覆盖默认，0 用默认）',
    type: 'number',
    default: 0,
    min: 0,
    step: 0.1,
    help: '留 0 则按建筑类型取默认 α；已知 α 时可直接填写覆盖',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = demandFlow({
    ng: num(v, 'ng'),
    buildingType: str(v, 'buildingType', 'residential') as WaterBuildingType,
    alpha: num(v, 'alpha', 0),
  });
  return [
    res('flowLps', '设计秒流量 q_g', r.flowLps, 'L/s', { highlight: true }),
    res('flowM3h', '等同流量', r.flowM3h, 'm³/h'),
    res('ng', '当量总数 N_g', r.ng, '', { copyable: false }),
    res('alpha', '采用的 α', r.alpha, '', { copyable: false }),
  ];
}

/** D7 给水设计秒流量（当量法） */
export default function DemandFlow({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <CalculatorView
      toolId={tool.id}
      fields={fields}
      run={run}
      quickRefIds={['water.pipeSpecs']}
    />
  );
}
