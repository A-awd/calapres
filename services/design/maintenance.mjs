#!/usr/bin/env node
// Operator tool. Uses the same DATA_DIR as the server; safe while the server runs (SQLite WAL).
//   node maintenance.mjs status
//   node maintenance.mjs backup <dir>                 consistent ledger snapshot (VACUUM INTO) + originals manifest
//   node maintenance.mjs prune --older-than-days N [--apply]
//                                                     unordered originals older than N days; dry run by default
//   node maintenance.mjs halt <reason> | resume       stop / allow new paid batches
//   node maintenance.mjs calls [N]                     last N per-image outcomes (job prefix, slot, outcome, safe code)
// Never prints secrets, names or customer data.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Ledger } from './ledger.mjs';
import { AssetStore } from './store.mjs';

const dataDir = process.env.DATA_DIR || './data';
const [cmd, ...args] = process.argv.slice(2);
const ledger = new Ledger(join(dataDir, 'ledger.sqlite'));
const store = new AssetStore(join(dataDir, 'originals'));
const out = (o) => console.log(JSON.stringify(o, null, 2));
try {
  if (cmd === 'status') {
    const jobs = Object.fromEntries(ledger.all('SELECT state, count(*) n FROM jobs GROUP BY state').map((r) => [r.state, r.n]));
    out({ halted: ledger.halted(), committedMicros: ledger.committedMicros(), jobs,
      designs: ledger.one('SELECT count(*) n FROM designs').n, ordered: ledger.one('SELECT count(*) n FROM designs WHERE ordered_at IS NOT NULL').n,
      orderChecks: Object.fromEntries(ledger.all('SELECT status, count(*) n FROM order_checks GROUP BY status').map((r) => [r.status, r.n])),
      lease: ledger.one('SELECT expires FROM lease WHERE id=1') || null });
  } else if (cmd === 'calls') {
    const n = Math.min(200, Math.max(1, Number(args[0]) || 30));
    out(ledger.all(`SELECT substr(c.job,1,8) job, c.slot, c.outcome, c.detail, c.output_tokens outputTokens, c.created FROM calls c ORDER BY c.id DESC LIMIT ${n}`)
      .map((r) => ({ ...r, created: new Date(r.created).toISOString() })));
  } else if (cmd === 'backup') {
    const dir = resolve(args[0] || ''); if (!args[0]) throw Error('usage: backup <dir>');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `ledger-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
    if (existsSync(file)) throw Error('backup file exists');
    ledger.db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    const digests = ledger.all('SELECT DISTINCT sha256 FROM designs').map((r) => r.sha256);
    const missing = digests.filter((d) => !store.has(d));
    writeFileSync(file + '.originals.txt', digests.join('\n') + '\n');
    out({ ledger: file, originalsListed: digests.length, missingOriginals: missing.length,
      next: 'copy DATA_DIR/originals/ (write-once, safe to rsync while running) alongside this snapshot' });
    if (missing.length) process.exitCode = 1;
  } else if (cmd === 'prune') {
    const i = args.indexOf('--older-than-days'), days = Number(args[i + 1]);
    if (i < 0 || !Number.isInteger(days) || days < 30) throw Error('usage: prune --older-than-days N (N >= 30) [--apply]');
    const digests = ledger.prunableDigests(Date.now() - days * 86_400_000);
    if (args.includes('--apply')) for (const d of digests) store.remove(d);
    out({ candidates: digests.length, applied: args.includes('--apply'),
      note: 'Only originals never referenced by a verified order and created before the cutoff. Ledger rows are kept.' });
  } else if (cmd === 'halt') {
    ledger.halt(args.join(' ') || 'operator'); out({ halted: ledger.halted() });
  } else if (cmd === 'resume') {
    ledger.resume(); out({ halted: ledger.halted() });
  } else {
    console.error('usage: status | calls [N] | backup <dir> | prune --older-than-days N [--apply] | halt <reason> | resume'); process.exitCode = 2;
  }
} catch (e) { console.error(e.message); process.exitCode = 2; }
finally { ledger.close(); }
