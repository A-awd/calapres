// Storefront behaviour of sections/design-service.liquid (style-example picker, decision 0047) in JSDOM.
// Liquid is resolved by a minimal stand-in for the few tags this section uses; Shopify's own theme check
// must still validate the real Liquid at sync time. Example images are fixtures, not approved assets.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), assert = require('node:assert/strict');
const source = fs.readFileSync('sections/design-service.liquid', 'utf8');
const script = source.split('{% javascript %}')[1].split('{% endjavascript %}')[0];
const ACK = 'أفهم أن الصورة مثال على الأسلوب بكلمة «مثال» وليست معاينة لاسمي، وأن كالابريز ستصمم اسمي كما كتبته بالأسلوب المختار بعد الطلب';

// Mirrors the Liquid inside styles:start/styles:end for a given block list.
function cards(blocks) {
  return blocks.map((b, i) => (b.image && b.id
    ? `<label class="ds-style"><input type="radio" name="ds-style" value="${b.id}" data-style data-style-title="${b.title}" data-style-image="${b.image}"><img src="${b.image}" alt="مثال على أسلوب ${b.title} بكلمة «مثال»، وليس اسمك"><span class="ds-style-tag">مثال على الأسلوب</span><strong>${b.title}</strong></label>`
    : `<div class="ds-style ds-style--empty" data-style-placeholder><span>مثال الأسلوب ${i + 1}</span><small>قيد التجهيز</small></div>`)).join('');
}
function render(blocks) {
  const ready = blocks.filter((b) => b.image && b.id).length;
  let html = source.split('{% stylesheet %}')[0];
  html = html.replace(/{%- comment -%} styles:start {%- endcomment -%}[\s\S]*{%- comment -%} styles:end {%- endcomment -%}/, cards(blocks));
  html = html.replace(/{% if ready_styles == 0 %} disabled{% endif %}/g, ready ? '' : ' disabled')
    .replace(/{% if ready_styles == 0 %}([^{]*){% else %}([^{]*){% endif %}/g, (_, a, b) => (ready ? b : a));
  return html.replace(/{% form[^%]*%}/, '<form>').replace('{% endform %}', '</form>')
    .replace(/{{ (?:upload|base)_variant.available }}/g, 'true').replace(/{{ upload_variant.id }}/g, 'upload-id').replace(/{{ base_variant.id }}/g, 'base-id')
    .replace(/{%-?[\s\S]*?-?%}/g, '').replace(/{{[\s\S]*?}}/g, '');
}
const settle = (n = 4) => new Promise((r) => { const step = (k) => (k ? setImmediate(() => step(k - 1)) : r()); step(n); });
const IMG = (n) => `https://cdn.shopify.com/s/files/1/0000/style-${n}.png?v=1&width=1200`;
const SIX = [1, 2, 3, 4, 5, 6].map((n) => ({ id: 'S' + n, title: 'أسلوب ' + n, image: IMG(n) }));

function page(blocks = SIX, { onCart } = {}) {
  const dom = new JSDOM(render(blocks), { url: 'https://calapres.com/products/x?view=design-service', runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
  const w = dom.window, d = w.document, calls = [];
  w.fetch = async (url, options) => { calls.push({ url, options }); if (String(url).endsWith('cart/add.js')) return onCart(options.body); throw new Error('unexpected network call ' + url); };
  w.eval(script);
  return { w, d, calls, $: (s) => d.querySelector(s), $$: (s) => [...d.querySelectorAll(s)] };
}
const fire = (p, el, type) => el.dispatchEvent(new p.w.Event(type));
const mode = (p, m) => { const r = p.$(`[data-mode=${m}]`); r.checked = true; fire(p, r, 'change'); };
const type = (p, v) => { p.$('[data-name]').value = v; fire(p, p.$('[data-name]'), 'input'); };
const pick = (p, i) => { const r = p.$$('[data-style]')[i]; r.checked = true; fire(p, r, 'change'); };
const ack = (p) => { const a = p.$('[data-style-ack]'); a.checked = true; fire(p, a, 'change'); };
const cartEcho = (body) => ({ ok: true, status: 200, json: async () => ({ properties: Object.fromEntries([...body.entries()].filter(([k]) => k.startsWith('properties[')).map(([k, v]) => [k.slice(11, -1), v])) }) });

(async () => {
  // 0. No generation, credits, counters, reset times or generate button anywhere in the section.
  {
    const markup = source.split('{% schema %}')[0];
    for (const bad of ['data-generate', '/generate', '/session', 'اعرض 3 تصاميم', 'المتبقي', '24 ساعة', 'حتى 9', 'الدفعة', 'رصيد', 'data-endpoint']) assert.ok(!markup.includes(bad), `section still contains «${bad}»`);
    const schema = JSON.parse(source.split('{% schema %}')[1].split('{% endschema %}')[0]);
    assert.equal(schema.max_blocks, 6); assert.deepEqual(schema.blocks.map((b) => b.type), ['style']);
    const tpl = JSON.parse(fs.readFileSync('templates/product.design-service.json', 'utf8').replace(/^\/\*[\s\S]*?\*\//, ''));
    const main = tpl.sections.main;
    assert.deepEqual(main.block_order.map((k) => main.blocks[k].settings.style_id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
    assert.ok(main.block_order.every((k) => !main.blocks[k].settings.image), 'no unverified example image is shipped');
    assert.deepEqual(main.settings, {}, 'no generation endpoint setting remains');
  }
  // 1. Happy path: exact typed name, one of six examples, explicit acknowledgement, exact cart properties.
  {
    let cartBody;
    const p = page(SIX, { onCart: async (b) => { cartBody = b; return cartEcho(b); } });
    await settle();
    assert.equal(p.$('[data-mode=style]').disabled, false);
    assert.equal(p.$$('[data-style]').length, 6); assert.equal(p.$$('[data-style-placeholder]').length, 0);
    assert.ok(p.$$('.ds-style-tag').every((t) => t.textContent === 'مثال على الأسلوب'), 'every card is labelled as an example');
    assert.match(p.$('.ds-note').textContent, /بكلمة «مثال» فقط، وليست معاينة لاسمك/);
    mode(p, 'style');
    assert.equal(p.$('[data-variant]').value, 'base-id', 'existing text-engraving variant and price; nothing repriced');
    assert.equal(p.$('[data-price-style]').hidden, false); assert.equal(p.$('[data-price-upload]').hidden, true);
    assert.equal(p.$('[type=submit]').disabled, true);
    type(p, 'عبد  الرحمن ');
    assert.equal(p.$('[data-name-echo]').hidden, false); assert.equal(p.$('[data-name-echo-text]').textContent, 'عبد الرحمن', 'the name is echoed as plain text, not as art');
    pick(p, 2);
    assert.equal(p.$('[data-style-id]').value, 'S3 — أسلوب 3'); assert.equal(p.$('[data-style-image-url]').value, IMG(3));
    assert.equal(p.$('[type=submit]').disabled, true, 'acknowledgement required');
    ack(p); assert.equal(p.$('[type=submit]').disabled, false);
    pick(p, 4); assert.equal(p.$('[data-style-ack]').checked, false, 'changing the style asks for the acknowledgement again');
    ack(p); type(p, 'عبد الرحمن'); assert.equal(p.$('[data-style-ack]').checked, false, 'changing the name asks again');
    ack(p);
    p.$('form').dispatchEvent(new p.w.Event('submit', { cancelable: true })); await settle(8);
    const props = Object.fromEntries([...cartBody.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '[file]']));
    assert.deepEqual(props, { 'properties[طريقة التخصيص]': 'اسم بأسلوب مختار', id: 'base-id', 'properties[نص الحفر]': 'عبد الرحمن',
      'properties[أسلوب التصميم]': 'S5 — أسلوب 5', 'properties[_مثال الأسلوب]': IMG(5), 'properties[إقرار أسلوب التصميم]': ACK });
    assert.equal(p.calls.length, 1, 'the only network call is Shopify cart/add.js');
    assert.doesNotMatch(p.$('[data-status]').textContent, /تعذر/, 'the confirmed cart reply is accepted (JSDOM does not navigate to /cart)');
    p.w.close();
  }
  // 2. Spelling is never rewritten: hamza, alif maqsura and taa marbuta are kept; marks, digits and Latin are refused.
  {
    const p = page(); await settle(); mode(p, 'style'); pick(p, 0);
    for (const n of ['مدى', 'آلاء', 'رؤى', 'نورة', 'إيمان', 'عبدالإله']) { type(p, n); ack(p); assert.equal(p.$('[type=submit]').disabled, false, n); assert.equal(p.$('[data-name-echo-text]').textContent, n); }
    for (const n of ['مُحَمَّد', 'محــمد', 'Noura', 'نورة 2', 'نورة!', 'ع'.repeat(31)]) {
      type(p, n); ack(p);
      assert.equal(p.$('[type=submit]').disabled, true, n); assert.equal(p.$('[data-style-ack]').checked, false, n);
      assert.equal(p.$('[data-name-echo]').hidden, true, n);
    }
    p.w.close();
  }
  // 3. Missing example images: placeholders are shown and cannot be chosen; with none ready the style path is off.
  {
    const partial = SIX.map((b, i) => (i < 2 ? b : { ...b, image: '' }));
    const p = page(partial); await settle();
    assert.equal(p.$$('[data-style]').length, 2); assert.equal(p.$$('[data-style-placeholder]').length, 4);
    assert.ok(p.$$('[data-style-placeholder]').every((x) => /قيد التجهيز/.test(x.textContent)));
    const none = page(SIX.map((b) => ({ ...b, image: '' }))); await settle();
    assert.equal(none.$('[data-mode=style]').disabled, true); assert.match(none.$('[data-style-option]').textContent, /قيد التجهيز/);
    mode(none, 'style'); assert.equal(none.$('[data-mode=upload]').checked, true, 'a disabled style path cannot be entered');
    assert.equal(none.$('[type=submit]').disabled, true);
    p.w.close(); none.w.close();
  }
  // 4. An example whose image URL is not a Shopify/store https URL cannot be selected.
  {
    const bad = [{ id: 'S1', title: 'x', image: 'http://evil.test/a.png' }, ...SIX.slice(1)];
    const p = page(bad); await settle(); mode(p, 'style'); type(p, 'مدى'); pick(p, 0); ack(p);
    assert.equal(p.$('[data-style-id]').value, ''); assert.equal(p.$('[type=submit]').disabled, true);
    p.w.close();
  }
  // 5. Upload path unchanged: its own acknowledgement and variant; the style fields are not submitted.
  {
    const p = page(); await settle();
    assert.equal(p.$('[data-mode=upload]').checked, true); assert.equal(p.$('[data-variant]').value, 'upload-id');
    assert.equal(p.$('[data-style-panel]').disabled, true, 'style inputs are excluded from an upload order');
    assert.equal(p.$('[data-upload-ack]').name, 'properties[اعتماد التصميم]');
    mode(p, 'style'); assert.equal(p.$('[data-upload-panel]').disabled, true); mode(p, 'upload');
    assert.equal(p.$('[type=submit]').textContent, 'اعتمد التصميم وأضف إلى السلة');
    p.w.close();
  }
  // 6. A cart reply that does not carry the exact name, style, example and acknowledgement is reported, not trusted.
  {
    const p = page(SIX, { onCart: async () => ({ ok: true, status: 200, json: async () => ({ properties: { 'نص الحفر': 'عبد الرحمن', 'أسلوب التصميم': 'S1 — أسلوب 1' } }) }) });
    await settle(); mode(p, 'style'); type(p, 'عبد الرحمن'); pick(p, 0); ack(p);
    p.$('form').dispatchEvent(new p.w.Event('submit', { cancelable: true })); await settle(8);
    assert.match(p.$('[data-status]').textContent, /تعذر تأكيد تفاصيل التخصيص/);
    p.w.close();
  }
  console.log('PASS: no generation/credits/counters/generate button, six labelled examples, plain-text name echo, exact spelling kept (hamza, ى, ة), invalid names refused, acknowledgement required and reset on change, exact cart properties with style id and example URL, existing variants and prices, placeholders unselectable, style path off with no ready examples, unsafe example URL refused, upload path unchanged, unconfirmed cart reply reported');
})().catch((e) => { console.error(e); process.exitCode = 1; });
