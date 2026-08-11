import { expr, ifElse, node, trigger, workflow } from '@n8n/workflow-sdk';

/*
 * Calapres Customer Service Edge v1 - observation source only.
 *
 * This file has no public webhook, credential, LLM, Shopify mutation, Chatwoot
 * write, or customer-send node. The manual fixture proves exact inbox routing,
 * an identifiers-only Wait carrier, post-delay cancellation, and the
 * fail-closed envelope/Core contract without customer data.
 *
 * The named DEDUP / JOB / AUDIT slots mark the exact persistence positions.
 * They remain no-write previews in source because n8n Data Tables do not
 * document an atomic uniqueness guarantee. A future signed Webhook ingress
 * must Respond 204 before entering the merged delay stage. Customer egress is
 * structurally absent, not merely disabled by a runtime flag.
 */

const manualTest = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Manual Observation Test Only',
    parameters: {},
    position: [160, 360],
  },
});

const createSanitizedChatwootFixture = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Create Sanitized Chatwoot Fixture',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return [{
  json: {
    trusted_ingress: {
      schema_version: '1.0',
      kind: 'synthetic_manual_fixture',
      signature_verified: true,
      replay_protection_verified: true
    },
    synthetic_controls: {
      dedup_status: 'unique',
      generation_status: 'current'
    },
    payload: {
      event: 'message_created',
      account: { id: 179973 },
      inbox: { id: 128058 },
      conversation: {
        id: 'conv_test_001',
        inbox_id: 128058,
        status: 'open'
      },
      id: 'msg_test_001',
      delivery_id: 'delivery_test_001',
      message_type: 'incoming',
      private: false,
      sender: {
        id: 'contact_ref_test_001',
        type: 'contact'
      },
      content_type: 'text',
      content: 'SANITIZED TEST MESSAGE - NO CUSTOMER DATA',
      attachments: [],
      created_at: '2026-08-11T12:00:00.000Z'
    }
  }
}];
`,
    },
    position: [420, 360],
  },
});

const normalizeAndResolveBrand = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalize and Resolve Exact Calapres Inbox',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const ACCOUNT_ID = 179973;
const INBOXES = {
  128031: {
    channel: 'instagram',
    capabilities: { supports_text: true, supports_attachments: true, supports_public_reply: true }
  },
  128033: {
    channel: 'tiktok',
    capabilities: { supports_text: true, supports_attachments: true, supports_public_reply: true }
  },
  128058: {
    channel: 'whatsapp',
    capabilities: { supports_text: true, supports_attachments: true, supports_public_reply: true }
  },
  128326: {
    channel: 'email',
    capabilities: { supports_text: true, supports_attachments: true, supports_public_reply: true }
  }
};

function asInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function asToken(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim().slice(0, 200);
  return null;
}

return $input.all().map((item) => {
  const wrapper = item.json && typeof item.json === 'object' ? item.json : {};
  const raw = wrapper.payload && typeof wrapper.payload === 'object' ? wrapper.payload : {};
  const trustedIngress = wrapper.trusted_ingress && typeof wrapper.trusted_ingress === 'object'
    ? wrapper.trusted_ingress
    : {};
  const syntheticControls = wrapper.synthetic_controls && typeof wrapper.synthetic_controls === 'object'
    ? wrapper.synthetic_controls
    : {};
  const accountId = asInteger(raw.account && raw.account.id !== undefined ? raw.account.id : raw.account_id);
  const payloadInboxId = asInteger(raw.inbox && raw.inbox.id !== undefined ? raw.inbox.id : raw.inbox_id);
  const conversationInboxId = asInteger(raw.conversation && raw.conversation.inbox_id);
  const inboxId = payloadInboxId !== null ? payloadInboxId : conversationInboxId;
  const mapping = inboxId !== null ? INBOXES[inboxId] : null;
  const conversationId = asToken(raw.conversation && raw.conversation.id !== undefined ? raw.conversation.id : raw.conversation_id);
  const messageId = asToken(raw.id !== undefined ? raw.id : raw.message_id);
  const deliveryId = asToken(raw.delivery_id);
  const senderId = asToken(raw.sender && raw.sender.id);
  const senderType = asToken(raw.sender && raw.sender.type);
  const isIncoming = raw.message_type === 'incoming' || raw.message_type === 0;
  const isPrivate = raw.private === true;
  const isBot = senderType === 'bot' || senderType === 'agent_bot';
  const trustedIngressKind = trustedIngress.kind === 'synthetic_manual_fixture' ||
    trustedIngress.kind === 'chatwoot_hmac_v1';
  const signatureVerified =
    trustedIngress.schema_version === '1.0' &&
    trustedIngressKind &&
    trustedIngress.signature_verified === true;
  const replayVerified = trustedIngressKind && trustedIngress.replay_protection_verified === true;
  const eventAt = typeof raw.created_at === 'string' ? raw.created_at : null;
  const issues = [];

  if (!signatureVerified) issues.push('signature_not_verified');
  if (!replayVerified) issues.push('replay_protection_not_verified');
  if (accountId !== ACCOUNT_ID) issues.push('account_not_allowlisted');
  if (!mapping) issues.push('inbox_not_allowlisted');
  if (payloadInboxId !== null && conversationInboxId !== null && payloadInboxId !== conversationInboxId) issues.push('inbox_mismatch');
  if (raw.event !== 'message_created') issues.push('event_not_supported');
  if (!isIncoming) issues.push('message_not_inbound');
  if (isPrivate) issues.push('private_note_rejected');
  if (isBot) issues.push('bot_echo_rejected');
  if (!conversationId) issues.push('conversation_id_missing');
  if (!messageId) issues.push('message_id_missing');
  if (!senderId) issues.push('sender_ref_missing');
  if (!eventAt || Number.isNaN(Date.parse(eventAt))) issues.push('event_time_invalid');

  const failReason = issues.length > 0 ? issues[0] : null;
  if (failReason) {
    return {
      json: {
        accepted: false,
        fail_reason: failReason,
        schema_version: '1.0',
        brand_id: 'calapres',
        correlation_id: 'rejected:' + (messageId || 'missing'),
        idempotency_key: 'rejected:' + (messageId || 'missing'),
        customer_egress_allowed: false,
        storage_refs: {
          dedup_table_id: 'PgsnBFCtwWGysCdp',
          jobs_table_id: '9wy6FpcDoNbrK3BM',
          audit_table_id: '4YBUAuuEgXYiaybJ'
        }
      }
    };
  }

  const attachmentCount = Array.isArray(raw.attachments) ? raw.attachments.length : 0;
  const textPresent = typeof raw.content === 'string' && raw.content.trim().length > 0;
  const contentKind = textPresent && attachmentCount > 0
    ? 'mixed'
    : attachmentCount > 0
      ? 'media'
      : textPresent
        ? 'text'
        : 'unsupported';
  const idempotencyKey = deliveryId
    ? 'calapres:' + accountId + ':' + inboxId + ':delivery:' + deliveryId
    : 'calapres:' + accountId + ':' + inboxId + ':' + conversationId + ':' + messageId;

  return {
    json: {
      accepted: true,
      fail_reason: null,
      envelope: {
        schema_version: '1.0',
        brand_id: 'calapres',
        account_id: accountId,
        inbox_id: inboxId,
        channel: mapping.channel,
        channel_capabilities: mapping.capabilities,
        conversation_id: conversationId,
        message_id: messageId,
        delivery_id: deliveryId,
        correlation_id: 'calapres:' + conversationId + ':' + messageId,
        idempotency_key: idempotencyKey,
        event_at: eventAt,
        direction: 'inbound',
        visibility: 'public',
        actor_type: 'contact',
        sender_ref: {
          kind: 'chatwoot_contact',
          id: senderId
        },
        content: {
          kind: contentKind,
          text_present: textPresent,
          attachment_count: attachmentCount
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
        live_facts_status: 'not_requested'
      },
      test_control: {
        dedup_status: syntheticControls.dedup_status === 'duplicate' ? 'duplicate' : 'unique',
        generation_status: syntheticControls.generation_status === 'stale' ? 'stale' : 'current'
      },
      delay_contract: {
        conversation_fingerprint: '1111111111111111111111111111111111111111111111111111111111111111',
        message_fingerprint: '2222222222222222222222222222222222222222222222222222222222222222',
        idempotency_fingerprint: '3333333333333333333333333333333333333333333333333333333333333333',
        generation: 1,
        not_before: '2026-08-11T12:00:01.000Z',
        fixture_ref: trustedIngress.kind === 'synthetic_manual_fixture' ? 'fixture_clear_001' : null
      },
      storage_refs: {
        dedup_table_id: 'PgsnBFCtwWGysCdp',
        jobs_table_id: '9wy6FpcDoNbrK3BM',
        audit_table_id: '4YBUAuuEgXYiaybJ'
      }
    }
  };
});
`,
    },
    position: [700, 360],
  },
});

const acceptedRoute = ifElse({
  version: 2.3,
  config: {
    name: 'Exact Route Accepted?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            leftValue: expr('{{ $json.accepted }}'),
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            rightValue: '',
          },
        ],
        combinator: 'and',
      },
    },
    position: [980, 360],
  },
});

const dedupReservationSlot = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'DEDUP Reservation Slot - No Write',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => {
  const value = item.json;
  const isUnique = value.test_control && value.test_control.dedup_status === 'unique';
  return {
    json: {
      ...value,
      dedup_gate: {
        table_id: value.storage_refs.dedup_table_id,
        key_ref: value.envelope.idempotency_key,
        required_operation: 'atomic_lookup_and_reserve',
        write_executed: false,
        gate_passed: isUnique,
        reason_code: isUnique ? 'manual_fixture_unique' : 'duplicate_event'
      }
    }
  };
});
`,
    },
    position: [1250, 240],
  },
});

const dedupGate = ifElse({
  version: 2.3,
  config: {
    name: 'Dedup Gate Passed?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            leftValue: expr('{{ $json.dedup_gate.gate_passed }}'),
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            rightValue: '',
          },
        ],
        combinator: 'and',
      },
    },
    position: [1510, 240],
  },
});

const conversationJobSlot = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Conversation JOB Generation Slot - No Write',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => {
  const value = item.json;
  const current = value.test_control && value.test_control.generation_status === 'current';
  return {
    json: {
      ...value,
      conversation_job: {
        table_id: value.storage_refs.jobs_table_id,
        job_key: value.envelope.brand_id + ':' + value.envelope.conversation_id,
        generation_token: value.envelope.message_id,
        generation: value.delay_contract.generation,
        required_operation: 'advance_and_compare_generation',
        write_executed: false,
        generation_current: current,
        reason_code: current ? 'manual_fixture_current' : 'stale_generation'
      }
    }
  };
});
`,
    },
    position: [1770, 120],
  },
});

const buildSanitizedWaitState = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Identifiers-only Post-Response Wait State',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const INBOXES = {
  128031: 'instagram',
  128033: 'tiktok',
  128058: 'whatsapp',
  128326: 'email'
};
const fingerprintPattern = /^[a-f0-9]{64}$/;
const tokenPattern = /^[A-Za-z0-9_-]{1,128}$/;

return $input.all().map((item) => {
  const value = item.json && typeof item.json === 'object' ? item.json : {};
  const event = value.envelope && typeof value.envelope === 'object' ? value.envelope : {};
  const delay = value.delay_contract && typeof value.delay_contract === 'object' ? value.delay_contract : {};
  const issues = [];
  if (event.brand_id !== 'calapres') issues.push('wait_brand_invalid');
  if (event.account_id !== 179973) issues.push('wait_account_invalid');
  if (INBOXES[event.inbox_id] !== event.channel) issues.push('wait_inbox_channel_invalid');
  if (!tokenPattern.test(event.conversation_id || '')) issues.push('wait_conversation_id_invalid');
  if (!tokenPattern.test(event.message_id || '')) issues.push('wait_message_id_invalid');
  if (!fingerprintPattern.test(delay.conversation_fingerprint || '')) issues.push('wait_conversation_fingerprint_invalid');
  if (!fingerprintPattern.test(delay.message_fingerprint || '')) issues.push('wait_message_fingerprint_invalid');
  if (!fingerprintPattern.test(delay.idempotency_fingerprint || '')) issues.push('wait_idempotency_fingerprint_invalid');
  if (!Number.isInteger(delay.generation) || delay.generation < 1) issues.push('wait_generation_invalid');
  if (typeof delay.not_before !== 'string' || Number.isNaN(Date.parse(delay.not_before))) issues.push('wait_not_before_invalid');
  if (typeof value.context?.knowledge_version !== 'string') issues.push('wait_knowledge_version_invalid');

  const waitState = issues.length === 0 ? {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: event.account_id,
    inbox_id: event.inbox_id,
    channel: event.channel,
    conversation_id: event.conversation_id,
    anchor_message_id: event.message_id,
    conversation_fingerprint: delay.conversation_fingerprint,
    message_fingerprint: delay.message_fingerprint,
    correlation_id: event.correlation_id,
    idempotency_fingerprint: delay.idempotency_fingerprint,
    generation: delay.generation,
    not_before: delay.not_before,
    knowledge_version: value.context.knowledge_version,
    fixture_ref: delay.fixture_ref,
    customer_egress_allowed: false
  } : null;

  return {
    json: {
      accepted: issues.length === 0,
      fail_reason: issues.length === 0 ? null : issues[0],
      wait_state: waitState,
      correlation_id: typeof event.correlation_id === 'string' ? event.correlation_id : 'unknown:edge',
      idempotency_key: fingerprintPattern.test(delay.idempotency_fingerprint || '')
        ? delay.idempotency_fingerprint
        : 'unknown:edge:invalid',
      customer_egress_allowed: false
    }
  };
});
`,
    },
    position: [2290, 0],
  },
});

const waitStateAccepted = ifElse({
  version: 2.3,
  config: {
    name: 'Identifiers-only Wait State Accepted?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            leftValue: expr('{{ $json.accepted }}'),
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            rightValue: '',
          },
        ],
        combinator: 'and',
      },
    },
    position: [4110, -160],
  },
});

const releaseIdentifiersOnlyState = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Release Only Wait Contract Fields',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => ({ json: item.json.wait_state }));
`,
    },
    position: [2810, -80],
  },
});

const waitForSyntheticQuietWindow = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Wait With Identifiers Only - Synthetic 1 Second',
    parameters: {
      resume: 'timeInterval',
      amount: 1,
      unit: 'seconds',
    },
    position: [3070, -80],
  },
});

const buildPostDelayRecheck = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Chatwoot Live Re-read Slot - Fail Closed No Credential',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => {
  const waitState = item.json && typeof item.json === 'object' ? item.json : {};
  const syntheticClear = waitState.fixture_ref === 'fixture_clear_001';
  const recheck = {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: waitState.account_id,
    inbox_id: waitState.inbox_id,
    channel: waitState.channel,
    conversation_id: waitState.conversation_id,
    anchor_message_id: waitState.anchor_message_id,
    generation: waitState.generation,
    evidence_source: syntheticClear ? 'synthetic_fixture' : 'chatwoot_live_read',
    source_verified: syntheticClear,
    generation_matches: syntheticClear,
    newer_inbound_present: false,
    public_human_reply_present: false,
    private_owner_instruction_present: false,
    status_changed: false,
    owner_changed: false,
    kill_switch: false,
    eligible_for_observation: syntheticClear,
    checked_at: syntheticClear ? '2026-08-11T12:00:02.000Z' : new Date().toISOString(),
    customer_egress_allowed: false
  };
  return {
    json: {
      wait_state: waitState,
      recheck,
      recheck_gate_passed: syntheticClear,
      recheck_reason: syntheticClear ? 'synthetic_recheck_clear' : 'live_recheck_unavailable',
      customer_egress_allowed: false
    }
  };
});
`,
    },
    position: [3330, -80],
  },
});

const recheckAccepted = ifElse({
  version: 2.3,
  config: {
    name: 'Post-Delay Recheck Clear?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            leftValue: expr('{{ $json.recheck_gate_passed }}'),
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            rightValue: '',
          },
        ],
        combinator: 'and',
      },
    },
    position: [3590, -80],
  },
});

const generationGate = ifElse({
  version: 2.3,
  config: {
    name: 'Generation Still Current?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            leftValue: expr('{{ $json.conversation_job.generation_current }}'),
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            rightValue: '',
          },
        ],
        combinator: 'and',
      },
    },
    position: [2030, 120],
  },
});

const buildCoreInput = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Structured Core Input v1',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => {
  const value = item.json && typeof item.json === 'object' ? item.json : {};
  const waitState = value.wait_state && typeof value.wait_state === 'object' ? value.wait_state : {};
  const recheck = value.recheck && typeof value.recheck === 'object' ? value.recheck : {};
  const capabilitiesByChannel = {
    instagram: { supports_text: true, supports_attachments: true, supports_public_reply: true },
    tiktok: { supports_text: true, supports_attachments: true, supports_public_reply: true },
    whatsapp: { supports_text: true, supports_attachments: true, supports_public_reply: true },
    email: { supports_text: true, supports_attachments: true, supports_public_reply: true }
  };
  return {
    json: {
      schema_version: '1.0',
      event: {
        schema_version: '1.0',
        brand_id: waitState.brand_id,
        account_id: waitState.account_id,
        inbox_id: waitState.inbox_id,
        channel: waitState.channel,
        channel_capabilities: capabilitiesByChannel[waitState.channel],
        conversation_id: waitState.conversation_id,
        message_id: waitState.anchor_message_id,
        delivery_id: null,
        correlation_id: waitState.correlation_id,
        idempotency_key: waitState.idempotency_fingerprint,
        event_at: recheck.checked_at,
        direction: 'inbound',
        visibility: 'public',
        actor_type: 'contact',
        sender_ref: {
          kind: 'chatwoot_contact',
          id: 'post_delay_synthetic_recheck'
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
        kill_switch: recheck.kill_switch === true
      },
      capabilities: {
        customer_lookup: 'disabled',
        order_lookup: 'disabled'
      },
      context: {
        knowledge_version: waitState.knowledge_version,
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
  };
});
`,
    },
    position: [3850, -160],
  },
});

const buildInvalidWaitStateObservation = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Invalid Wait State No-Action',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => {
  const reason = typeof item.json.fail_reason === 'string' ? item.json.fail_reason : 'wait_state_invalid';
  return {
    json: {
      observation_result: {
        schema_version: '1.0',
        brand_id: 'calapres',
        correlation_id: item.json.correlation_id || 'unknown:edge',
        idempotency_key: item.json.idempotency_key || 'unknown:edge:invalid',
        decision: 'no_action',
        reason_code: reason,
        authority: 'none',
        intent: 'unknown',
        risk: 'unknown',
        draft_allowed: false,
        draft_text: null,
        customer_egress_allowed: false,
        requires_owner_review: false,
        incident_required: true,
        sanitized_audit: {
          event_type: 'edge_rejection',
          reason_code: reason
        }
      },
      customer_egress: { node_present: false, allowed: false }
    }
  };
});
`,
    },
    position: [2810, 100],
  },
});

const buildPostDelayCancellation = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Post-Delay Fail-Closed No-Action',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => {
  const value = item.json && typeof item.json === 'object' ? item.json : {};
  const waitState = value.wait_state && typeof value.wait_state === 'object' ? value.wait_state : {};
  const recheck = value.recheck && typeof value.recheck === 'object' ? value.recheck : {};
  let reason = 'live_recheck_unavailable';
  if (recheck.source_verified !== true) reason = 'live_recheck_unavailable';
  else if (recheck.kill_switch === true) reason = 'brand_kill_switch';
  else if (recheck.generation_matches === false) reason = 'stale_generation';
  else if (recheck.newer_inbound_present === true) reason = 'newer_inbound';
  else if (recheck.public_human_reply_present === true) reason = 'human_intervention';
  else if (recheck.private_owner_instruction_present === true) reason = 'private_owner_instruction';
  else if (recheck.status_changed === true) reason = 'status_changed';
  else if (recheck.owner_changed === true) reason = 'owner_changed';
  else if (typeof value.recheck_reason === 'string') reason = value.recheck_reason;
  return {
    json: {
      observation_result: {
        schema_version: '1.0',
        brand_id: 'calapres',
        correlation_id: waitState.correlation_id || 'unknown:edge',
        idempotency_key: waitState.idempotency_fingerprint || 'unknown:edge:invalid',
        decision: 'no_action',
        reason_code: reason,
        authority: 'none',
        intent: 'unknown',
        risk: 'unknown',
        draft_allowed: false,
        draft_text: null,
        customer_egress_allowed: false,
        requires_owner_review: false,
        incident_required: reason === 'live_recheck_unavailable',
        sanitized_audit: {
          event_type: 'job_cancellation',
          reason_code: reason
        }
      },
      customer_egress: { node_present: false, allowed: false }
    }
  };
});
`,
    },
    position: [3850, 80],
  },
});

const callImmutableCore = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.3,
  config: {
    name: 'Call Immutable Optix Core v1',
    parameters: {
      mode: 'once',
      source: 'database',
      // Immutable deployment binding for the validated Core v1 release.
      workflowId: {
        __rl: true,
        mode: 'id',
        value: 'uCBXuRjlv8NyeikO',
        cachedResultName: 'Optix | Customer Service Core v1',
      },
      options: {
        waitForSubWorkflow: true,
      },
    },
    position: [2550, 0],
  },
});

const enforceObservationBoundary = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Enforce Observation Boundary After Core',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const allowedDecisions = new Set(['no_action', 'observe_draft', 'escalate']);
const allowedAuthorities = new Set(['none', 'draft_only', 'owner_required']);
const allowedRisks = new Set(['low', 'medium', 'high', 'unknown']);
const allowedIntents = new Set([
  'faq', 'order_status', 'tracking', 'inventory', 'product_question',
  'shipping_policy', 'return_request', 'complaint', 'order_change',
  'cancellation', 'refund', 'privacy', 'legal', 'payment_dispute',
  'security', 'general', 'unknown'
]);
const allowedReasonCodes = new Set([
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
    value.brand_id === 'calapres' &&
    nonEmpty(value.correlation_id) && value.correlation_id.length <= 128 &&
    nonEmpty(value.idempotency_key) && value.idempotency_key.length <= 256 &&
    allowedDecisions.has(value.decision) &&
    allowedReasonCodes.has(value.reason_code) &&
    allowedAuthorities.has(value.authority) &&
    allowedIntents.has(value.intent) &&
    allowedRisks.has(value.risk) &&
    typeof value.draft_allowed === 'boolean' &&
    value.customer_egress_allowed === false &&
    typeof value.requires_owner_review === 'boolean' &&
    typeof value.incident_required === 'boolean' &&
    auditValid &&
    decisionConsistent;

  const decision = valid ? {
    schema_version: value.schema_version,
    brand_id: value.brand_id,
    correlation_id: value.correlation_id,
    idempotency_key: value.idempotency_key,
    decision: value.decision,
    reason_code: value.reason_code,
    authority: value.authority,
    intent: value.intent,
    risk: value.risk,
    draft_allowed: value.draft_allowed,
    draft_text: value.draft_text,
    customer_egress_allowed: false,
    requires_owner_review: value.requires_owner_review,
    incident_required: value.incident_required,
    sanitized_audit: {
      event_type: value.sanitized_audit.event_type,
      reason_code: value.sanitized_audit.reason_code
    }
  } : {
    schema_version: '1.0',
    brand_id: 'calapres',
    correlation_id: nonEmpty(value.correlation_id) ? value.correlation_id.slice(0, 128) : 'unknown:edge',
    idempotency_key: nonEmpty(value.idempotency_key) ? value.idempotency_key.slice(0, 256) : 'unknown:edge:invalid',
    decision: 'no_action',
    reason_code: 'edge_rejected_core_output',
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
      reason_code: 'edge_rejected_core_output'
    }
  };

  return {
    json: {
      observation_result: decision,
      customer_egress: {
        node_present: false,
        allowed: false
      }
    }
  };
});
`,
    },
    position: [4370, -160],
  },
});

const buildRejectedObservation = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Fail-Closed Routing Observation',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => {
  const value = item.json;
  const reason = typeof value.fail_reason === 'string' ? value.fail_reason : 'routing_rejected';
  return {
    json: {
      observation_result: {
        schema_version: '1.0',
        brand_id: 'calapres',
        correlation_id: value.correlation_id || 'unknown:edge',
        idempotency_key: value.idempotency_key || 'unknown:edge:invalid',
        decision: 'no_action',
        reason_code: reason,
        authority: 'none',
        intent: 'unknown',
        risk: 'unknown',
        draft_allowed: false,
        draft_text: null,
        customer_egress_allowed: false,
        requires_owner_review: false,
        incident_required: true,
        sanitized_audit: {
          event_type: 'edge_rejection',
          reason_code: reason
        }
      },
      customer_egress: {
        node_present: false,
        allowed: false
      }
    }
  };
});
`,
    },
    position: [1250, 520],
  },
});

const buildDuplicateObservation = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Duplicate No-Action Observation',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => ({
  json: {
    observation_result: {
      schema_version: '1.0',
      brand_id: item.json.envelope.brand_id,
      correlation_id: item.json.envelope.correlation_id,
      idempotency_key: item.json.envelope.idempotency_key,
      decision: 'no_action',
      reason_code: 'duplicate_event',
      authority: 'none',
      intent: 'unknown',
      risk: 'unknown',
      draft_allowed: false,
      draft_text: null,
      customer_egress_allowed: false,
      requires_owner_review: false,
      incident_required: false,
      sanitized_audit: {
        event_type: 'dedup_rejection',
        reason_code: 'duplicate_event'
      }
    },
    customer_egress: { node_present: false, allowed: false }
  }
}));
`,
    },
    position: [1770, 360],
  },
});

const buildStaleObservation = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Stale Generation No-Action Observation',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => ({
  json: {
    observation_result: {
      schema_version: '1.0',
      brand_id: item.json.envelope.brand_id,
      correlation_id: item.json.envelope.correlation_id,
      idempotency_key: item.json.envelope.idempotency_key,
      decision: 'no_action',
      reason_code: 'stale_generation',
      authority: 'none',
      intent: 'unknown',
      risk: 'unknown',
      draft_allowed: false,
      draft_text: null,
      customer_egress_allowed: false,
      requires_owner_review: false,
      incident_required: false,
      sanitized_audit: {
        event_type: 'job_cancellation',
        reason_code: 'stale_generation'
      }
    },
    customer_egress: { node_present: false, allowed: false }
  }
}));
`,
    },
    position: [2290, 240],
  },
});

const auditPreview = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'AUDIT Append Slot - Sanitized Preview No Write',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => {
  const decision = item.json.observation_result;
  return {
    json: {
      ...item.json,
      persistence_preview: {
        audit: {
          table_id: '4YBUAuuEgXYiaybJ',
          required_operation: 'append_sanitized_event',
          write_executed: false,
          record: {
            schema_version: '1.0',
            brand_id: decision.brand_id,
            correlation_id: decision.correlation_id,
            idempotency_key: decision.idempotency_key,
            event_type: decision.sanitized_audit.event_type,
            decision: decision.decision,
            reason_code: decision.reason_code,
            customer_egress_allowed: false
          }
        }
      }
    }
  };
});
`,
    },
    position: [4630, 360],
  },
});

export default workflow('calapres-customer-service-edge-v1', 'Calapres | Customer Service Edge v1')
  .add(manualTest)
  .to(createSanitizedChatwootFixture)
  .to(normalizeAndResolveBrand)
  .to(
    acceptedRoute
      .onTrue(
        dedupReservationSlot.to(
          dedupGate
            .onTrue(
              conversationJobSlot.to(
                generationGate
                  .onTrue(
                    buildSanitizedWaitState.to(
                      waitStateAccepted
                        .onTrue(
                          releaseIdentifiersOnlyState
                            .to(waitForSyntheticQuietWindow)
                            .to(buildPostDelayRecheck)
                            .to(
                              recheckAccepted
                                .onTrue(
                                  buildCoreInput
                                    .to(callImmutableCore)
                                    .to(enforceObservationBoundary)
                                    .to(auditPreview),
                                )
                                .onFalse(buildPostDelayCancellation.to(auditPreview)),
                            ),
                        )
                        .onFalse(buildInvalidWaitStateObservation.to(auditPreview)),
                    ),
                  )
                  .onFalse(buildStaleObservation.to(auditPreview)),
              ),
            )
            .onFalse(buildDuplicateObservation.to(auditPreview)),
        ),
      )
      .onFalse(buildRejectedObservation.to(auditPreview)),
  );
