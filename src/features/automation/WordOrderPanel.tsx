import { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import { WORD_ORDER_LABEL, describeWordOrders } from '@/lib/calc/wordOrder';

/** 浮点数展示：非有限值给出标记，其余压缩到 8 位有效数字后去尾零 */
function formatFloat(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
  if (value === 0) return Object.is(value, -0) ? '-0' : '0';
  return String(Number(value.toPrecision(8)));
}

/**
 * 字序（字节排列）四态对照面板
 * ------------------------------------------------------------------
 * 不套 CalculatorView：只有一个 HEX 输入 + 一张四行结果表，
 * 便于和上方 IEEE754 换算同屏对照（同一页面内的第 2 个结果区）。
 */
export default function WordOrderPanel(): JSX.Element {
  const [hex, setHex] = useState('3F800000');
  const rows = useMemo(() => describeWordOrders(hex), [hex]);

  return (
    <Card title="字序（字节排列）">
      <p className="mb-3 text-xs leading-relaxed text-muted">
        Modbus / PLC 32 位数据四种常见字节排列：ABCD=大端、DCBA=小端、CDAB=字交换、BADC=字节交换。
      </p>

      <Field label="4 字节十六进制">
        <Input
          type="text"
          value={hex}
          onValueChange={setHex}
          placeholder="如 3F800000 / 3F 80 00 00 / 0x3F800000"
          aria-label="4 字节十六进制"
        />
      </Field>

      {rows ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="whitespace-nowrap px-2 py-2 font-medium">字序</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">重排后 HEX</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">uint32</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">int32</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">float32</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.order} className="border-b border-border/60 last:border-b-0">
                  <td className="whitespace-nowrap px-2 py-2">
                    <span className="font-medium text-fg">{row.order}</span>
                    <span className="ml-1 text-xs text-muted">（{WORD_ORDER_LABEL[row.order]}）</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-fg">{row.hex}</td>
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-fg">{row.uint32}</td>
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-fg">{row.int32}</td>
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-fg">
                    {formatFloat(row.float32)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-warning">请输入 4 字节十六进制（8 位）</p>
      )}
    </Card>
  );
}
