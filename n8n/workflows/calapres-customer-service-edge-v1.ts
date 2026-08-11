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
        id: '700001',
        inbox_id: 128058,
        status: 'open'
      },
      id: '900001',
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
const DELAY_POLICY_VERSION = '2026-08-11-v1';
const DELAY_RANGES = {
  instagram: { minimum: 30, maximum: 75 },
  tiktok: { minimum: 30, maximum: 75 },
  whatsapp: { minimum: 30, maximum: 75 },
  email: { minimum: 120, maximum: 300 }
};
// Opaque synthetic-test fingerprints only. Live baselines remain unavailable until a
// brand-scoped HMAC secret and a Chatwoot API re-read are bound before the Wait node.
const SYNTHETIC_BASELINE_STATUS_FINGERPRINT = '69c93750429cb5f26d1a3d8d4483d386794b7b5b7076bb3d1bb8c2debafbae17';
const SYNTHETIC_BASELINE_ASSIGNEE_FINGERPRINT = '7b6eba87129f7a3768ef79cc3ae44ccd7535cb9d3a0d0471c9b1ad04cb4397e8';
const SYNTHETIC_BASELINE_KEY_VERSION = 'synthetic-v1';

function asInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function asToken(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim().slice(0, 200);
  return null;
}

function asPositiveDecimalToken(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > 0 && String(parsed) === value) return value;
  }
  return null;
}

function hasOwn(value, field) {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(value, field);
}

function normalizeChatwootCreatedAt(value) {
  if (Number.isInteger(value) && value >= 0) {
    const parsed = new Date(value * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value !== 'string') return null;
  const documentedUtc = value.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) UTC$/);
  const normalized = documentedUtc
    ? documentedUtc[1] + 'T' + documentedUtc[2] + 'Z'
    : value;
  const strictIso = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,3})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;
  if (!strictIso.test(normalized)) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function deterministicDelay(seed, minimum, maximum) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return minimum + (hash % (maximum - minimum + 1));
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
  const accountContainerPresent = hasOwn(raw, 'account');
  const inboxContainerPresent = hasOwn(raw, 'inbox');
  const conversationContainerPresent = hasOwn(raw, 'conversation');
  const accountContainerValid = !accountContainerPresent || (raw.account && typeof raw.account === 'object' && !Array.isArray(raw.account));
  const inboxContainerValid = !inboxContainerPresent || (raw.inbox && typeof raw.inbox === 'object' && !Array.isArray(raw.inbox));
  const conversationContainerValid = !conversationContainerPresent || (raw.conversation && typeof raw.conversation === 'object' && !Array.isArray(raw.conversation));
  const accountIdPresent = accountContainerValid && accountContainerPresent && hasOwn(raw.account, 'id');
  const inboxIdPresent = inboxContainerValid && inboxContainerPresent && hasOwn(raw.inbox, 'id');
  const conversationIdPresent = conversationContainerValid && conversationContainerPresent && hasOwn(raw.conversation, 'id');
  const accountAliasPresent = hasOwn(raw, 'account_id');
  const inboxAliasPresent = hasOwn(raw, 'inbox_id');
  const conversationAliasPresent = hasOwn(raw, 'conversation_id');
  const primaryMessageIdPresent = hasOwn(raw, 'id');
  const messageAliasPresent = hasOwn(raw, 'message_id');
  const conversationInboxPresent = conversationContainerValid && conversationContainerPresent && hasOwn(raw.conversation, 'inbox_id');
  const conversationAccountPresent = conversationContainerValid && conversationContainerPresent && hasOwn(raw.conversation, 'account_id');
  const accountId = asInteger(accountContainerPresent
    ? (accountIdPresent ? raw.account.id : null)
    : (accountAliasPresent ? raw.account_id : null));
  const payloadInboxId = asInteger(inboxContainerPresent
    ? (inboxIdPresent ? raw.inbox.id : null)
    : (inboxAliasPresent ? raw.inbox_id : null));
  const conversationInboxId = asInteger(conversationInboxPresent ? raw.conversation.inbox_id : null);
  const conversationAccountId = asInteger(conversationAccountPresent ? raw.conversation.account_id : null);
  const inboxId = payloadInboxId;
  const mapping = inboxId !== null ? INBOXES[inboxId] : null;
  const nestedConversationId = conversationIdPresent ? raw.conversation.id : null;
  const aliasConversationId = conversationAliasPresent ? raw.conversation_id : null;
  const primaryMessageId = primaryMessageIdPresent ? raw.id : null;
  const aliasMessageId = messageAliasPresent ? raw.message_id : null;
  const conversationId = asPositiveDecimalToken(conversationContainerPresent ? nestedConversationId : aliasConversationId);
  const messageId = asPositiveDecimalToken(primaryMessageIdPresent ? primaryMessageId : aliasMessageId);
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
  const syntheticFixture = trustedIngress.kind === 'synthetic_manual_fixture';
  const eventAt = normalizeChatwootCreatedAt(raw.created_at);
  const issues = [];

  if (!signatureVerified) issues.push('signature_not_verified');
  if (!replayVerified) issues.push('replay_protection_not_verified');
  if (!accountContainerValid) issues.push('account_container_invalid');
  if (!inboxContainerValid) issues.push('inbox_container_invalid');
  if (!conversationContainerValid) issues.push('conversation_container_invalid');
  if (accountId !== ACCOUNT_ID) issues.push('account_not_allowlisted');
  if (!mapping) issues.push('inbox_not_allowlisted');
  if (conversationInboxPresent && conversationInboxId !== payloadInboxId) issues.push('inbox_mismatch');
  if (conversationAccountPresent && conversationAccountId !== accountId) issues.push('account_mismatch');
  if (accountContainerPresent && accountAliasPresent) issues.push('account_id_alias_conflict');
  if (inboxContainerPresent && inboxAliasPresent) issues.push('inbox_id_alias_conflict');
  if (conversationContainerPresent && conversationAliasPresent) issues.push('conversation_id_alias_conflict');
  if (primaryMessageIdPresent && messageAliasPresent) issues.push('message_id_alias_conflict');
  if (raw.event !== 'message_created') issues.push('event_not_supported');
  if (!isIncoming) issues.push('message_not_inbound');
  if (isPrivate) issues.push('private_note_rejected');
  if (isBot) issues.push('bot_echo_rejected');
  if (!conversationId) issues.push('conversation_id_missing');
  if (!messageId) issues.push('message_id_missing');
  if (!senderId) issues.push('sender_ref_missing');
  if (!eventAt) issues.push('event_time_invalid');

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
  const eventIdentityKeyVersion = syntheticFixture ? 'synthetic-event-identity-v1' : null;
  const eventIdentityFingerprint = syntheticFixture
    ? '9ee62926cfd806b00e5b45c93bafb9ccbe8d58b09bbb0de574c15b39c5802445'
    : null;
  const delaySeed = 'calapres:' + accountId + ':' + inboxId + ':' + conversationId + ':' + messageId;
  const delayRange = DELAY_RANGES[mapping.channel];
  const delayMode = syntheticFixture ? 'synthetic_test' : 'live_observation';
  const delaySeconds = syntheticFixture
    ? 1
    : deterministicDelay(delaySeed, delayRange.minimum, delayRange.maximum);
  const notBefore = new Date(Date.parse(eventAt) + delaySeconds * 1000).toISOString();

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
        idempotency_key: eventIdentityFingerprint,
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
        kill_switch: !syntheticFixture
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
        dedup_status: syntheticFixture && syntheticControls.dedup_status === 'duplicate' ? 'duplicate' : 'unique',
        generation_status: syntheticFixture && syntheticControls.generation_status === 'stale' ? 'stale' : 'current'
      },
      delay_contract: {
        conversation_fingerprint: '1111111111111111111111111111111111111111111111111111111111111111',
        message_fingerprint: 'e58778e190933f4362cbb155dcc0a3d39866c9cb59be701c75751eae5eaf3a5a',
        event_identity_key_version: eventIdentityKeyVersion,
        event_identity_fingerprint: eventIdentityFingerprint,
        generation: 1,
        baseline_fingerprint_key_version: syntheticFixture ? SYNTHETIC_BASELINE_KEY_VERSION : null,
        baseline_status_fingerprint: syntheticFixture ? SYNTHETIC_BASELINE_STATUS_FINGERPRINT : null,
        baseline_assignee_fingerprint: syntheticFixture ? SYNTHETIC_BASELINE_ASSIGNEE_FINGERPRINT : null,
        delay_policy_version: DELAY_POLICY_VERSION,
        delay_mode: delayMode,
        delay_seconds: delaySeconds,
        not_before: notBefore,
        fixture_ref: syntheticFixture ? 'fixture_clear_001' : null
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
  const value = item.json && typeof item.json === 'object' ? item.json : {};
  const envelope = value.envelope && typeof value.envelope === 'object' ? value.envelope : {};
  const delay = value.delay_contract && typeof value.delay_contract === 'object' ? value.delay_contract : {};
  const storage = value.storage_refs && typeof value.storage_refs === 'object' ? value.storage_refs : {};
  const isUnique = Boolean(value.test_control && value.test_control.dedup_status === 'unique');
  const correlationTokenPattern = /^[1-9][0-9]{0,15}$/;
  const inboxes = {
    128031: 'instagram',
    128033: 'tiktok',
    128058: 'whatsapp',
    128326: 'email'
  };
  const eventAt = Date.parse(envelope.event_at);
  const expectedCorrelation = 'calapres:' + envelope.conversation_id + ':' + envelope.message_id;
  const rowConforms =
    envelope.brand_id === 'calapres' &&
    envelope.account_id === 179973 &&
    inboxes[envelope.inbox_id] === envelope.channel &&
    /^(synthetic-event-identity-v[1-9][0-9]*|calapres-identity-hmac-v[1-9][0-9]*)$/.test(delay.event_identity_key_version || '') &&
    /^[a-f0-9]{64}$/.test(delay.event_identity_fingerprint || '') &&
    envelope.idempotency_key === delay.event_identity_fingerprint &&
    correlationTokenPattern.test(envelope.message_id || '') &&
    correlationTokenPattern.test(envelope.conversation_id || '') &&
    envelope.correlation_id === expectedCorrelation &&
    Number.isFinite(eventAt);
  const previewReady = rowConforms &&
    delay.delay_mode === 'synthetic_test' &&
    delay.fixture_ref === 'fixture_clear_001' &&
    delay.event_identity_key_version === 'synthetic-event-identity-v1' &&
    delay.event_identity_fingerprint === '9ee62926cfd806b00e5b45c93bafb9ccbe8d58b09bbb0de574c15b39c5802445';
  const tableRow = previewReady ? {
    event_key: delay.event_identity_fingerprint,
    delivery_id: null,
    message_id: null,
    conversation_id: null,
    channel: null,
    correlation_id: null,
    status: 'claimed',
    received_at: new Date(eventAt).toISOString(),
    processed_at: null,
    expires_at: new Date(eventAt + (7 * 24 * 60 * 60 * 1000)).toISOString()
  } : null;
  return {
    json: {
      ...value,
      dedup_gate: {
        table_id: storage.dedup_table_id || 'PgsnBFCtwWGysCdp',
        key_ref: envelope.idempotency_key || null,
        required_operation: 'non_atomic_lookup_then_prepare_reservation',
        write_executed: false,
        atomicity_guaranteed: false,
        persistable: false,
        persistence_ready: false,
        preview_ready: previewReady,
        event_key_semantics: 'event_identity_fingerprint',
        request_replay_store_state: 'unimplemented_separate_store',
        business_dedup_store_separate: true,
        future_live_received_at_semantics: 'trusted_verifier_receipt_time',
        future_live_preconditions: [
          'verified_request_replay_claim',
          'separate_request_replay_store',
          'event_identity_hmac_credential',
          'event_identity_key_version_dual_read_through_dedup_ttl',
          'trusted_verifier_receipt_time',
          'atomic_event_identity_reservation',
          'live_table_schema_reverification'
        ],
        table_row: tableRow,
        gate_passed: isUnique && previewReady,
        reason_code: !rowConforms
          ? 'dedup_projection_invalid'
          : !previewReady
            ? 'dedup_live_state_unavailable'
            : isUnique
              ? 'manual_fixture_unique'
              : 'duplicate_event'
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
  const value = item.json && typeof item.json === 'object' ? item.json : {};
  const envelope = value.envelope && typeof value.envelope === 'object' ? value.envelope : {};
  const delay = value.delay_contract && typeof value.delay_contract === 'object' ? value.delay_contract : {};
  const storage = value.storage_refs && typeof value.storage_refs === 'object' ? value.storage_refs : {};
  const current = Boolean(value.test_control && value.test_control.generation_status === 'current');
  const tokenPattern = /^[A-Za-z0-9_-]{1,64}$/;
  const inboxes = {
    128031: 'instagram',
    128033: 'tiktok',
    128058: 'whatsapp',
    128326: 'email'
  };
  const eventAt = Date.parse(envelope.event_at);
  const dueAt = Date.parse(delay.not_before);
  const expectedCorrelation = 'calapres:' + envelope.conversation_id + ':' + envelope.message_id;
  const rowConforms =
    envelope.brand_id === 'calapres' &&
    envelope.account_id === 179973 &&
    inboxes[envelope.inbox_id] === envelope.channel &&
    tokenPattern.test(envelope.conversation_id || '') &&
    tokenPattern.test(envelope.message_id || '') &&
    envelope.correlation_id === expectedCorrelation &&
    Number.isFinite(eventAt) &&
    Number.isFinite(dueAt) &&
    dueAt >= eventAt;
  const previewReady = rowConforms &&
    delay.delay_mode === 'synthetic_test' &&
    delay.fixture_ref === 'fixture_clear_001';
  const tableRow = previewReady ? {
    job_key: envelope.brand_id + ':' + envelope.conversation_id,
    conversation_id: envelope.conversation_id,
    channel: envelope.channel,
    generation_token: envelope.message_id,
    last_message_id: envelope.message_id,
    correlation_id: envelope.correlation_id,
    status: 'waiting',
    human_owned: false,
    due_at: new Date(dueAt).toISOString(),
    updated_at: new Date(eventAt).toISOString()
  } : null;
  return {
    json: {
      ...value,
      conversation_job: {
        table_id: storage.jobs_table_id || '9wy6FpcDoNbrK3BM',
        job_key: rowConforms ? envelope.brand_id + ':' + envelope.conversation_id : null,
        generation_token: rowConforms ? envelope.message_id : null,
        generation: Number.isInteger(delay.generation) ? delay.generation : null,
        required_operation: 'non_atomic_read_then_prepare_generation',
        write_executed: false,
        atomicity_guaranteed: false,
        persistable: false,
        persistence_ready: false,
        preview_ready: previewReady,
        table_row: tableRow,
        generation_current: current && previewReady,
        reason_code: !rowConforms
          ? 'job_projection_invalid'
          : !previewReady
            ? 'job_live_state_unavailable'
            : current
              ? 'manual_fixture_current'
              : 'stale_generation'
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
const baselineKeyVersionPattern = /^(synthetic-v[1-9][0-9]*|calapres-hmac-v[1-9][0-9]*)$/;
const tokenPattern = /^[1-9][0-9]{0,15}$/;
const CHAT_CHANNELS = new Set(['instagram', 'tiktok', 'whatsapp']);
const SYNTHETIC_BASELINE_STATUS_FINGERPRINT = '69c93750429cb5f26d1a3d8d4483d386794b7b5b7076bb3d1bb8c2debafbae17';
const SYNTHETIC_BASELINE_ASSIGNEE_FINGERPRINT = '7b6eba87129f7a3768ef79cc3ae44ccd7535cb9d3a0d0471c9b1ad04cb4397e8';
const SYNTHETIC_BASELINE_KEY_VERSION = 'synthetic-v1';
// wait_state_fingerprint = SHA-256(UTF-8(minified JSON)) with the fingerprint
// itself excluded and keys inserted in this exact, versioned order.
const WAIT_CARRIER_FIELD_ORDER = [
  'schema_version', 'brand_id', 'account_id', 'inbox_id', 'channel',
  'conversation_id', 'anchor_message_id', 'conversation_fingerprint',
  'message_fingerprint', 'correlation_id', 'event_identity_key_version',
  'event_identity_fingerprint',
  'generation', 'baseline_fingerprint_key_version', 'baseline_status_fingerprint',
  'baseline_assignee_fingerprint',
  'delay_policy_version', 'delay_mode', 'delay_seconds', 'not_before',
  'knowledge_version', 'fixture_ref', 'customer_egress_allowed'
];
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function utf8Bytes(value) {
  const bytes = [];
  for (const symbol of value) {
    const codePoint = symbol.codePointAt(0);
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >>> 12), 0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xf0 | (codePoint >>> 18), 0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    }
  }
  return bytes;
}

function rotateRight(value, shift) {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256Hex(value) {
  const bytes = utf8Bytes(value);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      words[index] = ((bytes[start] << 24) | (bytes[start + 1] << 16) |
        (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15];
      const y = words[index - 2];
      const sigma0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const sigma1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temporary1 = (h + sum1 + choose + SHA256_K[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
}

function canonicalWaitCarrier(value) {
  const ordered = {};
  for (const field of WAIT_CARRIER_FIELD_ORDER) ordered[field] = value[field];
  return JSON.stringify(ordered);
}

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
  if (!/^(synthetic-event-identity-v[1-9][0-9]*|calapres-identity-hmac-v[1-9][0-9]*)$/.test(delay.event_identity_key_version || '')) issues.push('wait_event_identity_key_version_invalid');
  if (!fingerprintPattern.test(delay.event_identity_fingerprint || '')) issues.push('wait_event_identity_fingerprint_invalid');
  const syntheticIdentityValid =
    delay.delay_mode !== 'synthetic_test' ||
    (
      event.brand_id === 'calapres' &&
      event.account_id === 179973 &&
      event.inbox_id === 128058 &&
      event.channel === 'whatsapp' &&
      event.conversation_id === '700001' &&
      event.message_id === '900001' &&
      event.correlation_id === 'calapres:700001:900001' &&
      delay.conversation_fingerprint === '1111111111111111111111111111111111111111111111111111111111111111' &&
      delay.message_fingerprint === 'e58778e190933f4362cbb155dcc0a3d39866c9cb59be701c75751eae5eaf3a5a' &&
      delay.event_identity_key_version === 'synthetic-event-identity-v1' &&
      delay.event_identity_fingerprint === '9ee62926cfd806b00e5b45c93bafb9ccbe8d58b09bbb0de574c15b39c5802445'
    );
  if (!syntheticIdentityValid) issues.push('wait_synthetic_identity_mismatch');
  if (!Number.isInteger(delay.generation) || delay.generation < 1) issues.push('wait_generation_invalid');
  if (delay.delay_policy_version !== '2026-08-11-v1') issues.push('wait_delay_policy_version_invalid');
  if (delay.delay_mode !== 'synthetic_test' && delay.delay_mode !== 'live_observation') issues.push('wait_delay_mode_invalid');
  if (!Number.isInteger(delay.delay_seconds)) issues.push('wait_delay_seconds_invalid');
  if (delay.delay_mode === 'synthetic_test' && delay.delay_seconds !== 1) issues.push('wait_synthetic_delay_invalid');
  if (delay.delay_mode === 'synthetic_test' && typeof delay.fixture_ref !== 'string') issues.push('wait_synthetic_fixture_invalid');
  if (delay.delay_mode === 'live_observation' && delay.fixture_ref !== null) issues.push('wait_live_fixture_forbidden');
  if (delay.delay_mode === 'live_observation' && CHAT_CHANNELS.has(event.channel) &&
      (!Number.isInteger(delay.delay_seconds) || delay.delay_seconds < 30 || delay.delay_seconds > 75)) {
    issues.push('wait_chat_delay_out_of_range');
  }
  if (delay.delay_mode === 'live_observation' && event.channel === 'email' &&
      (!Number.isInteger(delay.delay_seconds) || delay.delay_seconds < 120 || delay.delay_seconds > 300)) {
    issues.push('wait_email_delay_out_of_range');
  }
  const eventTimestamp = typeof event.event_at === 'string' ? Date.parse(event.event_at) : NaN;
  const notBeforeTimestamp = typeof delay.not_before === 'string' ? Date.parse(delay.not_before) : NaN;
  if (typeof delay.not_before !== 'string' || Number.isNaN(Date.parse(delay.not_before))) issues.push('wait_not_before_invalid');
  if (!Number.isNaN(eventTimestamp) && !Number.isNaN(notBeforeTimestamp) && Number.isInteger(delay.delay_seconds) &&
      notBeforeTimestamp !== eventTimestamp + delay.delay_seconds * 1000) {
    issues.push('wait_delay_deadline_mismatch');
  }
  if (typeof value.context?.knowledge_version !== 'string') issues.push('wait_knowledge_version_invalid');
  if (delay.delay_mode === 'live_observation') issues.push('wait_live_baseline_capture_unavailable');
  if (!baselineKeyVersionPattern.test(delay.baseline_fingerprint_key_version || '')) issues.push('wait_baseline_key_version_invalid');
  if (!fingerprintPattern.test(delay.baseline_status_fingerprint || '')) issues.push('wait_baseline_status_fingerprint_invalid');
  if (!fingerprintPattern.test(delay.baseline_assignee_fingerprint || '')) issues.push('wait_baseline_assignee_fingerprint_invalid');
  if (delay.delay_mode === 'synthetic_test' && delay.baseline_status_fingerprint !== SYNTHETIC_BASELINE_STATUS_FINGERPRINT) {
    issues.push('wait_synthetic_baseline_status_mismatch');
  }
  if (delay.delay_mode === 'synthetic_test' && delay.baseline_assignee_fingerprint !== SYNTHETIC_BASELINE_ASSIGNEE_FINGERPRINT) {
    issues.push('wait_synthetic_baseline_assignee_mismatch');
  }
  if (delay.delay_mode === 'synthetic_test' && delay.baseline_fingerprint_key_version !== SYNTHETIC_BASELINE_KEY_VERSION) {
    issues.push('wait_synthetic_baseline_key_version_mismatch');
  }

  const carrierWithoutFingerprint = issues.length === 0 ? {
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
    event_identity_key_version: delay.event_identity_key_version,
    event_identity_fingerprint: delay.event_identity_fingerprint,
    generation: delay.generation,
    baseline_fingerprint_key_version: delay.baseline_fingerprint_key_version,
    baseline_status_fingerprint: delay.baseline_status_fingerprint,
    baseline_assignee_fingerprint: delay.baseline_assignee_fingerprint,
    delay_policy_version: delay.delay_policy_version,
    delay_mode: delay.delay_mode,
    delay_seconds: delay.delay_seconds,
    not_before: delay.not_before,
    knowledge_version: value.context.knowledge_version,
    fixture_ref: delay.fixture_ref,
    customer_egress_allowed: false
  } : null;
  const waitState = carrierWithoutFingerprint ? {
    schema_version: carrierWithoutFingerprint.schema_version,
    brand_id: carrierWithoutFingerprint.brand_id,
    account_id: carrierWithoutFingerprint.account_id,
    inbox_id: carrierWithoutFingerprint.inbox_id,
    channel: carrierWithoutFingerprint.channel,
    conversation_id: carrierWithoutFingerprint.conversation_id,
    anchor_message_id: carrierWithoutFingerprint.anchor_message_id,
    conversation_fingerprint: carrierWithoutFingerprint.conversation_fingerprint,
    message_fingerprint: carrierWithoutFingerprint.message_fingerprint,
    correlation_id: carrierWithoutFingerprint.correlation_id,
    event_identity_key_version: carrierWithoutFingerprint.event_identity_key_version,
    event_identity_fingerprint: carrierWithoutFingerprint.event_identity_fingerprint,
    generation: carrierWithoutFingerprint.generation,
    wait_state_fingerprint: sha256Hex(canonicalWaitCarrier(carrierWithoutFingerprint)),
    baseline_fingerprint_key_version: carrierWithoutFingerprint.baseline_fingerprint_key_version,
    baseline_status_fingerprint: carrierWithoutFingerprint.baseline_status_fingerprint,
    baseline_assignee_fingerprint: carrierWithoutFingerprint.baseline_assignee_fingerprint,
    delay_policy_version: carrierWithoutFingerprint.delay_policy_version,
    delay_mode: carrierWithoutFingerprint.delay_mode,
    delay_seconds: carrierWithoutFingerprint.delay_seconds,
    not_before: carrierWithoutFingerprint.not_before,
    knowledge_version: carrierWithoutFingerprint.knowledge_version,
    fixture_ref: carrierWithoutFingerprint.fixture_ref,
    customer_egress_allowed: false
  } : null;

  return {
    json: {
      accepted: issues.length === 0,
      fail_reason: issues.length === 0 ? null : issues[0],
      wait_state: waitState,
      correlation_id: typeof event.correlation_id === 'string' ? event.correlation_id : 'unknown:edge',
      idempotency_key: fingerprintPattern.test(delay.event_identity_fingerprint || '')
        ? delay.event_identity_fingerprint
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

const waitForChannelPolicyQuietWindow = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Wait With Channel Policy - Identifiers Only',
    parameters: {
      resume: 'timeInterval',
      amount: expr('{{ $json.delay_seconds }}'),
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
const fingerprintPattern = /^[a-f0-9]{64}$/;
const baselineKeyVersionPattern = /^(synthetic-v[1-9][0-9]*|calapres-hmac-v[1-9][0-9]*)$/;
const SYNTHETIC_BASELINE_STATUS_FINGERPRINT = '69c93750429cb5f26d1a3d8d4483d386794b7b5b7076bb3d1bb8c2debafbae17';
const SYNTHETIC_BASELINE_ASSIGNEE_FINGERPRINT = '7b6eba87129f7a3768ef79cc3ae44ccd7535cb9d3a0d0471c9b1ad04cb4397e8';
const SYNTHETIC_BASELINE_KEY_VERSION = 'synthetic-v1';
const WAIT_CARRIER_FIELD_ORDER = [
  'schema_version', 'brand_id', 'account_id', 'inbox_id', 'channel',
  'conversation_id', 'anchor_message_id', 'conversation_fingerprint',
  'message_fingerprint', 'correlation_id', 'event_identity_key_version',
  'event_identity_fingerprint',
  'generation', 'baseline_fingerprint_key_version', 'baseline_status_fingerprint',
  'baseline_assignee_fingerprint',
  'delay_policy_version', 'delay_mode', 'delay_seconds', 'not_before',
  'knowledge_version', 'fixture_ref', 'customer_egress_allowed'
];
const WAIT_CARRIER_EXACT_KEYS = new Set([
  ...WAIT_CARRIER_FIELD_ORDER,
  'wait_state_fingerprint'
]);
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function utf8Bytes(value) {
  const bytes = [];
  for (const symbol of value) {
    const codePoint = symbol.codePointAt(0);
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >>> 12), 0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xf0 | (codePoint >>> 18), 0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    }
  }
  return bytes;
}

function rotateRight(value, shift) {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256Hex(value) {
  const bytes = utf8Bytes(value);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      words[index] = ((bytes[start] << 24) | (bytes[start + 1] << 16) |
        (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15];
      const y = words[index - 2];
      const sigma0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const sigma1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temporary1 = (h + sum1 + choose + SHA256_K[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
}

function canonicalWaitCarrier(value) {
  const ordered = {};
  for (const field of WAIT_CARRIER_FIELD_ORDER) ordered[field] = value[field];
  return JSON.stringify(ordered);
}

return $input.all().map((item) => {
  const waitState = item.json && typeof item.json === 'object' ? item.json : {};
  const computedWaitFingerprint = sha256Hex(canonicalWaitCarrier(waitState));
  const waitStateExactShape =
    Object.keys(waitState).length === WAIT_CARRIER_EXACT_KEYS.size &&
    Object.keys(waitState).every((key) => WAIT_CARRIER_EXACT_KEYS.has(key));
  const waitFingerprintValid =
    waitStateExactShape &&
    fingerprintPattern.test(waitState.wait_state_fingerprint || '') &&
    waitState.wait_state_fingerprint === computedWaitFingerprint;
  const baselineFingerprintsValid =
    baselineKeyVersionPattern.test(waitState.baseline_fingerprint_key_version || '') &&
    fingerprintPattern.test(waitState.baseline_status_fingerprint || '') &&
    fingerprintPattern.test(waitState.baseline_assignee_fingerprint || '');
  const syntheticBaselinesValid =
    waitState.baseline_fingerprint_key_version === SYNTHETIC_BASELINE_KEY_VERSION &&
    waitState.baseline_status_fingerprint === SYNTHETIC_BASELINE_STATUS_FINGERPRINT &&
    waitState.baseline_assignee_fingerprint === SYNTHETIC_BASELINE_ASSIGNEE_FINGERPRINT;
  const syntheticIdentityValid =
    waitState.brand_id === 'calapres' &&
    waitState.account_id === 179973 &&
    waitState.inbox_id === 128058 &&
    waitState.channel === 'whatsapp' &&
    waitState.conversation_id === '700001' &&
    waitState.anchor_message_id === '900001' &&
    waitState.conversation_fingerprint === '1111111111111111111111111111111111111111111111111111111111111111' &&
    waitState.message_fingerprint === 'e58778e190933f4362cbb155dcc0a3d39866c9cb59be701c75751eae5eaf3a5a' &&
    waitState.correlation_id === 'calapres:700001:900001' &&
    waitState.event_identity_key_version === 'synthetic-event-identity-v1' &&
    waitState.event_identity_fingerprint === '9ee62926cfd806b00e5b45c93bafb9ccbe8d58b09bbb0de574c15b39c5802445' &&
    waitState.delay_policy_version === '2026-08-11-v1' &&
    waitState.delay_seconds === 1 &&
    waitState.not_before === '2026-08-11T12:00:01.000Z' &&
    waitState.knowledge_version === '2026-08-11-v3' &&
    waitState.customer_egress_allowed === false;
  const syntheticClear =
    waitState.fixture_ref === 'fixture_clear_001' &&
    waitState.delay_mode === 'synthetic_test' &&
    waitFingerprintValid &&
    baselineFingerprintsValid &&
    syntheticBaselinesValid &&
    syntheticIdentityValid;
  const recheckReason = !waitFingerprintValid
    ? 'wait_state_fingerprint_mismatch'
    : !baselineFingerprintsValid
      ? 'baseline_fingerprint_invalid'
      : waitState.fixture_ref === 'fixture_clear_001' && !syntheticBaselinesValid
        ? 'synthetic_baseline_fingerprint_mismatch'
        : waitState.fixture_ref === 'fixture_clear_001' && !syntheticIdentityValid
          ? 'synthetic_fixture_binding_mismatch'
        : syntheticClear
          ? 'synthetic_recheck_clear'
          : 'live_recheck_unavailable';
  const recheck = {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: waitState.account_id,
    inbox_id: waitState.inbox_id,
    channel: waitState.channel,
    conversation_id: waitState.conversation_id,
    anchor_message_id: waitState.anchor_message_id,
    generation: waitState.generation,
    wait_state_fingerprint: waitState.wait_state_fingerprint,
    baseline_fingerprint_key_version: waitState.baseline_fingerprint_key_version,
    baseline_status_fingerprint: waitState.baseline_status_fingerprint,
    baseline_assignee_fingerprint: waitState.baseline_assignee_fingerprint,
    evidence_source: syntheticClear ? 'synthetic_fixture' : 'chatwoot_live_read',
    source_verified: syntheticClear,
    generation_matches: syntheticClear,
    newer_inbound_present: false,
    public_human_reply_present: false,
    private_owner_instruction_present: false,
    status_changed: false,
    owner_changed: false,
    kill_switch: !syntheticClear,
    eligible_for_observation: syntheticClear,
    checked_at: syntheticClear ? '2026-08-11T12:00:02.000Z' : new Date().toISOString(),
    customer_egress_allowed: false
  };
  return {
    json: {
      wait_state: waitState,
      recheck,
      recheck_gate_passed: syntheticClear,
      recheck_reason: recheckReason,
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
        idempotency_key: waitState.event_identity_fingerprint,
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
  const integrityReasons = new Set([
    'wait_state_fingerprint_mismatch',
    'baseline_fingerprint_invalid',
    'synthetic_baseline_fingerprint_mismatch'
  ]);
  let reason = 'live_recheck_unavailable';
  if (integrityReasons.has(value.recheck_reason)) reason = value.recheck_reason;
  else if (recheck.source_verified !== true) reason = 'live_recheck_unavailable';
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
        idempotency_key: waitState.event_identity_fingerprint || 'unknown:edge:invalid',
        decision: 'no_action',
        reason_code: reason,
        authority: 'none',
        intent: 'unknown',
        risk: 'unknown',
        draft_allowed: false,
        draft_text: null,
        customer_egress_allowed: false,
        requires_owner_review: false,
        incident_required: reason === 'live_recheck_unavailable' || integrityReasons.has(reason),
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
    const syntheticPreview =
      decision.correlation_id === 'calapres:700001:900001' &&
      decision.idempotency_key === '9ee62926cfd806b00e5b45c93bafb9ccbe8d58b09bbb0de574c15b39c5802445';

    return {
      json: {
        observation_result: decision,
        preview_provenance: {
          kind: syntheticPreview ? 'synthetic_manual_fixture' : 'live_unverified',
          fixture_ref: syntheticPreview ? 'fixture_clear_001' : null,
          static_fingerprints: syntheticPreview,
          persistable: false
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
  return $input.all().map((item) => {
    const allowedReasons = new Set(['duplicate_event', 'dedup_projection_invalid', 'dedup_live_state_unavailable']);
    const suppliedReason = item.json && item.json.dedup_gate ? item.json.dedup_gate.reason_code : null;
    const reason = allowedReasons.has(suppliedReason) ? suppliedReason : 'dedup_projection_invalid';
    const incidentRequired = reason !== 'duplicate_event';
    return {
      json: {
        observation_result: {
        schema_version: '1.0',
        brand_id: item.json.envelope.brand_id,
        correlation_id: item.json.envelope.correlation_id,
        idempotency_key: item.json.delay_contract.event_identity_fingerprint,
        decision: 'no_action',
        reason_code: reason,
        authority: 'none',
        intent: 'unknown',
        risk: 'unknown',
        draft_allowed: false,
        draft_text: null,
        customer_egress_allowed: false,
        requires_owner_review: false,
        incident_required: incidentRequired,
        sanitized_audit: {
          event_type: 'dedup_rejection',
          reason_code: reason
        }
      },
        preview_provenance: {
          kind: item.json.delay_contract.delay_mode === 'synthetic_test'
            ? 'synthetic_manual_fixture'
            : 'live_unverified',
          fixture_ref: item.json.delay_contract.fixture_ref,
          static_fingerprints: true,
          persistable: false
        },
        customer_egress: { node_present: false, allowed: false }
      }
    };
  });
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
  return $input.all().map((item) => {
    const allowedReasons = new Set(['stale_generation', 'job_projection_invalid', 'job_live_state_unavailable']);
    const suppliedReason = item.json && item.json.conversation_job ? item.json.conversation_job.reason_code : null;
    const reason = allowedReasons.has(suppliedReason) ? suppliedReason : 'job_projection_invalid';
    const incidentRequired = reason !== 'stale_generation';
    return {
      json: {
        observation_result: {
        schema_version: '1.0',
        brand_id: item.json.envelope.brand_id,
        correlation_id: item.json.envelope.correlation_id,
        idempotency_key: item.json.delay_contract.event_identity_fingerprint,
        decision: 'no_action',
        reason_code: reason,
        authority: 'none',
        intent: 'unknown',
        risk: 'unknown',
        draft_allowed: false,
        draft_text: null,
        customer_egress_allowed: false,
        requires_owner_review: false,
        incident_required: incidentRequired,
        sanitized_audit: {
          event_type: 'job_cancellation',
          reason_code: reason
        }
      },
        preview_provenance: {
          kind: item.json.delay_contract.delay_mode === 'synthetic_test'
            ? 'synthetic_manual_fixture'
            : 'live_unverified',
          fixture_ref: item.json.delay_contract.fixture_ref,
          static_fingerprints: true,
          persistable: false
        },
        customer_egress: { node_present: false, allowed: false }
      }
    };
  });
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
  const wrapper = item.json && typeof item.json === 'object' ? item.json : {};
  const decision = wrapper.observation_result && typeof wrapper.observation_result === 'object'
    ? wrapper.observation_result
    : {};
  const provenance = wrapper.preview_provenance && typeof wrapper.preview_provenance === 'object'
    ? wrapper.preview_provenance
    : {};
  const exactDecisionKeys = new Set([
    'schema_version', 'brand_id', 'correlation_id', 'idempotency_key',
    'decision', 'reason_code', 'authority', 'intent', 'risk', 'draft_allowed',
    'draft_text', 'customer_egress_allowed', 'requires_owner_review',
    'incident_required', 'sanitized_audit'
  ]);
  const exactShape =
    Object.keys(decision).length === exactDecisionKeys.size &&
    Object.keys(decision).every((key) => exactDecisionKeys.has(key));
  const allowedDecisions = new Set(['no_action', 'observe_draft', 'escalate']);
  const allowedAuthorities = new Set(['none', 'draft_only', 'owner_required']);
  const allowedIntents = new Set([
    'faq', 'order_status', 'tracking', 'inventory', 'product_question',
    'shipping_policy', 'return_request', 'complaint', 'order_change',
    'cancellation', 'refund', 'privacy', 'legal', 'payment_dispute',
    'security', 'general', 'unknown'
  ]);
  const allowedRisks = new Set(['low', 'medium', 'high', 'unknown']);
  const allowedReasonCodes = new Set([
    'envelope_invalid', 'runtime_not_observation', 'brand_kill_switch',
    'unsupported_content', 'structured_candidate_missing',
    'knowledge_reference_unverified', 'knowledge_authority_required',
    'live_fact_reference_unverified', 'owner_authority_required',
    'live_facts_not_verified', 'confidence_below_threshold',
    'grounded_draft_missing', 'grounded_draft_observed', 'core_output_invalid',
    'edge_rejected_core_output', 'signature_not_verified',
    'replay_protection_not_verified', 'account_not_allowlisted',
    'inbox_not_allowlisted', 'inbox_mismatch', 'event_not_supported',
    'account_container_invalid', 'inbox_container_invalid',
    'conversation_container_invalid', 'account_mismatch',
    'account_id_alias_conflict', 'inbox_id_alias_conflict',
    'conversation_id_alias_conflict', 'message_id_alias_conflict',
    'message_not_inbound', 'private_note_rejected', 'bot_echo_rejected',
    'conversation_id_missing', 'message_id_missing', 'sender_ref_missing',
    'event_time_invalid', 'routing_rejected', 'duplicate_event',
    'dedup_projection_invalid', 'dedup_live_state_unavailable',
    'stale_generation', 'job_projection_invalid', 'job_live_state_unavailable',
    'wait_state_invalid', 'wait_brand_invalid', 'wait_account_invalid',
    'wait_inbox_channel_invalid', 'wait_conversation_id_invalid',
    'wait_message_id_invalid', 'wait_conversation_fingerprint_invalid',
    'wait_message_fingerprint_invalid', 'wait_event_identity_key_version_invalid',
    'wait_event_identity_fingerprint_invalid',
    'wait_generation_invalid', 'wait_delay_policy_version_invalid',
    'wait_delay_mode_invalid', 'wait_delay_seconds_invalid',
    'wait_synthetic_delay_invalid', 'wait_synthetic_fixture_invalid',
    'wait_live_fixture_forbidden', 'wait_chat_delay_out_of_range',
    'wait_email_delay_out_of_range', 'wait_not_before_invalid',
    'wait_delay_deadline_mismatch', 'wait_knowledge_version_invalid',
    'wait_live_baseline_capture_unavailable',
    'wait_baseline_key_version_invalid',
    'wait_baseline_status_fingerprint_invalid',
    'wait_baseline_assignee_fingerprint_invalid',
    'wait_synthetic_baseline_status_mismatch',
    'wait_synthetic_baseline_assignee_mismatch',
    'wait_synthetic_baseline_key_version_mismatch',
    'wait_state_fingerprint_mismatch', 'baseline_fingerprint_invalid',
    'synthetic_baseline_fingerprint_mismatch',
    'live_recheck_unavailable', 'newer_inbound', 'human_intervention',
    'private_owner_instruction', 'status_changed', 'owner_changed'
  ]);
  const allowedEventTypes = new Set([
    'core_decision', 'edge_rejection', 'dedup_rejection', 'job_cancellation'
  ]);
  const fingerprintValid = /^[a-f0-9]{64}$/.test(decision.idempotency_key || '');
  const correlationMatch = typeof decision.correlation_id === 'string'
    ? decision.correlation_id.match(/^calapres:([A-Za-z0-9_-]{1,64}):([A-Za-z0-9_-]{1,64})$/)
    : null;
  const auditEventValid = decision.sanitized_audit &&
    typeof decision.sanitized_audit === 'object' &&
    !Array.isArray(decision.sanitized_audit) &&
    Object.keys(decision.sanitized_audit).length === 2 &&
    allowedEventTypes.has(decision.sanitized_audit.event_type) &&
    decision.sanitized_audit.reason_code === decision.reason_code;
  const decisionConsistent =
    (decision.decision === 'observe_draft' &&
      decision.authority === 'draft_only' &&
      decision.draft_allowed === true &&
      typeof decision.draft_text === 'string' &&
      decision.draft_text.length > 0 && decision.draft_text.length <= 1200 &&
      decision.requires_owner_review === true &&
      decision.incident_required === false) ||
    (decision.decision === 'escalate' &&
      decision.authority === 'owner_required' &&
      decision.draft_allowed === false &&
      decision.draft_text === null &&
      decision.requires_owner_review === true &&
      decision.incident_required === true) ||
    (decision.decision === 'no_action' &&
      decision.authority === 'none' &&
      decision.draft_allowed === false &&
      decision.draft_text === null &&
      typeof decision.requires_owner_review === 'boolean' &&
      typeof decision.incident_required === 'boolean');
  const decisionValid =
    exactShape &&
    decision.schema_version === '1.0' &&
    decision.brand_id === 'calapres' &&
    fingerprintValid &&
    correlationMatch !== null &&
    allowedDecisions.has(decision.decision) &&
    allowedReasonCodes.has(decision.reason_code) &&
    allowedAuthorities.has(decision.authority) &&
    allowedIntents.has(decision.intent) &&
    allowedRisks.has(decision.risk) &&
    typeof decision.draft_allowed === 'boolean' &&
    decision.customer_egress_allowed === false &&
    auditEventValid &&
    decisionConsistent;
  const provenanceValid =
    Object.keys(provenance).length === 4 &&
    provenance.kind === 'synthetic_manual_fixture' &&
    provenance.fixture_ref === 'fixture_clear_001' &&
    provenance.static_fingerprints === true &&
    provenance.persistable === false;
  const previewReady =
    decisionValid &&
    provenanceValid &&
    decision.idempotency_key === '9ee62926cfd806b00e5b45c93bafb9ccbe8d58b09bbb0de574c15b39c5802445';
  const suffix = previewReady ? decision.idempotency_key.slice(0, 24) : null;
  const conversationRef = previewReady ? 'cwr_' + correlationMatch[1] : null;
  const createdAt = new Date().toISOString();
  const incidentRequired = decision.incident_required === true;
  const incidentId = previewReady && incidentRequired ? 'inc_' + suffix : null;

  function incidentType(intent, reason) {
    if (reason === 'live_recheck_unavailable') return 'connector_failure';
    if (reason === 'confidence_below_threshold' || reason === 'grounded_draft_missing') return 'knowledge_gap';
    if (typeof reason === 'string' && (reason.includes('schema') || reason.includes('invalid'))) return 'schema_failure';
    if (intent === 'complaint') return 'customer_complaint';
    if (intent === 'return_request' || intent === 'refund') return 'return_or_refund';
    if (intent === 'order_change' || intent === 'cancellation') return 'order_change';
    if (intent === 'payment_dispute') return 'payment_dispute';
    if (intent === 'privacy') return 'privacy';
    if (intent === 'legal') return 'legal';
    if (intent === 'security') return 'security';
    return 'other';
  }

  function severity(intent, risk) {
    if (intent === 'security' || intent === 'privacy' || intent === 'legal' || intent === 'payment_dispute') return 'high';
    if (risk === 'high') return 'high';
    if (risk === 'medium' || risk === 'unknown') return 'medium';
    return 'low';
  }

  const details = previewReady
    ? 'decision=' + decision.decision +
      ';reason=' + decision.reason_code +
      ';intent=' + decision.intent +
      ';risk=' + decision.risk +
      ';egress=false'
    : null;
  const incidentRow = previewReady && incidentRequired ? {
    schema_version: '1.0',
    brand_id: 'calapres',
    incident_revision: 1,
    correlation_id: decision.correlation_id,
    reason_code: decision.reason_code,
    draft_ref: null,
    conversation_id: conversationRef,
    created_at: createdAt,
    incident_id: incidentId,
    incident_type: incidentType(decision.intent, decision.reason_code),
    order_ref: null,
    owner_decision: null,
    proposed_action: 'review_case',
    resolved_at: null,
    severity: severity(decision.intent, decision.risk),
    status: 'awaiting_owner',
    summary_sanitized: details,
    updated_at: createdAt
  } : null;
  const auditRow = previewReady ? {
    schema_version: '1.0',
    brand_id: 'calapres',
    idempotency_key: decision.idempotency_key,
    outcome: decision.decision === 'observe_draft'
      ? 'observed_no_write'
      : decision.decision === 'escalate'
        ? 'escalated_no_write'
        : decision.reason_code.includes('rejected')
          ? 'rejected_no_write'
          : 'no_action_no_write',
    actor_type: 'system',
    conversation_ref: conversationRef,
    incident_id: incidentId,
    knowledge_version: '2026-08-11-v3',
    workflow_release: 'calapres-customer-service-edge-v1',
    audit_id: 'aud_' + suffix,
    correlation_id: decision.correlation_id,
    created_at: createdAt,
    decision: decision.decision,
    details_sanitized: details,
    event_type: decision.sanitized_audit.event_type,
    reason_code: decision.reason_code,
    source_ref: 'src_' + suffix
  } : null;
  const safeObservation = decisionValid ? decision : {
    schema_version: '1.0',
    brand_id: 'calapres',
    decision: 'no_action',
    reason_code: 'audit_projection_invalid',
    customer_egress_allowed: false
  };
  return {
    json: {
      observation_result: safeObservation,
      customer_egress: {
        node_present: false,
        allowed: false
      },
      persistence_preview: {
        preview_ready: previewReady && (!incidentRequired || incidentRow !== null),
        persistence_ready: false,
        persistable: false,
        reason_code: previewReady ? 'synthetic_preview_valid' : 'preview_not_trusted_or_invalid',
        incidents: {
          table_id: 'N3UJZWRMNehLX4l7',
          required_operation: incidentRequired ? 'preview_sanitized_incident_only' : 'none',
          write_executed: false,
          atomicity_guaranteed: false,
          preview_ready: previewReady && (!incidentRequired || incidentRow !== null),
          persistence_ready: false,
          persistable: false,
          table_row: incidentRow
        },
        audit: {
          table_id: '4YBUAuuEgXYiaybJ',
          required_operation: 'preview_sanitized_audit_only',
          write_executed: false,
          atomicity_guaranteed: false,
          preview_ready: previewReady,
          persistence_ready: false,
          persistable: false,
          table_row: auditRow
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
                            .to(waitForChannelPolicyQuietWindow)
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
