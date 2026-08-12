'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const {
  OPERATIONS,
  resultEnvelope,
  safeAtomicCall,
  validateCommand,
} = require('../../adapters/atomic-storage-contract');
const {
  DEFAULT_KEY_REGISTRY,
  InMemoryAtomicStorage,
} = require('../../adapters/in-memory-atomic-storage');

const digest = (character) => character.repeat(64);
const BASE_TIME = Date.parse('2026-08-11T15:00:00.000Z');
const CURSOR_READ_FIXTURE = JSON.parse(readFileSync(join(
  __dirname,
  '../fixtures/chatwoot-reconciliation-cursor-read-command.json',
), 'utf8'));

function clockHarness(start = BASE_TIME) {
  let now = start;
  return {
    clock: () => now,
    advance(seconds) { now += seconds * 1000; },
    set(value) { now = Date.parse(value); },
    now: () => now,
  };
}

function requestCommand(overrides = {}) {
  return {
    brand_id: 'calapres',
    claim_id: 'rr_claim_0001',
    active_fingerprint: digest('a'),
    active_key_version: 'hmac-sha256-v1',
    retained_fingerprints: [],
    key_registry_version: 'calapres-storage-keys-v1',
    request_source: 'chatwoot_signed_webhook_v1',
    source_binding_sha256: digest('0'),
    request_ttl_seconds: 600,
    lease_owner_id: 'edge_worker_0001',
    lease_token: 'request_lease_0001',
    lease_duration_seconds: 300,
    ...overrides,
  };
}

function businessCommand(overrides = {}) {
  return {
    brand_id: 'calapres',
    claim_id: 'bev_claim_0001',
    active_fingerprint: digest('b'),
    active_key_version: 'hmac-sha256-v1',
    retained_fingerprints: [],
    key_registry_version: 'calapres-storage-keys-v1',
    event_retention_seconds: 86400,
    lease_owner_id: 'edge_worker_0001',
    lease_token: 'business_lease_0001',
    lease_duration_seconds: 300,
    ...overrides,
  };
}

function bindCommand(overrides = {}) {
  return {
    brand_id: 'calapres',
    request_claim_id: 'rr_claim_0001',
    request_lease_owner_id: 'edge_worker_0001',
    request_lease_token: 'request_lease_0001',
    business_claim_id: 'bev_claim_0001',
    business_lease_owner_id: 'edge_worker_0001',
    business_lease_token: 'business_lease_0001',
    request_source: 'chatwoot_signed_webhook_v1',
    source_binding_sha256: digest('0'),
    reconciliation_scan_id: null,
    reconciliation_scan_lease_token: null,
    reconciliation_expected_after_message_id: null,
    reconciliation_page_binding_sha256: null,
    account_id: 179973,
    inbox_id: 128058,
    channel: 'whatsapp',
    conversation_id: '700001',
    anchor_message_id: '800001',
    correlation_id: 'calapres:700001:800001',
    job_id: 'job_calapres_0001',
    event_identity_key_version: 'calapres-identity-hmac-v1',
    event_identity_fingerprint: digest('b'),
    conversation_fingerprint: digest('c'),
    message_fingerprint: digest('d'),
    active_key_version: 'hmac-sha256-v1',
    retained_message_fingerprints: [],
    key_registry_version: 'calapres-storage-keys-v1',
    baseline_fingerprint_key_version: 'calapres-hmac-v1',
    baseline_status_fingerprint: digest('e'),
    baseline_assignee_fingerprint: digest('f'),
    delay_policy_version: '2026-08-11-v1',
    knowledge_version: '2026-08-11-v3',
    delay_seconds: 60,
    retention_seconds: 90 * 24 * 60 * 60,
    ...overrides,
  };
}

function reconciliationRequestCommand(overrides = {}) {
  return requestCommand({
    request_source: 'chatwoot_reconciliation_api_v1',
    source_binding_sha256: digest('7'),
    ...overrides,
  });
}

function reconciliationBindCommand(overrides = {}) {
  return bindCommand({
    request_source: 'chatwoot_reconciliation_api_v1',
    source_binding_sha256: digest('7'),
    reconciliation_scan_id: 'cwrs_aaaaaaaaaaaaaaaaaaaaaaaa',
    reconciliation_scan_lease_token: 'reconciliation_lease_1',
    reconciliation_expected_after_message_id: 0,
    reconciliation_page_binding_sha256: digest('8'),
    ...overrides,
  });
}

function expectedControl(command = bindCommand()) {
  return {
    account_id: command.account_id,
    inbox_id: command.inbox_id,
    channel: command.channel,
    conversation_id: command.conversation_id,
    anchor_message_id: command.anchor_message_id,
    correlation_id: command.correlation_id,
    event_identity_key_version: command.event_identity_key_version,
    event_identity_fingerprint: command.event_identity_fingerprint,
    conversation_fingerprint: command.conversation_fingerprint,
    message_fingerprint: command.message_fingerprint,
    baseline_fingerprint_key_version: command.baseline_fingerprint_key_version,
    baseline_status_fingerprint: command.baseline_status_fingerprint,
    baseline_assignee_fingerprint: command.baseline_assignee_fingerprint,
    delay_policy_version: command.delay_policy_version,
    delay_seconds: command.delay_seconds,
    knowledge_version: command.knowledge_version,
  };
}

function expectedIngressProvenance(command = bindCommand()) {
  return {
    request_source: command.request_source,
    source_binding_sha256: command.source_binding_sha256,
    reconciliation_scan_id: command.reconciliation_scan_id,
    reconciliation_expected_after_message_id:
      command.reconciliation_expected_after_message_id,
    reconciliation_page_binding_sha256: command.reconciliation_page_binding_sha256,
  };
}

function workerCommand(overrides = {}) {
  return {
    brand_id: 'calapres',
    worker_id: 'core_worker_0001',
    lease_token: 'job_lease_0001',
    lease_duration_seconds: 300,
    ...overrides,
  };
}

function reconciliationScanCommand(overrides = {}) {
  return {
    schema_version: '1.0',
    kind: 'chatwoot_reconciliation_scan_claim_command_v1',
    operation: 'claim_chatwoot_reconciliation_scan',
    source: 'chatwoot_reconciliation_v1',
    brand_id: 'calapres',
    account_id: 179973,
    inbox_id: 128058,
    channel: 'whatsapp',
    scan_id: 'cwrs_aaaaaaaaaaaaaaaaaaaaaaaa',
    lease_owner_id: 'edge_reconciliation_worker_1',
    lease_token: 'reconciliation_lease_1',
    lease_duration_seconds: 300,
    max_pages: 50,
    activation_floor_at: '2026-08-12T00:00:00.000Z',
    activation_policy_version: '2026-08-12-v1',
    customer_egress_allowed: false,
    ...overrides,
  };
}

function reconciliationCandidateProof(overrides = {}) {
  return {
    message_id: '800001',
    classification: 'event_candidate',
    outcome: 'durable_bound',
    reason_code: null,
    created_at: null,
    message_type: null,
    private: null,
    sender_type: null,
    event_identity_key_version: 'calapres-identity-hmac-v1',
    event_identity_fingerprint: digest('b'),
    business_claim_id: 'bev_claim_0001',
    job_id: 'job_calapres_0001',
    generation: 1,
    ...overrides,
  };
}

function reconciliationExcludedProof(overrides = {}) {
  return {
    message_id: '800002',
    classification: 'deterministically_excluded',
    outcome: 'deterministically_excluded',
    reason_code: 'private_message',
    created_at: Math.floor(Date.parse('2026-08-12T00:30:00.000Z') / 1000),
    message_type: 0,
    private: true,
    sender_type: 'contact',
    event_identity_key_version: null,
    event_identity_fingerprint: null,
    business_claim_id: null,
    job_id: null,
    generation: null,
    ...overrides,
  };
}

function reconciliationCursorCommand(overrides = {}) {
  const proofRows = overrides.proof_rows || [reconciliationCandidateProof()];
  return {
    schema_version: '1.0',
    kind: 'chatwoot_reconciliation_cursor_advance_command_v1',
    operation: 'compare_and_advance_chatwoot_message_cursor',
    source: 'chatwoot_reconciliation_v1',
    brand_id: 'calapres',
    account_id: 179973,
    inbox_id: 128058,
    channel: 'whatsapp',
    conversation_id: '700001',
    scan_id: 'cwrs_aaaaaaaaaaaaaaaaaaaaaaaa',
    lease_token: 'reconciliation_lease_1',
    expected_after_message_id: 0,
    new_after_message_id: Number(proofRows.at(-1).message_id),
    proof_rows: proofRows,
    page_binding_sha256: digest('8'),
    outcome_digest: digest('9'),
    row_count: proofRows.length,
    activation_floor_at: '2026-08-12T00:00:00.000Z',
    activation_policy_version: '2026-08-12-v1',
    customer_egress_allowed: false,
    ...overrides,
  };
}

function reconciliationCursorReadCommand(overrides = {}) {
  return { ...CURSOR_READ_FIXTURE, ...overrides };
}

function completionCommand(overrides = {}) {
  return {
    brand_id: 'calapres',
    claim_id: 'bev_claim_0001',
    job_id: 'job_calapres_0001',
    conversation_id: '700001',
    expected_generation: 1,
    worker_id: 'core_worker_0001',
    lease_token: 'job_lease_0001',
    observation_id: 'obs_calapres_0001',
    observation_digest: digest('d'),
    audit_id: 'aud_observation_0001',
    outcome_class: 'observation_only',
    reason_code: 'synthetic_observation',
    risk_level: 'none',
    risk_digest: null,
    incident_id: null,
    ...overrides,
  };
}

function decisionOption(overrides = {}) {
  return {
    action: 'reply_only',
    command_digest: digest('e'),
    case_reply_sha256: digest('f'),
    knowledge_proposal_sha256: null,
    base_knowledge_version: null,
    knowledge_version_to_publish: null,
    supersedes_knowledge_version: null,
    ...overrides,
  };
}

function registryV2(coverageUntilV1 = null) {
  const namespaces = {};
  for (const namespace of ['request_replay', 'business_event', 'message_identity']) {
    namespaces[namespace] = {
      active_key_version: 'hmac-sha256-v2',
      retained_key_versions: ['hmac-sha256-v1'],
      coverage_until_by_version: {
        'hmac-sha256-v1': coverageUntilV1,
        'hmac-sha256-v2': null,
      },
    };
  }
  return { registry_version: 'calapres-storage-keys-v2', namespaces };
}

function rotateReference(storage, registry) {
  storage._keyRegistry = storage._normalizeKeyRegistry(registry);
}

async function boundStorage({ delaySeconds = 0, outcome = 'observation_only' } = {}) {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  assert.equal((await storage.claim_request_replay(requestCommand())).outcome, 'processing_claimed');
  assert.equal((await storage.claim_business_event(businessCommand())).outcome, 'prepared');
  const bound = await storage.advance_conversation_generation(bindCommand({
    delay_seconds: delaySeconds,
  }));
  assert.equal(bound.outcome, 'ingress_bound');
  if (delaySeconds) time.advance(delaySeconds);
  const claimed = await storage.claim_due_conversation_retry(workerCommand());
  assert.equal(claimed.outcome, 'job_claimed');
  return { storage, time, bound, outcome };
}

async function completedStorage() {
  const state = await boundStorage();
  const completed = await state.storage.complete_business_event(completionCommand());
  assert.equal(completed.outcome, 'completed');
  return { ...state, completed };
}

test('contract keeps thirteen operations and rejects caller-controlled absolute clocks', () => {
  assert.equal(OPERATIONS.length, 13);
  for (const operation of [
    'claim_request_replay', 'claim_business_event', 'advance_conversation_generation',
    'schedule_conversation_retry', 'claim_due_conversation_retry',
    'claim_chatwoot_reconciliation_scan',
    'compare_and_advance_chatwoot_message_cursor',
    'read_chatwoot_reconciliation_cursor',
  ]) {
    const command = operation === 'claim_request_replay' ? requestCommand()
      : operation === 'claim_business_event' ? businessCommand()
        : operation === 'advance_conversation_generation' ? bindCommand()
          : operation === 'schedule_conversation_retry' ? {
            brand_id: 'calapres', job_id: 'job_calapres_0001', conversation_id: '700001',
            expected_generation: 1, retry_idempotency_key: 'retry_key_0001', max_attempts: 3,
            safe_error_code: 'synthetic_failure', delay_seconds: 30, retention_seconds: 86400,
            expected_worker_id: 'core_worker_0001', expected_lease_token: 'job_lease_0001',
          } : operation === 'claim_due_conversation_retry' ? workerCommand()
            : operation === 'claim_chatwoot_reconciliation_scan' ? reconciliationScanCommand()
              : operation === 'compare_and_advance_chatwoot_message_cursor'
                ? reconciliationCursorCommand() : reconciliationCursorReadCommand();
    for (const field of ['now', 'verified_at', 'valid_until', 'expires_at', 'due_at', 'next_attempt_at']) {
      assert.throws(() => validateCommand(operation, { ...command, [field]: '2099-01-01T00:00:00.000Z' }),
        /must contain exactly/);
    }
  }
});

test('ingress provenance is exact and source-conditional without a durable scan token', () => {
  assert.doesNotThrow(() => validateCommand(
    'claim_request_replay', reconciliationRequestCommand(),
  ));
  assert.doesNotThrow(() => validateCommand(
    'advance_conversation_generation', reconciliationBindCommand(),
  ));
  for (const mutation of [
    { request_source: 'chatwoot_agentbot_v1' },
    { source_binding_sha256: digest('A') },
    { source_binding_sha256: 'short' },
  ]) {
    assert.throws(() => validateCommand(
      'claim_request_replay', requestCommand(mutation),
    ));
  }
  for (const mutation of [
    { reconciliation_scan_id: 'cwrs_aaaaaaaaaaaaaaaaaaaaaaaa' },
    { reconciliation_scan_lease_token: 'poison_token_1' },
    { reconciliation_expected_after_message_id: 0 },
    { reconciliation_page_binding_sha256: digest('8') },
  ]) {
    assert.throws(() => validateCommand(
      'advance_conversation_generation', bindCommand(mutation),
    ));
  }
  for (const field of [
    'reconciliation_scan_id', 'reconciliation_scan_lease_token',
    'reconciliation_expected_after_message_id', 'reconciliation_page_binding_sha256',
  ]) {
    assert.throws(() => validateCommand('advance_conversation_generation', {
      ...reconciliationBindCommand(),
      [field]: null,
    }));
  }
  assert.throws(() => validateCommand('advance_conversation_generation', {
    ...reconciliationBindCommand(),
    reconciliation_page_binding_sha256: digest('A'),
  }));
});

test('provider-neutral contract rejects unbound or non-exact durable duplicate bundles', () => {
  assert.throws(() => resultEnvelope(
    'claim_business_event',
    'duplicate_or_conflict',
    'duplicate_completed',
    {
      claim_id: 'bev_claim_0001', job_id: 'job_calapres_0001',
      observation_id: 'obs_calapres_0001', audit_id: 'aud_observation_0001',
    },
  ), /completed business result must contain exactly/);
  const command = bindCommand();
  assert.throws(() => resultEnvelope(
    'advance_conversation_generation',
    'duplicate_or_conflict',
    'duplicate_ingress_bound',
    {
      request_claim_id: command.request_claim_id,
      business_claim_id: command.business_claim_id,
      job_id: command.job_id,
      generation: 1,
      due_at: '2026-08-11T15:01:00.000Z',
      state: 'completed',
      ...expectedControl(command),
      email: 'must-not-cross-the-atomic-boundary@example.invalid',
    },
  ), /durable job binding result must contain exactly|prohibited durable field/);
  assert.throws(() => resultEnvelope(
    'claim_chatwoot_reconciliation_scan', 'committed', 'scan_lease_claimed', null,
  ), /scan lease result must be an object/);
  assert.throws(() => resultEnvelope(
    'compare_and_advance_chatwoot_message_cursor', 'committed', 'unverified_cursor', {},
  ), /cursor result outcome is invalid/);
  assert.throws(() => resultEnvelope(
    'read_chatwoot_reconciliation_cursor', 'committed', 'cursor_read', {
      account_id: 179973,
      inbox_id: 128058,
      channel: 'whatsapp',
      conversation_id: '700001',
      scan_id: 'cwrs_aaaaaaaaaaaaaaaaaaaaaaaa',
      current_after_message_id: 0,
      activation_floor_at: '2026-08-12T00:00:00.000Z',
      activation_policy_version: '2026-08-12-v1',
      lease_token: 'must_not_leave_storage',
    },
  ), /must contain exactly/);
});

test('reconciliation scan command is pinned to Calapres route and activation policy', () => {
  for (const [inboxId, channel] of [
    [128031, 'instagram'], [128033, 'tiktok'], [128058, 'whatsapp'], [128326, 'email'],
  ]) {
    assert.doesNotThrow(() => validateCommand('claim_chatwoot_reconciliation_scan',
      reconciliationScanCommand({ inbox_id: inboxId, channel })));
  }
  for (const mutation of [
    { brand_id: 'other' },
    { account_id: 179974 },
    { inbox_id: 128031, channel: 'whatsapp' },
    { activation_floor_at: '2026-08-12T00:00:00.001Z' },
    { activation_policy_version: '2026-08-12-v2' },
    { customer_egress_allowed: true },
    { lease_duration_seconds: 29 },
    { max_pages: 101 },
  ]) {
    assert.throws(() => validateCommand(
      'claim_chatwoot_reconciliation_scan', reconciliationScanCommand(mutation),
    ));
  }
  assert.throws(() => validateCommand('claim_chatwoot_reconciliation_scan', {
    ...reconciliationScanCommand(),
    now: '2099-01-01T00:00:00.000Z',
  }), /must contain exactly/);
});

test('reconciliation cursor read command is exact, source-only, and pinned to a live scan route',
  () => {
    for (const [inboxId, channel] of [
      [128031, 'instagram'], [128033, 'tiktok'], [128058, 'whatsapp'], [128326, 'email'],
    ]) {
      assert.doesNotThrow(() => validateCommand(
        'read_chatwoot_reconciliation_cursor',
        reconciliationCursorReadCommand({ inbox_id: inboxId, channel }),
      ));
    }
    for (const mutation of [
      { brand_id: 'other' },
      { account_id: 179974 },
      { inbox_id: 128031, channel: 'whatsapp' },
      { conversation_id: '0' },
      { conversation_id: '9007199254740992' },
      { scan_id: 'cwrs_broken' },
      { lease_token: 'x' },
      { activation_floor_at: '2026-08-12T00:00:00.001Z' },
      { activation_policy_version: '2026-08-12-v2' },
      { customer_egress_allowed: true },
    ]) {
      assert.throws(() => validateCommand(
        'read_chatwoot_reconciliation_cursor',
        reconciliationCursorReadCommand(mutation),
      ));
    }
    for (const extra of ['now', 'read_at', 'lease_expires_at', 'lease_owner_id']) {
      assert.throws(() => validateCommand('read_chatwoot_reconciliation_cursor', {
        ...reconciliationCursorReadCommand(),
        [extra]: extra === 'lease_owner_id'
          ? 'edge_reconciliation_worker_1' : '2099-01-01T00:00:00.000Z',
      }), /must contain exactly/);
    }
  });

test('cursor read returns zero only under the current lease and never mutates source state',
  async () => {
    const time = clockHarness(Date.parse('2026-08-12T01:00:00.000Z'));
    const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
    await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
    const before = await storage.snapshot();
    const result = await storage.read_chatwoot_reconciliation_cursor(
      reconciliationCursorReadCommand(),
    );
    assert.equal(result.status, 'committed');
    assert.equal(result.outcome, 'cursor_read');
    assert.deepEqual(result.value, {
      account_id: 179973,
      inbox_id: 128058,
      channel: 'whatsapp',
      conversation_id: '700001',
      scan_id: 'cwrs_aaaaaaaaaaaaaaaaaaaaaaaa',
      current_after_message_id: 0,
      activation_floor_at: '2026-08-12T00:00:00.000Z',
      activation_policy_version: '2026-08-12-v1',
    });
    assert.deepEqual(await storage.snapshot(), before);
    assert.doesNotMatch(JSON.stringify(result),
      /lease_token|lease_owner|email|phone|content|raw_message|transcript/i);
  });

test('cursor read reflects an atomic advance and rejects stale, expired, and cross-inbox leases',
  async () => {
    const { storage, time } = await boundStorage();
    time.set('2026-08-12T01:00:00.000Z');
    await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
    await storage.compare_and_advance_chatwoot_message_cursor(reconciliationCursorCommand());
    const current = await storage.read_chatwoot_reconciliation_cursor(
      reconciliationCursorReadCommand(),
    );
    assert.equal(current.value.current_after_message_id, 800001);

    for (const command of [
      reconciliationCursorReadCommand({ lease_token: 'reconciliation_lease_wrong' }),
      reconciliationCursorReadCommand({ scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb' }),
      reconciliationCursorReadCommand({ inbox_id: 128031, channel: 'instagram' }),
    ]) {
      const denied = await storage.read_chatwoot_reconciliation_cursor(command);
      assert.equal(denied.status, 'duplicate_or_conflict');
      assert.equal(denied.outcome, 'scan_lease_not_owned');
      assert.equal(denied.value, null);
    }

    time.advance(301);
    const expired = await storage.read_chatwoot_reconciliation_cursor(
      reconciliationCursorReadCommand(),
    );
    assert.equal(expired.outcome, 'scan_lease_not_owned');
    assert.equal(expired.value, null);

    const replacement = reconciliationScanCommand({
      scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
      lease_owner_id: 'edge_reconciliation_worker_2',
      lease_token: 'reconciliation_lease_2',
    });
    assert.equal((await storage.claim_chatwoot_reconciliation_scan(replacement)).outcome,
      'scan_lease_recovered');
    assert.equal((await storage.read_chatwoot_reconciliation_cursor(
      reconciliationCursorReadCommand(),
    )).outcome, 'scan_lease_not_owned');
    const recoveredRead = await storage.read_chatwoot_reconciliation_cursor(
      reconciliationCursorReadCommand({
        scan_id: replacement.scan_id,
        lease_token: replacement.lease_token,
      }),
    );
    assert.equal(recoveredRead.outcome, 'cursor_read');
    assert.equal(recoveredRead.value.current_after_message_id, 800001);
  });

test('reconciliation scan lease uses DB clock, reconciles same token, and blocks a live rival',
  async () => {
    const time = clockHarness(Date.parse('2026-08-12T01:00:00.000Z'));
    const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
    const claimed = await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
    assert.equal(claimed.outcome, 'scan_lease_claimed');
    assert.equal(claimed.value.lease_claimed_at, '2026-08-12T01:00:00.000Z');
    assert.equal(claimed.value.lease_expires_at, '2026-08-12T01:05:00.000Z');
    assert.equal((await storage.claim_chatwoot_reconciliation_scan(
      reconciliationScanCommand())).outcome, 'scan_lease_owned');
    assert.equal((await storage.claim_chatwoot_reconciliation_scan(
      reconciliationScanCommand({ max_pages: 49 }))).outcome, 'scan_binding_mismatch');
    const rival = await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand({
      scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
      lease_owner_id: 'edge_reconciliation_worker_2',
      lease_token: 'reconciliation_lease_2',
    }));
    assert.equal(rival.outcome, 'scan_retry_later');
    assert.equal(rival.value.retry_after_at, claimed.value.lease_expires_at);
    assert.doesNotMatch(JSON.stringify(claimed.value),
      /email|phone|raw_message|secret|transcript/i);
  });

test('expired reconciliation scan lease has one recovery winner and identifiers cannot cross inboxes',
  async () => {
    const time = clockHarness(Date.parse('2026-08-12T01:00:00.000Z'));
    const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
    await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
    const crossScan = await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand({
      inbox_id: 128031, channel: 'instagram', lease_token: 'reconciliation_lease_cross_1',
    }));
    assert.equal(crossScan.outcome, 'scan_id_conflict');
    const crossToken = await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand({
      inbox_id: 128031, channel: 'instagram',
      scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
    }));
    assert.equal(crossToken.outcome, 'scan_lease_token_conflict');
    time.advance(301);
    const attempts = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand({
        scan_id: `cwrs_${index.toString(16).padStart(24, '0')}`,
        lease_owner_id: `edge_reconciliation_worker_${index + 10}`,
        lease_token: `reconciliation_lease_${index + 10}`,
      }))));
    assert.equal(attempts.filter((result) => result.outcome === 'scan_lease_recovered').length, 1);
    assert.equal(attempts.filter((result) => result.outcome === 'scan_retry_later').length, 19);
    assert.equal((await storage.snapshot()).reconciliation_scan_lease_count, 1);
  });

test('queued reconciliation work observes authoritative time only after serialization', async () => {
  const recoveryTime = clockHarness(Date.parse('2026-08-12T01:00:00.000Z'));
  const recoveryStorage = new InMemoryAtomicStorage({}, { clock: recoveryTime.clock });
  await recoveryStorage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
  let releaseRecovery;
  recoveryStorage._tail = new Promise((resolve) => { releaseRecovery = resolve; });
  const waitingRecovery = recoveryStorage.claim_chatwoot_reconciliation_scan(
    reconciliationScanCommand({
      scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
      lease_owner_id: 'edge_reconciliation_worker_2',
      lease_token: 'reconciliation_lease_2',
    }),
  );
  recoveryTime.advance(301);
  releaseRecovery();
  const recovered = await waitingRecovery;
  assert.equal(recovered.outcome, 'scan_lease_recovered');
  assert.equal(recovered.value.lease_claimed_at, '2026-08-12T01:05:01.000Z');
  assert.equal(recovered.value.lease_expires_at, '2026-08-12T01:10:01.000Z');

  const cursorTime = clockHarness(Date.parse('2026-08-12T01:00:00.000Z'));
  const cursorStorage = new InMemoryAtomicStorage({}, { clock: cursorTime.clock });
  await cursorStorage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
  await cursorStorage.claim_request_replay(reconciliationRequestCommand());
  await cursorStorage.claim_business_event(businessCommand());
  assert.equal(
    (await cursorStorage.advance_conversation_generation(reconciliationBindCommand())).outcome,
    'ingress_bound',
  );
  let releaseCursor;
  cursorStorage._tail = new Promise((resolve) => { releaseCursor = resolve; });
  const waitingCursor = cursorStorage.compare_and_advance_chatwoot_message_cursor(
    reconciliationCursorCommand(),
  );
  cursorTime.advance(301);
  releaseCursor();
  const expired = await waitingCursor;
  assert.equal(expired.status, 'duplicate_or_conflict');
  assert.equal(expired.outcome, 'scan_lease_not_owned');
  assert.equal((await cursorStorage.snapshot()).reconciliation_cursor_commit_count, 0);
});

test('reconciliation cursor contract requires exact, ordered, bounded per-row proofs', () => {
  assert.doesNotThrow(() => validateCommand(
    'compare_and_advance_chatwoot_message_cursor', reconciliationCursorCommand(),
  ));
  const second = reconciliationExcludedProof();
  assert.doesNotThrow(() => validateCommand(
    'compare_and_advance_chatwoot_message_cursor',
    reconciliationCursorCommand({
      proof_rows: [reconciliationCandidateProof(), second],
      new_after_message_id: 800002,
      row_count: 2,
    }),
  ));
  const attacks = [
    { customer_egress_allowed: true },
    { account_id: 179974 },
    { inbox_id: 128031, channel: 'whatsapp' },
    { activation_floor_at: '2026-08-12T00:00:00.001Z' },
    { activation_policy_version: '2026-08-12-v2' },
    { conversation_id: '0900' },
    { conversation_id: '9007199254740992' },
    { expected_after_message_id: 9007199254740992 },
    { new_after_message_id: 9007199254740992 },
    { row_count: 2 },
    { expected_after_message_id: 800001 },
    { new_after_message_id: 800000 },
    { proof_rows: [reconciliationCandidateProof({ message_id: '9007199254740992' })],
      new_after_message_id: Number.MAX_SAFE_INTEGER },
    { proof_rows: [reconciliationCandidateProof(), reconciliationCandidateProof()],
      row_count: 2 },
    { proof_rows: [{ ...reconciliationCandidateProof(), content: 'must-not-cross' }] },
    { proof_rows: [reconciliationExcludedProof(), reconciliationCandidateProof()],
      new_after_message_id: 800001, row_count: 2 },
    { proof_rows: Array.from({ length: 100 }, (_, index) => reconciliationExcludedProof({
      message_id: String(800001 + index),
    })), new_after_message_id: 800100, row_count: 100 },
  ];
  for (const attack of attacks) {
    assert.throws(() => validateCommand(
      'compare_and_advance_chatwoot_message_cursor',
      reconciliationCursorCommand(attack),
    ));
  }
  for (const attack of [
    { reason_code: 'outgoing_message' },
    { event_identity_key_version: 'calapres-identity-hmac-v1' },
    { sender_type: 'unknown' },
  ]) {
    const proof = reconciliationExcludedProof(attack);
    assert.throws(() => validateCommand(
      'compare_and_advance_chatwoot_message_cursor',
      reconciliationCursorCommand({
        expected_after_message_id: 800001,
        proof_rows: [proof],
        new_after_message_id: 800002,
      }),
    ));
  }
  assert.throws(() => validateCommand('compare_and_advance_chatwoot_message_cursor', {
    ...reconciliationCursorCommand(),
    now: '2099-01-01T00:00:00.000Z',
  }), /must contain exactly/);
});

test('cursor advances only under the live scan and exact durable/exclusion proofs', async () => {
  const { storage, time } = await boundStorage();
  time.set('2026-08-12T01:00:00.000Z');
  assert.equal((await storage.claim_chatwoot_reconciliation_scan(
    reconciliationScanCommand())).outcome, 'scan_lease_claimed');
  const firstCommand = reconciliationCursorCommand();
  const first = await storage.compare_and_advance_chatwoot_message_cursor(firstCommand);
  assert.equal(first.outcome, 'cursor_advanced');
  assert.equal(first.value.advanced_at, '2026-08-12T01:00:00.000Z');
  assert.doesNotMatch(JSON.stringify(first), /email|phone|content|raw_message|transcript/i);

  const duplicate = await storage.compare_and_advance_chatwoot_message_cursor(firstCommand);
  assert.equal(duplicate.outcome, 'duplicate_cursor_advance');
  assert.deepEqual(duplicate.value, first.value);

  const secondCommand = reconciliationCursorCommand({
    expected_after_message_id: 800001,
    proof_rows: [reconciliationExcludedProof()],
    new_after_message_id: 800002,
    page_binding_sha256: digest('6'),
    outcome_digest: digest('7'),
  });
  assert.equal((await storage.compare_and_advance_chatwoot_message_cursor(
    secondCommand)).outcome, 'cursor_advanced');
  assert.equal((await storage.compare_and_advance_chatwoot_message_cursor(
    firstCommand)).outcome, 'duplicate_cursor_advance');
  assert.deepEqual(await storage.snapshot(), {
    ...(await storage.snapshot()),
    reconciliation_scan_lease_count: 1,
    reconciliation_cursor_count: 1,
    reconciliation_cursor_commit_count: 2,
  });
});

test('cursor fails closed for wrong, lost, or expired scan leases and stale cursors', async () => {
  const { storage, time } = await boundStorage();
  time.set('2026-08-12T01:00:00.000Z');
  await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
  for (const command of [
    reconciliationCursorCommand({ lease_token: 'reconciliation_lease_wrong' }),
    reconciliationCursorCommand({ scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb' }),
  ]) {
    const result = await storage.compare_and_advance_chatwoot_message_cursor(command);
    assert.equal(result.outcome, 'scan_lease_not_owned');
  }
  time.advance(301);
  assert.equal((await storage.compare_and_advance_chatwoot_message_cursor(
    reconciliationCursorCommand())).outcome, 'scan_lease_not_owned');
  assert.equal((await storage.snapshot()).reconciliation_cursor_count, 0);

  time.set('2026-08-12T01:10:00.000Z');
  await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand({
    scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
    lease_owner_id: 'edge_reconciliation_worker_2',
    lease_token: 'reconciliation_lease_2',
  }));
  const advanced = reconciliationCursorCommand({
    scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
    lease_token: 'reconciliation_lease_2',
  });
  assert.equal((await storage.compare_and_advance_chatwoot_message_cursor(
    advanced)).outcome, 'cursor_advanced');
  const stale = await storage.compare_and_advance_chatwoot_message_cursor(
    reconciliationCursorCommand({
      scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
      lease_token: 'reconciliation_lease_2',
      expected_after_message_id: 800000,
      proof_rows: [reconciliationExcludedProof()],
      new_after_message_id: 800002,
    }),
  );
  assert.equal(stale.outcome, 'cursor_compare_failed');
});

test('cursor verifies candidate claim, event alias, job binding, generation, and retention',
  async () => {
    for (const mutation of [
      { event_identity_fingerprint: digest('0') },
      { event_identity_key_version: 'calapres-identity-hmac-v2' },
      { business_claim_id: 'bev_claim_wrong0' },
      { job_id: 'job_calapres_wrong0' },
      { generation: 2 },
      { message_id: '800003' },
    ]) {
      const { storage, time } = await boundStorage();
      time.set('2026-08-12T01:00:00.000Z');
      await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
      const proof = reconciliationCandidateProof(mutation);
      const command = reconciliationCursorCommand({
        proof_rows: [proof],
        new_after_message_id: Number(proof.message_id),
      });
      const result = await storage.compare_and_advance_chatwoot_message_cursor(command);
      assert.equal(result.status, 'unknown');
      assert.equal(result.outcome, 'cursor_durable_proof_invalid');
      assert.equal((await storage.snapshot()).reconciliation_cursor_count, 0);
    }
  });

test('cursor accepts a retained durable event alias after controlled key rotation', async () => {
  const { storage, time } = await boundStorage();
  rotateReference(storage, registryV2());
  const healed = await storage.claim_business_event(businessCommand({
    active_fingerprint: digest('9'),
    active_key_version: 'hmac-sha256-v2',
    retained_fingerprints: [{ fingerprint: digest('b'), key_version: 'hmac-sha256-v1' }],
    key_registry_version: 'calapres-storage-keys-v2',
  }));
  assert.equal(healed.outcome, 'prepared_owned');
  time.set('2026-08-12T01:00:00.000Z');
  await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
  const result = await storage.compare_and_advance_chatwoot_message_cursor(
    reconciliationCursorCommand({
      proof_rows: [reconciliationCandidateProof({
        event_identity_key_version: 'calapres-identity-hmac-v2',
        event_identity_fingerprint: digest('9'),
        outcome: 'durable_duplicate',
      })],
    }),
  );
  assert.equal(result.outcome, 'cursor_advanced');
});

test('durable event proof remains valid for the full job retention window', async () => {
  const { storage, time } = await boundStorage();
  time.set('2026-08-20T01:00:00.000Z');
  assert.equal((await storage.claim_chatwoot_reconciliation_scan(
    reconciliationScanCommand())).outcome, 'scan_lease_claimed');
  const result = await storage.compare_and_advance_chatwoot_message_cursor(
    reconciliationCursorCommand(),
  );
  assert.equal(result.outcome, 'cursor_advanced');
});

test('binding fails closed when business-event key coverage cannot reach job retention',
  async () => {
    const shortCoverageRegistry = {
      registry_version: 'calapres-storage-keys-v1',
      namespaces: Object.fromEntries(
        ['request_replay', 'business_event', 'message_identity'].map((namespace) => [
          namespace,
          {
            active_key_version: 'hmac-sha256-v1',
            retained_key_versions: [],
            coverage_until_by_version: {
              'hmac-sha256-v1': namespace === 'business_event'
                ? '2026-08-12T15:00:00.000Z' : null,
            },
          },
        ]),
      ),
    };
    const time = clockHarness();
    const storage = new InMemoryAtomicStorage({}, {
      clock: time.clock,
      keyRegistry: shortCoverageRegistry,
    });
    await storage.claim_request_replay(requestCommand());
    await storage.claim_business_event(businessCommand());
    const result = await storage.advance_conversation_generation(bindCommand());
    assert.equal(result.status, 'unknown');
    assert.equal(result.error_code, 'key_coverage_incomplete');
    assert.equal((await storage.snapshot()).job_count, 0);
  });

test('concurrent cursor CAS has one writer and exact retries reconcile without a second write',
  async () => {
    const { storage, time } = await boundStorage();
    time.set('2026-08-12T01:00:00.000Z');
    await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
    const command = reconciliationCursorCommand();
    const exact = await Promise.all(Array.from({ length: 20 }, () =>
      storage.compare_and_advance_chatwoot_message_cursor(command)));
    assert.equal(exact.filter((result) => result.outcome === 'cursor_advanced').length, 1);
    assert.equal(exact.filter((result) => result.outcome === 'duplicate_cursor_advance').length, 19);
    assert.equal((await storage.snapshot()).reconciliation_cursor_commit_count, 1);

    const conflicting = await Promise.all(Array.from({ length: 10 }, (_, index) =>
      storage.compare_and_advance_chatwoot_message_cursor(reconciliationCursorCommand({
        expected_after_message_id: 800001,
        proof_rows: [reconciliationExcludedProof()],
        new_after_message_id: 800002,
        page_binding_sha256: digest(String(index % 10)),
        outcome_digest: digest(String((index + 1) % 10)),
      }))));
    assert.equal(conflicting.filter((result) => result.outcome === 'cursor_advanced').length, 1);
    assert.equal(conflicting.filter(
      (result) => result.outcome === 'cursor_finalization_conflict').length, 9);
    assert.equal((await storage.snapshot()).reconciliation_cursor_commit_count, 2);
  });

test('request replay uses injected authoritative clock and a processing lease', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  const result = await storage.claim_request_replay(requestCommand());
  assert.equal(result.status, 'committed');
  assert.equal(result.outcome, 'processing_claimed');
  assert.equal(result.value.claimed_at, '2026-08-11T15:00:00.000Z');
  assert.equal(result.value.expires_at, '2026-08-11T15:10:00.000Z');
  assert.equal(result.value.lease_expires_at, '2026-08-11T15:05:00.000Z');
});

test('request provenance mismatch fails before retained-alias healing', async () => {
  const storage = new InMemoryAtomicStorage();
  await storage.claim_request_replay(requestCommand());
  rotateReference(storage, registryV2());
  const rotated = {
    active_fingerprint: digest('2'),
    active_key_version: 'hmac-sha256-v2',
    retained_fingerprints: [{ fingerprint: digest('a'), key_version: 'hmac-sha256-v1' }],
    key_registry_version: 'calapres-storage-keys-v2',
  };
  const before = await storage.snapshot();
  const sourceSwap = await storage.claim_request_replay(reconciliationRequestCommand(rotated));
  assert.equal(sourceSwap.status, 'unknown');
  assert.equal(sourceSwap.outcome, 'request_provenance_mismatch');
  assert.equal(sourceSwap.error_code, 'durable_reference_conflict');
  assert.equal((await storage.snapshot()).request_replay_alias_count,
    before.request_replay_alias_count);

  const bindingSwap = await storage.claim_request_replay(requestCommand({
    ...rotated,
    source_binding_sha256: digest('1'),
  }));
  assert.equal(bindingSwap.status, 'unknown');
  assert.equal(bindingSwap.outcome, 'request_provenance_mismatch');
  assert.equal((await storage.snapshot()).request_replay_alias_count,
    before.request_replay_alias_count);
});

test('backdating or future-dating cannot influence request, event, generation, or retry clocks', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  await storage.claim_business_event(businessCommand());
  const bound = await storage.advance_conversation_generation(bindCommand({ delay_seconds: 45 }));
  assert.equal(bound.value.due_at, '2026-08-11T15:00:45.000Z');
  time.advance(45);
  await storage.claim_due_conversation_retry(workerCommand());
  const scheduled = await storage.schedule_conversation_retry({
    brand_id: 'calapres', job_id: 'job_calapres_0001', conversation_id: '700001',
    expected_generation: 1, retry_idempotency_key: 'retry_key_0001', max_attempts: 3,
    safe_error_code: 'synthetic_failure', delay_seconds: 30, retention_seconds: 86400,
    expected_worker_id: 'core_worker_0001', expected_lease_token: 'job_lease_0001',
  });
  assert.equal(scheduled.value.next_attempt_at, '2026-08-11T15:01:15.000Z');
});

test('same request token reconciles while another token receives retry_later', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  const same = await storage.claim_request_replay(requestCommand());
  assert.equal(same.outcome, 'processing_owned');
  const other = await storage.claim_request_replay(requestCommand({
    lease_owner_id: 'edge_worker_0002', lease_token: 'request_lease_0002',
  }));
  assert.equal(other.status, 'duplicate_or_conflict');
  assert.equal(other.outcome, 'retry_later');
  assert.equal(other.value.retry_after_at, '2026-08-11T15:05:00.000Z');
});

test('expired request processing lease has exactly one recovery winner', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  time.advance(301);
  const attempts = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    storage.claim_request_replay(requestCommand({
      lease_owner_id: `edge_recovery_${index}`,
      lease_token: `request_recovery_${index}`,
    })),
  ));
  assert.equal(attempts.filter((result) => result.outcome === 'processing_recovered').length, 1);
  assert.equal(attempts.filter((result) => result.outcome === 'retry_later').length, 11);
});

test('business-event lease is token-bound and recoverable', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_business_event(businessCommand());
  const same = await storage.claim_business_event(businessCommand());
  assert.equal(same.outcome, 'prepared_owned');
  const held = await storage.claim_business_event(businessCommand({
    lease_owner_id: 'edge_worker_0002', lease_token: 'business_lease_0002',
  }));
  assert.equal(held.outcome, 'business_retry_later');
  time.advance(301);
  const recovered = await storage.claim_business_event(businessCommand({
    lease_owner_id: 'edge_worker_0002', lease_token: 'business_lease_0002',
  }));
  assert.equal(recovered.outcome, 'recovered_prepared');
});

test('combined ingress commit binds replay, business event, generation, job, and DB due_at', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  await storage.claim_business_event(businessCommand());
  const result = await storage.advance_conversation_generation(bindCommand());
  assert.equal(result.status, 'committed');
  assert.equal(result.outcome, 'ingress_bound');
  assert.deepEqual(result.value, {
    request_claim_id: 'rr_claim_0001', business_claim_id: 'bev_claim_0001',
    job_id: 'job_calapres_0001', conversation_id: '700001', generation: 1,
    due_at: '2026-08-11T15:01:00.000Z', state: 'pending',
    ...expectedIngressProvenance(),
    ...expectedControl(),
  });
  const duplicate = await storage.claim_request_replay(requestCommand({
    lease_owner_id: 'delivery_retry_0001', lease_token: 'delivery_retry_token_0001',
  }));
  assert.equal(duplicate.outcome, 'duplicate_completed');
  assert.equal(duplicate.value.job_id, 'job_calapres_0001');
  assert.equal(duplicate.value.due_at, result.value.due_at);
});

test('crash after replay claim is recoverable and never returns duplicate_completed', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  const held = await storage.claim_request_replay(requestCommand({
    lease_owner_id: 'retry_worker_0001', lease_token: 'retry_token_0001',
  }));
  assert.equal(held.outcome, 'retry_later');
  assert.notEqual(held.outcome, 'duplicate_completed');
  time.advance(301);
  assert.equal((await storage.claim_request_replay(requestCommand({
    lease_owner_id: 'retry_worker_0001', lease_token: 'retry_token_0001',
  }))).outcome, 'processing_recovered');
});

test('crash after business claim resumes both leases and commits one job', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  await storage.claim_business_event(businessCommand());
  time.advance(301);
  await storage.claim_request_replay(requestCommand({
    lease_owner_id: 'edge_recovery_0001', lease_token: 'request_recovery_0001',
  }));
  await storage.claim_business_event(businessCommand({
    lease_owner_id: 'edge_recovery_0001', lease_token: 'business_recovery_0001',
  }));
  const bind = await storage.advance_conversation_generation(bindCommand({
    request_lease_owner_id: 'edge_recovery_0001', request_lease_token: 'request_recovery_0001',
    business_lease_owner_id: 'edge_recovery_0001', business_lease_token: 'business_recovery_0001',
  }));
  assert.equal(bind.outcome, 'ingress_bound');
  assert.equal((await storage.snapshot()).job_count, 1);
});

test('timeout after generation and before HTTP ack reconciles through durable binding', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  await storage.claim_business_event(businessCommand());
  const first = await storage.advance_conversation_generation(bindCommand());
  const retry = await storage.advance_conversation_generation(bindCommand());
  assert.equal(first.outcome, 'ingress_bound');
  assert.equal(retry.outcome, 'duplicate_ingress_bound');
  assert.equal(retry.value.job_id, first.value.job_id);
  assert.equal((await storage.snapshot()).job_count, 1);
});

test('reconciliation op4 authorizes only its first effect and replays from durable provenance',
  async () => {
    const time = clockHarness(Date.parse('2026-08-12T01:00:00.000Z'));
    const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
    await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
    await storage.claim_request_replay(reconciliationRequestCommand());
    await storage.claim_business_event(businessCommand());
    const command = reconciliationBindCommand();
    const first = await storage.advance_conversation_generation(command);
    assert.equal(first.outcome, 'ingress_bound');
    assert.equal(first.value.reconciliation_scan_id, command.reconciliation_scan_id);
    assert.equal(first.value.reconciliation_expected_after_message_id, 0);
    assert.equal(first.value.reconciliation_page_binding_sha256, digest('8'));
    assert.doesNotMatch(JSON.stringify(first.value), /reconciliation_scan_lease_token/);

    await storage.compare_and_advance_chatwoot_message_cursor(reconciliationCursorCommand());
    assert.equal((await storage.advance_conversation_generation(command)).outcome,
      'duplicate_ingress_bound');
    time.advance(301);
    const expiredLeaseReplay = await storage.advance_conversation_generation(command);
    assert.equal(expiredLeaseReplay.outcome, 'duplicate_ingress_bound');
    assert.doesNotMatch(JSON.stringify(expiredLeaseReplay.value), /lease_token/);

    const pageSwap = await storage.advance_conversation_generation({
      ...command,
      reconciliation_page_binding_sha256: digest('6'),
    });
    assert.equal(pageSwap.status, 'unknown');
    assert.equal(pageSwap.outcome, 'request_ingress_binding_mismatch');
    const beforeProvenanceSwaps = await storage.snapshot();
    const bindingSwap = await storage.advance_conversation_generation({
      ...command,
      source_binding_sha256: digest('6'),
    });
    assert.equal(bindingSwap.outcome, 'request_provenance_mismatch');
    const sourceSwap = await storage.advance_conversation_generation(bindCommand());
    assert.equal(sourceSwap.outcome, 'request_provenance_mismatch');
    assert.equal((await storage.snapshot()).conversation_message_alias_count,
      beforeProvenanceSwaps.conversation_message_alias_count);

    await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand({
      scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
      lease_owner_id: 'edge_reconciliation_worker_2',
      lease_token: 'reconciliation_lease_2',
    }));
    await storage.claim_request_replay(reconciliationRequestCommand({
      claim_id: 'rr_claim_0002', active_fingerprint: digest('9'),
      lease_token: 'request_lease_0002',
    }));
    const beforeCursorMismatch = await storage.snapshot();
    const cursorMismatch = await storage.advance_conversation_generation(
      reconciliationBindCommand({
        request_claim_id: 'rr_claim_0002', request_lease_token: 'request_lease_0002',
        reconciliation_scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
        reconciliation_scan_lease_token: 'reconciliation_lease_2',
      }),
    );
    assert.equal(cursorMismatch.status, 'unknown');
    assert.equal(cursorMismatch.outcome, 'reconciliation_ingress_binding_invalid');
    assert.equal((await storage.snapshot()).job_count, beforeCursorMismatch.job_count);
    assert.equal((await storage.snapshot()).conversation_message_alias_count,
      beforeCursorMismatch.conversation_message_alias_count);

    time.advance(301);
    await storage.claim_request_replay(reconciliationRequestCommand({
      claim_id: 'rr_claim_0003', active_fingerprint: digest('5'),
      lease_token: 'request_lease_0003',
    }));
    const expiredNewEffect = await storage.advance_conversation_generation(
      reconciliationBindCommand({
        request_claim_id: 'rr_claim_0003', request_lease_token: 'request_lease_0003',
        reconciliation_scan_id: 'cwrs_bbbbbbbbbbbbbbbbbbbbbbbb',
        reconciliation_scan_lease_token: 'reconciliation_lease_2',
        reconciliation_expected_after_message_id: 800001,
        anchor_message_id: '800002',
        correlation_id: 'calapres:700001:800002',
        message_fingerprint: digest('5'),
      }),
    );
    assert.equal(expiredNewEffect.status, 'unknown');
    assert.equal(expiredNewEffect.outcome, 'reconciliation_ingress_binding_invalid');
    assert.equal((await storage.snapshot()).job_count, 1);
  });

test('concurrent signed webhook and reconciliation requests converge on one source-neutral job',
  async () => {
    const time = clockHarness(Date.parse('2026-08-12T01:00:00.000Z'));
    const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
    await storage.claim_chatwoot_reconciliation_scan(reconciliationScanCommand());
    await storage.claim_request_replay(requestCommand());
    await storage.claim_request_replay(reconciliationRequestCommand({
      claim_id: 'rr_claim_0002', active_fingerprint: digest('9'),
      lease_token: 'request_lease_0002',
    }));
    await storage.claim_business_event(businessCommand());
    const results = await Promise.all([
      storage.advance_conversation_generation(bindCommand()),
      storage.advance_conversation_generation(reconciliationBindCommand({
        request_claim_id: 'rr_claim_0002', request_lease_token: 'request_lease_0002',
      })),
    ]);
    assert.equal(results.filter((result) => result.outcome === 'ingress_bound').length, 1);
    assert.equal(results.filter(
      (result) => result.outcome === 'duplicate_ingress_bound').length, 1);
    assert.equal((await storage.snapshot()).job_count, 1);
    assert.equal((await storage.claim_request_replay(requestCommand())).outcome,
      'duplicate_completed');
    assert.equal((await storage.claim_request_replay(reconciliationRequestCommand({
      claim_id: 'rr_claim_0002', active_fingerprint: digest('9'),
      lease_token: 'request_lease_0002',
    }))).outcome, 'duplicate_completed');
  });

test('new delivery replay can be safely linked to an already-bound business event', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  await storage.claim_business_event(businessCommand());
  await storage.advance_conversation_generation(bindCommand());
  await storage.claim_request_replay(requestCommand({
    claim_id: 'rr_claim_0002', active_fingerprint: digest('9'),
    lease_token: 'request_lease_0002',
  }));
  const linked = await storage.advance_conversation_generation(bindCommand({
    request_claim_id: 'rr_claim_0002', request_lease_token: 'request_lease_0002',
  }));
  assert.equal(linked.outcome, 'duplicate_ingress_bound');
  assert.equal(linked.value.job_id, 'job_calapres_0001');
  const completedReplay = await storage.claim_request_replay(requestCommand({
    claim_id: 'rr_claim_0002', active_fingerprint: digest('9'),
    lease_owner_id: 'retry_owner_0002', lease_token: 'retry_token_0002',
  }));
  assert.equal(completedReplay.outcome, 'duplicate_completed');
});

test('completed business duplicate returns its exact job and atomically links a fresh request', async () => {
  const { storage } = await completedStorage();
  const freshRequest = requestCommand({
    claim_id: 'rr_claim_0002', active_fingerprint: digest('9'),
    lease_owner_id: 'edge_worker_0002', lease_token: 'request_lease_0002',
  });
  assert.equal((await storage.claim_request_replay(freshRequest)).outcome, 'processing_claimed');
  const completedBusiness = await storage.claim_business_event(businessCommand({
    lease_owner_id: 'edge_worker_0002', lease_token: 'business_lease_0002',
  }));
  assert.equal(completedBusiness.outcome, 'duplicate_completed');
  assert.deepEqual(Object.keys(completedBusiness.value).sort(), [
    ...Object.keys(expectedControl()),
    'audit_id', 'claim_id', 'due_at', 'generation', 'job_id', 'lifecycle_status',
    'observation_id', 'state',
  ].sort());
  assert.equal(completedBusiness.value.lifecycle_status, 'completed');
  assert.equal(completedBusiness.value.state, 'completed');
  assert.doesNotMatch(JSON.stringify(completedBusiness.value),
    /email|phone|raw_message|secret|transcript/i);

  const linked = await storage.advance_conversation_generation(bindCommand({
    request_claim_id: freshRequest.claim_id,
    request_lease_owner_id: freshRequest.lease_owner_id,
    request_lease_token: freshRequest.lease_token,
    business_lease_owner_id: 'edge_worker_0002',
    business_lease_token: 'business_lease_0002',
    delay_seconds: completedBusiness.value.delay_seconds,
  }));
  assert.equal(linked.outcome, 'duplicate_ingress_bound');
  assert.equal(linked.value.request_claim_id, freshRequest.claim_id);
  assert.equal(linked.value.job_id, 'job_calapres_0001');
  assert.equal(linked.value.generation, 1);
  assert.equal(linked.value.state, 'completed');
  const replay = await storage.claim_request_replay(freshRequest);
  assert.equal(replay.outcome, 'duplicate_completed');
  assert.equal(replay.value.job_id, linked.value.job_id);
  const completedControl = expectedControl(bindCommand({ delay_seconds: 0 }));
  assert.deepEqual(
    Object.fromEntries(Object.keys(completedControl).map((key) => [key, linked.value[key]])),
    completedControl,
  );
  const snapshot = await storage.snapshot();
  assert.equal(snapshot.job_count, 1);
  assert.equal(snapshot.conversation_head_count, 1);
});

test('completed business claim returns unknown before alias healing when durable evidence is invalid',
  async () => {
    for (const corruption of ['missing_job', 'mismatched_job', 'mismatched_audit']) {
      const { storage } = await completedStorage();
      const jobEntry = [...storage._jobs.entries()][0];
      if (corruption === 'missing_job') storage._jobs.delete(jobEntry[0]);
      else if (corruption === 'mismatched_job') jobEntry[1].state = 'pending';
      else [...storage._audits.values()][0].event_type = 'unrelated_audit';
      rotateReference(storage, registryV2());
      const result = await storage.claim_business_event(businessCommand({
        active_fingerprint: digest('9'), active_key_version: 'hmac-sha256-v2',
        retained_fingerprints: [{ fingerprint: digest('b'), key_version: 'hmac-sha256-v1' }],
        key_registry_version: 'calapres-storage-keys-v2',
        lease_owner_id: 'edge_worker_0002', lease_token: 'business_lease_0002',
      }));
      assert.equal(result.status, 'unknown', corruption);
      assert.equal(result.error_code, 'durable_reference_conflict', corruption);
      assert.equal((await storage.snapshot()).business_event_alias_count, 1, corruption);
    }
  });

test('completed-business reconciliation rejects wrong lease, event, job, and control without linking',
  async () => {
    const { storage } = await completedStorage();
    const freshRequest = requestCommand({
      claim_id: 'rr_claim_0002', active_fingerprint: digest('9'),
      lease_owner_id: 'edge_worker_0002', lease_token: 'request_lease_0002',
    });
    await storage.claim_request_replay(freshRequest);
    await storage.claim_business_event(businessCommand({
      lease_owner_id: 'edge_worker_0002', lease_token: 'business_lease_0002',
    }));
    const command = bindCommand({
      request_claim_id: freshRequest.claim_id,
      request_lease_owner_id: freshRequest.lease_owner_id,
      request_lease_token: freshRequest.lease_token,
      business_lease_owner_id: 'edge_worker_0002',
      business_lease_token: 'business_lease_0002',
      delay_seconds: 0,
    });
    assert.equal((await storage.advance_conversation_generation({
      ...command, request_lease_token: 'request_lease_wrong',
    })).outcome, 'request_lease_not_owned');
    assert.equal((await storage.advance_conversation_generation({
      ...command, event_identity_fingerprint: digest('8'),
    })).outcome, 'event_identity_binding_mismatch');
    assert.equal((await storage.advance_conversation_generation({
      ...command, job_id: 'job_calapres_wrong',
    })).outcome, 'business_binding_mismatch');
    assert.equal((await storage.advance_conversation_generation({
      ...command, baseline_status_fingerprint: digest('7'),
    })).outcome, 'business_binding_mismatch');
    const stillProcessing = await storage.claim_request_replay(freshRequest);
    assert.equal(stillProcessing.outcome, 'processing_owned');
    assert.equal(stillProcessing.value.lifecycle_status, 'processing');
  });

test('concurrent completed-business reconciliation links one request once to one existing job',
  async () => {
    const { storage } = await completedStorage();
    const freshRequest = requestCommand({
      claim_id: 'rr_claim_0002', active_fingerprint: digest('9'),
      lease_owner_id: 'edge_worker_0002', lease_token: 'request_lease_0002',
    });
    await storage.claim_request_replay(freshRequest);
    await storage.claim_business_event(businessCommand({
      lease_owner_id: 'edge_worker_0002', lease_token: 'business_lease_0002',
    }));
    const command = bindCommand({
      request_claim_id: freshRequest.claim_id,
      request_lease_owner_id: freshRequest.lease_owner_id,
      request_lease_token: freshRequest.lease_token,
      business_lease_owner_id: 'edge_worker_0002',
      business_lease_token: 'business_lease_0002',
      delay_seconds: 0,
    });
    const attempts = await Promise.all(Array.from({ length: 20 }, () =>
      storage.advance_conversation_generation(command)));
    assert.equal(attempts.every((result) => result.outcome === 'duplicate_ingress_bound'), true);
    assert.deepEqual(new Set(attempts.map((result) => result.value.job_id)),
      new Set(['job_calapres_0001']));
    const snapshot = await storage.snapshot();
    assert.equal(snapshot.job_count, 1);
    assert.equal(snapshot.conversation_head_count, 1);
    assert.equal((await storage.claim_request_replay(freshRequest)).outcome, 'duplicate_completed');
  });

test('completed-business reconciliation heals retained event and message aliases after key rotation',
  async () => {
    const { storage } = await completedStorage();
    rotateReference(storage, registryV2());
    const freshRequest = requestCommand({
      claim_id: 'rr_claim_0002', active_fingerprint: digest('8'),
      active_key_version: 'hmac-sha256-v2',
      retained_fingerprints: [{ fingerprint: digest('7'), key_version: 'hmac-sha256-v1' }],
      key_registry_version: 'calapres-storage-keys-v2',
      lease_owner_id: 'edge_worker_0002', lease_token: 'request_lease_0002',
    });
    assert.equal((await storage.claim_request_replay(freshRequest)).outcome, 'processing_claimed');
    const completedBusiness = await storage.claim_business_event(businessCommand({
      active_fingerprint: digest('9'), active_key_version: 'hmac-sha256-v2',
      retained_fingerprints: [{ fingerprint: digest('b'), key_version: 'hmac-sha256-v1' }],
      key_registry_version: 'calapres-storage-keys-v2',
      lease_owner_id: 'edge_worker_0002', lease_token: 'business_lease_0002',
    }));
    assert.equal(completedBusiness.outcome, 'duplicate_completed');
    const linked = await storage.advance_conversation_generation(bindCommand({
      request_claim_id: freshRequest.claim_id,
      request_lease_owner_id: freshRequest.lease_owner_id,
      request_lease_token: freshRequest.lease_token,
      business_lease_owner_id: 'edge_worker_0002',
      business_lease_token: 'business_lease_0002',
      event_identity_key_version: 'calapres-identity-hmac-v2',
      event_identity_fingerprint: digest('9'),
      message_fingerprint: digest('a'), active_key_version: 'hmac-sha256-v2',
      retained_message_fingerprints: [
        { fingerprint: digest('d'), key_version: 'hmac-sha256-v1' },
      ],
      key_registry_version: 'calapres-storage-keys-v2',
      delay_seconds: completedBusiness.value.delay_seconds,
    }));
    assert.equal(linked.outcome, 'duplicate_ingress_bound');
    assert.equal(linked.value.event_identity_key_version, 'calapres-identity-hmac-v1');
    assert.equal(linked.value.event_identity_fingerprint, digest('b'));
    assert.equal(linked.value.message_fingerprint, digest('d'));
    const snapshot = await storage.snapshot();
    assert.equal(snapshot.business_event_alias_count, 2);
    assert.equal(snapshot.conversation_message_alias_count, 2);
  });

test('consumer claims next due job without knowing conversation_id', async () => {
  const { storage } = await boundStorage();
  const expected = expectedControl(bindCommand({ delay_seconds: 0 }));
  const owned = await storage.claim_due_conversation_retry(workerCommand());
  assert.equal(owned.outcome, 'job_lease_owned');
  assert.deepEqual(Object.keys(owned.value).sort(), [
    'account_id', 'anchor_message_id', 'attempt_count', 'baseline_assignee_fingerprint',
    'baseline_fingerprint_key_version', 'baseline_status_fingerprint', 'business_claim_id',
    'channel', 'conversation_fingerprint', 'conversation_id', 'correlation_id',
    'delay_policy_version', 'delay_seconds', 'due_at', 'event_identity_fingerprint',
    'event_identity_key_version', 'generation', 'inbox_id', 'job_id', 'knowledge_version',
    'lease_expires_at', 'lease_token', 'message_fingerprint', 'worker_id',
  ]);
  assert.deepEqual(
    Object.fromEntries(Object.keys(expected).map((key) => [key, owned.value[key]])),
    expected,
  );
});

test('durable control bundle is route-bound and event-bound before replay can complete', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  await storage.claim_business_event(businessCommand());
  assert.equal((await storage.advance_conversation_generation(bindCommand({
    event_identity_fingerprint: digest('9'),
  }))).outcome, 'event_identity_binding_mismatch');
  await assert.doesNotReject(async () => validateCommand('advance_conversation_generation', bindCommand({
    inbox_id: 128031,
    channel: 'instagram',
  })));
  assert.throws(() => validateCommand('advance_conversation_generation', bindCommand({
    inbox_id: 128031,
    channel: 'whatsapp',
  })), /allowlisted pair/);
  const bound = await storage.advance_conversation_generation(bindCommand());
  assert.equal(bound.outcome, 'ingress_bound');
  assert.deepEqual(
    Object.fromEntries(Object.keys(expectedControl()).map((key) => [key, bound.value[key]])),
    expectedControl(),
  );
});

test('concurrent consumers have one Core lease winner and same token reconciles', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  await storage.claim_business_event(businessCommand());
  await storage.advance_conversation_generation(bindCommand({ delay_seconds: 0 }));
  const attempts = await Promise.all(Array.from({ length: 20 }, (_, index) =>
    storage.claim_due_conversation_retry(workerCommand({
      worker_id: `core_worker_${String(index).padStart(4, '0')}`,
      lease_token: `job_lease_${String(index).padStart(4, '0')}`,
    })),
  ));
  const winners = attempts.filter((result) => result.outcome === 'job_claimed');
  assert.equal(winners.length, 1);
  const winner = winners[0];
  const reconciled = await storage.claim_due_conversation_retry(workerCommand({
    worker_id: winner.value.worker_id, lease_token: winner.value.lease_token,
  }));
  assert.equal(reconciled.outcome, 'job_lease_owned');
  assert.equal(reconciled.value.job_id, winner.value.job_id);
});

test('expired consumer lease is recovered by one winner', async () => {
  const { storage, time } = await boundStorage();
  time.advance(301);
  const attempts = await Promise.all(Array.from({ length: 10 }, (_, index) =>
    storage.claim_due_conversation_retry(workerCommand({
      worker_id: `recovery_worker_${index}`,
      lease_token: `recovery_lease_${index}`,
    })),
  ));
  assert.equal(attempts.filter((result) => result.outcome === 'job_lease_recovered').length, 1);
});

test('retry scheduling requires exact live worker and token CAS and uses DB delay', async () => {
  const { storage } = await boundStorage();
  const base = {
    brand_id: 'calapres', job_id: 'job_calapres_0001', conversation_id: '700001',
    expected_generation: 1, retry_idempotency_key: 'retry_key_0001', max_attempts: 3,
    safe_error_code: 'provider_unavailable', delay_seconds: 30, retention_seconds: 86400,
    expected_worker_id: 'wrong_worker_0001', expected_lease_token: 'wrong_lease_0001',
  };
  assert.equal((await storage.schedule_conversation_retry(base)).outcome, 'retry_lease_cas_failed');
  const scheduled = await storage.schedule_conversation_retry({
    ...base, expected_worker_id: 'core_worker_0001', expected_lease_token: 'job_lease_0001',
  });
  assert.equal(scheduled.outcome, 'retry_scheduled');
  assert.equal(scheduled.value.next_attempt_at, '2026-08-11T15:00:30.000Z');
  assert.equal((await storage.schedule_conversation_retry({
    ...base, expected_worker_id: 'core_worker_0001', expected_lease_token: 'job_lease_0001',
  })).outcome, 'duplicate_retry_schedule');
});

test('completion requires current generation and active job lease then commits sanitized records', async () => {
  const { storage } = await boundStorage();
  assert.equal((await storage.complete_business_event(completionCommand({
    expected_generation: 2,
  }))).outcome, 'stale_generation');
  const completed = await storage.complete_business_event(completionCommand());
  assert.equal(completed.outcome, 'completed');
  const duplicate = await storage.complete_business_event(completionCommand());
  assert.equal(duplicate.outcome, 'duplicate_completed');
  const snapshot = await storage.snapshot();
  assert.equal(snapshot.observation_count, 1);
  assert.equal(snapshot.audit_count, 1);
});

test('completion creates incident atomically only for owner escalation', async () => {
  const { storage } = await boundStorage();
  const result = await storage.complete_business_event(completionCommand({
    outcome_class: 'owner_escalation', reason_code: 'owner_review_required',
    risk_level: 'high', risk_digest: digest('1'), incident_id: 'inc_calapres_0001',
  }));
  assert.equal(result.outcome, 'completed');
  assert.equal((await storage.snapshot()).incident_count, 1);
});

test('key registry rejects missing rotation aliases without caller timestamp evidence', async () => {
  const storage = new InMemoryAtomicStorage({}, { keyRegistry: registryV2() });
  const result = await storage.claim_request_replay(requestCommand({
    active_fingerprint: digest('2'), active_key_version: 'hmac-sha256-v2',
    key_registry_version: 'calapres-storage-keys-v2',
  }));
  assert.equal(result.status, 'unknown');
  assert.equal(result.error_code, 'key_coverage_incomplete');
});

test('rotation heals a missing v2 alias for the same v1 replay claim', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  rotateReference(storage, registryV2());
  const rotated = await storage.claim_request_replay(requestCommand({
    active_fingerprint: digest('2'), active_key_version: 'hmac-sha256-v2',
    retained_fingerprints: [{ key_version: 'hmac-sha256-v1', fingerprint: digest('a') }],
    key_registry_version: 'calapres-storage-keys-v2',
  }));
  assert.equal(rotated.outcome, 'processing_owned');
  assert.equal((await storage.snapshot()).request_replay_alias_count, 2);
});

test('rotation detects aliases that resolve to two live claims', async () => {
  const time = clockHarness();
  const storage = new InMemoryAtomicStorage({}, { clock: time.clock });
  await storage.claim_request_replay(requestCommand());
  await storage.claim_request_replay(requestCommand({
    claim_id: 'rr_claim_0002', active_fingerprint: digest('2'), lease_token: 'request_lease_0002',
  }));
  rotateReference(storage, registryV2());
  await storage.claim_request_replay(requestCommand({
    claim_id: 'rr_claim_0002', active_fingerprint: digest('2'),
    active_key_version: 'hmac-sha256-v2',
    retained_fingerprints: [{ key_version: 'hmac-sha256-v1', fingerprint: digest('2') }],
    key_registry_version: 'calapres-storage-keys-v2', lease_token: 'request_lease_0002',
  }));
  const conflict = await storage.claim_request_replay(requestCommand({
    active_fingerprint: digest('2'), active_key_version: 'hmac-sha256-v2',
    retained_fingerprints: [{ key_version: 'hmac-sha256-v1', fingerprint: digest('a') }],
    key_registry_version: 'calapres-storage-keys-v2',
  }));
  assert.equal(conflict.status, 'unknown');
  assert.equal(conflict.error_code, 'key_alias_conflict');
});

test('registry coverage must outlive the DB-computed claim window', async () => {
  const storage = new InMemoryAtomicStorage({}, {
    keyRegistry: registryV2('2026-08-11T15:05:00.000Z'),
    clock: () => BASE_TIME,
  });
  const result = await storage.claim_request_replay(requestCommand({
    active_fingerprint: digest('2'), active_key_version: 'hmac-sha256-v2',
    retained_fingerprints: [{ key_version: 'hmac-sha256-v1', fingerprint: digest('a') }],
    key_registry_version: 'calapres-storage-keys-v2', request_ttl_seconds: 600,
  }));
  assert.equal(result.status, 'unknown');
  assert.equal(result.error_code, 'key_coverage_incomplete');
});

test('approve and correct owner decision shapes remain valid after reconciliation additions', () => {
  const approve = decisionOption({
    action: 'approve',
    command_digest: digest('1'),
    case_reply_sha256: digest('2'),
    knowledge_proposal_sha256: digest('3'),
    base_knowledge_version: '2026-08-11-v3',
    knowledge_version_to_publish: '2026-08-12-v1',
    supersedes_knowledge_version: null,
  });
  const correct = decisionOption({
    action: 'correct',
    command_digest: digest('4'),
    case_reply_sha256: digest('5'),
    knowledge_proposal_sha256: digest('6'),
    base_knowledge_version: '2026-08-12-v1',
    knowledge_version_to_publish: '2026-08-12-v2',
    supersedes_knowledge_version: '2026-08-12-v1',
  });
  assert.doesNotThrow(() => validateCommand('prepare_owner_review', {
    brand_id: 'calapres',
    preparation_id: 'prep_calapres_approve1',
    incident_id: 'inc_calapres_approve1',
    expected_incident_revision: 1,
    source_observation_id: 'obs_calapres_approve1',
    source_observation_digest: digest('7'),
    review_snapshot_digest: digest('8'),
    decision_options: [approve, correct],
    nonce_fingerprint: digest('9'),
    nonce_key_version: 'hmac-sha256-v1',
    nonce_ttl_seconds: 300,
  }));
  for (const [index, option] of [approve, correct].entries()) {
    assert.doesNotThrow(() => validateCommand('compare_and_commit_owner_decision', {
      brand_id: 'calapres',
      decision_id: `dec_calapres_shape${index + 1}`,
      approval_id: `dec_calapres_shape${index + 1}`,
      audit_id: `aud_calapres_shape${index + 1}`,
      incident_id: `inc_calapres_shape${index + 1}`,
      expected_incident_revision: 2,
      ...option,
      nonce_fingerprint: digest('9'),
      nonce_key_version: 'hmac-sha256-v1',
    }));
  }
});

test('owner preparation and decision remain one-use and DB-clock bounded', async () => {
  const { storage } = await boundStorage();
  await storage.complete_business_event(completionCommand({
    outcome_class: 'owner_escalation', reason_code: 'owner_review_required',
    risk_level: 'high', risk_digest: digest('1'), incident_id: 'inc_calapres_0001',
  }));
  const preparation = {
    brand_id: 'calapres', preparation_id: 'prep_calapres_0001',
    incident_id: 'inc_calapres_0001', expected_incident_revision: 1,
    source_observation_id: 'obs_calapres_0001', source_observation_digest: digest('d'),
    review_snapshot_digest: digest('3'), decision_options: [decisionOption()],
    nonce_fingerprint: digest('4'), nonce_key_version: 'hmac-sha256-v1', nonce_ttl_seconds: 300,
  };
  const prepared = await storage.prepare_owner_review(preparation);
  assert.equal(prepared.outcome, 'owner_review_prepared');
  const decision = {
    brand_id: 'calapres', decision_id: 'dec_calapres_0001', approval_id: 'dec_calapres_0001',
    audit_id: 'aud_calapres_0001', incident_id: 'inc_calapres_0001',
    expected_incident_revision: 2, ...decisionOption(), nonce_fingerprint: digest('4'),
    nonce_key_version: 'hmac-sha256-v1',
  };
  assert.equal((await storage.compare_and_commit_owner_decision(decision)).outcome,
    'owner_decision_committed');
  assert.equal((await storage.compare_and_commit_owner_decision(decision)).outcome,
    'duplicate_owner_decision');
});

test('safeAtomicCall never converts an uncertain failure into a duplicate or commit', async () => {
  const timeout = new Error('synthetic timeout');
  timeout.code = 'ETIMEDOUT';
  const result = await safeAtomicCall('claim_request_replay', async () => { throw timeout; });
  assert.equal(result.status, 'unknown');
  assert.equal(result.outcome, 'uncertain');
  assert.equal(result.error_code, 'timeout_unknown');
});

test('default registry is immutable reference data and no durable snapshot exposes raw PII', async () => {
  assert.equal(DEFAULT_KEY_REGISTRY.registry_version, 'calapres-storage-keys-v1');
  const { storage } = await boundStorage();
  const snapshot = await storage.snapshot();
  const serialized = JSON.stringify(snapshot);
  for (const prohibited of ['phone', 'email', 'raw_message', 'transcript', 'shopify_payload']) {
    assert.equal(serialized.includes(prohibited), false);
  }
});
