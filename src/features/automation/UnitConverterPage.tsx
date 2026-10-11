import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '@/components/ui/Card';
import CopyButton from '@/components/ui/CopyButton';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import ResultCard from '@/components/ui/ResultCard';
import Select from '@/components/ui/Select';
import QuickRefTable from '@/components/QuickRefTable';
import { CATEGORIES, convertAll, listUnits } from '@/lib/engine/unitEngine';
import { buildToolHash } from '@/lib/url';
import type { CalcResult } from '@/types/calculator';
import type { ToolDef } from '@/types/tool';

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ label: c.label, value: c.id }));

/**
 * C5 常用工程单位换算 —— 类别/单位/因子注册式引擎的交互界面
 * 选择类别与源单位，输入数值，实时给出该类别下全部单位的换算结果。
 */
export default function UnitConverterPage({ tool }: { tool: ToolDef }): JSX.Element {
  const [searchParams] = useSearchParams();
  const [catId, setCatId] = useState<string>(searchParams.get('category') ?? CATEGORIES[0].id);
  const units = useMemo(() => listUnits(catId), [catId]);
  const [fromId, setFromId] = useState<string>(
    searchParams.get('from') ?? listUnits(CATEGORIES[0].id)[0]?.id ?? '',
  );
  const [value, setValue] = useState<string>(searchParams.get('value') ?? '1');

  // 切换类别后，若源单位不属于新类别，则回到该类别首个单位
  useEffect(() => {
    if (!units.some((u) => u.id === fromId)) {
      setFromId(units[0]?.id ?? '');
    }
  }, [units, fromId]);

  const numeric = Number(value);
  const inputValue = Number.isFinite(numeric) ? numeric : 0;

  const results = useMemo<CalcResult[]>(() => {
    if (!fromId) return [];
    let all: Record<string, number>;
    try {
      all = convertAll(catId, fromId, inputValue);
    } catch {
      return [{ key: 'error', label: '错误', value: '换算失败' }];
    }
    return units.map((u) => ({
      key: u.id,
      label: u.label,
      value: all[u.id],
      highlight: u.id === fromId,
    }));
  }, [catId, fromId, inputValue, units]);

  const shareUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
    return `${base}${buildToolHash(tool.id, { category: catId, from: fromId, value })}`;
  }, [tool.id, catId, fromId, value]);

  return (
    <div className="flex flex-col gap-4">
      <Card title="选择换算">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="单位类别">
            <Select ariaLabel="单位类别" value={catId} onValueChange={setCatId} options={CATEGORY_OPTIONS} />
          </Field>
          <Field label="源单位">
            <Select
              ariaLabel="源单位"
              value={fromId}
              onValueChange={setFromId}
              options={units.map((u) => ({ label: u.label, value: u.id }))}
            />
          </Field>
          <Field label="数值">
            <Input type="number" value={value} onValueChange={setValue} />
          </Field>
        </div>
        <div className="mt-3">
          <CopyButton text={shareUrl} label="分享链接" />
        </div>
      </Card>

      <ResultCard results={results} title="换算结果" />

      <QuickRefTable tableId="automation.unitFactors" />
    </div>
  );
}
