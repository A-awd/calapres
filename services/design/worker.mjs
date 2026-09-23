// Runs reserved jobs: three separate provider calls under a global images-per-minute limit,
// local screening, write-once storage, signed receipts, then settlement.
// A call that never left this process (queue deadline passed, lease lost, provider disabled) is
// certainly unbilled. A call whose outcome is unknown is never retried. The only retry is for a
// provider rate-limit refusal (HTTP 429, refused before generation), at most `retries` times and only
// while it can still start before the job's queue deadline.
// Every image that does not become a visible design is logged with a safe code (no name, prompt,
// key or provider message) and recorded per slot in the ledger.
import { randomBytes } from 'node:crypto';
import { screenImage, nearestDistance, SCREEN_DEFAULTS } from './screen.mjs';
import { signReceipt } from './security.mjs';
import { hashForProvider } from './provider.mjs';
import { DESIGNS_PER_BATCH } from './ledger.mjs';

export class QueueTimeout extends Error { constructor() { super('QUEUE_TIMEOUT'); this.code = 'QUEUE_TIMEOUT'; this.billed = false; } }

export class RateLimiter {
  constructor(perMinute, { now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
    Object.assign(this, { perMinute, now, sleep, starts: [], chain: Promise.resolve() });
  }
  // Serialises admission so concurrent callers cannot overshoot the window. Rejects with
  // QueueTimeout when the caller could not be admitted before its deadline (nothing was sent).
  take(deadline = Infinity) {
    const turn = this.chain.then(async () => {
      for (;;) {
        const t = this.now(); this.starts = this.starts.filter((s) => t - s < 60_000);
        if (this.starts.length < this.perMinute) { this.starts.push(t); return; }
        const wait = 60_000 - (t - this.starts[0]) + 5;
        if (t + wait > deadline) throw new QueueTimeout();
        await this.sleep(wait);
      }
    });
    this.chain = turn.catch(() => {});
    return turn;
  }
}

export class Worker {
  constructor({ ledger, store, provider, cost, secret, shop, imagesPerMinute = 5, queueWaitMs = 150_000, leaseOwner = null,
    screen = {}, log = () => {}, now = () => Date.now(), retries = 2, retryWaitMs = 5_000, maxRetryWaitMs = 20_000,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
    Object.assign(this, { ledger, store, provider, cost, secret, shop, log, now, queueWaitMs, leaseOwner, screen: { ...SCREEN_DEFAULTS, ...screen },
      retries, retryWaitMs, maxRetryWaitMs, sleep });
    this.limiter = new RateLimiter(imagesPerMinute, { now });
    this.running = new Map();
  }
  enqueue(job) {
    if (this.running.has(job.id)) return this.running.get(job.id);
    const p = this.run(job).catch((e) => { this.log('job_crash', { job: job.id, code: e?.code || e?.message }); try { this.ledger.finish(job.id, 'failed', null, 'crash'); } catch {} })
      .finally(() => this.running.delete(job.id));
    this.running.set(job.id, p);
    return p;
  }
  idle() { return Promise.all([...this.running.values()]); }

  async call(job, slot, deadline) {
    for (let attempt = 0; ; attempt++) {
      try {
        await this.limiter.take(deadline);
        // Re-check just before sending: a process that lost the single-worker lease must not spend.
        if (this.leaseOwner && !this.ledger.holdsLease(this.leaseOwner)) return { slot, error: 'LEASE_LOST', billed: false };
        if (this.ledger.halted()) return { slot, error: 'HALTED', billed: false };
        return { slot, ...(await this.provider.generate(job.name, slot, { sessionHash: hashForProvider(job.session) })) };
      } catch (e) {
        const failure = { slot, error: e?.code || 'PROVIDER_FAILED', billed: e?.billed ?? 'unknown', providerCode: e?.providerCode || '' };
        const wait = Math.min(this.maxRetryWaitMs, e?.retryAfterMs || this.retryWaitMs);
        if (failure.error !== 'PROVIDER_HTTP_429' || failure.billed !== false || attempt >= this.retries || this.now() + wait >= deadline) return failure;
        this.log('call_retry', { job: job.id, slot, code: failure.error, providerCode: failure.providerCode || null, attempt: attempt + 1, waitMs: wait });
        await this.sleep(wait);
      }
    }
  }

  async run(job) {
    const deadline = (job.created || this.now()) + this.queueWaitMs;
    const slots = Array.from({ length: DESIGNS_PER_BATCH }, (_, i) => job.slot + i);
    const results = await Promise.all(slots.map((s) => this.call(job, s, deadline)));
    let visible = 0, settled = 0, unbilled = 0, breach = false;
    const counts = { refused: 0, failed: 0, screened: 0, duplicate: 0 };
    const earlier = this.ledger.sessionHashes(job.session);
    for (const r of results) {
      if (r.error) {
        const certain = r.billed === false;
        if (certain) unbilled++; else settled += this.cost.worstImageMicros;
        counts[certain ? 'refused' : 'failed']++;
        const detail = r.providerCode ? `${r.error}:${r.providerCode}` : r.error;
        this.ledger.recordCall(job.id, r.slot, { outcome: certain ? 'rejected_unbilled' : 'ambiguous', costMicros: certain ? 0 : null, detail });
        this.log('call_failed', { job: job.id, slot: r.slot, code: r.error, providerCode: r.providerCode || null, billed: certain ? false : 'unknown' });
        continue;
      }
      const actual = r.usage ? this.cost.actualMicros(r.usage) : null;
      if (r.usage && this.cost.exceeds(r.usage)) breach = true;
      settled += actual ?? this.cost.worstImageMicros;
      const check = screenImage(r.png, this.screen);
      const duplicate = check.ok && nearestDistance(check.metrics.dhash, earlier) <= this.screen.duplicateDistance;
      this.ledger.recordCall(job.id, r.slot, { outcome: 'ok', inputTokens: r.usage?.inputTokens ?? null, outputTokens: r.usage?.outputTokens ?? null, costMicros: actual,
        detail: !check.ok ? `screen:${check.reason}` : duplicate ? 'duplicate' : 'visible' });
      if (!check.ok) { counts.screened++; this.log('design_rejected', { job: job.id, slot: r.slot, reason: check.reason }); continue; }
      if (duplicate) { counts.duplicate++; this.log('design_rejected', { job: job.id, slot: r.slot, reason: 'DUPLICATE' }); continue; }
      earlier.push(check.metrics.dhash);
      const sha256 = this.store.put(r.png); // persist the original before anything can reference it
      const id = 'd_' + randomBytes(12).toString('hex');
      const version = this.provider.version(r.slot);
      const receipt = signReceipt({ shop: this.shop, id, sha256, version, name: job.name }, this.secret);
      this.ledger.addDesign(job, { id, slot: r.slot, sha256, version, receipt, dhash: check.metrics.dhash });
      visible++;
    }
    if (breach) { this.ledger.halt('COST_MODEL_EXCEEDED'); this.log('halt', { reason: 'COST_MODEL_EXCEEDED', job: job.id }); }
    const state = unbilled === DESIGNS_PER_BATCH ? 'released' : visible === DESIGNS_PER_BATCH ? 'complete' : visible ? 'partial' : 'failed';
    this.ledger.finish(job.id, state, state === 'released' ? 0 : settled, `visible=${visible};${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(';')}`);
    this.log('job_done', { job: job.id, state, visible, ...counts });
  }
}
