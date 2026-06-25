'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function makePNG(size) {
  const w = size, h = size;
  const raw = Buffer.alloc(w * h * 4);

  const rx = Math.round(size * 0.215); // border-radius proportionnel

  // Loupe : cercle centre + handle
  const cx = Math.round(w * 0.449), cy = Math.round(h * 0.449), r = Math.round(w * 0.234);
  const sw = Math.round(w * 0.070); // stroke width
  const lx1 = Math.round(w * 0.625), ly1 = Math.round(h * 0.625);
  const lx2 = Math.round(w * 0.801), ly2 = Math.round(h * 0.801);

  function inRoundedRect(x, y) {
    if (x < rx) {
      if (y < rx) return Math.hypot(x - rx, y - rx) <= rx;
      if (y > h - rx) return Math.hypot(x - rx, y - (h - rx)) <= rx;
    }
    if (x > w - rx) {
      if (y < rx) return Math.hypot(x - (w - rx), y - rx) <= rx;
      if (y > h - rx) return Math.hypot(x - (w - rx), y - (h - rx)) <= rx;
    }
    return true;
  }

  function distToCircleEdge(x, y) {
    return Math.abs(Math.hypot(x - cx, y - cy) - r);
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      if (!inRoundedRect(x, y)) {
        raw[i+3] = 0;
        continue;
      }

      // Gradient fond
      const t = (x + y) / (w + h);
      const bg_r = Math.round(79  + (124 - 79)  * t);
      const bg_g = Math.round(110 + (58  - 110) * t);
      const bg_b = Math.round(247 + (237 - 247) * t);

      // Loupe : anneau
      const dc = distToCircleEdge(x, y);
      // Handle
      const dl = distToSegment(x, y, lx1, ly1, lx2, ly2);

      const halfSW = sw / 2;
      const inStroke = dc <= halfSW || dl <= halfSW;

      // Anti-aliasing simple
      const aa = Math.max(0, 1 - Math.min(dc, dl) / (halfSW + 1));

      if (inStroke) {
        // Blanc
        raw[i]   = 255;
        raw[i+1] = 255;
        raw[i+2] = 255;
        raw[i+3] = 255;
      } else if (aa > 0 && Math.min(dc, dl) < halfSW + 2) {
        const a = Math.round(aa * 255);
        raw[i]   = Math.round(bg_r + (255 - bg_r) * aa);
        raw[i+1] = Math.round(bg_g + (255 - bg_g) * aa);
        raw[i+2] = Math.round(bg_b + (255 - bg_b) * aa);
        raw[i+3] = 255;
      } else {
        raw[i]   = bg_r;
        raw[i+1] = bg_g;
        raw[i+2] = bg_b;
        raw[i+3] = 255;
      }
    }
  }

  const filtered = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    filtered[y * (1 + w * 4)] = 0;
    raw.copy(filtered, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }

  const compressed = zlib.deflateSync(filtered, { level: 6 });

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();

  function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeB, data]);
    const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(crcBuf) >>> 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const outDir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

[192, 512].forEach(size => {
  const png = makePNG(size);
  const out = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ icon-${size}.png`);
});

console.log('Done!');
