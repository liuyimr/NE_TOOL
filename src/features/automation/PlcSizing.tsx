import CalculatorView from '@/features/shared/CalculatorView';
import { bool, num, res } from '@/features/shared/calcHelpers';
import { plcSizing, PLC_MODULE_SPEC } from '@/lib/calc/plcSizing';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'di', label: 'DI 点数', type: 'number', default: 40, min: 0, step: 1 },
  { key: 'do', label: 'DO 点数', type: 'number', default: 24, min: 0, step: 1 },
  { key: 'ai', label: 'AI 点数', type: 'number', default: 16, min: 0, step: 1 },
  { key: 'ao', label: 'AO 点数', type: 'number', default: 4, min: 0, step: 1 },
  { key: 'marginPct', label: '点数余量', type: 'number', default: 25, min: 0, max: 100, step: 5, unit: '%' },
  {
    key: 'highSpeed',
    label: '是否需要高速计数 / 脉冲输出',
    type: 'select',
    default: '0',
    options: [
      { label: '否', value: '0' },
      { label: '是', value: '1' },
    ],
    help: `模块规格：DI ${PLC_MODULE_SPEC.di} / DO ${PLC_MODULE_SPEC.do} / AI ${PLC_MODULE_SPEC.ai} / AO ${PLC_MODULE_SPEC.ao} 点`,
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = plcSizing({
    di: num(v, 'di'),
    do: num(v, 'do'),
    ai: num(v, 'ai'),
    ao: num(v, 'ao'),
    marginPct: num(v, 'marginPct', 25),
    highSpeed: bool(v, 'highSpeed'),
  });
  return [
    res('totalPoints', '含余量总点数', r.totalPoints, '点', { highlight: true }),
    res('cpuClass', 'CPU 档位建议', r.cpuClass, '', { highlight: true, copyable: false }),
    res('required', '含余量点数（DI/DO/AI/AO）', `${r.required.di} / ${r.required.do} / ${r.required.ai} / ${r.required.ao}`, '', { copyable: false }),
    res('modules', '模块数（DI/DO/AI/AO）', `${r.modules.di} / ${r.modules.do} / ${r.modules.ai} / ${r.modules.ao}`, '个', { copyable: false }),
    res('totalModules', '模块总数', r.totalModules, '个'),
    res('rack', '扩展机架', r.needsRack ? '需要（模块 > 8）' : '无需', '', { copyable: false }),
    res('powerA', '24V 电源容量估算', r.powerA, 'A'),
    res('powerW', '24V 电源功率估算', r.powerW, 'W'),
    res('note', '说明', '模块规格与单点功耗为工程近似，选型以厂家手册为准', '', { copyable: false }),
  ];
}

/** P16 PLC 选型与 I/O 点数估算 */
export default function PlcSizing({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
