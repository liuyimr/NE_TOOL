/**
 * 一次性 PWA 图标生成脚本（零新增依赖，仅使用 Node 内置 zlib + fs）
 * 生成 public/icons/pwa-192.png 与 pwa-512.png —— GitHub 暗色底 + 主色环形「工具箱」意象。
 * 用法：node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 调色板（与 src/index.css 的 GitHub 暗色一致）
const BG = [0x0d, 0x11, 0x17, 0xff];
const ACCENT = [0x58, 0xa6, 0xff, 0xff];
const BORDER = [0x30, 0x36, 0x3d, 0xff];

/** 生成 CRC32 查表 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** 计算一段 Buffer 的 CRC32 */
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** 组装一个 PNG 数据块（length + type + data + crc） */
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * 绘制图标像素（RGBA）
 * 图案：圆角方底 + 主色圆环 + 中心点 + 上下左右四个主色刻度（工具箱/瞄准意象）。
 */
function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const ringOuter = size * 0.30;
  const ringInner = size * 0.22;
  const dotR = size * 0.07;
  const margin = size * 0.06;
  const corner = size * 0.16;

  const setPx = (x, y, rgba) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = rgba[0];
    px[i + 1] = rgba[1];
    px[i + 2] = rgba[2];
    px[i + 3] = rgba[3];
  };

  // 圆角矩形判定（含抗锯齿的简化版：用距离阈值）
  const inRounded = (x, y) => {
    const rx = Math.max(margin + corner - x, x - (size - margin - corner), 0);
    const ry = Math.max(margin + corner - y, y - (size - margin - corner), 0);
    if (x < margin || y < margin || x > size - margin || y > size - margin) return false;
    return Math.hypot(rx, ry) <= corner;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x + 0.5;
      const fy = y + 0.5;
      if (!inRounded(fx, fy)) {
        setPx(x, y, [0, 0, 0, 0]);
        continue;
      }
      let color = BG;
      // 内描边
      if (!inRounded(fx - size * 0.02, fy) || !inRounded(fx, fy - size * 0.02)) {
        color = BORDER;
      }
      const dist = Math.hypot(fx - cx, fy - cy);
      // 圆环
      if (dist <= ringOuter && dist >= ringInner) {
        color = ACCENT;
      }
      // 中心点
      if (dist <= dotR) {
        color = ACCENT;
      }
      // 四个刻度
      const tickW = size * 0.035;
      const tickLen = size * 0.07;
      const nearAxisX = Math.abs(fx - cx) <= tickW;
      const nearAxisY = Math.abs(fy - cy) <= tickW;
      if (nearAxisX && Math.abs(fy - cy) >= ringOuter && Math.abs(fy - cy) <= ringOuter + tickLen) {
        color = ACCENT;
      }
      if (nearAxisY && Math.abs(fx - cx) >= ringOuter && Math.abs(fx - cx) <= ringOuter + tickLen) {
        color = ACCENT;
      }
      setPx(x, y, color);
    }
  }
  return px;
}

/** 将 RGBA 像素编码为 PNG Buffer */
function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter type = None
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const png = encodePng(size, drawIcon(size));
  const file = resolve(outDir, `pwa-${size}.png`);
  writeFileSync(file, png);
  // eslint-disable-next-line no-console
  console.log(`生成 ${file} (${png.length} bytes)`);
}
