import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import ResultCard from '@/components/ui/ResultCard';
import Select from '@/components/ui/Select';
import { formatNumber } from '@/lib/format';
import { ALPHA_PRESET, demandFlow, type WaterBuildingType } from '@/lib/calc/waterDemand';
import { pipeSize } from '@/lib/calc/waterPipe';
import { pumpHead, pumpPower } from '@/lib/calc/waterPump';
import type { CalcResult } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

/**
 * H10 给水系统设计（宿主）
 * ------------------------------------------------------------------
 * v1.6 第三批合并：把原「H10 给水设计秒流量」「H11 管径选择」「H12 给水所需扬程」
 * 「H13 水泵选型与轴功率」四个独立工具合并为一条四步串联的设计流程：
 *   ① 当量 → 秒流量   demandFlow({ ng, buildingType, alpha })
 *   ② 流量 → 管径     pipeSize({ flow: flowLps, flowUnit: 'L/s', velocity })
 *   ③ 管路 → 扬程     pumpHead({ staticHead, pipeLength, frictionPerMeter, localLoss, freeHead })
 *   ④ 流量+扬程 → 轴功率 pumpPower({ flow: flowM3h, head: totalHead, efficiency, margin })
 * 所有输入集中在本容器 state，后一步直接消费前一步输出，用户无需手抄中间值。
 * 顶部步骤条与 URL 同步（?step=1~4，非法值回落第 1 步），可直接分享 `#/tool/hvac.demandFlow?step=3`。
 * 计算链路严格复用既有纯函数，不修改任何公式。
 */

/** 建筑类型选项（取默认 α） */
const BUILDING_OPTIONS: { label: string; value: WaterBuildingType }[] = [
  { label: '住宅', value: 'residential' },
  { label: '办公', value: 'office' },
  { label: '旅馆', value: 'hotel' },
  { label: '学校', value: 'school' },
  { label: '商场', value: 'shopping' },
  { label: '医院', value: 'hospital' },
];

/** 步骤定义：id 即 URL ?step 值 */
interface StepDef {
  /** 步骤序号（1~4） */
  step: number;
  /** 步骤条按钮文案 */
  label: string;
}

const STEPS: StepDef[] = [
  { step: 1, label: '① 当量 → 秒流量' },
  { step: 2, label: '② 流量 → 管径' },
  { step: 3, label: '③ 管路 → 扬程' },
  { step: 4, label: '④ 流量+扬程 → 轴功率' },
];

/** 容器集中持有的表单状态（全部以字符串承载，便于 Input 受控） */
interface FormState {
  /** 卫生器具给水当量总数 N_g */
  ng: string;
  /** 建筑类型（取默认 α） */
  buildingType: WaterBuildingType;
  /** 系数 α（空 → 按建筑类型取预设） */
  alpha: string;
  /** 推荐流速（m/s） */
  velocity: string;
  /** 几何高差（m） */
  staticHead: string;
  /** 管路总长度（m） */
  pipeLength: string;
  /** 单位长度沿程损失（m/m） */
  frictionPerMeter: string;
  /** 局部损失（m） */
  localLoss: string;
  /** 末端自由水头（m） */
  freeHead: string;
  /** 水泵效率 η */
  efficiency: string;
  /** 电机裕量系数 */
  margin: string;
}

/** 默认输入值（沿用原四个工具的默认口径） */
const DEFAULT_STATE: FormState = {
  ng: '20',
  buildingType: 'residential',
  alpha: '',
  velocity: '1.0',
  staticHead: '30',
  pipeLength: '80',
  frictionPerMeter: '0.02',
  localLoss: '3',
  freeHead: '5',
  efficiency: '0.7',
  margin: '1.15',
};

/** 安全取数值：空串或非法值回退到 fallback */
function toNum(raw: string, fallback = 0): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** 结果项构造（仅用于本页内展示，复用 CalcResult 契约） */
function res(
  key: string,
  label: string,
  value: string | number,
  unit?: string,
  opts: Partial<CalcResult> = {},
): CalcResult {
  return { key, label, value, unit, ...opts };
}

export default function WaterSystem({ tool }: { tool: ToolDef }): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();

  /** 从 URL 解析当前步骤（非法值回落第 1 步） */
  const rawStep = Number(searchParams.get('step'));
  const activeStep = Number.isInteger(rawStep) && rawStep >= 1 && rawStep <= 4 ? rawStep : 1;

  const [state, setState] = useState<FormState>(DEFAULT_STATE);

  /** 更新某一输入字段 */
  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  /** 切换步骤并写回 URL（replace，避免污染浏览历史） */
  function goStep(step: number): void {
    const next = new URLSearchParams(searchParams);
    next.set('step', String(step));
    setSearchParams(next, { replace: true });
  }

  // —— 四步计算链路（全部为纯函数，输入变化即整体重算）——
  const { demand, pipe, head, power } = useMemo(() => {
    const alphaInput = state.alpha.trim() === '' ? undefined : toNum(state.alpha);
    const demandResult = demandFlow({
      ng: toNum(state.ng),
      buildingType: state.buildingType,
      alpha: alphaInput,
    });
    const pipeResult = pipeSize({
      flow: demandResult.flowLps,
      flowUnit: 'L/s',
      velocity: toNum(state.velocity, 1.0),
    });
    const headResult = pumpHead({
      staticHead: toNum(state.staticHead),
      pipeLength: toNum(state.pipeLength),
      frictionPerMeter: toNum(state.frictionPerMeter),
      localLoss: toNum(state.localLoss),
      freeHead: toNum(state.freeHead),
    });
    const powerResult = pumpPower({
      flow: demandResult.flowM3h,
      head: headResult.totalHead,
      efficiency: toNum(state.efficiency, 0.7),
      margin: toNum(state.margin, 1.15),
    });
    return { demand: demandResult, pipe: pipeResult, head: headResult, power: powerResult };
  }, [state]);

  /** 当前步采用的 α 文案（预设 vs 自定义） */
  const alphaNote =
    state.alpha.trim() === ''
      ? `预设 α = ${formatNumber(ALPHA_PRESET[state.buildingType] ?? 1.5)}（按建筑类型）`
      : '自定义覆盖 α';

  // —— 各步结果集 ——
  const step1Results: CalcResult[] = [
    res('flowLps', '设计秒流量 q_g', demand.flowLps, 'L/s', { highlight: true }),
    res('flowM3h', '等同流量', demand.flowM3h, 'm³/h'),
    res('ng', '当量总数 N_g', demand.ng, '', { copyable: false }),
    res('alpha', '采用的 α', demand.alpha, '', { copyable: false, note: alphaNote }),
  ];

  const step2Results: CalcResult[] = [
    res(
      'recommendedDn',
      '推荐公称直径 DN',
      pipe.recommendedDn !== null ? `DN${pipe.recommendedDn}` : '超出常用范围',
      '',
      { highlight: true },
    ),
    res('actualVelocity', '实际流速', pipe.actualVelocity, 'm/s', { highlight: true }),
    res('computedDiaMm', '理论所需内径', pipe.computedDiaMm, 'mm'),
    res('recommendedId', '推荐 DN 内径', pipe.recommendedId, 'mm'),
    res('velocity', '采用流速', pipe.velocity, 'm/s', { copyable: false }),
  ];

  const step3Results: CalcResult[] = [
    res('totalHead', '所需扬程 H', head.totalHead, 'm', { highlight: true }),
    res('frictionLoss', '沿程损失 Σh_f', head.frictionLoss, 'm'),
    res('staticHead', '几何高差', head.staticHead, 'm', { copyable: false }),
    res('localLoss', '局部损失 Σh_j', head.localLoss, 'm', { copyable: false }),
    res('freeHead', '自由水头', head.freeHead, 'm', { copyable: false }),
  ];

  const step4Results: CalcResult[] = [
    res('shaftPowerKw', '水泵轴功率 P', power.shaftPowerKw, 'kW', { highlight: true }),
    res('motorPowerKw', '建议配套功率', power.motorPowerKw, 'kW', { highlight: true }),
    res(
      'standardMotorKw',
      '就近标准电机功率',
      power.standardMotorKw !== null ? power.standardMotorKw : '超出常用档',
      power.standardMotorKw !== null ? 'kW' : '',
      { copyable: false },
    ),
    res('efficiency', '采用效率 η', power.efficiency, '', { copyable: false }),
    res('flow', '流量', power.flow, 'm³/h', { copyable: false }),
    res('head', '扬程', power.head, 'm', { copyable: false }),
  ];

  /** 汇总卡片四项关键结果 */
  const summaryResults: CalcResult[] = [
    res('sumFlow', '设计秒流量 q_g', demand.flowLps, 'L/s', { highlight: true }),
    res(
      'sumDn',
      '推荐管径',
      pipe.recommendedDn !== null ? `DN${pipe.recommendedDn}` : '超出常用范围',
      '',
      { highlight: true },
    ),
    res('sumHead', '所需扬程 H', head.totalHead, 'm', { highlight: true }),
    res('sumPower', '水泵轴功率 P', power.shaftPowerKw, 'kW', { highlight: true }),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部步骤条：4 个按钮，当前步高亮 */}
      <nav
        aria-label={`${tool.title}步骤导航`}
        className="flex items-stretch gap-1 overflow-x-auto rounded border border-border bg-surface p-1"
      >
        {STEPS.map((item) => {
          const selected = item.step === activeStep;
          return (
            <button
              key={item.step}
              type="button"
              aria-current={selected ? 'step' : undefined}
              aria-label={item.label}
              onClick={() => goStep(item.step)}
              className={[
                'min-h-touch shrink-0 whitespace-nowrap rounded px-3 text-sm font-medium ne-focus transition',
                selected
                  ? 'bg-surface-2 text-fg ring-1 ring-accent'
                  : 'bg-transparent text-muted hover:text-fg',
              ].join(' ')}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* 汇总卡：始终展示四步关键结果 */}
      <ResultCard results={summaryResults} title="汇总（q_g · DN · H · P）" />

      {/* ═══════════ 第 1 步：当量 → 秒流量 ═══════════ */}
      {activeStep === 1 && (
        <>
          <Card title="① 输入：卫生器具当量总数与建筑类型">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="卫生器具给水当量总数 N_g">
                <Input
                  type="number"
                  value={state.ng}
                  onValueChange={(v) => update('ng', v)}
                  min={0}
                  step={0.5}
                />
              </Field>
              <Field label="建筑类型（取默认 α）">
                <Select
                  ariaLabel="建筑类型（取默认 α）"
                  value={state.buildingType}
                  onValueChange={(v) => update('buildingType', v as WaterBuildingType)}
                  options={BUILDING_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                />
              </Field>
              <Field label="系数 α（覆盖默认，留空用预设）" help="留空则按建筑类型取默认 α；已知 α 可直接填写覆盖">
                <Input
                  type="number"
                  value={state.alpha}
                  onValueChange={(v) => update('alpha', v)}
                  min={0}
                  step={0.1}
                  placeholder={`默认 ${formatNumber(ALPHA_PRESET[state.buildingType] ?? 1.5)}`}
                />
              </Field>
            </div>
          </Card>
          <ResultCard results={step1Results} title="① 结果：设计秒流量" />
        </>
      )}

      {/* ═══════════ 第 2 步：流量 → 管径 ═══════════ */}
      {activeStep === 2 && (
        <>
          <Card title="② 输入：推荐流速（流量来自第 1 步）">
            <p className="mb-2 px-1 text-xs text-muted">
              上一步输出：q_g = {formatNumber(demand.flowLps)} L/s（{formatNumber(demand.flowM3h)} m³/h）
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="推荐流速">
                <Input
                  type="number"
                  value={state.velocity}
                  onValueChange={(v) => update('velocity', v)}
                  unit="m/s"
                  min={0.1}
                  step={0.1}
                />
              </Field>
            </div>
          </Card>
          <ResultCard results={step2Results} title="② 结果：管径选择" />
        </>
      )}

      {/* ═══════════ 第 3 步：管路 → 扬程 ═══════════ */}
      {activeStep === 3 && (
        <>
          <Card title="③ 输入：管路参数">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="几何高差 H_几何">
                <Input
                  type="number"
                  value={state.staticHead}
                  onValueChange={(v) => update('staticHead', v)}
                  unit="m"
                  min={0}
                />
              </Field>
              <Field label="管路总长度">
                <Input
                  type="number"
                  value={state.pipeLength}
                  onValueChange={(v) => update('pipeLength', v)}
                  unit="m"
                  min={0}
                />
              </Field>
              <Field label="单位长度沿程损失">
                <Input
                  type="number"
                  value={state.frictionPerMeter}
                  onValueChange={(v) => update('frictionPerMeter', v)}
                  unit="m/m"
                  min={0}
                  step={0.005}
                />
              </Field>
              <Field label="局部损失 Σh_j">
                <Input
                  type="number"
                  value={state.localLoss}
                  onValueChange={(v) => update('localLoss', v)}
                  unit="m"
                  min={0}
                />
              </Field>
              <Field label="末端自由水头 H_自由">
                <Input
                  type="number"
                  value={state.freeHead}
                  onValueChange={(v) => update('freeHead', v)}
                  unit="m"
                  min={0}
                />
              </Field>
            </div>
          </Card>
          <ResultCard results={step3Results} title="③ 结果：所需扬程" />
        </>
      )}

      {/* ═══════════ 第 4 步：流量 + 扬程 → 轴功率 ═══════════ */}
      {activeStep === 4 && (
        <>
          <Card title="④ 输入：水泵效率与裕量（流量、扬程来自前几步）">
            <p className="mb-2 px-1 text-xs text-muted">
              上游输出：Q = {formatNumber(demand.flowM3h)} m³/h，H = {formatNumber(head.totalHead)} m
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="水泵效率 η">
                <Input
                  type="number"
                  value={state.efficiency}
                  onValueChange={(v) => update('efficiency', v)}
                  min={0.1}
                  max={1}
                  step={0.01}
                />
              </Field>
              <Field label="电机裕量系数">
                <Input
                  type="number"
                  value={state.margin}
                  onValueChange={(v) => update('margin', v)}
                  min={1}
                  step={0.05}
                />
              </Field>
            </div>
          </Card>
          <ResultCard results={step4Results} title="④ 结果：轴功率与配套功率" />
        </>
      )}

      {/* 底部步骤导航：上一步 / 下一步 */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={() => goStep(activeStep - 1)}
          disabled={activeStep <= 1}
        >
          上一步
        </Button>
        <span className="text-xs text-muted">
          第 {activeStep} / {STEPS.length} 步
        </span>
        <Button
          variant="primary"
          onClick={() => goStep(activeStep + 1)}
          disabled={activeStep >= STEPS.length}
        >
          下一步
        </Button>
      </div>

      {/* 结果区统一免责入口：与关于页 #/about#disclaimer 保持同一口径 */}
      <p className="px-1 text-xs leading-relaxed text-muted">
        结果为方案阶段工程估算，含经验系数与简化假设，不作为施工图设计、采购、验收或安全校验依据；
        <Link
          to="/about#disclaimer"
          className="ne-focus ml-1 underline decoration-dotted underline-offset-2"
        >
          查看完整免责声明 →
        </Link>
      </p>
    </div>
  );
}
