// Environment configuration. Every spending control defaults to OFF; generation turns on only when
// a provider key, an explicit budget and a complete cost model are all present.
import { costModel } from './cost.mjs';

const int = (v, d) => { if (v === undefined || v === '') return d; const n = Number(v); if (!Number.isSafeInteger(n) || n < 0) throw Error(`INVALID_CONFIG_INT:${v}`); return n; };
const num = (v) => (v === undefined || v === '' ? NaN : Number(v));

export function loadConfig(env = process.env) {
  const c = {
    port: int(env.PORT, 8787),
    host: env.HOST || '127.0.0.1',
    dataDir: env.DATA_DIR || './data',
    shop: env.SHOPIFY_SHOP || 'unywbe-ub.myshopify.com',
    proxyPrefix: env.PROXY_PATH_PREFIX || '/apps/calapres-design', // storefront prefix+subpath Shopify reports as path_prefix
    proxyBase: env.PROXY_BASE_PATH || '/proxy',                     // path on this server that the app proxy URL points to
    shopifySecret: env.SHOPIFY_API_SECRET || '',                    // app client secret: proxy + webhook signatures
    serviceSecret: env.SERVICE_SECRET || '',                        // >= 32 bytes: session tokens and receipts
    openaiKey: env.OPENAI_API_KEY || '',
    model: env.OPENAI_IMAGE_MODEL || 'gpt-image-2-2026-04-21',
    quality: env.OPENAI_IMAGE_QUALITY || 'low',
    budgetMicros: int(env.BUDGET_USD_MICROS, 0),
    jobsPerHour: int(env.JOBS_PER_HOUR, 20),
    maxPending: int(env.MAX_PENDING_JOBS, 4),
    imagesPerMinute: int(env.PROVIDER_IMAGES_PER_MINUTE, 5),
    ipRequestsPerMinute: int(env.IP_REQUESTS_PER_MINUTE, 120),                    // soft abuse control; carrier NAT shares addresses
    clientIpHeader: (env.CLIENT_IP_HEADER || 'x-forwarded-for').toLowerCase(),   // see deploy/Caddyfile.example
    trustedProxyHops: int(env.TRUSTED_PROXY_HOPS, 0),                              // proxies between Shopify and this process that append to that header
    queueWaitMs: int(env.QUEUE_WAIT_MS, 150_000),                                 // a call not sent within this window is skipped (unbilled)
    leaseTtlMs: int(env.LEASE_TTL_MS, 30_000),                                     // single-worker lease; a second process refuses to start
    enabledFlag: env.GENERATION_ENABLED === 'true',
    requireMountedDataDir: env.REQUIRE_MOUNTED_DATA_DIR === 'true',             // refuse to run on an ephemeral filesystem
  };
  if (c.serviceSecret && Buffer.byteLength(c.serviceSecret) < 32) throw Error('SERVICE_SECRET_TOO_SHORT');
  let cost = null, costError = null;
  try {
    cost = costModel({ textInputPerM: num(env.PRICE_TEXT_INPUT_USD_PER_M), imageInputPerM: num(env.PRICE_IMAGE_INPUT_USD_PER_M ?? 0) || 0,
      outputPerM: num(env.PRICE_IMAGE_OUTPUT_USD_PER_M), maxOutputTokensPerImage: num(env.MAX_OUTPUT_TOKENS_PER_IMAGE) });
  } catch (e) { costError = e.message; }
  c.cost = cost;
  const missing = [];
  if (!c.enabledFlag) missing.push('GENERATION_ENABLED');
  if (!c.openaiKey) missing.push('OPENAI_API_KEY');
  if (!c.budgetMicros) missing.push('BUDGET_USD_MICROS');
  if (!cost) missing.push('PRICE_*/MAX_OUTPUT_TOKENS_PER_IMAGE');
  if (!c.shopifySecret) missing.push('SHOPIFY_API_SECRET');
  if (!c.serviceSecret) missing.push('SERVICE_SECRET');
  c.generationMissing = missing;
  c.generationEnabled = missing.length === 0;
  c.batchReserveMicros = c.generationEnabled ? cost.batchReserveMicros : 0;
  c.costError = costError;
  return c;
}

// Safe summary for logs/health: never includes secret values.
export function describe(c) {
  return { shop: c.shop, proxyPrefix: c.proxyPrefix, model: c.model, quality: c.quality, generationEnabled: c.generationEnabled,
    missing: c.generationMissing, budgetMicros: c.budgetMicros, batchReserveMicros: c.batchReserveMicros,
    worstImageMicros: c.cost?.worstImageMicros ?? null, jobsPerHour: c.jobsPerHour, imagesPerMinute: c.imagesPerMinute,
    clientIpHeader: c.clientIpHeader, trustedProxyHops: c.trustedProxyHops, requireMountedDataDir: c.requireMountedDataDir };
}
