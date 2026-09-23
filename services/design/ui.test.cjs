// Storefront behaviour of sections/design-service.liquid in JSDOM with a mocked endpoint.
// Mocked designs are placeholders; nothing here is real generated artwork.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), assert = require('node:assert/strict');
const source = fs.readFileSync('sections/design-service.liquid', 'utf8');
const script = source.split('{% javascript %}')[1].split('{% endjavascript %}')[0];
const template = source.split('{% stylesheet %}')[0].replace(/{% form[^%]*%}/, '<form>').replace('{% endform %}', '</form>')
  .replace(/{{ (?:upload|base)_variant.available }}/g, 'true').replace(/{{ upload_variant.id }}/g, 'upload-id').replace(/{{ base_variant.id }}/g, 'base-id')
  .replace(/{%[\s\S]*?%}/g, '').replace(/{{[\s\S]*?}}/g, '');
const settle = (n = 3) => new Promise((r) => { const step = (k) => (k ? setImmediate(() => step(k - 1)) : r()); step(n); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const design = (i, name) => ({ id: 'd' + i, name, url: 'https://example.test/apps/calapres-design/a/' + String(i).padStart(64, '0') + '.png', ordinal: i + 1, receipt: 'r1.' + i, version: 'p1-L' + (i % 9) });

const approvalFor = (id) => ({ ok: true, status: 200, json: async () => ({ token: 's1.tok', id, approval: 'a1.1790000000.' + 'ab'.repeat(32), approvedAt: 1790000000 }) });
function page({ endpoint = '/apps/calapres-design', sessionReplies = [], onGenerate, onCart, storage, choice, onApprove = async (b) => approvalFor(b.id), sessionGate = null } = {}) {
  const html = template.replace(/data-endpoint="[^"]*"/, `data-endpoint="${endpoint}"`);
  const dom = new JSDOM(html, { url: 'https://example.test/products/x', runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
  const w = dom.window, d = w.document, calls = [];
  if (storage) w.localStorage.setItem('calapres-design-session', storage);
  if (choice) w.localStorage.setItem('calapres-design-choice', choice);
  w.AbortController = AbortController;
  w.setTimeout = (fn, ms) => setTimeout(fn, Math.min(ms, 5)); w.clearTimeout = clearTimeout;
  w.fetch = async (url, options) => {
    calls.push({ url, options });
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
    if (url.endsWith('/session')) { if (sessionGate) { const g = sessionGate; sessionGate = null; await g; } return json(200, sessionReplies.length > 1 ? sessionReplies.shift() : sessionReplies[0]); }
    if (url.endsWith('/generate')) return onGenerate(JSON.parse(options.body));
    if (url.endsWith('/approve')) return onApprove(JSON.parse(options.body));
    if (url.endsWith('cart/add.js')) return onCart(options.body);
    throw new Error('unexpected ' + url);
  };
  w.eval(script);
  return { w, d, calls, $: (s) => d.querySelector(s), $$: (s) => [...d.querySelectorAll(s)] };
}
const choose = (p, mode) => { const r = p.$(`[data-mode=${mode}]`); r.checked = true; r.dispatchEvent(new p.w.Event('change')); };
const type = (p, v) => { p.$('[data-name]').value = v; p.$('[data-name]').dispatchEvent(new p.w.Event('input')); };
const approve = async (p) => { const a = p.$('[data-approval]'); a.checked = true; a.dispatchEvent(new p.w.Event('change')); await settle(4); };

(async () => {
  // 1. Accumulated 3/6/9 gallery, first choice after the ninth, approval resets, exact cart payload.
  {
    const designs = []; let gens = 0, cartBody;
    const reply = () => ({ token: 's1.tok', remaining: 9 - gens * 3, pending: false, lastName: 'عبدالرحمن', enabled: true, designs: [...designs] });
    const p = page({ sessionReplies: [{ token: 's1.tok', remaining: 9, pending: false, lastName: '', enabled: true, designs: [] }],
      onGenerate: async (b) => { assert.equal(b.token, 's1.tok'); gens++; for (let n = 0; n < 3; n++) designs.push(design(designs.length, b.name)); return { ok: true, status: 202, json: async () => reply() }; },
      onCart: async (body) => { cartBody = body; return { ok: true, status: 200, json: async () => ({ properties: { 'تصميم الحفر': body.get('properties[تصميم الحفر]'), 'معرف التصميم': body.get('properties[معرف التصميم]') } }) }; } });
    await settle(6);
    choose(p, 'generate');
    assert.equal(p.$('[data-variant]').value, 'base-id');
    type(p, 'عبد الرحمن ٢');
    p.$('[data-generate]').click(); await settle();
    assert.equal(gens, 0, 'invalid name never reaches the endpoint'); assert.match(p.$('[data-status]').textContent, /بالحروف العربية فقط/);
    type(p, '  عبدالرحمن ');
    for (let i = 1; i <= 3; i++) { p.$('[data-generate]').click(); await settle(8); assert.equal(p.$$('[data-gallery] button').length, i * 3); }
    assert.equal(p.$('[data-generate]').disabled, true, 'cap reached disables generation');
    assert.deepEqual(p.$$('.ds-batch > p').map((x) => x.textContent), ['الدفعة 1', 'الدفعة 2', 'الدفعة 3'], 'nine designs grouped into three batches');
    p.$$('[data-gallery] button')[0].click();
    assert.equal(p.$('[data-design-id]').value, 'd0'); assert.equal(p.$('[data-name]').value, 'عبدالرحمن');
    assert.equal(p.$('[data-preview-link]').hidden, false, 'enlarged standalone preview with full-size link');
    await approve(p); assert.equal(p.$('[type=submit]').disabled, false);
    assert.deepEqual(JSON.parse(p.calls.filter((c) => c.url.endsWith('/approve')).at(-1).options.body), { id: 'd0', token: 's1.tok' });
    p.$$('[data-gallery] button')[8].click();
    assert.equal(p.$('[data-approval]').checked, false, 'changing design clears approval'); assert.equal(p.$('[type=submit]').disabled, true);
    assert.equal(p.$('[data-receipt]').value, '', 'approval receipt of the previous design is discarded');
    p.$$('[data-gallery] button')[0].click(); await approve(p);
    p.$('form').dispatchEvent(new p.w.Event('submit', { cancelable: true })); await settle(6);
    const props = Object.fromEntries([...cartBody.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '[file]']));
    assert.deepEqual(props, { 'properties[طريقة التخصيص]': 'تصميم اسم مولد', id: 'base-id', 'properties[نص الحفر]': 'عبدالرحمن', 'properties[معرف التصميم]': 'd0',
      'properties[نسخة التصميم]': 'p1-L0', 'properties[تصميم الحفر]': design(0).url, 'properties[_design_receipt]': 'a1.1790000000.' + 'ab'.repeat(32), 'properties[اعتماد التصميم]': 'راجعت الاسم والتصميم الظاهر ووافقت عليه' });
    type(p, 'سارة');
    assert.equal(p.$('[data-design-id]').value, ''); assert.equal(p.$$('[data-gallery] button').length, 0, 'gallery follows the typed name');
    type(p, 'عبدالرحمن'); assert.equal(p.$$('[data-gallery] button').length, 9, 'earlier designs return with the same name');
    choose(p, 'upload'); assert.equal(p.$('[data-approval]').checked, false); assert.equal(p.$('[data-variant]').value, 'upload-id');
    p.w.close();
  }
  // 2. Reload while a batch is pending: gallery restores and polling continues without a click.
  {
    const p = page({ storage: 's1.saved', sessionReplies: [
      { token: 's1.saved', remaining: 3, pending: true, lastName: 'نورة', enabled: true, designs: [0, 1, 2].map((i) => design(i, 'نورة')) },
      { token: 's1.saved', remaining: 3, pending: true, lastName: 'نورة', enabled: true, designs: [0, 1, 2].map((i) => design(i, 'نورة')) },
      { token: 's1.saved', remaining: 3, pending: false, lastName: 'نورة', enabled: true, designs: [0, 1, 2, 3, 4, 5].map((i) => design(i, 'نورة')) }] });
    await wait(40); await settle(10);
    choose(p, 'generate');
    const sessionCalls = p.calls.filter((c) => c.url.endsWith('/session'));
    assert.ok(sessionCalls.length >= 3, 'pending batch is polled after reload');
    assert.equal(JSON.parse(sessionCalls[0].options.body).token, 's1.saved');
    assert.equal(p.$('[data-name]').value, 'نورة'); assert.equal(p.$$('[data-gallery] button').length, 6);
    assert.equal(p.$('[data-generate]').disabled, false);
    p.w.close();
  }
  // 3. Server-reported disabled generation and blank endpoint keep the button off.
  {
    const p = page({ sessionReplies: [{ token: 's1.x', remaining: 9, pending: false, lastName: '', enabled: false, designs: [] }] });
    await settle(6); choose(p, 'generate'); type(p, 'نورة');
    assert.equal(p.$('[data-generate]').disabled, true);
    const q = page({ endpoint: '' }); await settle(); choose(q, 'generate'); type(q, 'نورة');
    assert.equal(q.$('[data-generate]').disabled, true); assert.equal(q.calls.length, 0, 'blank endpoint makes no network calls');
    assert.match(q.$('[data-status]').textContent, /غير متاح/);
    p.w.close(); q.w.close();
  }
  // 4. Approval is server-confirmed: a failed or late (stale) approval never enables the cart.
  {
    let release; const gate = new Promise((r) => { release = r; });
    const all = [0, 1, 2].map((i) => design(i, 'لمى'));
    const p = page({ sessionReplies: [{ token: 's1.tok', remaining: 6, pending: false, lastName: 'لمى', enabled: true, designs: all }],
      onApprove: async (b) => { if (b.id === 'd0') { await gate; return approvalFor('d0'); } return { ok: false, status: 503, json: async () => ({ message: 'تعذر الاعتماد' }) }; } });
    await settle(6); choose(p, 'generate');
    p.$$('[data-gallery] button')[0].click();
    const a = p.$('[data-approval]'); a.checked = true; a.dispatchEvent(new p.w.Event('change')); await settle(2);
    assert.equal(p.$('[type=submit]').disabled, true, 'no cart while approval is in flight');
    p.$$('[data-gallery] button')[1].click();           // customer switches design before the reply
    release(); await settle(6);
    assert.equal(p.$('[data-receipt]').value, '', 'late approval for the old design is ignored');
    assert.equal(p.$('[data-design-id]').value, 'd1'); assert.equal(p.$('[type=submit]').disabled, true);
    await approve(p);                                    // d1 approval fails on the server
    assert.equal(p.$('[data-approval]').checked, false); assert.equal(p.$('[type=submit]').disabled, true);
    assert.match(p.$('[data-status]').textContent, /تعذر الاعتماد/);
    p.w.close();
  }
  // 5. Reload restores the saved choice (not the approval) and old designs stay selectable at zero quota.
  {
    const all = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => design(i, 'آلاء'));
    const p = page({ storage: 's1.saved', choice: 'd4', sessionReplies: [{ token: 's1.saved', remaining: 0, pending: false, lastName: 'آلاء', enabled: true, designs: all }] });
    await settle(8);
    assert.equal(p.$('[data-mode=generate]').checked, true, 'returns to the name path');
    assert.equal(p.$('[data-design-id]').value, 'd4'); assert.equal(p.$('[data-approval]').checked, false, 'approval is never restored');
    assert.equal(p.$('[type=submit]').disabled, true); assert.equal(p.$('[data-generate]').disabled, true, 'no new batches at zero quota');
    p.$$('[data-gallery] button')[0].click(); await approve(p);
    assert.equal(p.$('[data-design-id]').value, 'd0'); assert.equal(p.$('[type=submit]').disabled, false, 'first design still selectable and approvable at zero quota');
    p.w.close();
  }
  // 6. A batch that ends with no design (released/failed on the server) is reported as a failure, never as a choice.
  {
    const EMPTY = 'تعذر إنشاء التصاميم. لم يصلنا أي تصميم؛ حاول لاحقاً أو ارفع تصميمك.';
    let gens = 0;
    const p = page({ sessionReplies: [
      { token: 's1.e', remaining: 9, pending: false, lastName: '', enabled: true, designs: [] },
      { token: 's1.e', remaining: 6, pending: true, lastName: 'نورة', enabled: true, designs: [] },
      { token: 's1.e', remaining: 9, pending: false, lastName: 'نورة', enabled: true, designs: [] }],
      onGenerate: async () => { gens++; return { ok: true, status: 202, json: async () => ({ token: 's1.e', remaining: 6, pending: true, lastName: 'نورة', enabled: true, designs: [] }) }; } });
    await settle(6); choose(p, 'generate');
    assert.equal(p.$('[data-status]').textContent, 'اكتب الاسم ثم اضغط «اعرض 3 تصاميم».', 'empty gallery guides the customer to enter a name');
    assert.doesNotMatch(p.$('[data-counter]').textContent, /خياراتك السابقة|اختر/, 'no invitation to choose from an empty gallery');
    type(p, 'نورة'); p.$('[data-generate]').click(); await wait(60); await settle(10);
    assert.equal(gens, 1);
    assert.equal(p.$('[data-status]').textContent, EMPTY, 'released batch shows the accurate failure');
    assert.doesNotMatch(p.$('[data-status]').textContent + p.$('[data-counter]').textContent, /اختر من جميع التصاميم المعروضة/);
    assert.equal(p.$$('[data-gallery] button').length, 0);
    assert.equal(p.$('[data-generate]').disabled, false, 'progress stopped; the customer can retry or switch to upload');
    assert.equal(p.$('[data-name]').disabled, false); assert.equal(p.$('[data-name]').value, 'نورة');
    const polls = p.calls.filter((c) => c.url.endsWith('/session')).length; await wait(40); await settle(6);
    assert.equal(p.calls.filter((c) => c.url.endsWith('/session')).length, polls, 'polling stopped');
    p.w.close();
  }
  // 7. An empty batch keeps every earlier design and the current selection.
  {
    const old = [0, 1, 2].map((i) => design(i, 'لمى'));
    const p = page({ storage: 's1.o', choice: 'd1', sessionReplies: [
      { token: 's1.o', remaining: 6, pending: false, lastName: 'لمى', enabled: true, designs: old },
      { token: 's1.o', remaining: 6, pending: false, lastName: 'لمى', enabled: true, designs: old }],
      onGenerate: async () => ({ ok: true, status: 202, json: async () => ({ token: 's1.o', remaining: 3, pending: true, lastName: 'لمى', enabled: true, designs: old }) }) });
    await settle(8);
    assert.equal(p.$('[data-design-id]').value, 'd1', 'saved choice restored');
    p.$('[data-generate]').click(); await wait(60); await settle(10);
    assert.equal(p.$('[data-status]').textContent, 'تعذر إنشاء التصاميم. لم يصلنا أي تصميم؛ حاول لاحقاً أو ارفع تصميمك.');
    assert.equal(p.$$('[data-gallery] button').length, 3, 'old designs kept');
    assert.equal(p.$('[data-design-id]').value, 'd1', 'selection kept'); assert.equal(p.$('[data-preview]').hidden, false);
    p.w.close();
  }
  // 8. A late session reply never overwrites what the customer typed or cleared, nor selects a saved design.
  {
    let release; const g = new Promise((r) => { release = r; });
    const p = page({ storage: 's1.l', choice: 'd0', sessionGate: g, sessionReplies: [{ token: 's1.l', remaining: 6, pending: false, lastName: 'نورة', enabled: true, designs: [design(0, 'نورة')] }] });
    choose(p, 'generate'); type(p, 'سارة');
    release(); await settle(8);
    assert.equal(p.$('[data-name]').value, 'سارة', 'typed name kept'); assert.equal(p.$('[data-design-id]').value, '', 'no late auto-selection');
    const q = page({ storage: 's1.l', sessionGate: new Promise((r) => setTimeout(r, 10)), sessionReplies: [{ token: 's1.l', remaining: 6, pending: false, lastName: 'نورة', enabled: true, designs: [] }] });
    choose(q, 'generate'); type(q, 'سارة'); type(q, '');
    await wait(40); await settle(8);
    assert.equal(q.$('[data-name]').value, '', 'a cleared name stays cleared');
    p.w.close(); q.w.close();
  }
  // 9. A new name typed after the old selection was restored survives the whole batch; old designs stay reachable.
  {
    const old = [0, 1, 2].map((i) => design(i, 'عبدالرحمن')), neu = [3, 4, 5].map((i) => design(i, 'مدى'));
    const p = page({ storage: 's1.r', choice: 'd1', sessionReplies: [
      { token: 's1.r', remaining: 6, pending: false, lastName: 'عبدالرحمن', enabled: true, designs: old },
      { token: 's1.r', remaining: 3, pending: true, lastName: 'مدى', enabled: true, designs: old },
      { token: 's1.r', remaining: 3, pending: false, lastName: 'مدى', enabled: true, designs: [...old, ...neu] }],
      onGenerate: async () => ({ ok: true, status: 202, json: async () => ({ token: 's1.r', remaining: 3, pending: true, lastName: 'مدى', enabled: true, designs: old }) }) });
    await settle(8);
    assert.equal(p.$('[data-design-id]').value, 'd1', 'initial load restores the saved choice');
    type(p, 'مدى');
    assert.equal(p.w.localStorage.getItem('calapres-design-choice'), null, 'editing the name drops the saved choice');
    p.$('[data-generate]').click(); await wait(80); await settle(10);
    assert.equal(p.$('[data-name]').value, 'مدى', 'the requested name is kept at completion');
    assert.deepEqual(p.$$('[data-gallery] img').map((i) => i.src), neu.map((d) => d.url), 'the new designs are shown');
    assert.equal(p.$('[data-design-id]').value, '', 'no old selection is resurrected');
    type(p, 'عبدالرحمن'); assert.equal(p.$$('[data-gallery] button').length, 3, 'old designs remain accessible');
    p.w.close();
  }
  // 10. Reload while a batch for a new name is pending: that name and its designs win over an older saved choice.
  {
    const old = [0, 1, 2].map((i) => design(i, 'عبدالرحمن')), neu = [3, 4, 5].map((i) => design(i, 'مدى'));
    const p = page({ storage: 's1.r', choice: 'd1', sessionReplies: [
      { token: 's1.r', remaining: 3, pending: true, lastName: 'مدى', enabled: true, designs: old },
      { token: 's1.r', remaining: 3, pending: false, lastName: 'مدى', enabled: true, designs: [...old, ...neu] }] });
    await wait(80); await settle(12);
    assert.equal(p.$('[data-mode=generate]').checked, true);
    assert.equal(p.$('[data-name]').value, 'مدى');
    assert.deepEqual(p.$$('[data-gallery] img').map((i) => i.src), neu.map((d) => d.url));
    assert.equal(p.$('[data-design-id]').value, '', 'older selection for another name is not restored');
    type(p, 'عبدالرحمن'); assert.equal(p.$$('[data-gallery] button').length, 3);
    p.w.close();
  }
  console.log('PASS: 3/6/9 accumulation in batches, first choice after ninth, server-confirmed approval (stale/failed replies ignored), approval resets, exact cart properties, name filter, invalid-name block, pending restore and choice restore after reload, zero-quota selection, disabled states, empty-batch failure keeps old designs and selection, late restore never overwrites typed input, requested name survives completion and reload-while-pending, saved choice dropped on edit');
})().catch((e) => { console.error(e); process.exitCode = 1; });
