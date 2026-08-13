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
  assert.equal(workflow.active_version_id, '8c518aeb-22c2-4ab9-bcef-7418029386da');
  assert.equal(workflow.publish_state, 'draft_not_published');
  assert.equal(workflow.node_count, workflow.nodes.length);
  assert.equal(workflow.settings.saveDataSuccessExecution, 'none');
  assert.equal(workflow.settings.saveDataErrorExecution, 'none');
  assert.equal(workflow.settings.saveManualExecutions, false);
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

function runAnchorRoute(text) {
  const code = nodesByName.get('Verify Chatwoot Anchor and Route').parameters.jsCode;
  const context = {
    brand_id: 'calapres', account_id: 179973, inbox_id: 128058, conversation_id: 3,
    inbound_message_id: 900000003, customer_text: text,
    claimed_source_id: 'wamid.TEST900000003', claimed_created_epoch: 1786626850,
    processing_lease_token: 'crp_3_900000003_test',
  };
  const apiRow = {
    id: 900000003, content: text, inbox_id: 128058, conversation_id: 3,
    message_type: 0, content_type: 'text', status: 'sent', created_at: 1786626850,
    private: false, source_id: 'wamid.TEST900000003',
    sender: { id: 1, name: 'Test Contact', type: 'contact' },
  };
  const mocks = {
    'Interpret Customer Reply Event Claim': { json: { context } },
    'GET Verified Chatwoot Conversation': { json: { statusCode: 200, body: {
      id: 3, inbox_id: 128058, labels: [], meta: { sender: { phone_number: '+966500000000' } },
    } } },
  };
  const $ = (name) => ({ first: () => mocks[name] });
  const $input = { first: () => ({ json: { statusCode: 200, body: { payload: [apiRow] } } }) };
  return new Function('$', '$input', 'Buffer', code)($, $input, Buffer)[0].json;
}

test('store location and identity questions are answered, not treated out of scope', () => {
  for (const q of ['وين مقركم', 'انتم في مصر ؟', 'انتم في الكويت ؟', 'انت وين']) {
    const out = runAnchorRoute(q);
    assert.equal(out.decision_kind, 'faq', q);
    assert.match(out.reply_text, /سعودي/);
  }
  const who = runAnchorRoute('انت مين');
  assert.equal(who.decision_kind, 'faq');
  const personal = runAnchorRoute('وش اسمي ؟');
  assert.equal(personal.decision_kind, 'out_of_scope');
});

test('product price questions route to the live Shopify reference, not memorized facts', () => {
  const priced = runAnchorRoute('بكم المبخرة');
  assert.deepEqual([priced.route_index, priced.decision_kind, priced.product_topic], [2, 'product', 'مبخر']);
  const stand = runAnchorRoute('سعر ستاند الايباد');
  assert.deepEqual([stand.decision_kind, stand.product_topic], ['product', 'ستاند']);
  assert.equal(JSON.stringify(workflow).includes('390 ريال'), false);
  assert.equal(JSON.stringify(workflow).includes('190 ريال'), false);
});

test('product reference builds a Shopify query and replies only from live data', () => {
  const prepCode = nodesByName.get('Prepare Shopify Order Read').parameters.jsCode;
  const prep = new Function('$input', 'Buffer',
    prepCode)({ first: () => ({ json: { decision_kind: 'product', product_topic: 'مبخر' } }) }, Buffer)[0].json;
  assert.equal(prep.shopify_lookup_mode, 'product_info');
  assert.match(prep.shopify_request.variables.query, /مبخر/);
  const buildCode = nodesByName.get('Build Verified Shopify Order Reply').parameters.jsCode;
  const mocks = { 'Prepare Shopify Order Read': { json: prep } };
  const $ = (name) => ({ first: () => mocks[name] });
  const good = new Function('$', '$input', 'Buffer', buildCode)($, { first: () => ({ json: {
    statusCode: 200, body: { data: { products: { nodes: [{ title: 'مبخرة كالابريز — الأبيض',
      status: 'ACTIVE', priceRangeV2: { minVariantPrice: { amount: '390.0', currencyCode: 'SAR' } } }] } } },
  } }) }, Buffer)[0].json;
  assert.equal(good.send_ready, true);
  assert.match(good.reply_text, /390/);
  const empty = new Function('$', '$input', 'Buffer', buildCode)($, { first: () => ({ json: {
    statusCode: 200, body: { data: { products: { nodes: [] } } },
  } }) }, Buffer)[0].json;
  assert.deepEqual([empty.send_ready, empty.error_code], [false, 'shopify_product_not_found']);
});
