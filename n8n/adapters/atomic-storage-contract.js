'use strict';

const OPERATIONS = Object.freeze([
  'claim_request_replay',
  'claim_business_event',
  'complete_business_event',
  'advance_conversation_generation',
  'read_generation',
  'schedule_conversation_retry',
  'claim_due_conversation_retry',
  'transition_conversation_job',
  'prepare_owner_review',
  'compare_and_commit_owner_decision',
  'claim_chatwoot_reconciliation_scan',
  'compare_and_advance_chatwoot_message_cursor',
  'read_chatwoot_reconciliation_cursor',
]);

const OWNER_OPERATIONS = Object.freeze([
  'prepare_owner_review',
  'compare_and_commit_owner_decision',
]);

const EDGE_OPERATIONS = Object.freeze(
  OPERATIONS.filter((operation) => !OWNER_OPERATIONS.includes(operation)),
);

const CONTRACT_STATUSES = Object.freeze([
  'committed',
  'duplicate_or_conflict',
  'unknown',
]);

const HEX_64 = /^[a-f0-9]{64}$/;
const KEY_VERSION = /^hmac-sha256-v[1-9][0-9]*$/;
const KEY_REGISTRY_VERSION = /^calapres-storage-keys-v[1-9][0-9]*$/;
const BRAND_ID = /^[a-z][a-z0-9_-]{1,63}$/;
const OPAQUE_ID = /^[A-Za-z0-9:_-]{4,160}$/;
const CONVERSATION_ID = /^[1-9][0-9]{0,30}$/;
const MESSAGE_ID = /^[1-9][0-9]{0,15}$/;
const KNOWLEDGE_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;
const EVENT_IDENTITY_KEY_VERSION = /^calapres-identity-hmac-v[1-9][0-9]*$/;
const BASELINE_FINGERPRINT_KEY_VERSION = /^calapres-hmac-v[1-9][0-9]*$/;
const OWNER_ACTIONS = Object.freeze(['reply_only', 'approve', 'approve_until', 'correct']);
const OBSERVATION_OUTCOMES = Object.freeze([
  'observation_only',
  'routine_candidate',
  'owner_escalation',
  'fail_closed',
]);
const RISK_LEVELS = Object.freeze(['none', 'low', 'medium', 'high', 'critical']);
const PILOT_BRAND_ID = 'calapres';
const PILOT_ACCOUNT_ID = 179973;
const PILOT_INBOX_CHANNELS = Object.freeze({
  128031: 'instagram',
  128033: 'tiktok',
  128058: 'whatsapp',
  128326: 'email',
});
const RECONCILIATION_SCHEMA_VERSION = '1.0';
const RECONCILIATION_SOURCE = 'chatwoot_reconciliation_v1';
const RECONCILIATION_ACTIVATION_FLOOR_AT = '2026-08-12T00:00:00.000Z';
const RECONCILIATION_ACTIVATION_POLICY_VERSION = '2026-08-12-v1';
const RECONCILIATION_SCAN_ID = /^cwrs_[a-f0-9]{24}$/;
const RECONCILIATION_BUSINESS_CLAIM_ID = /^bev_claim_[A-Za-z0-9_-]{4,120}$/;
const RECONCILIATION_JOB_ID = /^job_[A-Za-z0-9_-]{4,120}$/;
const RECONCILIATION_DURABLE_OUTCOMES = Object.freeze([
  'durable_bound',
  'durable_duplicate',
]);
const RECONCILIATION_EXCLUSION_REASONS = Object.freeze([
  'before_activation_floor',
  'private_message',
  'outgoing_message',
  'activity_message',
  'template_message',
  'bot_echo',
]);
const RECONCILIATION_SENDER_TYPES = Object.freeze([
  'contact',
  'user',
  'agent',
  'agent_bot',
  'bot',
  null,
]);
const REQUEST_SOURCES = Object.freeze([
  'chatwoot_signed_webhook_v1',
  'chatwoot_reconciliation_api_v1',
]);
const RFC3339_UTC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;
const JOB_STATES = Object.freeze([
  'pending',
  'retry_scheduled',
  'retry_running',
  'completed',
  'cancelled',
  'human_owned',
]);
const PROHIBITED_DURABLE_KEYS = new Set([
  'address',
  'attachment',
  'email',
  'message_body',
  'model_draft',
  'payment_data',
  'phone',
  'prompt',
  'raw_message',
  'reconciliation_scan_lease_token',
  'secret',
  'shopify_payload',
  'transcript',
]);

const JOB_CONTROL_FIELDS = Object.freeze([
  'account_id',
  'inbox_id',
  'channel',
  'conversation_id',
  'anchor_message_id',
  'correlation_id',
  'event_identity_key_version',
  'event_identity_fingerprint',
  'conversation_fingerprint',
  'message_fingerprint',
  'baseline_fingerprint_key_version',
  'baseline_status_fingerprint',
  'baseline_assignee_fingerprint',
  'delay_policy_version',
  'delay_seconds',
  'knowledge_version',
]);

const REQUEST_PROVENANCE_FIELDS = Object.freeze([
  'request_source',
  'source_binding_sha256',
]);

const RECONCILIATION_INGRESS_COMMAND_FIELDS = Object.freeze([
  'reconciliation_scan_id',
  'reconciliation_scan_lease_token',
  'reconciliation_expected_after_message_id',
  'reconciliation_page_binding_sha256',
]);

const RECONCILIATION_DURABLE_PROVENANCE_FIELDS = Object.freeze([
  'reconciliation_scan_id',
  'reconciliation_expected_after_message_id',
  'reconciliation_page_binding_sha256',
]);

const DURABLE_JOB_BINDING_FIELDS = Object.freeze([
  ...JOB_CONTROL_FIELDS,
  ...REQUEST_PROVENANCE_FIELDS,
  ...RECONCILIATION_DURABLE_PROVENANCE_FIELDS,
  'request_claim_id',
  'business_claim_id',
  'job_id',
  'generation',
  'due_at',
  'state',
]);

const REQUEST_PROCESSING_RESULT_FIELDS = Object.freeze([
  'claim_id',
  'lifecycle_status',
  'claimed_at',
  'expires_at',
  'lease_expires_at',
  'attempt_count',
  ...REQUEST_PROVENANCE_FIELDS,
]);

const REQUEST_RETRY_RESULT_FIELDS = Object.freeze([
  'claim_id',
  'retry_after_at',
  ...REQUEST_PROVENANCE_FIELDS,
]);

const REQUEST_COMPLETED_RESULT_FIELDS = Object.freeze([
  ...REQUEST_PROCESSING_RESULT_FIELDS,
  'business_claim_id',
  'job_id',
  'generation',
  'due_at',
  ...JOB_CONTROL_FIELDS,
]);

const COMPLETED_BUSINESS_JOB_FIELDS = Object.freeze([
  ...JOB_CONTROL_FIELDS,
  'claim_id',
  'lifecycle_status',
  'job_id',
  'generation',
  'due_at',
  'state',
  'observation_id',
  'audit_id',
]);

const RECONCILIATION_SCAN_LEASE_FIELDS = Object.freeze([
  'account_id',
  'inbox_id',
  'channel',
  'scan_id',
  'lease_owner_id',
  'lease_token',
  'lease_claimed_at',
  'lease_expires_at',
  'lease_duration_seconds',
  'attempt_count',
  'max_pages',
  'activation_floor_at',
  'activation_policy_version',
]);

const RECONCILIATION_PROOF_ROW_FIELDS = Object.freeze([
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

const RECONCILIATION_CURSOR_RESULT_FIELDS = Object.freeze([
  'account_id',
  'inbox_id',
  'channel',
  'conversation_id',
  'scan_id',
  'expected_after_message_id',
  'new_after_message_id',
  'page_binding_sha256',
  'outcome_digest',
  'row_count',
  'advanced_at',
  'activation_floor_at',
  'activation_policy_version',
]);

const RECONCILIATION_CURSOR_READ_FIELDS = Object.freeze([
  'account_id',
  'inbox_id',
  'channel',
  'conversation_id',
  'scan_id',
  'current_after_message_id',
  'activation_floor_at',
  'activation_policy_version',
]);

const CLAIM_IDENTITY_FIELDS = Object.freeze([
  'brand_id',
  'claim_id',
  'active_fingerprint',
  'active_key_version',
  'retained_fingerprints',
  'key_registry_version',
]);

const COMMAND_FIELDS = Object.freeze({
  claim_request_replay: Object.freeze([
    ...CLAIM_IDENTITY_FIELDS,
    ...REQUEST_PROVENANCE_FIELDS,
    'request_ttl_seconds',
    'lease_owner_id',
    'lease_token',
    'lease_duration_seconds',
  ]),
  claim_business_event: Object.freeze([
    ...CLAIM_IDENTITY_FIELDS,
    'event_retention_seconds',
    'lease_owner_id',
    'lease_token',
    'lease_duration_seconds',
  ]),
  complete_business_event: Object.freeze([
    'brand_id',
    'claim_id',
    'job_id',
    'conversation_id',
    'expected_generation',
    'worker_id',
    'lease_token',
    'observation_id',
    'observation_digest',
    'audit_id',
    'outcome_class',
    'reason_code',
    'risk_level',
    'risk_digest',
    'incident_id',
  ]),
  advance_conversation_generation: Object.freeze([
    'brand_id',
    'request_claim_id',
    'request_lease_owner_id',
    'request_lease_token',
    'business_claim_id',
    'business_lease_owner_id',
    'business_lease_token',
    ...REQUEST_PROVENANCE_FIELDS,
    ...RECONCILIATION_INGRESS_COMMAND_FIELDS,
    'account_id',
    'inbox_id',
    'channel',
    'conversation_id',
    'anchor_message_id',
    'correlation_id',
    'job_id',
    'event_identity_key_version',
    'event_identity_fingerprint',
    'conversation_fingerprint',
    'message_fingerprint',
    'active_key_version',
    'retained_message_fingerprints',
    'key_registry_version',
    'baseline_fingerprint_key_version',
    'baseline_status_fingerprint',
    'baseline_assignee_fingerprint',
    'delay_policy_version',
    'knowledge_version',
    'delay_seconds',
    'retention_seconds',
  ]),
  read_generation: Object.freeze([
    'brand_id',
    'conversation_id',
    'expected_generation',
  ]),
  schedule_conversation_retry: Object.freeze([
    'brand_id',
    'job_id',
    'conversation_id',
    'expected_generation',
    'retry_idempotency_key',
    'max_attempts',
    'safe_error_code',
    'delay_seconds',
    'retention_seconds',
    'expected_worker_id',
    'expected_lease_token',
  ]),
  claim_due_conversation_retry: Object.freeze([
    'brand_id',
    'worker_id',
    'lease_token',
    'lease_duration_seconds',
  ]),
  transition_conversation_job: Object.freeze([
    'brand_id',
    'job_id',
    'conversation_id',
    'expected_generation',
    'from_state',
    'to_state',
    'transition_idempotency_key',
  ]),
  prepare_owner_review: Object.freeze([
    'brand_id',
    'preparation_id',
    'incident_id',
    'expected_incident_revision',
    'source_observation_id',
    'source_observation_digest',
    'review_snapshot_digest',
    'decision_options',
    'nonce_fingerprint',
    'nonce_key_version',
    'nonce_ttl_seconds',
  ]),
  compare_and_commit_owner_decision: Object.freeze([
    'brand_id',
    'decision_id',
    'approval_id',
    'audit_id',
    'incident_id',
    'expected_incident_revision',
    'action',
    'command_digest',
    'case_reply_sha256',
    'knowledge_proposal_sha256',
    'base_knowledge_version',
    'knowledge_version_to_publish',
    'supersedes_knowledge_version',
    'nonce_fingerprint',
    'nonce_key_version',
  ]),
  claim_chatwoot_reconciliation_scan: Object.freeze([
    'schema_version',
    'kind',
    'operation',
    'source',
    'brand_id',
    'account_id',
    'inbox_id',
    'channel',
    'scan_id',
    'lease_owner_id',
    'lease_token',
    'lease_duration_seconds',
    'max_pages',
    'activation_floor_at',
    'activation_policy_version',
    'customer_egress_allowed',
  ]),
  compare_and_advance_chatwoot_message_cursor: Object.freeze([
    'schema_version',
    'kind',
    'operation',
    'source',
    'brand_id',
    'account_id',
    'inbox_id',
    'channel',
    'conversation_id',
    'scan_id',
    'lease_token',
    'expected_after_message_id',
    'new_after_message_id',
    'proof_rows',
    'page_binding_sha256',
    'outcome_digest',
    'row_count',
    'activation_floor_at',
    'activation_policy_version',
    'customer_egress_allowed',
  ]),
  read_chatwoot_reconciliation_cursor: Object.freeze([
    'schema_version',
    'kind',
    'operation',
    'source',
    'brand_id',
    'account_id',
    'inbox_id',
    'channel',
    'conversation_id',
    'scan_id',
    'lease_token',
    'activation_floor_at',
    'activation_policy_version',
    'customer_egress_allowed',
  ]),
});

class AtomicStorageUnknownError extends Error {
  constructor(code) {
    super(code);
    this.name = 'AtomicStorageUnknownError';
    this.code = code;
  }
}

function fail(message) {
  throw new TypeError(message);
}

function assertExactObject(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} must contain exactly: ${expected.join(', ')}`);
  }
}

function assertString(value, pattern, label) {
  if (typeof value !== 'string' || !pattern.test(value)) fail(`${label} is invalid`);
}

function timestamp(value, label) {
  if (typeof value !== 'string' || !RFC3339_UTC.test(value)) {
    fail(`${label} must be canonical RFC3339 UTC`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail(`${label} must be canonical RFC3339 UTC`);
  }
  return parsed;
}

function assertNullable(value, validator, label) {
  if (value !== null) validator(value, label);
}

function assertFingerprintAliases(activeFingerprint, activeKeyVersion, retained, label) {
  assertString(activeFingerprint, HEX_64, `${label}.active_fingerprint`);
  assertString(activeKeyVersion, KEY_VERSION, `${label}.active_key_version`);
  if (!Array.isArray(retained) || retained.length > 8) {
    fail(`${label}.retained_fingerprints must be an array with at most 8 entries`);
  }
  const seenPairs = new Set([`${activeKeyVersion}:${activeFingerprint}`]);
  const versions = new Set([activeKeyVersion]);
  for (const [index, item] of retained.entries()) {
    assertExactObject(item, ['fingerprint', 'key_version'], `${label}.retained_fingerprints[${index}]`);
    assertString(item.fingerprint, HEX_64, `${label}.retained_fingerprints[${index}].fingerprint`);
    assertString(item.key_version, KEY_VERSION, `${label}.retained_fingerprints[${index}].key_version`);
    const pair = `${item.key_version}:${item.fingerprint}`;
    if (seenPairs.has(pair) || versions.has(item.key_version)) {
      fail(`${label}.retained_fingerprints must use distinct key versions and values`);
    }
    seenPairs.add(pair);
    versions.add(item.key_version);
  }
  return [...versions].sort();
}

function assertIntegerBetween(value, minimum, maximum, label) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    fail(`${label} must be between ${minimum} and ${maximum}`);
  }
}

function validateRequestProvenance(value, label, reconciliationBinding = 'none') {
  if (!REQUEST_SOURCES.includes(value.request_source)) {
    fail(`${label}.request_source is invalid`);
  }
  assertString(value.source_binding_sha256, HEX_64, `${label}.source_binding_sha256`);
  if (reconciliationBinding === 'none') return;

  const fields = reconciliationBinding === 'command'
    ? RECONCILIATION_INGRESS_COMMAND_FIELDS
    : RECONCILIATION_DURABLE_PROVENANCE_FIELDS;
  const reconciliationValues = fields.map((field) => value[field]);
  if (value.request_source === 'chatwoot_signed_webhook_v1') {
    if (reconciliationValues.some((item) => item !== null)) {
      fail(`${label} webhook source must not carry reconciliation binding`);
    }
    return;
  }
  assertString(value.reconciliation_scan_id, RECONCILIATION_SCAN_ID,
    `${label}.reconciliation_scan_id`);
  if (reconciliationBinding === 'command') {
    assertString(value.reconciliation_scan_lease_token, OPAQUE_ID,
      `${label}.reconciliation_scan_lease_token`);
  }
  assertString(value.reconciliation_page_binding_sha256, HEX_64,
    `${label}.reconciliation_page_binding_sha256`);
  assertIntegerBetween(
    value.reconciliation_expected_after_message_id,
    0,
    Number.MAX_SAFE_INTEGER,
    `${label}.reconciliation_expected_after_message_id`,
  );
  if (!Number.isSafeInteger(Number(value.conversation_id)) ||
      !Number.isSafeInteger(Number(value.anchor_message_id)) ||
      Number(value.conversation_id) < 1 ||
      Number(value.anchor_message_id) <= value.reconciliation_expected_after_message_id) {
    fail(`${label} reconciliation route exceeds the safe cursor domain`);
  }
}

function validateReconciliationCommandBase(command, operation, kind) {
  if (command.schema_version !== RECONCILIATION_SCHEMA_VERSION ||
      command.kind !== kind || command.operation !== operation ||
      command.source !== RECONCILIATION_SOURCE ||
      command.account_id !== PILOT_ACCOUNT_ID ||
      !Number.isInteger(command.inbox_id) ||
      PILOT_INBOX_CHANNELS[command.inbox_id] !== command.channel ||
      command.activation_floor_at !== RECONCILIATION_ACTIVATION_FLOOR_AT ||
      command.activation_policy_version !== RECONCILIATION_ACTIVATION_POLICY_VERSION ||
      command.customer_egress_allowed !== false) {
    fail(`${operation} trusted reconciliation binding is invalid`);
  }
}

function reconciliationExclusionReason(proof) {
  if (proof.created_at * 1000 < Date.parse(RECONCILIATION_ACTIVATION_FLOOR_AT)) {
    return 'before_activation_floor';
  }
  if (proof.private === true) return 'private_message';
  if (proof.message_type === 1) return 'outgoing_message';
  if (proof.message_type === 2) return 'activity_message';
  if (proof.message_type === 3) return 'template_message';
  if (proof.sender_type === 'agent_bot' || proof.sender_type === 'bot') return 'bot_echo';
  return null;
}

function validateReconciliationProofRows(command, operation) {
  if (!Array.isArray(command.proof_rows) || command.proof_rows.length < 1 ||
      command.proof_rows.length > 99 || command.row_count !== command.proof_rows.length) {
    fail(`${operation}.proof_rows count is invalid`);
  }
  let previousMessageId = 0;
  for (const [index, proof] of command.proof_rows.entries()) {
    assertExactObject(proof, RECONCILIATION_PROOF_ROW_FIELDS,
      `${operation}.proof_rows[${index}]`);
    assertString(proof.message_id, MESSAGE_ID, `${operation}.proof_rows[${index}].message_id`);
    const messageId = Number(proof.message_id);
    if (!Number.isSafeInteger(messageId) || messageId <= previousMessageId ||
        messageId <= command.expected_after_message_id || messageId > command.new_after_message_id) {
      fail(`${operation}.proof_rows must be strictly ordered inside the cursor interval`);
    }
    previousMessageId = messageId;
    if (proof.classification === 'event_candidate') {
      if (!RECONCILIATION_DURABLE_OUTCOMES.includes(proof.outcome) ||
          proof.reason_code !== null || proof.created_at !== null ||
          proof.message_type !== null || proof.private !== null || proof.sender_type !== null) {
        fail(`${operation}.proof_rows[${index}] candidate shape is invalid`);
      }
      assertString(proof.event_identity_key_version, EVENT_IDENTITY_KEY_VERSION,
        `${operation}.proof_rows[${index}].event_identity_key_version`);
      assertString(proof.event_identity_fingerprint, HEX_64,
        `${operation}.proof_rows[${index}].event_identity_fingerprint`);
      assertString(proof.business_claim_id, RECONCILIATION_BUSINESS_CLAIM_ID,
        `${operation}.proof_rows[${index}].business_claim_id`);
      assertString(proof.job_id, RECONCILIATION_JOB_ID,
        `${operation}.proof_rows[${index}].job_id`);
      assertIntegerBetween(proof.generation, 1, 2147483647,
        `${operation}.proof_rows[${index}].generation`);
    } else if (proof.classification === 'deterministically_excluded') {
      if (proof.outcome !== 'deterministically_excluded' ||
          !RECONCILIATION_EXCLUSION_REASONS.includes(proof.reason_code) ||
          !Number.isSafeInteger(proof.created_at) || proof.created_at < 0 ||
          proof.created_at > 253402300799 ||
          !Number.isInteger(proof.message_type) || proof.message_type < 0 ||
          proof.message_type > 3 || typeof proof.private !== 'boolean' ||
          !RECONCILIATION_SENDER_TYPES.includes(proof.sender_type) ||
          proof.event_identity_key_version !== null ||
          proof.event_identity_fingerprint !== null || proof.business_claim_id !== null ||
          proof.job_id !== null || proof.generation !== null ||
          reconciliationExclusionReason(proof) !== proof.reason_code) {
        fail(`${operation}.proof_rows[${index}] exclusion proof is invalid`);
      }
    } else {
      fail(`${operation}.proof_rows[${index}] classification is invalid`);
    }
  }
  if (previousMessageId !== command.new_after_message_id) {
    fail(`${operation}.new_after_message_id must equal the final proof row`);
  }
}

function validateOwnerDecisionShape(command, label = 'compare_and_commit_owner_decision') {
  if (!OWNER_ACTIONS.includes(command.action)) fail('owner action is invalid');
  for (const field of [
    'command_digest',
    'case_reply_sha256',
  ]) {
    assertString(command[field], HEX_64, `${label}.${field}`);
  }
  assertNullable(
    command.knowledge_proposal_sha256,
    (value, label) => assertString(value, HEX_64, label),
    `${label}.knowledge_proposal_sha256`,
  );
  for (const field of [
    'base_knowledge_version',
    'knowledge_version_to_publish',
    'supersedes_knowledge_version',
  ]) {
    assertNullable(
      command[field],
      (value, label) => assertString(value, KNOWLEDGE_VERSION, label),
      `${label}.${field}`,
    );
  }
  const knowledgeFields = [
    command.knowledge_proposal_sha256,
    command.base_knowledge_version,
    command.knowledge_version_to_publish,
  ];
  if (command.action === 'reply_only') {
    if (knowledgeFields.some((value) => value !== null) || command.supersedes_knowledge_version !== null) {
      fail('reply_only must not carry knowledge proposal metadata');
    }
  } else {
    if (knowledgeFields.some((value) => value === null)) {
      fail(`${command.action} requires proposal, base, and target knowledge metadata`);
    }
    if (command.action === 'correct' && command.supersedes_knowledge_version === null) {
      fail('correct requires supersedes_knowledge_version');
    }
    if (command.action !== 'correct' && command.supersedes_knowledge_version !== null) {
      fail(`${command.action} must not set supersedes_knowledge_version`);
    }
  }
}

function validateCommand(operation, command) {
  if (!OPERATIONS.includes(operation)) fail(`unsupported atomic operation: ${operation}`);
  assertExactObject(command, COMMAND_FIELDS[operation], operation);
  assertString(command.brand_id, BRAND_ID, `${operation}.brand_id`);
  if (command.brand_id !== PILOT_BRAND_ID) fail(`${operation}.brand_id is not the pilot brand`);

  if (operation === 'claim_request_replay' || operation === 'claim_business_event') {
    assertString(command.claim_id, OPAQUE_ID, `${operation}.claim_id`);
    assertFingerprintAliases(
      command.active_fingerprint,
      command.active_key_version,
      command.retained_fingerprints,
      operation,
    );
    assertString(
      command.key_registry_version,
      KEY_REGISTRY_VERSION,
      `${operation}.key_registry_version`,
    );
    assertString(command.lease_owner_id, OPAQUE_ID, `${operation}.lease_owner_id`);
    assertString(command.lease_token, OPAQUE_ID, `${operation}.lease_token`);
    assertIntegerBetween(
      command.lease_duration_seconds,
      1,
      900,
      `${operation}.lease_duration_seconds`,
    );
    if (operation === 'claim_request_replay') {
      validateRequestProvenance(command, operation);
      assertIntegerBetween(
        command.request_ttl_seconds,
        60,
        86400,
        `${operation}.request_ttl_seconds`,
      );
      if (command.lease_duration_seconds > command.request_ttl_seconds) {
        fail(`${operation}.lease_duration_seconds exceeds request_ttl_seconds`);
      }
    } else {
      assertIntegerBetween(
        command.event_retention_seconds,
        300,
        604800,
        `${operation}.event_retention_seconds`,
      );
      if (command.lease_duration_seconds > command.event_retention_seconds) {
        fail(`${operation}.lease_duration_seconds exceeds event_retention_seconds`);
      }
    }
  } else if (operation === 'complete_business_event') {
    assertString(command.claim_id, OPAQUE_ID, `${operation}.claim_id`);
    assertString(command.job_id, OPAQUE_ID, `${operation}.job_id`);
    assertString(command.conversation_id, CONVERSATION_ID, `${operation}.conversation_id`);
    assertIntegerBetween(
      command.expected_generation,
      1,
      2147483647,
      `${operation}.expected_generation`,
    );
    assertString(command.worker_id, OPAQUE_ID, `${operation}.worker_id`);
    assertString(command.lease_token, OPAQUE_ID, `${operation}.lease_token`);
    assertString(command.observation_id, OPAQUE_ID, `${operation}.observation_id`);
    assertString(command.observation_digest, HEX_64, `${operation}.observation_digest`);
    assertString(command.audit_id, OPAQUE_ID, `${operation}.audit_id`);
    if (!OBSERVATION_OUTCOMES.includes(command.outcome_class)) {
      fail(`${operation}.outcome_class is invalid`);
    }
    assertString(command.reason_code, /^[a-z][a-z0-9_]{2,80}$/, `${operation}.reason_code`);
    if (!RISK_LEVELS.includes(command.risk_level)) fail(`${operation}.risk_level is invalid`);
    assertNullable(
      command.risk_digest,
      (value, label) => assertString(value, HEX_64, label),
      `${operation}.risk_digest`,
    );
    assertNullable(
      command.incident_id,
      (value, label) => assertString(value, /^inc_[A-Za-z0-9_-]{8,80}$/, label),
      `${operation}.incident_id`,
    );
    if ((command.outcome_class === 'owner_escalation') !== (command.incident_id !== null)) {
      fail(`${operation}.incident_id is required only for owner_escalation`);
    }
  } else if (operation === 'advance_conversation_generation') {
    for (const field of [
      'request_claim_id',
      'request_lease_owner_id',
      'request_lease_token',
      'business_claim_id',
      'business_lease_owner_id',
      'business_lease_token',
      'job_id',
    ]) {
      assertString(command[field], OPAQUE_ID, `${operation}.${field}`);
    }
    if (command.account_id !== PILOT_ACCOUNT_ID) fail(`${operation}.account_id is not allowlisted`);
    if (!Number.isInteger(command.inbox_id) || PILOT_INBOX_CHANNELS[command.inbox_id] !== command.channel) {
      fail(`${operation}.inbox_id and channel are not an allowlisted pair`);
    }
    assertString(command.conversation_id, CONVERSATION_ID, `${operation}.conversation_id`);
    assertString(command.anchor_message_id, MESSAGE_ID, `${operation}.anchor_message_id`);
    assertString(command.correlation_id, OPAQUE_ID, `${operation}.correlation_id`);
    if (command.correlation_id !==
        `calapres:${command.conversation_id}:${command.anchor_message_id}`) {
      fail(`${operation}.correlation_id does not bind the conversation and anchor`);
    }
    validateRequestProvenance(command, operation, 'command');
    assertString(
      command.event_identity_key_version,
      EVENT_IDENTITY_KEY_VERSION,
      `${operation}.event_identity_key_version`,
    );
    assertString(
      command.event_identity_fingerprint,
      HEX_64,
      `${operation}.event_identity_fingerprint`,
    );
    assertString(command.conversation_fingerprint, HEX_64, `${operation}.conversation_fingerprint`);
    assertFingerprintAliases(
      command.message_fingerprint,
      command.active_key_version,
      command.retained_message_fingerprints,
      operation,
    );
    const expectedStorageKeyVersion = command.event_identity_key_version.replace(
      'calapres-identity-hmac-',
      'hmac-sha256-',
    );
    if (command.active_key_version !== expectedStorageKeyVersion) {
      fail(`${operation}.event_identity_key_version does not match active_key_version`);
    }
    assertString(
      command.key_registry_version,
      KEY_REGISTRY_VERSION,
      `${operation}.key_registry_version`,
    );
    assertString(
      command.baseline_fingerprint_key_version,
      BASELINE_FINGERPRINT_KEY_VERSION,
      `${operation}.baseline_fingerprint_key_version`,
    );
    assertString(
      command.baseline_status_fingerprint,
      HEX_64,
      `${operation}.baseline_status_fingerprint`,
    );
    assertString(
      command.baseline_assignee_fingerprint,
      HEX_64,
      `${operation}.baseline_assignee_fingerprint`,
    );
    assertString(command.delay_policy_version, KNOWLEDGE_VERSION, `${operation}.delay_policy_version`);
    assertString(command.knowledge_version, KNOWLEDGE_VERSION, `${operation}.knowledge_version`);
    assertIntegerBetween(command.delay_seconds, 0, 3600, `${operation}.delay_seconds`);
    assertIntegerBetween(
      command.retention_seconds,
      86400,
      31536000,
      `${operation}.retention_seconds`,
    );
    if (command.retention_seconds < command.delay_seconds) {
      fail(`${operation}.retention_seconds must cover delay_seconds`);
    }
  } else if (operation === 'read_generation') {
    assertString(command.conversation_id, CONVERSATION_ID, `${operation}.conversation_id`);
    if (!Number.isInteger(command.expected_generation) || command.expected_generation < 1) {
      fail(`${operation}.expected_generation must be a positive integer`);
    }
  } else if (operation === 'schedule_conversation_retry') {
    assertString(command.job_id, OPAQUE_ID, `${operation}.job_id`);
    assertString(command.conversation_id, CONVERSATION_ID, `${operation}.conversation_id`);
    if (!Number.isInteger(command.expected_generation) || command.expected_generation < 1) {
      fail(`${operation}.expected_generation must be a positive integer`);
    }
    assertString(command.retry_idempotency_key, OPAQUE_ID, `${operation}.retry_idempotency_key`);
    if (!Number.isInteger(command.max_attempts) ||
        command.max_attempts < 1 || command.max_attempts > 10) {
      fail(`${operation}.max_attempts must be between 1 and 10`);
    }
    assertString(command.safe_error_code, /^[a-z][a-z0-9_]{2,80}$/, `${operation}.safe_error_code`);
    assertIntegerBetween(command.delay_seconds, 1, 86400, `${operation}.delay_seconds`);
    assertIntegerBetween(
      command.retention_seconds,
      86400,
      31536000,
      `${operation}.retention_seconds`,
    );
    if (command.retention_seconds < command.delay_seconds) {
      fail(`${operation}.retention_seconds must cover delay_seconds`);
    }
    assertString(command.expected_worker_id, OPAQUE_ID, `${operation}.expected_worker_id`);
    assertString(command.expected_lease_token, OPAQUE_ID, `${operation}.expected_lease_token`);
  } else if (operation === 'claim_due_conversation_retry') {
    assertString(command.worker_id, OPAQUE_ID, `${operation}.worker_id`);
    assertString(command.lease_token, OPAQUE_ID, `${operation}.lease_token`);
    if (!Number.isInteger(command.lease_duration_seconds) ||
        command.lease_duration_seconds < 1 || command.lease_duration_seconds > 900) {
      fail(`${operation}.lease_duration_seconds must be between 1 and 900`);
    }
  } else if (operation === 'transition_conversation_job') {
    assertString(command.job_id, OPAQUE_ID, `${operation}.job_id`);
    assertString(command.conversation_id, CONVERSATION_ID, `${operation}.conversation_id`);
    if (!Number.isInteger(command.expected_generation) || command.expected_generation < 1) {
      fail(`${operation}.expected_generation must be a positive integer`);
    }
    if (!JOB_STATES.includes(command.from_state) || !JOB_STATES.includes(command.to_state) ||
        command.from_state === command.to_state) {
      fail(`${operation} state transition is invalid`);
    }
    assertString(
      command.transition_idempotency_key,
      OPAQUE_ID,
      `${operation}.transition_idempotency_key`,
    );
  } else if (operation === 'prepare_owner_review') {
    assertString(command.preparation_id, /^prep_[A-Za-z0-9_-]{8,80}$/, `${operation}.preparation_id`);
    assertString(command.incident_id, /^inc_[A-Za-z0-9_-]{8,80}$/, `${operation}.incident_id`);
    if (!Number.isInteger(command.expected_incident_revision) ||
        command.expected_incident_revision < 1) {
      fail(`${operation}.expected_incident_revision must be a positive integer`);
    }
    assertString(command.source_observation_id, OPAQUE_ID, `${operation}.source_observation_id`);
    assertString(
      command.source_observation_digest,
      HEX_64,
      `${operation}.source_observation_digest`,
    );
    assertString(command.review_snapshot_digest, HEX_64, `${operation}.review_snapshot_digest`);
    if (!Array.isArray(command.decision_options) || command.decision_options.length < 1 ||
        command.decision_options.length > 8) {
      fail(`${operation}.decision_options must contain between 1 and 8 options`);
    }
    const optionKeys = [
      'action',
      'command_digest',
      'case_reply_sha256',
      'knowledge_proposal_sha256',
      'base_knowledge_version',
      'knowledge_version_to_publish',
      'supersedes_knowledge_version',
    ];
    const optionDigests = new Set();
    for (const [index, option] of command.decision_options.entries()) {
      assertExactObject(option, optionKeys, `${operation}.decision_options[${index}]`);
      validateOwnerDecisionShape(option, `${operation}.decision_options[${index}]`);
      if (optionDigests.has(option.command_digest)) {
        fail(`${operation}.decision_options command digests must be unique`);
      }
      optionDigests.add(option.command_digest);
    }
    assertString(command.nonce_fingerprint, HEX_64, `${operation}.nonce_fingerprint`);
    assertString(command.nonce_key_version, KEY_VERSION, `${operation}.nonce_key_version`);
    if (!Number.isInteger(command.nonce_ttl_seconds) ||
        command.nonce_ttl_seconds < 30 || command.nonce_ttl_seconds > 1800) {
      fail(`${operation}.nonce_ttl_seconds must be between 30 and 1800`);
    }
  } else if (operation === 'compare_and_commit_owner_decision') {
    assertString(command.decision_id, /^dec_[A-Za-z0-9_-]{8,80}$/, `${operation}.decision_id`);
    assertString(command.approval_id, /^dec_[A-Za-z0-9_-]{8,80}$/, `${operation}.approval_id`);
    assertString(command.audit_id, /^aud_[A-Za-z0-9_-]{8,80}$/, `${operation}.audit_id`);
    assertString(command.incident_id, /^inc_[A-Za-z0-9_-]{8,80}$/, `${operation}.incident_id`);
    if (!Number.isInteger(command.expected_incident_revision) ||
        command.expected_incident_revision < 1) {
      fail(`${operation}.expected_incident_revision must be a positive integer`);
    }
    validateOwnerDecisionShape(command);
    assertString(command.nonce_fingerprint, HEX_64, `${operation}.nonce_fingerprint`);
    assertString(command.nonce_key_version, KEY_VERSION, `${operation}.nonce_key_version`);
  } else if (operation === 'claim_chatwoot_reconciliation_scan') {
    validateReconciliationCommandBase(
      command,
      operation,
      'chatwoot_reconciliation_scan_claim_command_v1',
    );
    assertString(command.scan_id, RECONCILIATION_SCAN_ID, `${operation}.scan_id`);
    assertString(command.lease_owner_id, OPAQUE_ID, `${operation}.lease_owner_id`);
    assertString(command.lease_token, OPAQUE_ID, `${operation}.lease_token`);
    assertIntegerBetween(
      command.lease_duration_seconds,
      30,
      900,
      `${operation}.lease_duration_seconds`,
    );
    assertIntegerBetween(command.max_pages, 1, 100, `${operation}.max_pages`);
  } else if (operation === 'compare_and_advance_chatwoot_message_cursor') {
    validateReconciliationCommandBase(
      command,
      operation,
      'chatwoot_reconciliation_cursor_advance_command_v1',
    );
    assertString(command.conversation_id, CONVERSATION_ID, `${operation}.conversation_id`);
    if (!Number.isSafeInteger(Number(command.conversation_id)) ||
        Number(command.conversation_id) < 1) {
      fail(`${operation}.conversation_id exceeds the JavaScript safe-integer domain`);
    }
    assertString(command.scan_id, RECONCILIATION_SCAN_ID, `${operation}.scan_id`);
    assertString(command.lease_token, OPAQUE_ID, `${operation}.lease_token`);
    assertIntegerBetween(
      command.expected_after_message_id,
      0,
      Number.MAX_SAFE_INTEGER,
      `${operation}.expected_after_message_id`,
    );
    assertIntegerBetween(
      command.new_after_message_id,
      1,
      Number.MAX_SAFE_INTEGER,
      `${operation}.new_after_message_id`,
    );
    if (command.new_after_message_id <= command.expected_after_message_id) {
      fail(`${operation}.new_after_message_id must exceed expected_after_message_id`);
    }
    assertString(command.page_binding_sha256, HEX_64, `${operation}.page_binding_sha256`);
    assertString(command.outcome_digest, HEX_64, `${operation}.outcome_digest`);
    assertIntegerBetween(command.row_count, 1, 99, `${operation}.row_count`);
    validateReconciliationProofRows(command, operation);
  } else {
    validateReconciliationCommandBase(
      command,
      operation,
      'chatwoot_reconciliation_cursor_read_command_v1',
    );
    assertString(command.conversation_id, CONVERSATION_ID, `${operation}.conversation_id`);
    if (!Number.isSafeInteger(Number(command.conversation_id)) ||
        Number(command.conversation_id) < 1) {
      fail(`${operation}.conversation_id exceeds the JavaScript safe-integer domain`);
    }
    assertString(command.scan_id, RECONCILIATION_SCAN_ID, `${operation}.scan_id`);
    assertString(command.lease_token, OPAQUE_ID, `${operation}.lease_token`);
  }
  return command;
}

function validateJobControl(value, label) {
  if (value.account_id !== PILOT_ACCOUNT_ID) fail(`${label}.account_id is not allowlisted`);
  if (!Number.isInteger(value.inbox_id) ||
      PILOT_INBOX_CHANNELS[value.inbox_id] !== value.channel) {
    fail(`${label}.inbox_id and channel are not an allowlisted pair`);
  }
  assertString(value.conversation_id, CONVERSATION_ID, `${label}.conversation_id`);
  assertString(value.anchor_message_id, MESSAGE_ID, `${label}.anchor_message_id`);
  assertString(value.correlation_id, OPAQUE_ID, `${label}.correlation_id`);
  if (value.correlation_id !==
      `calapres:${value.conversation_id}:${value.anchor_message_id}`) {
    fail(`${label}.correlation_id does not bind the conversation and anchor`);
  }
  assertString(
    value.event_identity_key_version,
    EVENT_IDENTITY_KEY_VERSION,
    `${label}.event_identity_key_version`,
  );
  for (const field of [
    'event_identity_fingerprint',
    'conversation_fingerprint',
    'message_fingerprint',
    'baseline_status_fingerprint',
    'baseline_assignee_fingerprint',
  ]) assertString(value[field], HEX_64, `${label}.${field}`);
  assertString(
    value.baseline_fingerprint_key_version,
    BASELINE_FINGERPRINT_KEY_VERSION,
    `${label}.baseline_fingerprint_key_version`,
  );
  assertString(value.delay_policy_version, KNOWLEDGE_VERSION, `${label}.delay_policy_version`);
  assertString(value.knowledge_version, KNOWLEDGE_VERSION, `${label}.knowledge_version`);
  assertIntegerBetween(value.delay_seconds, 0, 3600, `${label}.delay_seconds`);
}

function validateDurableResultValue(operation, status, outcome, value) {
  if (operation === 'claim_request_replay' &&
      ['processing_claimed', 'processing_owned', 'processing_recovered'].includes(outcome)) {
    if (status !== 'committed') fail('request processing result status is invalid');
    assertExactObject(value, REQUEST_PROCESSING_RESULT_FIELDS, 'request processing result');
    validateRequestProvenance(value, 'request processing result');
    if (value.lifecycle_status !== 'processing') {
      fail('request processing result lifecycle is invalid');
    }
    assertString(value.claim_id, OPAQUE_ID, 'request processing result.claim_id');
    const claimedAt = timestamp(value.claimed_at, 'request processing result.claimed_at');
    const expiresAt = timestamp(value.expires_at, 'request processing result.expires_at');
    const leaseExpiresAt = timestamp(
      value.lease_expires_at,
      'request processing result.lease_expires_at',
    );
    if (expiresAt <= claimedAt || leaseExpiresAt <= claimedAt || leaseExpiresAt > expiresAt) {
      fail('request processing result interval is invalid');
    }
    assertIntegerBetween(value.attempt_count, 1, 2147483647,
      'request processing result.attempt_count');
  }
  if (operation === 'claim_request_replay' && outcome === 'retry_later') {
    if (status !== 'duplicate_or_conflict') fail('request retry result status is invalid');
    assertExactObject(value, REQUEST_RETRY_RESULT_FIELDS, 'request retry result');
    validateRequestProvenance(value, 'request retry result');
    assertString(value.claim_id, OPAQUE_ID, 'request retry result.claim_id');
    timestamp(value.retry_after_at, 'request retry result.retry_after_at');
  }
  if (operation === 'claim_request_replay' && outcome === 'duplicate_completed') {
    if (status !== 'duplicate_or_conflict') fail('completed request result status is invalid');
    assertExactObject(value, REQUEST_COMPLETED_RESULT_FIELDS, 'completed request result');
    validateRequestProvenance(value, 'completed request result');
    validateJobControl(value, 'completed request result');
    if (value.lifecycle_status !== 'completed') {
      fail('completed request result lifecycle is invalid');
    }
    assertString(value.claim_id, OPAQUE_ID, 'completed request result.claim_id');
    assertString(value.business_claim_id, OPAQUE_ID,
      'completed request result.business_claim_id');
    assertString(value.job_id, OPAQUE_ID, 'completed request result.job_id');
    assertIntegerBetween(value.generation, 1, 2147483647,
      'completed request result.generation');
    timestamp(value.claimed_at, 'completed request result.claimed_at');
    timestamp(value.expires_at, 'completed request result.expires_at');
    timestamp(value.lease_expires_at, 'completed request result.lease_expires_at');
    timestamp(value.due_at, 'completed request result.due_at');
    assertIntegerBetween(value.attempt_count, 1, 2147483647,
      'completed request result.attempt_count');
  }
  if (operation === 'claim_business_event' && outcome === 'duplicate_completed') {
    if (status !== 'duplicate_or_conflict') fail('completed business result status is invalid');
    assertExactObject(value, COMPLETED_BUSINESS_JOB_FIELDS, 'completed business result');
    validateJobControl(value, 'completed business result');
    assertString(value.claim_id, OPAQUE_ID, 'completed business result.claim_id');
    assertString(value.job_id, OPAQUE_ID, 'completed business result.job_id');
    assertString(value.observation_id, OPAQUE_ID, 'completed business result.observation_id');
    assertString(value.audit_id, OPAQUE_ID, 'completed business result.audit_id');
    if (value.lifecycle_status !== 'completed' || value.state !== 'completed') {
      fail('completed business result is not durably completed');
    }
    assertIntegerBetween(value.generation, 1, 2147483647, 'completed business result.generation');
    timestamp(value.due_at, 'completed business result.due_at');
  }
  if (operation === 'advance_conversation_generation' &&
      ['ingress_bound', 'duplicate_ingress_bound'].includes(outcome)) {
    const expectedStatus = outcome === 'ingress_bound' ? 'committed' : 'duplicate_or_conflict';
    if (status !== expectedStatus) fail('durable job binding result status is invalid');
    assertExactObject(value, DURABLE_JOB_BINDING_FIELDS, 'durable job binding result');
    validateJobControl(value, 'durable job binding result');
    validateRequestProvenance(value, 'durable job binding result', 'durable');
    for (const field of ['request_claim_id', 'business_claim_id', 'job_id']) {
      assertString(value[field], OPAQUE_ID, `durable job binding result.${field}`);
    }
    assertIntegerBetween(value.generation, 1, 2147483647, 'durable job binding result.generation');
    timestamp(value.due_at, 'durable job binding result.due_at');
    if (!JOB_STATES.includes(value.state)) fail('durable job binding result.state is invalid');
  }
  if (operation === 'claim_chatwoot_reconciliation_scan' &&
      ['scan_lease_claimed', 'scan_lease_owned', 'scan_lease_recovered'].includes(outcome)) {
    if (status !== 'committed') fail('reconciliation scan lease result status is invalid');
    assertExactObject(value, RECONCILIATION_SCAN_LEASE_FIELDS, 'reconciliation scan lease result');
    if (value.account_id !== PILOT_ACCOUNT_ID || !Number.isInteger(value.inbox_id) ||
        PILOT_INBOX_CHANNELS[value.inbox_id] !== value.channel ||
        value.activation_floor_at !== RECONCILIATION_ACTIVATION_FLOOR_AT ||
        value.activation_policy_version !== RECONCILIATION_ACTIVATION_POLICY_VERSION) {
      fail('reconciliation scan lease result route or policy is invalid');
    }
    assertString(value.scan_id, RECONCILIATION_SCAN_ID, 'reconciliation scan lease result.scan_id');
    assertString(value.lease_owner_id, OPAQUE_ID,
      'reconciliation scan lease result.lease_owner_id');
    assertString(value.lease_token, OPAQUE_ID, 'reconciliation scan lease result.lease_token');
    const claimedAt = timestamp(value.lease_claimed_at,
      'reconciliation scan lease result.lease_claimed_at');
    const expiresAt = timestamp(value.lease_expires_at,
      'reconciliation scan lease result.lease_expires_at');
    if (expiresAt <= claimedAt) fail('reconciliation scan lease result interval is invalid');
    assertIntegerBetween(value.attempt_count, 1, 2147483647,
      'reconciliation scan lease result.attempt_count');
    assertIntegerBetween(value.lease_duration_seconds, 30, 900,
      'reconciliation scan lease result.lease_duration_seconds');
    assertIntegerBetween(value.max_pages, 1, 100, 'reconciliation scan lease result.max_pages');
  }
  if (operation === 'claim_chatwoot_reconciliation_scan' && outcome === 'scan_retry_later') {
    if (status !== 'duplicate_or_conflict') fail('reconciliation retry result status is invalid');
    assertExactObject(value, ['account_id', 'inbox_id', 'channel', 'retry_after_at'],
      'reconciliation retry result');
    if (value.account_id !== PILOT_ACCOUNT_ID || !Number.isInteger(value.inbox_id) ||
        PILOT_INBOX_CHANNELS[value.inbox_id] !== value.channel) {
      fail('reconciliation retry result route is invalid');
    }
    timestamp(value.retry_after_at, 'reconciliation retry result.retry_after_at');
  }
  if (operation === 'compare_and_advance_chatwoot_message_cursor' &&
      ['cursor_advanced', 'duplicate_cursor_advance'].includes(outcome)) {
    const expectedStatus = outcome === 'cursor_advanced' ? 'committed' : 'duplicate_or_conflict';
    if (status !== expectedStatus) fail('reconciliation cursor result status is invalid');
    assertExactObject(value, RECONCILIATION_CURSOR_RESULT_FIELDS,
      'reconciliation cursor result');
    if (value.account_id !== PILOT_ACCOUNT_ID || !Number.isInteger(value.inbox_id) ||
        PILOT_INBOX_CHANNELS[value.inbox_id] !== value.channel ||
        value.activation_floor_at !== RECONCILIATION_ACTIVATION_FLOOR_AT ||
        value.activation_policy_version !== RECONCILIATION_ACTIVATION_POLICY_VERSION) {
      fail('reconciliation cursor result route or policy is invalid');
    }
    assertString(value.conversation_id, CONVERSATION_ID,
      'reconciliation cursor result.conversation_id');
    if (!Number.isSafeInteger(Number(value.conversation_id)) ||
        Number(value.conversation_id) < 1) {
      fail('reconciliation cursor result.conversation_id exceeds the safe-integer domain');
    }
    assertString(value.scan_id, RECONCILIATION_SCAN_ID, 'reconciliation cursor result.scan_id');
    assertIntegerBetween(value.expected_after_message_id, 0, Number.MAX_SAFE_INTEGER,
      'reconciliation cursor result.expected_after_message_id');
    assertIntegerBetween(value.new_after_message_id, 1, Number.MAX_SAFE_INTEGER,
      'reconciliation cursor result.new_after_message_id');
    if (value.new_after_message_id <= value.expected_after_message_id) {
      fail('reconciliation cursor result interval is invalid');
    }
    assertString(value.page_binding_sha256, HEX_64,
      'reconciliation cursor result.page_binding_sha256');
    assertString(value.outcome_digest, HEX_64, 'reconciliation cursor result.outcome_digest');
    assertIntegerBetween(value.row_count, 1, 99, 'reconciliation cursor result.row_count');
    timestamp(value.advanced_at, 'reconciliation cursor result.advanced_at');
  }
  if (operation === 'compare_and_advance_chatwoot_message_cursor' &&
      outcome === 'cursor_compare_failed') {
    if (status !== 'duplicate_or_conflict') fail('reconciliation cursor conflict status is invalid');
    assertExactObject(value, [
      'account_id', 'inbox_id', 'channel', 'conversation_id', 'current_after_message_id',
    ], 'reconciliation cursor conflict');
    if (value.account_id !== PILOT_ACCOUNT_ID || !Number.isInteger(value.inbox_id) ||
        PILOT_INBOX_CHANNELS[value.inbox_id] !== value.channel) {
      fail('reconciliation cursor conflict route is invalid');
    }
    assertString(value.conversation_id, CONVERSATION_ID,
      'reconciliation cursor conflict.conversation_id');
    if (!Number.isSafeInteger(Number(value.conversation_id)) ||
        Number(value.conversation_id) < 1) {
      fail('reconciliation cursor conflict.conversation_id exceeds the safe-integer domain');
    }
    assertIntegerBetween(value.current_after_message_id, 0, Number.MAX_SAFE_INTEGER,
      'reconciliation cursor conflict.current_after_message_id');
  }
  if (operation === 'read_chatwoot_reconciliation_cursor' && outcome === 'cursor_read') {
    if (status !== 'committed') fail('reconciliation cursor read status is invalid');
    assertExactObject(value, RECONCILIATION_CURSOR_READ_FIELDS,
      'reconciliation cursor read result');
    if (value.account_id !== PILOT_ACCOUNT_ID || !Number.isInteger(value.inbox_id) ||
        PILOT_INBOX_CHANNELS[value.inbox_id] !== value.channel ||
        value.activation_floor_at !== RECONCILIATION_ACTIVATION_FLOOR_AT ||
        value.activation_policy_version !== RECONCILIATION_ACTIVATION_POLICY_VERSION) {
      fail('reconciliation cursor read route or policy is invalid');
    }
    assertString(value.conversation_id, CONVERSATION_ID,
      'reconciliation cursor read result.conversation_id');
    if (!Number.isSafeInteger(Number(value.conversation_id)) ||
        Number(value.conversation_id) < 1) {
      fail('reconciliation cursor read result.conversation_id exceeds the safe-integer domain');
    }
    assertString(value.scan_id, RECONCILIATION_SCAN_ID,
      'reconciliation cursor read result.scan_id');
    assertIntegerBetween(value.current_after_message_id, 0, Number.MAX_SAFE_INTEGER,
      'reconciliation cursor read result.current_after_message_id');
  }
  if (operation === 'claim_chatwoot_reconciliation_scan' && status !== 'unknown') {
    const validKnownResult =
      (status === 'committed' && [
        'scan_lease_claimed', 'scan_lease_owned', 'scan_lease_recovered',
      ].includes(outcome)) ||
      (status === 'duplicate_or_conflict' && outcome === 'scan_retry_later') ||
      (status === 'duplicate_or_conflict' && [
        'scan_id_conflict', 'scan_lease_token_conflict', 'scan_binding_mismatch',
      ].includes(outcome) && value === null);
    if (!validKnownResult) fail('reconciliation scan result outcome is invalid');
  }
  if (operation === 'claim_request_replay' && status !== 'unknown') {
    const validKnownResult =
      (status === 'committed' && [
        'processing_claimed', 'processing_owned', 'processing_recovered',
      ].includes(outcome)) ||
      (status === 'duplicate_or_conflict' && [
        'retry_later', 'duplicate_completed',
      ].includes(outcome)) ||
      (status === 'duplicate_or_conflict' && outcome === 'claim_id_conflict' && value === null);
    if (!validKnownResult) fail('request replay result outcome is invalid');
  }
  if (operation === 'compare_and_advance_chatwoot_message_cursor' && status !== 'unknown') {
    const validKnownResult =
      (status === 'committed' && outcome === 'cursor_advanced') ||
      (status === 'duplicate_or_conflict' && [
        'duplicate_cursor_advance', 'cursor_compare_failed',
      ].includes(outcome)) ||
      (status === 'duplicate_or_conflict' && [
        'cursor_finalization_conflict', 'scan_lease_not_owned',
      ].includes(outcome) && value === null);
    if (!validKnownResult) fail('reconciliation cursor result outcome is invalid');
  }
  if (operation === 'read_chatwoot_reconciliation_cursor' && status !== 'unknown') {
    const validKnownResult =
      (status === 'committed' && outcome === 'cursor_read') ||
      (status === 'duplicate_or_conflict' && outcome === 'scan_lease_not_owned' && value === null);
    if (!validKnownResult) fail('reconciliation cursor read outcome is invalid');
  }
}

function resultEnvelope(operation, status, outcome, value = null, errorCode = null) {
  if (!OPERATIONS.includes(operation)) fail(`unsupported atomic operation: ${operation}`);
  if (!CONTRACT_STATUSES.includes(status)) fail(`unsupported contract status: ${status}`);
  if (typeof outcome !== 'string' || !/^[a-z][a-z0-9_]{2,80}$/.test(outcome)) {
    fail('outcome is invalid');
  }
  if (status === 'unknown' && (value !== null || typeof errorCode !== 'string')) {
    fail('unknown results require a safe error code and no value');
  }
  if (status !== 'unknown' && errorCode !== null) fail('known results must not carry error_code');
  const inspectDurableValue = (nested) => {
    if (Array.isArray(nested)) {
      nested.forEach(inspectDurableValue);
    } else if (nested && typeof nested === 'object') {
      for (const [key, child] of Object.entries(nested)) {
        if (PROHIBITED_DURABLE_KEYS.has(key)) {
          fail(`atomic result contains prohibited durable field: ${key}`);
        }
        inspectDurableValue(child);
      }
    }
  };
  inspectDurableValue(value);
  validateDurableResultValue(operation, status, outcome, value);
  return {
    contract_verified: true,
    status,
    operation,
    outcome,
    value,
    error_code: errorCode,
  };
}

function safeErrorCode(error) {
  if (error instanceof AtomicStorageUnknownError) return error.code;
  if (error instanceof TypeError) return 'schema_invalid';
  const code = error && typeof error.code === 'string' ? error.code : '';
  if (['ETIMEDOUT', 'ESOCKETTIMEDOUT'].includes(code)) return 'timeout_unknown';
  if (['42P01', '42703', '42804'].includes(code)) return 'schema_drift_unknown';
  if (['ECONNRESET', 'ECONNREFUSED', 'EPIPE', '57P01', '40001'].includes(code)) {
    return 'driver_unknown';
  }
  return 'unexpected_storage_error';
}

async function safeAtomicCall(operation, action) {
  try {
    const descriptor = await action();
    return resultEnvelope(
      operation,
      descriptor.status,
      descriptor.outcome,
      descriptor.value === undefined ? null : descriptor.value,
      descriptor.error_code === undefined ? null : descriptor.error_code,
    );
  } catch (error) {
    return resultEnvelope(operation, 'unknown', 'uncertain', null, safeErrorCode(error));
  }
}

class AtomicStorageContract {
  async claim_request_replay() { throw new Error('claim_request_replay is not implemented'); }
  async claim_business_event() { throw new Error('claim_business_event is not implemented'); }
  async complete_business_event() { throw new Error('complete_business_event is not implemented'); }
  async advance_conversation_generation() {
    throw new Error('advance_conversation_generation is not implemented');
  }
  async read_generation() { throw new Error('read_generation is not implemented'); }
  async schedule_conversation_retry() {
    throw new Error('schedule_conversation_retry is not implemented');
  }
  async claim_due_conversation_retry() {
    throw new Error('claim_due_conversation_retry is not implemented');
  }
  async transition_conversation_job() {
    throw new Error('transition_conversation_job is not implemented');
  }
  async prepare_owner_review() { throw new Error('prepare_owner_review is not implemented'); }
  async compare_and_commit_owner_decision() {
    throw new Error('compare_and_commit_owner_decision is not implemented');
  }
  async claim_chatwoot_reconciliation_scan() {
    throw new Error('claim_chatwoot_reconciliation_scan is not implemented');
  }
  async compare_and_advance_chatwoot_message_cursor() {
    throw new Error('compare_and_advance_chatwoot_message_cursor is not implemented');
  }
  async read_chatwoot_reconciliation_cursor() {
    throw new Error('read_chatwoot_reconciliation_cursor is not implemented');
  }
}

module.exports = {
  AtomicStorageContract,
  AtomicStorageUnknownError,
  COMMAND_FIELDS,
  COMPLETED_BUSINESS_JOB_FIELDS,
  CONTRACT_STATUSES,
  DURABLE_JOB_BINDING_FIELDS,
  EDGE_OPERATIONS,
  JOB_CONTROL_FIELDS,
  JOB_STATES,
  OPERATIONS,
  OBSERVATION_OUTCOMES,
  OWNER_OPERATIONS,
  OWNER_ACTIONS,
  PILOT_BRAND_ID,
  PILOT_ACCOUNT_ID,
  PILOT_INBOX_CHANNELS,
  RECONCILIATION_ACTIVATION_FLOOR_AT,
  RECONCILIATION_ACTIVATION_POLICY_VERSION,
  RECONCILIATION_CURSOR_READ_FIELDS,
  RECONCILIATION_CURSOR_RESULT_FIELDS,
  RECONCILIATION_DURABLE_PROVENANCE_FIELDS,
  RECONCILIATION_INGRESS_COMMAND_FIELDS,
  RECONCILIATION_PROOF_ROW_FIELDS,
  RECONCILIATION_SCAN_LEASE_FIELDS,
  RECONCILIATION_SCHEMA_VERSION,
  RECONCILIATION_SOURCE,
  REQUEST_PROVENANCE_FIELDS,
  REQUEST_SOURCES,
  RFC3339_UTC,
  RISK_LEVELS,
  patterns: Object.freeze({
    BRAND_ID,
    CONVERSATION_ID,
    MESSAGE_ID,
    EVENT_IDENTITY_KEY_VERSION,
    BASELINE_FINGERPRINT_KEY_VERSION,
    HEX_64,
    KEY_REGISTRY_VERSION,
    KEY_VERSION,
    KNOWLEDGE_VERSION,
    OPAQUE_ID,
    RECONCILIATION_SCAN_ID,
    RECONCILIATION_BUSINESS_CLAIM_ID,
    RECONCILIATION_JOB_ID,
  }),
  resultEnvelope,
  safeAtomicCall,
  validateCommand,
};
