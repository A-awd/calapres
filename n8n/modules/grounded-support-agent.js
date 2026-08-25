'use strict';

function createGroundedSupportEngine(brandPack) {
  const classificationKeys = [
    'brand_id',
    'capability',
    'catalog_relation',
    'confidence',
    'intent',
    'knowledge_fact_id',
    'needs_human',
    'order_number',
    'product_search_terms',
    'reason_code',
    'requested_subject_ar',
    'schema_version',
  ];
  const classificationSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      schema_version: { type: 'string', enum: ['1.0'] },
      brand_id: { type: 'string', enum: [brandPack && brandPack.brand_id] },
      intent: { type: 'string', enum: brandPack && brandPack.policy && brandPack.policy.allowed_intents },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      catalog_relation: {
        type: 'string',
        enum: ['exact_category', 'possible_product', 'outside_catalog', 'not_applicable', 'unknown'],
      },
      requested_subject_ar: { type: ['string', 'null'], maxLength: 60 },
      knowledge_fact_id: { type: ['string', 'null'] },
      capability: { type: ['string', 'null'] },
      product_search_terms: {
        type: 'array',
        maxItems: 6,
        items: { type: 'string', minLength: 1, maxLength: 24 },
      },
      order_number: { type: ['string', 'null'], pattern: '^[0-9]{4,20}$' },
      needs_human: { type: 'boolean' },
      reason_code: { type: 'string', minLength: 2, maxLength: 80 },
    },
    required: [
      'schema_version',
      'brand_id',
      'intent',
      'confidence',
      'catalog_relation',
      'requested_subject_ar',
      'knowledge_fact_id',
      'capability',
      'product_search_terms',
      'order_number',
      'needs_human',
      'reason_code',
    ],
  };

  function fail(code) {
    throw new Error(code);
  }

  function exactKeys(value, expected) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
  }

  function validatePack(pack) {
    if (
      !pack
      || pack.schema_version !== '1.0'
      || typeof pack.brand_id !== 'string'
      || typeof pack.version !== 'string'
      || !['candidate_offline', 'live_owner_test'].includes(pack.status)
      || !pack.identity
      || typeof pack.identity.display_name_ar !== 'string'
      || typeof pack.identity.business_summary_ar !== 'string'
      || !pack.catalog
      || pack.catalog.source !== 'shopify'
      || !Array.isArray(pack.catalog.allowed_categories_ar)
      || pack.catalog.allowed_categories_ar.length === 0
      || typeof pack.catalog.shopify_filter !== 'string'
      || !Number.isInteger(pack.catalog.search_limit)
      || pack.catalog.search_limit < 1
      || pack.catalog.search_limit > 20
      || !Number.isInteger(pack.catalog.fallback_limit)
      || pack.catalog.fallback_limit < 1
      || pack.catalog.fallback_limit > 10
      || !Array.isArray(pack.knowledge)
      || !pack.policy
      || !Array.isArray(pack.policy.allowed_intents)
      || !Array.isArray(pack.policy.allowed_capabilities)
      || !Array.isArray(pack.policy.external_information_tools)
      || pack.policy.external_information_tools.length !== 0
      || !pack.replies
    ) {
      fail('brand_pack_invalid');
    }
    const facts = new Set();
    for (const fact of pack.knowledge) {
      if (
        !fact
        || typeof fact.fact_id !== 'string'
        || fact.authority !== 'approved_reply'
        || !Array.isArray(fact.intents)
        || fact.intents.length === 0
        || fact.intents.some((intent) => !pack.policy.allowed_intents.includes(intent))
        || typeof fact.response_ar !== 'string'
        || facts.has(fact.fact_id)
      ) {
        fail('brand_pack_knowledge_invalid');
      }
      facts.add(fact.fact_id);
    }
  }

  validatePack(brandPack);
  const knowledgeById = new Map(brandPack.knowledge.map((fact) => [fact.fact_id, fact]));

  function sanitizeSubject(value) {
    if (typeof value !== 'string') {
      return null;
    }
    const cleaned = value
      .normalize('NFKC')
      .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/gu, '')
      .replace(/[^\p{L}\p{N} .-]+/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, 60);
    return cleaned.length >= 2 ? cleaned : null;
  }

  function sanitizeSearchTerm(value) {
    if (typeof value !== 'string') {
      return null;
    }
    const cleaned = value
      .normalize('NFKC')
      .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/gu, '')
      .replace(/[^\p{L}\p{N}-]+/gu, '')
      .slice(0, 24);
    return cleaned.length > 0 ? cleaned : null;
  }

  function sanitizeContext(rows) {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.slice(-6).flatMap((row) => {
      if (!row || !['incoming', 'outgoing'].includes(row.direction) || typeof row.content !== 'string') {
        return [];
      }
      const content = row.content.replace(/\s+/gu, ' ').trim().slice(0, 350);
      return content ? [{ direction: row.direction, content }] : [];
    });
  }

  function buildClassifierInput(input) {
    const message = input && typeof input.customer_message === 'string'
      ? input.customer_message.replace(/\s+/gu, ' ').trim().slice(0, 1000)
      : '';
    if (!message) {
      fail('customer_message_invalid');
    }
    return {
      task: 'classify_customer_message_only',
      customer_message: message,
      recent_context: sanitizeContext(input.recent_context),
      brand: {
        brand_id: brandPack.brand_id,
        display_name_ar: brandPack.identity.display_name_ar,
        business_summary_ar: brandPack.identity.business_summary_ar,
        allowed_categories_ar: [...brandPack.catalog.allowed_categories_ar],
        approved_facts: brandPack.knowledge.map((fact) => ({
          fact_id: fact.fact_id,
          intents: [...fact.intents],
          response_ar: fact.response_ar,
        })),
      },
      allowed_intents: [...brandPack.policy.allowed_intents],
      allowed_capabilities: [...brandPack.policy.allowed_capabilities],
      external_information_tools: [],
      rules: [
        'Do not answer the customer.',
        'Classify meaning, not keywords.',
        'Use product_search only for a plausible product in this brand catalog.',
        'Use out_of_scope for weather, news, general advice, other merchants, and products outside the catalog.',
        'Never invent a fact, product, price, policy, or capability.',
        'Return only the strict schema.',
      ],
      output_schema: classificationSchema,
    };
  }

  function validateClassification(value) {
    if (!exactKeys(value, classificationKeys)) {
      fail('classifier_schema_invalid');
    }
    if (value.schema_version !== '1.0') {
      fail('classifier_schema_version_invalid');
    }
    if (value.brand_id !== brandPack.brand_id) {
      fail('classifier_brand_mismatch');
    }
    if (!brandPack.policy.allowed_intents.includes(value.intent)) {
      fail('classifier_intent_invalid');
    }
    if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) {
      fail('classifier_confidence_invalid');
    }
    if (!['exact_category', 'possible_product', 'outside_catalog', 'not_applicable', 'unknown'].includes(value.catalog_relation)) {
      fail('classifier_catalog_relation_invalid');
    }
    if (value.capability !== null && !brandPack.policy.allowed_capabilities.includes(value.capability)) {
      fail('classifier_capability_invalid');
    }
    if (!Array.isArray(value.product_search_terms) || value.product_search_terms.length > 6) {
      fail('classifier_product_terms_invalid');
    }
    if (value.order_number !== null && !/^[0-9]{4,20}$/u.test(value.order_number)) {
      fail('classifier_order_number_invalid');
    }
    if (typeof value.needs_human !== 'boolean' || typeof value.reason_code !== 'string') {
      fail('classifier_fields_invalid');
    }
  }

  function baseDecision(value) {
    return {
      schema_version: '1.0',
      brand_id: brandPack.brand_id,
      knowledge_version: brandPack.version,
      intent: value.intent,
      confidence: value.confidence,
      reason_code: value.reason_code,
      route: 'uncertain',
      capability: null,
      tool_allowed: false,
      model_allowed: false,
      order_number: null,
      product_search_terms: [],
      requested_subject_ar: sanitizeSubject(value.requested_subject_ar),
      suppress_reply: false,
      send_ready: true,
      reply_text: brandPack.replies.clarification_ar,
    };
  }

  function interpretClassification(value, state = {}) {
    validateClassification(value);
    const decision = baseDecision(value);
    if (value.needs_human || value.intent === 'human_request') {
      return {
        ...decision,
        route: 'handoff',
        send_ready: false,
        reply_text: brandPack.replies.handoff_ar,
      };
    }
    if (value.intent === 'out_of_scope' || value.catalog_relation === 'outside_catalog') {
      if (state.scope_notice_sent === true) {
        return { ...decision, route: 'out_of_scope', suppress_reply: true, send_ready: false, reply_text: null };
      }
      const subject = decision.requested_subject_ar || 'شيء خارج نطاق المتجر';
      const category = brandPack.catalog.allowed_categories_ar[0];
      return {
        ...decision,
        route: 'out_of_scope',
        reply_text: `يبدو أنك تبحث عن ${subject}. هذا ليس من منتجات ${brandPack.identity.display_name_ar}؛ متجرنا متخصص في ${category}. أقدر أعرض لك المنتجات والأسعار الموجودة في المتجر.`,
      };
    }
    if (value.intent === 'product_search') {
      if (
        value.capability !== 'product_search'
        || !['exact_category', 'possible_product'].includes(value.catalog_relation)
      ) {
        fail('classifier_product_authorization_invalid');
      }
      const terms = [...new Set(value.product_search_terms.map(sanitizeSearchTerm).filter(Boolean))].slice(0, 6);
      return {
        ...decision,
        route: 'dynamic_read',
        capability: 'product_search',
        tool_allowed: true,
        send_ready: false,
        reply_text: null,
        product_search_terms: terms,
      };
    }
    if (['order_status', 'order_change_request'].includes(value.intent)) {
      if (value.capability !== 'order_status') {
        fail('classifier_order_authorization_invalid');
      }
      return {
        ...decision,
        route: 'dynamic_read',
        capability: 'order_status',
        tool_allowed: true,
        send_ready: false,
        reply_text: null,
        order_number: value.order_number,
      };
    }
    if (value.intent === 'greeting') {
      return { ...decision, route: 'fixed_reply', reply_text: brandPack.replies.greeting_ar };
    }
    if (value.knowledge_fact_id !== null) {
      const fact = knowledgeById.get(value.knowledge_fact_id);
      if (!fact) {
        fail('classifier_knowledge_fact_invalid');
      }
      if (!fact.intents.includes(value.intent)) {
        fail('classifier_knowledge_intent_mismatch');
      }
      return { ...decision, route: 'fixed_reply', reply_text: fact.response_ar };
    }
    if (value.intent === 'brand_info') {
      const fact = knowledgeById.get('brand.identity');
      return { ...decision, route: 'fixed_reply', reply_text: fact.response_ar };
    }
    if (value.intent === 'how_to_order') {
      const fact = knowledgeById.get('order.how_to_order');
      return { ...decision, route: 'fixed_reply', reply_text: fact.response_ar };
    }
    return decision;
  }

  function buildShopifyProductRequest(decision) {
    if (
      !decision
      || decision.brand_id !== brandPack.brand_id
      || decision.route !== 'dynamic_read'
      || decision.capability !== 'product_search'
      || decision.tool_allowed !== true
    ) {
      fail('shopify_product_request_unauthorized');
    }
    const terms = decision.product_search_terms.map(sanitizeSearchTerm).filter(Boolean);
    const suffix = terms.length > 0 ? ` AND ${terms.map((term) => `title:${term}*`).join(' AND ')}` : '';
    const searchLimit = brandPack.catalog.search_limit;
    const fallbackLimit = brandPack.catalog.fallback_limit;
    const query = `query GroundedProductSearch($search: String!, $catalog: String!) { matches: products(first: ${searchLimit}, query: $search) { nodes { title status totalInventory onlineStoreUrl priceRangeV2 { minVariantPrice { amount currencyCode } } } } catalog: products(first: ${fallbackLimit}, query: $catalog, sortKey: TITLE) { nodes { title status totalInventory onlineStoreUrl priceRangeV2 { minVariantPrice { amount currencyCode } } } } }`;
    return {
      query,
      variables: {
        search: `${brandPack.catalog.shopify_filter}${suffix}`,
        catalog: brandPack.catalog.shopify_filter,
      },
    };
  }

  function productRows(value) {
    if (!value || !Array.isArray(value.nodes)) {
      return [];
    }
    return value.nodes.flatMap((product) => {
      const money = product && product.priceRangeV2 && product.priceRangeV2.minVariantPrice;
      const amount = money && money.currencyCode === 'SAR' ? Number(money.amount) : NaN;
      if (
        !product
        || product.status !== 'ACTIVE'
        || typeof product.title !== 'string'
        || !/^[\p{L}\p{N}A-Za-z .,()—-]{2,100}$/u.test(product.title)
        || !Number.isFinite(amount)
        || amount <= 0
      ) {
        return [];
      }
      return [{ title: product.title, amount }];
    });
  }

  function renderShopifyProductReply(decision, response) {
    if (
      !decision
      || decision.brand_id !== brandPack.brand_id
      || decision.capability !== 'product_search'
      || decision.tool_allowed !== true
    ) {
      fail('shopify_product_reply_unauthorized');
    }
    const body = response && response.body && typeof response.body === 'object' ? response.body : {};
    if (response.statusCode !== 200 || (Array.isArray(body.errors) && body.errors.length > 0)) {
      return {
        ...decision,
        route: 'uncertain',
        send_ready: true,
        tool_allowed: false,
        capability: null,
        reply_text: 'ما قدرت أقرأ منتجات المتجر الآن. جرّب مرة ثانية بعد قليل.',
      };
    }
    const data = body.data && typeof body.data === 'object' ? body.data : {};
    const matches = productRows(data.matches).slice(0, brandPack.catalog.fallback_limit);
    const catalog = productRows(data.catalog).slice(0, brandPack.catalog.fallback_limit);
    const format = (row) => `${row.title} — ${Number.isInteger(row.amount) ? row.amount : row.amount.toFixed(2)} ريال`;
    if (matches.length > 0) {
      return {
        ...decision,
        route: 'fixed_reply',
        send_ready: true,
        tool_allowed: false,
        capability: null,
        reply_text: `لقيت في المتجر الآن: ${matches.map(format).join('، ')}.`,
      };
    }
    if (catalog.length > 0) {
      const subject = decision.requested_subject_ar || 'هذا الوصف';
      return {
        ...decision,
        route: 'fixed_reply',
        send_ready: true,
        tool_allowed: false,
        capability: null,
        reply_text: `ما لقيت ${subject} في متجر ${brandPack.identity.display_name_ar}. الموجود في المتجر الآن: ${catalog.map(format).join('، ')}.`,
      };
    }
    return {
      ...decision,
      route: 'uncertain',
      send_ready: true,
      tool_allowed: false,
      capability: null,
      reply_text: brandPack.replies.product_not_found_ar,
    };
  }

  return {
    buildClassifierInput,
    buildShopifyProductRequest,
    classificationSchema,
    factorySource: createGroundedSupportEngine.toString(),
    interpretClassification,
    renderShopifyProductReply,
  };
}

module.exports = {
  createGroundedSupportEngine,
};
