// Local, deterministic screening of provider output. This is NOT spelling verification: it rejects
// unreadable files, wrong sizes, blank/over-filled images, colourful scenes or mockups, artwork
// touching the edges, and near-identical duplicates. Arabic correctness remains a human/customer check.
import { decodePng } from './png.mjs';

export const SCREEN_DEFAULTS = {
  width: 1024, height: 1024, maxBytes: 8 * 1024 * 1024,
  minInk: 0.004, maxInk: 0.5, maxColourful: 0.03, maxEdgeInk: 0.002, edgeFraction: 0.02, duplicateDistance: 4,
};

function greyscale({ width, height, channels, pixels }) {
  const g = new Uint8Array(width * height); let colourful = 0;
  for (let i = 0, p = 0; i < g.length; i++, p += channels) {
    let r, gg, b, a = 255;
    if (channels <= 2) { r = gg = b = pixels[p]; if (channels === 2) a = pixels[p + 1]; }
    else { r = pixels[p]; gg = pixels[p + 1]; b = pixels[p + 2]; if (channels === 4) a = pixels[p + 3]; }
    // Composite over white so transparent areas count as background.
    r = (r * a + 255 * (255 - a)) / 255; gg = (gg * a + 255 * (255 - a)) / 255; b = (b * a + 255 * (255 - a)) / 255;
    if (Math.max(r, gg, b) - Math.min(r, gg, b) > 60) colourful++;
    g[i] = (r * 299 + gg * 587 + b * 114) / 1000;
  }
  return { g, colourful: colourful / g.length };
}

// 64-bit difference hash on a 9x8 area-averaged thumbnail, as a 16-char hex string.
export function dHash(g, width, height) {
  const cells = new Float64Array(72), counts = new Uint32Array(72);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const c = Math.min(7, (y * 8 / height) | 0) * 9 + Math.min(8, (x * 9 / width) | 0);
    cells[c] += g[y * width + x]; counts[c]++;
  }
  let bits = 0n;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const a = cells[r * 9 + c] / counts[r * 9 + c], b = cells[r * 9 + c + 1] / counts[r * 9 + c + 1];
    bits = (bits << 1n) | (a > b ? 1n : 0n);
  }
  return bits.toString(16).padStart(16, '0');
}
export function hamming(a, b) {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b), n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

export function screenImage(buf, opts = {}) {
  const o = { ...SCREEN_DEFAULTS, ...opts };
  if (!Buffer.isBuffer(buf) || buf.length > o.maxBytes) return { ok: false, reason: 'TOO_LARGE' };
  let img;
  try { img = decodePng(buf); } catch { return { ok: false, reason: 'UNREADABLE' }; }
  if (img.width !== o.width || img.height !== o.height) return { ok: false, reason: 'WRONG_SIZE' };
  const { g, colourful } = greyscale(img);
  let ink = 0, edgeInk = 0, edgeTotal = 0;
  const ex = Math.max(1, Math.round(img.width * o.edgeFraction)), ey = Math.max(1, Math.round(img.height * o.edgeFraction));
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const dark = g[y * img.width + x] < 128;
    if (dark) ink++;
    if (x < ex || y < ey || x >= img.width - ex || y >= img.height - ey) { edgeTotal++; if (dark) edgeInk++; }
  }
  const metrics = { ink: ink / g.length, colourful, edgeInk: edgeInk / edgeTotal, dhash: dHash(g, img.width, img.height) };
  if (metrics.ink < o.minInk) return { ok: false, reason: 'BLANK', metrics };
  if (metrics.ink > o.maxInk) return { ok: false, reason: 'OVERFILLED', metrics };
  if (metrics.colourful > o.maxColourful) return { ok: false, reason: 'NOT_MONOCHROME', metrics };
  if (metrics.edgeInk > o.maxEdgeInk) return { ok: false, reason: 'TOUCHES_EDGE', metrics };
  return { ok: true, metrics };
}

// Returns the closest earlier hash distance, so callers can hide near-identical repeats.
export function nearestDistance(hash, earlier) {
  let best = 64;
  for (const h of earlier) if (h) best = Math.min(best, hamming(hash, h));
  return best;
}
