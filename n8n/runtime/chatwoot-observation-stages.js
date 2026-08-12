'use strict';

/*
 * Pure, credential-free stages for the Calapres Chatwoot Edge.
 *
 * Native n8n nodes own all effects:
 * - Webhook supplies exact raw bytes;
 * - Crypto supplies secret-keyed HMAC results;
 * - PostgreSQL supplies atomic result envelopes;
 * - HTTP Request supplies Chatwoot response envelopes.
 *
 * This module validates and binds those envelopes. It performs no network,
 * credential, database, filesystem, wait, workflow, model, or send action.
 */

const ACCOUNT_ID = 179973;
const BRAND_ID = 'calapres';
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
const DELAY_POLICY_VERSION = '2026-08-11-v1';
const DELAY_RANGES = Object.freeze({
  instagram: Object.freeze({ minimum: 30, maximum: 75 }),
  tiktok: Object.freeze({ minimum: 30, maximum: 75 }),
  whatsapp: Object.freeze({ minimum: 30, maximum: 75 }),
  email: Object.freeze({ minimum: 120, maximum: 300 }),
});
const EVENT_KEY_VERSION = /^calapres-identity-hmac-v[1-9][0-9]*$/;
const BASELINE_KEY_VERSION = /^calapres-hmac-v[1-9][0-9]*$/;
const EVENT_TO_STORAGE_KEY_VERSION = Object.freeze({
  'calapres-identity-hmac-v1': 'hmac-sha256-v1',
});
const STORAGE_TO_EVENT_KEY_VERSION = Object.freeze({
  'hmac-sha256-v1': 'calapres-identity-hmac-v1',
});
const HEX_64 = /^[a-f0-9]{64}$/;
const SIGNATURE_HEADER = /^sha256=[a-f0-9]{64}$/;
const TIMESTAMP_HEADER = /^[0-9]{10}$/;
const POSITIVE_DECIMAL_TOKEN = /^[1-9][0-9]{0,15}$/;
const KNOWLEDGE_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;
const SAFE_ERROR_CODE = /^[a-z][a-z0-9_]{2,80}$/;
const STRICT_ISO_TIMESTAMP =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;
const CONTENT_TYPE = /^application\/json(?:\s*;\s*charset=(?:utf-8|utf8))?$/i;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const ANCHOR_MESSAGE_FINGERPRINT_DOMAIN = 'calapres-message-anchor-v1:';
const CONVERSATION_FINGERPRINT_DOMAIN = 'calapres-conversation-v1:';
const MESSAGE_SET_FINGERPRINT_DOMAIN = 'calapres-chatwoot-message-set-v1:';
const STATUS_FINGERPRINT_DOMAIN = 'calapres-conversation-status-v1:';
const ASSIGNEE_FINGERPRINT_DOMAIN = 'calapres-conversation-assignee-v1:';
const PLAN_BINDING_DOMAIN = 'calapres-observation-stage-binding-v1:';

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
const WAIT_CARRIER_EXACT_KEYS = new Set([...WAIT_CARRIER_FIELD_ORDER, 'wait_state_fingerprint']);

const PARITY_MANIFEST = Object.freeze({
  account_id: ACCOUNT_ID,
  inbox_channels: INBOX_CHANNELS,
  max_raw_body_size_bytes: MAX_RAW_BODY_SIZE_BYTES,
  max_age_seconds: MAX_AGE_SECONDS,
  max_future_skew_seconds: MAX_FUTURE_SKEW_SECONDS,
  scan_page_size_limit: SCAN_PAGE_SIZE_LIMIT,
  event_identity_canonical_format: EVENT_IDENTITY_CANONICAL_FORMAT,
  event_to_storage_key_version: EVENT_TO_STORAGE_KEY_VERSION,
  wait_carrier_field_order: WAIT_CARRIER_FIELD_ORDER,
});
// SHA-256 of stableJson(PARITY_MANIFEST). Tests recompute this and compare the
// selected exported constants with chatwoot-observation-runtime.js.
const PARITY_MANIFEST_SHA256 = 'dbb11ff31880ef59bb740bbc51aa61ed1d74ade8594c66bbdc47766eebdc2418';

class FailClosedError extends Error {
  constructor(reasonCode) {
    super(reasonCode);
    this.name = 'FailClosedError';
    this.reasonCode = reasonCode;
  }
}

function fail(reasonCode) {
  throw new FailClosedError(reasonCode);
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

function hasOwn(value, field) {
  return plainObject(value) && Object.prototype.hasOwnProperty.call(value, field);
}

function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (plainObject(value)) {
    return '{' + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function orderedJson(value, fieldOrder) {
  const ordered = {};
  for (const field of fieldOrder) ordered[field] = value[field];
  return JSON.stringify(ordered);
}

function dependencies(value) {
  if (!plainObject(value) ||
      typeof value.base64ToBytes !== 'function' ||
      typeof value.bytesToBase64 !== 'function' ||
      typeof value.utf8ToBytes !== 'function' ||
      typeof value.bytesToUtf8Fatal !== 'function' ||
      typeof value.sha256Hex !== 'function' ||
      typeof value.timingSafeEqualHex !== 'function') {
    fail('stage_dependencies_unavailable');
  }
  return value;
}

function bytes(value) {
  if (!(value instanceof Uint8Array)) fail('stage_bytes_invalid');
  return value;
}

function sha256Hex(deps, value) {
  const digest = deps.sha256Hex(bytes(value));
  if (!HEX_64.test(digest || '')) fail('stage_sha256_output_invalid');
  return digest;
}

function sha256Text(deps, value) {
  if (typeof value !== 'string') fail('stage_sha256_text_invalid');
  return sha256Hex(deps, deps.utf8ToBytes(value));
}

function binding(deps, value) {
  return sha256Text(deps, PLAN_BINDING_DOMAIN + stableJson(value));
}

function decodeCanonicalBase64(deps, value, reasonCode) {
  if (typeof value !== 'string' || value.length % 4 !== 0 || !BASE64.test(value)) fail(reasonCode);
  let decoded;
  try {
    decoded = bytes(deps.base64ToBytes(value));
  } catch (_error) {
    fail(reasonCode);
  }
  if (deps.bytesToBase64(decoded) !== value) fail(reasonCode);
  return decoded;
}

function concatBytes(left, right) {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
}

function isoFromEpochSeconds(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail('clock_invalid');
  const result = new Date(value * 1000);
  if (Number.isNaN(result.getTime())) fail('clock_invalid');
  return result.toISOString();
}

function parseIso(value, reasonCode) {
  if (typeof value !== 'string' || !STRICT_ISO_TIMESTAMP.test(value)) fail(reasonCode);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(reasonCode);
  return parsed;
}

function positiveToken(value, reasonCode) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value !== 'string' || !POSITIVE_DECIMAL_TOKEN.test(value) ||
      !Number.isSafeInteger(Number(value)) || String(Number(value)) !== value) fail(reasonCode);
  return value;
}

function eventKeyVersionToStorage(value) {
  if (!Object.prototype.hasOwnProperty.call(EVENT_TO_STORAGE_KEY_VERSION, value)) {
    fail('storage_key_version_unknown');
  }
  return EVENT_TO_STORAGE_KEY_VERSION[value];
}

function storageKeyVersionToEvent(value) {
  if (!Object.prototype.hasOwnProperty.call(STORAGE_TO_EVENT_KEY_VERSION, value)) {
    fail('event_key_version_unknown');
  }
  return STORAGE_TO_EVENT_KEY_VERSION[value];
}

function integerId(value, reasonCode) {
  if (!Number.isSafeInteger(value)) fail(reasonCode);
  return value;
}

function normalizedEventTime(value) {
  if (Number.isSafeInteger(value) && value >= 0) return isoFromEpochSeconds(value);
  if (typeof value !== 'string') fail('event_time_invalid');
  const documented = value.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) UTC$/);
  const normalized = documented ? documented[1] + 'T' + documented[2] + 'Z' : value;
  const parsed = parseIso(normalized, 'event_time_invalid');
  return new Date(parsed).toISOString();
}

function deterministicDelay(seed, minimum, maximum) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return minimum + (hash % (maximum - minimum + 1));
}

function response(status, responseCode, reasonCode, transient = null) {
  return Object.freeze({
    schema_version: '1.0',
    kind: 'chatwoot_signed_ingress_preflight_v1',
    status,
    response_code: responseCode,
    reason_code: reasonCode,
    transient,
    customer_egress_allowed: false,
  });
}

function validatePreflight(value, deps) {
  exactObject(value, [
    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'transient',
    'customer_egress_allowed',
  ], 'preflight_envelope_invalid');
  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_signed_ingress_preflight_v1' ||
      value.customer_egress_allowed !== false) fail('preflight_envelope_invalid');
  if (value.status !== 'eligible') fail('preflight_not_eligible');
  if (value.response_code !== 0 || value.reason_code !== null) fail('preflight_envelope_invalid');
  exactObject(value.transient, [
    'timestamp', 'signature_header', 'supplied_digest_hex', 'raw_body_base64',
    'raw_body_size_bytes', 'body_sha256', 'signed_payload_base64', 'received_epoch_seconds',
    'received_at', 'delivery_id_fingerprint', 'preflight_binding_sha256',
  ], 'preflight_transient_invalid');
  const copy = { ...value.transient };
  delete copy.preflight_binding_sha256;
  if (binding(deps, copy) !== value.transient.preflight_binding_sha256) fail('preflight_binding_mismatch');
  return value.transient;
}

function prepareSignedIngress(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, [
    'schema_version', 'content_type', 'timestamp_header', 'signature_header',
    'delivery_header', 'raw_body_base64', 'received_epoch_seconds',
  ], 'webhook_projection_invalid');
  if (input.schema_version !== '1.0') fail('webhook_projection_invalid');
  if (typeof input.content_type !== 'string' || !CONTENT_TYPE.test(input.content_type)) {
    return response('rejected', 400, 'content_type_invalid');
  }
  let raw;
  try {
    raw = decodeCanonicalBase64(deps, input.raw_body_base64, 'raw_body_base64_invalid');
  } catch (error) {
    if (error instanceof FailClosedError) return response('rejected', 400, error.reasonCode);
    throw error;
  }
  if (raw.length === 0) return response('rejected', 400, 'payload_empty');
  if (raw.length > MAX_RAW_BODY_SIZE_BYTES) return response('rejected', 413, 'payload_too_large');
  if (!Number.isSafeInteger(input.received_epoch_seconds) || input.received_epoch_seconds < 0) {
    return response('rejected', 400, 'clock_invalid');
  }
  if (typeof input.timestamp_header !== 'string' || !TIMESTAMP_HEADER.test(input.timestamp_header)) {
    return response('rejected', 401, 'timestamp_malformed');
  }
  const timestamp = Number(input.timestamp_header);
  const age = input.received_epoch_seconds - timestamp;
  if (age > MAX_AGE_SECONDS) return response('rejected', 401, 'timestamp_stale');
  if (age < -MAX_FUTURE_SKEW_SECONDS) return response('rejected', 401, 'timestamp_future');
  if (typeof input.signature_header !== 'string' || !SIGNATURE_HEADER.test(input.signature_header)) {
    return response('rejected', 401, 'signature_malformed');
  }
  if (input.delivery_header !== null &&
      (typeof input.delivery_header !== 'string' || input.delivery_header.length < 1 ||
       input.delivery_header.length > 512)) {
    return response('rejected', 400, 'delivery_header_invalid');
  }
  const bodySha256 = sha256Hex(deps, raw);
  const signedBytes = concatBytes(deps.utf8ToBytes(input.timestamp_header + '.'), raw);
  const projected = {
    timestamp: input.timestamp_header,
    signature_header: input.signature_header,
    supplied_digest_hex: input.signature_header.slice('sha256='.length),
    raw_body_base64: input.raw_body_base64,
    raw_body_size_bytes: raw.length,
    body_sha256: bodySha256,
    signed_payload_base64: deps.bytesToBase64(signedBytes),
    received_epoch_seconds: input.received_epoch_seconds,
    received_at: isoFromEpochSeconds(input.received_epoch_seconds),
    delivery_id_fingerprint: input.delivery_header === null
      ? null
      : sha256Text(deps, input.delivery_header),
  };
  projected.preflight_binding_sha256 = binding(deps, projected);
  return response('eligible', 0, null, Object.freeze(projected));
}

function finalizeSignedHmac(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, ['preflight', 'computed_hmac_hex', 'compared_epoch_seconds'], 'hmac_result_input_invalid');
  const preflight = validatePreflight(input.preflight, deps);
  if (!HEX_64.test(input.computed_hmac_hex || '') ||
      !Number.isSafeInteger(input.compared_epoch_seconds) || input.compared_epoch_seconds < 0) {
    fail('hmac_result_input_invalid');
  }
  if (input.compared_epoch_seconds - preflight.received_epoch_seconds > MAX_AGE_SECONDS ||
      input.compared_epoch_seconds < preflight.received_epoch_seconds) {
    return Object.freeze({
      schema_version: '1.0', kind: 'chatwoot_signed_hmac_gate_v1', status: 'fail_closed',
      response_code: 401, reason_code: 'hmac_comparison_stale', raw_binding: null,
      replay_identity: null, customer_egress_allowed: false,
    });
  }
  if (deps.timingSafeEqualHex(input.computed_hmac_hex, preflight.supplied_digest_hex) !== true) {
    return Object.freeze({
      schema_version: '1.0', kind: 'chatwoot_signed_hmac_gate_v1', status: 'fail_closed',
      response_code: 401, reason_code: 'signature_mismatch', raw_binding: null,
      replay_identity: null, customer_egress_allowed: false,
    });
  }
  const replayFingerprint = sha256Text(
    deps,
    preflight.signature_header + ':' + preflight.timestamp + ':' + preflight.body_sha256,
  );
  const rawBinding = {
    timestamp: preflight.timestamp,
    raw_body_base64: preflight.raw_body_base64,
    raw_body_size_bytes: preflight.raw_body_size_bytes,
    body_sha256: preflight.body_sha256,
    preflight_binding_sha256: preflight.preflight_binding_sha256,
  };
  rawBinding.raw_binding_sha256 = binding(deps, rawBinding);
  return Object.freeze({
    schema_version: '1.0',
    kind: 'chatwoot_signed_hmac_gate_v1',
    status: 'verified',
    response_code: 0,
    reason_code: null,
    raw_binding: Object.freeze(rawBinding),
    replay_identity: Object.freeze({
      replay_key_fingerprint: replayFingerprint,
      received_at: preflight.received_at,
      expires_at: isoFromEpochSeconds(preflight.received_epoch_seconds + MAX_AGE_SECONDS + MAX_FUTURE_SKEW_SECONDS),
    }),
    customer_egress_allowed: false,
  });
}

function canonicalEventTuple(payload) {
  if (!plainObject(payload)) fail('payload_not_object');
  for (const field of ['account', 'inbox', 'conversation']) {
    if (hasOwn(payload, field) && !plainObject(payload[field])) fail(field + '_container_invalid');
  }
  if (hasOwn(payload, 'account') && hasOwn(payload, 'account_id')) fail('account_id_alias_conflict');
  if (hasOwn(payload, 'inbox') && hasOwn(payload, 'inbox_id')) fail('inbox_id_alias_conflict');
  if (hasOwn(payload, 'conversation') && hasOwn(payload, 'conversation_id')) fail('conversation_id_alias_conflict');
  if (hasOwn(payload, 'id') && hasOwn(payload, 'message_id')) fail('message_id_alias_conflict');
  const accountId = integerId(hasOwn(payload, 'account') ? payload.account.id : payload.account_id,
    'account_id_invalid');
  const inboxId = integerId(hasOwn(payload, 'inbox') ? payload.inbox.id : payload.inbox_id,
    'inbox_id_invalid');
  if (accountId !== ACCOUNT_ID) fail('account_not_allowlisted');
  if (!INBOX_CHANNELS[inboxId]) fail('inbox_not_allowlisted');
  if (hasOwn(payload, 'conversation') && hasOwn(payload.conversation, 'account_id') &&
      payload.conversation.account_id !== accountId) fail('account_mismatch');
  if (hasOwn(payload, 'conversation') && hasOwn(payload.conversation, 'inbox_id') &&
      payload.conversation.inbox_id !== inboxId) fail('inbox_mismatch');
  if (payload.event !== 'message_created') fail('event_not_supported');
  return Object.freeze({
    schema_version: '1.0',
    account_id: accountId,
    inbox_id: inboxId,
    event: 'message_created',
    conversation_id: positiveToken(
      hasOwn(payload, 'conversation') ? payload.conversation.id : payload.conversation_id,
      'conversation_id_invalid',
    ),
    message_id: positiveToken(hasOwn(payload, 'id') ? payload.id : payload.message_id,
      'message_id_invalid'),
  });
}

function validateReplayGate(value, deps) {
  exactObject(value, [
    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'raw_binding',
    'replay_key_fingerprint', 'customer_egress_allowed',
  ], 'replay_gate_invalid');
  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_request_replay_gate_v1' ||
      value.status !== 'proceed_parse' || value.response_code !== 0 || value.reason_code !== null ||
      value.customer_egress_allowed !== false || !HEX_64.test(value.replay_key_fingerprint || '')) {
    fail('verified_replay_required');
  }
  const raw = value.raw_binding;
  exactObject(raw, [
    'timestamp', 'raw_body_base64', 'raw_body_size_bytes', 'body_sha256',
    'preflight_binding_sha256', 'raw_binding_sha256',
  ], 'raw_binding_invalid');
  const copy = { ...raw };
  delete copy.raw_binding_sha256;
  if (binding(deps, copy) !== raw.raw_binding_sha256) fail('raw_binding_mismatch');
  return raw;
}

function prepareEventIdentity(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, ['replay_gate', 'active_key_version', 'retained_key_versions'],
    'event_identity_input_invalid');
  const rawBinding = validateReplayGate(input.replay_gate, deps);
  if (!EVENT_KEY_VERSION.test(input.active_key_version || '') ||
      !Array.isArray(input.retained_key_versions) || input.retained_key_versions.length > 8 ||
      input.retained_key_versions.some((value) => !EVENT_KEY_VERSION.test(value || '')) ||
      new Set([input.active_key_version, ...input.retained_key_versions]).size !==
        input.retained_key_versions.length + 1) fail('event_keyring_invalid');
  for (const keyVersion of [input.active_key_version, ...input.retained_key_versions]) {
    eventKeyVersionToStorage(keyVersion);
  }
  const raw = decodeCanonicalBase64(deps, rawBinding.raw_body_base64, 'raw_body_base64_invalid');
  if (raw.length !== rawBinding.raw_body_size_bytes ||
      sha256Hex(deps, raw) !== rawBinding.body_sha256) fail('verified_raw_body_mismatch');
  let payload;
  try {
    payload = JSON.parse(deps.bytesToUtf8Fatal(raw));
  } catch (_error) {
    fail('verified_payload_json_invalid');
  }
  const tuple = canonicalEventTuple(payload);
  const sender = plainObject(payload.sender) ? payload.sender : null;
  const senderId = sender && (typeof sender.id === 'string' || Number.isSafeInteger(sender.id))
    ? String(sender.id) : null;
  const senderType = sender && typeof sender.type === 'string' ? sender.type.toLowerCase() : null;
  if (!(payload.message_type === 'incoming' || payload.message_type === 0)) fail('message_not_inbound');
  if (payload.private === true) fail('private_note_rejected');
  if (senderType === 'bot' || senderType === 'agent_bot') fail('bot_echo_rejected');
  if (!senderId || senderId.length > 200) fail('sender_ref_missing');
  const eventAt = normalizedEventTime(payload.created_at);
  if (hasOwn(payload, 'attachments') && !Array.isArray(payload.attachments)) fail('attachments_invalid');
  const attachmentCount = Array.isArray(payload.attachments) ? payload.attachments.length : 0;
  if (attachmentCount > 32) fail('attachments_excessive');
  const textPresent = typeof payload.content === 'string' && payload.content.trim().length > 0;
  const contentKind = textPresent && attachmentCount > 0 ? 'mixed'
    : attachmentCount > 0 ? 'media' : textPresent ? 'text' : 'unsupported';
  const route = {
    brand_id: BRAND_ID,
    account_id: tuple.account_id,
    inbox_id: tuple.inbox_id,
    channel: INBOX_CHANNELS[tuple.inbox_id],
    conversation_id: tuple.conversation_id,
    message_id: tuple.message_id,
    event_at: eventAt,
    content_kind: contentKind,
    text_present: textPresent,
    attachment_count: attachmentCount,
  };
  const keyVersions = [input.active_key_version, ...input.retained_key_versions];
  const hmacRequests = keyVersions.map((keyVersion) => Object.freeze({
    purpose: 'event_identity',
    key_version: keyVersion,
    algorithm: 'hmac-sha256',
    encoding: 'hex',
    material_utf8: JSON.stringify(tuple),
  }));
  const planCore = {
    schema_version: '1.0',
    kind: 'chatwoot_event_identity_plan_v1',
    route,
    canonical_tuple: tuple,
    active_key_version: input.active_key_version,
    retained_key_versions: [...input.retained_key_versions],
    hmac_requests: hmacRequests,
    replay_key_fingerprint: input.replay_gate.replay_key_fingerprint,
    customer_egress_allowed: false,
  };
  return Object.freeze({ ...planCore, plan_binding_sha256: binding(deps, planCore) });
}

function validateEventPlan(value, deps) {
  exactObject(value, [
    'schema_version', 'kind', 'route', 'canonical_tuple', 'active_key_version',
    'retained_key_versions', 'hmac_requests', 'replay_key_fingerprint',
    'customer_egress_allowed', 'plan_binding_sha256',
  ], 'event_identity_plan_invalid');
  const core = { ...value };
  delete core.plan_binding_sha256;
  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_event_identity_plan_v1' ||
      value.customer_egress_allowed !== false || !HEX_64.test(value.replay_key_fingerprint || '') ||
      binding(deps, core) !== value.plan_binding_sha256) fail('event_identity_plan_invalid');
  if (!EVENT_KEY_VERSION.test(value.active_key_version || '') ||
      !Array.isArray(value.retained_key_versions) || !Array.isArray(value.hmac_requests)) {
    fail('event_identity_plan_invalid');
  }
  return value;
}

function hmacResults(value, expectedRequests, reasonCode) {
  if (!Array.isArray(value) || value.length !== expectedRequests.length) fail(reasonCode);
  const expected = new Map(expectedRequests.map((request) =>
    [request.purpose + ':' + request.key_version, request]));
  const actual = new Map();
  for (const result of value) {
    exactObject(result, ['purpose', 'key_version', 'digest_hex'], reasonCode);
    const key = result.purpose + ':' + result.key_version;
    if (!expected.has(key) || actual.has(key) || !HEX_64.test(result.digest_hex || '')) fail(reasonCode);
    actual.set(key, result.digest_hex);
  }
  if (actual.size !== expected.size) fail(reasonCode);
  return actual;
}

function finalizeEventIdentity(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, ['event_plan', 'hmac_results'], 'event_identity_result_input_invalid');
  const plan = validateEventPlan(input.event_plan, deps);
  const results = hmacResults(input.hmac_results, plan.hmac_requests, 'event_identity_hmac_results_invalid');
  const fingerprints = {};
  for (const request of plan.hmac_requests) {
    fingerprints[request.key_version] = results.get(request.purpose + ':' + request.key_version);
  }
  const routeRequests = [];
  for (const keyVersion of [plan.active_key_version, ...plan.retained_key_versions]) {
    const eventFingerprint = fingerprints[keyVersion];
    const messageCanonical = {
      schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.route.account_id,
      inbox_id: plan.route.inbox_id, conversation_id: plan.route.conversation_id,
      message_id: plan.route.message_id, direction: 'inbound', visibility: 'public',
      event_identity_key_version: keyVersion, event_identity_fingerprint: eventFingerprint,
    };
    const conversationCanonical = {
      schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.route.account_id,
      inbox_id: plan.route.inbox_id, conversation_id: plan.route.conversation_id,
      event_identity_key_version: keyVersion,
    };
    routeRequests.push(Object.freeze({
      purpose: 'message_anchor', key_version: keyVersion, algorithm: 'hmac-sha256', encoding: 'hex',
      material_utf8: ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(messageCanonical),
    }));
    routeRequests.push(Object.freeze({
      purpose: 'conversation', key_version: keyVersion, algorithm: 'hmac-sha256', encoding: 'hex',
      material_utf8: CONVERSATION_FINGERPRINT_DOMAIN + JSON.stringify(conversationCanonical),
    }));
  }
  const core = {
    schema_version: '1.0', kind: 'chatwoot_event_identity_final_v1',
    route: plan.route, canonical_tuple: plan.canonical_tuple,
    active_key_version: plan.active_key_version,
    retained_key_versions: plan.retained_key_versions,
    event_identity_fingerprints: fingerprints,
    route_hmac_requests: routeRequests,
    replay_key_fingerprint: plan.replay_key_fingerprint,
    customer_egress_allowed: false,
  };
  return Object.freeze({ ...core, identity_binding_sha256: binding(deps, core) });
}

function validateEventIdentity(value, deps) {
  exactObject(value, [
    'schema_version', 'kind', 'route', 'canonical_tuple', 'active_key_version',
    'retained_key_versions', 'event_identity_fingerprints', 'route_hmac_requests',
    'replay_key_fingerprint', 'customer_egress_allowed', 'identity_binding_sha256',
  ], 'event_identity_final_invalid');
  const core = { ...value };
  delete core.identity_binding_sha256;
  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_event_identity_final_v1' ||
      value.customer_egress_allowed !== false || binding(deps, core) !== value.identity_binding_sha256 ||
      !Array.isArray(value.route_hmac_requests)) fail('event_identity_final_invalid');
  return value;
}

function finalizeRouteFingerprints(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, ['event_identity', 'hmac_results'], 'route_fingerprint_input_invalid');
  const identity = validateEventIdentity(input.event_identity, deps);
  const results = hmacResults(input.hmac_results, identity.route_hmac_requests,
    'route_fingerprint_hmac_results_invalid');
  const messageFingerprints = {};
  const conversationFingerprints = {};
  for (const version of [identity.active_key_version, ...identity.retained_key_versions]) {
    messageFingerprints[version] = results.get('message_anchor:' + version);
    conversationFingerprints[version] = results.get('conversation:' + version);
  }
  const delayRange = DELAY_RANGES[identity.route.channel];
  const seed = [BRAND_ID, identity.route.account_id, identity.route.inbox_id,
    identity.route.conversation_id, identity.route.message_id].join(':');
  const delaySeconds = deterministicDelay(seed, delayRange.minimum, delayRange.maximum);
  const notBefore = new Date(parseIso(identity.route.event_at, 'event_time_invalid') + delaySeconds * 1000)
    .toISOString();
  const core = {
    schema_version: '1.0', kind: 'chatwoot_route_identity_v1',
    brand_id: BRAND_ID, account_id: identity.route.account_id, inbox_id: identity.route.inbox_id,
    channel: identity.route.channel, conversation_id: identity.route.conversation_id,
    message_id: identity.route.message_id, event_at: identity.route.event_at,
    content_kind: identity.route.content_kind, text_present: identity.route.text_present,
    attachment_count: identity.route.attachment_count,
    correlation_id: 'calapres:' + identity.route.conversation_id + ':' + identity.route.message_id,
    active_key_version: identity.active_key_version,
    retained_key_versions: identity.retained_key_versions,
    storage_key_versions: Object.freeze({
      active: eventKeyVersionToStorage(identity.active_key_version),
      retained: Object.freeze(identity.retained_key_versions.map((version) => Object.freeze({
        event_key_version: version,
        storage_key_version: eventKeyVersionToStorage(version),
      }))),
    }),
    event_identity_fingerprints: identity.event_identity_fingerprints,
    message_fingerprints: messageFingerprints,
    conversation_fingerprints: conversationFingerprints,
    replay_key_fingerprint: identity.replay_key_fingerprint,
    delay_policy_version: DELAY_POLICY_VERSION, delay_seconds: delaySeconds, not_before: notBefore,
    customer_egress_allowed: false,
  };
  return Object.freeze({ ...core, route_binding_sha256: binding(deps, core) });
}

function httpEnvelope(value) {
  exactObject(value, ['status_code', 'body', 'error_code'], 'http_envelope_invalid');
  if (value.status_code !== null &&
      (!Number.isSafeInteger(value.status_code) || value.status_code < 100 || value.status_code > 599)) {
    fail('http_envelope_invalid');
  }
  if (value.status_code === null) {
    if (value.body !== null || typeof value.error_code !== 'string' || !SAFE_ERROR_CODE.test(value.error_code)) {
      fail('http_envelope_invalid');
    }
  } else if (value.error_code !== null || (value.body !== null && !plainObject(value.body))) {
    fail('http_envelope_invalid');
  }
  return value;
}

function conversationSnapshot(envelope, expected) {
  const http = httpEnvelope(envelope);
  if (http.status_code !== 200 || !plainObject(http.body)) fail('conversation_read_unavailable');
  const body = http.body;
  const accountId = body.account_id;
  const inboxId = hasOwn(body, 'inbox_id') ? body.inbox_id
    : plainObject(body.inbox) ? body.inbox.id : null;
  const conversationId = positiveToken(body.id, 'conversation_route_invalid');
  if (accountId !== expected.account_id || inboxId !== expected.inbox_id ||
      conversationId !== expected.conversation_id ||
      !['open', 'resolved', 'pending', 'snoozed'].includes(body.status)) fail('conversation_route_invalid');
  const candidates = [];
  const add = (container, field) => {
    if (!plainObject(container) || !hasOwn(container, field)) return true;
    const value = container[field];
    if (field === 'assignee_id') { candidates.push(value); return true; }
    if (value === null) { candidates.push(null); return true; }
    if (!plainObject(value) || !hasOwn(value, 'id')) return false;
    if (hasOwn(value, 'account_id') && value.account_id !== expected.account_id) return false;
    candidates.push(value.id);
    return true;
  };
  if (!add(body, 'assignee_id') || !add(body, 'assignee') || !add(body.meta, 'assignee') ||
      candidates.length === 0) fail('conversation_assignee_invalid');
  for (const candidate of candidates) {
    if (candidate !== null && (!Number.isSafeInteger(candidate) || candidate < 1)) {
      fail('conversation_assignee_invalid');
    }
  }
  if (candidates.some((candidate) => candidate !== candidates[0])) fail('conversation_assignee_invalid');
  return Object.freeze({ status: body.status, assignee_id: candidates[0] });
}

function validateIngressCommit(value, deps) {
  exactObject(value, [
    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'committed',
    'customer_egress_allowed',
  ], 'ingress_commit_invalid');
  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_ingress_commit_v1' ||
      value.status !== 'committed' || value.response_code !== 204 || value.reason_code !== null ||
      value.customer_egress_allowed !== false) fail('ingress_commit_required');
  exactObject(value.committed, [
    'brand_id', 'account_id', 'inbox_id', 'channel', 'conversation_id', 'anchor_message_id',
    'conversation_fingerprint', 'message_fingerprint', 'correlation_id',
    'event_identity_key_version', 'event_identity_fingerprint', 'generation',
    'delay_policy_version', 'delay_seconds', 'not_before', 'knowledge_version',
    'commit_binding_sha256',
  ], 'ingress_commit_invalid');
  const core = { ...value.committed };
  delete core.commit_binding_sha256;
  if (binding(deps, core) !== value.committed.commit_binding_sha256) fail('ingress_commit_binding_mismatch');
  return value.committed;
}

function baselineMaterial(commit, keyVersion, kind, value) {
  const canonical = {
    schema_version: '1.0', brand_id: BRAND_ID, account_id: commit.account_id,
    inbox_id: commit.inbox_id, conversation_id: commit.conversation_id,
  };
  if (kind === 'status') canonical.status = value;
  else canonical.assignee_id = value;
  return (kind === 'status' ? STATUS_FINGERPRINT_DOMAIN : ASSIGNEE_FINGERPRINT_DOMAIN) +
    JSON.stringify(canonical);
}

function prepareBaseline(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, ['ingress_commit', 'conversation_http', 'baseline_key_version'],
    'baseline_input_invalid');
  const commit = validateIngressCommit(input.ingress_commit, deps);
  if (!BASELINE_KEY_VERSION.test(input.baseline_key_version || '')) fail('baseline_key_version_invalid');
  const snapshot = conversationSnapshot(input.conversation_http, commit);
  const requests = [
    Object.freeze({ purpose: 'baseline_status', key_version: input.baseline_key_version,
      algorithm: 'hmac-sha256', encoding: 'hex',
      material_utf8: baselineMaterial(commit, input.baseline_key_version, 'status', snapshot.status) }),
    Object.freeze({ purpose: 'baseline_assignee', key_version: input.baseline_key_version,
      algorithm: 'hmac-sha256', encoding: 'hex',
      material_utf8: baselineMaterial(commit, input.baseline_key_version, 'assignee', snapshot.assignee_id) }),
  ];
  const core = {
    schema_version: '1.0', kind: 'chatwoot_baseline_plan_v1', commit,
    baseline_key_version: input.baseline_key_version, hmac_requests: requests,
    customer_egress_allowed: false,
  };
  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });
}

function validateBaselinePlan(value, deps) {
  exactObject(value, [
    'schema_version', 'kind', 'commit', 'baseline_key_version', 'hmac_requests',
    'customer_egress_allowed', 'plan_binding_sha256',
  ], 'baseline_plan_invalid');
  const core = { ...value };
  delete core.plan_binding_sha256;
  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_baseline_plan_v1' ||
      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||
      !BASELINE_KEY_VERSION.test(value.baseline_key_version || '') || !Array.isArray(value.hmac_requests)) {
    fail('baseline_plan_invalid');
  }
  return value;
}

function validateWaitState(value, deps) {
  exactObject(value, WAIT_CARRIER_EXACT_KEYS, 'wait_state_shape_invalid');
  if (value.schema_version !== '1.0' || value.brand_id !== BRAND_ID || value.account_id !== ACCOUNT_ID ||
      INBOX_CHANNELS[value.inbox_id] !== value.channel || value.customer_egress_allowed !== false ||
      value.fixture_ref !== null || value.delay_mode !== 'live_observation' ||
      value.delay_policy_version !== DELAY_POLICY_VERSION ||
      !EVENT_KEY_VERSION.test(value.event_identity_key_version || '') ||
      !BASELINE_KEY_VERSION.test(value.baseline_fingerprint_key_version || '') ||
      !KNOWLEDGE_VERSION.test(value.knowledge_version || '') ||
      !Number.isSafeInteger(value.generation) || value.generation < 1) fail('wait_state_invalid');
  positiveToken(value.conversation_id, 'wait_state_invalid');
  positiveToken(value.anchor_message_id, 'wait_state_invalid');
  for (const field of [
    'conversation_fingerprint', 'message_fingerprint', 'event_identity_fingerprint',
    'baseline_status_fingerprint', 'baseline_assignee_fingerprint', 'wait_state_fingerprint',
  ]) if (!HEX_64.test(value[field] || '')) fail('wait_state_invalid');
  parseIso(value.not_before, 'wait_state_invalid');
  const core = { ...value };
  delete core.wait_state_fingerprint;
  if (sha256Text(deps, orderedJson(core, WAIT_CARRIER_FIELD_ORDER)) !== value.wait_state_fingerprint) {
    fail('wait_state_fingerprint_mismatch');
  }
  return value;
}

function finalizeWaitState(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, ['baseline_plan', 'hmac_results'], 'wait_state_input_invalid');
  const plan = validateBaselinePlan(input.baseline_plan, deps);
  const results = hmacResults(input.hmac_results, plan.hmac_requests, 'baseline_hmac_results_invalid');
  const commit = plan.commit;
  const wait = {
    schema_version: '1.0', brand_id: BRAND_ID, account_id: commit.account_id,
    inbox_id: commit.inbox_id, channel: commit.channel, conversation_id: commit.conversation_id,
    anchor_message_id: commit.anchor_message_id,
    conversation_fingerprint: commit.conversation_fingerprint,
    message_fingerprint: commit.message_fingerprint, correlation_id: commit.correlation_id,
    event_identity_key_version: commit.event_identity_key_version,
    event_identity_fingerprint: commit.event_identity_fingerprint, generation: commit.generation,
    baseline_fingerprint_key_version: plan.baseline_key_version,
    baseline_status_fingerprint: results.get('baseline_status:' + plan.baseline_key_version),
    baseline_assignee_fingerprint: results.get('baseline_assignee:' + plan.baseline_key_version),
    delay_policy_version: commit.delay_policy_version, delay_mode: 'live_observation',
    delay_seconds: commit.delay_seconds, not_before: commit.not_before,
    knowledge_version: commit.knowledge_version, fixture_ref: null, customer_egress_allowed: false,
  };
  wait.wait_state_fingerprint = sha256Text(deps, orderedJson(wait, WAIT_CARRIER_FIELD_ORDER));
  validateWaitState(wait, deps);
  return Object.freeze({
    schema_version: '1.0', kind: 'chatwoot_identifiers_only_wait_v1', status: 'ready',
    wait_state: Object.freeze(wait), customer_egress_allowed: false,
  });
}

function normalizeMessageRow(row, wait, deps) {
  if (!plainObject(row) || !Number.isSafeInteger(row.id) || row.id < 1 ||
      row.account_id !== wait.account_id || row.inbox_id !== wait.inbox_id ||
      positiveToken(row.conversation_id, 'message_row_invalid') !== wait.conversation_id ||
      ![0, 1, 2].includes(row.message_type) || typeof row.private !== 'boolean' ||
      !Number.isSafeInteger(row.created_at) || row.created_at < 0) fail('message_row_invalid');
  if (hasOwn(row, 'content') && row.content !== null && typeof row.content !== 'string') {
    fail('message_content_invalid');
  }
  const content = typeof row.content === 'string' ? row.content : '';
  const contentBytes = deps.utf8ToBytes(content);
  if (contentBytes.length > MAX_RAW_BODY_SIZE_BYTES) fail('message_content_excessive');
  if (hasOwn(row, 'attachments') && !Array.isArray(row.attachments)) fail('message_attachments_invalid');
  const attachmentCount = Array.isArray(row.attachments) ? row.attachments.length : 0;
  if (attachmentCount > 32) fail('message_attachments_excessive');
  const senderType = plainObject(row.sender) && typeof row.sender.type === 'string'
    ? row.sender.type.toLowerCase() : null;
  const direction = row.message_type === 0 ? 'inbound' : row.message_type === 1 ? 'outbound' : 'activity';
  const visibility = row.private ? 'private' : 'public';
  return Object.freeze({
    id: row.id, message_type: row.message_type, private: row.private,
    created_at: isoFromEpochSeconds(row.created_at), sender_type: senderType,
    direction, visibility, content_sha256: sha256Hex(deps, contentBytes),
    attachment_count: attachmentCount,
    anchor_content: String(row.id) === wait.anchor_message_id ? content : null,
  });
}

function scanRows(envelope, wait, deps) {
  const http = httpEnvelope(envelope);
  if (http.status_code !== 200 || !plainObject(http.body) || !Array.isArray(http.body.payload)) {
    fail('message_scan_unavailable');
  }
  if (http.body.payload.length < 1) fail('anchor_missing');
  if (http.body.payload.length >= SCAN_PAGE_SIZE_LIMIT) fail('scan_truncated');
  const rows = http.body.payload.map((row) => normalizeMessageRow(row, wait, deps));
  const anchor = Number(wait.anchor_message_id);
  if (new Set(rows.map((row) => row.id)).size !== rows.length ||
      rows.some((row) => row.id < anchor)) {
    fail('message_scan_invalid');
  }
  const anchors = rows.filter((row) => row.id === anchor);
  if (anchors.length !== 1) fail('anchor_missing');
  if (anchors[0].message_type !== 0 || anchors[0].private !== false) fail('anchor_invalid');
  if (rows.filter((row) => row.message_type !== 2).length < 1) fail('message_scan_invalid');
  return rows;
}

function prepareBoundedReread(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, [
    'schema_version', 'wait_state', 'read_started_epoch_seconds', 'conversation_before',
    'messages_first', 'messages_second', 'conversation_after',
  ], 'reread_input_invalid');
  if (input.schema_version !== '1.0' || !Number.isSafeInteger(input.read_started_epoch_seconds) ||
      input.read_started_epoch_seconds < 0) fail('reread_input_invalid');
  const wait = validateWaitState(input.wait_state, deps);
  if (input.read_started_epoch_seconds * 1000 < parseIso(wait.not_before, 'wait_state_invalid')) {
    fail('wait_not_elapsed');
  }
  const before = conversationSnapshot(input.conversation_before, wait);
  const firstRows = scanRows(input.messages_first, wait, deps);
  const secondRows = scanRows(input.messages_second, wait, deps);
  const after = conversationSnapshot(input.conversation_after, wait);
  const uniqueRows = new Map();
  for (const row of [...firstRows, ...secondRows]) {
    const existing = uniqueRows.get(row.id);
    const stable = { ...row, anchor_content: null };
    if (existing && stableJson({ ...existing, anchor_content: null }) !== stableJson(stable)) {
      fail('scan_changed');
    }
    uniqueRows.set(row.id, row);
  }
  const anchorId = Number(wait.anchor_message_id);
  const anchorTuple = {
    schema_version: '1.0', account_id: wait.account_id, inbox_id: wait.inbox_id,
    event: 'message_created', conversation_id: wait.conversation_id,
    message_id: wait.anchor_message_id,
  };
  const eventRequests = [Object.freeze({ purpose: 'message_event_' + anchorId,
    key_version: wait.event_identity_key_version, algorithm: 'hmac-sha256', encoding: 'hex',
    material_utf8: JSON.stringify(anchorTuple) })];
  const baselineRequests = [
    ['conversation_before_status', 'status', before.status],
    ['conversation_before_assignee', 'assignee', before.assignee_id],
    ['conversation_after_status', 'status', after.status],
    ['conversation_after_assignee', 'assignee', after.assignee_id],
  ].map(([purpose, kind, value]) => Object.freeze({
    purpose, key_version: wait.baseline_fingerprint_key_version,
    algorithm: 'hmac-sha256', encoding: 'hex',
    material_utf8: baselineMaterial(wait, wait.baseline_fingerprint_key_version, kind, value),
  }));
  const core = {
    schema_version: '1.0', kind: 'chatwoot_bounded_reread_plan_v1', wait_state: wait,
    read_started_at: isoFromEpochSeconds(input.read_started_epoch_seconds),
    first_rows: firstRows, second_rows: secondRows,
    event_hmac_requests: eventRequests, baseline_hmac_requests: baselineRequests,
    customer_egress_allowed: false,
  };
  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });
}

function validateRereadPlan(value, deps) {
  exactObject(value, [
    'schema_version', 'kind', 'wait_state', 'read_started_at', 'first_rows', 'second_rows',
    'event_hmac_requests', 'baseline_hmac_requests', 'customer_egress_allowed',
    'plan_binding_sha256',
  ], 'reread_plan_invalid');
  const core = { ...value };
  delete core.plan_binding_sha256;
  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_bounded_reread_plan_v1' ||
      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||
      !Array.isArray(value.first_rows) || !Array.isArray(value.second_rows) ||
      !Array.isArray(value.event_hmac_requests) || !Array.isArray(value.baseline_hmac_requests)) {
    fail('reread_plan_invalid');
  }
  validateWaitState(value.wait_state, deps);
  return value;
}

function prepareRereadMessageFingerprints(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, ['reread_plan', 'event_hmac_results'], 'reread_event_results_input_invalid');
  const plan = validateRereadPlan(input.reread_plan, deps);
  const events = hmacResults(input.event_hmac_results, plan.event_hmac_requests,
    'reread_event_hmac_results_invalid');
  const anchorId = Number(plan.wait_state.anchor_message_id);
  const anchors = plan.second_rows.filter((row) => row.id === anchorId);
  if (anchors.length !== 1) fail('anchor_missing');
  const eventFingerprint = events.get(
    'message_event_' + anchorId + ':' + plan.wait_state.event_identity_key_version,
  );
  const canonical = {
    schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.wait_state.account_id,
    inbox_id: plan.wait_state.inbox_id, conversation_id: plan.wait_state.conversation_id,
    message_id: plan.wait_state.anchor_message_id,
    direction: anchors[0].direction, visibility: anchors[0].visibility,
    event_identity_key_version: plan.wait_state.event_identity_key_version,
    event_identity_fingerprint: eventFingerprint,
  };
  const messageRequests = [Object.freeze({ purpose: 'message_anchor_' + anchorId,
    key_version: plan.wait_state.event_identity_key_version, algorithm: 'hmac-sha256',
    encoding: 'hex',
    material_utf8: ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(canonical) })];
  const core = {
    schema_version: '1.0', kind: 'chatwoot_reread_message_plan_v1', reread_plan: plan,
    event_hmac_results: input.event_hmac_results, message_hmac_requests: messageRequests,
    customer_egress_allowed: false,
  };
  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });
}

function validateMessagePlan(value, deps) {
  exactObject(value, [
    'schema_version', 'kind', 'reread_plan', 'event_hmac_results', 'message_hmac_requests',
    'customer_egress_allowed', 'plan_binding_sha256',
  ], 'reread_message_plan_invalid');
  const core = { ...value };
  delete core.plan_binding_sha256;
  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_reread_message_plan_v1' ||
      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||
      !Array.isArray(value.message_hmac_requests)) fail('reread_message_plan_invalid');
  validateRereadPlan(value.reread_plan, deps);
  return value;
}

function gateState(value) {
  exactObject(value, [
    'current_generation', 'idempotency_consumed', 'brand_enabled', 'kill_switch',
  ], 'post_delay_gate_state_invalid');
  if (!Number.isSafeInteger(value.current_generation) || value.current_generation < 1 ||
      typeof value.idempotency_consumed !== 'boolean' || typeof value.brand_enabled !== 'boolean' ||
      typeof value.kill_switch !== 'boolean') fail('post_delay_gate_state_invalid');
  return value;
}

function setFingerprint(deps, rows) {
  const canonicalRows = rows.map((row) => ({
    id: row.id,
    message_type: row.message_type,
    private: row.private,
    created_at: row.created_at,
    sender_type: row.sender_type,
    direction: row.direction,
    visibility: row.visibility,
    content_sha256: row.content_sha256,
    attachment_count: row.attachment_count,
  })).sort((left, right) => left.id - right.id);
  return sha256Text(deps, MESSAGE_SET_FINGERPRINT_DOMAIN + JSON.stringify(canonicalRows));
}

function finalizePostDelay(input, injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  exactObject(input, [
    'message_plan', 'message_hmac_results', 'baseline_hmac_results', 'gate_state',
    'evaluated_epoch_seconds',
  ], 'post_delay_input_invalid');
  const plan = validateMessagePlan(input.message_plan, deps);
  const reread = plan.reread_plan;
  const wait = reread.wait_state;
  const eventResults = hmacResults(plan.event_hmac_results, reread.event_hmac_requests,
    'reread_event_hmac_results_invalid');
  const messageResults = hmacResults(input.message_hmac_results, plan.message_hmac_requests,
    'reread_message_hmac_results_invalid');
  const baselineResults = hmacResults(input.baseline_hmac_results, reread.baseline_hmac_requests,
    'reread_baseline_hmac_results_invalid');
  const state = gateState(input.gate_state);
  if (!Number.isSafeInteger(input.evaluated_epoch_seconds) || input.evaluated_epoch_seconds < 0 ||
      input.evaluated_epoch_seconds * 1000 < parseIso(reread.read_started_at, 'reread_time_invalid')) {
    fail('reread_time_invalid');
  }
  const first = reread.first_rows;
  const second = reread.second_rows;
  const firstSet = setFingerprint(deps, first);
  const secondSet = setFingerprint(deps, second);
  const anchorId = Number(wait.anchor_message_id);
  const firstAnchor = first.filter((row) => row.id === anchorId);
  const secondAnchor = second.filter((row) => row.id === anchorId);
  const anchorEventFingerprint = eventResults.get(
    'message_event_' + anchorId + ':' + wait.event_identity_key_version,
  );
  const anchorMessageFingerprint = messageResults.get(
    'message_anchor_' + anchorId + ':' + wait.event_identity_key_version,
  );
  if (firstAnchor.length !== 1 || secondAnchor.length !== 1 ||
      firstSet !== secondSet || firstAnchor[0].content_sha256 !== secondAnchor[0].content_sha256 ||
      anchorMessageFingerprint !== wait.message_fingerprint ||
      anchorEventFingerprint !== wait.event_identity_fingerprint) {
    fail('bounded_reread_binding_failed');
  }
  const key = wait.baseline_fingerprint_key_version;
  const beforeStatus = baselineResults.get('conversation_before_status:' + key);
  const beforeAssignee = baselineResults.get('conversation_before_assignee:' + key);
  const afterStatus = baselineResults.get('conversation_after_status:' + key);
  const afterAssignee = baselineResults.get('conversation_after_assignee:' + key);
  const rows = second;
  const latest = (predicate) => {
    const matches = rows.filter(predicate);
    return matches.length ? matches.reduce((a, b) => a.id > b.id ? a : b) : null;
  };
  const latestInbound = latest((row) => row.message_type === 0 && row.private === false);
  const latestHuman = latest((row) => row.message_type === 1 && row.private === false &&
    ['user', 'agent'].includes(row.sender_type));
  const latestPrivate = latest((row) => row.message_type !== 2 && row.private === true);
  const latestNonActivity = latest((row) => row.message_type !== 2);
  let cancellationReason = null;
  if (beforeStatus !== afterStatus || beforeAssignee !== afterAssignee) cancellationReason = 'conversation_changed';
  else if (afterStatus !== wait.baseline_status_fingerprint) cancellationReason = 'status_changed';
  else if (afterAssignee !== wait.baseline_assignee_fingerprint) cancellationReason = 'assignee_changed';
  else if (!state.brand_enabled) cancellationReason = 'brand_disabled';
  else if (state.kill_switch) cancellationReason = 'brand_kill_switch';
  else if (state.idempotency_consumed) cancellationReason = 'idempotency_consumed';
  else if (state.current_generation !== wait.generation) cancellationReason = 'stale_generation';
  else if (latestInbound && latestInbound.id > anchorId) cancellationReason = 'newer_inbound';
  else if (latestHuman && latestHuman.id > anchorId) cancellationReason = 'human_intervention';
  else if (latestPrivate && latestPrivate.id > anchorId) cancellationReason = 'private_note_present';
  else if (latestNonActivity && latestNonActivity.id > anchorId) cancellationReason = 'newer_non_activity';
  const eligible = cancellationReason === null;
  const anchor = secondAnchor[0];
  const summaryCore = {
    wait_state_fingerprint: wait.wait_state_fingerprint,
    scan_first_count: first.length, scan_second_count: second.length,
    scan_first_set_fingerprint: firstSet, scan_second_set_fingerprint: secondSet,
    anchor_message_id: wait.anchor_message_id,
    anchor_message_fingerprint: anchorMessageFingerprint,
    current_generation: state.current_generation,
    expected_generation: wait.generation,
    conversation_snapshots_stable: beforeStatus === afterStatus && beforeAssignee === afterAssignee,
    evaluated_at: isoFromEpochSeconds(input.evaluated_epoch_seconds),
  };
  const verifiedAnchor = eligible ? Object.freeze({
    schema_version: '1.0', kind: 'chatwoot_verified_anchor_for_llm_v1',
    account_id: wait.account_id, inbox_id: wait.inbox_id, channel: wait.channel,
    conversation_id: wait.conversation_id, message_id: wait.anchor_message_id,
    content: anchor.anchor_content, content_sha256: anchor.content_sha256,
    attachment_count: anchor.attachment_count, transient_only: true,
    persistence_allowed: false, customer_egress_allowed: false,
  }) : null;
  return Object.freeze({
    schema_version: '1.0', kind: 'chatwoot_post_delay_stage_v1',
    status: eligible ? 'eligible' : 'cancelled', eligible_for_observation: eligible,
    cancellation_reason: cancellationReason,
    live_reread_summary: Object.freeze({ ...summaryCore,
      summary_binding_sha256: binding(deps, summaryCore) }),
    verified_anchor: verifiedAnchor,
    transient_only: true, persistence_allowed: false, customer_egress_allowed: false,
  });
}

function failClosedEnvelope(stage, error) {
  const reasonCode = error instanceof FailClosedError ? error.reasonCode : 'stage_unexpected_failure';
  if (typeof stage !== 'string' || !/^[a-z][a-z0-9_]{2,80}$/.test(stage)) {
    fail('stage_name_invalid');
  }
  return Object.freeze({
    schema_version: '1.0', kind: 'chatwoot_stage_failure_v1', stage,
    status: 'fail_closed', reason_code: reasonCode,
    customer_egress_allowed: false,
  });
}

function createChatwootObservationStages(injectedDependencies) {
  const deps = dependencies(injectedDependencies);
  return Object.freeze({
    prepareSignedIngress: (input) => prepareSignedIngress(input, deps),
    finalizeSignedHmac: (input) => finalizeSignedHmac(input, deps),
    prepareEventIdentity: (input) => prepareEventIdentity(input, deps),
    finalizeEventIdentity: (input) => finalizeEventIdentity(input, deps),
    finalizeRouteFingerprints: (input) => finalizeRouteFingerprints(input, deps),
    prepareBaseline: (input) => prepareBaseline(input, deps),
    finalizeWaitState: (input) => finalizeWaitState(input, deps),
    prepareBoundedReread: (input) => prepareBoundedReread(input, deps),
    prepareRereadMessageFingerprints: (input) => prepareRereadMessageFingerprints(input, deps),
    finalizePostDelay: (input) => finalizePostDelay(input, deps),
    validateWaitState: (input) => validateWaitState(input, deps),
  });
}

module.exports = Object.freeze({
  ACCOUNT_ID,
  BRAND_ID,
  INBOX_CHANNELS,
  MAX_RAW_BODY_SIZE_BYTES,
  MAX_AGE_SECONDS,
  MAX_FUTURE_SKEW_SECONDS,
  SCAN_PAGE_SIZE_LIMIT,
  EVENT_IDENTITY_CANONICAL_FORMAT,
  EVENT_TO_STORAGE_KEY_VERSION,
  STORAGE_TO_EVENT_KEY_VERSION,
  WAIT_CARRIER_FIELD_ORDER,
  PARITY_MANIFEST,
  PARITY_MANIFEST_SHA256,
  FailClosedError,
  stableJson,
  canonicalEventTuple,
  eventKeyVersionToStorage,
  storageKeyVersionToEvent,
  failClosedEnvelope,
  createChatwootObservationStages,
});
