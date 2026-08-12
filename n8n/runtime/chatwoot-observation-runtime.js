'use strict';

/*
 * Credential-free Calapres Chatwoot observation runtime.
 *
 * This module contains the production JavaScript logic that an inactive n8n
 * Code node can embed. All effects and all secret access are dependency
 * injected. The module itself performs no network, credential, filesystem,
 * Data Table, Shopify, Chatwoot-write, or customer-send operation.
 */

const ACCOUNT_ID = 179973;
const INBOX_CHANNELS = Object.freeze({
  128031: 'instagram',
  128033: 'tiktok',
  128058: 'whatsapp',
  128326: 'email',
});
const MAX_RAW_BODY_SIZE_BYTES = 1024 * 1024;
const MAX_AGE_SECONDS = 300;
const MAX_FUTURE_SKEW_SECONDS = 60;
const SCAN_PAGE_SIZE_LIMIT = 100;
const EVENT_IDENTITY_CANONICAL_FORMAT =
  'json-minified-ordered:[schema_version,account_id,inbox_id,event,conversation_id,message_id]';
const ANCHOR_MESSAGE_FINGERPRINT_DOMAIN = 'calapres-message-anchor-v1:';
const MESSAGE_SET_FINGERPRINT_DOMAIN = 'calapres-chatwoot-message-set-v1:';
const STATUS_FINGERPRINT_DOMAIN = 'calapres-conversation-status-v1:';
const ASSIGNEE_FINGERPRINT_DOMAIN = 'calapres-conversation-assignee-v1:';
const WAIT_CARRIER_FIELD_ORDER = Object.freeze([
  'schema_version',
  'brand_id',
  'account_id',
  'inbox_id',
  'channel',
  'conversation_id',
  'anchor_message_id',
  'conversation_fingerprint',
  'message_fingerprint',
  'correlation_id',
  'event_identity_key_version',
  'event_identity_fingerprint',
  'generation',
  'baseline_fingerprint_key_version',
  'baseline_status_fingerprint',
  'baseline_assignee_fingerprint',
  'delay_policy_version',
  'delay_mode',
  'delay_seconds',
  'not_before',
  'knowledge_version',
  'fixture_ref',
  'customer_egress_allowed',
]);
const WAIT_CARRIER_EXACT_KEYS = new Set([
  ...WAIT_CARRIER_FIELD_ORDER,
  'wait_state_fingerprint',
]);
const POST_DELAY_STATE_EXACT_KEYS = new Set([
  'currentGeneration',
  'idempotencyConsumed',
  'brandEnabled',
  'killSwitch',
]);
const DUAL_READ_RESULT_FIELD_ORDER = Object.freeze([
  'schema_version',
  'brand_id',
  'status',
  'lookup_verified',
  'unique',
  'duplicate',
  'active_key_version',
  'active_event_identity_fingerprint',
  'matched_key_version',
  'candidate_event_identity_fingerprints',
  'persistence_allowed',
  'customer_egress_allowed',
]);
const LIVE_REREAD_FIELD_ORDER = Object.freeze([
  'schema_version',
  'kind',
  'source',
  'evidence_id',
  'brand_id',
  'account_id',
  'inbox_id',
  'channel',
  'conversation_id',
  'anchor_message_id',
  'anchor_message_ordering_id',
  'generation',
  'wait_state_fingerprint',
  'event_identity_key_version',
  'event_identity_fingerprint',
  'event_identity_anchor_verified',
  'not_before',
  'read_started_at',
  'checked_at',
  'live_read_status',
  'http_status',
  'source_verified',
  'route_verified',
  'response_fingerprint',
  'anchor_message_fingerprint',
  'anchor_message_type',
  'anchor_private',
  'anchor_message_created_at',
  'anchor_message_created_at_source',
  'latest_inbound_fingerprint',
  'latest_inbound_created_at',
  'latest_inbound_created_at_source',
  'latest_inbound_ordering_id',
  'latest_public_human_reply_fingerprint',
  'latest_public_human_reply_created_at',
  'latest_public_human_reply_created_at_source',
  'latest_public_human_reply_ordering_id',
  'latest_private_note_fingerprint',
  'latest_private_note_created_at',
  'latest_private_note_created_at_source',
  'latest_private_note_ordering_id',
  'latest_non_activity_fingerprint',
  'latest_non_activity_created_at',
  'latest_non_activity_created_at_source',
  'latest_non_activity_ordering_id',
  'scan_strategy',
  'scan_page_size_limit',
  'scan_after_id',
  'scan_first_count',
  'scan_second_count',
  'scan_first_all_rows_valid',
  'scan_second_all_rows_valid',
  'scan_first_set_fingerprint',
  'scan_second_set_fingerprint',
  'scan_sets_equal',
  'scan_anchor_present_first',
  'scan_anchor_present_second',
  'scan_anchor_fingerprint_first',
  'scan_anchor_fingerprint_second',
  'scan_highest_message_id',
  'scan_highest_non_activity_id',
  'scan_complete',
  'conversation_before_route_verified',
  'conversation_after_route_verified',
  'conversation_before_status_fingerprint',
  'conversation_after_status_fingerprint',
  'conversation_before_assignee_fingerprint',
  'conversation_after_assignee_fingerprint',
  'conversation_snapshots_stable',
  'baseline_fingerprint_key_version',
  'baseline_status_fingerprint',
  'current_status_fingerprint',
  'baseline_assignee_fingerprint',
  'current_assignee_fingerprint',
  'anchor_message_present',
  'anchor_is_latest_inbound',
  'newer_inbound_present',
  'public_human_reply_present',
  'private_note_present',
  'newer_non_activity_present',
  'status_changed',
  'assignee_changed',
  'transient_only',
  'persistence_allowed',
  'wait_payload_allowed',
  'data_table_payload_allowed',
  'audit_payload_allowed',
  'customer_egress_allowed',
]);
const LIVE_REREAD_EXACT_KEYS = new Set(LIVE_REREAD_FIELD_ORDER);
const LIVE_REREAD_EVIDENCE_ID = /^cwr_[A-Za-z0-9_-]{8,80}$/;
const LIVE_REREAD_FAILURE_STATUSES = new Set([
  'unauthorized',
  'forbidden',
  'not_found',
  'rate_limited',
  'unavailable',
  'schema_invalid',
  'scan_truncated',
  'scan_changed',
  'anchor_missing',
  'conversation_changed',
]);
const LIVE_REREAD_FAILURE_NULL_FIELDS = LIVE_REREAD_FIELD_ORDER.filter((field) =>
  field === 'event_identity_anchor_verified' ||
  (
    field.startsWith('anchor_') &&
    !['anchor_message_id', 'anchor_message_ordering_id'].includes(field)
  ) ||
  field.startsWith('latest_') ||
  (
    field.startsWith('scan_') &&
    !['scan_strategy', 'scan_page_size_limit'].includes(field)
  ) ||
  (
    field.startsWith('conversation_') &&
    field !== 'conversation_id'
  ) ||
  field.startsWith('current_') ||
  [
    'newer_inbound_present',
    'public_human_reply_present',
    'private_note_present',
    'newer_non_activity_present',
    'status_changed',
    'assignee_changed',
  ].includes(field));
const HEX_64 = /^[a-f0-9]{64}$/;
const SIGNATURE_HEADER = /^sha256=[a-f0-9]{64}$/;
const TIMESTAMP_HEADER = /^[0-9]{10}$/;
const STRICT_ISO_TIMESTAMP =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;
const POSITIVE_DECIMAL_TOKEN = /^[1-9][0-9]{0,15}$/;
const CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const KNOWLEDGE_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;
const FIXTURE_REF = /^fixture_[A-Za-z0-9_-]{6,80}$/;
const EVENT_KEY_VERSION = /^(synthetic-event-identity-v[1-9][0-9]*|calapres-identity-hmac-v[1-9][0-9]*)$/;
const BASELINE_KEY_VERSION = /^(synthetic-v[1-9][0-9]*|calapres-hmac-v[1-9][0-9]*)$/;

class FailClosedError extends Error {
  constructor(reasonCode) {
    super(reasonCode);
    this.name = 'FailClosedError';
    this.reasonCode = reasonCode;
  }
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return plainObject(value) &&
    Object.keys(value).length === expected.size &&
    Object.keys(value).every((key) => expected.has(key));
}

function utf8Bytes(value) {
  if (typeof value !== 'string') throw new FailClosedError('utf8_string_required');
  const bytes = [];
  for (const symbol of value) {
    const codePoint = symbol.codePointAt(0);
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

function concatBytes(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function requireBytes(value) {
  if (!(value instanceof Uint8Array)) {
    throw new FailClosedError('raw_body_bytes_required');
  }
  return value;
}

function copyBytes(value) {
  return new Uint8Array(requireBytes(value));
}

function decodeUtf8Strict(bytes, dependencies) {
  if (dependencies.utf8 && typeof dependencies.utf8.decode === 'function') {
    return dependencies.utf8.decode(bytes);
  }
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
  throw new FailClosedError('utf8_decoder_unavailable');
}

function isoFromEpochSeconds(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new FailClosedError('clock_invalid');
  }
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) throw new FailClosedError('clock_invalid');
  return date.toISOString();
}

function parseIso(value) {
  if (typeof value !== 'string' || !STRICT_ISO_TIMESTAMP.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function canonicalJson(value) {
  return JSON.stringify(value);
}

function positiveDecimalToken(value, field) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (
    typeof value !== 'string' ||
    !POSITIVE_DECIMAL_TOKEN.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    String(Number(value)) !== value
  ) {
    throw new FailClosedError(field + '_invalid');
  }
  return value;
}

function normalizeIntegerId(value, field) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new FailClosedError(field + '_invalid');
  }
  return value;
}

function hasOwn(value, field) {
  return plainObject(value) && Object.prototype.hasOwnProperty.call(value, field);
}

function nowEpochSeconds(dependencies) {
  if (!dependencies.clock || typeof dependencies.clock.nowEpochSeconds !== 'function') {
    throw new FailClosedError('clock_unavailable');
  }
  const value = dependencies.clock.nowEpochSeconds();
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new FailClosedError('clock_invalid');
  }
  return value;
}

function cryptoProvider(dependencies) {
  const provider = dependencies.crypto;
  if (
    !provider ||
    typeof provider.sha256Hex !== 'function' ||
    typeof provider.hmacSha256Hex !== 'function' ||
    typeof provider.timingSafeEqualHex !== 'function'
  ) {
    throw new FailClosedError('crypto_unavailable');
  }
  return provider;
}

function sha256Hex(dependencies, bytes) {
  const result = cryptoProvider(dependencies).sha256Hex(requireBytes(bytes));
  if (!HEX_64.test(result || '')) throw new FailClosedError('crypto_invalid_output');
  return result;
}

function hmacSha256Hex(dependencies, secret, bytes) {
  if (typeof secret !== 'string' || secret.length < 16) {
    throw new FailClosedError('hmac_secret_unavailable');
  }
  const result = cryptoProvider(dependencies).hmacSha256Hex(secret, requireBytes(bytes));
  if (!HEX_64.test(result || '')) throw new FailClosedError('crypto_invalid_output');
  return result;
}

function timingSafeEqualHex(dependencies, left, right) {
  if (!HEX_64.test(left || '') || !HEX_64.test(right || '')) return false;
  return cryptoProvider(dependencies).timingSafeEqualHex(left, right) === true;
}

function ingressBase(rawBodySizeBytes, receivedAt) {
  return {
    schema_version: '1.0',
    kind: 'chatwoot_hmac_v1',
    source: 'chatwoot_signed_ingress_topology',
    evidence_id: 'cwi_000000000000000000000000',
    signature_algorithm: 'hmac-sha256',
    signature_message_format: '{timestamp}.{raw_body_utf8_bytes}',
    raw_body_size_bytes: rawBodySizeBytes,
    max_raw_body_size_bytes: MAX_RAW_BODY_SIZE_BYTES,
    body_sha256: null,
    delivery_id_source: null,
    delivery_id_fingerprint: null,
    delivery_id_trusted: false,
    event_timestamp: null,
    received_at: receivedAt,
    verification_completed_at: receivedAt,
    max_age_seconds: MAX_AGE_SECONDS,
    max_future_skew_seconds: MAX_FUTURE_SKEW_SECONDS,
    signature_verified: false,
    timestamp_verified: false,
    replay_protection_verified: false,
    replay_key_material_format: 'sha256({signature_header}:{timestamp}:{body_sha256})',
    replay_key_fingerprint: null,
    accepted: false,
    normalization_allowed: false,
    reason_code: 'verification_unavailable',
    transient_only: true,
    persistence_allowed: false,
    wait_payload_allowed: false,
    data_table_payload_allowed: false,
    audit_payload_allowed: false,
    customer_egress_allowed: false,
  };
}

function canonicalEventIdentityTuple(payload) {
  if (!plainObject(payload)) throw new FailClosedError('payload_not_object');
  if (hasOwn(payload, 'account') && !plainObject(payload.account)) {
    throw new FailClosedError('account_container_invalid');
  }
  if (hasOwn(payload, 'inbox') && !plainObject(payload.inbox)) {
    throw new FailClosedError('inbox_container_invalid');
  }
  if (hasOwn(payload, 'conversation') && !plainObject(payload.conversation)) {
    throw new FailClosedError('conversation_container_invalid');
  }

  const accountContainer = hasOwn(payload, 'account');
  const inboxContainer = hasOwn(payload, 'inbox');
  const conversationContainer = hasOwn(payload, 'conversation');
  if (accountContainer && hasOwn(payload, 'account_id')) {
    throw new FailClosedError('account_id_alias_conflict');
  }
  if (inboxContainer && hasOwn(payload, 'inbox_id')) {
    throw new FailClosedError('inbox_id_alias_conflict');
  }
  if (conversationContainer && hasOwn(payload, 'conversation_id')) {
    throw new FailClosedError('conversation_id_alias_conflict');
  }
  if (hasOwn(payload, 'id') && hasOwn(payload, 'message_id')) {
    throw new FailClosedError('message_id_alias_conflict');
  }

  const accountValue = accountContainer ? payload.account.id : payload.account_id;
  const inboxValue = inboxContainer ? payload.inbox.id : payload.inbox_id;
  const conversationValue = conversationContainer
    ? payload.conversation.id
    : payload.conversation_id;
  const messageValue = hasOwn(payload, 'id') ? payload.id : payload.message_id;
  const accountId = normalizeIntegerId(accountValue, 'account_id');
  const inboxId = normalizeIntegerId(inboxValue, 'inbox_id');
  if (accountId !== ACCOUNT_ID) throw new FailClosedError('account_not_allowlisted');
  if (!INBOX_CHANNELS[inboxId]) throw new FailClosedError('inbox_not_allowlisted');
  if (
    conversationContainer &&
    hasOwn(payload.conversation, 'inbox_id') &&
    payload.conversation.inbox_id !== inboxId
  ) {
    throw new FailClosedError('inbox_mismatch');
  }
  if (
    conversationContainer &&
    hasOwn(payload.conversation, 'account_id') &&
    payload.conversation.account_id !== accountId
  ) {
    throw new FailClosedError('account_mismatch');
  }
  if (payload.event !== 'message_created') {
    throw new FailClosedError('event_not_supported');
  }

  return {
    schema_version: '1.0',
    account_id: accountId,
    inbox_id: inboxId,
    event: 'message_created',
    conversation_id: positiveDecimalToken(conversationValue, 'conversation_id'),
    message_id: positiveDecimalToken(messageValue, 'message_id'),
  };
}

function eventIdentityFingerprint(dependencies, canonicalTuple, secret) {
  return hmacSha256Hex(
    dependencies,
    secret,
    utf8Bytes(canonicalJson(canonicalTuple)),
  );
}

function anchorMessageFingerprint(dependencies, canonicalTuple, keyVersion, secret) {
  const eventFingerprint = eventIdentityFingerprint(dependencies, canonicalTuple, secret);
  const canonical = {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: canonicalTuple.account_id,
    inbox_id: canonicalTuple.inbox_id,
    conversation_id: canonicalTuple.conversation_id,
    message_id: canonicalTuple.message_id,
    direction: 'inbound',
    visibility: 'public',
    event_identity_key_version: keyVersion,
    event_identity_fingerprint: eventFingerprint,
  };
  return hmacSha256Hex(
    dependencies,
    secret,
    utf8Bytes(ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + canonicalJson(canonical)),
  );
}

function canonicalWaitCarrier(waitState) {
  const ordered = {};
  for (const field of WAIT_CARRIER_FIELD_ORDER) ordered[field] = waitState[field];
  return canonicalJson(ordered);
}

function validateWaitState(dependencies, waitState) {
  const errors = [];
  if (!plainObject(waitState)) return ['wait_state_shape_invalid'];
  if (!exactKeys(waitState, WAIT_CARRIER_EXACT_KEYS)) errors.push('wait_state_shape_invalid');
  if (waitState.schema_version !== '1.0') errors.push('wait_schema_invalid');
  if (waitState.brand_id !== 'calapres') errors.push('wait_brand_invalid');
  if (waitState.account_id !== ACCOUNT_ID) errors.push('wait_account_invalid');
  if (INBOX_CHANNELS[waitState.inbox_id] !== waitState.channel) errors.push('wait_route_invalid');
  try {
    positiveDecimalToken(waitState.conversation_id, 'conversation_id');
    positiveDecimalToken(waitState.anchor_message_id, 'anchor_message_id');
  } catch (error) {
    errors.push(error.reasonCode || 'wait_identifier_invalid');
  }
  if (!HEX_64.test(waitState.conversation_fingerprint || '')) errors.push('wait_conversation_fingerprint_invalid');
  if (!HEX_64.test(waitState.message_fingerprint || '')) errors.push('wait_message_fingerprint_invalid');
  if (!CORRELATION_ID.test(waitState.correlation_id || '')) errors.push('wait_correlation_id_invalid');
  if (!EVENT_KEY_VERSION.test(waitState.event_identity_key_version || '')) errors.push('wait_event_key_version_invalid');
  if (!HEX_64.test(waitState.event_identity_fingerprint || '')) errors.push('wait_event_identity_invalid');
  if (!Number.isInteger(waitState.generation) || waitState.generation < 1) errors.push('wait_generation_invalid');
  if (!BASELINE_KEY_VERSION.test(waitState.baseline_fingerprint_key_version || '')) errors.push('wait_baseline_key_version_invalid');
  if (!HEX_64.test(waitState.baseline_status_fingerprint || '')) errors.push('wait_baseline_status_invalid');
  if (!HEX_64.test(waitState.baseline_assignee_fingerprint || '')) errors.push('wait_baseline_assignee_invalid');
  if (!HEX_64.test(waitState.wait_state_fingerprint || '')) errors.push('wait_fingerprint_invalid');
  const notBefore = parseIso(waitState.not_before);
  if (notBefore === null) errors.push('wait_not_before_invalid');
  if (waitState.delay_policy_version !== '2026-08-11-v1') errors.push('wait_delay_policy_invalid');
  if (!Number.isInteger(waitState.delay_seconds)) errors.push('wait_delay_seconds_invalid');
  if (!KNOWLEDGE_VERSION.test(waitState.knowledge_version || '')) errors.push('wait_knowledge_version_invalid');
  if (waitState.delay_mode === 'synthetic_test') {
    if (waitState.delay_seconds !== 1) errors.push('wait_synthetic_delay_invalid');
    if (waitState.event_identity_key_version !== 'synthetic-event-identity-v1') {
      errors.push('wait_synthetic_event_key_invalid');
    }
    if (waitState.baseline_fingerprint_key_version !== 'synthetic-v1') {
      errors.push('wait_synthetic_baseline_key_invalid');
    }
    if (!FIXTURE_REF.test(waitState.fixture_ref || '')) errors.push('wait_fixture_ref_invalid');
  } else if (waitState.delay_mode === 'live_observation') {
    const minimum = waitState.channel === 'email' ? 120 : 30;
    const maximum = waitState.channel === 'email' ? 300 : 75;
    if (
      !Number.isInteger(waitState.delay_seconds) ||
      waitState.delay_seconds < minimum ||
      waitState.delay_seconds > maximum
    ) {
      errors.push('wait_live_delay_invalid');
    }
    if (!/^calapres-identity-hmac-v[1-9][0-9]*$/.test(waitState.event_identity_key_version || '')) {
      errors.push('wait_live_event_key_invalid');
    }
    if (!/^calapres-hmac-v[1-9][0-9]*$/.test(waitState.baseline_fingerprint_key_version || '')) {
      errors.push('wait_live_baseline_key_invalid');
    }
    if (waitState.fixture_ref !== null) errors.push('wait_live_fixture_ref_invalid');
  } else {
    errors.push('wait_delay_mode_invalid');
  }
  if (waitState.customer_egress_allowed !== false) errors.push('wait_egress_invalid');
  if (errors.length === 0) {
    const expected = sha256Hex(dependencies, utf8Bytes(canonicalWaitCarrier(waitState)));
    if (!timingSafeEqualHex(dependencies, expected, waitState.wait_state_fingerprint)) {
      errors.push('wait_state_fingerprint_invalid');
    }
  }
  return errors;
}

function normalizeKeyEntry(entry, expectedVersion, allowedStates, minimumRetainUntil) {
  if (!plainObject(entry) || entry.version !== expectedVersion) {
    throw new FailClosedError('key_version_unavailable');
  }
  if (!allowedStates.has(entry.state)) throw new FailClosedError('key_state_invalid');
  if (typeof entry.secret !== 'string' || entry.secret.length < 16) {
    throw new FailClosedError('hmac_secret_unavailable');
  }
  if (
    entry.state === 'retained' &&
    (
      !Number.isSafeInteger(entry.retainUntilEpochSeconds) ||
      entry.retainUntilEpochSeconds < minimumRetainUntil
    )
  ) {
    throw new FailClosedError('retained_key_expired');
  }
  return entry;
}

async function resolveEventKey(
  dependencies,
  version,
  minimumRetainUntil,
  allowedStates = new Set(['active', 'retained']),
) {
  if (
    !dependencies.eventIdentityKeys ||
    typeof dependencies.eventIdentityKeys.get !== 'function'
  ) {
    throw new FailClosedError('event_identity_keyring_unavailable');
  }
  const entry = await dependencies.eventIdentityKeys.get(version);
  return normalizeKeyEntry(entry, version, allowedStates, minimumRetainUntil);
}

async function resolveBaselineKey(dependencies, version, minimumRetainUntil) {
  if (!dependencies.baselineKeys || typeof dependencies.baselineKeys.get !== 'function') {
    throw new FailClosedError('baseline_keyring_unavailable');
  }
  const entry = await dependencies.baselineKeys.get(version);
  return normalizeKeyEntry(
    entry,
    version,
    new Set(['active', 'retained']),
    minimumRetainUntil,
  );
}

function mapHttpFailure(statusCode) {
  if (statusCode === 401) return 'unauthorized';
  if (statusCode === 403) return 'forbidden';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 429) return 'rate_limited';
  return 'unavailable';
}

function normalizedHttpResponse(value) {
  if (!plainObject(value) || !Number.isInteger(value.statusCode)) {
    return { statusCode: null, body: null };
  }
  return { statusCode: value.statusCode, body: value.body };
}

function conversationRoute(value, waitState) {
  if (!plainObject(value)) return { valid: false };
  const inboxId = hasOwn(value, 'inbox_id')
    ? value.inbox_id
    : plainObject(value.inbox)
      ? value.inbox.id
      : null;
  const accountId = hasOwn(value, 'account_id') ? value.account_id : null;
  let conversationId;
  try {
    conversationId = positiveDecimalToken(value.id, 'conversation_id');
  } catch (_error) {
    return { valid: false };
  }
  if (
    accountId !== waitState.account_id ||
    inboxId !== waitState.inbox_id ||
    conversationId !== waitState.conversation_id ||
    !['open', 'resolved', 'pending', 'snoozed'].includes(value.status)
  ) {
    return { valid: false };
  }
  const assigneeCandidates = [];
  const collectAssignee = (container, field) => {
    if (!plainObject(container) || !hasOwn(container, field)) return true;
    const candidate = container[field];
    if (field === 'assignee_id') {
      assigneeCandidates.push(candidate);
      return true;
    }
    if (candidate === null) {
      assigneeCandidates.push(null);
      return true;
    }
    if (!plainObject(candidate) || !hasOwn(candidate, 'id')) return false;
    if (hasOwn(candidate, 'account_id') && candidate.account_id !== waitState.account_id) {
      return false;
    }
    assigneeCandidates.push(candidate.id);
    return true;
  };
  if (
    !collectAssignee(value, 'assignee_id') ||
    !collectAssignee(value, 'assignee') ||
    !collectAssignee(value.meta, 'assignee') ||
    assigneeCandidates.length === 0
  ) {
    return { valid: false };
  }
  for (const candidate of assigneeCandidates) {
    if (
      candidate !== null &&
      !(typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate > 0)
    ) {
      return { valid: false };
    }
  }
  const assigneeId = assigneeCandidates[0];
  if (assigneeCandidates.some((candidate) => candidate !== assigneeId)) {
    return { valid: false };
  }
  return {
    valid: true,
    status: value.status,
    assigneeId,
  };
}

function conversationStateFingerprint(dependencies, secret, waitState, kind, value) {
  const domain = kind === 'status' ? STATUS_FINGERPRINT_DOMAIN : ASSIGNEE_FINGERPRINT_DOMAIN;
  const canonical = {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: waitState.account_id,
    inbox_id: waitState.inbox_id,
    conversation_id: waitState.conversation_id,
  };
  if (kind === 'status') canonical.status = value;
  else canonical.assignee_id = value;
  return hmacSha256Hex(
    dependencies,
    secret,
    utf8Bytes(domain + canonicalJson(canonical)),
  );
}

function normalizeMessageRow(dependencies, row, waitState, eventKey) {
  if (!plainObject(row)) throw new FailClosedError('schema_invalid');
  if (
    !Number.isSafeInteger(row.id) ||
    row.id < 1 ||
    row.id > Number.MAX_SAFE_INTEGER ||
    row.account_id !== waitState.account_id ||
    row.inbox_id !== waitState.inbox_id ||
    positiveDecimalToken(row.conversation_id, 'conversation_id') !== waitState.conversation_id ||
    ![0, 1, 2].includes(row.message_type) ||
    typeof row.private !== 'boolean' ||
    !Number.isSafeInteger(row.created_at) ||
    row.created_at < 0
  ) {
    throw new FailClosedError('schema_invalid');
  }
  const tuple = {
    schema_version: '1.0',
    account_id: waitState.account_id,
    inbox_id: waitState.inbox_id,
    event: 'message_created',
    conversation_id: waitState.conversation_id,
    message_id: String(row.id),
  };
  const eventFingerprint = eventIdentityFingerprint(dependencies, tuple, eventKey.secret);
  const direction = row.message_type === 0 ? 'inbound' : row.message_type === 1 ? 'outbound' : 'activity';
  const visibility = row.private ? 'private' : 'public';
  const messageCanonical = {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: waitState.account_id,
    inbox_id: waitState.inbox_id,
    conversation_id: waitState.conversation_id,
    message_id: String(row.id),
    direction,
    visibility,
    event_identity_key_version: waitState.event_identity_key_version,
    event_identity_fingerprint: eventFingerprint,
  };
  const messageFingerprint = hmacSha256Hex(
    dependencies,
    eventKey.secret,
    utf8Bytes(ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + canonicalJson(messageCanonical)),
  );
  const senderType = plainObject(row.sender) && typeof row.sender.type === 'string'
    ? row.sender.type.toLowerCase()
    : null;
  return {
    id: row.id,
    messageType: row.message_type,
    private: row.private,
    createdAt: isoFromEpochSeconds(row.created_at),
    fingerprint: messageFingerprint,
    senderType,
  };
}

function scanMessageResponse(dependencies, response, waitState, eventKey) {
  const normalizedResponse = normalizedHttpResponse(response);
  if (normalizedResponse.statusCode !== 200) {
    return {
      status: mapHttpFailure(normalizedResponse.statusCode),
      httpStatus: normalizedResponse.statusCode,
    };
  }
  if (!plainObject(normalizedResponse.body) || !Array.isArray(normalizedResponse.body.payload)) {
    return { status: 'schema_invalid', httpStatus: 200 };
  }
  const rawRows = normalizedResponse.body.payload;
  if (rawRows.length >= SCAN_PAGE_SIZE_LIMIT) {
    return { status: 'scan_truncated', httpStatus: 200, rawCount: rawRows.length };
  }
  if (rawRows.length < 1) {
    return { status: 'anchor_missing', httpStatus: 200, rawCount: rawRows.length };
  }
  let rows;
  try {
    rows = rawRows.map((row) => normalizeMessageRow(dependencies, row, waitState, eventKey));
  } catch (_error) {
    return { status: 'schema_invalid', httpStatus: 200, rawCount: rawRows.length };
  }
  const anchorId = Number(waitState.anchor_message_id);
  const uniqueIds = new Set(rows.map((row) => row.id));
  if (
    uniqueIds.size !== rows.length ||
    rows.some((row) => row.id < anchorId)
  ) {
    return { status: 'schema_invalid', httpStatus: 200, rawCount: rawRows.length };
  }
  const anchors = rows.filter((row) => row.id === anchorId);
  if (
    anchors.length !== 1 ||
    anchors[0].fingerprint !== waitState.message_fingerprint
  ) {
    return { status: 'anchor_missing', httpStatus: 200, rawCount: rawRows.length };
  }
  if (anchors[0].messageType !== 0 || anchors[0].private !== false) {
    return { status: 'schema_invalid', httpStatus: 200, rawCount: rawRows.length };
  }
  const nonActivity = rows.filter((row) => row.messageType !== 2);
  if (nonActivity.length < 1) {
    return { status: 'schema_invalid', httpStatus: 200, rawCount: rawRows.length };
  }
  const setPairs = rows
    .map((row) => [row.id, row.fingerprint])
    .sort((left, right) => left[0] - right[0]);
  const setFingerprint = sha256Hex(
    dependencies,
    utf8Bytes(MESSAGE_SET_FINGERPRINT_DOMAIN + canonicalJson(setPairs)),
  );
  return {
    status: 'verified',
    httpStatus: 200,
    rawCount: rawRows.length,
    rows,
    anchor: anchors[0],
    setFingerprint,
    highestMessageId: Math.max(...rows.map((row) => row.id)),
    highestNonActivityId: Math.max(...nonActivity.map((row) => row.id)),
  };
}

function latestRow(rows, predicate) {
  const matches = rows.filter(predicate);
  if (matches.length === 0) return null;
  return matches.reduce((latest, row) => (row.id > latest.id ? row : latest));
}

function applyLatestEvidence(target, prefix, row) {
  const sourceField = prefix + '_created_at_source';
  const orderingField = prefix + '_ordering_id';
  target[prefix + '_fingerprint'] = row ? row.fingerprint : null;
  target[prefix + '_created_at'] = row ? row.createdAt : null;
  target[sourceField] = row ? 'chatwoot_message.created_at_unix_seconds' : null;
  target[orderingField] = row ? row.id : null;
}

function liveRereadFailure(
  dependencies,
  waitState,
  readStartedAt,
  status,
  httpStatus,
  responseFingerprint = null,
) {
  const checkedAt = isoFromEpochSeconds(nowEpochSeconds(dependencies));
  const seed = waitState.wait_state_fingerprint + ':' + readStartedAt + ':' + status;
  const evidenceIdHash = sha256Hex(dependencies, utf8Bytes(seed));
  return {
    schema_version: '1.0',
    kind: 'chatwoot_live_reread_v1',
    source: 'chatwoot_live_api_topology',
    evidence_id: 'cwr_' + evidenceIdHash.slice(0, 24),
    brand_id: 'calapres',
    account_id: waitState.account_id,
    inbox_id: waitState.inbox_id,
    channel: waitState.channel,
    conversation_id: waitState.conversation_id,
    anchor_message_id: waitState.anchor_message_id,
    anchor_message_ordering_id: Number(waitState.anchor_message_id),
    generation: waitState.generation,
    wait_state_fingerprint: waitState.wait_state_fingerprint,
    event_identity_key_version: waitState.event_identity_key_version,
    event_identity_fingerprint: waitState.event_identity_fingerprint,
    event_identity_anchor_verified: null,
    not_before: waitState.not_before,
    read_started_at: readStartedAt,
    checked_at: checkedAt,
    live_read_status: status,
    http_status: httpStatus,
    source_verified: false,
    route_verified: false,
    response_fingerprint: responseFingerprint,
    anchor_message_fingerprint: null,
    anchor_message_type: null,
    anchor_private: null,
    anchor_message_created_at: null,
    anchor_message_created_at_source: null,
    latest_inbound_fingerprint: null,
    latest_inbound_created_at: null,
    latest_inbound_created_at_source: null,
    latest_inbound_ordering_id: null,
    latest_public_human_reply_fingerprint: null,
    latest_public_human_reply_created_at: null,
    latest_public_human_reply_created_at_source: null,
    latest_public_human_reply_ordering_id: null,
    latest_private_note_fingerprint: null,
    latest_private_note_created_at: null,
    latest_private_note_created_at_source: null,
    latest_private_note_ordering_id: null,
    latest_non_activity_fingerprint: null,
    latest_non_activity_created_at: null,
    latest_non_activity_created_at_source: null,
    latest_non_activity_ordering_id: null,
    scan_strategy: 'chatwoot_double_bounded_after_anchor_minus_one_v1',
    scan_page_size_limit: SCAN_PAGE_SIZE_LIMIT,
    scan_after_id: null,
    scan_first_count: null,
    scan_second_count: null,
    scan_first_all_rows_valid: null,
    scan_second_all_rows_valid: null,
    scan_first_set_fingerprint: null,
    scan_second_set_fingerprint: null,
    scan_sets_equal: null,
    scan_anchor_present_first: null,
    scan_anchor_present_second: null,
    scan_anchor_fingerprint_first: null,
    scan_anchor_fingerprint_second: null,
    scan_highest_message_id: null,
    scan_highest_non_activity_id: null,
    scan_complete: null,
    conversation_before_route_verified: null,
    conversation_after_route_verified: null,
    conversation_before_status_fingerprint: null,
    conversation_after_status_fingerprint: null,
    conversation_before_assignee_fingerprint: null,
    conversation_after_assignee_fingerprint: null,
    conversation_snapshots_stable: null,
    baseline_fingerprint_key_version: waitState.baseline_fingerprint_key_version,
    baseline_status_fingerprint: waitState.baseline_status_fingerprint,
    current_status_fingerprint: null,
    baseline_assignee_fingerprint: waitState.baseline_assignee_fingerprint,
    current_assignee_fingerprint: null,
    anchor_message_present: null,
    anchor_is_latest_inbound: null,
    newer_inbound_present: null,
    public_human_reply_present: null,
    private_note_present: null,
    newer_non_activity_present: null,
    status_changed: null,
    assignee_changed: null,
    transient_only: true,
    persistence_allowed: false,
    wait_payload_allowed: false,
    data_table_payload_allowed: false,
    audit_payload_allowed: false,
    customer_egress_allowed: false,
  };
}

function evidenceBindingErrors(dependencies, evidence, waitState) {
  const errors = validateWaitState(dependencies, waitState);
  const bindings = [
    ['brand_id', 'brand_id'],
    ['account_id', 'account_id'],
    ['inbox_id', 'inbox_id'],
    ['channel', 'channel'],
    ['conversation_id', 'conversation_id'],
    ['anchor_message_id', 'anchor_message_id'],
    ['generation', 'generation'],
    ['wait_state_fingerprint', 'wait_state_fingerprint'],
    ['event_identity_key_version', 'event_identity_key_version'],
    ['event_identity_fingerprint', 'event_identity_fingerprint'],
    ['not_before', 'not_before'],
    ['baseline_fingerprint_key_version', 'baseline_fingerprint_key_version'],
    ['baseline_status_fingerprint', 'baseline_status_fingerprint'],
    ['baseline_assignee_fingerprint', 'baseline_assignee_fingerprint'],
  ];
  for (const [evidenceField, waitField] of bindings) {
    if (evidence[evidenceField] !== waitState[waitField]) {
      errors.push('wait_binding_' + evidenceField + '_mismatch');
    }
  }
  if (evidence.anchor_message_ordering_id !== Number(waitState.anchor_message_id)) {
    errors.push('anchor_message_ordering_id_mismatch');
  }
  if (
    evidence.source_verified === true &&
    evidence.anchor_message_fingerprint !== waitState.message_fingerprint
  ) {
    errors.push('anchor_message_fingerprint_mismatch');
  }
  if (evidence.source_verified === true && evidence.event_identity_anchor_verified !== true) {
    errors.push('event_identity_anchor_not_verified');
  }
  return errors;
}

function verifiedEvidenceSemanticErrors(evidence) {
  if (evidence.source_verified !== true) return [];
  const errors = [];
  const anchor = evidence.anchor_message_ordering_id;
  const notBefore = parseIso(evidence.not_before);
  const readStarted = parseIso(evidence.read_started_at);
  const checkedAt = parseIso(evidence.checked_at);
  if (notBefore === null || readStarted === null || checkedAt === null) {
    errors.push('live_reread_timestamp_invalid');
  } else {
    if (readStarted < notBefore) errors.push('read_started_before_not_before');
    if (checkedAt < readStarted) errors.push('checked_before_read_started');
  }
  if (evidence.live_read_status !== 'verified' || evidence.route_verified !== true) {
    errors.push('verified_source_state_invalid');
  }
  if (!Number.isSafeInteger(anchor) || anchor < 1) errors.push('anchor_ordering_id_invalid');
  if (evidence.scan_after_id !== anchor - 1) errors.push('scan_anchor_cursor_mismatch');
  for (const [label, count] of [
    ['first', evidence.scan_first_count],
    ['second', evidence.scan_second_count],
  ]) {
    if (!Number.isInteger(count) || count < 1 || count >= SCAN_PAGE_SIZE_LIMIT) {
      errors.push('scan_' + label + '_count_invalid');
    }
  }
  if (evidence.scan_first_count !== evidence.scan_second_count) errors.push('scan_count_changed');
  if (evidence.scan_first_all_rows_valid !== true) errors.push('scan_first_invalid');
  if (evidence.scan_second_all_rows_valid !== true) errors.push('scan_second_invalid');
  if (evidence.scan_first_set_fingerprint !== evidence.scan_second_set_fingerprint) errors.push('scan_set_changed');
  if (evidence.scan_sets_equal !== true) errors.push('scan_sets_not_equal');
  if (evidence.scan_anchor_present_first !== true || evidence.scan_anchor_present_second !== true) errors.push('scan_anchor_missing');
  if (evidence.scan_anchor_fingerprint_first !== evidence.anchor_message_fingerprint) errors.push('scan_first_anchor_mismatch');
  if (evidence.scan_anchor_fingerprint_second !== evidence.anchor_message_fingerprint) errors.push('scan_second_anchor_mismatch');
  if (evidence.anchor_message_type !== 0 || evidence.anchor_private !== false) errors.push('anchor_invalid');
  if (evidence.scan_complete !== true) errors.push('scan_incomplete');
  if (
    !Number.isSafeInteger(evidence.scan_highest_message_id) ||
    evidence.scan_highest_message_id < anchor
  ) {
    errors.push('scan_highest_message_id_invalid');
  }
  if (
    !Number.isSafeInteger(evidence.scan_highest_non_activity_id) ||
    evidence.scan_highest_non_activity_id < anchor ||
    evidence.scan_highest_non_activity_id > evidence.scan_highest_message_id
  ) {
    errors.push('scan_highest_non_activity_id_invalid');
  }
  if (evidence.conversation_before_route_verified !== true || evidence.conversation_after_route_verified !== true) errors.push('conversation_route_unverified');
  if (evidence.conversation_snapshots_stable !== true) errors.push('conversation_changed');
  if (evidence.conversation_before_status_fingerprint !== evidence.conversation_after_status_fingerprint) errors.push('conversation_status_changed');
  if (evidence.conversation_before_assignee_fingerprint !== evidence.conversation_after_assignee_fingerprint) errors.push('conversation_assignee_changed');
  if (evidence.current_status_fingerprint !== evidence.conversation_after_status_fingerprint) errors.push('current_status_mismatch');
  if (evidence.current_assignee_fingerprint !== evidence.conversation_after_assignee_fingerprint) errors.push('current_assignee_mismatch');
  if (evidence.scan_highest_non_activity_id !== evidence.latest_non_activity_ordering_id) errors.push('non_activity_head_mismatch');
  for (const field of [
    'latest_inbound_ordering_id',
    'latest_public_human_reply_ordering_id',
    'latest_private_note_ordering_id',
    'latest_non_activity_ordering_id',
  ]) {
    const value = evidence[field];
    if (value !== null && (!Number.isSafeInteger(value) || value > evidence.scan_highest_message_id)) {
      errors.push(field + '_invalid');
    }
  }
  const newerInbound = evidence.latest_inbound_ordering_id > anchor;
  if (evidence.newer_inbound_present !== newerInbound) errors.push('newer_inbound_mismatch');
  const anchorIsLatestInbound =
    evidence.latest_inbound_ordering_id === anchor &&
    evidence.latest_inbound_fingerprint === evidence.anchor_message_fingerprint;
  if (evidence.anchor_is_latest_inbound !== anchorIsLatestInbound) {
    errors.push('anchor_latest_inbound_mismatch');
  }
  const human = evidence.latest_public_human_reply_ordering_id !== null && evidence.latest_public_human_reply_ordering_id > anchor;
  if (evidence.public_human_reply_present !== human) errors.push('human_reply_mismatch');
  const privateNote = evidence.latest_private_note_ordering_id !== null && evidence.latest_private_note_ordering_id > anchor;
  if (evidence.private_note_present !== privateNote) errors.push('private_note_mismatch');
  const newerNonActivity = evidence.latest_non_activity_ordering_id > anchor;
  if (evidence.newer_non_activity_present !== newerNonActivity) errors.push('newer_non_activity_mismatch');
  if (evidence.status_changed !== (evidence.baseline_status_fingerprint !== evidence.current_status_fingerprint)) errors.push('status_changed_mismatch');
  if (evidence.assignee_changed !== (evidence.baseline_assignee_fingerprint !== evidence.current_assignee_fingerprint)) errors.push('assignee_changed_mismatch');
  return errors;
}

function liveRereadEvidenceShapeErrors(evidence) {
  const errors = [];
  let normalizedConversationId = null;
  let normalizedAnchorId = null;
  try {
    normalizedConversationId = positiveDecimalToken(evidence.conversation_id, 'conversation_id');
    normalizedAnchorId = positiveDecimalToken(evidence.anchor_message_id, 'anchor_message_id');
  } catch (_error) {
    errors.push('evidence_identifier_invalid');
  }
  if (
    evidence.brand_id !== 'calapres' ||
    evidence.account_id !== ACCOUNT_ID ||
    INBOX_CHANNELS[evidence.inbox_id] !== evidence.channel
  ) {
    errors.push('evidence_route_invalid');
  }
  if (
    normalizedConversationId !== evidence.conversation_id ||
    normalizedAnchorId !== evidence.anchor_message_id ||
    evidence.anchor_message_ordering_id !== Number(evidence.anchor_message_id)
  ) {
    errors.push('evidence_ordering_identity_invalid');
  }
  if (!Number.isInteger(evidence.generation) || evidence.generation < 1) {
    errors.push('evidence_generation_invalid');
  }
  if (
    !HEX_64.test(evidence.wait_state_fingerprint || '') ||
    !EVENT_KEY_VERSION.test(evidence.event_identity_key_version || '') ||
    !HEX_64.test(evidence.event_identity_fingerprint || '') ||
    !BASELINE_KEY_VERSION.test(evidence.baseline_fingerprint_key_version || '') ||
    !HEX_64.test(evidence.baseline_status_fingerprint || '') ||
    !HEX_64.test(evidence.baseline_assignee_fingerprint || '')
  ) {
    errors.push('evidence_binding_material_invalid');
  }
  if (
    evidence.scan_strategy !== 'chatwoot_double_bounded_after_anchor_minus_one_v1' ||
    evidence.scan_page_size_limit !== SCAN_PAGE_SIZE_LIMIT
  ) {
    errors.push('evidence_scan_policy_invalid');
  }
  if (parseIso(evidence.not_before) === null) errors.push('evidence_not_before_invalid');
  if (parseIso(evidence.read_started_at) === null) errors.push('evidence_read_started_invalid');
  if (parseIso(evidence.checked_at) === null) errors.push('evidence_checked_at_invalid');
  if (
    evidence.http_status !== null &&
    (!Number.isInteger(evidence.http_status) || evidence.http_status < 100 || evidence.http_status > 599)
  ) {
    errors.push('evidence_http_status_invalid');
  }
  if (evidence.source_verified === true) {
    if (
      evidence.live_read_status !== 'verified' ||
      evidence.http_status !== 200 ||
      evidence.route_verified !== true ||
      evidence.event_identity_anchor_verified !== true ||
      !HEX_64.test(evidence.response_fingerprint || '')
    ) {
      errors.push('verified_evidence_shape_invalid');
    }
    const requiredFingerprints = [
      'response_fingerprint',
      'anchor_message_fingerprint',
      'latest_inbound_fingerprint',
      'latest_non_activity_fingerprint',
      'scan_first_set_fingerprint',
      'scan_second_set_fingerprint',
      'scan_anchor_fingerprint_first',
      'scan_anchor_fingerprint_second',
      'conversation_before_status_fingerprint',
      'conversation_after_status_fingerprint',
      'conversation_before_assignee_fingerprint',
      'conversation_after_assignee_fingerprint',
      'current_status_fingerprint',
      'current_assignee_fingerprint',
    ];
    if (requiredFingerprints.some((field) => !HEX_64.test(evidence[field] || ''))) {
      errors.push('verified_fingerprint_invalid');
    }
    for (const field of [
      'latest_public_human_reply_fingerprint',
      'latest_private_note_fingerprint',
    ]) {
      if (evidence[field] !== null && !HEX_64.test(evidence[field] || '')) {
        errors.push(field + '_invalid');
      }
    }
    for (const field of [
      'anchor_message_created_at',
      'latest_inbound_created_at',
      'latest_non_activity_created_at',
    ]) {
      if (parseIso(evidence[field]) === null) errors.push(field + '_invalid');
    }
    for (const field of [
      'latest_public_human_reply_created_at',
      'latest_private_note_created_at',
    ]) {
      if (evidence[field] !== null && parseIso(evidence[field]) === null) {
        errors.push(field + '_invalid');
      }
    }
  } else if (evidence.source_verified === false) {
    if (evidence.route_verified !== false) errors.push('failure_route_state_invalid');
    if (evidence.live_read_status === 'route_mismatch') {
      if (evidence.http_status !== 200 || !HEX_64.test(evidence.response_fingerprint || '')) {
        errors.push('route_mismatch_shape_invalid');
      }
    } else {
      if (!LIVE_REREAD_FAILURE_STATUSES.has(evidence.live_read_status)) {
        errors.push('failure_status_invalid');
      }
      if (evidence.response_fingerprint !== null) {
        errors.push('failure_response_fingerprint_invalid');
      }
    }
    for (const field of LIVE_REREAD_FAILURE_NULL_FIELDS) {
      if (evidence[field] !== null) errors.push('failure_' + field + '_must_be_null');
    }
  } else {
    errors.push('source_verified_invalid');
  }
  return errors;
}

/*
 * Dependency boundary expected from the future n8n nodes:
 * - crypto: sha256Hex, hmacSha256Hex, timingSafeEqualHex
 * - clock: nowEpochSeconds
 * - secrets: chatwootWebhookSecret
 * - requestReplayStore: atomic claim
 * - eventIdentityKeys / baselineKeys: version-pinned secret lookup
 * - businessEventStore: read-only multi-fingerprint lookup
 * - chatwootRead: normalized read-only conversation and message calls
 *
 * No dependency is selected from webhook data or model output.
 */
function createChatwootObservationRuntime(dependencies) {
  const deps = plainObject(dependencies) ? dependencies : {};
  const verifiedIngressEvidence = new WeakMap();
  const verifiedEventIdentityResults = new WeakSet();

  async function verifySignedIngress(request) {
    const suppliedBody = requireBytes(request && request.rawBodyBytes);
    const receivedEpoch = nowEpochSeconds(deps);
    const receivedAt = isoFromEpochSeconds(receivedEpoch);
    const evidence = ingressBase(suppliedBody.length, receivedAt);

    if (suppliedBody.length === 0 || suppliedBody.length > MAX_RAW_BODY_SIZE_BYTES) {
      const reason = suppliedBody.length === 0 ? 'payload_empty' : 'payload_too_large';
      const rejectionSeed = utf8Bytes('body-size-rejected:' + suppliedBody.length + ':' + receivedAt);
      evidence.evidence_id = 'cwi_' + sha256Hex(deps, rejectionSeed).slice(0, 24);
      evidence.reason_code = reason;
      return evidence;
    }
    const body = copyBytes(suppliedBody);

    let bodySha256;
    try {
      bodySha256 = sha256Hex(deps, body);
    } catch (_error) {
      evidence.reason_code = 'verification_unavailable';
      return evidence;
    }
    evidence.body_sha256 = bodySha256;
    evidence.evidence_id = 'cwi_' + bodySha256.slice(0, 24);

    if (
      typeof request.deliveryHeader === 'string' &&
      request.deliveryHeader.length > 0 &&
      request.deliveryHeader.length <= 512
    ) {
      evidence.delivery_id_source = 'untrusted_header_metadata';
      evidence.delivery_id_fingerprint = sha256Hex(deps, utf8Bytes(request.deliveryHeader));
    }

    if (request.timestamp === null || request.timestamp === undefined || request.timestamp === '') {
      evidence.reason_code = 'timestamp_missing';
      return evidence;
    }
    if (typeof request.timestamp !== 'string' || !TIMESTAMP_HEADER.test(request.timestamp)) {
      evidence.reason_code = 'timestamp_malformed';
      return evidence;
    }
    evidence.event_timestamp = request.timestamp;
    const age = receivedEpoch - Number(request.timestamp);
    if (age > MAX_AGE_SECONDS) {
      evidence.reason_code = 'timestamp_stale';
      return evidence;
    }
    if (age < -MAX_FUTURE_SKEW_SECONDS) {
      evidence.reason_code = 'timestamp_future';
      return evidence;
    }
    evidence.timestamp_verified = true;

    if (request.signatureHeader === null || request.signatureHeader === undefined || request.signatureHeader === '') {
      evidence.reason_code = 'signature_missing';
      return evidence;
    }
    if (typeof request.signatureHeader !== 'string' || !SIGNATURE_HEADER.test(request.signatureHeader)) {
      evidence.reason_code = 'signature_malformed';
      return evidence;
    }

    let secret;
    let expectedDigest;
    try {
      if (!deps.secrets || typeof deps.secrets.chatwootWebhookSecret !== 'function') {
        throw new FailClosedError('chatwoot_webhook_secret_unavailable');
      }
      secret = await deps.secrets.chatwootWebhookSecret();
      const signedBytes = concatBytes(utf8Bytes(request.timestamp + '.'), body);
      expectedDigest = hmacSha256Hex(deps, secret, signedBytes);
    } catch (_error) {
      evidence.timestamp_verified = false;
      evidence.event_timestamp = null;
      evidence.reason_code = 'verification_unavailable';
      return evidence;
    }
    const suppliedDigest = request.signatureHeader.slice('sha256='.length);
    if (!timingSafeEqualHex(deps, expectedDigest, suppliedDigest)) {
      evidence.reason_code = 'signature_mismatch';
      return evidence;
    }
    evidence.signature_verified = true;

    const replayMaterial = request.signatureHeader + ':' + request.timestamp + ':' + bodySha256;
    const replayFingerprint = sha256Hex(deps, utf8Bytes(replayMaterial));
    evidence.replay_key_fingerprint = replayFingerprint;
    if (!deps.requestReplayStore || typeof deps.requestReplayStore.claim !== 'function') {
      evidence.reason_code = 'replay_store_unavailable';
      return evidence;
    }
    let claim;
    try {
      claim = await deps.requestReplayStore.claim({
        fingerprint: replayFingerprint,
        receivedAt,
        expiresAtEpochSeconds: receivedEpoch + MAX_AGE_SECONDS + MAX_FUTURE_SKEW_SECONDS,
      });
    } catch (_error) {
      evidence.reason_code = 'replay_store_unavailable';
      return evidence;
    }
    if (!plainObject(claim) || claim.atomic !== true || !['claimed', 'duplicate'].includes(claim.status)) {
      evidence.reason_code = 'replay_store_unavailable';
      return evidence;
    }
    if (claim.status === 'duplicate') {
      evidence.reason_code = 'duplicate_delivery';
      return evidence;
    }
    evidence.replay_protection_verified = true;
    evidence.accepted = true;
    evidence.normalization_allowed = true;
    evidence.reason_code = null;
    evidence.verification_completed_at = isoFromEpochSeconds(nowEpochSeconds(deps));
    verifiedIngressEvidence.set(evidence, bodySha256);
    return Object.freeze(evidence);
  }

  async function deriveEventIdentity(args) {
    const body = copyBytes(args && args.rawBodyBytes);
    const ingressEvidence = args && args.ingressEvidence;
    if (
      !plainObject(ingressEvidence) ||
      ingressEvidence.accepted !== true ||
      ingressEvidence.normalization_allowed !== true ||
      ingressEvidence.signature_verified !== true ||
      ingressEvidence.replay_protection_verified !== true
    ) {
      throw new FailClosedError('verified_ingress_required');
    }
    const topologyBodyFingerprint = verifiedIngressEvidence.get(ingressEvidence);
    if (!topologyBodyFingerprint) {
      throw new FailClosedError('topology_verified_ingress_required');
    }
    const bodyFingerprint = sha256Hex(deps, body);
    if (
      !timingSafeEqualHex(deps, bodyFingerprint, topologyBodyFingerprint) ||
      !timingSafeEqualHex(deps, topologyBodyFingerprint, ingressEvidence.body_sha256)
    ) {
      throw new FailClosedError('verified_ingress_body_mismatch');
    }
    let payload;
    try {
      payload = JSON.parse(decodeUtf8Strict(body, deps));
    } catch (_error) {
      throw new FailClosedError('verified_payload_json_invalid');
    }
    const tuple = canonicalEventIdentityTuple(payload);
    if (!deps.eventIdentityKeys || typeof deps.eventIdentityKeys.active !== 'function') {
      throw new FailClosedError('event_identity_keyring_unavailable');
    }
    const active = await deps.eventIdentityKeys.active();
    if (!plainObject(active) || !EVENT_KEY_VERSION.test(active.version || '')) {
      throw new FailClosedError('event_identity_keyring_invalid');
    }
    const key = normalizeKeyEntry(active, active.version, new Set(['active']));
    const fingerprint = eventIdentityFingerprint(deps, tuple, key.secret);
    const evidence = {
      schema_version: '1.0',
      kind: 'chatwoot_event_identity_v1',
      source: 'verified_parse_identity_topology',
      evidence_id: 'cei_' + fingerprint.slice(0, 24),
      ingress_evidence_ref: ingressEvidence.evidence_id,
      brand_scope: 'calapres',
      event_identity_key_version: key.version,
      canonical_tuple_format: EVENT_IDENTITY_CANONICAL_FORMAT,
      derived_channel: INBOX_CHANNELS[tuple.inbox_id],
      channel_source: 'allowlisted_inbox_mapping',
      event_identity_fingerprint: fingerprint,
      signature_verified_before_parse: true,
      replay_verified_before_parse: true,
      verified_parse: true,
      unsigned_delivery_used: false,
      payload_brand_used: false,
      raw_identifiers_in_evidence: false,
      durable_projection_field: 'event_identity_fingerprint',
      transient_only: true,
      persistence_allowed: false,
      wait_payload_allowed: false,
      data_table_payload_allowed: false,
      audit_payload_allowed: false,
      customer_egress_allowed: false,
    };
    const result = {
      evidence: Object.freeze(evidence),
      payload,
      canonicalTuple: Object.freeze(tuple),
    };
    verifiedEventIdentityResults.add(result);
    return Object.freeze(result);
  }

  async function dualReadBusinessEventIdentity(args) {
    const ttl = args && args.dedupTtlSeconds;
    const priorVersionsInputValid = !args ||
      args.requiredPriorVersions === undefined ||
      Array.isArray(args.requiredPriorVersions);
    const requiredPriorVersions = args && Array.isArray(args.requiredPriorVersions)
      ? args.requiredPriorVersions
      : [];
    const nowSupplied = Boolean(args && hasOwn(args, 'nowEpochSeconds'));
    const now = nowSupplied ? args.nowEpochSeconds : nowEpochSeconds(deps);
    const failure = (status) => ({
      schema_version: '1.0',
      brand_id: 'calapres',
      status,
      lookup_verified: false,
      unique: false,
      duplicate: null,
      active_key_version: null,
      active_event_identity_fingerprint: null,
      matched_key_version: null,
      candidate_event_identity_fingerprints: {},
      persistence_allowed: false,
      customer_egress_allowed: false,
    });
    if (!Number.isSafeInteger(ttl) || ttl < 1) return failure('dedup_ttl_invalid');
    if (!Number.isSafeInteger(now) || now < 0) return failure('clock_invalid');
    if (!priorVersionsInputValid || requiredPriorVersions.length > 8) {
      return failure('required_prior_keys_invalid');
    }
    if (
      !requiredPriorVersions.every((version) => EVENT_KEY_VERSION.test(version || '')) ||
      new Set(requiredPriorVersions).size !== requiredPriorVersions.length
    ) {
      return failure('required_prior_keys_invalid');
    }
    if (!deps.eventIdentityKeys || typeof deps.eventIdentityKeys.list !== 'function') {
      return failure('keyring_unavailable');
    }
    let entries;
    try {
      entries = await deps.eventIdentityKeys.list();
    } catch (_error) {
      return failure('keyring_unavailable');
    }
    if (!Array.isArray(entries) || entries.length < 1 || entries.length > 9) {
      return failure('keyring_invalid');
    }
    const allVersions = entries.map((entry) => plainObject(entry) ? entry.version : null);
    if (
      allVersions.some((version) => !EVENT_KEY_VERSION.test(version || '')) ||
      new Set(allVersions).size !== allVersions.length ||
      entries.some((entry) => !['active', 'retained'].includes(entry.state))
    ) {
      return failure('keyring_invalid');
    }
    const activeEntries = entries.filter((entry) => plainObject(entry) && entry.state === 'active');
    if (activeEntries.length !== 1) return failure('keyring_invalid');
    const active = activeEntries[0];
    if (
      !EVENT_KEY_VERSION.test(active.version || '') ||
      typeof active.secret !== 'string' ||
      active.secret.length < 16
    ) {
      return failure('keyring_invalid');
    }
    for (const version of requiredPriorVersions) {
      const retained = entries.find((entry) => entry && entry.version === version);
      if (!retained || retained.state !== 'retained') return failure('required_prior_key_missing');
      if (typeof retained.secret !== 'string' || retained.secret.length < 16) {
        return failure('required_prior_key_unavailable');
      }
      if (!Number.isSafeInteger(retained.retainUntilEpochSeconds) || retained.retainUntilEpochSeconds < now + ttl) {
        return failure('prior_key_retention_insufficient');
      }
    }
    const identityResult = args && args.identityResult;
    if (
      !plainObject(identityResult) ||
      !verifiedEventIdentityResults.has(identityResult) ||
      !plainObject(identityResult.evidence) ||
      !plainObject(identityResult.canonicalTuple) ||
      identityResult.evidence.kind !== 'chatwoot_event_identity_v1' ||
      identityResult.evidence.verified_parse !== true ||
      identityResult.evidence.signature_verified_before_parse !== true ||
      identityResult.evidence.replay_verified_before_parse !== true ||
      identityResult.evidence.event_identity_key_version !== active.version
    ) {
      return failure('verified_event_identity_required');
    }
    let tuple;
    try {
      tuple = canonicalEventIdentityTuple(identityResult.canonicalTuple);
    } catch (_error) {
      return failure('event_identity_tuple_invalid');
    }
    const activeFingerprint = eventIdentityFingerprint(deps, tuple, active.secret);
    if (
      !timingSafeEqualHex(
        deps,
        activeFingerprint,
        identityResult.evidence.event_identity_fingerprint,
      )
    ) {
      return failure('verified_event_identity_mismatch');
    }
    const candidates = {};
    const orderedEntries = [
      active,
      ...entries
        .filter((entry) => entry.version !== active.version)
        .sort((left, right) => left.version.localeCompare(right.version)),
    ];
    for (const entry of orderedEntries) {
      if (!plainObject(entry) || !EVENT_KEY_VERSION.test(entry.version || '')) continue;
      const usable = entry.state === 'active' || (
        entry.state === 'retained' &&
        Number.isSafeInteger(entry.retainUntilEpochSeconds) &&
        entry.retainUntilEpochSeconds >= now + ttl
      );
      if (!usable || typeof entry.secret !== 'string' || entry.secret.length < 16) continue;
      candidates[entry.version] = eventIdentityFingerprint(deps, tuple, entry.secret);
    }
    if (!candidates[active.version]) return failure('keyring_invalid');
    if (!deps.businessEventStore || typeof deps.businessEventStore.lookup !== 'function') {
      return failure('dedup_store_unavailable');
    }
    let lookup;
    try {
      lookup = await deps.businessEventStore.lookup({
        brandId: 'calapres',
        candidateFingerprints: { ...candidates },
      });
    } catch (_error) {
      return failure('dedup_store_unavailable');
    }
    if (
      !plainObject(lookup) ||
      lookup.verified !== true ||
      !Array.isArray(lookup.existingFingerprints) ||
      lookup.existingFingerprints.some((value) => !HEX_64.test(value || ''))
    ) {
      return failure('dedup_store_unavailable');
    }
    const existing = new Set(lookup.existingFingerprints.filter((value) => HEX_64.test(value || '')));
    const matchedVersion = Object.keys(candidates).find((version) => existing.has(candidates[version])) || null;
    return {
      schema_version: '1.0',
      brand_id: 'calapres',
      status: matchedVersion ? 'duplicate' : 'unique',
      lookup_verified: true,
      unique: matchedVersion === null,
      duplicate: matchedVersion !== null,
      active_key_version: active.version,
      active_event_identity_fingerprint: candidates[active.version],
      matched_key_version: matchedVersion,
      candidate_event_identity_fingerprints: candidates,
      persistence_allowed: false,
      customer_egress_allowed: false,
    };
  }

  async function performBoundedLiveReread(args) {
    const waitState = args && args.waitState;
    const waitErrors = validateWaitState(deps, waitState);
    if (waitErrors.length > 0) throw new FailClosedError(waitErrors[0]);
    const readStartedEpoch = nowEpochSeconds(deps);
    const readStartedAt = isoFromEpochSeconds(readStartedEpoch);
    if (readStartedEpoch * 1000 < parseIso(waitState.not_before)) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'unavailable', null);
    }
    if (
      !deps.chatwootRead ||
      typeof deps.chatwootRead.getConversation !== 'function' ||
      typeof deps.chatwootRead.getMessages !== 'function'
    ) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'unavailable', null);
    }

    let eventKey;
    let baselineKey;
    try {
      eventKey = await resolveEventKey(
        deps,
        waitState.event_identity_key_version,
        readStartedEpoch,
      );
      baselineKey = await resolveBaselineKey(
        deps,
        waitState.baseline_fingerprint_key_version,
        readStartedEpoch,
      );
    } catch (_error) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'unavailable', null);
    }
    const anchorTuple = {
      schema_version: '1.0',
      account_id: waitState.account_id,
      inbox_id: waitState.inbox_id,
      event: 'message_created',
      conversation_id: waitState.conversation_id,
      message_id: waitState.anchor_message_id,
    };
    const expectedEventFingerprint = eventIdentityFingerprint(deps, anchorTuple, eventKey.secret);
    const expectedAnchorFingerprint = anchorMessageFingerprint(
      deps,
      anchorTuple,
      waitState.event_identity_key_version,
      eventKey.secret,
    );
    if (
      !timingSafeEqualHex(deps, expectedEventFingerprint, waitState.event_identity_fingerprint) ||
      !timingSafeEqualHex(deps, expectedAnchorFingerprint, waitState.message_fingerprint)
    ) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'anchor_missing', 200);
    }

    const requestBase = {
      accountId: waitState.account_id,
      conversationId: waitState.conversation_id,
    };
    let beforeResponse;
    try {
      beforeResponse = normalizedHttpResponse(await deps.chatwootRead.getConversation({ ...requestBase }));
    } catch (_error) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'unavailable', null);
    }
    if (beforeResponse.statusCode !== 200) {
      return liveRereadFailure(
        deps,
        waitState,
        readStartedAt,
        mapHttpFailure(beforeResponse.statusCode),
        beforeResponse.statusCode,
      );
    }
    const before = conversationRoute(beforeResponse.body, waitState);
    if (!before.valid) {
      const responseFingerprint = sha256Hex(
        deps,
        utf8Bytes('route-mismatch:conversation-before:' + waitState.wait_state_fingerprint),
      );
      return liveRereadFailure(
        deps,
        waitState,
        readStartedAt,
        'route_mismatch',
        200,
        responseFingerprint,
      );
    }

    const afterId = Number(waitState.anchor_message_id) - 1;
    let firstResponse;
    try {
      firstResponse = await deps.chatwootRead.getMessages({ ...requestBase, after: afterId });
    } catch (_error) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'unavailable', null);
    }
    const first = scanMessageResponse(deps, firstResponse, waitState, eventKey);
    if (first.status !== 'verified') {
      return liveRereadFailure(deps, waitState, readStartedAt, first.status, first.httpStatus);
    }
    let secondResponse;
    try {
      secondResponse = await deps.chatwootRead.getMessages({ ...requestBase, after: afterId });
    } catch (_error) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'unavailable', null);
    }
    const second = scanMessageResponse(deps, secondResponse, waitState, eventKey);
    if (second.status !== 'verified') {
      return liveRereadFailure(deps, waitState, readStartedAt, second.status, second.httpStatus);
    }
    if (
      first.rawCount !== second.rawCount ||
      !timingSafeEqualHex(deps, first.setFingerprint, second.setFingerprint)
    ) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'scan_changed', 200);
    }

    let afterResponse;
    try {
      afterResponse = normalizedHttpResponse(await deps.chatwootRead.getConversation({ ...requestBase }));
    } catch (_error) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'unavailable', null);
    }
    if (afterResponse.statusCode !== 200) {
      return liveRereadFailure(
        deps,
        waitState,
        readStartedAt,
        mapHttpFailure(afterResponse.statusCode),
        afterResponse.statusCode,
      );
    }
    const after = conversationRoute(afterResponse.body, waitState);
    if (!after.valid) {
      const responseFingerprint = sha256Hex(
        deps,
        utf8Bytes('route-mismatch:conversation-after:' + waitState.wait_state_fingerprint),
      );
      return liveRereadFailure(
        deps,
        waitState,
        readStartedAt,
        'route_mismatch',
        200,
        responseFingerprint,
      );
    }

    const beforeStatus = conversationStateFingerprint(deps, baselineKey.secret, waitState, 'status', before.status);
    const afterStatus = conversationStateFingerprint(deps, baselineKey.secret, waitState, 'status', after.status);
    const beforeAssignee = conversationStateFingerprint(deps, baselineKey.secret, waitState, 'assignee', before.assigneeId);
    const afterAssignee = conversationStateFingerprint(deps, baselineKey.secret, waitState, 'assignee', after.assigneeId);
    if (
      !timingSafeEqualHex(deps, beforeStatus, afterStatus) ||
      !timingSafeEqualHex(deps, beforeAssignee, afterAssignee)
    ) {
      return liveRereadFailure(deps, waitState, readStartedAt, 'conversation_changed', 200);
    }

    const rows = second.rows;
    const latestInbound = latestRow(rows, (row) => row.messageType === 0 && row.private === false);
    const latestPublicHuman = latestRow(
      rows,
      (row) => row.messageType === 1 && row.private === false && ['user', 'agent'].includes(row.senderType),
    );
    const latestPrivate = latestRow(rows, (row) => row.messageType !== 2 && row.private === true);
    const latestNonActivity = latestRow(rows, (row) => row.messageType !== 2);
    const anchorId = Number(waitState.anchor_message_id);
    const checkedAt = isoFromEpochSeconds(nowEpochSeconds(deps));
    const evidenceIdHash = sha256Hex(
      deps,
      utf8Bytes(waitState.wait_state_fingerprint + ':' + readStartedAt + ':' + second.setFingerprint),
    );
    const responseFingerprint = sha256Hex(
      deps,
      utf8Bytes(canonicalJson({
        set: second.setFingerprint,
        status: afterStatus,
        assignee: afterAssignee,
      })),
    );
    const evidence = {
      schema_version: '1.0',
      kind: 'chatwoot_live_reread_v1',
      source: 'chatwoot_live_api_topology',
      evidence_id: 'cwr_' + evidenceIdHash.slice(0, 24),
      brand_id: 'calapres',
      account_id: waitState.account_id,
      inbox_id: waitState.inbox_id,
      channel: waitState.channel,
      conversation_id: waitState.conversation_id,
      anchor_message_id: waitState.anchor_message_id,
      anchor_message_ordering_id: anchorId,
      generation: waitState.generation,
      wait_state_fingerprint: waitState.wait_state_fingerprint,
      event_identity_key_version: waitState.event_identity_key_version,
      event_identity_fingerprint: waitState.event_identity_fingerprint,
      event_identity_anchor_verified: true,
      not_before: waitState.not_before,
      read_started_at: readStartedAt,
      checked_at: checkedAt,
      live_read_status: 'verified',
      http_status: 200,
      source_verified: true,
      route_verified: true,
      response_fingerprint: responseFingerprint,
      anchor_message_fingerprint: second.anchor.fingerprint,
      anchor_message_type: 0,
      anchor_private: false,
      anchor_message_created_at: second.anchor.createdAt,
      anchor_message_created_at_source: 'chatwoot_message.created_at_unix_seconds',
      latest_inbound_fingerprint: null,
      latest_inbound_created_at: null,
      latest_inbound_created_at_source: null,
      latest_inbound_ordering_id: null,
      latest_public_human_reply_fingerprint: null,
      latest_public_human_reply_created_at: null,
      latest_public_human_reply_created_at_source: null,
      latest_public_human_reply_ordering_id: null,
      latest_private_note_fingerprint: null,
      latest_private_note_created_at: null,
      latest_private_note_created_at_source: null,
      latest_private_note_ordering_id: null,
      latest_non_activity_fingerprint: null,
      latest_non_activity_created_at: null,
      latest_non_activity_created_at_source: null,
      latest_non_activity_ordering_id: null,
      scan_strategy: 'chatwoot_double_bounded_after_anchor_minus_one_v1',
      scan_page_size_limit: SCAN_PAGE_SIZE_LIMIT,
      scan_after_id: afterId,
      scan_first_count: first.rawCount,
      scan_second_count: second.rawCount,
      scan_first_all_rows_valid: true,
      scan_second_all_rows_valid: true,
      scan_first_set_fingerprint: first.setFingerprint,
      scan_second_set_fingerprint: second.setFingerprint,
      scan_sets_equal: true,
      scan_anchor_present_first: true,
      scan_anchor_present_second: true,
      scan_anchor_fingerprint_first: first.anchor.fingerprint,
      scan_anchor_fingerprint_second: second.anchor.fingerprint,
      scan_highest_message_id: second.highestMessageId,
      scan_highest_non_activity_id: second.highestNonActivityId,
      scan_complete: true,
      conversation_before_route_verified: true,
      conversation_after_route_verified: true,
      conversation_before_status_fingerprint: beforeStatus,
      conversation_after_status_fingerprint: afterStatus,
      conversation_before_assignee_fingerprint: beforeAssignee,
      conversation_after_assignee_fingerprint: afterAssignee,
      conversation_snapshots_stable: true,
      baseline_fingerprint_key_version: waitState.baseline_fingerprint_key_version,
      baseline_status_fingerprint: waitState.baseline_status_fingerprint,
      current_status_fingerprint: afterStatus,
      baseline_assignee_fingerprint: waitState.baseline_assignee_fingerprint,
      current_assignee_fingerprint: afterAssignee,
      anchor_message_present: true,
      anchor_is_latest_inbound: latestInbound !== null && latestInbound.id === anchorId && latestInbound.fingerprint === second.anchor.fingerprint,
      newer_inbound_present: latestInbound !== null && latestInbound.id > anchorId,
      public_human_reply_present: latestPublicHuman !== null && latestPublicHuman.id > anchorId,
      private_note_present: latestPrivate !== null && latestPrivate.id > anchorId,
      newer_non_activity_present: latestNonActivity !== null && latestNonActivity.id > anchorId,
      status_changed: waitState.baseline_status_fingerprint !== afterStatus,
      assignee_changed: waitState.baseline_assignee_fingerprint !== afterAssignee,
      transient_only: true,
      persistence_allowed: false,
      wait_payload_allowed: false,
      data_table_payload_allowed: false,
      audit_payload_allowed: false,
      customer_egress_allowed: false,
    };
    applyLatestEvidence(evidence, 'latest_inbound', latestInbound);
    applyLatestEvidence(evidence, 'latest_public_human_reply', latestPublicHuman);
    applyLatestEvidence(evidence, 'latest_private_note', latestPrivate);
    applyLatestEvidence(evidence, 'latest_non_activity', latestNonActivity);
    return evidence;
  }

  function buildPostDelayDecision(args) {
    const evidence = args && args.evidence;
    const waitState = args && args.waitState;
    const state = args && args.state;
    if (!plainObject(evidence) || !plainObject(waitState)) {
      throw new FailClosedError('post_delay_input_invalid');
    }
    if (
      !exactKeys(state, POST_DELAY_STATE_EXACT_KEYS) ||
      !Number.isInteger(state.currentGeneration) ||
      state.currentGeneration < 1 ||
      typeof state.idempotencyConsumed !== 'boolean' ||
      typeof state.brandEnabled !== 'boolean' ||
      typeof state.killSwitch !== 'boolean'
    ) {
      throw new FailClosedError('post_delay_state_invalid');
    }
    if (
      !exactKeys(evidence, LIVE_REREAD_EXACT_KEYS) ||
      evidence.schema_version !== '1.0' ||
      evidence.kind !== 'chatwoot_live_reread_v1' ||
      evidence.source !== 'chatwoot_live_api_topology' ||
      !LIVE_REREAD_EVIDENCE_ID.test(evidence.evidence_id || '') ||
      evidence.transient_only !== true ||
      evidence.persistence_allowed !== false ||
      evidence.wait_payload_allowed !== false ||
      evidence.data_table_payload_allowed !== false ||
      evidence.audit_payload_allowed !== false ||
      evidence.customer_egress_allowed !== false ||
      liveRereadEvidenceShapeErrors(evidence).length > 0
    ) {
      throw new FailClosedError('post_delay_evidence_invalid');
    }
    const bindingErrors = evidenceBindingErrors(deps, evidence, waitState);
    const waitStateBindingVerified = bindingErrors.length === 0;
    const expectedGeneration = waitState.generation;
    const currentGeneration = state.currentGeneration;
    const generationMatches = currentGeneration === expectedGeneration;
    const idempotencyConsumed = state.idempotencyConsumed;
    const brandEnabled = state.brandEnabled;
    const killSwitch = state.killSwitch;
    let cancellationReason = null;
    if (evidence.live_read_status === 'route_mismatch') cancellationReason = 'route_mismatch';
    else if (evidence.source_verified !== true || evidence.live_read_status !== 'verified') cancellationReason = 'live_reread_unavailable';
    else if (!waitStateBindingVerified) cancellationReason = 'wait_state_binding_mismatch';
    else if (verifiedEvidenceSemanticErrors(evidence).length > 0) cancellationReason = 'live_reread_unavailable';
    else if (!brandEnabled) cancellationReason = 'brand_disabled';
    else if (killSwitch) cancellationReason = 'brand_kill_switch';
    else if (idempotencyConsumed) cancellationReason = 'idempotency_consumed';
    else if (evidence.anchor_message_present !== true) cancellationReason = 'anchor_missing';
    else if (!generationMatches) cancellationReason = 'stale_generation';
    else if (evidence.newer_inbound_present === true) cancellationReason = 'newer_inbound';
    else if (evidence.public_human_reply_present === true) cancellationReason = 'human_intervention';
    else if (evidence.private_note_present === true) cancellationReason = 'private_note_present';
    else if (evidence.newer_non_activity_present === true) cancellationReason = 'newer_non_activity';
    else if (evidence.status_changed === true) cancellationReason = 'status_changed';
    else if (evidence.assignee_changed === true) cancellationReason = 'assignee_changed';
    const eligible = cancellationReason === null;
    const checkedAt = parseIso(evidence.checked_at);
    const currentEvaluation = nowEpochSeconds(deps) * 1000;
    const evaluatedAt = new Date(Math.max(checkedAt || 0, currentEvaluation)).toISOString();
    return {
      schema_version: '1.0',
      kind: 'chatwoot_post_delay_decision_v1',
      source: 'post_delay_cancellation_gate',
      decision_id: evidence.evidence_id.replace(/^cwr_/, 'cwd_'),
      evidence_ref: evidence.evidence_id,
      live_read_evidence: JSON.parse(JSON.stringify(evidence)),
      expected_generation: expectedGeneration,
      current_generation: currentGeneration,
      generation_matches: generationMatches,
      wait_state_binding_verified: waitStateBindingVerified,
      idempotency_consumed: idempotencyConsumed,
      brand_enabled: brandEnabled,
      kill_switch: killSwitch,
      eligible_for_observation: eligible,
      observation_draft_allowed: eligible,
      cancellation_reason: cancellationReason,
      evaluated_at: evaluatedAt,
      transient_only: true,
      persistence_allowed: false,
      wait_payload_allowed: false,
      data_table_payload_allowed: false,
      audit_payload_allowed: false,
      customer_egress_allowed: false,
    };
  }

  return Object.freeze({
    verifySignedIngress,
    deriveEventIdentity,
    dualReadBusinessEventIdentity,
    performBoundedLiveReread,
    buildPostDelayDecision,
  });
}

module.exports = Object.freeze({
  ACCOUNT_ID,
  INBOX_CHANNELS,
  MAX_RAW_BODY_SIZE_BYTES,
  MAX_AGE_SECONDS,
  MAX_FUTURE_SKEW_SECONDS,
  SCAN_PAGE_SIZE_LIMIT,
  EVENT_IDENTITY_CANONICAL_FORMAT,
  WAIT_CARRIER_FIELD_ORDER,
  LIVE_REREAD_FIELD_ORDER,
  DUAL_READ_RESULT_FIELD_ORDER,
  FailClosedError,
  canonicalEventIdentityTuple,
  createChatwootObservationRuntime,
});
