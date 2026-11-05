import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { ddcSizing, DDC_MODULE_SPEC, DEFAULT_MAX_POINTS_PER_DDC } from '@/lib/calc/ddcSizing';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'ai', label: 'AI 点数', type: 'number', default: 40, min: 0, step: 1 },
  { key: 'ao', label: 'AO 点数', type: 'number', default: 10, min: 0, step: 1 },
  { key: 'di', label: 'DI 点数', type: 'number', default: 120, min: 0, step: 1 },
  { key: 'do', label: 'DO 点数', type: 'number', default: 60, min: 0, step: 1 },
  { key: 'marginPct', label: '点数余量', type: 'number', default: 20, min: 0, max: 100, step: 5, unit: '%' },
  {
    key: 'maxPointsPerDdc',
    label: '单台 DDC 最大点数',
    type: 'number',
    default: DEFAULT_MAX_POINTS_PER_DDC,
    min: 1,
    step: 10,
    help: `模块规格：AI ${DDC_MODULE_SPEC.ai} / AO ${DDC_MODULE_SPEC.ao} / DI ${DDC_MODULE_SPEC.di} / DO ${DDC_MODULE_SPEC.do}`,
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = ddcSizing({
    ai: num(v, 'ai'),
    ao: num(v, 'ao'),
    di: num(v, 'di'),
    do: num(v, 'do'),
    marginPct: num(v, 'marginPct', 20),
    maxPointsPerDdc: num(v, 'maxPointsPerDdc', DEFAULT_MAX_POINTS_PER_DDC),
  });
  return [
    res('totalPoints', '含余量总点数', r.totalPoints, '点', { highlight: true }),
    res('ddcCount', 'DDC 台数', r.ddcCount, '台', { highlight: true }),
    res('avgPointsPerDdc', '每台平均点数', r.avgPointsPerDdc, '点'),
    res('required', '含余量点数（AI/AO/DI/DO）', `${r.required.ai} / ${r.required.ao} / ${r.required.di} / ${r.required.do}`, '', { copyable: false }),
    res('modules', '模块数（AI/AO/DI/DO）', `${r.modules.ai} / ${r.modules.ao} / ${r.modules.di} / ${r.modules.do}`, '个', { copyable: false }),
    res('totalModules', '模块总数', r.totalModules, '个'),
    res('split', '单台上限校核', r.needsSplit ? `超过 ${r.maxPointsPerDdc} 点，需拆分 ✅` : '未超过单台上限', '', { copyable: false }),
  ];
}

/** BA8 DDC 选型与 I/O 模块配置 */
export default function DdcSizing({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
