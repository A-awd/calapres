// Content-addressed, write-once storage for generated originals. A file is named by the SHA-256 of
// its exact bytes, written via temp file + fsync + rename, and re-verified on every read, so the
// bytes served to production are provably the bytes the customer saw.
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, openSync, writeSync, fsyncSync, closeSync, renameSync, readFileSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const DIGEST = /^[0-9a-f]{64}$/;

export class AssetStore {
  constructor(dir) {
    this.dir = dir; mkdirSync(dir, { recursive: true });
  }
  path(digest) {
    if (!DIGEST.test(digest)) throw Error('BAD_DIGEST');
    return join(this.dir, digest.slice(0, 2), `${digest}.png`);
  }
  put(buf) {
    const digest = sha256(buf), final = this.path(digest);
    if (existsSync(final)) { this.get(digest); return digest; } // identical bytes already stored and intact
    const sub = join(this.dir, digest.slice(0, 2)); mkdirSync(sub, { recursive: true });
    const tmp = join(sub, `.${digest}.${randomBytes(6).toString('hex')}.tmp`);
    const fd = openSync(tmp, 'wx', 0o640);
    try { writeSync(fd, buf); fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(tmp, final);
    const dfd = openSync(sub, 'r'); try { fsyncSync(dfd); } finally { closeSync(dfd); }
    return digest;
  }
  get(digest) {
    const buf = readFileSync(this.path(digest));
    if (sha256(buf) !== digest) throw Error('ASSET_CORRUPT');
    return buf;
  }
  has(digest) { try { return statSync(this.path(digest)).isFile(); } catch { return false; } }
  remove(digest) { try { unlinkSync(this.path(digest)); } catch {} }
}
