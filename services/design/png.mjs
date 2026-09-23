// Minimal dependency-free PNG reader/writer used for screening provider output and in tests.
// Supports 8-bit, non-interlaced greyscale, RGB, greyscale+alpha and RGBA — what image APIs emit.
import { deflateSync, inflateSync, crc32 } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

export function readPngHeader(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 33 || !buf.subarray(0, 8).equals(SIG) || buf.toString('latin1', 12, 16) !== 'IHDR') throw Error('NOT_PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bitDepth: buf[24], colorType: buf[25], interlace: buf[28] };
}

export function decodePng(buf, { maxPixels = 4096 * 4096 } = {}) {
  const h = readPngHeader(buf);
  const ch = CHANNELS[h.colorType];
  if (h.bitDepth !== 8 || !ch || h.interlace !== 0 || !h.width || !h.height || h.width * h.height > maxPixels) throw Error('UNSUPPORTED_PNG');
  const idat = []; let off = 8, ended = false;
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('latin1', off + 4, off + 8);
    if (off + 12 + len > buf.length) throw Error('TRUNCATED_PNG');
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
    if (type === 'IEND') { ended = true; break; }
    off += 12 + len;
  }
  if (!ended || !idat.length) throw Error('TRUNCATED_PNG');
  const stride = h.width * ch;
  const raw = inflateSync(Buffer.concat(idat), { maxOutputLength: (stride + 1) * h.height });
  if (raw.length !== (stride + 1) * h.height) throw Error('TRUNCATED_PNG');
  const px = Buffer.alloc(stride * h.height);
  for (let y = 0; y < h.height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[dst + x - ch] : 0, b = y ? px[dst - stride + x] : 0, c = x >= ch && y ? px[dst - stride + x - ch] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (f !== 0) throw Error('BAD_FILTER');
      px[dst + x] = v & 255;
    }
  }
  return { width: h.width, height: h.height, channels: ch, pixels: px };
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'latin1'); data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])) >>> 0, 8 + data.length);
  return out;
}
export function encodePng({ width, height, channels, pixels }) {
  const colorType = { 1: 0, 3: 2, 2: 4, 4: 6 }[channels];
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = colorType;
  const stride = width * channels, raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
