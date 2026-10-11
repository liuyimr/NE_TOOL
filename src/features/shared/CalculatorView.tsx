import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildToolHash } from '@/lib/url';
import type { CalcResult, FieldDef } from '@/types/calculator';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import CopyButton from '@/components/ui/CopyButton';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import ResultCard from '@/components/ui/ResultCard';
import Select from '@/components/ui/Select';
import QuickRefTable from '@/components/QuickRefTable';

export interface CalculatorViewProps {
  /** 工具 id（用于分享链接） */
  toolId: string;
  /** 输入字段定义 */
  fields: FieldDef[];
  /** 纯计算函数：表单值 → 结果 */
  run: (values: Record<string, string>) => CalcResult[];
  /** 需要附带展示的速查表 id 列表 */
  quickRefIds?: string[];
}

/** 由字段默认值与 URL 参数初始化表单 */
function initValues(fields: FieldDef[], fromUrl: Record<string, string>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const urlValue = fromUrl[field.key];
    values[field.key] =
      urlValue !== undefined && urlValue !== '' ? urlValue : String(field.default ?? '');
  }
  return values;
}

/**
 * 计算类工具的统一视图
 * ------------------------------------------------------------------
 * 表单（FieldDef 驱动）→ 调 run（纯函数）→ ResultCard 展示 + 一键复制；
 * 支持 URL 参数回填与「分享结果链接」。各计算类工具组件只需给出 fields + run。
 */
export default function CalculatorView({
  toolId,
  fields,
  run,
  quickRefIds,
}: CalculatorViewProps): JSX.Element {
  const [searchParams] = useSearchParams();
  const [values, setValues] = useState<Record<string, string>>(() =>
    initValues(fields, Object.fromEntries(searchParams)),
  );

  const results = useMemo<CalcResult[]>(() => {
    try {
      return run(values);
    } catch (e) {
      return [{ key: 'error', label: '错误', value: e instanceof Error ? e.message : '计算失败' }];
    }
  }, [values, run]);

  const shareUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
    const entries: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) if (v !== '') entries[k] = v;
    return `${base}${buildToolHash(toolId, entries)}`;
  }, [toolId, values]);

  function update(key: string, value: string): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function reset(): void {
    setValues(initValues(fields, {}));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="输入参数">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <Field key={field.key} label={field.label} help={field.help}>
              {field.type === 'select' || field.type === 'radio' ? (
                <Select
                  ariaLabel={field.label}
                  value={values[field.key] ?? ''}
                  onValueChange={(v) => update(field.key, v)}
                  options={(field.options ?? []).map((o) => ({
                    label: o.label,
                    value: String(o.value),
                  }))}
                />
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={values[field.key] ?? ''}
                  onValueChange={(v) => update(field.key, v)}
                  unit={field.unit}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                />
              )}
            </Field>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={reset}>
            重置
          </Button>
          <CopyButton text={shareUrl} label="分享链接" />
        </div>
      </Card>

      <ResultCard results={results} />

      {quickRefIds?.map((id) => (
        <QuickRefTable key={id} tableId={id} />
      ))}
    </div>
  );
}
