// Security primitives for the Calapres design service. No I/O, no secrets in logs.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const equal = (a, b) =>
  typeof a === 'string' && typeof b === 'string' && a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));

const hmacHex = (secret, message) => createHmac('sha256', secret).update(message).digest('hex');
// Domain-separated sub-keys so one service secret never signs two kinds of object.
export const deriveKey = (secret, purpose) => createHmac('sha256', secret).update(`calapres-design:${purpose}`).digest();

// Shopify app proxy signature: drop `signature`, render each key as key=v1,v2 (repeated values
// joined by commas), sort the rendered pairs, concatenate without separators, HMAC-SHA256 hex
// with the app's shared secret. Matches shopify.dev "Authenticate app proxies" (checked 2026-09-23).
export function proxySignature(params, secret) {
  const keys = [...new Set(params.keys())].filter((k) => k !== 'signature');
  const message = keys.map((k) => `${k}=${params.getAll(k).join(',')}`).sort().join('');
  return hmacHex(secret, message);
}

export function authenticateProxy(url, { shop, secret, prefix, now = Date.now(), maxSkewSeconds = 300 }) {
  const q = url.searchParams;
  for (const k of ['shop', 'timestamp', 'path_prefix', 'signature']) if (q.getAll(k).length !== 1) throw Error('UNAUTHORIZED');
  const ts = q.get('timestamp');
  if (!secret || q.get('shop') !== shop || q.get('path_prefix') !== prefix || !/^\d{1,12}$/.test(ts) ||
      Math.abs(now / 1000 - Number(ts)) > maxSkewSeconds || !equal(proxySignature(q, secret), q.get('signature'))) {
    throw Error('UNAUTHORIZED');
  }
}

// Shopify webhook: base64 HMAC-SHA256 of the exact raw body with the app client secret.
export function verifyWebhook(rawBody, headerValue, secret) {
  if (!secret || typeof headerValue !== 'string' || !Buffer.isBuffer(rawBody)) return false;
  return equal(createHmac('sha256', secret).update(rawBody).digest('base64'), headerValue);
}

// Arabic letters only (hamza forms, alef maqsura, ta marbuta included). Rejects tashkeel,
// tatweel, digits, Latin and punctuation instead of silently rewriting the customer's spelling.
const ARABIC_WORD = '[\\u0621-\\u063A\\u0641-\\u064A]+';
const NAME_RE = new RegExp(`^${ARABIC_WORD}(?: ${ARABIC_WORD}){0,3}$`, 'u');
export const MAX_NAME_CHARS = 30;
export function normalizeName(value) {
  if (typeof value !== 'string' || value.length > 200) throw Error('INVALID_NAME');
  const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!NAME_RE.test(name) || [...name].length > MAX_NAME_CHARS) throw Error('INVALID_NAME');
  return name;
}

// Opaque browser session token: s1.<24 random bytes>.<16-byte MAC>. The server only persists a
// session after its first paid request, so unauthenticated token minting cannot grow the database.
const b64u = (buf) => Buffer.from(buf).toString('base64url');
export function issueSessionToken(secret) {
  const id = b64u(randomBytes(24));
  return `s1.${id}.${b64u(createHmac('sha256', deriveKey(secret, 'session')).update(id).digest().subarray(0, 16))}`;
}
export function sessionIdFromToken(token, secret) {
  if (typeof token !== 'string' || token.length > 80) return null;
  const m = /^s1\.([A-Za-z0-9_-]{32})\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!m) return null;
  const mac = b64u(createHmac('sha256', deriveKey(secret, 'session')).update(m[1]).digest().subarray(0, 16));
  return equal(mac, m[2]) ? m[1] : null;
}

// Receipt binds the exact stored original (sha256), the normalized name, the design id and the
// design version to this shop. It proves the service produced that file for that name; customer
// approval is a separate order property and is checked separately.
export function receiptMessage({ shop, id, sha256, version, name }) {
  for (const v of [shop, id, sha256, version, name]) if (typeof v !== 'string' || !v || v.includes('\n')) throw Error('INVALID_RECEIPT_INPUT');
  return ['calapres-design-receipt', 'v1', shop, id, sha256, version, name].join('\n');
}
export function signReceipt(fields, secret) {
  return 'r1.' + hmacHex(deriveKey(secret, 'receipt'), receiptMessage(fields));
}
export function verifyReceipt(fields, receipt, secret) {
  try { return equal(signReceipt(fields, secret), receipt); } catch { return false; }
}

// Approval receipt: issued by the server only when the owning session approves one design, so the
// order line proves an in-session approval of exactly this stored original, name and version.
// Format a1.<unix-seconds>.<hex>. The approval time is part of the MAC and recorded in the ledger.
export function signApproval(fields, at, secret) {
  if (!Number.isSafeInteger(at) || at <= 0) throw Error('INVALID_APPROVAL_TIME');
  const mac = hmacHex(deriveKey(secret, 'approval'), receiptMessage(fields) + '\napproved\n' + at);
  return `a1.${at}.${mac}`;
}
export function parseApproval(receipt) {
  const m = typeof receipt === 'string' ? /^a1\.(\d{9,12})\.([0-9a-f]{64})$/.exec(receipt) : null;
  return m ? { at: Number(m[1]) } : null;
}
export function verifyApproval(fields, receipt, secret) {
  const p = parseApproval(receipt);
  if (!p) return null;
  try { return equal(signApproval(fields, p.at, secret), receipt) ? p.at : null; } catch { return null; }
}

// Client address for soft rate limiting. Shopify's app proxy sets X-Forwarded-For; every trusted
// reverse proxy in front of this service (Caddy = 1) appends one more entry. Taking the entry just
// before the trusted hops ignores anything a client may have injected at the front of the header.
export function clientIp(xff, remote, trustedHops = 1) {
  const parts = String(xff || '').split(',').map((s) => s.trim()).filter(Boolean);
  const i = parts.length - 1 - trustedHops;
  return (i >= 0 ? parts[i] : parts[0]) || remote || 'unknown';
}
