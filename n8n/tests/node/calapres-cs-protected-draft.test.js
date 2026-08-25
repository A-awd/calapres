'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const workflow = JSON.parse(readFileSync(join(
  __dirname,
  '../../deployments/calapres-cs-bot-protected-draft.json',
), 'utf8'));

const nodesByName = new Map(workflow.nodes.map((node) => [node.name, node]));

function directTargets(source) {
  const connection = workflow.connections[source] || {};
  return Object.values(connection)
    .flat(2)
    .filter(Boolean)
    .map((edge) => edge.node);
}

function runGovernedRoute(state) {
  const code = nodesByName.get('Governed Customer Scope Router').parameters.jsCode;
  const $input = { first: () => ({ json: state }) };
  return new Function('$input', code)($input)[0].json;
}

function classifierOutput(overrides = {}) {
  return {
    schema_version: '1.0',
    brand_id: 'calapres',
    intent: 'out_of_scope',
    confidence: 0.98,
    catalog_relation: 'outside_catalog',
    requested_subject_ar: 'سيارة',
    knowledge_fact_id: null,
    capability: null,
    product_search_terms: [],
    order_number: null,
    needs_human: false,
    reason_code: 'outside_catalog',
    ...overrides,
  };
}

function runGroundedClassification(prepared, output) {
  const code = nodesByName.get('Humanize Text').parameters.jsCode;
  const $ = () => ({ first: () => ({ json: prepared }) });
  return new Function('$', '$input', code)($, {
    first: () => ({ json: { output: JSON.stringify(output) } }),
  })[0].json;
}

function reachableFrom(source) {
  const reached = new Set();
  const pending = [source];
  while (pending.length) {
    const current = pending.shift();
    if (reached.has(current)) continue;
    reached.add(current);
    pending.push(...directTargets(current));
  }
  return reached;
}

test('protected Calapres draft preserves the reviewed rollback and no-save settings', () => {
  assert.equal(workflow.workflow_id, 'kAyF0D3ZZHxc0Hwp');
  assert.equal(workflow.active_version_id, 'b67ae1e3-98df-4665-9bee-29754d1beafd');
  assert.equal(workflow.publish_state, 'published_active');
  assert.equal(workflow.node_count, workflow.nodes.length);
  assert.equal(workflow.settings.saveDataSuccessExecution, 'none');
  assert.equal(workflow.settings.saveDataErrorExecution, 'none');
  assert.equal(workflow.settings.saveManualExecutions, false);
});

test('governed scope router is inserted between verified anchor and the existing decision switch', () => {
  assert.ok(nodesByName.has('Governed Customer Scope Router'));
  assert.deepEqual(
    directTargets('Verify Chatwoot Anchor and Route'),
    ['Governed Customer Scope Router'],
  );
  assert.deepEqual(
    directTargets('Governed Customer Scope Router'),
    ['Route Customer Service Decision'],
  );
  assert.equal(workflow.nodes.length, 107);
  assert.equal(workflow.node_count, 107);
});

test('governed scope router sends every customer message to the bounded classifier without tool authority', () => {
  const weather = runGovernedRoute({
    context: { customer_text: 'ما هو طقس لندن اليوم؟' },
  });
  assert.equal(weather.route_index, 3);
  assert.equal(weather.decision_kind, 'grounded_classification');
  assert.equal(weather.model_allowed, true);
  assert.equal(weather.tool_allowed, false);
  assert.equal(weather.classifier_input.customer_message, 'ما هو طقس لندن اليوم؟');
  assert.deepEqual(weather.classifier_input.external_information_tools, []);

  const product = runGovernedRoute({
    context: { customer_text: 'كم سعر المبخرة؟' },
  });
  assert.equal(product.route_index, 3);
  assert.equal(product.decision_kind, 'grounded_classification');
  assert.equal(product.model_allowed, true);
  assert.equal(product.tool_allowed, false);

  for (const customerText of [
    'بكم المبخره الخضراء',
    'بكم المبخره الخضراء المخططه بالبرتقالي',
  ]) {
    const describedProduct = runGovernedRoute({ context: { customer_text: customerText } });
    assert.equal(describedProduct.route_index, 3, customerText);
    assert.equal(describedProduct.decision_kind, 'grounded_classification', customerText);
    assert.equal(describedProduct.tool_allowed, false, customerText);
  }
});

test('all node expressions and graph edges resolve to existing nodes', () => {
  const missing = [];
  for (const node of workflow.nodes) {
    const source = JSON.stringify(node.parameters || {});
    for (const match of source.matchAll(/\$\(['\"]([^'\"]+)['\"]\)/g)) {
      if (!nodesByName.has(match[1])) missing.push([node.name, match[1]]);
    }
  }
  for (const [source, connection] of Object.entries(workflow.connections)) {
    if (!nodesByName.has(source)) missing.push(['connection source', source]);
    for (const target of Object.values(connection).flat(2).filter(Boolean)) {
      if (!nodesByName.has(target.node)) missing.push([source, target.node]);
    }
  }
  assert.deepEqual(missing, []);
});

test('customer egress has one fail-closed gate and recovery can never reach it', () => {
  const incoming = [];
  for (const [source, connection] of Object.entries(workflow.connections)) {
    for (const [output, targets] of (connection.main || []).entries()) {
      for (const target of targets || []) {
        if (target.node === 'Send Reply') incoming.push({ source, output });
      }
    }
  }
  assert.deepEqual(incoming, [{ source: 'Customer Egress Authorized?', output: 0 }]);
  assert.equal(reachableFrom('Recover Ambiguous Sends Every 15 Minutes').has('Send Reply'), false);
  assert.equal(workflow.safety.recovery_customer_send_allowed, false);
});

test('recovery verifies the Chatwoot reply digest and retries reads without resending', () => {
  assert.ok(nodesByName.has('Hash Recovered Chatwoot Reply'));
  assert.ok(nodesByName.has('Recovered Reply Digest Matches?'));
  assert.ok(nodesByName.has('Postgres Customer Reply 13 Release Recovery Retry'));
  assert.deepEqual(
    directTargets('Route Customer Reply Recovery'),
    [
      'Hash Recovered Chatwoot Reply',
      'Postgres Customer Reply 12 Fail Recovery Closed',
      'Postgres Customer Reply 13 Release Recovery Retry',
    ],
  );
});

test('Shopify is read-only and no forbidden customer-write surfaces exist', () => {
  const serialized = JSON.stringify(workflow);
  const shopify = nodesByName.get('GET Shopify Orders Read Only');
  assert.equal(shopify.parameters.method, 'POST');
  assert.match(shopify.parameters.url, /graphql\.json$/);
  assert.doesNotMatch(JSON.stringify(shopify.parameters), /\bmutation\b/i);
  assert.doesNotMatch(serialized, /(?:AgentBot|Captain|supabase)/i);
  assert.doesNotMatch(serialized, /message_type['\"]?\s*:\s*['\"]private/i);
});

test('Shopify node authenticates with the Shopify-Calapres credential, not the expired generic one', () => {
  // n8n's update API refuses to clear a node's now-invalid credential key once
  // `authentication` moves away from the mode that used it ("node type
  // 'n8n-nodes-base.httpRequest' does not accept credential 'oAuth2Api'" when
  // authentication is already predefinedCredentialType), so the old oAuth2Api
  // entry stays in the node's credentials map as inert leftover JSON. What
  // matters for behavior and security is which credential the node actually
  // authenticates with, which is driven solely by `authentication` +
  // `nodeCredentialType` here, not by which keys merely exist in the map.
  const shopify = nodesByName.get('GET Shopify Orders Read Only');
  assert.equal(shopify.parameters.authentication, 'predefinedCredentialType');
  assert.equal(shopify.parameters.nodeCredentialType, 'shopifyOAuth2Api');
  assert.equal(shopify.parameters.genericAuthType, undefined);
  assert.equal(shopify.credentials.shopifyOAuth2Api.id, 'QLsvwO73GFsQfy0w');
  assert.equal(shopify.credentials.shopifyOAuth2Api.name, 'Shopify-Calapres');
  // The stale key, if it lingers, must never be reachable: authentication is not
  // genericCredentialType, so n8n's httpRequest node cannot select it at runtime.
  if (shopify.credentials.oAuth2Api) {
    assert.notEqual(shopify.parameters.authentication, 'genericCredentialType');
  }
});

test('frozen draft contains no credential secret values or customer fixtures', () => {
  const serialized = JSON.stringify(workflow);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{16,}/);
  assert.doesNotMatch(serialized, /Bearer\s+[A-Za-z0-9._-]{16,}/i);
  assert.doesNotMatch(serialized, /postgres(?:ql)?:\/\/[^\s\"]+:[^@\s\"]+@/i);
  assert.doesNotMatch(serialized, /(?:raw_body|transcript|phone_number|email_address)\s*:/i);
});

function runGateNode(nodeName, item) {
  const code = nodesByName.get(nodeName).parameters.jsCode;
  const $input = { first: () => item };
  return new Function('$input', 'Buffer', code)($input, Buffer)[0].json;
}

const anonymizedDelivery = {
  account: { id: 179973, name: 'Calapres' },
  content: 'اختبار هيكلي',
  content_type: 'text',
  conversation: { id: 3, inbox_id: 128058, labels: [], can_reply: true },
  created_at: '2026-08-13T00:00:00.000Z',
  id: 900000001,
  inbox: { id: 128058, name: 'WhatsApp' },
  message_type: 'incoming',
  private: false,
  sender: { id: 1, name: 'Test Contact', type: 'contact' },
  event: 'message_created',
};

function deliveryItem(overrides = {}) {
  const raw = Buffer.from(JSON.stringify(anonymizedDelivery), 'utf8');
  return {
    json: {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-chatwoot-timestamp': '1786625346',
        'x-chatwoot-signature': 'sha256='.padEnd(71, 'a'),
        'x-chatwoot-delivery': '00000000-0000-4000-8000-000000000000',
        ...overrides.headers,
      },
    },
    binary: { data: { data: (overrides.rawBase64 ?? raw.toString('base64')) } },
  };
}

test('ingress gate has no signature dependency and keeps the fail-closed chain', () => {
  const hmacNodes = workflow.nodes.filter((node) =>
    node.type === 'n8n-nodes-base.crypto'
    && ((node.parameters || {}).action === 'hmac' || node.credentials));
  assert.deepEqual(hmacNodes, []);
  assert.deepEqual(directTargets('Chatwoot In'), ['Prepare Raw Chatwoot Ingress']);
  assert.deepEqual(directTargets('Prepare Raw Chatwoot Ingress'), ['Webhook Ingress Ready?']);
  assert.deepEqual(
    directTargets('Webhook Ingress Ready?'),
    ['Finalize Chatwoot Ingress Gate', 'Respond Chatwoot Ingress Rejected'],
  );
  assert.deepEqual(
    directTargets('Chatwoot Ingress Accepted?'),
    ['Should Reply?', 'Respond Chatwoot Ingress Rejected'],
  );
});

test('ingress gate accepts a Chatwoot-cloud-shaped delivery without verifying its signature', () => {
  const prepared = runGateNode('Prepare Raw Chatwoot Ingress', deliveryItem());
  assert.equal(prepared.ingress_ready, true);
  assert.equal(prepared.response_code, 0);
  assert.equal(prepared.advisory_signature_header.startsWith('sha256='), true);
  const finalized = runGateNode('Finalize Chatwoot Ingress Gate', { json: prepared });
  assert.equal(finalized.ingress_accepted, true);
  assert.equal(finalized.body.event, 'message_created');
  assert.equal(finalized.body.conversation.inbox_id, 128058);
});

test('ingress gate still fails closed on structural violations', () => {
  const oversized = runGateNode('Prepare Raw Chatwoot Ingress',
    deliveryItem({ rawBase64: Buffer.alloc(1048577, 0x7b).toString('base64') }));
  assert.deepEqual([oversized.ingress_ready, oversized.response_code], [false, 413]);
  const wrongType = runGateNode('Prepare Raw Chatwoot Ingress',
    deliveryItem({ headers: { 'content-type': 'text/plain' } }));
  assert.deepEqual([wrongType.ingress_ready, wrongType.response_code], [false, 400]);
  const missing = runGateNode('Prepare Raw Chatwoot Ingress', { json: { headers: {} } });
  assert.deepEqual([missing.ingress_ready, missing.response_code], [false, 400]);
  const badJson = runGateNode('Finalize Chatwoot Ingress Gate', {
    json: { ingress_ready: true, raw_body_base64: Buffer.from('not json').toString('base64') },
  });
  assert.deepEqual([badJson.ingress_accepted, badJson.response_code], [false, 400]);
});

test('anchor verification accepts real Chatwoot API rows that omit account_id', () => {
  const code = nodesByName.get('Verify Chatwoot Anchor and Route').parameters.jsCode;
  const context = {
    brand_id: 'calapres', account_id: 179973, inbox_id: 128058, conversation_id: 3,
    inbound_message_id: 900000002, customer_text: 'هلا',
    claimed_source_id: 'wamid.TEST900000002', claimed_created_epoch: 1786626850,
    processing_lease_token: 'crp_3_900000002_test',
  };
  const apiRow = {
    id: 900000002, content: 'هلا', inbox_id: 128058, conversation_id: 3,
    message_type: 0, content_type: 'text', status: 'sent', created_at: 1786626850,
    private: false, source_id: 'wamid.TEST900000002',
    sender: { id: 1, name: 'Test Contact', type: 'contact', phone_number: '+966500000000' },
  };
  const mocks = {
    'Interpret Customer Reply Event Claim': { json: { context } },
    'GET Verified Chatwoot Conversation': { json: { statusCode: 200, body: {
      id: 3, inbox_id: 128058, labels: [],
      meta: { sender: { phone_number: '+966500000000' } },
    } } },
  };
  const $ = (name) => ({ first: () => mocks[name] });
  const $input = { first: () => ({ json: { statusCode: 200, body: { payload: [apiRow] } } }) };
  const out = new Function('$', '$input', 'Buffer', code)($, $input, Buffer)[0].json;
  assert.equal(out.error_code, null);
  assert.equal(out.decision_kind, 'greeting');
  assert.equal(out.route_index, 1);
  const wrongAccountRow = { ...apiRow, account_id: 999 };
  const $badInput = { first: () => ({ json: { statusCode: 200, body: { payload: [wrongAccountRow] } } }) };
  const bad = new Function('$', '$input', 'Buffer', code)($, $badInput, Buffer)[0].json;
  assert.equal(bad.error_code, 'anchor_mismatch');
});

function runAnchorRoute(text, { inboxId = 128058, phone = '+966500000000' } = {}) {
  const code = nodesByName.get('Verify Chatwoot Anchor and Route').parameters.jsCode;
  const context = {
    brand_id: 'calapres', account_id: 179973, inbox_id: inboxId, conversation_id: 3,
    inbound_message_id: 900000003, customer_text: text,
    claimed_source_id: 'wamid.TEST900000003', claimed_created_epoch: 1786626850,
    processing_lease_token: 'crp_3_900000003_test',
  };
  const apiRow = {
    id: 900000003, content: text, inbox_id: inboxId, conversation_id: 3,
    message_type: 0, content_type: 'text', status: 'sent', created_at: 1786626850,
    private: false, source_id: 'wamid.TEST900000003',
    sender: { id: 1, name: 'Test Contact', type: 'contact' },
  };
  const mocks = {
    'Interpret Customer Reply Event Claim': { json: { context } },
    'GET Verified Chatwoot Conversation': { json: { statusCode: 200, body: {
      id: 3, inbox_id: inboxId, labels: [],
      meta: { sender: phone ? { phone_number: phone } : {} },
    } } },
  };
  const $ = (name) => ({ first: () => mocks[name] });
  const $input = { first: () => ({ json: { statusCode: 200, body: { payload: [apiRow] } } }) };
  return new Function('$', '$input', 'Buffer', code)($, $input, Buffer)[0].json;
}

test('only Calapres WhatsApp, Instagram, and TikTok inboxes can enter and complete customer egress', () => {
  const shouldReply = nodesByName.get('Should Reply?');
  const conditions = shouldReply.parameters.conditions.conditions;
  const event = conditions.find((condition) => condition.id === 'event');
  const inbox = conditions.find((condition) => condition.id === 'inbox');
  assert.equal(event.leftValue, '={{ $json.body.event }}');
  assert.match(inbox.leftValue, /128031, 128033, 128058/);
  assert.doesNotMatch(inbox.leftValue, /128028/);

  for (const inboxId of [128031, 128033, 128058]) {
    const out = runAnchorRoute('هلا', { inboxId, phone: inboxId === 128058 ? '+966500000000' : null });
    assert.deepEqual([out.context.inbox_id, out.route_index, out.decision_kind],
      [inboxId, 1, 'greeting']);
  }
  const website = runAnchorRoute('هلا', { inboxId: 128028, phone: null });
  assert.equal(website.error_code, 'chatwoot_route_mismatch');

  const source = JSON.stringify(workflow);
  assert.match(source, /\[128031,128033,128058\]\.includes\(Number\(c\.inbox_id\)\)/);
  assert.match(source, /Number\(b\.inbox_id\)===Number\(s\.context\.inbox_id\)/);
  assert.match(source, /inbox_id:Number\(v\.inbox_id\)/);
});

test('social channels never infer Shopify identity without a trusted phone', () => {
  for (const inboxId of [128031, 128033]) {
    const order = runAnchorRoute('وين طلبي', { inboxId, phone: null });
    assert.equal(order.decision_kind, 'order');
    assert.equal(order.customer_phone, null);
    const prepCode = nodesByName.get('Prepare Shopify Order Read').parameters.jsCode;
    const prepared = new Function('$input', 'Buffer', prepCode)(
      { first: () => ({ json: order }) }, Buffer)[0].json;
    assert.equal(prepared.shopify_lookup_ready, false);
    assert.match(prepared.reply_text, /رقم طلبك/);
  }
});

test('social webhook ingress accepts numeric source ids and unix timestamps', () => {
  const code = nodesByName.get('Prepare Customer Reply Ingress').parameters.jsCode;
  const input = { json: { body: {
    event: 'message_created', message_type: 'incoming', private: false,
    account: { id: 179973 }, inbox: { id: 128031 },
    conversation: { id: 44, labels: [] }, id: 991, content: 'هلا',
    source_id: 778899, created_at: 1786626850,
  } } };
  const $input = { first: () => input };
  const $execution = { id: 'social-test' };
  const out = new Function('$input', '$execution', 'Buffer', code)($input, $execution, Buffer)[0].json;
  assert.equal(out.context.claimed_source_id, '778899');
  assert.equal(out.context.claimed_created_epoch, 1786626850);
  assert.equal(out.context.inbox_id, 128031);
});

test('store questions stay deterministic while unknown conversation reaches the bounded model', () => {
  for (const q of ['وين مقركم', 'انتم في مصر ؟', 'انتم في الكويت ؟', 'انت وين']) {
    const out = runAnchorRoute(q);
    assert.equal(out.decision_kind, 'faq', q);
    assert.match(out.reply_text, /سعودي/);
  }
  const who = runAnchorRoute('انت مين');
  assert.equal(who.decision_kind, 'faq');
  const personal = runAnchorRoute('وش اسمي ؟');
  assert.deepEqual(
    [personal.route_index, personal.decision_kind, personal.model_scope],
    [3, 'model', 'non_business'],
  );
});

test('the model is a strict low-randomness classifier and cannot answer external information', () => {
  const brain = nodesByName.get('Calapres Brain');
  const prompt = brain.parameters.options.systemMessage;
  const model = nodesByName.get('OpenAI Calapres Restricted Model');
  assert.match(prompt, /صنّف المعنى فقط/);
  assert.match(prompt, /لا تكتب ردًا للعميل/);
  assert.match(prompt, /أي طقس أو أخبار/);
  assert.equal(model.parameters.options.temperature, 0);
  assert.equal(model.parameters.options.reasoningEffort, 'low');
  assert.equal(brain.parameters.hasOutputParser, true);
  assert.equal(model.parameters.options.textFormat, undefined);
  const parser = nodesByName.get('Calapres Classification Parser');
  assert.equal(parser.type, '@n8n/n8n-nodes-langchain.outputParserStructured');
  assert.equal(JSON.parse(parser.parameters.inputSchema).additionalProperties, false);
  assert.equal(model.parameters.builtInTools, undefined);

  const businessUnclear = runAnchorRoute('ممكن تساعدني أختار منتج مناسب؟');
  assert.deepEqual(
    [businessUnclear.route_index, businessUnclear.decision_kind, businessUnclear.model_scope],
    [3, 'model', 'business_unclear'],
  );
});

test('product price questions route to the live Shopify reference, not memorized facts', () => {
  const priced = runAnchorRoute('بكم المبخرة');
  assert.deepEqual([priced.route_index, priced.decision_kind, priced.product_topic], [2, 'product', 'مبخر']);
  const stand = runAnchorRoute('سعر ستاند الايباد');
  assert.deepEqual(
    [stand.route_index, stand.decision_kind, stand.product_topic],
    [1, 'faq', undefined],
  );
  assert.match(stand.reply_text, /المباخر الفاخرة فقط/);
  const perfume = runAnchorRoute('عندكم عطور نيشية؟');
  assert.deepEqual(
    [perfume.route_index, perfume.decision_kind, perfume.product_topic],
    [1, 'faq', undefined],
  );
  assert.match(perfume.reply_text, /المباخر الفاخرة فقط/);
  const catalog = runAnchorRoute('وش تقدمون؟');
  assert.deepEqual([catalog.route_index, catalog.decision_kind], [1, 'faq']);
  assert.match(catalog.reply_text, /المباخر الفاخرة/);
  assert.doesNotMatch(catalog.reply_text, /عطور|ستاند|أعراس/);
  assert.equal(JSON.stringify(workflow).includes('390 ريال'), false);
  assert.equal(JSON.stringify(workflow).includes('190 ريال'), false);
});

test('approved catalog and price questions read the active Shopify catalog', () => {
  const prepCode = nodesByName.get('Prepare Shopify Order Read').parameters.jsCode;
  for (const text of ['وش المنتجات الموجودة؟', 'كم سعر المبخرة؟', 'Show your catalog']) {
    const preparedClassification = runGovernedRoute(runAnchorRoute(text));
    const routed = runGroundedClassification(preparedClassification, classifierOutput({
      intent: 'product_search',
      catalog_relation: 'possible_product',
      requested_subject_ar: 'مبخرة',
      capability: 'product_search',
      product_search_terms: ['مبخرة'],
      reason_code: 'shopify_product_search_required',
    }));
    assert.deepEqual([routed.route_index, routed.decision_kind], [2, 'faq'], text);
    const prepared = new Function('$input', 'Buffer', prepCode)(
      { first: () => ({ json: routed }) }, Buffer)[0].json;
    assert.equal(prepared.shopify_lookup_ready, true, text);
    assert.equal(prepared.shopify_lookup_mode, 'grounded_product_search', text);
    assert.match(prepared.shopify_request.variables.search, /vendor:"\u0643\u0627\u0644\u0627\u0628\u0631\u064a\u0632"/, text);
    assert.match(prepared.shopify_request.variables.search, /product_type:"\u0645\u0628\u0627\u062e\u0631"/, text);
  }
});

test('Calapres classifier receives only the isolated brand pack and approved facts', () => {
  const prompt = nodesByName.get('Calapres Brain').parameters.options.systemMessage;
  assert.match(prompt, /استخدم فقط هوية البراند والفئات والحقائق/);
  const prepared = runGovernedRoute({ context: { customer_text: 'وش تبيعون؟' } });
  assert.equal(prepared.classifier_input.brand.brand_id, 'calapres');
  assert.deepEqual(prepared.classifier_input.brand.allowed_categories_ar, ['المباخر الفاخرة']);
  assert.match(prepared.classifier_input.brand.business_summary_ar, /متجر سعودي/);
  assert.ok(prepared.classifier_input.brand.approved_facts.every((fact) => fact.fact_id));
  assert.deepEqual(prepared.classifier_input.external_information_tools, []);
});

test('product reference builds a Shopify query and replies only from live data', () => {
  const prepCode = nodesByName.get('Prepare Shopify Order Read').parameters.jsCode;
  const classified = runGroundedClassification(
    runGovernedRoute({ context: { customer_text: 'بكم المبخرة الخضراء؟' } }),
    classifierOutput({
      intent: 'product_search', catalog_relation: 'possible_product',
      requested_subject_ar: 'المبخرة الخضراء', capability: 'product_search',
      product_search_terms: ['أخضر'], reason_code: 'shopify_product_search_required',
    }),
  );
  const prep = new Function('$input', 'Buffer', prepCode)(
    { first: () => ({ json: classified }) }, Buffer)[0].json;
  assert.equal(prep.shopify_lookup_mode, 'grounded_product_search');
  assert.match(prep.shopify_request.variables.search, /أخضر\*/);
  const buildCode = nodesByName.get('Build Verified Shopify Order Reply').parameters.jsCode;
  const mocks = { 'Prepare Shopify Order Read': { json: prep } };
  const $ = (name) => ({ first: () => mocks[name] });
  const good = new Function('$', '$input', 'Buffer', buildCode)($, { first: () => ({ json: {
    statusCode: 200, body: { data: {
      matches: { nodes: [] },
      catalog: { nodes: [{ title: 'مبخرة كالابريز — الأبيض',
        status: 'ACTIVE', priceRangeV2: { minVariantPrice: { amount: '390.0', currencyCode: 'SAR' } } }] },
    } },
  } }) }, Buffer)[0].json;
  assert.equal(good.send_ready, true);
  assert.match(good.reply_text, /390/);
  assert.match(good.reply_text, /ما لقيت/);
  const empty = new Function('$', '$input', 'Buffer', buildCode)($, { first: () => ({ json: {
    statusCode: 200, body: { data: { matches: { nodes: [] }, catalog: { nodes: [] } } },
  } }) }, Buffer)[0].json;
  assert.equal(empty.send_ready, true);
  assert.equal(empty.decision_kind, 'faq');
  assert.match(empty.reply_text, /ما لقيت/);
});

test('Shopify credential and data-gap failures self-serve instead of escalating to a human', () => {
  const buildCode = nodesByName.get('Build Verified Shopify Order Reply').parameters.jsCode;
  const prepCode = nodesByName.get('Prepare Shopify Order Read').parameters.jsCode;
  const $ = (mocks) => (name) => ({ first: () => mocks[name] });

  // Shopify API/credential failure on an order lookup
  const orderState = { shopify_lookup_mode: 'phone', customer_phone: '+966500000000' };
  const failed = new Function('$', '$input', 'Buffer', buildCode)(
    $({ 'Prepare Shopify Order Read': { json: orderState } }),
    { first: () => ({ json: { statusCode: 500, body: {} } }) }, Buffer)[0].json;
  assert.equal(failed.send_ready, true);
  assert.match(failed.reply_text, /رقم الطلب/);

  // No trusted phone and no order number: ask for the order number instead of escalating
  const noPhone = new Function('$input', 'Buffer', prepCode)(
    { first: () => ({ json: { decision_kind: 'order', customer_phone: null, order_number: null } }) }, Buffer)[0].json;
  assert.equal(noPhone.send_ready, true);
  assert.match(noPhone.reply_text, /رقم طلبك/);

  // Identity mismatch: never reveal the order belongs to someone else, just ask to recheck
  const mismatch = new Function('$', '$input', 'Buffer', buildCode)(
    $({ 'Prepare Shopify Order Read': { json: { shopify_lookup_mode: 'order_number', order_number: '#1001', customer_phone: '+966500000000' } } }),
    { first: () => ({ json: { statusCode: 200, body: { data: { orders: { nodes: [
      { name: '#1001', customer: { phone: '+966511111111' } },
    ] } } } } }) }, Buffer)[0].json;
  assert.equal(mismatch.send_ready, true);
  assert.doesNotMatch(mismatch.reply_text, /5111/);
});

test('cancelled or refunded orders report the verified status directly, no escalation', () => {
  const buildCode = nodesByName.get('Build Verified Shopify Order Reply').parameters.jsCode;
  const $ = (mocks) => (name) => ({ first: () => mocks[name] });
  const cancelled = new Function('$', '$input', 'Buffer', buildCode)(
    $({ 'Prepare Shopify Order Read': { json: { shopify_lookup_mode: 'order_number', order_number: '#1001', customer_phone: '+966500000000' } } }),
    { first: () => ({ json: { statusCode: 200, body: { data: { orders: { nodes: [
      { name: '#1001', cancelledAt: '2026-08-01T00:00:00Z', customer: { phone: '+966500000000', firstName: 'سلمان' },
        displayFinancialStatus: 'REFUNDED', displayFulfillmentStatus: 'UNFULFILLED', fulfillments: [] },
    ] } } } } }) }, Buffer)[0].json;
  assert.equal(cancelled.send_ready, true);
  assert.equal(cancelled.decision_kind, 'order');
  assert.match(cancelled.reply_text, /ملغى|مسترجع/);
});

test('cancellation/refund/complaint requests self-serve first instead of an immediate human label', () => {
  const routed = runAnchorRoute('ابغى الغي طلبي');
  assert.deepEqual([routed.route_index, routed.decision_kind, routed.error_code], [2, 'sensitive_request', null]);
  const buildCode = nodesByName.get('Build Verified Shopify Order Reply').parameters.jsCode;
  const $ = (mocks) => (name) => ({ first: () => mocks[name] });
  const withOrder = new Function('$', '$input', 'Buffer', buildCode)(
    $({ 'Prepare Shopify Order Read': { json: { decision_kind: 'sensitive_request', shopify_lookup_mode: 'order_number', order_number: '#1002', customer_phone: '+966500000000' } } }),
    { first: () => ({ json: { statusCode: 200, body: { data: { orders: { nodes: [
      { name: '#1002', customer: { phone: '+966500000000', firstName: 'نورة' },
        displayFinancialStatus: 'PAID', displayFulfillmentStatus: 'UNFULFILLED', fulfillments: [] },
    ] } } } } }) }, Buffer)[0].json;
  assert.equal(withOrder.send_ready, true);
  assert.equal(withOrder.decision_kind, 'sensitive_request');
  assert.match(withOrder.reply_text, /ما تم تنفيذ الإلغاء/);
});

test('model failures and budget denials fail safe with a bounded reply, never an immediate human label', () => {
  const humanizeCode = nodesByName.get('Humanize Text').parameters.jsCode;
  const $untrusted = (name) => ({ first: () => ({
    'Interpret Model Budget Reservation': { json: { context: { conversation_id: 3, inbound_message_id: 900000010 } } },
  }[name]) });
  const untrusted = new Function('$', '$input', 'Buffer', humanizeCode)(
    $untrusted, { first: () => ({ json: { output: 'not json at all' } }) }, Buffer)[0].json;
  assert.equal(untrusted.send_ready, true);
  assert.equal(untrusted.decision_kind, 'clarification');
  assert.ok(untrusted.reply_text);

  const fallbackCode = nodesByName.get('Prepare Model Unavailable Fallback').parameters.jsCode;
  const budgetDenied = new Function('$input', 'Buffer', fallbackCode)(
    { first: () => ({ json: { context: { conversation_id: 3, inbound_message_id: 900000011 } } }) }, Buffer)[0].json;
  assert.equal(budgetDenied.send_ready, true);
  assert.equal(budgetDenied.decision_kind, 'clarification');
});

test('model output validation accepts only the strict classifier contract and rejects invalid confidence', () => {
  const humanizeCode = nodesByName.get('Humanize Text').parameters.jsCode;
  const prepared = runGovernedRoute({ context: {
    conversation_id: 3, inbound_message_id: 900000012, customer_text: 'أبغى أشتري سيارة',
  } });
  const $ = () => ({ first: () => ({ json: prepared }) });
  const natural = new Function('$', '$input', 'Buffer', humanizeCode)(
    $, { first: () => ({ json: { output: JSON.stringify(classifierOutput()) } }) }, Buffer,
  )[0].json;
  assert.equal(natural.decision_kind, 'out_of_scope');
  assert.match(natural.reply_text, /سيارة/);
  assert.match(natural.reply_text, /مباخر/);

  const invalid = new Function('$', '$input', 'Buffer', humanizeCode)(
    $, { first: () => ({ json: { output: JSON.stringify(classifierOutput({ confidence: 1.2 })) } }) }, Buffer,
  )[0].json;
  assert.equal(invalid.decision_kind, 'clarification');
});

test('Build Human Escalation is reachable only from an explicit customer human request', () => {
  const incoming = [];
  for (const [source, connection] of Object.entries(workflow.connections)) {
    for (const [output, targets] of (connection.main || []).entries()) {
      for (const target of targets || []) {
        if (target.node === 'Build Human Escalation') incoming.push({ source, output });
      }
    }
  }
  assert.deepEqual(incoming, [{ source: 'Route Customer Service Decision', output: 5 }]);
});

test('explicit request for a human agent routes to owner escalation, not silence', () => {
  const out = runAnchorRoute('أبغى أتكلم مع موظف');
  assert.deepEqual([out.route_index, out.error_code], [5, 'customer_requested_human']);
});

test('Shopify Order Read Ready false branch now reaches the send path, not human escalation', () => {
  const conn = workflow.connections['Shopify Order Read Ready?'].main;
  assert.deepEqual(conn[1], [{ node: 'Prepare Natural Response Composition', type: 'main', index: 0 }]);
});

test('no intentional pre-send delay: Pre-Send Continuation waits zero seconds', () => {
  const node = nodesByName.get('Pre-Send Continuation');
  assert.equal(node.type, 'n8n-nodes-base.wait');
  assert.deepEqual(node.parameters, { amount: 0, unit: 'seconds' });
  assert.equal(nodesByName.has('Human Delay'), false);
  const targets = directTargets('Pre-Send Continuation');
  assert.ok(targets.includes('GET Final Chatwoot Conversation'));
  assert.ok(targets.includes('Prepare SLA Case Update'));
});
