'use strict';

function createGovernedResponder(release) {
  const requiredResponseIds = [
    'scope.store-redirect',
    'greeting.welcome',
    'brand.introduction',
    'brand.assistant-identity',
    'product.scope-burners',
    'product.engraving',
    'order.how-to-order',
    'clarification.store-topic',
    'handoff.human-request',
    'handoff.attachment',
    'dynamic.product-catalog',
    'dynamic.order-status',
    'shipping.regions-conflict',
  ];
  const dynamicResponseIds = new Set(['dynamic.product-catalog', 'dynamic.order-status']);
  const staticResponseModes = {
    'scope.store-redirect': 'boundary',
    'greeting.welcome': 'static',
    'brand.introduction': 'static',
    'brand.assistant-identity': 'static',
    'product.scope-burners': 'static',
    'product.engraving': 'static',
    'order.how-to-order': 'static',
    'clarification.store-topic': 'boundary',
    'handoff.human-request': 'handoff',
    'handoff.attachment': 'handoff',
  };
  const decisionKeys = [
    'brand_id',
    'decision_kind',
    'dynamic_read',
    'knowledge_version',
    'model_allowed',
    'order_number',
    'reason_code',
    'response_id',
    'route',
    'schema_version',
    'suppress_reply',
    'tool_allowed',
  ];
  const renderContracts = {
    'scope.store-redirect': {
      route: 'out_of_scope',
      decision_kind: 'out_of_scope',
      reasons: ['outside_store_scope', 'scope_notice_already_sent'],
    },
    'greeting.welcome': {
      route: 'fixed_reply',
      decision_kind: 'greeting',
      reasons: ['greeting'],
    },
    'brand.introduction': {
      route: 'fixed_reply',
      decision_kind: 'faq',
      reasons: ['brand_introduction'],
    },
    'brand.assistant-identity': {
      route: 'fixed_reply',
      decision_kind: 'faq',
      reasons: ['assistant_identity'],
    },
    'product.scope-burners': {
      route: 'fixed_reply',
      decision_kind: 'faq',
      reasons: ['product_scope'],
    },
    'product.engraving': {
      route: 'fixed_reply',
      decision_kind: 'faq',
      reasons: ['engraving'],
    },
    'order.how-to-order': {
      route: 'fixed_reply',
      decision_kind: 'order',
      reasons: ['how_to_order'],
    },
    'clarification.store-topic': {
      route: 'uncertain',
      decision_kind: 'clarification',
      reasons: ['store_topic_unclear'],
    },
    'handoff.human-request': {
      route: 'handoff',
      decision_kind: 'clarification',
      reasons: ['human_requested'],
    },
    'handoff.attachment': {
      route: 'handoff',
      decision_kind: 'clarification',
      reasons: ['unsupported_content_kind'],
    },
    'dynamic.product-catalog': {
      route: 'dynamic_read',
      decision_kind: 'faq',
      reasons: ['shopify_product_catalog_required'],
      capability: 'product_catalog',
    },
    'dynamic.order-status': {
      route: 'dynamic_read',
      decision_kind: 'order',
      reasons: ['shopify_order_status_required'],
      capability: 'order_status',
    },
  };

  function fail(message) {
    throw new Error(message);
  }

  function normalize(value) {
    if (typeof value !== 'string') {
      return '';
    }
    return value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/gu, '')
      .replace(/[أإآ]/gu, 'ا')
      .replace(/ة/gu, 'ه')
      .replace(/[٠-٩۰-۹]/gu, (digit) => {
        const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
        const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
        const arabicIndex = arabicDigits.indexOf(digit);
        return String(arabicIndex >= 0 ? arabicIndex : persianDigits.indexOf(digit));
      })
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  function includesAny(value, patterns) {
    return patterns.some((pattern) => pattern.test(value));
  }

  function parseAuthorizationText(value) {
    if (typeof value !== 'string') {
      return { invalid: false, clauses: [] };
    }
    if (value.includes('|')) {
      return { invalid: true, clauses: [] };
    }
    let separated = value
      .normalize('NFC')
      .toLowerCase()
      .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/gu, '')
      .replace(/[أإآ]/gu, 'ا')
      .replace(/ة/gu, 'ه')
      .replace(/[٠-٩۰-۹]/gu, (digit) => {
        const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
        const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
        const arabicIndex = arabicDigits.indexOf(digit);
        return String(arabicIndex >= 0 ? arabicIndex : persianDigits.indexOf(digit));
      })
      .replace(/[,.!?؟،؛;:]+/gu, ' | ')
      .replace(/\b(?:and +then|then|and)\b/gu, ' | ')
      .replace(/(?:^| )(?:ثم|وبعدها|وبعدين)(?: |$)/gu, ' | ')
      .replace(/ +و(?=(?:كم|وش|وين|اين|حاله|تتبع|اعرض|وريني) )/gu, ' | ');
    const categoryCheck = separated.replace(/[|#]/gu, '');
    if (/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{M}\p{Zl}\p{Zp}\p{S}]/u.test(categoryCheck)) {
      return { invalid: true, clauses: [] };
    }
    if (/#(?![0-9]{4,20}(?=$|[ |]))/u.test(separated)) {
      return { invalid: true, clauses: [] };
    }
    separated = separated.replace(/#([0-9]{4,20})(?=$|[ |])/gu, '$1');
    if (/[^\p{L}0-9 |]/u.test(separated)) {
      return { invalid: true, clauses: [] };
    }
    separated = separated.replace(/ +/gu, ' ').trim();
    return {
      invalid: false,
      clauses: separated
        .split('|')
        .map((clause) => clause.trim())
        .filter((clause) => clause.length > 0),
    };
  }

  function hasExactKeys(value, expectedKeys) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const actualKeys = Object.keys(value).sort();
    if (actualKeys.length !== expectedKeys.length) {
      return false;
    }
    return expectedKeys.every((key, index) => actualKeys[index] === key);
  }

  function validateRelease(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail('release must be an object with response_id entries');
    }
    if (value.brand_id !== 'calapres' || value.version !== '2026-08-25-v4-candidate') {
      fail('release identity is invalid');
    }
    if (value.status !== 'candidate_offline' || !Array.isArray(value.entries) || value.entries.length === 0) {
      fail('release must contain response_id entries');
    }
    const seen = new Set();
    for (const entry of value.entries) {
      if (!entry || typeof entry.response_id !== 'string' || entry.response_id.length === 0) {
        fail('every release entry requires response_id');
      }
      if (!requiredResponseIds.includes(entry.response_id)) {
        fail(`unexpected response_id: ${entry.response_id}`);
      }
      if (seen.has(entry.response_id)) {
        fail(`duplicate response_id: ${entry.response_id}`);
      }
      if (
        entry.knowledge_id !== entry.response_id
        || typeof entry.source_ref !== 'string'
        || entry.source_ref.length === 0
        || typeof entry.reviewed_at !== 'string'
        || !/^\d{4}-\d{2}-\d{2}$/u.test(entry.reviewed_at)
        || !Array.isArray(entry.supported_intents)
        || entry.supported_intents.length === 0
      ) {
        fail(`invalid response_id metadata: ${entry.response_id}`);
      }
      if (
        entry.authority === 'approved_reply'
        && (typeof entry.customer_response_ar !== 'string' || entry.customer_response_ar.length === 0)
      ) {
        fail(`customer_response_ar is required for response_id: ${entry.response_id}`);
      }
      if (dynamicResponseIds.has(entry.response_id)) {
        if (
          entry.fact_mode !== 'live_shopify'
          || entry.authority !== 'live_read_required'
          || entry.source_ref !== 'shopify'
          || Object.prototype.hasOwnProperty.call(entry, 'customer_response_ar')
        ) {
          fail(`Shopify dynamic response_id is invalid: ${entry.response_id}`);
        }
      }
      if (Object.prototype.hasOwnProperty.call(staticResponseModes, entry.response_id)) {
        if (
          entry.fact_mode !== staticResponseModes[entry.response_id]
          || entry.authority !== 'approved_reply'
        ) {
          fail(`unsupported authority/fact_mode for approved_reply response_id: ${entry.response_id}`);
        }
      }
      if (entry.response_id === 'shipping.regions-conflict') {
        if (
          entry.fact_mode !== 'static'
          || entry.authority !== 'owner_required'
          || Object.prototype.hasOwnProperty.call(entry, 'customer_response_ar')
        ) {
          fail('shipping conflict fact_mode/authority must remain owner_required without customer_response_ar');
        }
      }
      seen.add(entry.response_id);
    }
    for (const responseId of requiredResponseIds) {
      if (!seen.has(responseId)) {
        fail(`missing required response_id: ${responseId}`);
      }
    }
  }

  validateRelease(release);
  const entriesById = new Map(release.entries.map((entry) => [entry.response_id, entry]));

  function extractOrderNumber(message) {
    const patterns = [
      /(?:رقم\s*(?:الطلب|الشحنه|التتبع)?|طلبي|طلب|الشحنه|تتبع)\s*(\d{4,20})(?:\s|$)/u,
      /(?:order(?:\s+(?:number|no|status))?|tracking)\s*(\d{4,20})(?:\s|$)/u,
      /(?:track\s+order)\s*(\d{4,20})(?:\s|$)/u,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  function decision({
    route,
    decisionKind,
    responseId,
    dynamicRead = null,
    orderNumber = null,
    suppressReply = false,
    reasonCode,
  }) {
    return {
      schema_version: '1.0',
      brand_id: 'calapres',
      route,
      decision_kind: decisionKind,
      response_id: responseId,
      dynamic_read: dynamicRead,
      order_number: orderNumber,
      model_allowed: false,
      tool_allowed: dynamicRead !== null,
      suppress_reply: suppressReply,
      reason_code: reasonCode,
      knowledge_version: release.version,
    };
  }

  function staticDecision(route, decisionKind, responseId, reasonCode, suppressReply = false) {
    return decision({ route, decisionKind, responseId, reasonCode, suppressReply });
  }

  function dynamicDecision(decisionKind, responseId, capability, orderNumber, reasonCode) {
    return decision({
      route: 'dynamic_read',
      decisionKind,
      responseId,
      dynamicRead: {
        provider: 'shopify',
        capability,
        response_id: responseId,
      },
      orderNumber,
      reasonCode,
    });
  }

  function decide(input) {
    const rawMessage = input && input.message;
    const message = normalize(rawMessage);
    const authorizationText = parseAuthorizationText(rawMessage);
    const contentKind = normalize(input && input.content_kind) || 'text';

    const humanRequest = includesAny(message, [
      /(?:ابي|ابغى|اريد|اود|ممكن)\s+.{0,24}(?:اكلم|اتكلم|اتواصل|تحول|حول)\s+.{0,16}(?:موظف|انسان|شخص|مسؤول|خدمه العملاء)/u,
      /(?:اكلم|اتكلم|اتواصل)\s+.{0,16}(?:موظف|انسان|شخص|مسؤول|خدمه العملاء)/u,
      /(?:speak|talk|connect|transfer)\s+.{0,24}(?:human|agent|representative|person)/u,
      /(?:human|live)\s+(?:agent|representative)/u,
    ]);
    if (humanRequest) {
      return staticDecision('handoff', 'clarification', 'handoff.human-request', 'human_requested');
    }

    if (contentKind !== 'text') {
      return staticDecision('handoff', 'clarification', 'handoff.attachment', 'unsupported_content_kind');
    }

    if (/^(?:السلام عليكم(?: ورحمه الله(?: وبركاته)?)?|وعليكم السلام|هلا(?: والله)?|مرحبا|اهلا|صباح الخير|مساء الخير|hello|hi|hey)$/u.test(message)) {
      return staticDecision('fixed_reply', 'greeting', 'greeting.welcome', 'greeting');
    }

    const explicitCalapresAnchor = authorizationText.clauses.some((clause) => (
      /(?:^|\s)(?:كالابريز|calapres)(?:\s|$)/u.test(clause)
    ));
    const promptInjection = includesAny(message, [
      /(?:ignore|disregard|forget|override|bypass)\s+.{0,32}(?:instructions|rules|prompt|policies|safety)/u,
      /(?:forget\s+everything\s+above|jailbreak\s+mode|system\s+prompt|change\s+your\s+role|reveal\s+secrets?)/u,
      /(?:تجاهل|انسى|لا\s+تتبع)\s+.{0,24}(?:تعليمات|قواعد|اوامر)/u,
      /(?:غير\s+دورك|اكشف\s+.{0,12}(?:الاسرار|التعليمات))/u,
    ]);
    const externalMerchantContext = includesAny(message, [
      /(?:^|\s)(?:order|product|burner|catalog)\b.{0,32}\b(?:on|from|at|via|with|for|sold\s+by|listed\s+by|hosted\s+by)\s+(?!(?:calapres|your|our|the)\s+store\b)[\p{L}\p{N}][\p{L}\p{N}-]*/u,
      /(?:^|\s)(?!(?:my|the|a|an|your|our|calapres|track|tracking|check|retrieve|find|show)\s)[a-z0-9-]+\s+(?:order|product|burner|catalog)\b/u,
      /(?:^|\s)(?:طلبي|الطلب|طلب|مبخره|منتج|كتالوج)(?![\p{L}\p{N}])\s+.{0,12}(?:في|من|على)\s+(?!(?:كالابريز|متجرنا|المتجر)(?![\p{L}\p{N}]))[\p{L}\p{N}-]+/u,
      /(?:^|\s)(?:طلبي|الطلب|طلب|مبخره|المبخره|منتج|كتالوج)(?![\p{L}\p{N}])\s+(?!(?:رقم|وين|وصل|حاله|تتبع|صار|عندكم|كالابريز|المتجر|الخضراء|خضراء|الرماديه|رماديه|البيضاء|بيضاء|البيج|بيج|السوداء|سوداء|البنيه|بنيه|الذهبيه|ذهبيه|الفضيه|فضيه|البرتقاليه|برتقاليه|المخططه|مخططه)(?![\p{L}\p{N}]))[\p{L}][\p{L}\p{N}-]*/u,
    ]);
    if (externalMerchantContext && !explicitCalapresAnchor) {
      if (input && input.scope_notice_sent === true) {
        return staticDecision(
          'out_of_scope',
          'out_of_scope',
          'scope.store-redirect',
          'scope_notice_already_sent',
          true,
        );
      }
      return staticDecision('out_of_scope', 'out_of_scope', 'scope.store-redirect', 'outside_store_scope');
    }

    const standaloneOrderPatterns = [
      /^وين\s+(?:وصل\s+)?طلبي(?:\s+رقم)?(?:\s+\d{4,20})?$/u,
      /^طلبي\s+\d{4,20}\s+وين\s+وصل$/u,
      /^(?:حاله|تتبع)\s+الطلب\s+\d{4,20}$/u,
      /^رقم\s+الشحنه\s+\d{4,20}$/u,
      /^وش\s+صار\s+على\s+طلب\s+\d{4,20}$/u,
      /^وش\s+حاله\s+طلبي(?:\s+رقم)?\s+\d{4,20}$/u,
      /^where\s+is\s+my\s+order(?:\s+number\s+\d{4,20}|\s+\d{4,20})?$/u,
      /^what\s+is\s+my\s+order\s+status(?:\s+\d{4,20})?$/u,
      /^track\s+my\s+order(?:\s+\d{4,20})?$/u,
      /^track\s+order\s+\d{4,20}$/u,
      /^order\s+number\s+\d{4,20}\s+status$/u,
    ];
    const standaloneProductPatterns = [
      /^(?:كم|وش)\s+سعر\s+المبخره$/u,
      /^(?:بكم|(?:كم|وش)\s+سعر)\s+(?:مبخره|المبخره)(?:\s+كالابريز)?(?:\s+(?:الخضراء|خضراء|الرماديه|رماديه|البيضاء|بيضاء|البيج|بيج|السوداء|سوداء|البنيه|بنيه|الذهبيه|ذهبيه|الفضيه|فضيه|البرتقاليه|برتقاليه|المخططه|مخططه|بالبرتقالي|بالبرتقاليه|بالاخضر|بالابيض|بالاسود|بالرمادي|بالبيج|بالبني|بالذهبي|بالفضي)){0,6}$/u,
      /^وش\s+المنتجات\s+الموجوده(?:\s+عندكم)?$/u,
      /^show\s+(?:me\s+)?your\s+catalog$/u,
      /^what\s+is\s+(?:the\s+burner\s+price|the\s+price\s+of\s+the\s+burner)$/u,
      /^are\s+your\s+burners\s+available$/u,
      /^what\s+colors\s+are\s+your\s+burners$/u,
    ];
    const standaloneAuthorizationClause = (
      !authorizationText.invalid && authorizationText.clauses.length === 1
    )
      ? authorizationText.clauses[0]
      : null;
    const standaloneOrderRequest = standaloneAuthorizationClause !== null
      && includesAny(standaloneAuthorizationClause, standaloneOrderPatterns);
    const standaloneProductRequest = standaloneAuthorizationClause !== null
      && includesAny(standaloneAuthorizationClause, standaloneProductPatterns);
    const capabilityClauses = authorizationText.invalid
      ? []
      : authorizationText.clauses.flatMap((clause) => {
        const explicitOrderClause = includesAny(clause, [
          /^(?:please\s+)?(?:where\s+is|track|check)\s+(?:my\s+)?calapres\s+order(?:\s+\d{4,20})?$/u,
          /^(?:please\s+|tell\s+me\s+)?(?:my\s+)?calapres\s+order\s+(?:status|tracking)(?:\s+\d{4,20})?$/u,
          /^(?:وش\s+|قل\s+لي\s+)?(?:وين|اين|حاله|تتبع)\s+(?:وصل\s+)?(?:طلبي\s+|الطلب\s+|طلب\s+)?كالابريز(?:\s+رقم)?(?:\s+\d{4,20})?$/u,
          /^طلب\s+كالابريز(?:\s+رقم)?(?:\s+\d{4,20})?\s+(?:وين|وصل|حاله|تتبع)$/u,
        ]);
        const explicitProductClause = includesAny(clause, [
          /^(?:كم|وش)\s+سعر\s+مبخره\s+كالابريز$/u,
          /^(?:وش\s+)?المنتجات\s+عند\s+كالابريز$/u,
          /^(?:اعرض|وريني)\s+(?:لي\s+)?(?:منتجات|كتالوج|اسعار)\s+كالابريز$/u,
          /^show(?:\s+me)?\s+(?:the\s+)?calapres\s+(?:catalog|products|prices)$/u,
          /^calapres\s+(?:catalog|products|prices|burner\s+price)$/u,
          /^what\s+is\s+the\s+price\s+of\s+the\s+calapres\s+burner$/u,
        ]);
        const matches = [];
        if (explicitOrderClause || includesAny(clause, standaloneOrderPatterns)) {
          matches.push({
            capability: 'order_status',
            clause,
            explicit: explicitOrderClause,
          });
        }
        if (explicitProductClause || includesAny(clause, standaloneProductPatterns)) {
          matches.push({
            capability: 'product_catalog',
            clause,
            explicit: explicitProductClause,
          });
        }
        return matches;
      });
    const explicitCapability = capabilityClauses.length === 1 && capabilityClauses[0].explicit
      ? capabilityClauses[0]
      : null;
    const capabilitySignals = authorizationText.invalid
      ? []
      : authorizationText.clauses.flatMap((clause) => {
        const signals = [];
        const orderSignal = includesAny(clause, [
          /(?:^|\s)(?:orders?|shipments?|shipping|tracking|track|status|parcels?|packages?|delivery|fulfillments?|purchases?)(?:\s|$)/u,
          /(?:^|\s)(?:طلبي|الطلب|طلب|الشحنه|شحن|تتبع|حاله|طردي|الطرد|طرد|توصيل|التوصيل|مشترياتي|المشتريات|شراء|تنفيذ|التنفيذ)(?:\s|$)/u,
        ]);
        const productSignal = includesAny(clause, [
          /(?:^|\s)(?:catalog|products?|burners?|prices?|stock|colors?|colours?|selection|available|availability|items?|inventory|assortment|merchandise)(?:\s|$)/u,
          /(?:^|\s)(?:مبخره|المبخره|مباخر|منتج|منتجات|المنتجات|كتالوج|سعر|اسعار|مخزون|متوفر|متاح|موجود|لون|الوان|اصناف|الاصناف|تشكيله|التشكيله|بضائع|البضائع|سلع)(?:\s|$)/u,
        ]);
        if (orderSignal) {
          signals.push({ capability: 'order_status', clause });
        }
        if (productSignal) {
          signals.push({ capability: 'product_catalog', clause });
        }
        return signals;
      });
    const singleCapabilitySignal = capabilitySignals.length === 1
      ? capabilitySignals[0]
      : null;
    const authorizedOrderClause = standaloneOrderRequest && !promptInjection
      ? standaloneAuthorizationClause
      : (
        explicitCapability && explicitCapability.capability === 'order_status'
          ? explicitCapability.clause
          : null
      );
    const authorizedProductClause = standaloneProductRequest && !promptInjection
      ? standaloneAuthorizationClause
      : (
        explicitCapability && explicitCapability.capability === 'product_catalog'
          ? explicitCapability.clause
          : null
      );
    if (
      !externalMerchantContext
      && authorizedOrderClause !== null
      && singleCapabilitySignal !== null
      && singleCapabilitySignal.capability === 'order_status'
      && singleCapabilitySignal.clause === authorizedOrderClause
    ) {
      return dynamicDecision(
        'order',
        'dynamic.order-status',
        'order_status',
        extractOrderNumber(authorizedOrderClause),
        'shopify_order_status_required',
      );
    }

    if (includesAny(message, [
      /(?:حفر|نقش|احفر|تحفر)\s*.{0,20}(?:اسم|شعار)?/u,
      /(?:engrave|engraving)\s*.{0,20}(?:name|logo)?/u,
      /(?:name|logo)\s+engraving/u,
    ])) {
      return staticDecision('fixed_reply', 'faq', 'product.engraving', 'engraving');
    }

    if (
      !externalMerchantContext
      && authorizedProductClause !== null
      && singleCapabilitySignal !== null
      && singleCapabilitySignal.capability === 'product_catalog'
      && singleCapabilitySignal.clause === authorizedProductClause
    ) {
      return dynamicDecision(
        'faq',
        'dynamic.product-catalog',
        'product_catalog',
        null,
        'shopify_product_catalog_required',
      );
    }

    if (includesAny(message, [
      /(?:كيف|وشلون)\s+.{0,16}(?:اطلب|اشتري)/u,
      /طريقه\s+.{0,12}(?:الطلب|الشراء)/u,
      /how\s+.{0,20}(?:place\s+an\s+order|order|buy)/u,
      /place\s+an\s+order/u,
    ])) {
      return staticDecision('fixed_reply', 'order', 'order.how-to-order', 'how_to_order');
    }

    if (includesAny(message, [
      /(?:هل|انت|انتي)\s+.{0,12}(?:انسان|بشر|روبوت|بوت|مساعد\s+الي)/u,
      /(?:are\s+you|you\s+are)\s+.{0,12}(?:human|bot|robot|ai|real\s+person)/u,
    ])) {
      return staticDecision('fixed_reply', 'faq', 'brand.assistant-identity', 'assistant_identity');
    }

    if (includesAny(message, [
      /(?:وش|ايش|ما)\s+(?:هي\s+)?كالابريز/u,
      /(?:عرفني|تعريف)\s+.{0,12}كالابريز/u,
      /(?:وين|اين)\s+.{0,12}(?:موقعكم|محلكم|مقركم)/u,
      /(?:متجركم|المتجر)\s+.{0,12}(?:الكتروني|اونلاين)/u,
      /what\s+is\s+calapres/u,
      /(?:calapres|your)\s+.{0,12}online\s+store/u,
      /where\s+.{0,20}(?:online\s+)?store\s+.{0,12}(?:located|location)/u,
    ])) {
      return staticDecision('fixed_reply', 'faq', 'brand.introduction', 'brand_introduction');
    }

    if (includesAny(message, [
      /(?:وش|ايش|ما)\s+.{0,10}تبيعون/u,
      /(?:هل|عندكم)\s+.{0,10}(?:تبيعون\s+)?مباخر/u,
      /(?:متخصص|متجر)\s+.{0,16}مباخر/u,
      /what\s+do\s+you\s+sell/u,
      /do\s+you\s+sell\s+.{0,12}(?:burners|incense)/u,
    ])) {
      return staticDecision('fixed_reply', 'faq', 'product.scope-burners', 'product_scope');
    }

    const recognizableStoreTopic = includesAny(message, [
      /(?:كالابريز|مبخر|متجر|طلبي|الطلب|شحن|توصيل|دفع|فاتوره|استرجاع|ارجاع|الغاء|شكوى)/u,
      /(?:calapres|burner|store|my\s+order|shipping|delivery|payment|invoice|refund|return|cancel)/u,
    ]);
    if (recognizableStoreTopic && !promptInjection) {
      return staticDecision('uncertain', 'clarification', 'clarification.store-topic', 'store_topic_unclear');
    }

    if (input && input.scope_notice_sent === true) {
      return staticDecision(
        'out_of_scope',
        'out_of_scope',
        'scope.store-redirect',
        'scope_notice_already_sent',
        true,
      );
    }
    return staticDecision('out_of_scope', 'out_of_scope', 'scope.store-redirect', 'outside_store_scope');
  }

  function render(value) {
    if (!hasExactKeys(value, decisionKeys)) {
      return null;
    }
    const contract = renderContracts[value.response_id];
    if (
      !contract
      || value.schema_version !== '1.0'
      || value.brand_id !== 'calapres'
      || value.knowledge_version !== release.version
      || value.route !== contract.route
      || value.decision_kind !== contract.decision_kind
      || value.model_allowed !== false
      || typeof value.suppress_reply !== 'boolean'
      || typeof value.reason_code !== 'string'
      || !contract.reasons.includes(value.reason_code)
      || (value.order_number !== null && !/^\d{4,20}$/u.test(value.order_number))
    ) {
      return null;
    }
    if (contract.route === 'dynamic_read') {
      if (
        !hasExactKeys(value.dynamic_read, ['capability', 'provider', 'response_id'])
        || value.dynamic_read.provider !== 'shopify'
        || value.dynamic_read.capability !== contract.capability
        || value.dynamic_read.response_id !== value.response_id
        || value.tool_allowed !== true
        || value.suppress_reply !== false
        || (contract.capability === 'product_catalog' && value.order_number !== null)
      ) {
        return null;
      }
      return null;
    }
    if (
      value.dynamic_read !== null
      || value.tool_allowed !== false
      || value.order_number !== null
      || (value.suppress_reply && value.reason_code !== 'scope_notice_already_sent')
      || (!value.suppress_reply && value.reason_code === 'scope_notice_already_sent')
    ) {
      return null;
    }
    if (value.suppress_reply) {
      return null;
    }
    const entry = entriesById.get(value.response_id);
    if (!entry || entry.authority !== 'approved_reply' || typeof entry.customer_response_ar !== 'string') {
      return null;
    }
    return entry.customer_response_ar;
  }

  return {
    decide,
    render,
    factorySource: createGovernedResponder.toString(),
  };
}

module.exports = {
  createGovernedResponder,
};
