// Generates the PWA app icons (PNG) with no external dependencies.
// Draws a simple phone-with-green-screen mark on a dark background.
// Run with: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

// --- minimal PNG encoder (8-bit RGBA) ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc(size * (1 + stride));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + stride)] = 0; // filter: none
    rgba.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// --- drawing ---
function makeIcon(S) {
  const buf = Buffer.alloc(S * S * 4);
  const set = (x, y, [r, g, b, a = 255]) => {
    const i = (y * S + x) * 4;
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = a;
  };
  const bg = [10, 10, 10, 255]; // neutral-950
  const white = [244, 244, 245, 255];
  const green = [5, 150, 105, 255]; // emerald-600

  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) set(x, y, bg);

  const rrect = (x0, y0, x1, y1, rad, color) => {
    for (let y = Math.floor(y0); y < y1; y++) {
      for (let x = Math.floor(x0); x < x1; x++) {
        let inside = true;
        const cx0 = x0 + rad;
        const cy0 = y0 + rad;
        const cx1 = x1 - rad - 1;
        const cy1 = y1 - rad - 1;
        if (x < cx0 && y < cy0) inside = (x - cx0) ** 2 + (y - cy0) ** 2 <= rad * rad;
        else if (x > cx1 && y < cy0) inside = (x - cx1) ** 2 + (y - cy0) ** 2 <= rad * rad;
        else if (x < cx0 && y > cy1) inside = (x - cx0) ** 2 + (y - cy1) ** 2 <= rad * rad;
        else if (x > cx1 && y > cy1) inside = (x - cx1) ** 2 + (y - cy1) ** 2 <= rad * rad;
        if (inside) set(x, y, color);
      }
    }
  };

  // Phone body (kept within the maskable safe zone), then the green screen.
  rrect(S * 0.3, S * 0.16, S * 0.7, S * 0.84, S * 0.07, white);
  rrect(S * 0.34, S * 0.22, S * 0.66, S * 0.78, S * 0.04, green);
  return encodePng(S, buf);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, makeIcon(size));
  console.log(`wrote public/icons/icon-${size}.png`);
}
