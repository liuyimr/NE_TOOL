import { describe, expect, it } from 'vitest';
import {
  WORD_ORDERS,
  describeWordOrders,
  parseHexBytes4,
  type WordOrder,
  type WordOrderResult,
} from '@/lib/calc/wordOrder';

/**
 * 字序（32 位数据字节排列）单元测试
 * ------------------------------------------------------------------
 * 语义（输入字节书写顺序记为 B0 B1 B2 B3，即字母 A B C D）：
 *   ABCD = 原序 [B0,B1,B2,B3]；CDAB = 字交换 [B2,B3,B0,B1]
 *   BADC = 字节交换 [B1,B0,B3,B2]；DCBA = 全反 [B3,B2,B1,B0]
 * 重排后一律按大端解释 uint32，再派生 int32 / float32。
 */
describe('parseHexBytes4', () => {
  it('接受紧凑 / 空格分隔 / 0x 前缀三种写法', () => {
    expect(parseHexBytes4('3F800000')).toEqual([0x3f, 0x80, 0x00, 0x00]);
    expect(parseHexBytes4('3F 80 00 00')).toEqual([0x3f, 0x80, 0x00, 0x00]);
    expect(parseHexBytes4('0x3F800000')).toEqual([0x3f, 0x80, 0x00, 0x00]);
    expect(parseHexBytes4('  0X3f800000  ')).toEqual([0x3f, 0x80, 0x00, 0x00]);
  });

  it('大小写不敏感', () => {
    expect(parseHexBytes4('deadbeef')).toEqual([0xde, 0xad, 0xbe, 0xef]);
    expect(parseHexBytes4('DEADBEEF')).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it('非 4 字节 / 含非十六进制字符 / 空串 → null', () => {
    expect(parseHexBytes4('3F8000')).toBeNull(); // 3 字节
    expect(parseHexBytes4('3F80000000')).toBeNull(); // 5 字节
    expect(parseHexBytes4('3F80G000')).toBeNull(); // 非 hex 字符
    expect(parseHexBytes4('3F-80-00-00')).toBeNull(); // 分隔符非法
    expect(parseHexBytes4('')).toBeNull();
    expect(parseHexBytes4('   ')).toBeNull();
    expect(parseHexBytes4('0x')).toBeNull();
  });
});

describe('describeWordOrders', () => {
  it('3F800000（float 1.0）在四种字序下的重排结果', () => {
    const rows = describeWordOrders('3F800000');
    expect(rows).not.toBeNull();
    const list = rows ?? [];
    const byOrder = new Map<WordOrder, WordOrderResult>(list.map((r) => [r.order, r]));

    // ABCD 原序：大端 0x3F800000 = 1065353216，float 恰为 1
    expect(byOrder.get('ABCD')).toEqual({
      order: 'ABCD',
      hex: '3F800000',
      uint32: 1065353216,
      int32: 1065353216,
      float32: 1,
    });

    // CDAB 字交换 [00,00,3F,80]
    const cdab = byOrder.get('CDAB');
    expect(cdab?.hex).toBe('00003F80');
    expect(cdab?.uint32).toBe(0x00003f80);
    expect(cdab?.int32).toBe(0x00003f80);

    // BADC 字节交换 [80,3F,00,00]
    const badc = byOrder.get('BADC');
    expect(badc?.hex).toBe('803F0000');
    expect(badc?.uint32).toBe(0x803f0000);
    expect(badc?.int32).toBe(0x803f0000 | 0); // 最高位为 1 → 负数

    // DCBA 全反 [00,00,80,3F]
    const dcba = byOrder.get('DCBA');
    expect(dcba?.hex).toBe('0000803F');
    expect(dcba?.uint32).toBe(32831);
    expect(dcba?.int32).toBe(32831);
  });

  it('返回顺序固定为 ABCD / CDAB / BADC / DCBA', () => {
    expect(WORD_ORDERS).toEqual(['ABCD', 'CDAB', 'BADC', 'DCBA']);
    const rows = describeWordOrders('3F800000') ?? [];
    expect(rows.map((r) => r.order)).toEqual(WORD_ORDERS);
  });

  it('3F800000 的 DCBA 是按小端读同一份内存 → uint32 32831（0x0000803F）', () => {
    const rows = describeWordOrders('3F800000') ?? [];
    const dcba = rows.find((r) => r.order === 'DCBA');
    expect(dcba?.uint32).toBe(parseInt('0000803F', 16));
    expect(dcba?.uint32).toBe(32831);
  });

  it('负零 / 负数：float32 按 IEEE754 解释（位模式 80000000 = -0）', () => {
    const rows = describeWordOrders('80000000') ?? [];
    const abcd = rows.find((r) => r.order === 'ABCD');
    expect(abcd?.uint32).toBe(2147483648);
    expect(abcd?.int32).toBe(-2147483648);
    expect(Object.is(abcd?.float32, -0)).toBe(true);
  });

  it('π 单精度 40490FDB → float32 ≈ 3.1415927', () => {
    const rows = describeWordOrders('40 49 0F DB') ?? [];
    const abcd = rows.find((r) => r.order === 'ABCD');
    expect(abcd?.float32).toBeCloseTo(3.1415927, 6);
    expect(abcd?.uint32).toBe(0x40490fdb);
    // 全反后按大端读是另一组字节：DB 0F 49 40
    expect(rows.find((r) => r.order === 'DCBA')?.hex).toBe('DB0F4940');
  });

  it('0x 前缀与空格写法给出与紧凑写法完全相同的结果', () => {
    const compact = describeWordOrders('3F800000');
    expect(describeWordOrders('0x3F800000')).toEqual(compact);
    expect(describeWordOrders('3F 80 00 00')).toEqual(compact);
  });

  it('非法输入 → null', () => {
    expect(describeWordOrders('')).toBeNull();
    expect(describeWordOrders('XYZ')).toBeNull();
    expect(describeWordOrders('123456')).toBeNull();
    expect(describeWordOrders('0x1234567890')).toBeNull();
  });
});
