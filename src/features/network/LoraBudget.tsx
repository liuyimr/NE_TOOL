import CalculatorView from '@/features/shared/CalculatorView';
import { num, res } from '@/features/shared/calcHelpers';
import { loraBudget } from '@/lib/calc/loraBudget';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

/**
 * 可选数值字段取值：空字符串表示「未填写」，交由计算模块按 SF 查表。
 * @param values 表单值
 * @param key 字段键
 */
function optNum(values: Record<string, string>, key: string): number | undefined {
  const raw = values[key];
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const fields: FieldDef[] = [
  { key: 'txPowerDbm', label: '发射功率', type: 'number', default: 14, step: 0.5, unit: 'dBm' },
  { key: 'txGainDbi', label: '发射天线增益', type: 'number', default: 2, step: 0.5, unit: 'dBi' },
  { key: 'rxGainDbi', label: '接收天线增益', type: 'number', default: 2, step: 0.5, unit: 'dBi' },
  {
    key: 'cableLossDb',
    label: '馈线损耗',
    type: 'number',
    default: 0.5,
    min: 0,
    step: 0.1,
    unit: 'dB',
    help: '含接头与馈线插损，短跳线约 0.2~0.5 dB，长馈线按线缆每米损耗累加',
  },
  {
    key: 'fadeMarginDb',
    label: '衰落余量',
    type: 'number',
    default: 10,
    min: 0,
    step: 1,
    unit: 'dB',
    help: '吸收多径快衰落、天气与临时遮挡，工程常取 8~15 dB',
  },
  {
    key: 'freqMhz',
    label: '工作频率',
    type: 'number',
    default: 470,
    min: 1,
    step: 1,
    unit: 'MHz',
    help: 'CN470 频段 470~510 MHz；频率越高自由空间损耗越大',
  },
  {
    key: 'sf',
    label: '扩频因子 SF',
    type: 'select',
    default: '9',
    options: [
      { label: 'SF7（速率最高，灵敏度 −123 dBm）', value: '7' },
      { label: 'SF8（−126 dBm）', value: '8' },
      { label: 'SF9（−129 dBm）', value: '9' },
      { label: 'SF10（−132 dBm）', value: '10' },
      { label: 'SF11（−134.5 dBm）', value: '11' },
      { label: 'SF12（速率最低，灵敏度 −137 dBm）', value: '12' },
    ],
  },
  {
    key: 'envFactor',
    label: '环境衰减指数 n',
    type: 'number',
    default: 2.8,
    min: 1,
    step: 0.1,
    help: '开阔 2.0~2.3 / 郊区 2.5~3.0 / 城区 3.0~3.5 / 室内 3.5~5.0',
  },
  {
    key: 'rxSensitivityDbm',
    label: '接收灵敏度（可选，覆盖查表值）',
    type: 'number',
    default: '',
    step: 0.5,
    unit: 'dBm',
    placeholder: '留空按 SF 查表',
    help: '按模组手册实测/标称值填写（负值，如 −129）；留空则使用 SX1276 / BW125 / CR4-5 典型值',
  },
];

function run(v: Record<string, string>): CalcResult[] {
  const r = loraBudget({
    txPowerDbm: num(v, 'txPowerDbm', 14),
    txGainDbi: num(v, 'txGainDbi', 2),
    rxGainDbi: num(v, 'rxGainDbi', 2),
    cableLossDb: num(v, 'cableLossDb', 0.5),
    fadeMarginDb: num(v, 'fadeMarginDb', 10),
    freqMhz: num(v, 'freqMhz', 470),
    sf: num(v, 'sf', 9),
    envFactor: num(v, 'envFactor', 2.8),
    rxSensitivityDbm: optNum(v, 'rxSensitivityDbm'),
  });
  if (!r.valid) {
    return [res('error', '错误', r.note, '', { copyable: false })];
  }
  return [
    res('maxDistanceKm', '最大通信距离', r.maxDistanceKm, 'km', { highlight: true }),
    res('budgetDb', '最大允许路径损耗', r.budgetDb, 'dB', { highlight: true }),
    res('usableDb', '扣除衰落余量后可用损耗', r.usableDb, 'dB'),
    res('marginAt1kmDb', '1 km 处链路余量', r.marginAt1kmDb, 'dB'),
    res('maxDistanceM', '最大通信距离', r.maxDistanceM, 'm'),
    res('rxSensitivityDbm', '采用的接收灵敏度', r.rxSensitivityDbm, 'dBm', { copyable: false }),
    res('sf', '采用扩频因子', `SF${r.sf}`, '', { copyable: false }),
    res('plRefDb', '1 m 参考路径损耗', r.plRefDb, 'dB'),
    res('pathLossAt1kmDb', '1 km 处路径损耗', r.pathLossAt1kmDb, 'dB'),
    res('reachBeyond1km', '是否可覆盖 1 km 以上', r.reachBeyond1km ? '是 ✅' : '否 ❌', '', {
      copyable: false,
    }),
    res('note', '计算说明', r.note, '', { copyable: false }),
  ];
}

/** N15 LoRa 链路预算与覆盖距离 */
export default function LoraBudget({ tool }: { tool: ToolDef }): JSX.Element {
  return <CalculatorView toolId={tool.id} fields={fields} run={run} />;
}
