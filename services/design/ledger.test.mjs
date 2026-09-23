import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Ledger } from './ledger.mjs';

const design = (i) => ({ id: 'd' + i, slot: i, sha256: String(i).padStart(64, '0'), version: 'v1', receipt: 'r', dhash: null });

test('refresh, repeat clicks, nine designs, rolling window and lifetime budget survive restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'calapres-design-test-')), path = join(dir, 'ledger.sqlite');
  let t = 1_000_000;
  let ledger = new Ledger(path, { budgetMicros: 400, batchReserveMicros: 100, now: () => t });
  try {
    assert.deepEqual(ledger.status('unknown'), { remaining: 9, pending: false, lastName: '', designs: [] }, 'status never creates sessions');
    const first = ledger.begin('s1', 'عبدالرحمن');
    assert.equal(first.created, true);
    assert.equal(ledger.begin('s1', 'اسم آخر').created, false, 'duplicate click reuses the pending job');
    assert.equal(ledger.status('s1').remaining, 6);
    ledger.addDesign(first.job, design(1)); ledger.finish(first.job.id, 'complete', 60);
    assert.equal(ledger.committedMicros(), 60, 'settled below reservation');
    for (let i = 0; i < 2; i++) { const n = ledger.begin('s1', 'عبدالرحمن'); ledger.finish(n.job.id, 'complete', i ? 100 : 40); }
    assert.equal(ledger.committedMicros(), 200);
    assert.throws(() => ledger.begin('s1', 'اسم جديد'), /LIMIT_REACHED/);
    ledger.close(); ledger = new Ledger(path, { budgetMicros: 400, batchReserveMicros: 100, now: () => t });
    assert.equal(ledger.status('s1').remaining, 0);
    assert.equal(ledger.status('s1').designs[0].id, 'd1');
    const other = ledger.begin('s2', 'سارة'); ledger.finish(other.job.id, 'failed');
    assert.equal(ledger.committedMicros(), 300, 'a failed job with unknown outcome keeps its full reservation');
    const over = ledger.begin('s3', 'سارة'); ledger.finish(over.job.id, 'complete', 250);
    assert.equal(ledger.committedMicros(), 550, 'observed overshoot above the reservation is recorded, not hidden');
    assert.throws(() => ledger.begin('s4', 'سارة'), /BUDGET_REACHED/);
    t += 86_400_001;
    assert.equal(ledger.status('s1').remaining, 9, 'rolling 24h window frees the session quota');
    assert.throws(() => ledger.begin('s1', 'سارة'), /BUDGET_REACHED/, 'but the lifetime budget does not reset');
    assert.equal(ledger.canAfford(), false);
  } finally { ledger.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('zero budget never authorizes generation', () => {
  const ledger = new Ledger(':memory:');
  try { assert.throws(() => ledger.begin('s', 'محمد'), /BUDGET_DISABLED/); } finally { ledger.close(); }
});
test('global pending and hourly caps, halt switch', () => {
  let t = 5_000_000;
  const ledger = new Ledger(':memory:', { budgetMicros: 10_000, batchReserveMicros: 10, jobsPerHour: 3, maxPending: 2, now: () => t });
  try {
    ledger.begin('a', 'نورة'); ledger.begin('b', 'نورة');
    assert.throws(() => ledger.begin('c', 'نورة'), /BUSY/);
    for (const r of ledger.all("SELECT id FROM jobs")) ledger.finish(r.id, 'complete', 10);
    ledger.begin('c', 'نورة');
    assert.throws(() => ledger.begin('d', 'نورة'), /BUSY/, 'hourly cap');
    t += 3_600_001;
    ledger.halt('manual');
    assert.throws(() => ledger.begin('d', 'نورة'), /GENERATION_HALTED/);
    ledger.resume();
    assert.equal(ledger.begin('d', 'نورة').created, true);
  } finally { ledger.close(); }
});
test('approvals, webhook dedupe and prune candidates', () => {
  let t = 10_000_000;
  const l = new Ledger(':memory:', { budgetMicros: 1000, batchReserveMicros: 10, now: () => t });
  try {
    const { job } = l.begin('s', 'نورة');
    ['a', 'b', 'c'].forEach((x, i) => l.addDesign(job, { id: 'd' + x, slot: i, sha256: x.repeat(64), version: 'v', receipt: 'r' }));
    l.finish(job.id, 'complete', 5);
    l.recordApproval('db', 's', 123);
    assert.equal(l.approval('db', 123).session, 's'); assert.equal(l.approval('db', 124), undefined);
    assert.equal(l.firstDelivery('w1', 'orders/create'), true); assert.equal(l.firstDelivery('w1', 'orders/create'), false);
    l.recordOrderCheck({ orderId: 1, lineId: 1, designId: 'dc', status: 'verified' });
    t += 100 * 86_400_000;
    assert.deepEqual(l.prunableDigests(t - 30 * 86_400_000), ['a'.repeat(64)], 'approved and ordered originals are never prune candidates');
  } finally { l.close(); }
});
