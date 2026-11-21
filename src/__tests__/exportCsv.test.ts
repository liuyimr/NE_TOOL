import { describe, expect, it } from 'vitest';
import { csvFilename, downloadCsv, formatTimestamp, toCsv, type CsvRow } from '@/lib/exportCsv';

/**
 * CSV 导出测试
 * 覆盖：BOM、元信息与表头、逗号/引号/换行转义、空 rows、中文、文件名清洗与时间格式、
 * 以及无 DOM 环境下 downloadCsv 的静默降级。
 */
const META = { tool: 'VRV 多联机配比与管长校核', time: '2026-11-22 10:30' };

describe('toCsv', () => {
  it('以 UTF-8 BOM 开头，含工具与导出时间两行、空行、表头', () => {
    const csv = toCsv([{ label: '容量配比', value: 1.07, unit: '%' }], META);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('工具,VRV 多联机配比与管长校核');
    expect(lines[1]).toBe('导出时间,2026-11-22 10:30');
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe('项目,数值,单位');
    expect(lines[4]).toBe('容量配比,1.07,%');
  });

  it('空 rows 仍输出元信息与表头', () => {
    const csv = toCsv([], META);
    const lines = csv.slice(1).split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[3]).toBe('项目,数值,单位');
  });

  it('字段含逗号时用双引号包裹', () => {
    const rows: CsvRow[] = [{ label: '冷量,热量', value: 12, unit: 'kW' }];
    const csv = toCsv(rows, META);
    expect(csv).toContain('"冷量,热量",12,kW');
  });

  it('字段含双引号时内部引号翻倍', () => {
    const rows: CsvRow[] = [{ label: '1/2.7" 靶面', value: '—' }];
    const csv = toCsv(rows, META);
    expect(csv).toContain('"1/2.7"" 靶面",—,');
  });

  it('字段含换行时用双引号包裹并可跨行', () => {
    const rows: CsvRow[] = [{ label: '第一行\n第二行', value: 1 }];
    const csv = toCsv(rows, META);
    expect(csv).toContain('"第一行\n第二行",1,');
  });

  it('中文与数字格式正常，缺省单位输出空字段', () => {
    const rows: CsvRow[] = [
      { label: '综合校核结论', value: '通过 ✅' },
      { label: '压降百分比', value: 7.29, unit: '%' },
    ];
    const csv = toCsv(rows, META);
    expect(csv).toContain('综合校核结论,通过 ✅,');
    expect(csv).toContain('压降百分比,7.29,%');
  });
});

describe('csvFilename', () => {
  it('形如 <tool>-YYYYMMDD-HHmm.csv 并去掉非法字符', () => {
    const date = new Date(2026, 10, 22, 9, 5, 0); // 2026-11-22 09:05
    expect(csvFilename('IP 子网计算器', date)).toBe('IP 子网计算器-20261122-0905.csv');
    expect(csvFilename('a/b\\c:d*e?f"g<h>i|j', date)).toBe('abcdefghij-20261122-0905.csv');
  });

  it('去掉首尾空格；清洗后为空时退化为 tool', () => {
    const date = new Date(2026, 0, 2, 3, 4, 0);
    expect(csvFilename('  压降  ', date)).toBe('压降-20260102-0304.csv');
    expect(csvFilename('   ', date)).toBe('tool-20260102-0304.csv');
  });
});

describe('formatTimestamp', () => {
  it('输出本地 YYYY-MM-DD HH:mm', () => {
    expect(formatTimestamp(new Date(2026, 10, 22, 8, 7, 0))).toBe('2026-11-22 08:07');
  });
});

describe('downloadCsv 降级', () => {
  it('无 DOM 环境（node）下不抛错', () => {
    expect(() => downloadCsv('x.csv', 'a,b')).not.toThrow();
  });
});
