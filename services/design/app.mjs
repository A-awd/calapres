// HTTP surface. Storefront traffic arrives ONLY through the Shopify app proxy and is signature-checked;
// webhooks are HMAC-checked; nothing else is exposed except a minimal health check.
// The proxy signature proves Shopify forwarded the request; it does not sign the body and does not
// identify a customer. Identity here is the opaque signed session token in the JSON body.
import { authenticateProxy, verifyWebhook, issueSessionToken, sessionIdFromToken, normalizeName, signApproval, clientIp } from './security.mjs';
import { verifyLine, orderLines } from './verify.mjs';

const MESSAGES = {
  UNAUTHORIZED: [401, 'تعذر التحقق من الطلب.'],
  BAD_REQUEST: [400, 'طلب غير صالح.'],
  INVALID_NAME: [400, 'اكتب الاسم بالحروف العربية فقط، بدون تشكيل أو أرقام أو رموز، وبحد أقصى 30 حرفاً.'],
  UNKNOWN_DESIGN: [404, 'هذا التصميم غير متاح في جلستك. حدّث الصفحة واختر من تصاميمك.'],
  LIMIT_REACHED: [429, 'وصلت إلى الحد الأعلى: 9 تصاميم خلال 24 ساعة. يمكنك الاختيار من تصاميمك الحالية.'],
  RATE_LIMITED: [429, 'طلبات كثيرة خلال وقت قصير. انتظر دقيقة ثم حاول.'],
  BUSY: [503, 'الخدمة مشغولة الآن. حاول بعد دقائق، وتبقى تصاميمك محفوظة.'],
  BUDGET_DISABLED: [503, 'توليد التصاميم غير مفعّل حالياً. يمكنك رفع تصميمك.'],
  BUDGET_REACHED: [503, 'توليد التصاميم متوقف مؤقتاً. يمكنك رفع تصميمك.'],
  GENERATION_HALTED: [503, 'توليد التصاميم متوقف مؤقتاً للمراجعة. يمكنك رفع تصميمك.'],
  NOT_FOUND: [404, 'غير موجود.'],
  PROXY_NOT_CONFIGURED: [503, 'خدمة التصميم غير مفعّلة بعد. يمكنك رفع تصميمك.'],
  INTERNAL: [500, 'حدث خطأ غير متوقع. حاول لاحقاً.'],
};

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const payload = isBuf ? body : Buffer.from(JSON.stringify(body));
  res.writeHead(status, { 'Content-Type': isBuf ? 'image/png' : 'application/json; charset=utf-8', 'Content-Length': payload.length,
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'", 'Cache-Control': 'no-store', ...headers });
  res.end(payload);
}
const fail = (res, code) => { const [s, message] = MESSAGES[code] || MESSAGES.INTERNAL; send(res, s, { code: MESSAGES[code] ? code : 'INTERNAL', message }); };

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > limit) { reject(Error('TOO_LARGE')); req.resume(); return; }
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(Error('TOO_LARGE')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function createApp({ config, ledger, store, worker, now = () => Date.now(), log = () => {} }) {
  const ipHits = new Map();
  const limited = (ip) => {
    const t = now(), w = (ipHits.get(ip) || []).filter((x) => t - x < 60_000);
    w.push(t); ipHits.set(ip, w);
    if (ipHits.size > 10_000) for (const [k, v] of ipHits) if (!v.length || t - v[v.length - 1] > 60_000) ipHits.delete(k);
    if (ipHits.size > 50_000) ipHits.clear(); // hard memory bound under address flooding
    return w.length > config.ipRequestsPerMinute;
  };
  const canGenerate = () => config.generationEnabled && ledger.canAfford();
  let chainLogged = false; // one-time deployment aid: how many entries the client-address header carries (never the addresses)
  const publicDesign = (d) => ({ id: d.id, name: d.name, ordinal: d.ordinal, url: `${config.proxyPrefix}/a/${d.sha256}.png`, receipt: d.receipt, version: d.version });
  const contract = (sessionId, token) => {
    const s = ledger.status(sessionId);
    return { token, remaining: s.remaining, pending: s.pending, lastName: s.lastName, enabled: canGenerate(), designs: s.designs.map(publicDesign) };
  };
  const session = (token) => {
    const id = sessionIdFromToken(token, config.serviceSecret);
    if (id) return { id, token };
    const fresh = issueSessionToken(config.serviceSecret);
    return { id: sessionIdFromToken(fresh, config.serviceSecret), token: fresh };
  };

  async function proxy(req, res, url, sub) {
    if (!config.shopifySecret) return fail(res, 'PROXY_NOT_CONFIGURED');
    try { authenticateProxy(url, { shop: config.shop, secret: config.shopifySecret, prefix: config.proxyPrefix, now: now() }); }
    catch { return fail(res, 'UNAUTHORIZED'); }
    if (!chainLogged) { chainLogged = true; log('proxy_client_chain', { header: config.clientIpHeader, entries: String(req.headers[config.clientIpHeader] || '').split(',').filter((x) => x.trim()).length, trustedProxyHops: config.trustedProxyHops }); }
    // Read-only probe for deployment checks: succeeds only through a correctly signed Shopify proxy request.
    if (req.method === 'GET' && sub === '/ping') return send(res, 200, { ok: true, proxied: true, generation: canGenerate() });
    const asset = /^\/a\/([0-9a-f]{64})\.png$/.exec(sub);
    if ((req.method === 'GET' || req.method === 'HEAD') && asset) {
      if (!ledger.designByDigest(asset[1])) return fail(res, 'NOT_FOUND');
      let buf; try { buf = store.get(asset[1]); } catch { return fail(res, 'NOT_FOUND'); }
      const headers = { 'Cache-Control': 'public, max-age=31536000, immutable', ETag: `"${asset[1]}"`, 'Content-Disposition': `inline; filename="calapres-${asset[1].slice(0, 16)}.png"` };
      if (req.method === 'HEAD') { res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': buf.length, 'X-Content-Type-Options': 'nosniff', ...headers }); return res.end(); }
      return send(res, 200, buf, headers);
    }
    if (req.method !== 'POST' || !['/session', '/generate', '/approve'].includes(sub)) return fail(res, 'NOT_FOUND');
    const ip = clientIp(req.headers[config.clientIpHeader], req.socket.remoteAddress, config.trustedProxyHops);
    if (limited(ip)) return fail(res, 'RATE_LIMITED');
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return fail(res, 'BAD_REQUEST');
    let body;
    try { body = JSON.parse((await readBody(req, 2048)).toString('utf8')); } catch { return fail(res, 'BAD_REQUEST'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(res, 'BAD_REQUEST');
    const s = session(body.token);
    if (sub === '/session') return send(res, 200, contract(s.id, s.token));

    if (sub === '/approve') {
      // Only the session that owns a design can approve it; the approval receipt binds the stored
      // original, name and version, and the ledger keeps the approval time for order verification.
      const d = ledger.design(body.id);
      if (!d || d.session !== s.id) return fail(res, 'UNKNOWN_DESIGN');
      const at = Math.floor(now() / 1000);
      ledger.recordApproval(d.id, s.id, at);
      const approval = signApproval({ shop: config.shop, id: d.id, sha256: d.sha256, version: d.version, name: d.name }, at, config.serviceSecret);
      log('design_approved', { design: d.id });
      return send(res, 200, { token: s.token, id: d.id, approval, approvedAt: at });
    }

    let name;
    try { name = normalizeName(body.name); } catch { return fail(res, 'INVALID_NAME'); }
    if (!config.generationEnabled) return fail(res, 'BUDGET_DISABLED');
    try {
      const { job, created } = ledger.begin(s.id, name);
      if (created) { log('job_reserved', { job: job.id }); worker.enqueue(job); }
    } catch (e) { return fail(res, MESSAGES[e.message] ? e.message : 'INTERNAL'); }
    return send(res, 202, contract(s.id, s.token));
  }

  async function webhook(req, res) {
    if (!config.shopifySecret) return fail(res, 'PROXY_NOT_CONFIGURED');
    let raw;
    try { raw = await readBody(req, 1024 * 1024); } catch { return fail(res, 'BAD_REQUEST'); }
    if (!verifyWebhook(raw, req.headers['x-shopify-hmac-sha256'], config.shopifySecret) || req.headers['x-shopify-shop-domain'] !== config.shop) return fail(res, 'UNAUTHORIZED');
    if (req.headers['x-shopify-topic'] !== 'orders/create') return send(res, 200, { ok: true, ignored: 'topic' });
    const delivery = String(req.headers['x-shopify-webhook-id'] || req.headers['x-shopify-event-id'] || '');
    if (delivery && !ledger.firstDelivery(delivery.slice(0, 200), 'orders/create')) return send(res, 200, { ok: true, duplicate: true });
    let order; try { order = JSON.parse(raw.toString('utf8')); } catch { return fail(res, 'BAD_REQUEST'); }
    let checked = 0;
    for (const line of orderLines(order)) {
      const r = verifyLine(line.props, { ledger, store, shop: config.shop, secret: config.serviceSecret });
      if (r.status === 'not_personalized') continue;
      ledger.recordOrderCheck({ orderId: order.id, lineId: line.id, designId: r.designId, status: r.status, reason: r.reason });
      log('order_line_checked', { order: String(order.id), line: line.id, status: r.status, reason: r.reason || null });
      checked++;
    }
    return send(res, 200, { ok: true, checked });
  }

  return async function handle(req, res) {
    try {
      const url = new URL(req.url, 'http://service.local');
      if (req.method === 'GET' && url.pathname === '/healthz') return send(res, 200, { ok: true, proxy: Boolean(config.shopifySecret), generation: canGenerate() });
      if (url.pathname === config.proxyBase || url.pathname.startsWith(config.proxyBase + '/')) return await proxy(req, res, url, url.pathname.slice(config.proxyBase.length) || '/');
      if (req.method === 'POST' && url.pathname === '/webhooks/orders-create') return await webhook(req, res);
      return fail(res, 'NOT_FOUND');
    } catch (e) {
      log('request_error', { code: e?.message });
      if (!res.headersSent) fail(res, 'INTERNAL'); else res.destroy();
    }
  };
}
