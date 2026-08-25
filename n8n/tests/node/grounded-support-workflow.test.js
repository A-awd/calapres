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

test('the OpenAI call is a low-randomness strict classifier with no external tools', () => {
  const brain = nodes.get('Calapres Brain');
  const model = nodes.get('OpenAI Calapres Restricted Model');
  const textOption = model.parameters.options.textFormat.textOptions;

  assert.match(brain.parameters.options.systemMessage, /صنّف المعنى فقط/);
  assert.match(brain.parameters.options.systemMessage, /لا تكتب ردًا للعميل/);
  assert.equal(model.parameters.responsesApiEnabled, true);
  assert.equal(model.parameters.options.temperature, 0);
  assert.equal(model.parameters.options.reasoningEffort, 'low');
  assert.equal(textOption.type, 'json_schema');
  assert.equal(textOption.strict, true);
  assert.equal(textOption.schema.additionalProperties, false);
  assert.equal(model.parameters.builtInTools, undefined);
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

test('the classifier loops once into the existing decision switch and human confirmation reaches send checks', () => {
  assert.deepEqual(targets('Governed Customer Scope Router'), ['Route Customer Service Decision']);
  assert.deepEqual(targets('Humanize Text'), ['Route Customer Service Decision']);
  assert.deepEqual(targets('Validate Escalation and Build Finalize'), ['Pre-Send Continuation']);
  assert.equal(workflow.nodes.length, 100);

  const incoming = [];
  for (const [source, connection] of Object.entries(workflow.connections)) {
    for (const [index, edges] of (connection.main || []).entries()) {
      for (const edge of edges || []) if (edge.node === 'Send Reply') incoming.push({ source, index });
    }
  }
  assert.deepEqual(incoming, [{ source: 'Customer Egress Authorized?', index: 0 }]);
});
