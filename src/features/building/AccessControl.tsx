import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { accessControl } from '@/lib/calc/accessControl';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  { key: 'doorCount', label: '门数', type: 'number', default: 20, min: 0, step: 1, unit: '门' },
  {
    key: 'doorsPerController',
    label: '单控制器门数',
    type: 'select',
    default: '2',
    options: [
      { label: '1 门（单门控制器）', value: '1' },
      { label: '2 门（双门控制器）', value: '2' },
      { label: '4 门（四门控制器）', value: '4' },
    ],
  },
  {
    key: 'readersPerDoor',
    label: '每门读卡器数',
    type: 'number',
    default: 2,
    min: 0,
    step: 1,
    unit: '只',
    help: '进/出双向读卡取 2，单向读卡取 1',
  },
  {
    key: 'lockCurrentA',
    label: '单锁动作电流',
    type: 'number',
    default: 0.5,
    min: 0,
    step: 0.05,
    unit: 'A',
    help: '按电锁铭牌或样本填写；12 V 磁力锁常见 0.3~0.6 A',
  },
  { key: 'lockVoltageV', label: '电锁工作电压', type: 'number', default: 12, min: 1, step: 1, unit: 'V' },
  {
    key: 'lockDutyRatio',
    label: '电锁同时动作率',
    type: 'number',
    default: 0.2,
    min: 0,
    max: 1,
    step: 0.05,
    help: '0.2~0.3（电锁为短时工作制）；消防联动集中断电开门工况须另行按最不利取值校核',
  },
  {
    key: 'controllerPowerW',
    label: '单控制器功耗',
    type: 'number',
    default: 10,
    min: 0,
    step: 1,
    unit: 'W',
    help: '含读卡器供电与通信模块，须按厂家样本覆盖（4 门控制器常见 8~20 W）',
  },
  { key: 'backupHours', label: '后备时间', type: 'number', default: 4, min: 0, step: 0.5, unit: 'h' },
  {
    key: 'psuMargin',
    label: '电源余量系数',
    type: 'number',
    default: 1.3,
    min: 1,
    step: 0.1,
    help: '常取 1.2~1.5，用于覆盖线损、老化与后期扩容',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = accessControl({
    doorCount: num(v, 'doorCount', 20),
    doorsPerController: num(v, 'doorsPerController', 2),
    readersPerDoor: num(v, 'readersPerDoor', 2),
    lockCurrentA: num(v, 'lockCurrentA', 0.5),
    lockVoltageV: num(v, 'lockVoltageV', 12),
    lockDutyRatio: num(v, 'lockDutyRatio', 0.2),
    controllerPowerW: num(v, 'controllerPowerW', 10),
    backupHours: num(v, 'backupHours', 4),
    psuMargin: num(v, 'psuMargin', 1.3),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('controllerCount', '控制器台数', r.controllerCount, '台', { highlight: true }),
    res('readerCount', '读卡器数量', r.readerCount, '只'),
    res('totalPowerW', '峰值总功率', r.totalPowerW, 'W', { highlight: true }),
    res('psuRequiredW', '电源容量（含余量）', r.psuRequiredW, 'W', { highlight: true }),
    res('batteryAh', '后备电池容量（DoD 0.8）', r.batteryAh, 'Ah', { highlight: true }),
    res('lockPeakCurrentA', '电锁峰值电流', r.lockPeakCurrentA, 'A'),
    res('lockPeakPowerW', '电锁峰值功率', r.lockPeakPowerW, 'W'),
    res('controllerTotalPowerW', '控制器总功耗', r.controllerTotalPowerW, 'W'),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** BA13 门禁系统容量与选型 */
export default function AccessControl({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
