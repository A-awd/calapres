// Behavioural tests for the design service. The provider is a dependency-injected FAKE that draws
// synthetic block patterns; these images are test fixtures only and are never real Arabic artwork.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac, createHash } from 'node:crypto';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { proxySignature, authenticateProxy, normalizeName, issueSessionToken, sessionIdFromToken, signReceipt, verifyReceipt, verifyWebhook, signApproval, verifyApproval, clientIp } from './security.mjs';
import { encodePng, decodePng } from './png.mjs';
import { screenImage } from './screen.mjs';
import { AssetStore, sha256 } from './store.mjs';
import { Ledger, MAX_LISTED_DESIGNS } from './ledger.mjs';
import { Worker, RateLimiter } from './worker.mjs';
import { ProviderError, designPrompt, openAIProvider } from './provider.mjs';
import { loadConfig } from './config.mjs';
import { createApp } from './app.mjs';
import { APPROVAL_TEXT, METHOD_GENERATED } from './verify.mjs';

const SHOP = 'unywbe-ub.myshopify.com', PREFIX = '/apps/calapres-design', APP_SECRET = 'test-app-secret-not-real', SERVICE_SECRET = 'test-service-secret-0123456789abcdef';
const HERE = new URL('.', import.meta.url).pathname;

// ---------- fixtures ----------
function syntheticPng(seed, { size = 1024, colour = false, edge = false, blank = false } = {}) {
  const ch = colour ? 3 : 1, px = Buffer.alloc(size * size * ch, 255);
  let s = seed * 2654435761 >>> 0; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const block = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * size + x) * ch; if (colour) { px[i] = 230; px[i + 1] = 20; px[i + 2] = 20; } else px[i] = 0; } };
  if (!blank) for (let k = 0; k < 14; k++) block(80 + Math.floor(rnd() * 760), 80 + Math.floor(rnd() * 760), 40 + Math.floor(rnd() * 90), 30 + Math.floor(rnd() * 90));
  if (edge) block(0, 500, 60, 60);
  return encodePng({ width: size, height: size, channels: ch, pixels: px });
}
const USAGE = { inputTokens: 350, outputTokens: 400, textInputTokens: 350, imageInputTokens: 0 };
function fakeProvider({ behaviour = () => 'ok', delayMs = 0 } = {}) {
  const p = { calls: [], ready: true, version: (slot) => `p1-L${slot % 9}-fake`, hang: [] };
  p.generate = async (name, slot) => {
    p.calls.push({ name, slot });
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const b = behaviour(slot, p.calls.length);
    if (b === 'hang') return new Promise((resolve) => p.hang.push(resolve));
    if (b === 'unbilled') throw new ProviderError('PROVIDER_HTTP_429', false, { providerCode: 'rate_limit_exceeded' });
    if (b === 'forbidden') throw new ProviderError('PROVIDER_HTTP_403', false, { providerCode: 'model_not_found' });
    if (b === 'ambiguous') throw new ProviderError('PROVIDER_TIMEOUT', 'unknown');
    if (b === 'colour') return { png: syntheticPng(slot + 1, { colour: true }), usage: USAGE };
    if (b === 'duplicate') return { png: syntheticPng(1000), usage: USAGE };
    if (b === 'expensive') return { png: syntheticPng(slot + 1), usage: { ...USAGE, outputTokens: 999_999 } };
    if (b === 'nousage') return { png: syntheticPng(slot + 1), usage: null };
    return { png: syntheticPng(slot + 1), usage: USAGE };
  };
  return p;
}
function env(extra = {}) {
  return { SHOPIFY_SHOP: SHOP, PROXY_PATH_PREFIX: PREFIX, SHOPIFY_API_SECRET: APP_SECRET, SERVICE_SECRET, GENERATION_ENABLED: 'true',
    OPENAI_API_KEY: 'test-placeholder', PRICE_TEXT_INPUT_USD_PER_M: '2.5', PRICE_IMAGE_OUTPUT_USD_PER_M: '15', MAX_OUTPUT_TOKENS_PER_IMAGE: '4160',
    BUDGET_USD_MICROS: '100000000', PROVIDER_IMAGES_PER_MINUTE: '1000', IP_REQUESTS_PER_MINUTE: '1000', JOBS_PER_HOUR: '1000', MAX_PENDING_JOBS: '100', ...extra };
}
async function start({ envExtra = {}, provider = fakeProvider(), dir = mkdtempSync(join(tmpdir(), 'cds-')), budgetBatches, workerOptions = {} } = {}) {
  const e = env(envExtra);
  let config = loadConfig(e);
  if (budgetBatches !== undefined) config = loadConfig({ ...e, BUDGET_USD_MICROS: String(config.batchReserveMicros * budgetBatches) });
  const ledger = new Ledger(join(dir, 'ledger.sqlite'), { budgetMicros: config.budgetMicros, batchReserveMicros: config.batchReserveMicros, jobsPerHour: config.jobsPerHour, maxPending: config.maxPending });
  const recovered = ledger.recover();
  const store = new AssetStore(join(dir, 'originals'));
  const events = [];
  const worker = new Worker({ ledger, store, provider, cost: config.cost, secret: SERVICE_SECRET, shop: SHOP, imagesPerMinute: config.imagesPerMinute, queueWaitMs: config.queueWaitMs, log: (e, f) => events.push({ e, ...f }), retryWaitMs: 5, ...workerOptions });
  const server = createServer(createApp({ config, ledger, store, worker, log: (e, f) => events.push({ e, ...f }) }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const stop = async ({ keep = false } = {}) => { server.closeAllConnections?.(); await new Promise((r) => server.close(r)); ledger.close(); if (!keep) rmSync(dir, { recursive: true, force: true }); };
  return { config, ledger, store, worker, provider, base, dir, events, stop, recovered };
}
function signed(path, { shop = SHOP, prefix = PREFIX, ts = Math.floor(Date.now() / 1000), secret = APP_SECRET, tamper = false } = {}) {
  const q = new URLSearchParams({ shop, logged_in_customer_id: '', path_prefix: prefix, timestamp: String(ts) });
  q.set('signature', proxySignature(q, secret));
  if (tamper) q.set('timestamp', String(ts + 1));
  return `/proxy${path}?${q}`;
}
async function post(t, path, body, opts = {}) {
  const r = await fetch(t.base + signed(path, opts), { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': opts.ip || '203.0.113.9' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}

// ---------- security ----------
// The docs page renders the shop as {shop}; its published signature was computed with "shop-name".
test('proxy signature matches Shopify documentation vector', () => {
  const q = new URLSearchParams('extra=1&extra=2&shop=shop-name.myshopify.com&logged_in_customer_id=&path_prefix=%2Fapps%2Fawesome_reviews&timestamp=1317327555&signature=e072b6d7e6622d85912a5214b860d3100dc1e73d9bc29f43796ac8c9ff8093cb');
  assert.equal(proxySignature(q, 'hush'), q.get('signature'));
});
test('proxy authentication rejects wrong shop, prefix, stale or tampered requests', () => {
  const ok = new URL('http://x' + signed('/session'));
  authenticateProxy(ok, { shop: SHOP, secret: APP_SECRET, prefix: PREFIX });
  const bad = [signed('/s', { shop: 'evil.myshopify.com' }), signed('/s', { prefix: '/apps/other' }), signed('/s', { ts: Math.floor(Date.now() / 1000) - 3600 }),
    signed('/s', { tamper: true }), signed('/s', { secret: 'wrong' }), signed('/s') + '&signature=00'];
  for (const p of bad) assert.throws(() => authenticateProxy(new URL('http://x' + p), { shop: SHOP, secret: APP_SECRET, prefix: PREFIX }), /UNAUTHORIZED/, p);
  assert.throws(() => authenticateProxy(ok, { shop: SHOP, secret: '', prefix: PREFIX }), /UNAUTHORIZED/);
});
test('Arabic name normalisation keeps spelling and hamza, rejects marks and foreign input', () => {
  for (const n of ['عبد الرحمن', 'أحمد', 'إيمان', 'آلاء', 'رؤى', 'مؤمن', 'نورة', 'عبدالإله', 'لمى']) assert.equal(normalizeName(n), n);
  assert.equal(normalizeName('  عبد   الرحمن '), 'عبد الرحمن');
  assert.equal(normalizeName('آلاء'.normalize('NFD')), 'آلاء');
  for (const n of ['مُحَمَّد', 'محــمد', 'Noura', 'نورة 2', 'نورة٢', 'نورة!', '', 'ا ب ت ث ج', 'ع'.repeat(31), null, 5]) assert.throws(() => normalizeName(n), /INVALID_NAME/, String(n));
});
test('session tokens and receipts are tamper-evident', () => {
  const t = issueSessionToken(SERVICE_SECRET), id = sessionIdFromToken(t, SERVICE_SECRET);
  assert.match(id, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(sessionIdFromToken(t.slice(0, -2) + (t.endsWith('AA') ? 'AB' : 'AA'), SERVICE_SECRET), null);
  assert.equal(sessionIdFromToken(t, 'another-secret-0123456789abcdefghij'), null);
  const f = { shop: SHOP, id: 'd_1', sha256: 'a'.repeat(64), version: 'p1-L0', name: 'نورة' }, r = signReceipt(f, SERVICE_SECRET);
  assert.ok(verifyReceipt(f, r, SERVICE_SECRET));
  for (const k of Object.keys(f)) assert.equal(verifyReceipt({ ...f, [k]: f[k] + 'x' }, r, SERVICE_SECRET), false, k);
  const a = signApproval(f, 1790000000, SERVICE_SECRET);
  assert.equal(verifyApproval(f, a, SERVICE_SECRET), 1790000000);
  assert.equal(verifyApproval({ ...f, name: 'نوره' }, a, SERVICE_SECRET), null);
  assert.equal(verifyApproval(f, a.replace('a1.1790000000', 'a1.1790000001'), SERVICE_SECRET), null, 'approval time is authenticated');
  assert.equal(verifyApproval(f, r, SERVICE_SECRET), null, 'a design receipt is not an approval');
  const body = Buffer.from('{"id":1}'), h = createHmac('sha256', APP_SECRET).update(body).digest('base64');
  assert.ok(verifyWebhook(body, h, APP_SECRET)); assert.equal(verifyWebhook(Buffer.from('{"id":2}'), h, APP_SECRET), false);
});
test('client address ignores injected X-Forwarded-For entries', () => {
  assert.equal(clientIp('203.0.113.7', '10.0.0.1', 0), '203.0.113.7');
  assert.equal(clientIp('6.6.6.6, 203.0.113.7', '10.0.0.1', 0), '203.0.113.7', 'a client-supplied first entry is ignored');
  assert.equal(clientIp('6.6.6.6, 203.0.113.7, 23.227.38.1', '10.0.0.1', 1), '203.0.113.7', 'one trusted hop after Shopify');
  assert.equal(clientIp('', '10.0.0.1', 0), '10.0.0.1');
});
test('prompt spells the exact letters and forbids marks; provider disabled without key', async () => {
  const p = designPrompt('آلاء', 3);
  assert.match(p, /"آلاء"/); assert.match(p, /آ ل ا ء/); assert.match(p, /No tashkeel/);
  assert.throws(() => designPrompt('مُحَمَّد', 0), /INVALID_NAME/);
  await assert.rejects(openAIProvider({ apiKey: '' }).generate('نورة', 0), (e) => e.code === 'PROVIDER_DISABLED' && e.billed === false);
});
test('OpenAI adapter request shape, response bounds and billing classification (mocked fetch)', async () => {
  const png = syntheticPng(7); let seen;
  const ok = openAIProvider({ apiKey: 'k', fetchImpl: async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }], usage: { input_tokens: 300, output_tokens: 272, input_tokens_details: { text_tokens: 300, image_tokens: 0 } } }), { status: 200 }); } });
  const r = await ok.generate('نورة', 0, { sessionHash: 'abc' });
  const body = JSON.parse(seen.init.body);
  assert.equal(seen.url, 'https://api.openai.com/v1/images/generations');
  assert.deepEqual([body.model, body.n, body.size, body.quality, body.output_format, body.background, body.user], ['gpt-image-2-2026-04-21', 1, '1024x1024', 'low', 'png', 'opaque', 'abc']);
  assert.ok(r.png.equals(png)); assert.deepEqual(r.usage, { inputTokens: 300, outputTokens: 272, textInputTokens: 300, imageInputTokens: 0 });
  const status = (s) => openAIProvider({ apiKey: 'k', fetchImpl: async () => new Response('{}', { status: s }) }).generate('نورة', 0);
  await assert.rejects(status(429), (e) => e.billed === false);
  await assert.rejects(status(400), (e) => e.billed === 'unknown');
  await assert.rejects(status(503), (e) => e.billed === 'unknown');
  await assert.rejects(openAIProvider({ apiKey: 'k', fetchImpl: async () => { throw Object.assign(Error('t'), { name: 'TimeoutError' }); } }).generate('نورة', 0), (e) => e.code === 'PROVIDER_TIMEOUT' && e.billed === 'unknown');
  await assert.rejects(openAIProvider({ apiKey: 'k', maxResponseBytes: 100, fetchImpl: async () => new Response('x'.repeat(1000), { status: 200 }) }).generate('نورة', 0), /PROVIDER_RESPONSE_TOO_LARGE/);
  await assert.rejects(openAIProvider({ apiKey: 'k', fetchImpl: async () => new Response(JSON.stringify({ data: [{ b64_json: Buffer.from('GIF89a').toString('base64') }] }), { status: 200 }) }).generate('نورة', 0), /PROVIDER_NOT_PNG/);
  // Only the provider's short machine code survives; its message text never does.
  const errorReply = (s, body, headers = {}) => openAIProvider({ apiKey: 'k', fetchImpl: async () => new Response(JSON.stringify(body), { status: s, headers }) }).generate('نورة', 0);
  await assert.rejects(errorReply(429, { error: { code: 'rate_limit_exceeded', message: 'secret detail نورة' } }, { 'retry-after': '7' }),
    (e) => e.code === 'PROVIDER_HTTP_429' && e.billed === false && e.providerCode === 'rate_limit_exceeded' && e.retryAfterMs === 7000 && !JSON.stringify(e).includes('secret'));
  await assert.rejects(errorReply(400, { error: { type: 'invalid_request_error', code: null, message: 'x' } }), (e) => e.providerCode === 'invalid_request_error' && e.billed === 'unknown');
  await assert.rejects(errorReply(400, { error: { code: '<script>alert(1)</script>' } }), (e) => e.providerCode === '');
  await assert.rejects(openAIProvider({ apiKey: 'k', fetchImpl: async () => new Response('x'.repeat(100000), { status: 500 }) }).generate('نورة', 0), (e) => e.providerCode === '' && e.billed === 'unknown');
});

// ---------- images & storage ----------
test('PNG round trip and screening outcomes', () => {
  const good = syntheticPng(3); const d = decodePng(good);
  assert.deepEqual([d.width, d.height, d.channels], [1024, 1024, 1]);
  assert.equal(screenImage(good).ok, true);
  assert.equal(screenImage(syntheticPng(3, { blank: true })).reason, 'BLANK');
  assert.equal(screenImage(syntheticPng(3, { colour: true })).reason, 'NOT_MONOCHROME');
  assert.equal(screenImage(syntheticPng(3, { edge: true })).reason, 'TOUCHES_EDGE');
  assert.equal(screenImage(syntheticPng(3, { size: 512 })).reason, 'WRONG_SIZE');
  assert.equal(screenImage(good.subarray(0, good.length - 20)).reason, 'UNREADABLE');
});
test('write-once store returns exact bytes and detects corruption', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cds-store-')), s = new AssetStore(dir), buf = syntheticPng(9);
  try {
    const dg = s.put(buf); assert.equal(dg, sha256(buf)); assert.ok(s.get(dg).equals(buf)); assert.equal(s.put(buf), dg);
    writeFileSync(s.path(dg), Buffer.concat([buf, Buffer.from('x')]));
    assert.throws(() => s.get(dg), /ASSET_CORRUPT/); assert.throws(() => s.path('../../etc/passwd'), /BAD_DIGEST/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('rate limiter never admits more than the per-minute allowance', async () => {
  let t = 0; const slept = [];
  const l = new RateLimiter(2, { now: () => t, sleep: async (ms) => { slept.push(ms); t += ms; } });
  await Promise.all([l.take(), l.take(), l.take()]);
  assert.equal(slept.length, 1); assert.ok(t >= 60_000);
});
test('config keeps generation off unless every control is present', () => {
  assert.equal(loadConfig({}).generationEnabled, false);
  assert.deepEqual(loadConfig(env({ OPENAI_API_KEY: '', BUDGET_USD_MICROS: '0' })).generationMissing, ['OPENAI_API_KEY', 'BUDGET_USD_MICROS']);
  assert.equal(loadConfig(env({ GENERATION_ENABLED: 'false' })).generationEnabled, false);
  assert.equal(loadConfig(env({ MAX_OUTPUT_TOKENS_PER_IMAGE: '' })).generationEnabled, false);
  const c = loadConfig(env());
  assert.equal(c.generationEnabled, true); assert.equal(c.batchReserveMicros, 3 * c.cost.worstImageMicros);
  assert.ok(c.cost.worstImageMicros >= 4160 * 15, 'reservation covers the declared output-token ceiling');
  assert.throws(() => loadConfig(env({ SERVICE_SECRET: 'short' })), /SERVICE_SECRET_TOO_SHORT/);
});

// ---------- HTTP end to end with fake provider ----------
test('session, generation, duplicate clicks, 3/6/9 gallery, exact original and cap', async () => {
  const t = await start({ provider: fakeProvider({ delayMs: 150 }) });
  try {
    const s0 = await post(t, '/session', {});
    assert.equal(s0.status, 200); assert.equal(s0.body.remaining, 9); assert.equal(s0.body.enabled, true); assert.deepEqual(s0.body.designs, []);
    const token = s0.body.token;
    assert.equal((await post(t, '/generate', { token, name: 'مُحَمَّد' })).body.code, 'INVALID_NAME');
    const clicks = await Promise.all(Array.from({ length: 5 }, () => post(t, '/generate', { token, name: 'عبد الرحمن' })));
    assert.ok(clicks.every((c) => c.status === 202 && c.body.pending), JSON.stringify(clicks.map((c) => [c.status, c.body.code, c.body.pending])));
    await t.worker.idle();
    assert.equal(t.provider.calls.length, 3, 'five clicks start exactly one batch of three calls');
    let s = (await post(t, '/session', { token })).body;
    assert.equal(s.pending, false); assert.equal(s.designs.length, 3); assert.equal(s.remaining, 6);
    const first = s.designs[0];
    const img = await fetch(t.base + signed(first.url.slice(PREFIX.length)));
    assert.equal(img.status, 200); assert.match(img.headers.get('cache-control'), /immutable/);
    const bytes = Buffer.from(await img.arrayBuffer());
    assert.equal(sha256(bytes), first.url.match(/([0-9a-f]{64})\.png$/)[1], 'served bytes hash to the digest in the URL');
    assert.ok(verifyReceipt({ shop: SHOP, id: first.id, sha256: sha256(bytes), version: first.version, name: 'عبد الرحمن' }, first.receipt, SERVICE_SECRET));
    await post(t, '/generate', { token, name: 'عبد الرحمن' }); await t.worker.idle();
    await post(t, '/generate', { token, name: 'نورة' }); await t.worker.idle();
    s = (await post(t, '/session', { token })).body;
    assert.equal(s.designs.length, 9); assert.equal(s.remaining, 0); assert.equal(s.designs[0].id, first.id, 'first design still selectable after nine');
    assert.deepEqual(s.designs.map((d) => d.ordinal), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.equal(new Set(t.provider.calls.map((c) => c.slot)).size, 9, 'nine distinct layout slots');
    const over = await post(t, '/generate', { token, name: 'نورة' });
    assert.equal(over.status, 429); assert.equal(over.body.code, 'LIMIT_REACHED'); assert.equal(t.provider.calls.length, 9);
    assert.equal((await fetch(t.base + signed('/a/' + 'f'.repeat(64) + '.png'))).status, 404);
    assert.equal((await fetch(t.base + signed(first.url.slice(PREFIX.length), { tamper: true }))).status, 401);
    const head = await fetch(t.base + signed(first.url.slice(PREFIX.length)), { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(head.headers.get('content-type'), 'image/png');
    // Another anonymous visitor sees nothing of this gallery and cannot approve its designs.
    const other = (await post(t, '/session', {}, { ip: '198.51.100.77' })).body;
    assert.deepEqual([other.designs.length, other.lastName, other.remaining], [0, '', 9]);
    assert.notEqual(other.token, token);
    const steal = await post(t, '/approve', { token: other.token, id: first.id }, { ip: '198.51.100.77' });
    assert.equal(steal.status, 404); assert.equal(steal.body.code, 'UNKNOWN_DESIGN');
    const own = await post(t, '/approve', { token, id: first.id });
    assert.equal(own.status, 200); assert.match(own.body.approval, /^a1\.\d+\.[0-9a-f]{64}$/);
    assert.equal(verifyApproval({ shop: SHOP, id: first.id, sha256: sha256(bytes), version: first.version, name: 'عبد الرحمن' }, own.body.approval, SERVICE_SECRET), own.body.approvedAt);
  } finally { await t.stop(); }
});
test('storefront listing is bounded for long-lived tokens', () => {
  const l = new Ledger(':memory:', { budgetMicros: 1e9, batchReserveMicros: 1, jobsPerHour: 1e6, maxPending: 1e6 });
  try {
    let t = 0; l.now = () => t;
    for (let day = 0; day < 20; day++) {
      t = day * 86_400_001;
      for (let b = 0; b < 3; b++) { const { job } = l.begin('s', 'نورة'); for (let i = 0; i < 3; i++) l.addDesign(job, { id: `d${day}-${b}-${i}`, slot: 0, sha256: 'a'.repeat(64), version: 'v', receipt: 'r' }); l.finish(job.id, 'complete', 1); }
    }
    const s = l.status('s');
    assert.equal(s.designs.length, MAX_LISTED_DESIGNS);
    assert.equal(s.designs.at(-1).ordinal, 180); assert.ok(s.designs[0].ordinal < s.designs.at(-1).ordinal);
  } finally { l.close(); }
});
test('invalid signature, shop, timestamp, body and route are rejected before any work', async () => {
  const t = await start();
  try {
    for (const o of [{ tamper: true }, { shop: 'other.myshopify.com' }, { ts: 1000 }, { secret: 'nope' }]) assert.equal((await post(t, '/generate', { name: 'نورة' }, o)).status, 401);
    const raw = await fetch(t.base + signed('/session'), { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
    assert.equal(raw.status, 400);
    assert.equal((await post(t, '/session', 'not json')).status, 400);
    assert.equal((await post(t, '/session', JSON.stringify({ pad: 'x'.repeat(5000) }))).status, 400);
    assert.equal((await post(t, '/nope', {})).status, 404);
    assert.equal((await fetch(t.base + '/proxy/session', { method: 'POST' })).status, 401);
    assert.equal((await fetch(t.base + '/anything')).status, 404);
    const ping = await fetch(t.base + signed('/ping'));
    assert.equal(ping.status, 200); assert.deepEqual(await ping.json(), { ok: true, proxied: true, generation: true });
    assert.equal((await fetch(t.base + '/proxy/ping')).status, 401, 'unsigned probe is refused');
    assert.equal((await fetch(t.base + signed('/ping', { tamper: true }))).status, 401);
    assert.equal((await fetch(t.base + signed('/ping'), { method: 'POST' })).status, 404);
    assert.equal(t.provider.calls.length, 0);
  } finally { await t.stop(); }
});
test('zero budget or disabled flag never calls the provider', async () => {
  for (const extra of [{ BUDGET_USD_MICROS: '0' }, { GENERATION_ENABLED: 'false' }, { OPENAI_API_KEY: '' }]) {
    const t = await start({ envExtra: extra });
    try {
      const s = await post(t, '/session', {}); assert.equal(s.body.enabled, false);
      const g = await post(t, '/generate', { token: s.body.token, name: 'نورة' });
      assert.equal(g.status, 503); assert.equal(g.body.code, 'BUDGET_DISABLED'); assert.equal(t.provider.calls.length, 0);
    } finally { await t.stop(); }
  }
});
test('enabled is false once the remaining budget cannot cover another batch', async () => {
  const t = await start({ budgetBatches: 1, provider: fakeProvider({ behaviour: () => 'nousage' }) });
  try {
    const s = (await post(t, '/session', {})).body; assert.equal(s.enabled, true);
    await post(t, '/generate', { token: s.token, name: 'نورة' }); await t.worker.idle();
    const after = (await post(t, '/session', {})).body;
    assert.equal(after.enabled, false, 'no dead generate button when the budget is spent');
    assert.equal((await post(t, '/generate', { token: after.token, name: 'نورة' })).body.code, 'BUDGET_REACHED');
  } finally { await t.stop(); }
});
test('concurrent sessions cannot exceed the global budget', async () => {
  // 'nousage' settles at the worst case, so the two admitted batches keep the whole budget committed.
  const t = await start({ budgetBatches: 2, provider: fakeProvider({ behaviour: () => 'nousage' }) });
  try {
    const tokens = await Promise.all(Array.from({ length: 6 }, async (_, i) => (await post(t, '/session', {}, { ip: `198.51.100.${i}` })).body.token));
    const results = await Promise.all(tokens.map((token, i) => post(t, '/generate', { token, name: 'سارة' }, { ip: `198.51.100.${i}` })));
    assert.equal(results.filter((r) => r.status === 202).length, 2);
    assert.ok(results.filter((r) => r.status !== 202).every((r) => r.body.code === 'BUDGET_REACHED'));
    await t.worker.idle();
    assert.equal(t.provider.calls.length, 6);
  } finally { await t.stop(); }
});
test('settlement uses proven usage; ambiguous failures keep reservation; unbilled rejections release it', async () => {
  let mode = 'ok';
  const t = await start({ provider: fakeProvider({ behaviour: () => mode }) });
  try {
    const reserve = t.config.batchReserveMicros, perImage = t.config.cost.actualMicros(USAGE);
    const a = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token: a, name: 'نورة' }); await t.worker.idle();
    assert.equal(t.ledger.committedMicros(), 3 * perImage); assert.ok(3 * perImage < reserve);
    mode = 'ambiguous';
    const b = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token: b, name: 'نورة' }); await t.worker.idle();
    assert.equal(t.ledger.committedMicros(), 3 * perImage + reserve, 'unknown outcome keeps full reservation');
    let s = (await post(t, '/session', { token: b })).body; assert.equal(s.designs.length, 0); assert.equal(s.remaining, 6);
    mode = 'unbilled';
    const c = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token: c, name: 'نورة' }); await t.worker.idle();
    assert.equal(t.ledger.committedMicros(), 3 * perImage + reserve, 'definitive rejections cost nothing');
    s = (await post(t, '/session', { token: c })).body; assert.equal(s.remaining, 9, 'released job does not consume the customer quota');
    mode = 'nousage';
    const d = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token: d, name: 'نورة' }); await t.worker.idle();
    assert.equal(t.ledger.committedMicros(), 3 * perImage + 2 * reserve, 'missing usage is charged at the worst case');
  } finally { await t.stop(); }
});
test('partial batches: every missing image has a safe logged code, certain refusals use no quota, only 429 is retried', async () => {
  let mode = 'forbid2';
  const t = await start({ provider: fakeProvider({ behaviour: (slot, n) => (mode === 'forbid2' ? (slot % 3 === 0 ? 'ok' : 'forbidden')
    : mode === 'flaky429' ? (n <= 2 ? 'unbilled' : 'ok') : mode === 'always429' ? 'unbilled' : 'ambiguous') }) });
  try {
    const a = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token: a, name: 'عبد الرحمن' }); await t.worker.idle();
    let s = (await post(t, '/session', { token: a })).body;
    assert.equal(s.designs.length, 1, 'one visible design');
    assert.equal(s.remaining, 6, 'two refused (unbilled) images do not consume the quota; one billed image does');
    const failed = t.events.filter((e) => e.e === 'call_failed');
    assert.deepEqual(failed.map((e) => [e.code, e.providerCode, e.billed]), [['PROVIDER_HTTP_403', 'model_not_found', false], ['PROVIDER_HTTP_403', 'model_not_found', false]]);
    assert.equal(t.provider.calls.length, 3, '403 is never retried');
    const done = t.events.find((e) => e.e === 'job_done');
    assert.deepEqual([done.state, done.visible, done.refused, done.failed, done.screened, done.duplicate], ['partial', 1, 2, 0, 0, 0]);
    assert.ok(!JSON.stringify(t.events).includes('عبد الرحمن') && !JSON.stringify(t.events).includes(a), 'no name or token in logs');
    assert.deepEqual(t.ledger.all('SELECT slot, outcome, detail FROM calls ORDER BY slot').map((r) => [r.slot, r.outcome, r.detail]),
      [[0, 'ok', 'visible'], [1, 'rejected_unbilled', 'PROVIDER_HTTP_403:model_not_found'], [2, 'rejected_unbilled', 'PROVIDER_HTTP_403:model_not_found']]);
    const cli = JSON.parse(execFileSync(process.execPath, [join(HERE, 'maintenance.mjs'), 'calls', '5'], { env: { ...process.env, DATA_DIR: t.dir }, encoding: 'utf8' }));
    assert.deepEqual(cli.map((r) => r.detail).sort(), ['PROVIDER_HTTP_403:model_not_found', 'PROVIDER_HTTP_403:model_not_found', 'visible']);
    assert.ok(!JSON.stringify(cli).includes('عبد'), 'operator output carries no names');
    // A rate-limit refusal is retried (bounded) and the batch completes.
    mode = 'flaky429'; t.provider.calls.length = 0;
    const b = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token: b, name: 'لمى' }); await t.worker.idle();
    assert.equal((await post(t, '/session', { token: b })).body.designs.length, 3);
    assert.equal(t.events.filter((e) => e.e === 'call_retry').length, 2);
    // A persistent 429 stops after the bounded retries and costs nothing.
    mode = 'always429'; t.provider.calls.length = 0;
    const c = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token: c, name: 'لمى' }); await t.worker.idle();
    assert.equal(t.provider.calls.length, 9, 'three slots, one call plus two retries each');
    s = (await post(t, '/session', { token: c })).body; assert.equal(s.remaining, 9); assert.equal(s.designs.length, 0);
    // Possibly billed failures are never retried and do use the quota.
    mode = 'ambiguous'; t.provider.calls.length = 0;
    const d = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token: d, name: 'لمى' }); await t.worker.idle();
    assert.equal(t.provider.calls.length, 3); assert.equal((await post(t, '/session', { token: d })).body.remaining, 6);
  } finally { await t.stop(); }
});
test('screening hides colourful and duplicate outputs; cost-model breach halts generation', async () => {
  let mode = 'colour';
  const t = await start({ provider: fakeProvider({ behaviour: (slot, n) => (mode === 'mixed' ? (n % 3 === 0 ? 'colour' : 'ok') : mode) }) });
  try {
    const a = (await post(t, '/session', {})).body.token;
    mode = 'mixed'; await post(t, '/generate', { token: a, name: 'لمى' }); await t.worker.idle();
    assert.equal((await post(t, '/session', { token: a })).body.designs.length, 2);
    mode = 'duplicate'; await post(t, '/generate', { token: a, name: 'لمى' }); await t.worker.idle();
    assert.equal((await post(t, '/session', { token: a })).body.designs.length, 3, 'only the first of three identical images is kept');
    assert.ok(t.events.some((e) => e.reason === 'DUPLICATE') && t.events.some((e) => e.reason === 'NOT_MONOCHROME'));
    mode = 'expensive';
    const b = (await post(t, '/session', {})).body.token;
    const before = t.ledger.committedMicros();
    await post(t, '/generate', { token: b, name: 'لمى' }); await t.worker.idle();
    assert.equal(t.ledger.halted(), 'COST_MODEL_EXCEEDED');
    assert.ok(t.ledger.committedMicros() - before > t.config.batchReserveMicros, 'observed overshoot is recorded, not capped at the reservation');
    const c = (await post(t, '/session', {})).body;
    assert.equal(c.enabled, false);
    assert.equal((await post(t, '/generate', { token: c.token, name: 'لمى' })).body.code, 'GENERATION_HALTED');
  } finally { await t.stop(); }
});
test('restart during a pending job keeps the reservation and never replays the paid call', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cds-restart-'));
  const hanging = fakeProvider({ behaviour: () => 'hang' });
  const t1 = await start({ dir, provider: hanging });
  const token = (await post(t1, '/session', {})).body.token;
  await post(t1, '/generate', { token, name: 'رؤى' });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal((await post(t1, '/session', { token })).body.pending, true);
  await t1.stop({ keep: true });
  const again = fakeProvider();
  const t2 = await start({ dir, provider: again });
  try {
    assert.equal(t2.recovered, 1);
    const s = (await post(t2, '/session', { token })).body;
    assert.equal(s.pending, false); assert.equal(s.lastName, 'رؤى'); assert.equal(s.remaining, 6);
    assert.equal(t2.ledger.committedMicros(), t2.config.batchReserveMicros);
    assert.equal(again.calls.length, 0, 'no automatic replay after restart');
  } finally { hanging.hang.forEach((r) => r({ png: syntheticPng(1), usage: USAGE })); await t2.stop(); }
});
test('calls that cannot start before the queue deadline, after a halt, or without the lease are skipped unbilled', async () => {
  const t = await start({ envExtra: { PROVIDER_IMAGES_PER_MINUTE: '1', QUEUE_WAIT_MS: '50' } });
  try {
    const a = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token: a, name: 'نورة' }); await t.worker.idle();
    assert.equal(t.provider.calls.length, 1, 'only one image fits the per-minute window before the deadline');
    const calls = t.ledger.all("SELECT outcome, detail FROM calls ORDER BY id");
    assert.deepEqual(calls.map((c) => c.outcome).sort(), ['ok', 'rejected_unbilled', 'rejected_unbilled']);
    assert.ok(calls.filter((c) => c.outcome === 'rejected_unbilled').every((c) => c.detail === 'QUEUE_TIMEOUT'));
    assert.equal(t.ledger.committedMicros(), t.config.cost.actualMicros(USAGE), 'skipped calls cost nothing');
    assert.equal((await post(t, '/session', { token: a })).body.designs.length, 1);
  } finally { await t.stop(); }
  const u = await start({ workerOptions: { leaseOwner: 'not-the-holder' } });
  try {
    const a = (await post(u, '/session', {})).body.token;
    await post(u, '/generate', { token: a, name: 'نورة' }); await u.worker.idle();
    assert.equal(u.provider.calls.length, 0, 'a process without the single-worker lease never calls the provider');
    assert.deepEqual(u.ledger.all('SELECT DISTINCT detail FROM calls').map((r) => r.detail), ['LEASE_LOST']);
    assert.equal((await post(u, '/session', { token: a })).body.remaining, 9, 'released: no quota consumed');
  } finally { await u.stop(); }
});
test('single-worker lease: exclusive, renewable, expiring', () => {
  let t = 1_000;
  const l = new Ledger(':memory:', { now: () => t });
  try {
    assert.equal(l.acquireLease('A', 30_000), true); assert.equal(l.acquireLease('B', 30_000), false);
    assert.equal(l.holdsLease('A'), true); assert.equal(l.holdsLease('B'), false);
    t += 20_000; assert.equal(l.acquireLease('A', 30_000), true, 'renewal');
    t += 29_000; assert.equal(l.acquireLease('B', 30_000), false);
    t += 2_000; assert.equal(l.acquireLease('B', 30_000), true, 'expired lease can be taken over'); assert.equal(l.holdsLease('A'), false);
  } finally { l.close(); }
});
test('per-IP request limit', async () => {
  const t = await start({ envExtra: { IP_REQUESTS_PER_MINUTE: '5' } });
  try {
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await post(t, '/session', {}, { ip: '192.0.2.1' })).status);
    assert.deepEqual(codes, [200, 200, 200, 200, 200, 429, 429]);
    assert.equal((await post(t, '/session', {}, { ip: '9.9.9.9, 192.0.2.1' })).status, 429, 'prepending a fake address does not reset the limit');
    assert.equal((await post(t, '/session', {}, { ip: '192.0.2.2' })).status, 200);
  } finally { await t.stop(); }
});
test('order webhook and CLI verify the exact approved original; tampering is flagged', async () => {
  const t = await start();
  try {
    const token = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token, name: 'أحمد' }); await t.worker.idle();
    const d = (await post(t, '/session', { token })).body.designs[1];
    const url = 'https://calapres.com' + d.url;
    const approval = (await post(t, '/approve', { token, id: d.id })).body.approval;
    const sha = d.url.match(/([0-9a-f]{64})/)[1];
    const unrecorded = signApproval({ shop: SHOP, id: d.id, sha256: sha, version: d.version, name: 'أحمد' }, 1790000000, SERVICE_SECRET);
    const props = (o = {}) => Object.entries({ 'طريقة التخصيص': METHOD_GENERATED, 'نص الحفر': 'أحمد', 'تصميم الحفر': url, 'معرف التصميم': d.id, 'نسخة التصميم': d.version, _design_receipt: approval, 'اعتماد التصميم': APPROVAL_TEXT, ...o })
      .filter(([, v]) => v !== undefined).map(([name, value]) => ({ name, value }));
    const order = { id: 7001, line_items: [
      { id: 1, properties: props() },
      { id: 2, properties: props({ 'نص الحفر': 'احمد' }) },
      { id: 3, properties: props({ _design_receipt: 'r1.' + '0'.repeat(64) }) },
      { id: 4, properties: props({ 'تصميم الحفر': 'https://calapres.com' + PREFIX + '/a/' + 'e'.repeat(64) + '.png' }) },
      { id: 5, properties: props({ 'اعتماد التصميم': undefined }) },
      { id: 6, properties: props({ 'نسخة التصميم': 'p9' }) },
      { id: 7, properties: [{ name: 'طريقة التخصيص', value: 'تصميم مرفوع' }, { name: 'اعتماد التصميم', value: APPROVAL_TEXT }] },
      { id: 8, properties: [] },
      { id: 9, properties: props({ _design_receipt: d.receipt }) },
      { id: 10, properties: props({ _design_receipt: unrecorded }) },
    ] };
    const raw = Buffer.from(JSON.stringify(order));
    const good = createHmac('sha256', APP_SECRET).update(raw).digest('base64');
    const hook = (hmac, { shop = SHOP, topic = 'orders/create', id = 'delivery-1' } = {}) => fetch(t.base + '/webhooks/orders-create', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-shopify-hmac-sha256': hmac, 'x-shopify-shop-domain': shop, 'x-shopify-topic': topic, 'x-shopify-webhook-id': id }, body: raw });
    assert.equal((await hook('bad')).status, 401);
    assert.equal((await hook(good, { shop: 'evil.myshopify.com' })).status, 401);
    assert.deepEqual(await (await hook(good, { topic: 'orders/updated', id: 'other' })).json(), { ok: true, ignored: 'topic' });
    const ok = await hook(good);
    assert.equal(ok.status, 200); assert.equal((await ok.json()).checked, 9);
    const again = await hook(good);
    assert.deepEqual(await again.json(), { ok: true, duplicate: true }, 'redelivery of the same webhook id is not reprocessed');
    const checks = Object.fromEntries(t.ledger.all('SELECT line_id,status,reason FROM order_checks').map((r) => [r.line_id, `${r.status}:${r.reason}`]));
    assert.deepEqual(checks, { 1: 'verified:null', 2: 'invalid:NAME_MISMATCH', 3: 'invalid:RECEIPT_INVALID', 4: 'invalid:ASSET_MISMATCH', 5: 'invalid:APPROVAL_MISSING',
      6: 'invalid:VERSION_MISMATCH', 7: 'upload:null', 9: 'invalid:RECEIPT_INVALID', 10: 'invalid:APPROVAL_NOT_RECORDED' });
    assert.ok(t.ledger.design(d.id).ordered_at, 'verified design is marked ordered');
    const all = t.ledger.all('SELECT sha256 FROM designs').map((r) => r.sha256);
    const prunable = t.ledger.prunableDigests(Date.now() + 1000);
    assert.ok(!prunable.includes(d.url.match(/([0-9a-f]{64})/)[1]) && prunable.length === all.length - 1, 'ordered original is never prunable');
    // Production CLI: exports the exact stored bytes for the verified line and exits non-zero because of the tampered lines.
    const orderFile = join(t.dir, 'order.json'), outDir = join(t.dir, 'export');
    writeFileSync(orderFile, JSON.stringify({ id: 7001, line_items: [order.line_items[0]] }));
    const out = execFileSync(process.execPath, [join(HERE, 'verify-order.mjs'), orderFile, '--export', outDir], { env: { ...process.env, DATA_DIR: t.dir, SHOPIFY_SHOP: SHOP, SERVICE_SECRET }, encoding: 'utf8' });
    const line = JSON.parse(out.trim());
    assert.equal(line.status, 'verified');
    assert.ok(readFileSync(line.exported).equals(t.store.get(line.sha256)));
    writeFileSync(orderFile, JSON.stringify(order));
    assert.throws(() => execFileSync(process.execPath, [join(HERE, 'verify-order.mjs'), orderFile], { env: { ...process.env, DATA_DIR: t.dir, SHOPIFY_SHOP: SHOP, SERVICE_SECRET }, encoding: 'utf8' }), (e) => e.status === 1);
  } finally { await t.stop(); }
});

// ---------- the real entry point, generation disabled (no provider key anywhere) ----------
function launch(dataDir, extra = {}) {
  const child = spawn(process.execPath, [join(HERE, 'server.mjs')], {
    env: { PATH: process.env.PATH, DATA_DIR: dataDir, PORT: '0', HOST: '127.0.0.1', SHOPIFY_SHOP: SHOP, SHOPIFY_API_SECRET: APP_SECRET, SERVICE_SECRET, LEASE_TTL_MS: '2000', ...extra },
    stdio: ['ignore', 'pipe', 'pipe'] });
  const lines = []; let buf = '';
  child.stdout.on('data', (c) => { buf += c; let i; while ((i = buf.indexOf('\n')) >= 0) { lines.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } });
  const exited = new Promise((r) => child.on('exit', (code) => r(code)));
  const waitFor = async (event, ms = 8000) => { const end = Date.now() + ms; while (Date.now() < end) { const l = lines.find((x) => x.event === event); if (l) return l; await new Promise((r) => setTimeout(r, 50)); } throw Error('timeout ' + event); };
  return { child, lines, exited, waitFor };
}
test('server.mjs starts with generation disabled, serves the proxy contract and refuses a second instance', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cds-server-'));
  // PORT=0 cannot be discovered from outside, so bind an explicit free port.
  const probe = createServer(); await new Promise((r) => probe.listen(0, '127.0.0.1', r)); const port = probe.address().port; await new Promise((r) => probe.close(r));
  const a = launch(dir, { PORT: String(port) });
  try {
    const started = await a.waitFor('started');
    assert.equal(started.generationEnabled, false);
    assert.deepEqual(started.missing, ['GENERATION_ENABLED', 'OPENAI_API_KEY', 'BUDGET_USD_MICROS', 'PRICE_*/MAX_OUTPUT_TOKENS_PER_IMAGE']);
    assert.ok(!JSON.stringify(a.lines).includes(SERVICE_SECRET) && !JSON.stringify(a.lines).includes(APP_SECRET), 'no secrets in logs');
    const base = `http://127.0.0.1:${port}`;
    assert.deepEqual(await (await fetch(base + '/healthz')).json(), { ok: true, proxy: true, generation: false });
    const s = await (await fetch(base + signed('/session'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
    assert.equal(s.enabled, false); assert.match(s.token, /^s1\./);
    const g = await fetch(base + signed('/generate'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: s.token, name: 'نورة' }) });
    assert.equal(g.status, 503); assert.equal((await g.json()).code, 'BUDGET_DISABLED');
    assert.equal((await fetch(base + signed('/session'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' , redirect: 'manual' })).status, 200);
    const b = launch(dir, { PORT: String(port + 1) });
    assert.equal(await b.exited, 1, 'second process on the same data directory exits');
    assert.equal(b.lines.at(-1).reason, 'ANOTHER_INSTANCE_HOLDS_LEASE');
  } finally {
    a.child.kill('SIGTERM'); assert.equal(await a.exited, 0);
    const c = launch(dir, { PORT: String(port) });
    await c.waitFor('started'); c.child.kill('SIGTERM'); await c.exited; // lease was released on clean stop
    rmSync(dir, { recursive: true, force: true });
  }
});
test('without the Shopify secret every proxy and webhook route is closed; without a service secret it refuses to start', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cds-server-'));
  const probe = createServer(); await new Promise((r) => probe.listen(0, '127.0.0.1', r)); const port = probe.address().port; await new Promise((r) => probe.close(r));
  try {
    const x = launch(dir, { SERVICE_SECRET: '' });
    assert.equal(await x.exited, 1); assert.equal(x.lines.at(-1).event, 'fatal');
    const y = launch(dir, { SHOPIFY_API_SECRET: '', PORT: String(port) });
    await y.waitFor('started'); assert.ok(y.lines.some((l) => l.event === 'proxy_disabled'));
    const base = `http://127.0.0.1:${port}`;
    try {
      assert.deepEqual(await (await fetch(base + '/healthz')).json(), { ok: true, proxy: false, generation: false });
      // Even a request signed with an empty key is refused: nothing is verified against a missing secret.
      const q = new URLSearchParams({ shop: SHOP, logged_in_customer_id: '', path_prefix: PREFIX, timestamp: String(Math.floor(Date.now() / 1000)) });
      q.set('signature', proxySignature(q, ''));
      for (const [path, init] of [[`/proxy/ping?${q}`, {}], [`/proxy/session?${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }], ['/webhooks/orders-create', { method: 'POST', body: '{}' }]]) {
        const r = await fetch(base + path, init); assert.equal(r.status, 503); assert.equal((await r.json()).code, 'PROXY_NOT_CONFIGURED');
      }
    } finally { y.child.kill('SIGTERM'); await y.exited; }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('SERVICE_SECRET_FILE is generated once with mode 0600, reused, and never logged', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cds-secret-'));
  const probe = createServer(); await new Promise((r) => probe.listen(0, '127.0.0.1', r)); const port = probe.address().port; await new Promise((r) => probe.close(r));
  const file = join(dir, 'service-secret');
  try {
    const a = launch(dir, { SERVICE_SECRET: '', SERVICE_SECRET_FILE: file, SERVICE_SECRET_AUTOGEN: 'true', PORT: String(port) });
    await a.waitFor('started');
    const secret = readFileSync(file, 'utf8');
    assert.ok(Buffer.byteLength(secret) >= 32); assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.ok(!JSON.stringify(a.lines).includes(secret), 'secret never logged');
    const s1 = await (await fetch(`http://127.0.0.1:${port}` + signed('/session'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
    a.child.kill('SIGTERM'); await a.exited;
    const b = launch(dir, { SERVICE_SECRET: '', SERVICE_SECRET_FILE: file, SERVICE_SECRET_AUTOGEN: 'true', PORT: String(port) });
    await b.waitFor('started');
    assert.equal(readFileSync(file, 'utf8'), secret, 'reused, not regenerated');
    assert.ok(!b.lines.some((l) => l.event === 'service_secret_generated'));
    const s2 = await (await fetch(`http://127.0.0.1:${port}` + signed('/session'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: s1.token }) })).json();
    assert.equal(s2.token, s1.token, 'session token survives a restart');
    b.child.kill('SIGTERM'); await b.exited;
    const c = launch(join(dir, 'other'), { SERVICE_SECRET: '', SERVICE_SECRET_FILE: join(dir, 'missing'), PORT: String(port) });
    assert.equal(await c.exited, 1, 'no file and no autogen: refuses to start');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('REQUIRE_MOUNTED_DATA_DIR refuses a missing or non-mounted data directory and never creates it', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'cds-mount-'));
  try {
    const missing = join(parent, 'data');
    const a = launch(missing, { REQUIRE_MOUNTED_DATA_DIR: 'true' });
    assert.equal(await a.exited, 1); assert.equal(a.lines.at(-1).reason, 'DATA_DIR_NOT_MOUNTED');
    assert.equal(existsSync(missing), false, 'the directory was not created');
    mkdirSync(missing);
    const b = launch(missing, { REQUIRE_MOUNTED_DATA_DIR: 'true' });
    assert.equal(await b.exited, 1); assert.equal(b.lines.at(-1).reason, 'DATA_DIR_NOT_MOUNTED', 'same filesystem as its parent');
  } finally { rmSync(parent, { recursive: true, force: true }); }
});
test('maintenance CLI: status, consistent backup and dry-run prune', async () => {
  const t = await start();
  try {
    const token = (await post(t, '/session', {})).body.token;
    await post(t, '/generate', { token, name: 'لمى' }); await t.worker.idle();
    const run = (...a) => JSON.parse(execFileSync(process.execPath, [join(HERE, 'maintenance.mjs'), ...a], { env: { ...process.env, DATA_DIR: t.dir }, encoding: 'utf8' }));
    const st = run('status');
    assert.equal(st.designs, 3); assert.equal(st.jobs.complete, 1); assert.equal(st.halted, null);
    const bk = run('backup', join(t.dir, 'backups'));
    assert.equal(bk.missingOriginals, 0); assert.equal(bk.originalsListed, 3);
    const copy = new Ledger(bk.ledger); try { assert.equal(copy.one('SELECT count(*) n FROM designs').n, 3); } finally { copy.close(); }
    const pr = run('prune', '--older-than-days', '30');
    assert.equal(pr.applied, false); assert.equal(pr.candidates, 0, 'nothing is older than the cutoff');
    assert.equal(run('halt', 'test').halted, 'test'); assert.equal(run('resume').halted, null);
    assert.throws(() => execFileSync(process.execPath, [join(HERE, 'maintenance.mjs'), 'prune', '--older-than-days', '3'], { env: { ...process.env, DATA_DIR: t.dir }, encoding: 'utf8', stdio: 'pipe' }), (e) => e.status === 2, 'refuses cutoffs under 30 days');
  } finally { await t.stop(); }
});
test('Hostinger compose fits the 32768-character limit and its bootstrap restores the exact runtime or refuses', async () => {
  const { buildCompose, BOOTSTRAP, RUNTIME_FILES, MAX_COMPOSE_CHARS, shipped } = await import('./deploy/hostinger/build-compose.mjs');
  const { yaml, sums, payload } = buildCompose('test');
  assert.ok(yaml.length <= MAX_COMPOSE_CHARS, `compose is ${yaml.length} chars`);
  assert.ok(!/OPENAI_API_KEY: "sk-|SHOPIFY_API_SECRET: "[^$]/.test(yaml), 'no secret values');
  assert.match(yaml, /GENERATION_ENABLED: "\$\{GENERATION_ENABLED:-false\}"/); assert.match(yaml, /BUDGET_USD_MICROS: "\$\{BUDGET_USD_MICROS:-0\}"/);
  const root = mkdtempSync(join(tmpdir(), 'cds-pack-'));
  try {
    const run = (packed) => {
      for (const d of ['pack', 'app', 'data']) mkdirSync(join(root, d), { recursive: true });
      writeFileSync(join(root, 'pack', 'bootstrap.cjs'), BOOTSTRAP);
      writeFileSync(join(root, 'pack', 'runtime.b64'), packed.replace(/.{1,120}/g, '$&\n'));
      writeFileSync(join(root, 'pack', 'sums.json'), JSON.stringify(sums));
      writeFileSync(join(root, 'app', 'stale.mjs'), 'old');
      return execFileSync(process.execPath, [join(root, 'pack', 'bootstrap.cjs')], { env: { PATH: process.env.PATH, PACK_DIR: join(root, 'pack'), APP_DIR: join(root, 'app'), DATA_INIT_DIR: join(root, 'data') }, encoding: 'utf8', stdio: 'pipe' });
    };
    assert.match(run(payload), /14 files verified/);
    for (const f of RUNTIME_FILES) assert.equal(readFileSync(join(root, 'app', f), 'utf8'), shipped(readFileSync(join(HERE, f), 'utf8')), `${f} restored byte-identical to its shipped form`);
    // The restored (comment-stripped) runtime itself starts and serves the closed-proxy health check.
    const probe = createServer(); await new Promise((r) => probe.listen(0, '127.0.0.1', r)); const port = probe.address().port; await new Promise((r) => probe.close(r));
    const child = spawn(process.execPath, [join(root, 'app', 'server.mjs')], { env: { PATH: process.env.PATH, DATA_DIR: join(root, 'data'), PORT: String(port), HOST: '127.0.0.1', SERVICE_SECRET, LEASE_TTL_MS: '2000' }, stdio: 'ignore' });
    try {
      let health; for (let i = 0; i < 80 && !health; i++) { await new Promise((r) => setTimeout(r, 50)); try { health = await (await fetch(`http://127.0.0.1:${port}/healthz`)).json(); } catch {} }
      assert.deepEqual(health, { ok: true, proxy: false, generation: false });
    } finally { child.kill('SIGTERM'); await new Promise((r) => child.on('exit', r)); }
    assert.equal(existsSync(join(root, 'app', 'stale.mjs')), false, 'stale files removed');
    assert.equal(statSync(join(root, 'data')).mode & 0o777, 0o700);
    const { brotliDecompressSync, brotliCompressSync } = await import('node:zlib');
    const files = JSON.parse(brotliDecompressSync(Buffer.from(payload, 'base64')));
    files['app.mjs'] += '\n// tampered';
    assert.throws(() => run(brotliCompressSync(Buffer.from(JSON.stringify(files))).toString('base64')), /RUNTIME_DIGEST_MISMATCH app\.mjs/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('.env.example parses as a plain env file and starts with generation off', () => {
  const vars = {};
  for (const line of readFileSync(join(HERE, '.env.example'), 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const i = line.indexOf('='); const k = line.slice(0, i), v = line.slice(i + 1);
    assert.ok(!v.includes('#'), `no trailing comment on ${k}`); vars[k] = v;
  }
  const c = loadConfig({ ...vars, SHOPIFY_API_SECRET: 'x', SERVICE_SECRET: SERVICE_SECRET });
  assert.equal(c.generationEnabled, false); assert.equal(c.budgetMicros, 0); assert.equal(c.clientIpHeader, 'x-calapres-client-chain');
  assert.deepEqual(c.generationMissing, ['GENERATION_ENABLED', 'OPENAI_API_KEY', 'BUDGET_USD_MICROS', 'PRICE_*/MAX_OUTPUT_TOKENS_PER_IMAGE']);
});
