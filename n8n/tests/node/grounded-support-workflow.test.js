'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const workflow = JSON.parse(readFileSync(join(
  __dirname,
  '../../deployments/calapres-cs-bot-protected-draft.json',
), 'utf8'));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));

function targets(source) {
  return Object.values((workflow.connections[source] || {})).flat(2).filter(Boolean).map((edge) => edge.node);
}

function incomingSources(target) {
  const incoming = [];
  for (const [source, connection] of Object.entries(workflow.connections)) {
    for (const [index, edges] of (connection.main || []).entries()) {
      for (const edge of edges || []) if (edge.node === target) incoming.push({ source, index });
    }
  }
  return incoming;
}

function runVerifiedRoute(rows, customerText, sourceId = 'source-123') {
  const code = nodes.get('Verify Chatwoot Anchor and Route').parameters.jsCode;
  const inbound = rows.find((row) => Number(row.message_type) === 0 && row.content === customerText);
  const source = {
    context: {
      account_id: 179973,
      inbox_id: 128058,
      conversation_id: 77,
      inbound_message_id: inbound.id,
      customer_text: customerText,
      claimed_source_id: sourceId,
      claimed_created_epoch: inbound.created_at,
    },
  };
  const conversation = {
    statusCode: 200,
    body: { id: 77, inbox_id: 128058, labels: [], meta: {} },
  };
  const $ = (name) => ({
    first: () => ({ json: name === 'Interpret Customer Reply Event Claim' ? source : conversation }),
  });
  return new Function('$', '$input', code)($, {
    first: () => ({ json: { statusCode: 200, body: { payload: rows } } }),
  })[0].json;
}

function evaluateExpression(expression, payload) {
  const source = String(expression).replace(/^=\{\{\s*/, '').replace(/\s*\}\}$/, '');
  return new Function('$json', `return (${source});`)(payload);
}

function runClassifierPreparation(message) {
  const code = nodes.get('Governed Customer Scope Router').parameters.jsCode;
  return new Function('$input', code)({
    first: () => ({ json: {
      context: { customer_text: message },
      recent_context: [],
      scope_notice_sent: false,
    } }),
  })[0].json;
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

function runClassifierValidation(prepared, output) {
  const code = nodes.get('Humanize Text').parameters.jsCode;
  const $ = (name) => ({ first: () => ({ json: prepared }) });
  return new Function('$', '$input', code)($, {
    first: () => ({ json: { output: JSON.stringify(output) } }),
  })[0].json;
}

test('the existing responder now asks the bounded classifier instead of matching customer keywords', () => {
  for (const message of [
    'أبغى أشتري سيارة',
    'ما هو طقس لندن اليوم؟',
    'بكم المبخره الخضراء المخططه بالبرتقالي',
    'عندي سؤال غريب عن هدية للوالد',
  ]) {
    const prepared = runClassifierPreparation(message);
    assert.equal(prepared.route_index, 3, message);
    assert.equal(prepared.decision_kind, 'grounded_classification', message);
    assert.equal(prepared.model_allowed, true, message);
    assert.equal(prepared.tool_allowed, false, message);
    assert.equal(prepared.classifier_input.customer_message, message, message);
  }
});

test('the live channel gate accepts Chatwoot incoming messages in both string and numeric form', () => {
  const condition = nodes.get('Should Reply?').parameters.conditions.conditions
    .find((item) => item.id === 'incoming');

  assert.equal(evaluateExpression(condition.leftValue, { body: { message_type: 'incoming' } }), true);
  assert.equal(evaluateExpression(condition.leftValue, { body: { message_type: 0 } }), true);
});

test('the verified Chatwoot transcript reaches the model in its canonical context shape', () => {
  const routed = runVerifiedRoute([
    {
      id: 20,
      inbox_id: 128058,
      conversation_id: 77,
      message_type: 0,
      private: false,
      sender_type: 'Contact',
      source_id: 'earlier-1',
      created_at: 1001,
      content: 'السلام عليكم',
    },
    {
      id: 21,
      inbox_id: 128058,
      conversation_id: 77,
      message_type: 1,
      private: false,
      sender_type: 'User',
      source_id: 'reply-1',
      created_at: 1002,
      content: 'وعليكم السلام، حياك الله',
    },
    {
      id: 22,
      inbox_id: 128058,
      conversation_id: 77,
      message_type: 0,
      private: false,
      sender_type: 'Contact',
      source_id: 'source-123',
      created_at: 1003,
      content: 'وش عندكم؟',
    },
  ], 'وش عندكم؟');

  assert.deepEqual(routed.recent_context, [
    { direction: 'incoming', content: 'السلام عليكم' },
    { direction: 'outgoing', content: 'وعليكم السلام، حياك الله' },
    { direction: 'incoming', content: 'وش عندكم؟' },
  ]);
});

test('the OpenAI call is a low-randomness strict classifier with no external tools', () => {
  const brain = nodes.get('Calapres Brain');
  const model = nodes.get('OpenAI Calapres Restricted Model');
  const parser = nodes.get('Calapres Classification Parser');

  assert.match(brain.parameters.options.systemMessage, /صنّف المعنى فقط/);
  assert.match(brain.parameters.options.systemMessage, /لا تكتب ردًا للعميل/);
  assert.equal(brain.parameters.hasOutputParser, true);
  assert.equal(model.parameters.responsesApiEnabled, true);
  assert.equal(model.parameters.options.temperature, 0);
  assert.equal(model.parameters.options.reasoningEffort, 'low');
  assert.equal(model.parameters.options.textFormat, undefined);
  assert.equal(model.parameters.builtInTools, undefined);
  assert.equal(parser.type, '@n8n/n8n-nodes-langchain.outputParserStructured');
  assert.equal(parser.parameters.schemaType, 'manual');
  assert.equal(JSON.parse(parser.parameters.inputSchema).additionalProperties, false);
  assert.deepEqual(workflow.connections['Calapres Classification Parser'].ai_outputParser[0], [
    { node: 'Calapres Brain', type: 'ai_outputParser', index: 0 },
  ]);
});

test('a classified car request becomes a grounded Calapres redirect and never a web answer', () => {
  const prepared = runClassifierPreparation('أبغى أشتري سيارة');
  const routed = runClassifierValidation(prepared, classifierOutput());

  assert.equal(routed.route_index, 4);
  assert.equal(routed.dynamic_read, null);
  assert.equal(routed.tool_allowed, false);
  assert.equal(routed.model_allowed, false);
  assert.equal(routed.reply_text,
    'يبدو أنك تبحث عن سيارة. هذا ليس من منتجات كالابريز؛ متجرنا متخصص في المباخر الفاخرة. أقدر أعرض لك المنتجات والأسعار الموجودة في المتجر.');
});

test('a classified product description produces a brand-filtered bounded Shopify request', () => {
  const prepared = runClassifierPreparation('بكم المبخره الخضراء المخططه بالبرتقالي');
  const routed = runClassifierValidation(prepared, classifierOutput({
    intent: 'product_search',
    catalog_relation: 'possible_product',
    requested_subject_ar: 'المبخرة الخضراء المخططة بالبرتقالي',
    capability: 'product_search',
    product_search_terms: ['أخضر', 'برتقالي'],
    reason_code: 'shopify_product_search_required',
  }));

  assert.equal(routed.route_index, 2);
  assert.equal(routed.dynamic_read, 'product_search');
  assert.equal(routed.tool_allowed, true);
  assert.equal(routed.shopify_request.variables.search,
    'status:ACTIVE AND vendor:"كالابريز" AND product_type:"مباخر" AND title:أخضر* AND title:برتقالي*');
  assert.equal(routed.shopify_request.query.includes('matches: products(first: 10'), true);
  assert.equal(routed.shopify_request.query.includes('catalog: products(first: 5'), true);
});

test('invalid classifier output fails to a store clarification with no tool authority', () => {
  const prepared = runClassifierPreparation('أي شيء');
  const code = nodes.get('Humanize Text').parameters.jsCode;
  const $ = () => ({ first: () => ({ json: prepared }) });
  const routed = new Function('$', '$input', code)($, {
    first: () => ({ json: { output: 'not json' } }),
  })[0].json;

  assert.equal(routed.route_index, 1);
  assert.equal(routed.tool_allowed, false);
  assert.equal(routed.model_allowed, false);
  assert.match(routed.reply_text, /منتجات كالابريز|طلبك/);
});

test('every customer-visible draft passes through one grounded natural-language composer', () => {
  const expectedComposerInputs = [
    'Route Customer Service Decision',
    'Shopify Order Read Ready?',
    'Verified Order Reply Ready?',
    'Model Reply Safe?',
    'Validate Escalation and Build Finalize',
    'Out of Scope Notice Allowed?',
    'Prepare Model Unavailable Fallback',
  ].sort();
  const actualComposerInputs = incomingSources('Prepare Natural Response Composition')
    .map((edge) => edge.source).sort();

  assert.deepEqual(actualComposerInputs, expectedComposerInputs);
  assert.deepEqual(incomingSources('Pre-Send Continuation'), [
    { source: 'Natural Response Needed?', index: 1 },
    { source: 'Validate Natural Response Composition', index: 0 },
  ]);
  assert.deepEqual(targets('Calapres Natural Response Composer'), ['Validate Natural Response Composition']);
  assert.deepEqual(workflow.connections['OpenAI Calapres Composer Model'].ai_languageModel[0], [
    { node: 'Calapres Natural Response Composer', type: 'ai_languageModel', index: 0 },
  ]);
  assert.deepEqual(workflow.connections['Calapres Natural Response Parser'].ai_outputParser[0], [
    { node: 'Calapres Natural Response Composer', type: 'ai_outputParser', index: 0 },
  ]);
});

test('the natural composer receives the customer message, recent context, and only the grounded draft', () => {
  const prepare = nodes.get('Prepare Natural Response Composition');
  assert.ok(prepare, 'Prepare Natural Response Composition must exist');
  const code = prepare.parameters.jsCode;
  const prepared = new Function('$input', code)({
    first: () => ({ json: {
      context: { customer_text: 'بكم تذكرة ميكونوس؟', conversation_id: 77 },
      recent_context: [{ direction: 'incoming', content: 'هلا' }],
      decision_kind: 'out_of_scope',
      send_ready: true,
      reply_text: 'هذا ليس من منتجات كالابريز؛ متجرنا متخصص في المباخر الفاخرة.',
    } }),
  })[0].json;

  assert.equal(prepared.composition_required, true);
  assert.equal(prepared.composer_input.customer_message, 'بكم تذكرة ميكونوس؟');
  assert.deepEqual(prepared.composer_input.recent_context,
    [{ direction: 'incoming', content: 'هلا' }]);
  assert.equal(prepared.composer_input.grounded_draft,
    'هذا ليس من منتجات كالابريز؛ متجرنا متخصص في المباخر الفاخرة.');
  assert.deepEqual(prepared.composer_input.allowed_external_tools, []);
});

test('a valid natural composition replaces the draft while preserving the guarded send state', () => {
  const source = {
    context: { customer_text: 'بكم تذكرة ميكونوس؟', conversation_id: 77 },
    recent_context: [],
    decision_kind: 'out_of_scope',
    send_ready: true,
    reply_text: 'هذا ليس من منتجات كالابريز؛ متجرنا متخصص في المباخر الفاخرة.',
    composer_input: { grounded_draft: 'هذا ليس من منتجات كالابريز؛ متجرنا متخصص في المباخر الفاخرة.' },
  };
  const validator = nodes.get('Validate Natural Response Composition');
  assert.ok(validator, 'Validate Natural Response Composition must exist');
  const code = validator.parameters.jsCode;
  const $ = () => ({ first: () => ({ json: source }) });
  const result = new Function('$', '$input', code)($, {
    first: () => ({ json: { output: {
      reply: 'أظن صار فيه لخبطة؛ إحنا كالابريز للمباخر الفاخرة وما نحسب تذاكر سفر. أقدر أطلع لك الموجود وأسعاره.',
      confidence: 0.96,
      grounded: true,
    } } }),
  })[0].json;

  assert.equal(result.send_ready, true);
  assert.equal(result.decision_kind, 'out_of_scope');
  assert.match(result.reply_text, /تذاكر سفر/);
  assert.equal(result.composer_status, 'accepted');
});

test('an invalid or commercially invented composition falls back to the original grounded draft', () => {
  const source = {
    context: { customer_text: 'بكم المبخرة؟', conversation_id: 77 },
    recent_context: [],
    decision_kind: 'faq',
    send_ready: true,
    reply_text: 'المبخرة البيضاء سعرها 390 ريال.',
    composer_input: { grounded_draft: 'المبخرة البيضاء سعرها 390 ريال.' },
  };
  const validator = nodes.get('Validate Natural Response Composition');
  assert.ok(validator, 'Validate Natural Response Composition must exist');
  const code = validator.parameters.jsCode;
  const $ = () => ({ first: () => ({ json: source }) });
  const result = new Function('$', '$input', code)($, {
    first: () => ({ json: { output: {
      reply: 'أكيد، سعرها 250 ريال ومتوفر منها 20 قطعة.',
      confidence: 0.99,
      grounded: true,
    } } }),
  })[0].json;

  assert.equal(result.reply_text, 'المبخرة البيضاء سعرها 390 ريال.');
  assert.equal(result.composer_status, 'rejected_untrusted_numbers');
});

test('the classifier loops once into the existing decision switch and human confirmation reaches send checks', () => {
  assert.deepEqual(targets('Governed Customer Scope Router'), ['Route Customer Service Decision']);
  assert.deepEqual(targets('Humanize Text'), ['Route Customer Service Decision']);
  assert.deepEqual(targets('Validate Escalation and Build Finalize'), ['Prepare Natural Response Composition']);
  assert.equal(workflow.nodes.length, 107);

  const incoming = [];
  for (const [source, connection] of Object.entries(workflow.connections)) {
    for (const [index, edges] of (connection.main || []).entries()) {
      for (const edge of edges || []) if (edge.node === 'Send Reply') incoming.push({ source, index });
    }
  }
  assert.deepEqual(incoming, [{ source: 'Customer Egress Authorized?', index: 0 }]);
});
