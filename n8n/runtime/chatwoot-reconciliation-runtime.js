'use strict';

/*
 * Pure, credential-free Chatwoot reconciliation contract for the Calapres Edge.
 *
 * This module performs no network, credential, database, filesystem, clock, wait,
 * workflow, model, or customer-send action. Callers inject only deterministic
 * hashing and owner-approved non-secret release controls. Native workflow nodes
 * must own HTTP/HMAC/database effects and must project Chatwoot responses to the
 * exact PII-free shapes accepted here before invoking this runtime.
 */

const BRAND_ID = 'calapres';
const ACCOUNT_ID = 179973;
const SOURCE = 'chatwoot_reconciliation_v1';
const CANONICAL_TUPLE_FORMAT =
  'json-minified-ordered:[schema_version,account_id,inbox_id,event,conversation_id,message_id]';
const INBOX_CHANNELS = Object.freeze({
  128031: 'instagram',
  128033: 'tiktok',
  128058: 'whatsapp',
  128326: 'email',
});
const MAX_DISCOVERY_ROWS = 100;
const MAX_DISCOVERY_PAGES = 100;
const MAX_MESSAGE_ROWS = 100;
const MAX_FINALIZABLE_MESSAGE_ROWS = 99;
const MAX_RETAINED_KEY_VERSIONS = 8;
const KEY_VERSION = /^calapres-identity-hmac-v[1-9][0-9]*$/;
const POLICY_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;
const SAFE_CODE = /^[a-z][a-z0-9_]{2,80}$/;
const OPAQUE_ID = /^[A-Za-z0-9:_-]{4,160}$/;
const BUSINESS_CLAIM_ID = /^bev_claim_[A-Za-z0-9_-]{4,120}$/;
const JOB_ID = /^job_[A-Za-z0-9_-]{4,120}$/;
const HEX_24 = /^[a-f0-9]{24}$/;
const HEX_64 = /^[a-f0-9]{64}$/;
const POSITIVE_TOKEN = /^[1-9][0-9]{0,30}$/;
const STRICT_ISO_TIMESTAMP =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;
const DISCOVERY_PAGE_KEYS = Object.freeze([
  'schema_version', 'kind', 'status_code', 'account_id', 'inbox_id', 'requested_page',
  'retry_after_seconds', 'error_code', 'all_count', 'rows',
]);
const DISCOVERY_ROW_KEYS = Object.freeze(['id', 'account_id', 'inbox_id', 'status']);
const MESSAGE_PAGE_KEYS = Object.freeze([
  'schema_version', 'kind', 'status_code', 'account_id', 'inbox_id', 'conversation_id',
  'requested_after_message_id', 'retry_after_seconds', 'error_code', 'rows',
]);
const MESSAGE_ROW_KEYS = Object.freeze([
  'id', 'account_id', 'inbox_id', 'conversation_id', 'created_at', 'message_type',
  'private', 'sender_type', 'attachment_count',
]);
const MESSAGE_TYPES = new Set([0, 1, 2, 3]);
const SENDER_TYPES = new Set(['contact', 'user', 'agent', 'agent_bot', 'bot', null]);
const CONVERSATION_STATUSES = new Set(['open', 'resolved', 'pending', 'snoozed']);
const DURABLE_OUTCOMES = new Set(['durable_bound', 'durable_duplicate']);
const DETERMINISTIC_EXCLUSION_REASONS = new Set([
  'before_activation_floor',
  'private_message',
  'outgoing_message',
  'activity_message',
  'template_message',
  'bot_echo',
]);
const PROOF_ROW_KEYS = Object.freeze([
  'message_id',
  'classification',
  'outcome',
  'reason_code',
  'created_at',
  'message_type',
  'private',
  'sender_type',
  'event_identity_key_version',
  'event_identity_fingerprint',
  'business_claim_id',
  'job_id',
  'generation',
]);
const CURSOR_PROOF_CANONICAL_FORMAT =
  'utf8(domain+stable-json-v1);object-keys-recursive-lexicographic;array-order-preserved';
const CURSOR_PAGE_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-cursor-page-binding-v1:';
const CURSOR_OUTCOME_DIGEST_DOMAIN =
  'calapres-chatwoot-reconciliation-cursor-outcome-digest-v1:';

class ReconciliationContractError extends Error {
  constructor(reasonCode) {
    super(reasonCode);
    this.name = 'ReconciliationContractError';
    this.reasonCode = reasonCode;
  }
}

function fail(reasonCode) {
  throw new ReconciliationContractError(reasonCode);
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactObject(value, fields, reasonCode) {
  if (!plainObject(value)) fail(reasonCode);
  const expected = fields instanceof Set ? fields : new Set(fields);
  const keys = Object.keys(value);
  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) fail(reasonCode);
  return value;
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    value.forEach(deepFreeze);
  } else if (plainObject(value)) {
    Object.values(value).forEach(deepFreeze);
  }
  return Object.freeze(value);
}

function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (plainObject(value)) {
    return '{' + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function parseIso(value, reasonCode) {
  if (typeof value !== 'string' || !STRICT_ISO_TIMESTAMP.test(value)) fail(reasonCode);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(reasonCode);
  return parsed;
}

function normalizeIso(value, reasonCode) {
  return new Date(parseIso(value, reasonCode)).toISOString();
}

function safeInteger(value, minimum, maximum, reasonCode) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(reasonCode);
  return value;
}

function positiveToken(value, reasonCode) {
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value !== 'string' || !POSITIVE_TOKEN.test(value)) fail(reasonCode);
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || String(numeric) !== value) fail(reasonCode);
  return value;
}

function tokenToInteger(value, reasonCode) {
  return Number(positiveToken(value, reasonCode));
}

function channelForInbox(inboxId) {
  safeInteger(inboxId, 1, Number.MAX_SAFE_INTEGER, 'inbox_id_invalid');
  const channel = INBOX_CHANNELS[inboxId];
  if (!channel) fail('inbox_not_allowlisted');
  return channel;
}

function validateAccountInbox(accountId, inboxId) {
  if (accountId !== ACCOUNT_ID) fail('account_not_allowlisted');
  return channelForInbox(inboxId);
}

function safeErrorCode(value, reasonCode) {
  if (value !== null && (typeof value !== 'string' || !SAFE_CODE.test(value))) fail(reasonCode);
  return value;
}

function validateTransportFields(statusCode, retryAfterSeconds, errorCode, rows, reasonCode) {
  if (statusCode !== null) safeInteger(statusCode, 100, 599, reasonCode);
  if (retryAfterSeconds !== null) safeInteger(retryAfterSeconds, 1, 86400, reasonCode);
  safeErrorCode(errorCode, reasonCode);
  if (statusCode === 200) {
    if (retryAfterSeconds !== null || errorCode !== null || !Array.isArray(rows)) fail(reasonCode);
    return null;
  }
  if (rows !== null) fail(reasonCode);
  if (statusCode === null && errorCode === null) fail(reasonCode);
  if (statusCode === 429) return ['retry_later', 'chatwoot_rate_limited'];
  if (statusCode !== null && statusCode >= 500) return ['retry_later', 'chatwoot_server_unavailable'];
  if (statusCode === null) return ['retry_later', errorCode];
  if (statusCode === 401) return ['fail_closed', 'chatwoot_unauthorized'];
  if (statusCode === 403) return ['fail_closed', 'chatwoot_forbidden'];
  if (statusCode === 404) return ['fail_closed', 'chatwoot_route_not_found'];
  return ['fail_closed', 'chatwoot_unexpected_status'];
}

function canonicalTuple(accountId, inboxId, conversationId, messageId) {
  return Object.freeze({
    schema_version: '1.0',
    account_id: accountId,
    inbox_id: inboxId,
    event: 'message_created',
    conversation_id: positiveToken(conversationId, 'conversation_id_invalid'),
    message_id: positiveToken(messageId, 'message_id_invalid'),
  });
}

function orderedTupleJson(tuple) {
  return JSON.stringify({
    schema_version: tuple.schema_version,
    account_id: tuple.account_id,
    inbox_id: tuple.inbox_id,
    event: tuple.event,
    conversation_id: tuple.conversation_id,
    message_id: tuple.message_id,
  });
}

function normalizeProofRows(value) {
  if (!Array.isArray(value) || value.length < 1 ||
      value.length > MAX_FINALIZABLE_MESSAGE_ROWS) {
    fail('proof_rows_invalid');
  }
  const normalized = [];
  let previousMessageId = 0;
  for (const sourceRow of value) {
    exactObject(sourceRow, PROOF_ROW_KEYS, 'proof_row_invalid');
    const messageId = positiveToken(sourceRow.message_id, 'proof_message_id_invalid');
    const numericMessageId = tokenToInteger(messageId, 'proof_message_id_invalid');
    if (numericMessageId <= previousMessageId) fail('proof_rows_not_strictly_sorted');
    previousMessageId = numericMessageId;
    const candidate = sourceRow.classification === 'event_candidate';
    const excluded = sourceRow.classification === 'deterministically_excluded';
    if (!candidate && !excluded) fail('proof_classification_invalid');
    if (candidate) {
      if (!DURABLE_OUTCOMES.has(sourceRow.outcome) || sourceRow.reason_code !== null ||
          sourceRow.created_at !== null || sourceRow.message_type !== null ||
          sourceRow.private !== null || sourceRow.sender_type !== null ||
          !KEY_VERSION.test(sourceRow.event_identity_key_version || '') ||
          !HEX_64.test(sourceRow.event_identity_fingerprint || '') ||
          typeof sourceRow.business_claim_id !== 'string' ||
          !BUSINESS_CLAIM_ID.test(sourceRow.business_claim_id) ||
          typeof sourceRow.job_id !== 'string' || !JOB_ID.test(sourceRow.job_id) ||
          !Number.isSafeInteger(sourceRow.generation) || sourceRow.generation < 1 ||
          sourceRow.generation > 2147483647) {
        fail('candidate_proof_invalid');
      }
    } else {
      if (sourceRow.outcome !== 'deterministically_excluded' ||
          !DETERMINISTIC_EXCLUSION_REASONS.has(sourceRow.reason_code) ||
          !Number.isSafeInteger(sourceRow.created_at) || sourceRow.created_at < 0 ||
          sourceRow.created_at > 253402300799 || !MESSAGE_TYPES.has(sourceRow.message_type) ||
          typeof sourceRow.private !== 'boolean' || !SENDER_TYPES.has(sourceRow.sender_type) ||
          sourceRow.event_identity_key_version !== null ||
          sourceRow.event_identity_fingerprint !== null ||
          sourceRow.business_claim_id !== null || sourceRow.job_id !== null ||
          sourceRow.generation !== null) {
        fail('exclusion_proof_invalid');
      }
    }
    normalized.push({
      message_id: messageId,
      classification: sourceRow.classification,
      outcome: sourceRow.outcome,
      reason_code: sourceRow.reason_code,
      created_at: sourceRow.created_at,
      message_type: sourceRow.message_type,
      private: sourceRow.private,
      sender_type: sourceRow.sender_type,
      event_identity_key_version: sourceRow.event_identity_key_version,
      event_identity_fingerprint: sourceRow.event_identity_fingerprint,
      business_claim_id: sourceRow.business_claim_id,
      job_id: sourceRow.job_id,
      generation: sourceRow.generation,
    });
  }
  return normalized;
}

function deterministicExclusionReason(row, activationFloorEpochMilliseconds) {
  if (row.created_at * 1000 < activationFloorEpochMilliseconds) {
    return 'before_activation_floor';
  }
  if (row.private === true) return 'private_message';
  if (row.message_type === 1) return 'outgoing_message';
  if (row.message_type === 2) return 'activity_message';
  if (row.message_type === 3) return 'template_message';
  if (row.sender_type === 'agent_bot' || row.sender_type === 'bot') return 'bot_echo';
  return null;
}

function cursorProofCanonical(input) {
  exactObject(input, [
    'schema_version', 'source', 'brand_id', 'account_id', 'inbox_id', 'channel',
    'conversation_id', 'expected_after_message_id', 'new_after_message_id',
    'activation_floor_at', 'activation_policy_version', 'proof_rows',
  ], 'cursor_proof_canonical_invalid');
  const channel = validateAccountInbox(input.account_id, input.inbox_id);
  const conversationId = positiveToken(input.conversation_id, 'conversation_id_invalid');
  const expected = safeInteger(input.expected_after_message_id, 0, Number.MAX_SAFE_INTEGER,
    'expected_after_message_id_invalid');
  const next = safeInteger(input.new_after_message_id, 1, Number.MAX_SAFE_INTEGER,
    'new_after_message_id_invalid');
  const activationFloorAt = normalizeIso(input.activation_floor_at, 'activation_floor_invalid');
  const proofRows = normalizeProofRows(input.proof_rows);
  for (const proofRow of proofRows) {
    if (proofRow.classification === 'deterministically_excluded' &&
        deterministicExclusionReason(proofRow, Date.parse(activationFloorAt)) !==
          proofRow.reason_code) {
      fail('exclusion_reason_evidence_mismatch');
    }
  }
  const maximumProofMessageId = tokenToInteger(
    proofRows[proofRows.length - 1].message_id,
    'proof_message_id_invalid',
  );
  if (input.schema_version !== '1.0' || input.source !== SOURCE ||
      input.brand_id !== BRAND_ID || input.channel !== channel || next <= expected ||
      proofRows.some((row) => tokenToInteger(row.message_id, 'proof_message_id_invalid') <= expected) ||
      next !== maximumProofMessageId || input.activation_floor_at !== activationFloorAt ||
      !POLICY_VERSION.test(input.activation_policy_version || '')) {
    fail('cursor_proof_canonical_invalid');
  }
  return deepFreeze({
    schema_version: '1.0',
    source: SOURCE,
    brand_id: BRAND_ID,
    account_id: input.account_id,
    inbox_id: input.inbox_id,
    channel,
    conversation_id: conversationId,
    expected_after_message_id: expected,
    new_after_message_id: next,
    activation_floor_at: activationFloorAt,
    activation_policy_version: input.activation_policy_version,
    proof_rows: proofRows,
  });
}

function dependencies(value) {
  exactObject(value, [
    'sha256Hex', 'active_event_identity_key_version', 'retained_event_identity_key_versions',
    'activation_floor_at', 'activation_policy_version',
  ], 'reconciliation_dependencies_invalid');
  if (typeof value.sha256Hex !== 'function' ||
      !KEY_VERSION.test(value.active_event_identity_key_version || '') ||
      !Array.isArray(value.retained_event_identity_key_versions) ||
      value.retained_event_identity_key_versions.length > MAX_RETAINED_KEY_VERSIONS ||
      value.retained_event_identity_key_versions.some((entry) => !KEY_VERSION.test(entry || '')) ||
      new Set([
        value.active_event_identity_key_version,
        ...value.retained_event_identity_key_versions,
      ]).size !== value.retained_event_identity_key_versions.length + 1 ||
      !POLICY_VERSION.test(value.activation_policy_version || '')) {
    fail('reconciliation_dependencies_invalid');
  }
  const activationFloorAt = normalizeIso(value.activation_floor_at, 'activation_floor_invalid');
  return Object.freeze({
    sha256Hex: value.sha256Hex,
    activeEventIdentityKeyVersion: value.active_event_identity_key_version,
    retainedEventIdentityKeyVersions: Object.freeze([...value.retained_event_identity_key_versions]),
    activationFloorAt,
    activationFloorEpochMilliseconds: Date.parse(activationFloorAt),
    activationPolicyVersion: value.activation_policy_version,
  });
}

function digest(deps, domain, value) {
  const result = deps.sha256Hex(domain + stableJson(value));
  if (!HEX_64.test(result || '')) fail('sha256_dependency_output_invalid');
  return result;
}

function blockedPage(kind, accountId, inboxId, channel, route, status, reasonCode) {
  return deepFreeze({
    schema_version: '1.0',
    kind,
    status,
    reason_code: reasonCode,
    source: SOURCE,
    brand_id: BRAND_ID,
    account_id: accountId,
    inbox_id: inboxId,
    channel,
    ...route,
    cursor_advance_ready: false,
    api_retry_required: status === 'retry_later',
    customer_egress_allowed: false,
  });
}

function createChatwootReconciliationRuntime(injectedDependencies) {
  const deps = dependencies(injectedDependencies);

  function prepareControl(input) {
    exactObject(input, ['brand_enabled', 'kill_switch', 'api_credential_available'],
      'reconciliation_control_invalid');
    if (typeof input.brand_enabled !== 'boolean' || typeof input.kill_switch !== 'boolean' ||
        typeof input.api_credential_available !== 'boolean') fail('reconciliation_control_invalid');
    let reasonCode = null;
    if (!input.brand_enabled) reasonCode = 'brand_disabled';
    else if (input.kill_switch) reasonCode = 'brand_kill_switch';
    else if (!input.api_credential_available) reasonCode = 'chatwoot_credential_unavailable';
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_control_v1',
      status: reasonCode === null ? 'ready' : 'blocked',
      reason_code: reasonCode,
      brand_id: BRAND_ID,
      account_id: ACCOUNT_ID,
      activation_floor_at: deps.activationFloorAt,
      activation_policy_version: deps.activationPolicyVersion,
      api_calls_allowed: reasonCode === null,
      customer_egress_allowed: false,
    });
  }

  function validateControl(control) {
    exactObject(control, [
      'schema_version', 'kind', 'status', 'reason_code', 'brand_id', 'account_id',
      'activation_floor_at', 'activation_policy_version', 'api_calls_allowed',
      'customer_egress_allowed',
    ], 'reconciliation_control_invalid');
    if (control.schema_version !== '1.0' ||
        control.kind !== 'chatwoot_reconciliation_control_v1' ||
        control.brand_id !== BRAND_ID || control.account_id !== ACCOUNT_ID ||
        control.activation_floor_at !== deps.activationFloorAt ||
        control.activation_policy_version !== deps.activationPolicyVersion ||
        control.customer_egress_allowed !== false ||
        !['ready', 'blocked'].includes(control.status) ||
        typeof control.api_calls_allowed !== 'boolean' ||
        (control.status === 'ready') !== control.api_calls_allowed ||
        (control.status === 'ready' ? control.reason_code !== null :
          (typeof control.reason_code !== 'string' || !SAFE_CODE.test(control.reason_code)))) {
      fail('reconciliation_control_invalid');
    }
    return control;
  }

  function blockedRequest(reasonCode) {
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_api_request_plan_v1',
      status: 'blocked',
      reason_code: reasonCode,
      request: null,
      api_call_allowed: false,
      customer_egress_allowed: false,
    });
  }

  function buildConversationDiscoveryRequest(control, input) {
    validateControl(control);
    exactObject(input, ['inbox_id', 'page'], 'discovery_request_input_invalid');
    const channel = channelForInbox(input.inbox_id);
    safeInteger(input.page, 1, MAX_DISCOVERY_PAGES, 'discovery_page_invalid');
    if (!control.api_calls_allowed) return blockedRequest(control.reason_code);
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_api_request_plan_v1',
      status: 'ready',
      reason_code: null,
      request: {
        method: 'GET',
        path: `/api/v1/accounts/${ACCOUNT_ID}/conversations`,
        query: {
          status: 'all',
          assignee_type: 'all',
          inbox_id: input.inbox_id,
          page: input.page,
        },
        account_id: ACCOUNT_ID,
        inbox_id: input.inbox_id,
        channel,
      },
      api_call_allowed: true,
      customer_egress_allowed: false,
    });
  }

  function buildMessagesAfterRequest(control, input) {
    validateControl(control);
    exactObject(input, ['inbox_id', 'conversation_id', 'after_message_id'],
      'messages_request_input_invalid');
    const channel = channelForInbox(input.inbox_id);
    const conversationId = positiveToken(input.conversation_id, 'conversation_id_invalid');
    const after = safeInteger(input.after_message_id, 0, Number.MAX_SAFE_INTEGER,
      'after_message_id_invalid');
    if (!control.api_calls_allowed) return blockedRequest(control.reason_code);
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_api_request_plan_v1',
      status: 'ready',
      reason_code: null,
      request: {
        method: 'GET',
        path: `/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`,
        query: { after },
        account_id: ACCOUNT_ID,
        inbox_id: input.inbox_id,
        channel,
        conversation_id: conversationId,
      },
      api_call_allowed: true,
      customer_egress_allowed: false,
    });
  }

  function normalizeConversationDiscoveryPage(input) {
    exactObject(input, DISCOVERY_PAGE_KEYS, 'discovery_projection_invalid');
    if (input.schema_version !== '1.0' ||
        input.kind !== 'chatwoot_reconciliation_conversation_page_projection_v1') {
      fail('discovery_projection_invalid');
    }
    const channel = validateAccountInbox(input.account_id, input.inbox_id);
    safeInteger(input.requested_page, 1, MAX_DISCOVERY_PAGES, 'discovery_page_invalid');
    const transport = validateTransportFields(
      input.status_code, input.retry_after_seconds, input.error_code, input.rows,
      'discovery_projection_invalid',
    );
    if (transport) {
      if (input.all_count !== null) fail('discovery_projection_invalid');
      return blockedPage(
        'chatwoot_reconciliation_discovery_page_v1', input.account_id, input.inbox_id,
        channel,
        {
          requested_page: input.requested_page,
          all_count: null,
          conversation_ids: [],
          page_row_count: 0,
          coverage: 'incomplete',
        },
        transport[0], transport[1],
      );
    }
    safeInteger(input.all_count, 0, Number.MAX_SAFE_INTEGER, 'discovery_all_count_invalid');
    if (input.rows.length > MAX_DISCOVERY_ROWS) fail('discovery_page_oversized');
    const ids = [];
    const seen = new Set();
    for (const row of input.rows) {
      exactObject(row, DISCOVERY_ROW_KEYS, 'discovery_row_invalid');
      validateAccountInbox(row.account_id, row.inbox_id);
      if (row.account_id !== input.account_id || row.inbox_id !== input.inbox_id ||
          !CONVERSATION_STATUSES.has(row.status)) fail('discovery_row_route_invalid');
      const id = positiveToken(row.id, 'conversation_id_invalid');
      if (seen.has(id)) fail('discovery_row_duplicate');
      seen.add(id);
      ids.push(id);
    }
    ids.sort((left, right) => tokenToInteger(left, 'conversation_id_invalid') -
      tokenToInteger(right, 'conversation_id_invalid'));
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_discovery_page_v1',
      status: 'ready',
      reason_code: null,
      source: SOURCE,
      brand_id: BRAND_ID,
      account_id: input.account_id,
      inbox_id: input.inbox_id,
      channel,
      requested_page: input.requested_page,
      all_count: input.all_count,
      conversation_ids: ids,
      page_row_count: ids.length,
      coverage: 'incomplete',
      cursor_advance_ready: false,
      api_retry_required: false,
      customer_egress_allowed: false,
    });
  }

  function validateDiscoveryPage(page) {
    exactObject(page, [
      'schema_version', 'kind', 'status', 'reason_code', 'source', 'brand_id', 'account_id',
      'inbox_id', 'channel', 'requested_page', 'all_count', 'conversation_ids',
      'page_row_count', 'coverage', 'cursor_advance_ready', 'api_retry_required',
      'customer_egress_allowed',
    ], 'discovery_page_invalid');
    if (page.schema_version !== '1.0' ||
        page.kind !== 'chatwoot_reconciliation_discovery_page_v1' ||
        page.source !== SOURCE || page.brand_id !== BRAND_ID || page.account_id !== ACCOUNT_ID ||
        INBOX_CHANNELS[page.inbox_id] !== page.channel || page.status !== 'ready' ||
        page.reason_code !== null || page.coverage !== 'incomplete' ||
        page.cursor_advance_ready !== false || page.api_retry_required !== false ||
        page.customer_egress_allowed !== false || !Array.isArray(page.conversation_ids) ||
        page.conversation_ids.length !== page.page_row_count ||
        page.conversation_ids.some((id) => !POSITIVE_TOKEN.test(id))) {
      fail('discovery_page_invalid');
    }
    return page;
  }

  function buildDiscoverySnapshot(input) {
    exactObject(input, ['pages', 'page_cap_reached'], 'discovery_snapshot_input_invalid');
    if (!Array.isArray(input.pages) || input.pages.length < 1 ||
        input.pages.length > MAX_DISCOVERY_PAGES || typeof input.page_cap_reached !== 'boolean') {
      fail('discovery_snapshot_input_invalid');
    }
    const pages = input.pages.map(validateDiscoveryPage);
    const first = pages[0];
    const allIds = [];
    const seen = new Set();
    let reasonCode = null;
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      if (page.account_id !== first.account_id || page.inbox_id !== first.inbox_id ||
          page.channel !== first.channel || page.requested_page !== index + 1) {
        fail('discovery_page_sequence_invalid');
      }
      if (page.all_count !== first.all_count) reasonCode = 'discovery_count_changed';
      for (const id of page.conversation_ids) {
        if (seen.has(id)) reasonCode = 'discovery_page_overlap';
        else {
          seen.add(id);
          allIds.push(id);
        }
      }
    }
    allIds.sort((left, right) => tokenToInteger(left, 'conversation_id_invalid') -
      tokenToInteger(right, 'conversation_id_invalid'));
    if (input.page_cap_reached) reasonCode = 'discovery_page_cap_reached';
    else if (allIds.length !== first.all_count) reasonCode = reasonCode || 'discovery_count_incomplete';
    const boundedComplete = reasonCode === null;
    const core = {
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_discovery_snapshot_v1',
      source: SOURCE,
      brand_id: BRAND_ID,
      account_id: first.account_id,
      inbox_id: first.inbox_id,
      channel: first.channel,
      status: boundedComplete ? 'bounded_scan_complete' : 'incomplete',
      reason_code: reasonCode,
      coverage: 'incomplete',
      all_count: first.all_count,
      page_count: pages.length,
      conversation_ids: allIds,
      bounded_scan_complete: boundedComplete,
      page_cap_reached: input.page_cap_reached,
      no_loss_claimed: false,
      customer_egress_allowed: false,
    };
    return deepFreeze({
      ...core,
      snapshot_digest: digest(deps, 'calapres-chatwoot-reconciliation-snapshot-v1:', core),
    });
  }

  function validateDiscoverySnapshot(snapshot) {
    exactObject(snapshot, [
      'schema_version', 'kind', 'source', 'brand_id', 'account_id', 'inbox_id', 'channel',
      'status', 'reason_code', 'coverage', 'all_count', 'page_count', 'conversation_ids',
      'bounded_scan_complete', 'page_cap_reached', 'no_loss_claimed',
      'customer_egress_allowed', 'snapshot_digest',
    ], 'discovery_snapshot_invalid');
    const core = { ...snapshot };
    delete core.snapshot_digest;
    if (snapshot.schema_version !== '1.0' ||
        snapshot.kind !== 'chatwoot_reconciliation_discovery_snapshot_v1' ||
        snapshot.source !== SOURCE || snapshot.brand_id !== BRAND_ID ||
        snapshot.account_id !== ACCOUNT_ID || INBOX_CHANNELS[snapshot.inbox_id] !== snapshot.channel ||
        snapshot.coverage !== 'incomplete' || snapshot.no_loss_claimed !== false ||
        snapshot.customer_egress_allowed !== false || !Array.isArray(snapshot.conversation_ids) ||
        !HEX_64.test(snapshot.snapshot_digest || '') ||
        digest(deps, 'calapres-chatwoot-reconciliation-snapshot-v1:', core) !==
          snapshot.snapshot_digest) fail('discovery_snapshot_invalid');
    return snapshot;
  }

  function evaluateDiscoveryConvergence(input) {
    exactObject(input, ['first_snapshot', 'second_snapshot'], 'discovery_convergence_input_invalid');
    const first = validateDiscoverySnapshot(input.first_snapshot);
    const second = validateDiscoverySnapshot(input.second_snapshot);
    if (first.account_id !== second.account_id || first.inbox_id !== second.inbox_id ||
        first.channel !== second.channel) fail('discovery_snapshot_route_mismatch');
    const converged = first.bounded_scan_complete === true &&
      second.bounded_scan_complete === true && first.all_count === second.all_count &&
      stableJson(first.conversation_ids) === stableJson(second.conversation_ids);
    const ids = [...new Set([...first.conversation_ids, ...second.conversation_ids])]
      .sort((left, right) => tokenToInteger(left, 'conversation_id_invalid') -
        tokenToInteger(right, 'conversation_id_invalid'));
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_discovery_coverage_v1',
      source: SOURCE,
      brand_id: BRAND_ID,
      account_id: first.account_id,
      inbox_id: first.inbox_id,
      channel: first.channel,
      status: converged ? 'converged_bounded' : 'incomplete',
      reason_code: converged ? null : 'discovery_not_converged',
      coverage: converged ? 'best_effort' : 'incomplete',
      first_snapshot_digest: first.snapshot_digest,
      second_snapshot_digest: second.snapshot_digest,
      conversation_ids: ids,
      bounded_convergence_passed: converged,
      discovery_watermark_advance_allowed: false,
      no_loss_claimed: false,
      customer_egress_allowed: false,
    });
  }

  function classifyMessage(row) {
    const exclusion = deterministicExclusionReason(
      row,
      deps.activationFloorEpochMilliseconds,
    );
    if (exclusion !== null) return exclusion;
    if (row.message_type === 0 && row.private === false && row.sender_type === 'contact') return null;
    fail('inbound_sender_not_contact');
  }

  function eventCandidate(row, channel) {
    const tuple = canonicalTuple(row.account_id, row.inbox_id, row.conversation_id, row.id);
    const tupleJson = orderedTupleJson(tuple);
    const keyVersions = [
      deps.activeEventIdentityKeyVersion,
      ...deps.retainedEventIdentityKeyVersions,
    ];
    const hmacRequests = keyVersions.map((keyVersion) => ({
      purpose: 'event_identity',
      key_version: keyVersion,
      algorithm: 'hmac-sha256',
      encoding: 'hex',
      material_utf8: tupleJson,
    }));
    const core = {
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_event_candidate_v1',
      source: SOURCE,
      brand_id: BRAND_ID,
      account_id: row.account_id,
      inbox_id: row.inbox_id,
      channel,
      event: 'message_created',
      conversation_id: tuple.conversation_id,
      message_id: tuple.message_id,
      event_at: new Date(row.created_at * 1000).toISOString(),
      direction: 'incoming',
      visibility: 'public',
      sender_class: 'contact',
      attachment_count: row.attachment_count,
      canonical_tuple_format: CANONICAL_TUPLE_FORMAT,
      canonical_tuple: tuple,
      active_event_identity_key_version: deps.activeEventIdentityKeyVersion,
      retained_event_identity_key_versions: [...deps.retainedEventIdentityKeyVersions],
      event_identity_hmac_requests: hmacRequests,
      activation_floor_at: deps.activationFloorAt,
      activation_policy_version: deps.activationPolicyVersion,
      content_state: 'deferred_live_reread',
      live_reread_required: true,
      raw_content_used: false,
      raw_contact_used: false,
      transient_only: true,
      persistence_allowed: false,
      wait_payload_allowed: false,
      audit_payload_allowed: false,
      customer_egress_allowed: false,
    };
    return deepFreeze({
      ...core,
      candidate_ref: 'cwr_' + digest(
        deps, 'calapres-chatwoot-reconciliation-candidate-v1:', core,
      ).slice(0, 24),
      candidate_binding_sha256: digest(
        deps, 'calapres-chatwoot-reconciliation-candidate-binding-v1:', core,
      ),
    });
  }

  function normalizeMessagesAfterPage(input) {
    exactObject(input, MESSAGE_PAGE_KEYS, 'messages_projection_invalid');
    if (input.schema_version !== '1.0' ||
        input.kind !== 'chatwoot_reconciliation_messages_after_projection_v1') {
      fail('messages_projection_invalid');
    }
    const channel = validateAccountInbox(input.account_id, input.inbox_id);
    const conversationId = positiveToken(input.conversation_id, 'conversation_id_invalid');
    const after = safeInteger(input.requested_after_message_id, 0, Number.MAX_SAFE_INTEGER,
      'after_message_id_invalid');
    const transport = validateTransportFields(
      input.status_code, input.retry_after_seconds, input.error_code, input.rows,
      'messages_projection_invalid',
    );
    if (transport) {
      return blockedPage(
        'chatwoot_reconciliation_messages_page_v1', input.account_id, input.inbox_id,
        channel,
        {
          conversation_id: conversationId,
          requested_after_message_id: after,
          proposed_next_after_message_id: null,
          page_row_count: 0,
          page_full: false,
          continue_required_after_commit: false,
          event_candidates: [],
          deterministic_exclusions: [],
          outcome_requirements: [],
          activation_floor_at: deps.activationFloorAt,
          activation_policy_version: deps.activationPolicyVersion,
          incident_required: transport[0] === 'fail_closed',
          manual_resolution_required: transport[0] === 'fail_closed',
          page_binding_sha256: null,
        },
        transport[0], transport[1],
      );
    }
    if (input.rows.length > MAX_MESSAGE_ROWS) fail('messages_page_oversized');
    const rows = [];
    const ids = new Set();
    for (const sourceRow of input.rows) {
      exactObject(sourceRow, MESSAGE_ROW_KEYS, 'message_row_invalid');
      const rowChannel = validateAccountInbox(sourceRow.account_id, sourceRow.inbox_id);
      if (rowChannel !== channel || sourceRow.account_id !== input.account_id ||
          sourceRow.inbox_id !== input.inbox_id ||
          positiveToken(sourceRow.conversation_id, 'conversation_id_invalid') !== conversationId ||
          !MESSAGE_TYPES.has(sourceRow.message_type) || typeof sourceRow.private !== 'boolean' ||
          !SENDER_TYPES.has(sourceRow.sender_type)) fail('message_row_route_or_type_invalid');
      const id = tokenToInteger(sourceRow.id, 'message_id_invalid');
      if (id <= after || ids.has(id)) fail('message_cursor_order_invalid');
      ids.add(id);
      safeInteger(sourceRow.created_at, 0, 253402300799, 'message_created_at_invalid');
      safeInteger(sourceRow.attachment_count, 0, 32, 'attachment_count_invalid');
      rows.push({
        id,
        account_id: sourceRow.account_id,
        inbox_id: sourceRow.inbox_id,
        conversation_id: conversationId,
        created_at: sourceRow.created_at,
        message_type: sourceRow.message_type,
        private: sourceRow.private,
        sender_type: sourceRow.sender_type,
        attachment_count: sourceRow.attachment_count,
      });
    }
    rows.sort((left, right) => left.id - right.id);
    if (rows.length === MAX_MESSAGE_ROWS) {
      return deepFreeze({
        schema_version: '1.0',
        kind: 'chatwoot_reconciliation_messages_page_v1',
        status: 'incomplete',
        reason_code: 'scan_truncated',
        source: SOURCE,
        brand_id: BRAND_ID,
        account_id: input.account_id,
        inbox_id: input.inbox_id,
        channel,
        conversation_id: conversationId,
        requested_after_message_id: after,
        proposed_next_after_message_id: null,
        page_row_count: rows.length,
        page_full: true,
        continue_required_after_commit: false,
        event_candidates: [],
        deterministic_exclusions: [],
        outcome_requirements: [],
        activation_floor_at: deps.activationFloorAt,
        activation_policy_version: deps.activationPolicyVersion,
        incident_required: true,
        manual_resolution_required: true,
        cursor_advance_ready: false,
        api_retry_required: true,
        customer_egress_allowed: false,
        page_binding_sha256: null,
      });
    }
    const candidates = [];
    const exclusions = [];
    const requirements = [];
    for (const row of rows) {
      const exclusion = classifyMessage(row);
      if (exclusion === null) {
        candidates.push(eventCandidate(row, channel));
        requirements.push({
          message_id: String(row.id),
          classification: 'event_candidate',
          required_reason_code: null,
          created_at: null,
          message_type: null,
          private: null,
          sender_type: null,
          allowed_outcomes: ['durable_bound', 'durable_duplicate'],
        });
      } else {
        exclusions.push({
          message_id: String(row.id),
          reason_code: exclusion,
          activation_policy_version: deps.activationPolicyVersion,
        });
        requirements.push({
          message_id: String(row.id),
          classification: 'deterministically_excluded',
          required_reason_code: exclusion,
          created_at: row.created_at,
          message_type: row.message_type,
          private: row.private,
          sender_type: row.sender_type,
          allowed_outcomes: ['deterministically_excluded'],
        });
      }
    }
    const next = rows.length === 0 ? after : Math.max(...rows.map((row) => row.id));
    const core = {
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_messages_page_v1',
      status: 'ready',
      reason_code: null,
      source: SOURCE,
      brand_id: BRAND_ID,
      account_id: input.account_id,
      inbox_id: input.inbox_id,
      channel,
      conversation_id: conversationId,
      requested_after_message_id: after,
      proposed_next_after_message_id: next,
      page_row_count: rows.length,
      page_full: false,
      continue_required_after_commit: false,
      event_candidates: candidates,
      deterministic_exclusions: exclusions,
      outcome_requirements: requirements,
      activation_floor_at: deps.activationFloorAt,
      activation_policy_version: deps.activationPolicyVersion,
      incident_required: false,
      manual_resolution_required: false,
      cursor_advance_ready: false,
      api_retry_required: false,
      customer_egress_allowed: false,
    };
    return deepFreeze({
      ...core,
      page_binding_sha256: digest(
        deps, 'calapres-chatwoot-reconciliation-message-page-v1:', core,
      ),
    });
  }

  function validateMessagesPage(page) {
    exactObject(page, [
      'schema_version', 'kind', 'status', 'reason_code', 'source', 'brand_id', 'account_id',
      'inbox_id', 'channel', 'conversation_id', 'requested_after_message_id',
      'proposed_next_after_message_id', 'page_row_count', 'page_full',
      'continue_required_after_commit', 'event_candidates', 'deterministic_exclusions',
      'outcome_requirements', 'activation_floor_at', 'activation_policy_version',
      'incident_required', 'manual_resolution_required', 'cursor_advance_ready',
      'api_retry_required', 'customer_egress_allowed',
      'page_binding_sha256',
    ], 'messages_page_invalid');
    const core = { ...page };
    delete core.page_binding_sha256;
    if (page.schema_version !== '1.0' ||
        page.kind !== 'chatwoot_reconciliation_messages_page_v1' || page.status !== 'ready' ||
        page.reason_code !== null || page.source !== SOURCE || page.brand_id !== BRAND_ID ||
        page.account_id !== ACCOUNT_ID || INBOX_CHANNELS[page.inbox_id] !== page.channel ||
        page.activation_floor_at !== deps.activationFloorAt ||
        page.activation_policy_version !== deps.activationPolicyVersion ||
        page.page_row_count > MAX_FINALIZABLE_MESSAGE_ROWS || page.page_full !== false ||
        page.continue_required_after_commit !== false || page.incident_required !== false ||
        page.manual_resolution_required !== false ||
        page.cursor_advance_ready !== false || page.api_retry_required !== false ||
        page.customer_egress_allowed !== false || !Array.isArray(page.event_candidates) ||
        !Array.isArray(page.deterministic_exclusions) ||
        !Array.isArray(page.outcome_requirements) ||
        page.outcome_requirements.length !== page.page_row_count ||
        !HEX_64.test(page.page_binding_sha256 || '') ||
        digest(deps, 'calapres-chatwoot-reconciliation-message-page-v1:', core) !==
          page.page_binding_sha256) fail('messages_page_invalid');
    return page;
  }

  function blockedFinalization(page, reasonCode) {
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_cursor_finalization_v1',
      status: 'blocked',
      reason_code: reasonCode,
      source: SOURCE,
      brand_id: BRAND_ID,
      account_id: page.account_id,
      inbox_id: page.inbox_id,
      channel: page.channel,
      conversation_id: page.conversation_id,
      expected_after_message_id: page.requested_after_message_id,
      new_after_message_id: null,
      activation_floor_at: deps.activationFloorAt,
      activation_policy_version: deps.activationPolicyVersion,
      proof_rows: [],
      page_binding_sha256: null,
      outcome_digest: null,
      row_count: page.page_row_count,
      cursor_advance_ready: false,
      continue_required: false,
      no_loss_claimed: false,
      customer_egress_allowed: false,
    });
  }

  function finalizeMessagesPage(input) {
    exactObject(input, ['page', 'proof_rows'], 'message_proofs_input_invalid');
    const page = validateMessagesPage(input.page);
    if (!Array.isArray(input.proof_rows)) return blockedFinalization(page, 'proof_rows_missing');
    if (input.proof_rows.length !== page.outcome_requirements.length) {
      return blockedFinalization(page, 'proof_row_count_mismatch');
    }
    let canonical;
    try {
      canonical = cursorProofCanonical({
        schema_version: '1.0',
        source: SOURCE,
        brand_id: BRAND_ID,
        account_id: page.account_id,
        inbox_id: page.inbox_id,
        channel: page.channel,
        conversation_id: page.conversation_id,
        expected_after_message_id: page.requested_after_message_id,
        new_after_message_id: page.proposed_next_after_message_id,
        activation_floor_at: deps.activationFloorAt,
        activation_policy_version: deps.activationPolicyVersion,
        proof_rows: input.proof_rows,
      });
    } catch (error) {
      if (error instanceof ReconciliationContractError) {
        return blockedFinalization(page, error.reasonCode);
      }
      throw error;
    }
    for (let index = 0; index < page.outcome_requirements.length; index += 1) {
      const requirement = page.outcome_requirements[index];
      const proof = canonical.proof_rows[index];
      if (proof.message_id !== requirement.message_id ||
          proof.classification !== requirement.classification ||
          proof.created_at !== requirement.created_at ||
          proof.message_type !== requirement.message_type ||
          proof.private !== requirement.private ||
          proof.sender_type !== requirement.sender_type ||
          !requirement.allowed_outcomes.includes(proof.outcome)) {
        return blockedFinalization(page, 'proof_requirement_mismatch');
      }
      if (proof.classification === 'event_candidate') {
        if (proof.event_identity_key_version !== deps.activeEventIdentityKeyVersion) {
          return blockedFinalization(page, 'proof_key_version_mismatch');
        }
      } else if (proof.reason_code !== requirement.required_reason_code) {
        return blockedFinalization(page, 'exclusion_reason_mismatch');
      }
    }
    const pageBindingSha256 = digest(deps, CURSOR_PAGE_BINDING_DOMAIN, canonical);
    const outcomeDigest = digest(deps, CURSOR_OUTCOME_DIGEST_DOMAIN, canonical);
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_cursor_finalization_v1',
      status: 'ready',
      reason_code: null,
      source: SOURCE,
      brand_id: BRAND_ID,
      account_id: page.account_id,
      inbox_id: page.inbox_id,
      channel: page.channel,
      conversation_id: page.conversation_id,
      expected_after_message_id: page.requested_after_message_id,
      new_after_message_id: page.proposed_next_after_message_id,
      activation_floor_at: deps.activationFloorAt,
      activation_policy_version: deps.activationPolicyVersion,
      proof_rows: canonical.proof_rows,
      page_binding_sha256: pageBindingSha256,
      outcome_digest: outcomeDigest,
      row_count: canonical.proof_rows.length,
      cursor_advance_ready: true,
      continue_required: page.continue_required_after_commit,
      no_loss_claimed: false,
      customer_egress_allowed: false,
    });
  }

  function buildScanClaimCommand(input) {
    exactObject(input, [
      'inbox_id', 'scan_id', 'lease_owner_id', 'lease_token', 'lease_duration_seconds',
      'max_pages',
    ], 'scan_claim_input_invalid');
    const channel = channelForInbox(input.inbox_id);
    if (typeof input.scan_id !== 'string' || !/^cwrs_[a-f0-9]{24}$/.test(input.scan_id) ||
        typeof input.lease_owner_id !== 'string' || !OPAQUE_ID.test(input.lease_owner_id) ||
        typeof input.lease_token !== 'string' || !OPAQUE_ID.test(input.lease_token)) {
      fail('scan_claim_input_invalid');
    }
    safeInteger(input.lease_duration_seconds, 30, 900, 'scan_lease_duration_invalid');
    safeInteger(input.max_pages, 1, MAX_DISCOVERY_PAGES, 'scan_max_pages_invalid');
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_scan_claim_command_v1',
      operation: 'claim_chatwoot_reconciliation_scan',
      source: SOURCE,
      brand_id: BRAND_ID,
      account_id: ACCOUNT_ID,
      inbox_id: input.inbox_id,
      channel,
      scan_id: input.scan_id,
      lease_owner_id: input.lease_owner_id,
      lease_token: input.lease_token,
      lease_duration_seconds: input.lease_duration_seconds,
      max_pages: input.max_pages,
      activation_floor_at: deps.activationFloorAt,
      activation_policy_version: deps.activationPolicyVersion,
      customer_egress_allowed: false,
    });
  }

  function buildCursorAdvanceCommand(input) {
    exactObject(input, ['finalization', 'scan_id', 'lease_token'],
      'cursor_command_input_invalid');
    const finalization = input.finalization;
    exactObject(finalization, [
      'schema_version', 'kind', 'status', 'reason_code', 'source', 'brand_id', 'account_id',
      'inbox_id', 'channel', 'conversation_id', 'expected_after_message_id',
      'new_after_message_id', 'activation_floor_at', 'activation_policy_version',
      'proof_rows', 'page_binding_sha256', 'outcome_digest', 'row_count',
      'cursor_advance_ready', 'continue_required', 'no_loss_claimed', 'customer_egress_allowed',
    ], 'cursor_finalization_invalid');
    let canonical;
    try {
      canonical = cursorProofCanonical({
        schema_version: finalization.schema_version,
        source: finalization.source,
        brand_id: finalization.brand_id,
        account_id: finalization.account_id,
        inbox_id: finalization.inbox_id,
        channel: finalization.channel,
        conversation_id: finalization.conversation_id,
        expected_after_message_id: finalization.expected_after_message_id,
        new_after_message_id: finalization.new_after_message_id,
        activation_floor_at: finalization.activation_floor_at,
        activation_policy_version: finalization.activation_policy_version,
        proof_rows: finalization.proof_rows,
      });
    } catch (error) {
      if (error instanceof ReconciliationContractError) fail('cursor_finalization_invalid');
      throw error;
    }
    const expectedPageBinding = digest(deps, CURSOR_PAGE_BINDING_DOMAIN, canonical);
    const expectedOutcomeDigest = digest(deps, CURSOR_OUTCOME_DIGEST_DOMAIN, canonical);
    if (finalization.schema_version !== '1.0' ||
        finalization.kind !== 'chatwoot_reconciliation_cursor_finalization_v1' ||
        finalization.status !== 'ready' || finalization.reason_code !== null ||
        finalization.source !== SOURCE || finalization.brand_id !== BRAND_ID ||
        finalization.account_id !== ACCOUNT_ID ||
        INBOX_CHANNELS[finalization.inbox_id] !== finalization.channel ||
        finalization.activation_floor_at !== deps.activationFloorAt ||
        finalization.activation_policy_version !== deps.activationPolicyVersion ||
        finalization.cursor_advance_ready !== true || finalization.no_loss_claimed !== false ||
        finalization.customer_egress_allowed !== false ||
        finalization.continue_required !== false ||
        !Number.isSafeInteger(finalization.expected_after_message_id) ||
        !Number.isSafeInteger(finalization.new_after_message_id) ||
        finalization.new_after_message_id <= finalization.expected_after_message_id ||
        finalization.row_count !== canonical.proof_rows.length ||
        !HEX_64.test(finalization.page_binding_sha256 || '') ||
        !HEX_64.test(finalization.outcome_digest || '') ||
        finalization.page_binding_sha256 !== expectedPageBinding ||
        finalization.outcome_digest !== expectedOutcomeDigest ||
        typeof input.scan_id !== 'string' || !/^cwrs_[a-f0-9]{24}$/.test(input.scan_id) ||
        typeof input.lease_token !== 'string' || !OPAQUE_ID.test(input.lease_token)) {
      fail('cursor_finalization_invalid');
    }
    return deepFreeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_cursor_advance_command_v1',
      operation: 'compare_and_advance_chatwoot_message_cursor',
      source: SOURCE,
      brand_id: BRAND_ID,
      account_id: finalization.account_id,
      inbox_id: finalization.inbox_id,
      channel: finalization.channel,
      conversation_id: finalization.conversation_id,
      scan_id: input.scan_id,
      lease_token: input.lease_token,
      expected_after_message_id: finalization.expected_after_message_id,
      new_after_message_id: finalization.new_after_message_id,
      proof_rows: canonical.proof_rows,
      page_binding_sha256: finalization.page_binding_sha256,
      outcome_digest: finalization.outcome_digest,
      row_count: finalization.row_count,
      activation_floor_at: deps.activationFloorAt,
      activation_policy_version: deps.activationPolicyVersion,
      customer_egress_allowed: false,
    });
  }

  return Object.freeze({
    prepareControl,
    buildConversationDiscoveryRequest,
    buildMessagesAfterRequest,
    normalizeConversationDiscoveryPage,
    buildDiscoverySnapshot,
    evaluateDiscoveryConvergence,
    normalizeMessagesAfterPage,
    validateMessagesPage,
    finalizeMessagesPage,
    buildScanClaimCommand,
    buildCursorAdvanceCommand,
  });
}

module.exports = Object.freeze({
  BRAND_ID,
  ACCOUNT_ID,
  SOURCE,
  CANONICAL_TUPLE_FORMAT,
  CURSOR_PROOF_CANONICAL_FORMAT,
  CURSOR_PAGE_BINDING_DOMAIN,
  CURSOR_OUTCOME_DIGEST_DOMAIN,
  INBOX_CHANNELS,
  MAX_DISCOVERY_ROWS,
  MAX_DISCOVERY_PAGES,
  MAX_MESSAGE_ROWS,
  MAX_FINALIZABLE_MESSAGE_ROWS,
  ReconciliationContractError,
  stableJson,
  canonicalTuple,
  cursorProofCanonical,
  createChatwootReconciliationRuntime,
});
