import { useMemo, useState } from 'react';
import CalculatorView from '@/features/shared/CalculatorView';
import { bool, num, res, str } from '@/features/shared/calcHelpers';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import ResultCard from '@/components/ui/ResultCard';
import Select from '@/components/ui/Select';
import {
  cableVoltageDrop,
  maxLengthForDrop,
  simpleVoltageDrop,
  type CircuitPhase,
  type ConductorMaterial,
} from '@/lib/calc/cableDrop';
import {
  AMPACITY_ENTRIES,
  TEMP_FACTOR,
  GROUP_FACTOR,
  checkAmpacity,
  type CableInstallMethod,
} from '@/lib/calc/ampacityCheck';
import type { CalcResult, FieldDef } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const fields: FieldDef[] = [
  {
    key: 'mode',
    label: '输入方式',
    type: 'select',
    default: 'current',
    options: [
      { label: '按电流（精确式）', value: 'current' },
      { label: '按功率（简化系数法）', value: 'power' },
    ],
    help: '按功率时使用 ΔU% = P·L/(C·S) 速算法；两法共用限值：照明 3% / 动力 5%',
  },
  { key: 'current', label: '负载电流', type: 'number', default: 32, min: 0, unit: 'A' },
  { key: 'power', label: '有功功率（按功率法）', type: 'number', default: 10, min: 0, unit: 'kW' },
  { key: 'length', label: '线缆长度（单程）', type: 'number', default: 100, min: 0, unit: 'm' },
  { key: 'section', label: '导体截面', type: 'number', default: 6, min: 0, step: 0.5, unit: 'mm²' },
  {
    key: 'material',
    label: '材质',
    type: 'select',
    default: 'copper',
    options: [
      { label: '铜（ρ≈0.0175）', value: 'copper' },
      { label: '铝（ρ≈0.0282）', value: 'aluminum' },
    ],
  },
  {
    key: 'phase',
    label: '相制',
    type: 'select',
    default: 'three',
    options: [
      { label: '三相', value: 'three' },
      { label: '单相', value: 'single' },
    ],
  },
  { key: 'voltage', label: '系统电压', type: 'number', default: 380, min: 0, unit: 'V' },
  {
    key: 'lighting',
    label: '回路类型',
    type: 'select',
    default: '0',
    options: [
      { label: '动力（≤5%）', value: '0' },
      { label: '照明（≤3%）', value: '1' },
    ],
  },
];

/** 输入无效时的统一提示（长度 / 电流（功率）/ 截面 / 电压 必须为有效正值） */
const INVALID_INPUT_NOTE = '输入无效：长度 / 电流（功率）/ 截面 / 电压必须为有效正值';

function run(v: Record<string, string>): CalcResult[] {
  const mode = str(v, 'mode', 'current');
  const material = str(v, 'material', 'copper') as ConductorMaterial;
  const phase = str(v, 'phase', 'three') as CircuitPhase;
  const lighting = bool(v, 'lighting');
  const length = num(v, 'length');
  const section = num(v, 'section');

  // 按功率输入：简化系数法 ΔU% = P·L/(C·S)
  if (mode === 'power') {
    const powerKw = num(v, 'power', 10);
    const r = simpleVoltageDrop({ powerKw, length, section, material, phase, lighting });
    if (!r.valid) {
      return [res('error', '错误', INVALID_INPUT_NOTE, '', { copyable: false })];
    }
    const voltage = num(v, 'voltage', 380);
    const k = phase === 'three' ? Math.sqrt(3) : 1;
    const cos = 0.85;
    const equivalentCurrent = voltage > 0 ? (powerKw * 1000) / (k * voltage * cos) : 0;
    return [
      res('percent', '电压降百分比（简化法）', r.percent, '%', { highlight: true }),
      res('limit', '允许压降限值', r.limit, '%', { copyable: false }),
      res('compliant', '是否合规', r.compliant ? '合规 ✅' : '超限 ❌', '', { copyable: false }),
      res('coefficient', '系数 C', r.coefficient),
      res('equivalentCurrent', '等效电流（cosφ=0.85 估算）', equivalentCurrent, 'A'),
      res('note', '说明', '简化法 ΔU%=P·L/(C·S)，用于快速初选，精确值请切到按电流法', '', {
        copyable: false,
      }),
    ];
  }

  // 按电流输入：精确式（保持既有行为不变）
  const input = {
    current: num(v, 'current'),
    length,
    section,
    material,
    phase,
    voltage: num(v, 'voltage', 380),
    lighting,
  };
  const r = cableVoltageDrop(input);
  if (!r.valid) {
    return [res('error', '错误', INVALID_INPUT_NOTE, '', { copyable: false })];
  }
  const maxLen = maxLengthForDrop(input, r.limit);
  return [
    res('percent', '电压降百分比', r.percent, '%', { highlight: true }),
    res('deltaV', '电压降', r.deltaV, 'V'),
    res('limit', '限值', r.limit, '%', { copyable: false }),
    res('compliant', '是否合规', r.compliant ? '合规 ✅' : '超限 ❌', '', { copyable: false }),
    res('maxLength', `满足 ${r.limit}% 的最大长度`, Math.floor(maxLen), 'm'),
  ];
}

/** 载流量校核卡的默认状态（与上方电压降默认口径一致：6mm² 穿管 32A） */
interface AmpacityFormState {
  /** 校核截面（mm²，取自载流量速查表） */
  section: string;
  /** 回路计算电流 I_b（A） */
  ib: string;
  /** 敷设方式 */
  method: CableInstallMethod;
  /** 环境温度（℃） */
  ambientC: string;
  /** 并列回路数 */
  circuits: string;
}

/** 默认值：6mm² 穿管、32A、30℃、单回路 */
const AMPACITY_DEFAULT: AmpacityFormState = {
  section: '6',
  ib: '32',
  method: 'pipe',
  ambientC: '30',
  circuits: '1',
};

/** 敷设方式选项 */
const METHOD_OPTIONS: { label: string; value: CableInstallMethod }[] = [
  { label: '穿管（管内敷设）', value: 'pipe' },
  { label: '明敷 / 空气', value: 'air' },
];

/** 环境温度选项（与 TEMP_FACTOR 键一一对应） */
const AMBIENT_OPTIONS = Object.keys(TEMP_FACTOR).map((key) => ({
  label: `${key} ℃（k = ${TEMP_FACTOR[Number(key)]}）`,
  value: key,
}));

/** 并列回路数选项（与 GROUP_FACTOR 键一一对应） */
const CIRCUIT_OPTIONS = Object.keys(GROUP_FACTOR).map((key) => ({
  label: `${key} 回路（k = ${GROUP_FACTOR[Number(key)]}）`,
  value: key,
}));

/** 校核截面选项（仅取载流量表内档位，保证基准值有出处） */
const SECTION_OPTIONS = AMPACITY_ENTRIES.map((entry) => ({
  label: `${entry.sectionMm2} mm²`,
  value: String(entry.sectionMm2),
}));

/**
 * 载流量校核卡（E3 页内追加区，v1.7）
 * ------------------------------------------------------------------
 * 独立于上方电压降计算：只按「I_b + 敷设条件」查表修正并校核 I_b ≤ I_z，
 * 不影响原有电压降两张结果的行为。数据源为 cableAmpacity.json（唯一数据源）。
 */
function AmpacityCheckCard(): JSX.Element {
  const [form, setForm] = useState<AmpacityFormState>(AMPACITY_DEFAULT);

  function update<K extends keyof AmpacityFormState>(key: K, value: AmpacityFormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const results = useMemo<CalcResult[]>(() => {
    const sectionMm2 = Number(form.section);
    const r = checkAmpacity({
      ib: Number(form.ib),
      method: form.method,
      ambientC: Number(form.ambientC),
      circuits: Number(form.circuits),
      sectionMm2: Number.isFinite(sectionMm2) ? sectionMm2 : undefined,
    });
    if (!r.valid) {
      return [res('error', '错误', r.note, '', { copyable: false })];
    }
    return [
      res('compliant', `I_b ≤ I_z 结论（I_b = ${form.ib} A）`, r.compliant ? '合规 ✅' : '超限 ❌', '', {
        copyable: false,
      }),
      res('iz', '修正后允许载流量 I_z', r.izA, 'A', { highlight: true }),
      res('base', '基准载流量（表内值）', r.baseA, 'A'),
      res('tempFactor', '温度修正系数 k_t', r.tempFactor),
      res('groupFactor', '并列回路修正系数 k_g', r.groupFactor),
      res('recommended', '推荐最小截面', r.recommendedSectionMm2, 'mm²', { highlight: true }),
      res('note', '校核说明', r.note, '', { copyable: false }),
      res('breakerHint', '断路器配合提示', '断路器整定 In 须满足 In ≤ Iz，请到断路器选型页校核', '', {
        copyable: false,
      }),
    ];
  }, [form]);

  return (
    <Card title="载流量校核（按敷设条件修正）">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="校核截面" help="取自载流量速查表（GB/T 4706 / 电工手册参考值）">
          <Select
            ariaLabel="校核截面"
            value={form.section}
            onValueChange={(v) => update('section', v)}
            options={SECTION_OPTIONS}
          />
        </Field>
        <Field label="回路计算电流 I_b" help="取该回路的设计电流，不是断路器额定值">
          <Input
            type="number"
            value={form.ib}
            onValueChange={(v) => update('ib', v)}
            unit="A"
            min={0}
            step={1}
          />
        </Field>
        <Field label="敷设方式">
          <Select
            ariaLabel="敷设方式"
            value={form.method}
            onValueChange={(v) => update('method', v as CableInstallMethod)}
            options={METHOD_OPTIONS}
          />
        </Field>
        <Field label="环境温度">
          <Select
            ariaLabel="环境温度"
            value={form.ambientC}
            onValueChange={(v) => update('ambientC', v)}
            options={AMBIENT_OPTIONS}
          />
        </Field>
        <Field label="并列（成组）回路数" help="同一管内 / 同一桥架内同时载流的回路数">
          <Select
            ariaLabel="并列回路数"
            value={form.circuits}
            onValueChange={(v) => update('circuits', v)}
            options={CIRCUIT_OPTIONS}
          />
        </Field>
      </div>
      <div className="mt-3">
        <ResultCard results={results} title="载流量校核结果" />
      </div>
      <p className="mt-2 px-1 text-xs leading-relaxed text-muted">
        修正系数按 GB/T 16895.15 / IEC 60364-5-52 常用值（方案阶段），实际应以所选电缆型号厂家数据与
        现场敷设条件复核；本卡不改变上方电压降计算口径。
      </p>
    </Card>
  );
}

/** E5 电缆选型与电压降计算（含按功率的简化系数法 + v1.7 载流量校核卡） */
export default function CableDropCalculator({ tool }: { tool: ToolDef }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <CalculatorView toolId={tool.id} fields={fields} run={run} />
      <AmpacityCheckCard />
    </div>
  );
}
