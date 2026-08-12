'use strict';

/*
 * Pure, credential-free bridge from a transient Chatwoot reconciliation
 * candidate to the identifier-only inputs of the durable ingress pipeline.
 *
 * This module does not verify, accept, or claim a signed webhook. Native n8n
 * Crypto nodes own HMAC execution. PostgreSQL nodes own all atomic effects.
 * The bridge only validates exact envelopes, binds native HMAC results to the
 * requests that produced them, and projects commands/control fields.
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
const DELAY_POLICY_VERSION = '2026-08-11-v1';
const DELAY_RANGES = Object.freeze({
  instagram: Object.freeze({ minimum: 30, maximum: 75 }),
  tiktok: Object.freeze({ minimum: 30, maximum: 75 }),
  whatsapp: Object.freeze({ minimum: 30, maximum: 75 }),
  email: Object.freeze({ minimum: 120, maximum: 300 }),
});

const REQUEST_SOURCE = 'chatwoot_reconciliation_api_v1';
const REQUEST_ATTEMPT_IDENTITY_DOMAIN =
  'calapres-chatwoot-reconciliation-request-attempt-v1:';
const SOURCE_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-source-binding-v1:';
const MESSAGE_FINGERPRINT_DOMAIN = 'calapres-message-anchor-v1:';
const CONVERSATION_FINGERPRINT_DOMAIN = 'calapres-conversation-v1:';
const HMAC_REQUEST_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-hmac-request-binding-v1:';
const NATIVE_CRYPTO_LINEAGE_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-native-crypto-lineage-v1:';
const NATIVE_CRYPTO_PARENT_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-native-crypto-parent-v1:';
const IDENTITY_PLAN_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-ingress-plan-v1:';
const IDENTITY_SEED_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-ingress-identity-seed-v1:';
const IDENTITY_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-ingress-identity-v1:';
const ROUTE_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-ingress-route-v1:';
const PROJECTION_BINDING_DOMAIN =
  'calapres-chatwoot-reconciliation-durable-projection-v1:';
const REQUEST_LEASE_TOKEN_DOMAIN =
  'calapres-chatwoot-reconciliation-request-lease-v1:';
const BUSINESS_LEASE_TOKEN_DOMAIN =
  'calapres-chatwoot-reconciliation-business-lease-v1:';
const NATIVE_CRYPTO_TRUST_BOUNDARY = 'n8n_native_crypto_direct_lineage_v1';
const NATIVE_CRYPTO_NODE_TYPE = 'n8n-nodes-base.crypto';
const NATIVE_CRYPTO_NODE_TYPE_VERSION = 2;
const NATIVE_CRYPTO_CREDENTIAL_TYPE = 'crypto';

const CANDIDATE_CORE_FIELDS = Object.freeze([
  'schema_version',
  'kind',
  'source',
  'brand_id',
  'account_id',
  'inbox_id',
  'channel',
  'event',
  'conversation_id',
  'message_id',
  'event_at',
  'direction',
  'visibility',
  'sender_class',
  'attachment_count',
  'canonical_tuple_format',
  'canonical_tuple',
  'active_event_identity_key_version',
  'retained_event_identity_key_versions',
  'event_identity_hmac_requests',
  'activation_floor_at',
  'activation_policy_version',
  'content_state',
  'live_reread_required',
  'raw_content_used',
  'raw_contact_used',
  'transient_only',
  'persistence_allowed',
  'wait_payload_allowed',
  'audit_payload_allowed',
  'customer_egress_allowed',
]);
const CANDIDATE_FIELDS = Object.freeze([
  ...CANDIDATE_CORE_FIELDS,
  'candidate_ref',
  'candidate_binding_sha256',
]);
const TUPLE_FIELDS = Object.freeze([
  'schema_version',
  'account_id',
  'inbox_id',
  'event',
  'conversation_id',
  'message_id',
]);
const HMAC_REQUEST_FIELDS = Object.freeze([
  'purpose',
  'key_version',
  'algorithm',
  'encoding',
  'material_utf8',
]);
const BOUND_HMAC_REQUEST_FIELDS = Object.freeze([
  ...HMAC_REQUEST_FIELDS,
  'request_binding_sha256',
]);
const NATIVE_CRYPTO_STEP_FIELDS = Object.freeze([
  'sequence',
  'purpose',
  'key_version',
  'request_binding_sha256',
  'node_name',
  'node_type',
  'node_type_version',
  'action',
  'hash_type',
  'binary_data',
  'encoding',
  'value_expression',
  'digest_property',
  'credential_type',
  'credential_placeholder',
]);
const NATIVE_CRYPTO_LINEAGE_FIELDS = Object.freeze([
  'schema_version',
  'kind',
  'trust_boundary',
  'stage',
  'single_item_required',
  'direct_lineage_required',
  'split_allowed',
  'merge_allowed',
  'mutable_intermediary_allowed',
  'cryptographic_verification_performed_in_code',
  'parent_binding_sha256',
  'request_array_property',
  'steps',
  'lineage_binding_sha256',
]);
const TRUST_LABEL_FIELDS = Object.freeze([
  'trust_boundary',
  'native_crypto_direct_lineage_required',
  'cryptographic_verification_performed_in_code',
]);
const PLAN_FIELDS = Object.freeze([
  'schema_version', 'kind', 'source', 'ingress_mode', 'execution_id',
  'candidate', 'provenance', 'hmac_requests', 'native_crypto_lineage',
  ...TRUST_LABEL_FIELDS,
  'signed_webhook_evidence', 'raw_body_evidence', 'customer_egress_allowed',
  'plan_binding_sha256',
]);
const IDENTITY_FIELDS = Object.freeze([
  'schema_version', 'kind', 'source', 'ingress_mode', 'execution_id',
  'candidate', 'provenance', 'event_identity_fingerprints',
  'request_attempt_fingerprints', 'identity_seed_sha256', 'route_hmac_requests',
  'native_crypto_lineage', ...TRUST_LABEL_FIELDS,
  'signed_webhook_evidence', 'raw_body_evidence', 'customer_egress_allowed',
  'identity_binding_sha256',
]);
const PROVENANCE_FIELDS = Object.freeze([
  'schema_version',
  'request_source',
  'source',
  'brand_id',
  'account_id',
  'inbox_id',
  'channel',
  'conversation_id',
  'message_id',
  'scan_id',
  'expected_after_message_id',
  'page_binding_sha256',
  'candidate_ref',
  'candidate_binding_sha256',
  'activation_floor_at',
  'activation_policy_version',
  'kind',
  'scan_lease_token',
  'customer_egress_allowed',
  'source_binding_sha256',
]);

const HEX_64 = /^[a-f0-9]{64}$/;
const EVENT_KEY_VERSION = /^calapres-identity-hmac-v([1-9][0-9]*)$/;
const STORAGE_KEY_VERSION = /^hmac-sha256-v([1-9][0-9]*)$/;
const KEY_REGISTRY_VERSION = /^calapres-storage-keys-v[1-9][0-9]*$/;
const BASELINE_KEY_VERSION = /^calapres-hmac-v[1-9][0-9]*$/;
const POLICY_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;
const KNOWLEDGE_VERSION = POLICY_VERSION;
const EXECUTION_ID = /^[A-Za-z0-9_-]{1,120}$/;
const SCAN_ID = /^cwrs_[a-f0-9]{24}$/;
const OPAQUE_ID = /^[A-Za-z0-9:_-]{4,160}$/;
const POSITIVE_TOKEN = /^[1-9][0-9]{0,30}$/;
const STRICT_ISO_TIMESTAMP =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;

class ReconciliationIngressBridgeError extends Error {
  constructor(reasonCode) {
    super(reasonCode);
    this.name = 'ReconciliationIngressBridgeError';
    this.reasonCode = reasonCode;
  }
}

function fail(reasonCode) {
  throw new ReconciliationIngressBridgeError(reasonCode);
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
  if (Array.isArray(value)) value.forEach(deepFreeze);
  else if (plainObject(value)) Object.values(value).forEach(deepFreeze);
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

function pick(value, fields) {
  const result = {};
  for (const field of fields) result[field] = value[field];
  return result;
}

function normalizeIso(value, reasonCode) {
  if (typeof value !== 'string' || !STRICT_ISO_TIMESTAMP.test(value)) fail(reasonCode);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) fail(reasonCode);
  return new Date(milliseconds).toISOString();
}

function positiveToken(value, maximumDigits, reasonCode) {
  if (typeof value !== 'string' || value.length > maximumDigits || !POSITIVE_TOKEN.test(value) ||
      !Number.isSafeInteger(Number(value)) || String(Number(value)) !== value) fail(reasonCode);
  return value;
}

function integerBetween(value, minimum, maximum, reasonCode) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(reasonCode);
  return value;
}

function dependencies(value) {
  exactObject(value, [
    'sha256Hex',
    'validate_messages_page',
    'active_event_identity_key_version',
    'retained_event_identity_key_versions',
    'event_to_storage_key_versions',
    'key_registry_version',
    'activation_floor_at',
    'activation_policy_version',
    'request_ttl_seconds',
    'event_retention_seconds',
    'lease_duration_seconds',
    'baseline_fingerprint_key_version',
    'knowledge_version',
    'retention_seconds',
  ], 'bridge_dependencies_invalid');
  if (typeof value.sha256Hex !== 'function' ||
      typeof value.validate_messages_page !== 'function' ||
      !EVENT_KEY_VERSION.test(value.active_event_identity_key_version || '') ||
      !Array.isArray(value.retained_event_identity_key_versions) ||
      value.retained_event_identity_key_versions.length > 8 ||
      value.retained_event_identity_key_versions.some((entry) =>
        !EVENT_KEY_VERSION.test(entry || '')) ||
      new Set([
        value.active_event_identity_key_version,
        ...value.retained_event_identity_key_versions,
      ]).size !== value.retained_event_identity_key_versions.length + 1 ||
      !KEY_REGISTRY_VERSION.test(value.key_registry_version || '') ||
      !POLICY_VERSION.test(value.activation_policy_version || '') ||
      !BASELINE_KEY_VERSION.test(value.baseline_fingerprint_key_version || '') ||
      !KNOWLEDGE_VERSION.test(value.knowledge_version || '')) {
    fail('bridge_dependencies_invalid');
  }
  const keyVersions = [
    value.active_event_identity_key_version,
    ...value.retained_event_identity_key_versions,
  ];
  exactObject(value.event_to_storage_key_versions, keyVersions, 'storage_key_mapping_invalid');
  const storageVersions = [];
  for (const eventVersion of keyVersions) {
    const eventMatch = eventVersion.match(EVENT_KEY_VERSION);
    const storageVersion = value.event_to_storage_key_versions[eventVersion];
    const storageMatch = typeof storageVersion === 'string'
      ? storageVersion.match(STORAGE_KEY_VERSION) : null;
    if (!storageMatch || storageMatch[1] !== eventMatch[1]) fail('storage_key_mapping_invalid');
    storageVersions.push(storageVersion);
  }
  if (new Set(storageVersions).size !== storageVersions.length) fail('storage_key_mapping_invalid');
  const requestTtlSeconds = integerBetween(
    value.request_ttl_seconds, 60, 86400, 'request_ttl_invalid',
  );
  const eventRetentionSeconds = integerBetween(
    value.event_retention_seconds, 300, 604800, 'event_retention_invalid',
  );
  const leaseDurationSeconds = integerBetween(
    value.lease_duration_seconds, 1, 900, 'lease_duration_invalid',
  );
  if (leaseDurationSeconds > requestTtlSeconds || leaseDurationSeconds > eventRetentionSeconds) {
    fail('lease_duration_invalid');
  }
  const retentionSeconds = integerBetween(
    value.retention_seconds, 86400, 31536000, 'retention_seconds_invalid',
  );
  return Object.freeze({
    sha256Hex: value.sha256Hex,
    validateMessagesPage: value.validate_messages_page,
    activeEventIdentityKeyVersion: value.active_event_identity_key_version,
    retainedEventIdentityKeyVersions: Object.freeze([
      ...value.retained_event_identity_key_versions,
    ]),
    keyVersions: Object.freeze(keyVersions),
    eventToStorageKeyVersions: Object.freeze({ ...value.event_to_storage_key_versions }),
    keyRegistryVersion: value.key_registry_version,
    activationFloorAt: normalizeIso(value.activation_floor_at, 'activation_floor_invalid'),
    activationPolicyVersion: value.activation_policy_version,
    requestTtlSeconds,
    eventRetentionSeconds,
    leaseDurationSeconds,
    baselineFingerprintKeyVersion: value.baseline_fingerprint_key_version,
    knowledgeVersion: value.knowledge_version,
    retentionSeconds,
  });
}

function digestText(deps, value) {
  const result = deps.sha256Hex(value);
  if (!HEX_64.test(result || '')) fail('sha256_dependency_output_invalid');
  return result;
}

function digest(deps, domain, value) {
  return digestText(deps, domain + stableJson(value));
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

function rawHmacRequest(purpose, keyVersion, materialUtf8) {
  return Object.freeze({
    purpose,
    key_version: keyVersion,
    algorithm: 'hmac-sha256',
    encoding: 'hex',
    material_utf8: materialUtf8,
  });
}

function sourceProvenance(candidate, messagesPage, reconciliationContext, deps) {
  exactObject(reconciliationContext, [
    'scan_id',
    'scan_lease_token',
    'expected_after_message_id',
  ], 'reconciliation_context_invalid');
  if (typeof reconciliationContext.scan_id !== 'string' ||
      !SCAN_ID.test(reconciliationContext.scan_id) ||
      typeof reconciliationContext.scan_lease_token !== 'string' ||
      !OPAQUE_ID.test(reconciliationContext.scan_lease_token) ||
      !Number.isSafeInteger(reconciliationContext.expected_after_message_id) ||
      reconciliationContext.expected_after_message_id < 0 ||
      !Number.isSafeInteger(messagesPage.requested_after_message_id) ||
      messagesPage.requested_after_message_id < 0 ||
      messagesPage.requested_after_message_id !==
        reconciliationContext.expected_after_message_id ||
      messagesPage.requested_after_message_id >= Number(candidate.message_id) ||
      !HEX_64.test(messagesPage.page_binding_sha256 || '')) {
    fail('reconciliation_context_invalid');
  }
  const bindingCore = {
    schema_version: '1.0',
    request_source: REQUEST_SOURCE,
    source: SOURCE,
    brand_id: BRAND_ID,
    account_id: candidate.account_id,
    inbox_id: candidate.inbox_id,
    channel: candidate.channel,
    conversation_id: candidate.conversation_id,
    message_id: candidate.message_id,
    scan_id: reconciliationContext.scan_id,
    expected_after_message_id: reconciliationContext.expected_after_message_id,
    page_binding_sha256: messagesPage.page_binding_sha256,
    candidate_ref: candidate.candidate_ref,
    candidate_binding_sha256: candidate.candidate_binding_sha256,
    activation_floor_at: deps.activationFloorAt,
    activation_policy_version: deps.activationPolicyVersion,
  };
  const core = {
    ...bindingCore,
    kind: 'chatwoot_reconciliation_source_provenance_v1',
    scan_lease_token: reconciliationContext.scan_lease_token,
    customer_egress_allowed: false,
  };
  return deepFreeze({
    ...core,
    source_binding_sha256: digest(deps, SOURCE_BINDING_DOMAIN, bindingCore),
  });
}

function boundHmacRequest(deps, stage, parentBinding, request) {
  const requestBinding = digest(deps, HMAC_REQUEST_BINDING_DOMAIN, {
    stage,
    parent_binding_sha256: parentBinding,
    request,
  });
  return Object.freeze({ ...request, request_binding_sha256: requestBinding });
}

function nativeCryptoCredentialPlaceholder(keyVersion) {
  const match = keyVersion.match(EVENT_KEY_VERSION);
  if (!match) fail('native_crypto_key_version_invalid');
  return 'Calapres Event Identity HMAC v' + match[1];
}

function nativeCryptoDigestProperty(stage, sequence, request) {
  const version = request.key_version.match(EVENT_KEY_VERSION);
  if (!version || !/^[a-z][a-z0-9_]{2,80}$/.test(stage) ||
      !/^[a-z][a-z0-9_]{2,80}$/.test(request.purpose)) {
    fail('native_crypto_lineage_invalid');
  }
  return [
    'reconciliation_hmac',
    stage,
    String(sequence).padStart(2, '0'),
    request.purpose,
    'v' + version[1],
  ].join('_');
}

function nativeCryptoNodeName(stage, sequence, request) {
  return [
    'Crypto Reconciliation',
    String(sequence).padStart(2, '0'),
    stage,
    request.purpose,
    request.key_version,
    'Placeholder',
  ].join(' - ');
}

function buildNativeCryptoLineage(deps, stage, parentBinding, requestArrayProperty, requests) {
  if (!HEX_64.test(parentBinding || '') ||
      !['hmac_requests', 'route_hmac_requests'].includes(requestArrayProperty) ||
      !Array.isArray(requests) || requests.length < 1 || requests.length > 36) {
    fail('native_crypto_lineage_invalid');
  }
  const steps = requests.map((request, index) => {
    exactObject(request, BOUND_HMAC_REQUEST_FIELDS, 'native_crypto_lineage_invalid');
    const sequence = index + 1;
    return Object.freeze({
      sequence,
      purpose: request.purpose,
      key_version: request.key_version,
      request_binding_sha256: request.request_binding_sha256,
      node_name: nativeCryptoNodeName(stage, sequence, request),
      node_type: NATIVE_CRYPTO_NODE_TYPE,
      node_type_version: NATIVE_CRYPTO_NODE_TYPE_VERSION,
      action: 'hmac',
      hash_type: 'SHA256',
      binary_data: false,
      encoding: 'hex',
      value_expression:
        '={{ $json.' + requestArrayProperty + '[' + index + '].material_utf8 }}',
      digest_property: nativeCryptoDigestProperty(stage, sequence, request),
      credential_type: NATIVE_CRYPTO_CREDENTIAL_TYPE,
      credential_placeholder: nativeCryptoCredentialPlaceholder(request.key_version),
    });
  });
  if (new Set(steps.map((step) => step.digest_property)).size !== steps.length ||
      new Set(steps.map((step) => step.node_name)).size !== steps.length) {
    fail('native_crypto_lineage_invalid');
  }
  const core = {
    schema_version: '1.0',
    kind: 'chatwoot_reconciliation_native_crypto_lineage_v1',
    trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,
    stage,
    single_item_required: true,
    direct_lineage_required: true,
    split_allowed: false,
    merge_allowed: false,
    mutable_intermediary_allowed: false,
    cryptographic_verification_performed_in_code: false,
    parent_binding_sha256: parentBinding,
    request_array_property: requestArrayProperty,
    steps: Object.freeze(steps),
  };
  return deepFreeze({
    ...core,
    lineage_binding_sha256: digest(deps, NATIVE_CRYPTO_LINEAGE_BINDING_DOMAIN, core),
  });
}

function validateNativeCryptoLineage(
  value, deps, stage, parentBinding, requestArrayProperty, requests,
) {
  exactObject(value, NATIVE_CRYPTO_LINEAGE_FIELDS, 'native_crypto_lineage_invalid');
  if (!Array.isArray(value.steps) ||
      value.steps.some((step) => {
        try {
          exactObject(step, NATIVE_CRYPTO_STEP_FIELDS, 'native_crypto_lineage_invalid');
          return false;
        } catch (_error) {
          return true;
        }
      })) fail('native_crypto_lineage_invalid');
  const expected = buildNativeCryptoLineage(
    deps, stage, parentBinding, requestArrayProperty, requests,
  );
  if (stableJson(value) !== stableJson(expected)) fail('native_crypto_lineage_invalid');
  return value;
}

function nativeCryptoParentBinding(deps, stage, value) {
  return digest(deps, NATIVE_CRYPTO_PARENT_BINDING_DOMAIN, { stage, value });
}

function nativeCryptoOutput(value, baseFields, validateBase, reasonCode) {
  if (!plainObject(value) || baseFields.some((field) =>
    !Object.prototype.hasOwnProperty.call(value, field))) fail(reasonCode);
  const base = pick(value, baseFields);
  validateBase(base);
  const lineage = base.native_crypto_lineage;
  const digestProperties = lineage.steps.map((step) => step.digest_property);
  exactObject(value, [...baseFields, ...digestProperties], reasonCode);
  const results = new Map();
  for (const step of lineage.steps) {
    const keyedPurpose = step.purpose + ':' + step.key_version;
    if (results.has(keyedPurpose) || !HEX_64.test(value[step.digest_property] || '')) {
      fail(reasonCode);
    }
    results.set(keyedPurpose, value[step.digest_property]);
  }
  if (results.size !== lineage.steps.length) fail(reasonCode);
  return Object.freeze({ base, results });
}

function validateCandidate(value, deps) {
  exactObject(value, CANDIDATE_FIELDS, 'candidate_shape_invalid');
  exactObject(value.canonical_tuple, TUPLE_FIELDS, 'candidate_tuple_invalid');
  const channel = INBOX_CHANNELS[value.inbox_id];
  const conversationId = positiveToken(value.conversation_id, 30, 'candidate_route_invalid');
  const messageId = positiveToken(value.message_id, 15, 'candidate_route_invalid');
  const eventAt = normalizeIso(value.event_at, 'candidate_event_time_invalid');
  if (value.schema_version !== '1.0' ||
      value.kind !== 'chatwoot_reconciliation_event_candidate_v1' ||
      value.source !== SOURCE || value.brand_id !== BRAND_ID ||
      value.account_id !== ACCOUNT_ID || !channel || value.channel !== channel ||
      value.event !== 'message_created' || value.direction !== 'incoming' ||
      value.visibility !== 'public' || value.sender_class !== 'contact' ||
      !Number.isSafeInteger(value.attachment_count) || value.attachment_count < 0 ||
      value.attachment_count > 32 || value.canonical_tuple_format !== CANONICAL_TUPLE_FORMAT ||
      value.active_event_identity_key_version !== deps.activeEventIdentityKeyVersion ||
      stableJson(value.retained_event_identity_key_versions) !==
        stableJson(deps.retainedEventIdentityKeyVersions) ||
      value.activation_floor_at !== deps.activationFloorAt ||
      value.activation_policy_version !== deps.activationPolicyVersion ||
      value.content_state !== 'deferred_live_reread' || value.live_reread_required !== true ||
      value.raw_content_used !== false || value.raw_contact_used !== false ||
      value.transient_only !== true || value.persistence_allowed !== false ||
      value.wait_payload_allowed !== false || value.audit_payload_allowed !== false ||
      value.customer_egress_allowed !== false ||
      eventAt !== value.event_at || Date.parse(eventAt) < Date.parse(deps.activationFloorAt)) {
    fail('candidate_invalid');
  }
  const expectedTuple = {
    schema_version: '1.0',
    account_id: ACCOUNT_ID,
    inbox_id: value.inbox_id,
    event: 'message_created',
    conversation_id: conversationId,
    message_id: messageId,
  };
  if (stableJson(value.canonical_tuple) !== stableJson(expectedTuple)) {
    fail('candidate_tuple_mismatch');
  }
  if (!Array.isArray(value.event_identity_hmac_requests) ||
      value.event_identity_hmac_requests.length !== deps.keyVersions.length) {
    fail('candidate_hmac_requests_invalid');
  }
  const tupleJson = orderedTupleJson(expectedTuple);
  const expectedEventRequests = deps.keyVersions.map((keyVersion) =>
    rawHmacRequest('event_identity', keyVersion, tupleJson));
  for (let index = 0; index < expectedEventRequests.length; index += 1) {
    exactObject(
      value.event_identity_hmac_requests[index],
      HMAC_REQUEST_FIELDS,
      'candidate_hmac_requests_invalid',
    );
    if (stableJson(value.event_identity_hmac_requests[index]) !==
        stableJson(expectedEventRequests[index])) fail('candidate_hmac_requests_invalid');
  }
  const core = pick(value, CANDIDATE_CORE_FIELDS);
  const expectedRef = 'cwr_' + digest(
    deps, 'calapres-chatwoot-reconciliation-candidate-v1:', core,
  ).slice(0, 24);
  const expectedBinding = digest(
    deps, 'calapres-chatwoot-reconciliation-candidate-binding-v1:', core,
  );
  if (value.candidate_ref !== expectedRef ||
      value.candidate_binding_sha256 !== expectedBinding) fail('candidate_binding_invalid');
  return value;
}

function validateCandidateMembership(messagesPage, candidate, deps) {
  let page;
  try {
    page = deps.validateMessagesPage(messagesPage);
  } catch (_error) {
    fail('messages_page_invalid');
  }
  if (!plainObject(page) || stableJson(page) !== stableJson(messagesPage) ||
      !Array.isArray(page.event_candidates)) fail('messages_page_invalid');
  const validatedCandidate = validateCandidate(candidate, deps);
  const matches = page.event_candidates.filter((entry) =>
    plainObject(entry) && entry.candidate_ref === validatedCandidate.candidate_ref);
  if (matches.length !== 1 || stableJson(matches[0]) !== stableJson(validatedCandidate)) {
    fail('candidate_page_membership_invalid');
  }
  if (page.account_id !== validatedCandidate.account_id ||
      page.inbox_id !== validatedCandidate.inbox_id ||
      page.channel !== validatedCandidate.channel ||
      page.conversation_id !== validatedCandidate.conversation_id ||
      page.activation_floor_at !== validatedCandidate.activation_floor_at ||
      page.activation_policy_version !== validatedCandidate.activation_policy_version ||
      !Number.isSafeInteger(page.requested_after_message_id) ||
      !Number.isSafeInteger(page.proposed_next_after_message_id) ||
      page.requested_after_message_id >= Number(validatedCandidate.message_id) ||
      page.proposed_next_after_message_id < Number(validatedCandidate.message_id)) {
    fail('candidate_page_route_invalid');
  }
  return Object.freeze({ page, candidate: validatedCandidate });
}

function expectedInitialRequests(candidate, provenance, deps) {
  const tupleJson = orderedTupleJson(candidate.canonical_tuple);
  const attemptCanonical = {
    schema_version: '1.0',
    request_source: provenance.request_source,
    source: provenance.source,
    brand_id: provenance.brand_id,
    account_id: provenance.account_id,
    inbox_id: provenance.inbox_id,
    channel: provenance.channel,
    conversation_id: provenance.conversation_id,
    message_id: provenance.message_id,
    scan_id: provenance.scan_id,
    expected_after_message_id: provenance.expected_after_message_id,
    page_binding_sha256: provenance.page_binding_sha256,
    candidate_ref: provenance.candidate_ref,
    candidate_binding_sha256: provenance.candidate_binding_sha256,
    activation_floor_at: provenance.activation_floor_at,
    activation_policy_version: provenance.activation_policy_version,
  };
  const requests = [];
  for (const keyVersion of deps.keyVersions) {
    const eventRequest = rawHmacRequest('event_identity', keyVersion, tupleJson);
    const replayRequest = rawHmacRequest(
      'reconciliation_request_attempt',
      keyVersion,
      REQUEST_ATTEMPT_IDENTITY_DOMAIN + stableJson(attemptCanonical),
    );
    requests.push(boundHmacRequest(
      deps, 'event_identity', candidate.candidate_binding_sha256, eventRequest,
    ));
    requests.push(boundHmacRequest(
      deps, 'request_attempt_identity', provenance.source_binding_sha256, replayRequest,
    ));
  }
  return Object.freeze(requests);
}

function validatePlan(value, deps) {
  exactObject(value, PLAN_FIELDS, 'identity_plan_invalid');
  const candidate = validateCandidate(value.candidate, deps);
  if (typeof value.execution_id !== 'string' || !EXECUTION_ID.test(value.execution_id)) {
    fail('identity_plan_invalid');
  }
  exactObject(value.provenance, PROVENANCE_FIELDS, 'identity_plan_invalid');
  const expectedProvenance = sourceProvenance(
    candidate,
    {
      requested_after_message_id: value.provenance.expected_after_message_id,
      page_binding_sha256: value.provenance.page_binding_sha256,
    },
    {
      scan_id: value.provenance.scan_id,
      scan_lease_token: value.provenance.scan_lease_token,
      expected_after_message_id: value.provenance.expected_after_message_id,
    },
    deps,
  );
  if (stableJson(value.provenance) !== stableJson(expectedProvenance)) {
    fail('identity_plan_invalid');
  }
  const expectedRequests = expectedInitialRequests(candidate, expectedProvenance, deps);
  const expectedParentBinding = nativeCryptoParentBinding(deps, 'candidate_identity', {
    candidate_binding_sha256: candidate.candidate_binding_sha256,
    source_binding_sha256: expectedProvenance.source_binding_sha256,
    execution_id: value.execution_id,
  });
  validateNativeCryptoLineage(
    value.native_crypto_lineage,
    deps,
    'candidate_identity',
    expectedParentBinding,
    'hmac_requests',
    expectedRequests,
  );
  const core = { ...value };
  delete core.plan_binding_sha256;
  if (value.schema_version !== '1.0' ||
      value.kind !== 'chatwoot_reconciliation_ingress_identity_plan_v1' ||
      value.source !== SOURCE || value.ingress_mode !== 'reconciliation_api_read' ||
      value.trust_boundary !== NATIVE_CRYPTO_TRUST_BOUNDARY ||
      value.native_crypto_direct_lineage_required !== true ||
      value.cryptographic_verification_performed_in_code !== false ||
      value.signed_webhook_evidence !== null || value.raw_body_evidence !== null ||
      value.customer_egress_allowed !== false || !Array.isArray(value.hmac_requests) ||
      stableJson(value.hmac_requests) !== stableJson(expectedRequests) ||
      value.plan_binding_sha256 !== digest(deps, IDENTITY_PLAN_BINDING_DOMAIN, core)) {
    fail('identity_plan_invalid');
  }
  return value;
}

function identitySeed(candidate, provenance, eventFingerprints, attemptFingerprints, deps) {
  return digest(deps, IDENTITY_SEED_BINDING_DOMAIN, {
    source: SOURCE,
    request_source: REQUEST_SOURCE,
    source_binding_sha256: provenance.source_binding_sha256,
    candidate_ref: candidate.candidate_ref,
    candidate_binding_sha256: candidate.candidate_binding_sha256,
    event_identity_fingerprints: eventFingerprints,
    request_attempt_fingerprints: attemptFingerprints,
  });
}

function expectedRouteRequests(candidate, eventFingerprints, seed, deps) {
  const requests = [];
  for (const keyVersion of deps.keyVersions) {
    const eventFingerprint = eventFingerprints[keyVersion];
    const messageCanonical = {
      schema_version: '1.0',
      brand_id: BRAND_ID,
      account_id: candidate.account_id,
      inbox_id: candidate.inbox_id,
      conversation_id: candidate.conversation_id,
      message_id: candidate.message_id,
      direction: 'inbound',
      visibility: 'public',
      event_identity_key_version: keyVersion,
      event_identity_fingerprint: eventFingerprint,
    };
    const conversationCanonical = {
      schema_version: '1.0',
      brand_id: BRAND_ID,
      account_id: candidate.account_id,
      inbox_id: candidate.inbox_id,
      conversation_id: candidate.conversation_id,
      event_identity_key_version: keyVersion,
    };
    requests.push(boundHmacRequest(
      deps,
      'message_anchor',
      seed,
      rawHmacRequest(
        'message_anchor',
        keyVersion,
        MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(messageCanonical),
      ),
    ));
    requests.push(boundHmacRequest(
      deps,
      'conversation',
      seed,
      rawHmacRequest(
        'conversation',
        keyVersion,
        CONVERSATION_FINGERPRINT_DOMAIN + JSON.stringify(conversationCanonical),
      ),
    ));
  }
  return Object.freeze(requests);
}

function validateFingerprintMap(value, keyVersions, reasonCode) {
  exactObject(value, keyVersions, reasonCode);
  for (const keyVersion of keyVersions) {
    if (!HEX_64.test(value[keyVersion] || '')) fail(reasonCode);
  }
  return value;
}

function validateIdentity(value, deps) {
  exactObject(value, IDENTITY_FIELDS, 'identity_invalid');
  const candidate = validateCandidate(value.candidate, deps);
  if (typeof value.execution_id !== 'string' || !EXECUTION_ID.test(value.execution_id)) {
    fail('identity_invalid');
  }
  exactObject(value.provenance, PROVENANCE_FIELDS, 'identity_invalid');
  const expectedProvenance = sourceProvenance(
    candidate,
    {
      requested_after_message_id: value.provenance.expected_after_message_id,
      page_binding_sha256: value.provenance.page_binding_sha256,
    },
    {
      scan_id: value.provenance.scan_id,
      scan_lease_token: value.provenance.scan_lease_token,
      expected_after_message_id: value.provenance.expected_after_message_id,
    },
    deps,
  );
  if (stableJson(value.provenance) !== stableJson(expectedProvenance)) fail('identity_invalid');
  validateFingerprintMap(
    value.event_identity_fingerprints, deps.keyVersions, 'identity_fingerprints_invalid',
  );
  validateFingerprintMap(
    value.request_attempt_fingerprints, deps.keyVersions, 'attempt_fingerprints_invalid',
  );
  const expectedSeed = identitySeed(
    candidate,
    expectedProvenance,
    value.event_identity_fingerprints,
    value.request_attempt_fingerprints,
    deps,
  );
  const expectedRequests = expectedRouteRequests(
    candidate, value.event_identity_fingerprints, expectedSeed, deps,
  );
  const expectedParentBinding = nativeCryptoParentBinding(deps, 'route_identity', {
    identity_seed_sha256: expectedSeed,
    execution_id: value.execution_id,
  });
  validateNativeCryptoLineage(
    value.native_crypto_lineage,
    deps,
    'route_identity',
    expectedParentBinding,
    'route_hmac_requests',
    expectedRequests,
  );
  const core = { ...value };
  delete core.identity_binding_sha256;
  if (value.schema_version !== '1.0' ||
      value.kind !== 'chatwoot_reconciliation_ingress_identity_v1' ||
      value.source !== SOURCE || value.ingress_mode !== 'reconciliation_api_read' ||
      value.identity_seed_sha256 !== expectedSeed ||
      stableJson(value.route_hmac_requests) !== stableJson(expectedRequests) ||
      value.trust_boundary !== NATIVE_CRYPTO_TRUST_BOUNDARY ||
      value.native_crypto_direct_lineage_required !== true ||
      value.cryptographic_verification_performed_in_code !== false ||
      value.signed_webhook_evidence !== null || value.raw_body_evidence !== null ||
      value.customer_egress_allowed !== false ||
      value.identity_binding_sha256 !== digest(deps, IDENTITY_BINDING_DOMAIN, core)) {
    fail('identity_invalid');
  }
  return value;
}

function deterministicDelay(seed, minimum, maximum) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return minimum + (hash % (maximum - minimum + 1));
}

function storageAliases(fingerprints, deps) {
  return deps.retainedEventIdentityKeyVersions.map((keyVersion) => Object.freeze({
    fingerprint: fingerprints[keyVersion],
    key_version: deps.eventToStorageKeyVersions[keyVersion],
  }));
}

function validateProjection(value, deps) {
  exactObject(value, [
    'schema_version', 'kind', 'source', 'request_source', 'source_binding_sha256',
    'ingress_mode', 'candidate_ref', 'candidate_binding_sha256',
    'reconciliation_provenance', 'route_identity',
    'claim_request_replay_command',
    'claim_business_event_command',
    'advance_conversation_generation_control', 'atomic_write_allowed',
    'required_atomic_contract_fields',
    ...TRUST_LABEL_FIELDS,
    'signed_webhook_evidence', 'raw_body_evidence', 'customer_egress_allowed',
    'projection_binding_sha256',
  ], 'durable_projection_invalid');
  const core = { ...value };
  delete core.projection_binding_sha256;
  if (value.schema_version !== '1.0' ||
      value.kind !== 'chatwoot_reconciliation_durable_ingress_projection_v1' ||
      value.source !== SOURCE || value.request_source !== REQUEST_SOURCE ||
      !HEX_64.test(value.source_binding_sha256 || '') ||
      value.ingress_mode !== 'reconciliation_api_read' ||
      value.trust_boundary !== NATIVE_CRYPTO_TRUST_BOUNDARY ||
      value.native_crypto_direct_lineage_required !== true ||
      value.cryptographic_verification_performed_in_code !== false ||
      value.atomic_write_allowed !== false ||
      value.signed_webhook_evidence !== null || value.raw_body_evidence !== null ||
      value.customer_egress_allowed !== false ||
      value.projection_binding_sha256 !== digest(deps, PROJECTION_BINDING_DOMAIN, core)) {
    fail('durable_projection_invalid');
  }
  return value;
}

function buildNativeCryptoDirectLineageGraph(lineage, entryNodeName, finalizerNodeName) {
  exactObject(lineage, NATIVE_CRYPTO_LINEAGE_FIELDS, 'native_crypto_lineage_invalid');
  if (!Array.isArray(lineage.steps) || lineage.steps.length < 1 ||
      typeof entryNodeName !== 'string' || entryNodeName.length < 1 ||
      entryNodeName.length > 160 || typeof finalizerNodeName !== 'string' ||
      finalizerNodeName.length < 1 || finalizerNodeName.length > 160 ||
      entryNodeName === finalizerNodeName) fail('native_crypto_graph_invalid');
  const nodes = [{
    name: entryNodeName,
    role: 'entry',
    node_type: 'n8n-nodes-base.code',
    node_type_version: 2,
    execution_mode: 'runOnceForEachItem',
  }];
  for (const step of lineage.steps) {
    exactObject(step, NATIVE_CRYPTO_STEP_FIELDS, 'native_crypto_lineage_invalid');
    nodes.push({
      name: step.node_name,
      role: 'native_crypto',
      node_type: step.node_type,
      node_type_version: step.node_type_version,
      execution_mode: 'one_input_item_to_one_output_item',
      parameters: {
        action: step.action,
        binaryData: step.binary_data,
        type: step.hash_type,
        dataPropertyName: step.digest_property,
        encoding: step.encoding,
        value: step.value_expression,
      },
      credentials: {
        [step.credential_type]: {
          name: step.credential_placeholder,
          source_only_placeholder: true,
        },
      },
    });
  }
  nodes.push({
    name: finalizerNodeName,
    role: 'finalizer',
    node_type: 'n8n-nodes-base.code',
    node_type_version: 2,
    execution_mode: 'runOnceForEachItem',
  });
  const connections = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    connections.push(Object.freeze({
      from: nodes[index].name,
      to: nodes[index + 1].name,
      output_index: 0,
      input_index: 0,
    }));
  }
  return deepFreeze({
    schema_version: '1.0',
    kind: 'chatwoot_reconciliation_native_crypto_graph_contract_v1',
    trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,
    stage: lineage.stage,
    entry_node_name: entryNodeName,
    finalizer_node_name: finalizerNodeName,
    single_item_required: true,
    direct_lineage_required: true,
    split_allowed: false,
    merge_allowed: false,
    mutable_intermediary_allowed: false,
    finalizer_reads_json_only: true,
    finalizer_execution_mode: 'runOnceForEachItem',
    input_all_allowed: false,
    input_first_allowed: false,
    cryptographic_verification_performed_in_code: false,
    nodes: Object.freeze(nodes.map((node) => deepFreeze(node))),
    connections: Object.freeze(connections),
  });
}

function validateNativeCryptoDirectLineageGraph(
  value, lineage, entryNodeName, finalizerNodeName,
) {
  const expected = buildNativeCryptoDirectLineageGraph(
    lineage, entryNodeName, finalizerNodeName,
  );
  if (stableJson(value) !== stableJson(expected)) fail('native_crypto_graph_invalid');
  const incoming = new Map(expected.nodes.map((node) => [node.name, 0]));
  const outgoing = new Map(expected.nodes.map((node) => [node.name, 0]));
  for (const connection of value.connections) {
    if (!incoming.has(connection.to) || !outgoing.has(connection.from)) {
      fail('native_crypto_graph_invalid');
    }
    incoming.set(connection.to, incoming.get(connection.to) + 1);
    outgoing.set(connection.from, outgoing.get(connection.from) + 1);
  }
  for (const node of value.nodes.filter((entry) => entry.role === 'native_crypto')) {
    if (incoming.get(node.name) !== 1 || outgoing.get(node.name) !== 1 ||
        node.node_type !== NATIVE_CRYPTO_NODE_TYPE ||
        node.execution_mode !== 'one_input_item_to_one_output_item') {
      fail('native_crypto_graph_invalid');
    }
  }
  if (incoming.get(finalizerNodeName) !== 1 || outgoing.get(finalizerNodeName) !== 0 ||
      incoming.get(entryNodeName) !== 0 || outgoing.get(entryNodeName) !== 1) {
    fail('native_crypto_graph_invalid');
  }
  return value;
}

function createChatwootReconciliationIngressBridge(injectedDependencies) {
  const deps = dependencies(injectedDependencies);

  function prepareCandidateIdentity(input) {
    exactObject(input, [
      'messages_page', 'candidate', 'reconciliation_context', 'execution_id',
    ], 'prepare_candidate_input_invalid');
    if (typeof input.execution_id !== 'string' || !EXECUTION_ID.test(input.execution_id)) {
      fail('execution_id_invalid');
    }
    const membership = validateCandidateMembership(
      input.messages_page, input.candidate, deps,
    );
    const candidate = membership.candidate;
    const provenance = sourceProvenance(
      candidate, membership.page, input.reconciliation_context, deps,
    );
    const requests = expectedInitialRequests(candidate, provenance, deps);
    const lineageParent = nativeCryptoParentBinding(deps, 'candidate_identity', {
      candidate_binding_sha256: candidate.candidate_binding_sha256,
      source_binding_sha256: provenance.source_binding_sha256,
      execution_id: input.execution_id,
    });
    const core = {
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_ingress_identity_plan_v1',
      source: SOURCE,
      ingress_mode: 'reconciliation_api_read',
      execution_id: input.execution_id,
      candidate,
      provenance,
      hmac_requests: requests,
      native_crypto_lineage: buildNativeCryptoLineage(
        deps, 'candidate_identity', lineageParent, 'hmac_requests', requests,
      ),
      trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,
      native_crypto_direct_lineage_required: true,
      cryptographic_verification_performed_in_code: false,
      signed_webhook_evidence: null,
      raw_body_evidence: null,
      customer_egress_allowed: false,
    };
    return deepFreeze({
      ...core,
      plan_binding_sha256: digest(deps, IDENTITY_PLAN_BINDING_DOMAIN, core),
    });
  }

  function finalizeCandidateIdentity(nativeCryptoChainOutput) {
    const chain = nativeCryptoOutput(
      nativeCryptoChainOutput,
      PLAN_FIELDS,
      (value) => validatePlan(value, deps),
      'identity_native_crypto_output_invalid',
    );
    const plan = chain.base;
    const results = chain.results;
    const eventFingerprints = {};
    const attemptFingerprints = {};
    for (const keyVersion of deps.keyVersions) {
      eventFingerprints[keyVersion] = results.get('event_identity:' + keyVersion);
      attemptFingerprints[keyVersion] =
        results.get('reconciliation_request_attempt:' + keyVersion);
    }
    const seed = identitySeed(
      plan.candidate, plan.provenance, eventFingerprints, attemptFingerprints, deps,
    );
    const routeRequests = expectedRouteRequests(
      plan.candidate, eventFingerprints, seed, deps,
    );
    const lineageParent = nativeCryptoParentBinding(deps, 'route_identity', {
      identity_seed_sha256: seed,
      execution_id: plan.execution_id,
    });
    const core = {
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_ingress_identity_v1',
      source: SOURCE,
      ingress_mode: 'reconciliation_api_read',
      execution_id: plan.execution_id,
      candidate: plan.candidate,
      provenance: plan.provenance,
      event_identity_fingerprints: Object.freeze(eventFingerprints),
      request_attempt_fingerprints: Object.freeze(attemptFingerprints),
      identity_seed_sha256: seed,
      route_hmac_requests: routeRequests,
      native_crypto_lineage: buildNativeCryptoLineage(
        deps, 'route_identity', lineageParent, 'route_hmac_requests', routeRequests,
      ),
      trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,
      native_crypto_direct_lineage_required: true,
      cryptographic_verification_performed_in_code: false,
      signed_webhook_evidence: null,
      raw_body_evidence: null,
      customer_egress_allowed: false,
    };
    return deepFreeze({
      ...core,
      identity_binding_sha256: digest(deps, IDENTITY_BINDING_DOMAIN, core),
    });
  }

  function finalizeRouteAndProjectAtomicClaims(nativeCryptoChainOutput) {
    const chain = nativeCryptoOutput(
      nativeCryptoChainOutput,
      IDENTITY_FIELDS,
      (value) => validateIdentity(value, deps),
      'route_native_crypto_output_invalid',
    );
    const identity = chain.base;
    const results = chain.results;
    const eventFingerprints = identity.event_identity_fingerprints;
    const provenance = identity.provenance;
    const attemptFingerprints = identity.request_attempt_fingerprints;
    const messageFingerprints = {};
    const conversationFingerprints = {};
    for (const keyVersion of deps.keyVersions) {
      messageFingerprints[keyVersion] = results.get('message_anchor:' + keyVersion);
      conversationFingerprints[keyVersion] = results.get('conversation:' + keyVersion);
    }
    const candidate = identity.candidate;
    const activeVersion = deps.activeEventIdentityKeyVersion;
    const activeStorageVersion = deps.eventToStorageKeyVersions[activeVersion];
    const delayRange = DELAY_RANGES[candidate.channel];
    const delaySeed = [
      BRAND_ID,
      candidate.account_id,
      candidate.inbox_id,
      candidate.conversation_id,
      candidate.message_id,
    ].join(':');
    const delaySeconds = deterministicDelay(
      delaySeed, delayRange.minimum, delayRange.maximum,
    );
    const eventAtMilliseconds = Date.parse(candidate.event_at);
    const notBefore = new Date(eventAtMilliseconds + delaySeconds * 1000).toISOString();
    const correlationId =
      'calapres:' + candidate.conversation_id + ':' + candidate.message_id;
    const routeCore = {
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_route_identity_v1',
      source: SOURCE,
      request_source: REQUEST_SOURCE,
      source_binding_sha256: provenance.source_binding_sha256,
      ingress_mode: 'reconciliation_api_read',
      candidate_ref: candidate.candidate_ref,
      candidate_binding_sha256: candidate.candidate_binding_sha256,
      brand_id: BRAND_ID,
      account_id: candidate.account_id,
      inbox_id: candidate.inbox_id,
      channel: candidate.channel,
      conversation_id: candidate.conversation_id,
      message_id: candidate.message_id,
      event_at: candidate.event_at,
      content_state: candidate.content_state,
      attachment_count: candidate.attachment_count,
      correlation_id: correlationId,
      active_key_version: activeVersion,
      retained_key_versions: Object.freeze([...deps.retainedEventIdentityKeyVersions]),
      storage_key_versions: Object.freeze({
        active: activeStorageVersion,
        retained: Object.freeze(deps.retainedEventIdentityKeyVersions.map((keyVersion) =>
          Object.freeze({
            event_key_version: keyVersion,
            storage_key_version: deps.eventToStorageKeyVersions[keyVersion],
          }))),
      }),
      event_identity_fingerprints: Object.freeze(eventFingerprints),
      request_attempt_fingerprints: Object.freeze(attemptFingerprints),
      message_fingerprints: Object.freeze(messageFingerprints),
      conversation_fingerprints: Object.freeze(conversationFingerprints),
      request_attempt_key_fingerprint: attemptFingerprints[activeVersion],
      delay_policy_version: DELAY_POLICY_VERSION,
      delay_seconds: delaySeconds,
      not_before: notBefore,
      live_reread_required: true,
      signed_webhook_evidence: null,
      raw_body_evidence: null,
      customer_egress_allowed: false,
    };
    const route = deepFreeze({
      ...routeCore,
      route_binding_sha256: digest(deps, ROUTE_BINDING_DOMAIN, routeCore),
    });
    const leaseOwnerId = 'edge_reconciliation_' + identity.execution_id;
    const requestLeaseToken = 'request_recon_' + digest(deps, REQUEST_LEASE_TOKEN_DOMAIN, {
      execution_id: identity.execution_id,
      candidate_ref: candidate.candidate_ref,
      request_attempt_fingerprint: attemptFingerprints[activeVersion],
    }).slice(0, 48);
    const businessLeaseToken = 'business_recon_' + digest(deps, BUSINESS_LEASE_TOKEN_DOMAIN, {
      execution_id: identity.execution_id,
      candidate_ref: candidate.candidate_ref,
      event_identity_fingerprint: eventFingerprints[activeVersion],
    }).slice(0, 48);
    const requestCommand = Object.freeze({
      brand_id: BRAND_ID,
      claim_id: 'req_recon_' + attemptFingerprints[activeVersion],
      active_fingerprint: attemptFingerprints[activeVersion],
      active_key_version: activeStorageVersion,
      retained_fingerprints: Object.freeze(storageAliases(attemptFingerprints, deps)),
      key_registry_version: deps.keyRegistryVersion,
      request_source: REQUEST_SOURCE,
      source_binding_sha256: provenance.source_binding_sha256,
      request_ttl_seconds: deps.requestTtlSeconds,
      lease_owner_id: leaseOwnerId,
      lease_token: requestLeaseToken,
      lease_duration_seconds: deps.leaseDurationSeconds,
    });
    const businessCommand = Object.freeze({
      brand_id: BRAND_ID,
      claim_id: 'bev_claim_' + eventFingerprints[activeVersion],
      active_fingerprint: eventFingerprints[activeVersion],
      active_key_version: activeStorageVersion,
      retained_fingerprints: Object.freeze(storageAliases(eventFingerprints, deps)),
      key_registry_version: deps.keyRegistryVersion,
      event_retention_seconds: deps.eventRetentionSeconds,
      lease_owner_id: leaseOwnerId,
      lease_token: businessLeaseToken,
      lease_duration_seconds: deps.leaseDurationSeconds,
    });
    const advanceControl = Object.freeze({
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_advance_generation_control_v1',
      operation: 'advance_conversation_generation',
      ready_for_atomic_call: false,
      request_source: REQUEST_SOURCE,
      source_binding_sha256: provenance.source_binding_sha256,
      reconciliation_scan_id: provenance.scan_id,
      reconciliation_scan_lease_token: provenance.scan_lease_token,
      reconciliation_expected_after_message_id: provenance.expected_after_message_id,
      reconciliation_page_binding_sha256: provenance.page_binding_sha256,
      brand_id: BRAND_ID,
      account_id: candidate.account_id,
      inbox_id: candidate.inbox_id,
      channel: candidate.channel,
      conversation_id: candidate.conversation_id,
      anchor_message_id: candidate.message_id,
      correlation_id: correlationId,
      proposed_job_id: 'job_' + messageFingerprints[activeVersion],
      event_identity_key_version: activeVersion,
      event_identity_fingerprint: eventFingerprints[activeVersion],
      conversation_fingerprint: conversationFingerprints[activeVersion],
      message_fingerprint: messageFingerprints[activeVersion],
      active_key_version: activeStorageVersion,
      retained_message_fingerprints: Object.freeze(storageAliases(messageFingerprints, deps)),
      key_registry_version: deps.keyRegistryVersion,
      baseline_fingerprint_key_version: deps.baselineFingerprintKeyVersion,
      delay_policy_version: DELAY_POLICY_VERSION,
      knowledge_version: deps.knowledgeVersion,
      delay_seconds: delaySeconds,
      retention_seconds: deps.retentionSeconds,
      required_authoritative_inputs: Object.freeze([
        'request_processing_lease_result',
        'business_prepared_or_completed_result',
        'baseline_status_fingerprint',
        'baseline_assignee_fingerprint',
      ]),
      customer_egress_allowed: false,
    });
    const core = {
      schema_version: '1.0',
      kind: 'chatwoot_reconciliation_durable_ingress_projection_v1',
      source: SOURCE,
      request_source: REQUEST_SOURCE,
      source_binding_sha256: provenance.source_binding_sha256,
      ingress_mode: 'reconciliation_api_read',
      candidate_ref: candidate.candidate_ref,
      candidate_binding_sha256: candidate.candidate_binding_sha256,
      reconciliation_provenance: provenance,
      route_identity: route,
      claim_request_replay_command: requestCommand,
      claim_business_event_command: businessCommand,
      advance_conversation_generation_control: advanceControl,
      atomic_write_allowed: false,
      required_atomic_contract_fields: Object.freeze([
        'claim_request_replay.request_source',
        'claim_request_replay.source_binding_sha256',
        'advance_conversation_generation.request_source',
        'advance_conversation_generation.source_binding_sha256',
        'advance_conversation_generation.reconciliation_scan_id',
        'advance_conversation_generation.reconciliation_scan_lease_token',
        'advance_conversation_generation.reconciliation_expected_after_message_id',
        'advance_conversation_generation.reconciliation_page_binding_sha256',
      ]),
      trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,
      native_crypto_direct_lineage_required: true,
      cryptographic_verification_performed_in_code: false,
      signed_webhook_evidence: null,
      raw_body_evidence: null,
      customer_egress_allowed: false,
    };
    return deepFreeze({
      ...core,
      projection_binding_sha256: digest(deps, PROJECTION_BINDING_DOMAIN, core),
    });
  }

  return Object.freeze({
    prepareCandidateIdentity,
    finalizeCandidateIdentity,
    finalizeRouteAndProjectAtomicClaims,
    validateDurableIngressProjection: (value) => validateProjection(value, deps),
    buildNativeCryptoDirectLineageGraph: (lineage, entryNodeName, finalizerNodeName) =>
      buildNativeCryptoDirectLineageGraph(lineage, entryNodeName, finalizerNodeName),
    validateNativeCryptoDirectLineageGraph: (
      value, lineage, entryNodeName, finalizerNodeName,
    ) => validateNativeCryptoDirectLineageGraph(
      value, lineage, entryNodeName, finalizerNodeName,
    ),
  });
}

module.exports = Object.freeze({
  BRAND_ID,
  ACCOUNT_ID,
  SOURCE,
  REQUEST_SOURCE,
  CANONICAL_TUPLE_FORMAT,
  INBOX_CHANNELS,
  DELAY_POLICY_VERSION,
  REQUEST_ATTEMPT_IDENTITY_DOMAIN,
  SOURCE_BINDING_DOMAIN,
  MESSAGE_FINGERPRINT_DOMAIN,
  CONVERSATION_FINGERPRINT_DOMAIN,
  NATIVE_CRYPTO_TRUST_BOUNDARY,
  NATIVE_CRYPTO_NODE_TYPE,
  NATIVE_CRYPTO_NODE_TYPE_VERSION,
  ReconciliationIngressBridgeError,
  stableJson,
  createChatwootReconciliationIngressBridge,
});
