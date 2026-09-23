#!/usr/bin/env node
// Entry point: one process, one persistent DATA_DIR (SQLite ledger + write-once originals).
// A second process on the same DATA_DIR cannot become the worker: it waits for the single-worker
// lease and exits if another live instance holds it.
import { createServer } from 'node:http';
import { join, dirname, resolve } from 'node:path';
import { mkdirSync, existsSync, statSync, readFileSync, openSync, writeSync, fsyncSync, closeSync, renameSync } from 'node:fs';
import { hostname } from 'node:os';
import { randomBytes } from 'node:crypto';
import { loadConfig, describe } from './config.mjs';
import { Ledger } from './ledger.mjs';
import { AssetStore } from './store.mjs';
import { Worker } from './worker.mjs';
import { openAIProvider } from './provider.mjs';
import { createApp } from './app.mjs';

const log = (event, fields = {}) => process.stdout.write(JSON.stringify({ t: new Date().toISOString(), event, ...fields }) + '\n');
const pre = loadConfig({ ...process.env, SERVICE_SECRET: '' });
if (pre.requireMountedDataDir) {
  // On a managed host the data directory must be a separately mounted persistent volume. Never create
  // it: a missing mount would otherwise silently put the ledger and approved originals on disposable storage.
  const dir = resolve(pre.dataDir);
  if (!existsSync(dir) || statSync(dir).dev === statSync(dirname(dir)).dev) { log('fatal', { reason: 'DATA_DIR_NOT_MOUNTED', dataDir: dir }); process.exit(1); }
} else mkdirSync(pre.dataDir, { recursive: true });

// SERVICE_SECRET may instead live in a 0600 file on the data volume, generated on first start, so it is
// never typed, transmitted or logged. Losing the file invalidates sessions and receipts (like rotating it).
if (!process.env.SERVICE_SECRET && process.env.SERVICE_SECRET_FILE) {
  const file = resolve(process.env.SERVICE_SECRET_FILE);
  if (!existsSync(file) && process.env.SERVICE_SECRET_AUTOGEN === 'true') {
    const tmp = `${file}.${process.pid}.tmp`, fd = openSync(tmp, 'wx', 0o600);
    try { writeSync(fd, randomBytes(48).toString('base64url')); fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(tmp, file); log('service_secret_generated', { file });
  }
  if (existsSync(file)) process.env.SERVICE_SECRET = readFileSync(file, 'utf8').trim();
}
const config = loadConfig();
if (!config.serviceSecret) { log('fatal', { reason: 'SERVICE_SECRET (or SERVICE_SECRET_FILE) is required even with generation disabled' }); process.exit(1); }
// Without the Shopify app secret the service runs with every proxy and webhook route closed (503),
// so it can be deployed and health-checked before the app exists. Nothing is ever accepted unsigned.
if (!config.shopifySecret) log('proxy_disabled', { reason: 'SHOPIFY_API_SECRET not set' });
const ledger = new Ledger(join(config.dataDir, 'ledger.sqlite'), {
  budgetMicros: config.budgetMicros, batchReserveMicros: config.batchReserveMicros, jobsPerHour: config.jobsPerHour, maxPending: config.maxPending,
});

const owner = `${hostname()}:${process.pid}:${randomBytes(6).toString('hex')}`;
const waitUntil = Date.now() + config.leaseTtlMs + 2_000;
while (!ledger.acquireLease(owner, config.leaseTtlMs)) {
  if (Date.now() > waitUntil) { log('fatal', { reason: 'ANOTHER_INSTANCE_HOLDS_LEASE' }); ledger.close(); process.exit(1); }
  await new Promise((r) => setTimeout(r, 1_000));
}
// Recover only after holding the lease, so a starting duplicate cannot mark a live job interrupted.
const interrupted = ledger.recover();
const store = new AssetStore(join(config.dataDir, 'originals'));
const provider = openAIProvider({ apiKey: config.generationEnabled ? config.openaiKey : '', model: config.model, quality: config.quality });
const worker = new Worker({ ledger, store, provider, cost: config.cost, secret: config.serviceSecret, shop: config.shop,
  imagesPerMinute: config.imagesPerMinute, queueWaitMs: config.queueWaitMs, leaseOwner: owner, log });
const server = createServer(createApp({ config, ledger, store, worker, log }));
server.requestTimeout = 30_000; server.headersTimeout = 15_000; server.maxRequestsPerSocket = 100;

let stopping = false;
const stop = (code = 0) => {
  if (stopping) return; stopping = true; log('stopping', { code });
  clearInterval(renew);
  server.close(() => { try { ledger.releaseLease(owner); ledger.close(); } catch {} process.exit(code); });
  setTimeout(() => process.exit(code), 10_000).unref();
};
const renew = setInterval(() => {
  try { if (!ledger.acquireLease(owner, config.leaseTtlMs)) { log('fatal', { reason: 'LEASE_LOST' }); stop(1); } }
  catch (e) { log('fatal', { reason: 'LEASE_RENEW_FAILED', code: e?.message }); stop(1); }
}, Math.max(1_000, Math.floor(config.leaseTtlMs / 3)));

server.listen(config.port, config.host, () => log('started', { ...describe(config), interrupted, halted: ledger.halted() }));
process.on('SIGTERM', () => stop(0)); process.on('SIGINT', () => stop(0));
