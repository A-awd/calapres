import { node, trigger, workflow } from '@n8n/workflow-sdk';

/*
 * Optix Customer Service Core v1
 *
 * Immutable, private and credential-free by decision 0010.
 * This source deliberately contains no webhook, external service node, model
 * credential, customer data store, or customer-send node. It accepts a
 * structured envelope from a brand edge and returns a fail-closed decision.
 */

const calledByBrandEdge = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.2,
  config: {
    name: 'Private Core Input v1',
    parameters: {
      inputSource: 'passthrough',
    },
    position: [220, 260],
  },
});

const manualTest = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Manual Test Only',
    parameters: {},
    position: [220, 520],
  },
});

const createSanitizedCoreFixture = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Create Sanitized Core Fixture',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return [{
  json: {
    schema_version: '1.0',
    event: {
      schema_version: '1.0',
      brand_id: 'calapres',
      account_id: 179973,
      inbox_id: 128058,
      channel: 'whatsapp',
      channel_capabilities: {
        supports_text: true,
        supports_attachments: true,
        supports_public_reply: true
      },
      conversation_id: 'conv_test_001',
      message_id: 'msg_test_001',
      delivery_id: 'delivery_test_001',
      correlation_id: 'corr_test_001',
      idempotency_key: 'calapres:179973:128058:conv_test_001:msg_test_001',
      event_at: '2026-08-11T12:00:00.000Z',
      direction: 'inbound',
      visibility: 'public',
      actor_type: 'contact',
      sender_ref: {
        kind: 'chatwoot_contact',
        id: 'contact_ref_test_001'
      },
      content: {
        kind: 'text',
        text_present: true,
        attachment_count: 0
      },
      flags: {
        is_bot_echo: false,
        is_private_note: false
      }
    },
    runtime: {
      mode: 'observation',
      customer_egress_enabled: false,
      kill_switch: false
    },
    capabilities: {
      customer_lookup: 'disabled',
      order_lookup: 'disabled'
    },
    context: {
      knowledge_version: '2026-08-11-v3',
      knowledge_facts: [
        {
          knowledge_id: 'shipping.threshold',
          authority: 'draft_only',
          response_text: 'رسوم الشحن 25 ريالًا للطلبات الأقل من 320 ريالًا، والشحن مجاني للطلبات بقيمة 320 ريالًا أو أكثر.'
        }
      ],
      live_facts_status: 'not_requested',
      verified_live_facts: []
    },
      candidate: {
        intent: 'shipping_policy',
        risk: 'low',
        requested_action: 'answer',
        draft_text: 'UNTRUSTED MODEL DRAFT - MUST BE IGNORED',
        confidence: 1,
        knowledge_fact_ids: ['shipping.threshold'],
        live_fact_ids: [],
        needs_live_lookup: false,
        escalation_reason_code: null
      }
  }
}];
`,
    },
    position: [500, 520],
  },
});

const applyCoreRules = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validate Envelope and Apply Core Rules v1',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const allowedChannels = new Set(['instagram', 'tiktok', 'whatsapp', 'email']);
const allowedContentKinds = new Set(['text', 'media', 'mixed', 'unsupported']);
const allowedLookupStates = new Set(['disabled', 'enabled']);
const allowedFactStates = new Set(['not_requested', 'verified', 'unavailable', 'ambiguous']);
const allowedKnowledgeAuthorities = new Set(['draft_only', 'owner_required', 'mandatory_stop']);
const allowedIntents = new Set([
  'faq',
  'order_status',
  'tracking',
  'inventory',
  'product_question',
  'shipping_policy',
  'return_request',
  'complaint',
  'order_change',
  'cancellation',
  'refund',
  'privacy',
  'legal',
  'payment_dispute',
  'security',
  'general',
  'unknown'
]);
const allowedRequestedActions = new Set([
  'answer',
  'none',
  'read_fact',
  'draft_reply',
  'modify_order',
  'cancel_order',
  'issue_refund',
  'disclose_data',
  'approve_exception',
  'unknown'
]);
const sensitiveIntents = new Set([
  'return_request',
  'order_change',
  'cancellation',
  'refund',
  'complaint',
  'privacy',
  'legal',
  'payment_dispute',
  'security'
]);
const liveFactIntents = new Set(['order_status', 'inventory', 'tracking']);
const exactCandidateKeys = new Set([
  'intent',
  'risk',
  'requested_action',
  'draft_text',
  'confidence',
  'knowledge_fact_ids',
  'live_fact_ids',
  'needs_live_lookup',
  'escalation_reason_code'
]);
const knowledgeFactPattern = /^[a-z][a-z0-9._:-]{2,120}$/;
const liveFactPattern = /^lf_[A-Za-z0-9._:-]{3,120}$/;
const escalationReasonPattern = /^[a-z][a-z0-9_]{2,80}$/;

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeToken(value, fallback, maxLength) {
  return nonEmpty(value) ? value.slice(0, maxLength) : fallback;
}

function boundedUniqueArray(value, pattern) {
  return Array.isArray(value) &&
    value.length <= 32 &&
    new Set(value).size === value.length &&
    value.every((entry) => typeof entry === 'string' && pattern.test(entry));
}

function decisionFor(input, decision, reasonCode, authority, intent, risk, options) {
  const event = input && typeof input.event === 'object' && input.event !== null ? input.event : {};
  const draftAllowed = decision === 'observe_draft';
  const draftText = draftAllowed && options && nonEmpty(options.draftText)
    ? options.draftText.slice(0, 1200)
    : null;
  return {
    schema_version: '1.0',
    brand_id: typeof event.brand_id === 'string' && /^[a-z0-9][a-z0-9-]{1,63}$/.test(event.brand_id)
      ? event.brand_id
      : 'unknown',
    correlation_id: safeToken(event.correlation_id, 'unknown:core', 128),
    idempotency_key: safeToken(event.idempotency_key, 'unknown:core:invalid', 256),
    decision,
    reason_code: reasonCode,
    authority,
    intent: safeToken(intent, 'unknown', 80),
    risk,
    draft_allowed: draftAllowed,
    draft_text: draftText,
    customer_egress_allowed: false,
    requires_owner_review: Boolean(options && options.ownerReview),
    incident_required: Boolean(options && options.incident),
    sanitized_audit: {
      event_type: 'core_decision',
      reason_code: reasonCode
    }
  };
}

return $input.all().map((item) => {
  const input = item.json && typeof item.json === 'object' ? item.json : {};
  const event = input.event && typeof input.event === 'object' ? input.event : {};
  const runtime = input.runtime && typeof input.runtime === 'object' ? input.runtime : {};
  const capabilities = input.capabilities && typeof input.capabilities === 'object' ? input.capabilities : {};
  const context = input.context && typeof input.context === 'object' ? input.context : {};
  const candidate = input.candidate && typeof input.candidate === 'object' ? input.candidate : null;
  const issues = [];
  const knowledgeFacts = Array.isArray(context.knowledge_facts) ? context.knowledge_facts : [];
  const knowledgeIds = knowledgeFacts.map((fact) => fact && fact.knowledge_id);
  const knowledgeFactsValid =
    Array.isArray(context.knowledge_facts) &&
    knowledgeFacts.length <= 128 &&
    new Set(knowledgeIds).size === knowledgeIds.length &&
    knowledgeFacts.every((fact) =>
      fact &&
      typeof fact === 'object' &&
      !Array.isArray(fact) &&
      Object.keys(fact).length === 3 &&
      Object.prototype.hasOwnProperty.call(fact, 'knowledge_id') &&
      Object.prototype.hasOwnProperty.call(fact, 'authority') &&
      Object.prototype.hasOwnProperty.call(fact, 'response_text') &&
      typeof fact.knowledge_id === 'string' &&
      knowledgeFactPattern.test(fact.knowledge_id) &&
      allowedKnowledgeAuthorities.has(fact.authority) &&
      nonEmpty(fact.response_text) &&
      fact.response_text.length <= 1200
    );
  const verifiedLiveFacts = Array.isArray(context.verified_live_facts)
    ? context.verified_live_facts
    : [];
  const verifiedLiveFactIds = verifiedLiveFacts.map((fact) => fact && fact.live_fact_id);
  const verifiedLiveFactsValid =
    Array.isArray(context.verified_live_facts) &&
    verifiedLiveFacts.length <= 32 &&
    new Set(verifiedLiveFactIds).size === verifiedLiveFactIds.length &&
    verifiedLiveFacts.every((fact) =>
      fact &&
      typeof fact === 'object' &&
      !Array.isArray(fact) &&
      Object.keys(fact).length === 2 &&
      Object.prototype.hasOwnProperty.call(fact, 'live_fact_id') &&
      Object.prototype.hasOwnProperty.call(fact, 'response_text') &&
      typeof fact.live_fact_id === 'string' &&
      liveFactPattern.test(fact.live_fact_id) &&
      nonEmpty(fact.response_text) &&
      fact.response_text.length <= 1200
    );

  if (input.schema_version !== '1.0' || event.schema_version !== '1.0') issues.push('schema_version');
  if (!nonEmpty(event.brand_id) || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(event.brand_id)) issues.push('brand_id');
  if (!Number.isInteger(event.account_id)) issues.push('account_id');
  if (!Number.isInteger(event.inbox_id)) issues.push('inbox_id');
  if (!allowedChannels.has(event.channel)) issues.push('channel');
  if (!nonEmpty(event.conversation_id)) issues.push('conversation_id');
  if (!nonEmpty(event.message_id)) issues.push('message_id');
  if (!nonEmpty(event.correlation_id) || event.correlation_id.length < 8 || event.correlation_id.length > 128) issues.push('correlation_id');
  if (!nonEmpty(event.idempotency_key) || event.idempotency_key.length < 16 || event.idempotency_key.length > 256) issues.push('idempotency_key');
  if (!nonEmpty(event.event_at) || Number.isNaN(Date.parse(event.event_at))) issues.push('event_at');
  if (event.direction !== 'inbound') issues.push('direction');
  if (event.visibility !== 'public') issues.push('visibility');
  if (event.actor_type !== 'contact') issues.push('actor_type');
  if (!event.sender_ref || event.sender_ref.kind !== 'chatwoot_contact' || !nonEmpty(event.sender_ref.id)) issues.push('sender_ref');
  if (!event.content || !allowedContentKinds.has(event.content.kind)) issues.push('content');
  if (!event.flags || event.flags.is_bot_echo !== false || event.flags.is_private_note !== false) issues.push('flags');
  if (!allowedLookupStates.has(capabilities.customer_lookup)) issues.push('customer_lookup');
  if (!allowedLookupStates.has(capabilities.order_lookup)) issues.push('order_lookup');
  if (!nonEmpty(context.knowledge_version)) issues.push('knowledge_version');
  if (!knowledgeFactsValid) issues.push('knowledge_facts');
  if (!allowedFactStates.has(context.live_facts_status)) issues.push('live_facts_status');
  if (!verifiedLiveFactsValid) issues.push('verified_live_facts');
  if (context.live_facts_status !== 'verified' && verifiedLiveFacts.length > 0) {
    issues.push('verified_live_fact_status_mismatch');
  }

  if (issues.length > 0) {
    return { json: decisionFor(input, 'no_action', 'envelope_invalid', 'none', 'unknown', 'unknown', { incident: true }) };
  }

  if (runtime.mode !== 'observation' || runtime.customer_egress_enabled !== false) {
    return { json: decisionFor(input, 'no_action', 'runtime_not_observation', 'none', 'unknown', 'unknown', { incident: true }) };
  }

  if (runtime.kill_switch === true) {
    return { json: decisionFor(input, 'no_action', 'brand_kill_switch', 'none', 'unknown', 'unknown', { incident: false }) };
  }

  if (event.content.kind === 'unsupported') {
    return { json: decisionFor(input, 'no_action', 'unsupported_content', 'none', 'unknown', 'unknown', { incident: true }) };
  }

  const structuredCandidateValid =
    candidate &&
    Object.keys(candidate).length === exactCandidateKeys.size &&
    Object.keys(candidate).every((key) => exactCandidateKeys.has(key)) &&
    allowedIntents.has(candidate.intent) &&
    ['low', 'medium', 'high', 'unknown'].includes(candidate.risk) &&
    allowedRequestedActions.has(candidate.requested_action) &&
    (candidate.draft_text === null || (nonEmpty(candidate.draft_text) && candidate.draft_text.length <= 1200)) &&
    typeof candidate.confidence === 'number' &&
    Number.isFinite(candidate.confidence) &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1 &&
    boundedUniqueArray(candidate.knowledge_fact_ids, knowledgeFactPattern) &&
    boundedUniqueArray(candidate.live_fact_ids, liveFactPattern) &&
    typeof candidate.needs_live_lookup === 'boolean' &&
    (candidate.escalation_reason_code === null ||
      (typeof candidate.escalation_reason_code === 'string' && escalationReasonPattern.test(candidate.escalation_reason_code))) &&
    !(candidate.needs_live_lookup === true && (
      candidate.requested_action !== 'read_fact' ||
      candidate.draft_text !== null ||
      candidate.live_fact_ids.length !== 0 ||
      candidate.escalation_reason_code === null
    )) &&
    !(candidate.requested_action === 'answer' && (
      !nonEmpty(candidate.draft_text) ||
      candidate.needs_live_lookup !== false
    ));

  if (!structuredCandidateValid) {
    return { json: decisionFor(input, 'escalate', 'structured_candidate_missing', 'owner_required', 'unknown', 'unknown', { ownerReview: true, incident: true }) };
  }

  const intent = candidate.intent;
  const risk = ['low', 'medium', 'high', 'unknown'].includes(candidate.risk) ? candidate.risk : 'unknown';
  const knowledgeById = new Map(
    knowledgeFacts.map((fact) => [fact.knowledge_id, fact])
  );
  const unverifiedKnowledgeReference = candidate.knowledge_fact_ids.some(
    (factId) => !knowledgeById.has(factId)
  );
  if (unverifiedKnowledgeReference) {
    return { json: decisionFor(input, 'escalate', 'knowledge_reference_unverified', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  const restrictedKnowledgeReference = candidate.knowledge_fact_ids.some(
    (factId) => knowledgeById.get(factId).authority !== 'draft_only'
  );
  if (restrictedKnowledgeReference) {
    return { json: decisionFor(input, 'escalate', 'knowledge_authority_required', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  const verifiedLiveFactById = new Map(
    verifiedLiveFacts.map((fact) => [fact.live_fact_id, fact])
  );
  const unverifiedLiveFactReference = candidate.live_fact_ids.some(
    (factId) => !verifiedLiveFactById.has(factId)
  );
  if (unverifiedLiveFactReference) {
    return { json: decisionFor(input, 'escalate', 'live_fact_reference_unverified', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  if (sensitiveIntents.has(intent) || intent === 'unknown' || risk !== 'low' || candidate.requested_action !== 'answer') {
    if (candidate.needs_live_lookup === true && candidate.requested_action === 'read_fact') {
      return { json: decisionFor(input, 'escalate', 'live_facts_not_verified', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
    }
    return { json: decisionFor(input, 'escalate', 'owner_authority_required', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  if (liveFactIntents.has(intent)) {
    const lookupDisabled = capabilities.order_lookup !== 'enabled';
    const factsNotVerified = context.live_facts_status !== 'verified';
    const candidateStillNeedsLookup = candidate.needs_live_lookup !== false;
    const liveFactReferencesMissing = candidate.live_fact_ids.length === 0;
    if (lookupDisabled || factsNotVerified || candidateStillNeedsLookup || liveFactReferencesMissing) {
      return { json: decisionFor(input, 'escalate', 'live_facts_not_verified', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
    }
  }

  if (
    candidate.live_fact_ids.length > 0 &&
    (capabilities.order_lookup !== 'enabled' || context.live_facts_status !== 'verified')
  ) {
    return { json: decisionFor(input, 'escalate', 'live_facts_not_verified', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  if (typeof candidate.confidence !== 'number' || candidate.confidence < 0.85) {
    return { json: decisionFor(input, 'escalate', 'confidence_below_threshold', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  if (candidate.knowledge_fact_ids.length === 0 && candidate.live_fact_ids.length === 0) {
    return { json: decisionFor(input, 'escalate', 'grounded_draft_missing', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  const approvedFragments = [
    ...candidate.knowledge_fact_ids.map((factId) => knowledgeById.get(factId).response_text),
    ...candidate.live_fact_ids.map((factId) => verifiedLiveFactById.get(factId).response_text)
  ];
  const renderedDraft = approvedFragments.join(' ').trim();
  if (!nonEmpty(renderedDraft) || renderedDraft.length > 1200) {
    return { json: decisionFor(input, 'escalate', 'grounded_draft_missing', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  return { json: decisionFor(input, 'observe_draft', 'grounded_draft_observed', 'draft_only', intent, risk, { ownerReview: true, incident: false, draftText: renderedDraft }) };
});
`,
    },
    position: [800, 340],
  },
});

const validateCoreDecision = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validate Core Decision Contract v1',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const decisions = new Set(['no_action', 'observe_draft', 'escalate']);
const authorities = new Set(['none', 'draft_only', 'owner_required']);
const risks = new Set(['low', 'medium', 'high', 'unknown']);
const intents = new Set([
  'faq', 'order_status', 'tracking', 'inventory', 'product_question',
  'shipping_policy', 'return_request', 'complaint', 'order_change',
  'cancellation', 'refund', 'privacy', 'legal', 'payment_dispute',
  'security', 'general', 'unknown'
]);
const reasonCodes = new Set([
  'envelope_invalid', 'runtime_not_observation', 'brand_kill_switch',
  'unsupported_content', 'structured_candidate_missing',
  'knowledge_reference_unverified', 'knowledge_authority_required',
  'live_fact_reference_unverified', 'owner_authority_required',
  'live_facts_not_verified', 'confidence_below_threshold',
  'grounded_draft_missing', 'grounded_draft_observed', 'core_output_invalid'
]);
const exactOutputKeys = new Set([
  'schema_version', 'brand_id', 'correlation_id', 'idempotency_key',
  'decision', 'reason_code', 'authority', 'intent', 'risk', 'draft_allowed',
  'draft_text', 'customer_egress_allowed', 'requires_owner_review',
  'incident_required', 'sanitized_audit'
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function fallback(value) {
  return {
    schema_version: '1.0',
    brand_id: nonEmpty(value.brand_id) ? value.brand_id.slice(0, 200) : 'unknown',
    correlation_id: nonEmpty(value.correlation_id) ? value.correlation_id.slice(0, 128) : 'unknown:core',
    idempotency_key: nonEmpty(value.idempotency_key) ? value.idempotency_key.slice(0, 256) : 'unknown:core:invalid',
    decision: 'no_action',
    reason_code: 'core_output_invalid',
    authority: 'none',
    intent: 'unknown',
    risk: 'unknown',
    draft_allowed: false,
    draft_text: null,
    customer_egress_allowed: false,
    requires_owner_review: true,
    incident_required: true,
    sanitized_audit: {
      event_type: 'core_decision',
      reason_code: 'core_output_invalid'
    }
  };
}

return $input.all().map((item) => {
  const value = item.json && typeof item.json === 'object' ? item.json : {};
  const exactShape =
    Object.keys(value).length === exactOutputKeys.size &&
    Object.keys(value).every((key) => exactOutputKeys.has(key));
  const auditValid =
    value.sanitized_audit &&
    typeof value.sanitized_audit === 'object' &&
    !Array.isArray(value.sanitized_audit) &&
    Object.keys(value.sanitized_audit).length === 2 &&
    value.sanitized_audit.event_type === 'core_decision' &&
    value.sanitized_audit.reason_code === value.reason_code;
  const decisionConsistent =
    (value.decision === 'observe_draft' &&
      value.authority === 'draft_only' &&
      value.draft_allowed === true &&
      nonEmpty(value.draft_text) &&
      value.draft_text.length <= 1200 &&
      value.requires_owner_review === true &&
      value.incident_required === false) ||
    (value.decision === 'escalate' &&
      value.authority === 'owner_required' &&
      value.draft_allowed === false &&
      value.draft_text === null &&
      value.requires_owner_review === true &&
      value.incident_required === true) ||
    (value.decision === 'no_action' &&
      value.authority === 'none' &&
      value.draft_allowed === false &&
      value.draft_text === null);
  const valid =
    exactShape &&
    value.schema_version === '1.0' &&
    nonEmpty(value.brand_id) &&
    nonEmpty(value.correlation_id) &&
    nonEmpty(value.idempotency_key) &&
    decisions.has(value.decision) &&
    reasonCodes.has(value.reason_code) &&
    authorities.has(value.authority) &&
    intents.has(value.intent) &&
    risks.has(value.risk) &&
    typeof value.draft_allowed === 'boolean' &&
    value.customer_egress_allowed === false &&
    typeof value.requires_owner_review === 'boolean' &&
    typeof value.incident_required === 'boolean' &&
    auditValid &&
    decisionConsistent;

  return { json: valid ? value : fallback(value) };
});
`,
    },
    position: [1080, 340],
  },
});

export default workflow('optix-customer-service-core-v1', 'Optix | Customer Service Core v1')
  .add(calledByBrandEdge)
  .to(applyCoreRules)
  .to(validateCoreDecision)
  .add(manualTest)
  .to(createSanitizedCoreFixture)
  .to(applyCoreRules);
