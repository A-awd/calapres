// Durable quota, budget-reservation and design ledger (Node >= 24 built-in SQLite, one process).
// Money is integer micro-units of the provider billing currency (USD micros for OpenAI).
// A job's reservation counts against the lifetime budget until it is settled to a proven lower
// amount; ambiguous provider outcomes keep the full reservation. Nothing here calls a provider.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

const DAY = 86_400_000, HOUR = 3_600_000;
export const DESIGNS_PER_BATCH = 3, BATCHES_PER_DAY = 3;
// A long-lived token keeps every original, but the storefront list is bounded to the newest ones.
export const MAX_LISTED_DESIGNS = 45;

export class Ledger {
  constructor(path, { budgetMicros = 0, batchReserveMicros = 0, jobsPerHour = 20, maxPending = 4, now = () => Date.now() } = {}) {
    for (const v of [budgetMicros, batchReserveMicros, jobsPerHour, maxPending]) if (!Number.isSafeInteger(v) || v < 0) throw Error('INVALID_LIMIT');
    Object.assign(this, { budget: budgetMicros, reserve: batchReserveMicros, jobsPerHour, maxPending, now });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES sessions(id), name TEXT NOT NULL,
        slot INTEGER NOT NULL, created INTEGER NOT NULL, state TEXT NOT NULL, reserved INTEGER NOT NULL, settled INTEGER, finished INTEGER, detail TEXT);
      CREATE INDEX IF NOT EXISTS jobs_session ON jobs(session, created);
      CREATE INDEX IF NOT EXISTS jobs_state ON jobs(state);
      CREATE TABLE IF NOT EXISTS calls(id INTEGER PRIMARY KEY, job TEXT NOT NULL REFERENCES jobs(id), slot INTEGER NOT NULL, outcome TEXT NOT NULL,
        input_tokens INTEGER, output_tokens INTEGER, cost_micros INTEGER, detail TEXT, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS designs(id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES sessions(id), job TEXT NOT NULL REFERENCES jobs(id),
        name TEXT NOT NULL, ordinal INTEGER NOT NULL, slot INTEGER NOT NULL, sha256 TEXT NOT NULL, version TEXT NOT NULL, receipt TEXT NOT NULL,
        dhash TEXT, created INTEGER NOT NULL, ordered_at INTEGER);
      CREATE INDEX IF NOT EXISTS designs_session ON designs(session, ordinal);
      CREATE TABLE IF NOT EXISTS order_checks(order_id TEXT NOT NULL, line_id TEXT NOT NULL, design_id TEXT, status TEXT NOT NULL,
        reason TEXT, checked_at INTEGER NOT NULL, PRIMARY KEY(order_id, line_id));
      CREATE TABLE IF NOT EXISTS approvals(design_id TEXT NOT NULL REFERENCES designs(id), session TEXT NOT NULL, at INTEGER NOT NULL,
        PRIMARY KEY(design_id, at));
      CREATE TABLE IF NOT EXISTS webhook_deliveries(id TEXT PRIMARY KEY, topic TEXT NOT NULL, received_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS lease(id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL, expires INTEGER NOT NULL);
      INSERT OR IGNORE INTO meta VALUES ('schema', '3');`);
  }

  tx(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  one(sql, ...a) { return this.db.prepare(sql).get(...a); }
  all(sql, ...a) { return this.db.prepare(sql).all(...a); }
  run(sql, ...a) { return this.db.prepare(sql).run(...a); }

  halted() { return this.one("SELECT value FROM meta WHERE key='halt'")?.value || null; }
  halt(reason) { this.run("INSERT INTO meta VALUES('halt',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", String(reason)); }
  resume() { this.run("DELETE FROM meta WHERE key='halt'"); }

  committedMicros() {
    return this.one("SELECT COALESCE(sum(COALESCE(settled, reserved)),0) n FROM jobs WHERE state<>'released'").n;
  }
  usedJobs(session, now = this.now()) {
    return this.one("SELECT count(*) n FROM jobs WHERE session=? AND created>? AND state<>'released'", session, now - DAY).n;
  }
  // Images that may have been billed for this session in the rolling window. A slot the provider
  // certainly refused (recorded as rejected_unbilled) costs nothing and does not use the quota.
  // Pending, interrupted or crashed batches without per-slot records count as a full batch.
  billedImages(session, now = this.now()) {
    return this.one(`SELECT COALESCE(sum(CASE WHEN j.state='released' THEN 0
      WHEN j.state IN ('pending','interrupted') OR NOT EXISTS (SELECT 1 FROM calls c WHERE c.job=j.id) THEN ${DESIGNS_PER_BATCH}
      ELSE (SELECT count(*) FROM calls c WHERE c.job=j.id AND c.outcome<>'rejected_unbilled') END),0) n
      FROM jobs j WHERE j.session=? AND j.created>?`, session, now - DAY).n;
  }
  // Designs the customer may still request, in whole batches of three.
  remainingFor(session, now = this.now()) {
    const left = DESIGNS_PER_BATCH * BATCHES_PER_DAY - this.billedImages(session, now);
    return Math.max(0, Math.floor(left / DESIGNS_PER_BATCH) * DESIGNS_PER_BATCH);
  }

  // Read-only view for the storefront. Unknown/new sessions are not persisted here.
  status(session) {
    const empty = { remaining: DESIGNS_PER_BATCH * BATCHES_PER_DAY, pending: false, lastName: '', designs: [] };
    if (!session) return empty;
    const row = this.one('SELECT name FROM sessions WHERE id=?', session);
    if (!row) return empty;
    const pending = this.one("SELECT name FROM jobs WHERE session=? AND state='pending'", session);
    return {
      remaining: this.remainingFor(session),
      pending: !!pending, lastName: pending?.name || row.name,
      designs: this.all(`SELECT * FROM (SELECT id,name,ordinal,sha256,version,receipt FROM designs WHERE session=? ORDER BY ordinal DESC LIMIT ${MAX_LISTED_DESIGNS}) ORDER BY ordinal`, session),
    };
  }
  // True when a new batch could be reserved right now (budget configured, not halted, room left).
  canAfford() {
    return !!this.budget && !!this.reserve && !this.halted() && this.committedMicros() + this.reserve <= this.budget;
  }

  // Atomically reserve one batch. Returns the existing pending job instead of starting another.
  begin(session, name) {
    return this.tx(() => {
      const now = this.now();
      const pending = this.one("SELECT * FROM jobs WHERE session=? AND state='pending'", session);
      if (pending) return { job: pending, created: false };
      if (this.halted()) throw Error('GENERATION_HALTED');
      if (!this.budget || !this.reserve) throw Error('BUDGET_DISABLED');
      if (this.remainingFor(session, now) < DESIGNS_PER_BATCH) throw Error('LIMIT_REACHED');
      if (this.one("SELECT count(*) n FROM jobs WHERE state='pending'").n >= this.maxPending) throw Error('BUSY');
      if (this.one("SELECT count(*) n FROM jobs WHERE created>? AND state<>'released'", now - HOUR).n >= this.jobsPerHour) throw Error('BUSY');
      if (this.committedMicros() + this.reserve > this.budget) throw Error('BUDGET_REACHED');
      this.run("INSERT INTO sessions(id,name,created) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name", session, name, now);
      const slot = DESIGNS_PER_BATCH * this.one('SELECT count(*) n FROM jobs WHERE session=?', session).n;
      const job = { id: randomUUID(), session, name, slot, created: now, state: 'pending', reserved: this.reserve };
      this.run('INSERT INTO jobs(id,session,name,slot,created,state,reserved) VALUES(?,?,?,?,?,?,?)', job.id, session, name, slot, now, 'pending', job.reserved);
      return { job, created: true };
    });
  }

  recordCall(job, slot, { outcome, inputTokens = null, outputTokens = null, costMicros = null, detail = null }) {
    this.run('INSERT INTO calls(job,slot,outcome,input_tokens,output_tokens,cost_micros,detail,created) VALUES(?,?,?,?,?,?,?,?)',
      job, slot, outcome, inputTokens, outputTokens, costMicros, detail, this.now());
  }
  sessionHashes(session) { return this.all('SELECT dhash FROM designs WHERE session=?', session).map((r) => r.dhash); }
  addDesign(job, d) {
    return this.tx(() => {
      const ordinal = this.one('SELECT COALESCE(max(ordinal),0)+1 n FROM designs WHERE session=?', job.session).n;
      this.run('INSERT INTO designs(id,session,job,name,ordinal,slot,sha256,version,receipt,dhash,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        d.id, job.session, job.id, job.name, ordinal, d.slot, d.sha256, d.version, d.receipt, d.dhash || null, this.now());
      return ordinal;
    });
  }
  // Settlement records the best-known spend: proven usage where the provider reported it, the
  // per-image ceiling where it did not. It may be LOWER than the reservation (frees budget) or HIGHER
  // when observed usage broke the declared ceiling; the ledger then reflects the overshoot instead of
  // hiding it, and the worker halts generation. A null settlement keeps the full reservation.
  finish(id, state, settledMicros = null, detail = null) {
    const settled = settledMicros == null ? null : Math.max(0, Math.ceil(settledMicros));
    this.run('UPDATE jobs SET state=?, settled=?, finished=?, detail=? WHERE id=? AND state=\'pending\'', state, settled, this.now(), detail, id);
  }
  // After a crash the provider outcome of in-flight calls is unknown: keep the full reservation and never replay.
  recover() { return Number(this.run("UPDATE jobs SET state='interrupted', finished=?, detail='restart' WHERE state='pending'", this.now()).changes); }

  design(id) { return typeof id === 'string' ? this.one('SELECT * FROM designs WHERE id=?', id) : undefined; }
  recordApproval(designId, session, at) {
    this.run('INSERT OR IGNORE INTO approvals(design_id,session,at) VALUES(?,?,?)', designId, session, at);
  }
  approval(designId, at) { return this.one('SELECT * FROM approvals WHERE design_id=? AND at=?', designId, at); }
  // Returns false when this webhook delivery id was already processed.
  firstDelivery(id, topic) {
    return Number(this.run('INSERT OR IGNORE INTO webhook_deliveries(id,topic,received_at) VALUES(?,?,?)', id, topic, this.now()).changes) === 1;
  }

  // Single-worker lease: only the holder may call the provider. Survives crashes by expiry.
  acquireLease(owner, ttlMs) {
    return this.tx(() => {
      const now = this.now(), row = this.one('SELECT owner, expires FROM lease WHERE id=1');
      if (row && row.owner !== owner && row.expires > now) return false;
      this.run('INSERT INTO lease(id,owner,expires) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner, expires=excluded.expires', owner, now + ttlMs);
      return true;
    });
  }
  holdsLease(owner) {
    const row = this.one('SELECT owner, expires FROM lease WHERE id=1');
    return !!row && row.owner === owner && row.expires > this.now();
  }
  releaseLease(owner) { this.run('DELETE FROM lease WHERE id=1 AND owner=?', owner); }
  designByDigest(sha) { return this.one('SELECT * FROM designs WHERE sha256=? ORDER BY created LIMIT 1', sha); }
  recordOrderCheck({ orderId, lineId, designId, status, reason }) {
    this.tx(() => {
      this.run('INSERT INTO order_checks VALUES(?,?,?,?,?,?) ON CONFLICT(order_id,line_id) DO UPDATE SET design_id=excluded.design_id,status=excluded.status,reason=excluded.reason,checked_at=excluded.checked_at',
        String(orderId), String(lineId), designId || null, status, reason || null, this.now());
      if (status === 'verified' && designId) this.run('UPDATE designs SET ordered_at=COALESCE(ordered_at,?) WHERE id=?', this.now(), designId);
    });
  }
  // Never returns an original that was approved by a customer (it may be in an order even when the
  // webhook is not configured), verified in an order, or shared with any newer design.
  prunableDigests(before) {
    return this.all(`SELECT DISTINCT sha256 FROM designs WHERE created<? AND sha256 NOT IN (
      SELECT d.sha256 FROM designs d WHERE d.ordered_at IS NOT NULL OR d.created>=? OR EXISTS (SELECT 1 FROM approvals a WHERE a.design_id=d.id))`,
    before, before).map((r) => r.sha256);
  }
  close() { this.db.close(); }
}
