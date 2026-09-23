// Gift-card add-on (decision 0051). Run: cd tests/theme && npm install && CHROMIUM_PATH=/path/to/chrome npm test
// Renders the real theme Liquid (liquidjs + small Shopify stand-ins) and drives the real theme JS in
// Chromium against an in-memory Shopify AJAX cart. Not a substitute for Shopify's own theme check.
import { Liquid } from 'liquidjs';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const OUT = process.env.OUT || fs.mkdtempSync('/tmp/gift-card-shots-');
const read = (p) => fs.readFileSync(`${ROOT}/${p}`, 'utf8');
const engine = new Liquid({ root: [`${ROOT}/snippets`], extname: '.liquid', dynamicPartials: true, strictFilters: false });
engine.registerFilter('image_url', (img) => (img && img.src) || String(img));
engine.registerFilter('asset_url', (n) => `/assets/${n}`);
engine.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
engine.registerFilter('stylesheet_tag', (u) => `<link rel="stylesheet" href="${u}">`);
engine.registerTag('form', {
  parse(token, remain) { this.tpls = []; const s = this.liquid.parser.parseStream(remain); s.on('tag:endform', () => s.stop()).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error('no endform'); }); s.start(); },
  *render(ctx, emitter) { emitter.write('<form id="pdForm" method="post" action="/cart/add" data-product-form="true" enctype="multipart/form-data">'); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter); emitter.write('</form>'); },
});
for (const name of ['schema', 'javascript', 'stylesheet']) {
  engine.registerTag(name, { parse(token, remain) { const s = this.liquid.parser.parseStream(remain); s.on(`tag:end${name}`, () => s.stop()).on('end', () => {}); s.start(); }, render() { return ''; } });
}

const COLORS = { WHT: 'الأبيض', BGE: 'البيج', GRY: 'الرمادي' };
const BASE = { WHT: [49095485653248, 49704200241408], BGE: [49095485686016, 49704200306944], GRY: [49095485718784, 49704200339712] };
const burner = (c) => ({
  id: { WHT: 1, BGE: 2, GRY: 3 }[c], title: `مبخرة كالابريز الفاخرة — ${COLORS[c]}`, tags: ['هدايا'], featured_image: { src: `/img/${c}.png`, alt: '' },
  variants: [
    { id: BASE[c][0], title: 'بدون تخصيص', sku: `CAL-BKH-${c}`, price: 38000, compare_at_price: null, available: true },
    { id: BASE[c][1], title: 'مع تخصيص', sku: `CAL-BKH-${c}-DESIGN`, price: 39900, compare_at_price: null, available: true },
  ],
});
const CARD1 = { id: 10, title: 'كرت إهداء مطبوع', tags: ['calapres-addon'], variants: [{ id: 777, title: 'Default Title', sku: 'CAL-GIFTCARD', price: 1900, available: true }] };
const CARD3 = { id: 10, title: 'كرت إهداء مطبوع', tags: ['calapres-addon'], variants: [
  { id: 701, title: 'عاجي', sku: 'CAL-GIFTCARD-IVR', price: 1900, available: true },
  { id: 702, title: 'رملي', sku: 'CAL-GIFTCARD-SND', price: 1900, available: true },
  { id: 703, title: 'حجري', sku: 'CAL-GIFTCARD-STN', price: 1900, available: true }] };
for (const p of [CARD1, CARD3]) p.first_available_variant = p.variants[0];
for (const c of Object.keys(COLORS)) { const b = burner(c); b.selected_or_first_available_variant = b.variants[0]; burner[c] = b; }

const tpl = JSON.parse(read('templates/product.json').replace(/^\/\*[\s\S]*?\*\//, ''));
const main = tpl.sections.main;
const blocks = main.block_order.map((k) => ({ ...main.blocks[k], shopify_attributes: '' }));
const PRODUCTS = { 1: burner.WHT, 2: burner.BGE, 3: burner.GRY, 10: CARD1 };

async function productPage(product, giftProduct) {
  const section = { settings: { ...main.settings, gift_card_product: giftProduct || '' }, blocks };
  const body = await engine.parseAndRender(read('sections/main-product-personalize.liquid'), { product, section, routes: { all_products_collection_url: '/collections/all' } });
  return shell(body);
}
async function shell(body) {
  const drawer = await engine.parseAndRender(read('snippets/cart-drawer.liquid'), { routes: { all_products_collection_url: '/collections/all' } });
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/calabriz.css"></head><body><span id="cartCount"></span>${body}${drawer}<script src="/assets/calabriz.js" defer></script><script src="/assets/calabriz-cart.js" defer></script></body></html>`;
}

// ---- in-memory Shopify AJAX cart ----
function makeCart(variants) {
  let items = [], seq = 0;
  const view = () => ({ items: items.map((i) => ({ ...i, line_price: i.price * i.quantity, final_line_price: i.price * i.quantity })), item_count: items.reduce((a, i) => a + i.quantity, 0), total_price: items.reduce((a, i) => a + i.price * i.quantity, 0) });
  function add(id, qty, props) {
    const v = variants[id]; if (!v) return { status: 422, body: { description: 'Cannot find variant' } };
    const same = items.find((i) => i.id === id && JSON.stringify(i.properties) === JSON.stringify(props));
    if (same) { same.quantity += qty; return { status: 200, body: same }; }
    const it = { id, key: `${id}:${++seq}`, quantity: qty, price: v.price, properties: props, product_title: v.product_title, variant_title: v.title, image: null };
    items.push(it); return { status: 200, body: it };
  }
  return {
    get items() { return items; }, view, add,
    change(line, q) { const it = items[line - 1]; if (q <= 0) items.splice(line - 1, 1); else it.quantity = q; return view(); },
    update(u) { for (const [k, q] of Object.entries(u)) { const i = items.findIndex((x) => x.key === k); if (i < 0) continue; if (q <= 0) items.splice(i, 1); else items[i].quantity = q; } return view(); },
  };
}
const VARIANTS = {};
for (const p of [burner.WHT, burner.BGE, burner.GRY, CARD1, CARD3]) for (const v of p.variants) VARIANTS[v.id] = { ...v, product_title: p.title };

function parseMultipart(buf, ctype) {
  const boundary = ctype.split('boundary=')[1]; const text = buf.toString('latin1'); const out = {};
  for (const part of text.split('--' + boundary)) {
    const m = part.match(/name="([^"]+)"(?:; filename="[^"]*")?\r\n(?:Content-Type:[^\r]*\r\n)?\r\n([\s\S]*)\r\n$/); if (!m) continue;
    out[Buffer.from(m[1], 'latin1').toString('utf8')] = Buffer.from(m[2], 'latin1').toString('utf8');
  }
  return out;
}

async function open(browser, html, { width = 390, cart = makeCart(VARIANTS), log = [], failCard = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url()), path = decodeURIComponent(url.pathname);
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/' || path.startsWith('/products/') || path === '/cart') return route.fulfill({ contentType: 'text/html', body: typeof html === 'function' ? await html(cart) : html });
    if (path.startsWith('/assets/')) return route.fulfill({ path: `${ROOT}${path}` });
    if (path === '/cart.js') { log.push(['GET /cart.js']); return json(200, cart.view()); }
    if (path === '/cart/add.js') {
      const ct = req.headers()['content-type'] || '';
      if (ct.includes('multipart')) {
        const f = parseMultipart(req.postDataBuffer(), ct); const props = {};
        for (const [k, v] of Object.entries(f)) if (k.startsWith('properties[')) props[k.slice(11, -1)] = v;
        log.push(['add form', Number(f.id), props]); const r = cart.add(Number(f.id), 1, props); return json(r.status, r.body);
      }
      const b = JSON.parse(req.postData()); log.push(['add json', b.id, b.properties]);
      if (failCard && VARIANTS[b.id].product_title.startsWith('كرت')) return json(422, { description: 'sold out' });
      const r = cart.add(b.id, b.quantity || 1, b.properties || {}); return json(r.status, r.body);
    }
    if (path === '/cart/change.js') { const b = JSON.parse(req.postData()); log.push(['change', b]); return json(200, cart.change(b.line, b.quantity)); }
    if (path === '/cart/update.js') { const b = JSON.parse(req.postData()); log.push(['update', b.updates]); return json(200, cart.update(b.updates)); }
    if (url.hostname.includes('fonts.')) return route.fulfill({ body: '' });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('https://calapres.test/products/x');
  await page.waitForTimeout(150);
  return { page, cart, log, errors, ctx };
}
const btn = (p) => p.locator('#pdAdd').innerText();
const idle = (p) => p.waitForFunction(() => !document.querySelector('#pdForm[aria-busy]'));
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, e.message]); } };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

await test('unconfigured: no card row, prices 380/399 unchanged', async () => {
  const { page, errors } = await open(browser, await productPage(burner.WHT, null));
  assert.equal(await page.locator('[data-gc]').count(), 0);
  assert.equal(await btn(page), 'أضِف إلى السلّة — 380 ر.س');
  await page.locator('.cp-seg__opt', { hasText: 'نص' }).click();
  assert.equal(await btn(page), 'أضِف إلى السلّة — 399 ر.س');
  assert.deepEqual(errors, []); await page.context().close();
});

await test('card row: unchecked, placement, four price combinations 380/399/399/418', async () => {
  const { page, errors } = await open(browser, await productPage(burner.WHT, CARD1));
  const gc = page.locator('[data-gc]');
  assert.equal(await gc.locator('.gc-row').innerText(), 'أضف كرت إهداء — 19 ر.س');
  assert.equal(await gc.locator('[data-gc-toggle]').isChecked(), false);
  assert.equal(await page.locator('[data-gc-fields]').isVisible(), false);
  // Order in DOM: customization block, card row, Add to Cart.
  const order = await page.evaluate(() => { const f = document.querySelector('#pdForm'); const all = [...f.querySelectorAll('[data-cp],[data-gc],#pdAdd')]; return all.map((e) => (e.id === 'pdAdd' ? 'add' : e.hasAttribute('data-gc') ? 'card' : 'cp')); });
  assert.deepEqual(order, ['cp', 'card', 'add']);
  assert.equal(await btn(page), 'أضِف إلى السلّة — 380 ر.س');
  await gc.locator('.gc-row').click();
  assert.equal(await btn(page), 'أضِف إلى السلّة — 399 ر.س');
  assert.equal(await page.locator('.pd-info .price [data-product-price]').innerText(), '380 ر.س', 'title price stays the burner price');
  await page.locator('.cp-seg__opt', { hasText: 'عبارة' }).click();
  assert.equal(await btn(page), 'أضِف إلى السلّة — 418 ر.س');
  assert.equal(await page.locator('.pd-sticky-atc [data-product-price]').innerText(), '418 ر.س');
  await gc.locator('.gc-row').click();
  assert.equal(await btn(page), 'أضِف إلى السلّة — 399 ر.س');
  await page.locator('.cp-seg__opt', { hasText: 'بدون' }).click();
  assert.equal(await btn(page), 'أضِف إلى السلّة — 380 ر.س');
  assert.deepEqual(errors, []); await page.context().close();
});

await test('fields: RTL, placeholder, 150 max, message required, no network when empty', async () => {
  const { page, log } = await open(browser, await productPage(burner.WHT, CARD1));
  await page.locator('.gc-row').click();
  for (const s of ['#gcTo', '#gcMsg', '#gcFrom']) {
    assert.equal(await page.locator(s).getAttribute('dir'), 'rtl');
    assert.equal(await page.locator(s).evaluate((e) => getComputedStyle(e).textAlign), 'right');
    assert.equal(await page.locator(s).getAttribute('name'), null, 'card inputs must not ride on the burner form');
  }
  assert.equal(await page.locator('#gcMsg').getAttribute('placeholder'), 'تُطبع على الكرت كما تكتبها');
  assert.equal(await page.locator('#gcMsg').getAttribute('maxlength'), '150');
  const before = log.filter((l) => l[0].startsWith('add')).length;
  await page.locator('#pdAdd').click(); await page.waitForTimeout(100);
  assert.equal(log.filter((l) => l[0].startsWith('add')).length, before, 'empty message blocks add');
  await page.locator('#gcMsg').fill('   '); await page.locator('#pdAdd').click(); await page.waitForTimeout(100);
  assert.equal(log.filter((l) => l[0].startsWith('add')).length, before, 'whitespace-only message blocks add');
  await page.locator('#gcMsg').fill('x'.repeat(200));
  assert.equal((await page.locator('#gcMsg').inputValue()).length, 150);
  await page.context().close();
});

let combined;
await test('combined add: text engraving + card -> 399 + 19 lines, linked, exact message', async () => {
  const o = await open(browser, await productPage(burner.WHT, CARD1)); const { page, cart, log, errors } = o;
  await page.locator('.cp-seg__opt', { hasText: 'نص' }).click();
  await page.locator('#cpText').fill('نورة');
  await page.locator('[data-cp-ack]').check();
  await page.locator('.gc-row').click();
  await page.locator('#gcTo').fill('أمي الغالية');
  await page.locator('#gcMsg').fill('كل عام وأنتِ بخير\nمع حبي ١٤٤٧');
  await page.locator('#pdAdd').click(); await idle(page); await page.waitForTimeout(150);
  assert.equal(cart.items.length, 2);
  const [b, c] = cart.items;
  assert.equal(b.id, BASE.WHT[1]); assert.equal(b.properties['نص الحفر'], 'نورة'); assert.equal(b.properties['طريقة التخصيص'], 'نص مكتوب');
  assert.equal(c.id, 777); assert.equal(c.quantity, 1);
  assert.ok(b.properties['_كرت الإهداء'] && b.properties['_كرت الإهداء'] === c.properties['_كرت إهداء لـ']);
  assert.deepEqual(Object.keys(c.properties).sort(), ['_كرت إهداء لـ', 'إلى', 'رسالتك', 'للمبخرة', 'لون الكرت'].sort(), 'empty optional من omitted');
  assert.equal(c.properties['رسالتك'], 'كل عام وأنتِ بخير\nمع حبي ١٤٤٧');
  assert.equal(c.properties['لون الكرت'], 'عاجي'); assert.equal(c.properties['للمبخرة'], 'مبخرة كالابريز الفاخرة — الأبيض');
  assert.equal(cart.view().total_price, 41800);
  const addOrder = log.filter((l) => l[0].startsWith('add')).map((l) => l[0]);
  assert.deepEqual(addOrder, ['add form', 'add json'], 'burner first, then card');
  assert.match(await page.locator('[data-product-status]').innerText(), /وكرت الإهداء/);
  await page.evaluate(() => window.openCart()); await page.waitForTimeout(200);
  const drawer = await page.locator('#cartBody').innerText();
  assert.match(drawer, /رسالتك: كل عام وأنتِ بخير/); assert.match(drawer, /لون الكرت: عاجي/); assert.match(drawer, /إلى: أمي الغالية/);
  assert.equal(await page.locator('#cartTotal').innerText(), '418 ر.س');
  assert.equal(await page.locator('.d-item').nth(1).locator('[data-inc]').count(), 0, 'card line has no +/-');
  await page.screenshot({ path: `${OUT}/drawer-390.png` });
  assert.deepEqual(errors, []); combined = o;
});

await test('cart sync: burner +1 -> card follows; burner removed -> card removed', async () => {
  const { page, cart } = combined;
  await page.locator('.d-item').nth(0).locator('[data-inc]').click(); await page.waitForTimeout(250);
  assert.deepEqual(cart.items.map((i) => i.quantity), [2, 2]);
  assert.equal(await page.locator('#cartTotal').innerText(), '836 ر.س');
  await page.locator('.d-item').nth(0).locator('[data-dec]').click(); await page.waitForTimeout(250);
  assert.deepEqual(cart.items.map((i) => i.quantity), [1, 1]);
  await page.locator('.d-item').nth(0).locator('[data-del]').click(); await page.waitForTimeout(250);
  assert.equal(cart.items.length, 0, 'card removed with its burner');
  await page.context().close();
});

await test('removing only the card keeps the burner', async () => {
  const { page, cart } = await open(browser, await productPage(burner.BGE, CARD1));
  await page.locator('.gc-row').click(); await page.locator('#gcMsg').fill('مبروك');
  await page.locator('#pdAdd').click(); await idle(page); await page.waitForTimeout(150);
  assert.equal(cart.items[1].properties['لون الكرت'], 'رملي');
  assert.equal(cart.view().total_price, 39900, 'plain 380 + card 19');
  await page.evaluate(() => window.openCart()); await page.waitForTimeout(200);
  await page.locator('.d-item').nth(1).locator('[data-del]').click(); await page.waitForTimeout(250);
  assert.equal(cart.items.length, 1); assert.equal(cart.items[0].id, BASE.BGE[0]);
  await page.context().close();
});

await test('orphan card already in cart is removed on page load', async () => {
  const cart = makeCart(VARIANTS);
  cart.add(777, 1, { 'رسالتك': 'x', '_كرت إهداء لـ': 'gone' });
  cart.add(BASE.GRY[0], 1, {});
  const { page, errors } = await open(browser, await productPage(burner.GRY, CARD1), { cart });
  await page.waitForTimeout(250);
  assert.deepEqual(cart.items.map((i) => i.id), [BASE.GRY[0]]);
  assert.deepEqual(errors, []); await page.context().close();
});

await test('plain add without card: unchanged payload, lines still merge', async () => {
  const { page, cart, log } = await open(browser, await productPage(burner.WHT, CARD1));
  await page.locator('#pdAdd').click(); await idle(page); await page.waitForTimeout(100);
  await page.locator('#pdAdd').click(); await idle(page); await page.waitForTimeout(100);
  assert.equal(cart.items.length, 1); assert.equal(cart.items[0].quantity, 2); assert.deepEqual(cart.items[0].properties, {});
  assert.equal(log.filter((l) => l[0] === 'add json').length, 0);
  await page.context().close();
});

await test('card add failure: burner kept, clear message, no orphan', async () => {
  const { page, cart } = await open(browser, await productPage(burner.WHT, CARD1), { failCard: true });
  await page.locator('.gc-row').click(); await page.locator('#gcMsg').fill('مرحبا');
  await page.locator('#pdAdd').click(); await idle(page); await page.waitForTimeout(150);
  assert.equal(cart.items.length, 1);
  assert.match(await page.locator('[data-product-status]').innerText(), /تعذّرت إضافة كرت الإهداء/);
  await page.context().close();
});

await test('3-variant card product: grey burner picks stone variant', async () => {
  PRODUCTS[10] = CARD3;
  const { page, cart } = await open(browser, await productPage(burner.GRY, CARD3));
  assert.equal(await page.locator('[data-gc]').getAttribute('data-gc-variant'), '703');
  await page.locator('.gc-row').click(); await page.locator('#gcMsg').fill('حياكم');
  await page.locator('#pdAdd').click(); await idle(page); await page.waitForTimeout(150);
  assert.equal(cart.items[1].id, 703); assert.equal(cart.items[1].properties['لون الكرت'], 'حجري');
  await page.context().close();
});

await test('card product own page shows a note and no add form', async () => {
  const { page } = await open(browser, await productPage(CARD1, CARD1));
  assert.equal(await page.locator('#pdForm').count(), 0);
  assert.match(await page.locator('.gc-self').innerText(), /يُضاف كرت الإهداء من صفحة المبخرة/);
  await page.context().close();
});

await test('product-card snippet hides calapres-addon products', async () => {
  const a = await engine.parseAndRender("{% render 'product-card', card_product: p, show_add: true %}", { p: { ...CARD1, url: '/x', price: 1900 } });
  const b = await engine.parseAndRender("{% render 'product-card', card_product: p, show_add: true %}", { p: { ...burner.WHT, url: '/x', price: 38000 } });
  assert.equal(a.trim(), ''); assert.match(b, /pcard/);
});

await test('cart page: card qty mirrors burner, reconcile reloads page', async () => {
  const cart = makeCart(VARIANTS);
  cart.add(BASE.WHT[1], 1, { 'نص الحفر': 'سارة', '_كرت الإهداء': 'L1' });
  cart.add(777, 1, { 'لون الكرت': 'عاجي', 'رسالتك': 'سطر١\nسطر٢', '_كرت إهداء لـ': 'L1' });
  let renders = 0;
  const html = async (c) => { renders++; const items = c.view().items.map((i) => ({ ...i, product: { title: i.product_title }, variant: { title: i.variant_title }, url: '/p', url_to_remove: '/cart/change?line=1&quantity=0' }));
    return shell(await engine.parseAndRender(read('sections/main-cart.liquid'), { cart: { item_count: c.view().item_count, items, total_price: c.view().total_price }, routes: { all_products_collection_url: '/c', cart_url: '/cart' } })); };
  const { page, errors } = await open(browser, html, { cart });
  const inputs = page.locator('input[name="updates[]"]');
  assert.equal(await inputs.nth(1).getAttribute('readonly'), '');
  await inputs.nth(0).fill('3');
  assert.equal(await inputs.nth(1).inputValue(), '3');
  assert.match(await page.locator('.cart-page').innerText(), /رسالتك: سطر١/);
  // Server-side change behind the page's back (e.g. burner removed elsewhere) -> reconcile + reload.
  cart.change(1, 0); const r0 = renders;
  await page.reload(); await page.waitForTimeout(400);
  assert.equal(cart.items.length, 0); assert.ok(renders >= r0 + 2, 'page reloaded after reconcile');
  assert.deepEqual(errors, []); await page.context().close();
});

// Mobile layout checks with the card expanded.
for (const width of [390, 320]) {
  await test(`mobile ${width}px: no horizontal overflow, row fits, screenshots`, async () => {
    const { page } = await open(browser, await productPage(burner.WHT, CARD1), { width });
    await page.locator('.cp-seg__opt', { hasText: 'نص' }).click();
    const row = page.locator('.gc-row');
    await row.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/closed-${width}.png` });
    const h = await row.evaluate((e) => e.getBoundingClientRect().height);
    assert.ok(h < 60, `row is a single compact line (${h}px)`);
    await row.click(); await page.locator('#gcMsg').fill('كل عام وأنتِ بخير');
    await page.locator('.gc').screenshot({ path: `${OUT}/open-${width}.png` });
    await page.locator('#pdAdd').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/page-${width}.png`, fullPage: true });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `horizontal overflow ${over}px`);
    await page.context().close();
  });
}

await browser.close();
for (const r of results) console.log(r.join(' | '));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
