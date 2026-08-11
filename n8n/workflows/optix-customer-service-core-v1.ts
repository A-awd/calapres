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
      knowledge_version: 'calapres-cs-v1',
      live_facts_status: 'not_requested'
    },
    candidate: {
      intent: 'faq',
      risk: 'low',
      requested_action: 'answer',
      draft_text: 'SANITIZED TEST DRAFT - NOT FOR CUSTOMER DELIVERY',
      confidence: 1
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

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeToken(value, fallback) {
  return nonEmpty(value) ? value.slice(0, 200) : fallback;
}

function decisionFor(input, decision, reasonCode, authority, intent, risk, options) {
  const event = input && typeof input.event === 'object' && input.event !== null ? input.event : {};
  const draftAllowed = decision === 'observe_draft';
  return {
    schema_version: '1.0',
    brand_id: safeToken(event.brand_id, 'unknown'),
    correlation_id: safeToken(event.correlation_id, 'unknown'),
    idempotency_key: safeToken(event.idempotency_key, 'unknown'),
    decision,
    reason_code: reasonCode,
    authority,
    intent: safeToken(intent, 'unknown'),
    risk,
    draft_allowed: draftAllowed,
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

  if (input.schema_version !== '1.0' || event.schema_version !== '1.0') issues.push('schema_version');
  if (!nonEmpty(event.brand_id)) issues.push('brand_id');
  if (!Number.isInteger(event.account_id)) issues.push('account_id');
  if (!Number.isInteger(event.inbox_id)) issues.push('inbox_id');
  if (!allowedChannels.has(event.channel)) issues.push('channel');
  if (!nonEmpty(event.conversation_id)) issues.push('conversation_id');
  if (!nonEmpty(event.message_id)) issues.push('message_id');
  if (!nonEmpty(event.correlation_id)) issues.push('correlation_id');
  if (!nonEmpty(event.idempotency_key)) issues.push('idempotency_key');
  if (!nonEmpty(event.event_at) || Number.isNaN(Date.parse(event.event_at))) issues.push('event_at');
  if (event.direction !== 'inbound') issues.push('direction');
  if (event.visibility !== 'public') issues.push('visibility');
  if (event.actor_type !== 'contact') issues.push('actor_type');
  if (!event.sender_ref || event.sender_ref.kind !== 'chatwoot_contact' || !nonEmpty(event.sender_ref.id)) issues.push('sender_ref');
  if (!event.content || !allowedContentKinds.has(event.content.kind)) issues.push('content');
  if (!event.flags || event.flags.is_bot_echo !== false || event.flags.is_private_note !== false) issues.push('flags');
  if (!allowedLookupStates.has(capabilities.customer_lookup)) issues.push('customer_lookup');
  if (!allowedLookupStates.has(capabilities.order_lookup)) issues.push('order_lookup');
  if (!allowedFactStates.has(context.live_facts_status)) issues.push('live_facts_status');

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

  if (!candidate || !nonEmpty(candidate.intent) || !nonEmpty(candidate.requested_action)) {
    return { json: decisionFor(input, 'escalate', 'structured_candidate_missing', 'owner_required', 'unknown', 'unknown', { ownerReview: true, incident: true }) };
  }

  const intent = candidate.intent;
  const risk = ['low', 'medium', 'high', 'unknown'].includes(candidate.risk) ? candidate.risk : 'unknown';

  if (sensitiveIntents.has(intent) || intent === 'unknown' || risk !== 'low' || candidate.requested_action !== 'answer') {
    return { json: decisionFor(input, 'escalate', 'owner_authority_required', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  if (liveFactIntents.has(intent)) {
    const lookupDisabled = capabilities.order_lookup !== 'enabled';
    const factsNotVerified = context.live_facts_status !== 'verified';
    if (lookupDisabled || factsNotVerified) {
      return { json: decisionFor(input, 'escalate', 'live_facts_not_verified', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
    }
  }

  if (typeof candidate.confidence !== 'number' || candidate.confidence < 0.85) {
    return { json: decisionFor(input, 'escalate', 'confidence_below_threshold', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  if (!nonEmpty(candidate.draft_text)) {
    return { json: decisionFor(input, 'escalate', 'grounded_draft_missing', 'owner_required', intent, risk, { ownerReview: true, incident: true }) };
  }

  return { json: decisionFor(input, 'observe_draft', 'grounded_draft_observed', 'draft_only', intent, risk, { ownerReview: true, incident: false }) };
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

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function fallback(value) {
  return {
    schema_version: '1.0',
    brand_id: nonEmpty(value.brand_id) ? value.brand_id.slice(0, 200) : 'unknown',
    correlation_id: nonEmpty(value.correlation_id) ? value.correlation_id.slice(0, 200) : 'unknown',
    idempotency_key: nonEmpty(value.idempotency_key) ? value.idempotency_key.slice(0, 200) : 'unknown',
    decision: 'no_action',
    reason_code: 'core_output_invalid',
    authority: 'none',
    intent: 'unknown',
    risk: 'unknown',
    draft_allowed: false,
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
  const valid =
    value.schema_version === '1.0' &&
    nonEmpty(value.brand_id) &&
    nonEmpty(value.correlation_id) &&
    nonEmpty(value.idempotency_key) &&
    decisions.has(value.decision) &&
    nonEmpty(value.reason_code) &&
    authorities.has(value.authority) &&
    nonEmpty(value.intent) &&
    risks.has(value.risk) &&
    typeof value.draft_allowed === 'boolean' &&
    value.customer_egress_allowed === false &&
    typeof value.requires_owner_review === 'boolean' &&
    typeof value.incident_required === 'boolean' &&
    value.sanitized_audit &&
    value.sanitized_audit.event_type === 'core_decision' &&
    nonEmpty(value.sanitized_audit.reason_code) &&
    value.draft_allowed === (value.decision === 'observe_draft');

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
