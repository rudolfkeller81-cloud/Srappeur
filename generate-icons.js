'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function makePNG(size) {
  const w = size, h = size;
  const raw = Buffer.alloc(w * h * 4);

  const cx = w / 2, cy = h / 2;
  const padding = size * 0.15; // marge pour que Chrome ne coupe pas les bords
  const maxR = (size / 2) - padding;
  const radii = [maxR * (1 / 3), maxR * (2 / 3), maxR];
  const sw = size * 0.07;

  function distToRing(x, y, r) {
    return Math.abs(Math.hypot(x - cx, y - cy) - r);
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dist = Math.hypot(x - cx, y - cy);
      const t = Math.min(1, dist / maxR);

      // Couleur du gradient radial
      const cr = Math.round(79  + (124 - 79)  * t);
      const cg = Math.round(110 + (58  - 110) * t);
      const cb = Math.round(247 + (237 - 247) * t);

      // Distance minimale à l'un des 3 anneaux
      const minDist = Math.min(...radii.map(r => distToRing(x, y, r)));
      const half = sw / 2;

      if (minDist <= half) {
        raw[i]   = cr;
        raw[i+1] = cg;
        raw[i+2] = cb;
        raw[i+3] = 255;
      } else if (minDist < half + 1.5) {
        const aa = 1 - (minDist - half) / 1.5;
        raw[i]   = cr;
        raw[i+1] = cg;
        raw[i+2] = cb;
        raw[i+3] = Math.round(aa * 255);
      } else {
        raw[i+3] = 0; // transparent
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
    const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])) >>> 0);
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
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), makePNG(size));
  console.log(`✓ icon-${size}.png`);
});
console.log('Done!');
