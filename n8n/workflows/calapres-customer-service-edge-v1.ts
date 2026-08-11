import { expr, ifElse, node, trigger, workflow } from '@n8n/workflow-sdk';

/*
 * Calapres Customer Service Edge v1 - observation source only.
 *
 * This file has no public webhook, credential, LLM, Shopify mutation, Chatwoot
 * write, or customer-send node. The manual fixture proves exact inbox routing
 * and the fail-closed envelope/Core contract without customer data.
 *
 * The named DEDUP / JOB / AUDIT slots mark the exact persistence positions.
 * They remain no-write previews in source because n8n Data Tables do not
 * document an atomic uniqueness guarantee. Customer egress is structurally
 * absent, not merely disabled by a runtime flag.
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
    created_at: '2026-08-11T12:00:00.000Z',
    transport: {
      source: 'manual_fixture',
      signature_verified: true,
      replay_protection_verified: true
    },
    test_control: {
      dedup_status: 'unique',
      generation_status: 'current'
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
  const raw = item.json && typeof item.json === 'object' ? item.json : {};
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
  const signatureVerified = raw.transport && raw.transport.signature_verified === true;
  const replayVerified = raw.transport && raw.transport.replay_protection_verified === true;
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
        knowledge_version: 'calapres-cs-v1',
        live_facts_status: 'not_requested'
      },
      candidate: {
        intent: 'faq',
        risk: 'low',
        requested_action: 'answer',
        draft_text: 'SANITIZED TEST DRAFT - NOT FOR CUSTOMER DELIVERY',
        confidence: 1
      },
      test_control: {
        dedup_status: raw.test_control && raw.test_control.dedup_status === 'duplicate' ? 'duplicate' : 'unique',
        generation_status: raw.test_control && raw.test_control.generation_status === 'stale' ? 'stale' : 'current'
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
  const value = item.json;
  return {
    json: {
      schema_version: '1.0',
      event: value.envelope,
      runtime: value.runtime,
      capabilities: value.capabilities,
      context: value.context,
      candidate: value.candidate
    }
  };
});
`,
    },
    position: [2290, 0],
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

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

return $input.all().map((item) => {
  const value = item.json && typeof item.json === 'object' ? item.json : {};
  const valid =
    value.schema_version === '1.0' &&
    value.brand_id === 'calapres' &&
    nonEmpty(value.correlation_id) &&
    nonEmpty(value.idempotency_key) &&
    allowedDecisions.has(value.decision) &&
    value.customer_egress_allowed === false;

  const decision = valid ? value : {
    schema_version: '1.0',
    brand_id: 'calapres',
    correlation_id: nonEmpty(value.correlation_id) ? value.correlation_id.slice(0, 200) : 'unknown',
    idempotency_key: nonEmpty(value.idempotency_key) ? value.idempotency_key.slice(0, 200) : 'unknown',
    decision: 'no_action',
    reason_code: 'edge_rejected_core_output',
    authority: 'none',
    intent: 'unknown',
    risk: 'unknown',
    draft_allowed: false,
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
    position: [2810, 0],
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
        correlation_id: value.correlation_id || 'unknown',
        idempotency_key: value.idempotency_key || 'unknown',
        decision: 'no_action',
        reason_code: reason,
        authority: 'none',
        intent: 'unknown',
        risk: 'unknown',
        draft_allowed: false,
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
    position: [3080, 360],
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
                  .onTrue(buildCoreInput.to(callImmutableCore).to(enforceObservationBoundary).to(auditPreview))
                  .onFalse(buildStaleObservation.to(auditPreview)),
              ),
            )
            .onFalse(buildDuplicateObservation.to(auditPreview)),
        ),
      )
      .onFalse(buildRejectedObservation.to(auditPreview)),
  );
