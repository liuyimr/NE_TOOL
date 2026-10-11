import CalculatorView from '@/features/shared/CalculatorView';
import { num, res, str } from '@/features/shared/calcHelpers';
import { calcLoad, parseDeviceList } from '@/lib/calc/waterLoad';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'devices',
    label: '设备清单',
    type: 'text',
    default: '7.5,0.8,0.85,2; 3,0.7,0.8,3; 1.5,1.0,0.9,10',
    help: '每段一台/一类设备：功率kW, 需要系数Kd, 功率因数cosφ[, 台数]；用分号或换行分隔',
  },
  { key: 'voltage', label: '系统电压', type: 'number', default: 380, min: 0, unit: 'V' },
  {
    key: 'simultaneousFactor',
    label: '同时系数',
    type: 'number',
    default: 1,
    min: 0,
    max: 1,
    step: 0.05,
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const text = str(v, 'devices').replace(/[;；]|\r?\n/g, '\n');
  const devices = parseDeviceList(text);
  if (devices.length === 0) {
    return [res('error', '错误', '设备清单格式不正确，示例：7.5,0.8,0.85,2', '', { copyable: false })];
  }
  const r = calcLoad({
    devices,
    voltage: num(v, 'voltage', 380),
    simultaneousFactor: num(v, 'simultaneousFactor', 1),
  });
  return [
    res('activeKw', '计算有功功率 Pc', r.activeKw, 'kW', { highlight: true }),
    res('reactiveKvar', '计算无功功率 Qc', r.reactiveKvar, 'kvar'),
    res('apparentKva', '计算视在功率 Sc', r.apparentKva, 'kVA'),
    res('currentA', '计算电流 Ic', r.currentA, 'A'),
    res('installedKw', '设备总装机容量 Pe', r.installedKw, 'kW'),
    res('avgPf', '综合功率因数', r.avgPf, '', { copyable: false }),
  ];
}

/** D1 计算负荷（需要系数法） */
export default function LoadCalc({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
