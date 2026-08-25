'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createGroundedSupportEngine,
} = require('../../modules/grounded-support-agent');

const brandPack = {
  schema_version: '1.0',
  brand_id: 'calapres',
  version: '2026-08-25-v1-candidate',
  status: 'candidate_offline',
  identity: {
    display_name_ar: 'كالابريز',
    business_summary_ar: 'متجر سعودي إلكتروني متخصص في المباخر الفاخرة',
  },
  catalog: {
    source: 'shopify',
    allowed_categories_ar: ['المباخر الفاخرة'],
    shopify_filter: 'status:ACTIVE AND vendor:"كالابريز" AND product_type:"مباخر"',
    search_limit: 10,
    fallback_limit: 5,
  },
  knowledge: [
    {
      fact_id: 'brand.identity',
      authority: 'approved_reply',
      intents: ['brand_info'],
      response_ar: 'كالابريز متجر سعودي إلكتروني متخصص في المباخر الفاخرة.',
    },
    {
      fact_id: 'product.engraving',
      authority: 'approved_reply',
      intents: ['product_question'],
      response_ar: 'يتوفر حفر اسم أو شعار حسب الخيار الموضح في المنتج.',
    },
    {
      fact_id: 'order.how_to_order',
      authority: 'approved_reply',
      intents: ['how_to_order'],
      response_ar: 'تقدر تضيف المنتج للسلة وتكمل خطوات الطلب من المتجر.',
    },
  ],
  policy: {
    allowed_intents: [
      'greeting',
      'brand_info',
      'product_search',
      'product_question',
      'order_status',
      'order_change_request',
      'how_to_order',
      'human_request',
      'out_of_scope',
      'unclear',
    ],
    allowed_capabilities: ['product_search', 'order_status'],
    external_information_tools: [],
  },
  replies: {
    greeting_ar: 'هلا بك في كالابريز! كيف أقدر أخدمك؟',
    clarification_ar: 'وش حاب تعرف عن منتجات كالابريز أو طلبك؟',
    handoff_ar: 'أكيد، بحوّل طلبك لفريق خدمة العملاء.',
    product_not_found_ar: 'ما لقيت وصفًا مطابقًا في متجر كالابريز.',
  },
};

function classification(overrides = {}) {
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

function shopifyProduct(title, amount, inventory = 0) {
  return {
    title,
    status: 'ACTIVE',
    totalInventory: inventory,
    onlineStoreUrl: `https://calapres.com/products/${encodeURIComponent(title)}`,
    priceRangeV2: {
      minVariantPrice: { amount: String(amount), currencyCode: 'SAR' },
    },
  };
}

test('out-of-catalog purchase intent becomes a grounded store redirect without any tool', () => {
  const engine = createGroundedSupportEngine(brandPack);
  const decision = engine.interpretClassification(classification(), { scope_notice_sent: false });

  assert.equal(decision.route, 'out_of_scope');
  assert.equal(decision.tool_allowed, false);
  assert.equal(decision.capability, null);
  assert.equal(decision.reply_text,
    'يبدو أنك تبحث عن سيارة. هذا ليس من منتجات كالابريز؛ متجرنا متخصص في المباخر الفاخرة. أقدر أعرض لك المنتجات والأسعار الموجودة في المتجر.');
});

test('external information requests never receive an external-answer capability', () => {
  const engine = createGroundedSupportEngine(brandPack);
  const decision = engine.interpretClassification(classification({
    requested_subject_ar: 'طقس لندن',
    reason_code: 'external_information',
  }), { scope_notice_sent: false });

  assert.equal(decision.route, 'out_of_scope');
  assert.equal(decision.tool_allowed, false);
  assert.equal(decision.reply_text.includes('درجة'), false);
  assert.equal(decision.reply_text.includes('طقس لندن'), true);
});

test('a product request authorizes only a bounded Shopify product search', () => {
  const engine = createGroundedSupportEngine(brandPack);
  const decision = engine.interpretClassification(classification({
    intent: 'product_search',
    catalog_relation: 'possible_product',
    requested_subject_ar: 'المبخرة الخضراء المخططة بالبرتقالي',
    capability: 'product_search',
    product_search_terms: ['أخضر', 'برتقالي'],
    reason_code: 'shopify_product_search_required',
  }), { scope_notice_sent: false });
  const request = engine.buildShopifyProductRequest(decision);

  assert.equal(decision.route, 'dynamic_read');
  assert.equal(decision.tool_allowed, true);
  assert.equal(decision.capability, 'product_search');
  assert.equal(request.variables.search,
    'status:ACTIVE AND vendor:"كالابريز" AND product_type:"مباخر" AND title:أخضر* AND title:برتقالي*');
  assert.equal(request.variables.catalog,
    'status:ACTIVE AND vendor:"كالابريز" AND product_type:"مباخر"');
  assert.equal(request.query.includes('matches: products(first: 10'), true);
  assert.equal(request.query.includes('catalog: products(first: 5'), true);
  assert.equal(request.query.includes('after:'), false);
});

test('a missing described product is answered from live Shopify alternatives without claiming stock', () => {
  const engine = createGroundedSupportEngine(brandPack);
  const decision = engine.interpretClassification(classification({
    intent: 'product_search',
    catalog_relation: 'possible_product',
    requested_subject_ar: 'المبخرة الخضراء المخططة بالبرتقالي',
    capability: 'product_search',
    product_search_terms: ['أخضر', 'برتقالي'],
    reason_code: 'shopify_product_search_required',
  }), { scope_notice_sent: false });
  const reply = engine.renderShopifyProductReply(decision, {
    statusCode: 200,
    body: {
      data: {
        matches: { nodes: [] },
        catalog: {
          nodes: [
            shopifyProduct('مبخرة كالابريز الفاخرة — الأبيض', 390),
            shopifyProduct('مبخرة كالابريز الفاخرة — البيج', 390),
            shopifyProduct('مبخرة كالابريز الفاخرة — الرمادي', 390),
          ],
        },
      },
    },
  });

  assert.equal(reply.send_ready, true);
  assert.equal(reply.reply_text,
    'ما لقيت المبخرة الخضراء المخططة بالبرتقالي في متجر كالابريز. الموجود في المتجر الآن: مبخرة كالابريز الفاخرة — الأبيض — 390 ريال، مبخرة كالابريز الفاخرة — البيج — 390 ريال، مبخرة كالابريز الفاخرة — الرمادي — 390 ريال.');
  assert.equal(reply.reply_text.includes('متوفر'), false);
  assert.equal(reply.reply_text.includes('متاحة'), false);
});

test('classifier output with extra fields or a cross-brand identity fails closed', () => {
  const engine = createGroundedSupportEngine(brandPack);

  assert.throws(() => engine.interpretClassification(classification({ injected: 'weather' }), {}),
    /classifier_schema_invalid/);
  assert.throws(() => engine.interpretClassification(classification({ brand_id: 'other-brand' }), {}),
    /classifier_brand_mismatch/);
});

test('a model cannot authorize an unknown capability even with high confidence', () => {
  const engine = createGroundedSupportEngine(brandPack);
  assert.throws(() => engine.interpretClassification(classification({
    intent: 'product_search',
    catalog_relation: 'possible_product',
    capability: 'web_search',
    product_search_terms: ['سيارة'],
    reason_code: 'shopify_product_search_required',
  }), {}), /classifier_capability_invalid/);
});

test('cancellation and return requests can inspect an order but never authorize a Shopify write', () => {
  const engine = createGroundedSupportEngine(brandPack);
  const decision = engine.interpretClassification(classification({
    intent: 'order_change_request',
    catalog_relation: 'not_applicable',
    requested_subject_ar: 'إلغاء الطلب',
    capability: 'order_status',
    order_number: '1234',
    reason_code: 'owner_review_after_order_read',
  }), {});

  assert.equal(decision.route, 'dynamic_read');
  assert.equal(decision.capability, 'order_status');
  assert.equal(decision.order_number, '1234');
  assert.equal(decision.tool_allowed, true);
  assert.equal(JSON.stringify(decision).includes('write'), false);
});

test('approved static knowledge is selected only when its intent matches the classifier intent', () => {
  const engine = createGroundedSupportEngine(brandPack);
  const accepted = engine.interpretClassification(classification({
    intent: 'product_question',
    catalog_relation: 'exact_category',
    requested_subject_ar: 'حفر الاسم',
    knowledge_fact_id: 'product.engraving',
    reason_code: 'approved_knowledge',
  }), {});
  assert.equal(accepted.route, 'fixed_reply');
  assert.equal(accepted.reply_text, 'يتوفر حفر اسم أو شعار حسب الخيار الموضح في المنتج.');

  assert.throws(() => engine.interpretClassification(classification({
    intent: 'brand_info',
    catalog_relation: 'not_applicable',
    requested_subject_ar: 'كالابريز',
    knowledge_fact_id: 'product.engraving',
    reason_code: 'approved_knowledge',
  }), {}), /classifier_knowledge_intent_mismatch/);
});

test('the classifier prompt carries the brand pack and exact output contract but no external tools', () => {
  const engine = createGroundedSupportEngine(brandPack);
  const input = engine.buildClassifierInput({
    customer_message: 'أبغى أشتري سيارة',
    recent_context: [{ direction: 'incoming', content: 'السلام عليكم' }],
  });

  assert.equal(input.customer_message, 'أبغى أشتري سيارة');
  assert.deepEqual(input.brand.allowed_categories_ar, ['المباخر الفاخرة']);
  assert.deepEqual(input.allowed_capabilities, ['product_search', 'order_status']);
  assert.deepEqual(input.external_information_tools, []);
  assert.equal(input.output_schema.additionalProperties, false);
  assert.equal(input.output_schema.required.length, 12);
});

test('product search remains bounded when the real store grows to thousands of products', () => {
  const engine = createGroundedSupportEngine(brandPack);
  const decision = engine.interpretClassification(classification({
    intent: 'product_search',
    catalog_relation: 'possible_product',
    requested_subject_ar: 'مبخرة بيضاء',
    capability: 'product_search',
    product_search_terms: ['أبيض'],
    reason_code: 'shopify_product_search_required',
  }), {});
  const request = engine.buildShopifyProductRequest(decision);

  assert.equal(request.query.includes('first: 10'), true);
  assert.equal(request.query.includes('first: 5'), true);
  assert.equal(JSON.stringify(request).includes('5000'), false);
});

test('a repeated out-of-scope notice is suppressed while the store remains available', () => {
  const engine = createGroundedSupportEngine(brandPack);
  const decision = engine.interpretClassification(classification({
    requested_subject_ar: 'طقس لندن',
    reason_code: 'external_information',
  }), { scope_notice_sent: true });

  assert.equal(decision.route, 'out_of_scope');
  assert.equal(decision.suppress_reply, true);
  assert.equal(decision.send_ready, false);
  assert.equal(decision.reply_text, null);
});
