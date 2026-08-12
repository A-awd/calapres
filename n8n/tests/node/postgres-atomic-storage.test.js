'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const {
  EDGE_OPERATIONS,
  OPERATIONS,
  OWNER_OPERATIONS,
} = require('../../adapters/atomic-storage-contract');
const {
  FUNCTION_NAMES,
  FUNCTION_SQL,
  IMPLEMENTATION_STATUS,
  PostgresAtomicStorage,
  RECONCILIATION_INGRESS_FUNCTION_NAMES,
  functionSql,
} = require('../../postgres/postgres-atomic-storage');

const digest = (character) => character.repeat(64);
const CURSOR_READ_FIXTURE = JSON.parse(readFileSync(join(
  __dirname,
  '../fixtures/chatwoot-reconciliation-cursor-read-command.json',
), 'utf8'));

function tagOf(text) {
  const match = text.match(/calapres_cs:([a-z0-9-]+)/);
  return match ? match[1] : 'untagged';
}

function databaseEnvelope(operation, status, outcome, value = null, errorCode = null) {
  return {
    contract_verified: true,
    status,
    operation,
    outcome,
    value,
    error_code: errorCode,
  };
}

class ScriptedClient {
  constructor(handler) {
    this.handler = handler;
    this.calls = [];
    this.released = false;
  }

  async query(config) {
    assert.equal(typeof config, 'object');
    assert.equal(typeof config.text, 'string');
    assert.ok(Array.isArray(config.values));
    const call = { text: config.text, values: config.values, tag: tagOf(config.text) };
    this.calls.push(call);
    const result = await this.handler(call);
    return result === undefined ? { rows: [] } : result;
  }

  release() { this.released = true; }
}

class ScriptedPool {
  constructor(handler) {
    this.handler = handler;
    this.clients = [];
  }

  async connect() {
    const client = new ScriptedClient(this.handler);
    this.clients.push(client);
    return client;
  }
}

function requestCommand(overrides = {}) {
  return {
    brand_id: 'calapres', claim_id: 'rr_claim_0001', active_fingerprint: digest('a'),
    active_key_version: 'hmac-sha256-v1', retained_fingerprints: [],
    key_registry_version: 'calapres-storage-keys-v1',
    request_source: 'chatwoot_signed_webhook_v1', source_binding_sha256: digest('0'),
    request_ttl_seconds: 600,
    lease_owner_id: 'edge_worker_0001', lease_token: 'request_lease_0001',
    lease_duration_seconds: 300, ...overrides,
  };
}

function businessCommand(overrides = {}) {
  return {
    brand_id: 'calapres', claim_id: 'bev_claim_0001', active_fingerprint: digest('b'),
    active_key_version: 'hmac-sha256-v1', retained_fingerprints: [],
    key_registry_version: 'calapres-storage-keys-v1', event_retention_seconds: 86400,
    lease_owner_id: 'edge_worker_0001', lease_token: 'business_lease_0001',
    lease_duration_seconds: 300, ...overrides,
  };
}

function bindCommand(overrides = {}) {
  return {
    brand_id: 'calapres', request_claim_id: 'rr_claim_0001',
    request_lease_owner_id: 'edge_worker_0001', request_lease_token: 'request_lease_0001',
    business_claim_id: 'bev_claim_0001', business_lease_owner_id: 'edge_worker_0001',
    business_lease_token: 'business_lease_0001',
    request_source: 'chatwoot_signed_webhook_v1', source_binding_sha256: digest('0'),
    reconciliation_scan_id: null, reconciliation_scan_lease_token: null,
    reconciliation_expected_after_message_id: null,
    reconciliation_page_binding_sha256: null, account_id: 179973,
    inbox_id: 128058, channel: 'whatsapp', conversation_id: '700001',
    anchor_message_id: '800001', correlation_id: 'calapres:700001:800001',
    job_id: 'job_calapres_0001',
    event_identity_key_version: 'calapres-identity-hmac-v1',
    event_identity_fingerprint: digest('b'), conversation_fingerprint: digest('c'),
    message_fingerprint: digest('d'),
    active_key_version: 'hmac-sha256-v1', retained_message_fingerprints: [],
    key_registry_version: 'calapres-storage-keys-v1',
    baseline_fingerprint_key_version: 'calapres-hmac-v1',
    baseline_status_fingerprint: digest('e'), baseline_assignee_fingerprint: digest('f'),
    delay_policy_version: '2026-08-11-v1', knowledge_version: '2026-08-11-v3',
    delay_seconds: 60,
    retention_seconds: 90 * 24 * 60 * 60, ...overrides,
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

function reconciliationCursorCommand(overrides = {}) {
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
    new_after_message_id: 800001,
    proof_rows: [{
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
    }],
    page_binding_sha256: digest('8'),
    outcome_digest: digest('9'),
    row_count: 1,
    activation_floor_at: '2026-08-12T00:00:00.000Z',
    activation_policy_version: '2026-08-12-v1',
    customer_egress_allowed: false,
    ...overrides,
  };
}

function reconciliationCursorReadCommand(overrides = {}) {
  return { ...CURSOR_READ_FIXTURE, ...overrides };
}

function expectedControl(command = bindCommand()) {
  return Object.fromEntries([
    'account_id', 'inbox_id', 'channel', 'conversation_id', 'anchor_message_id',
    'correlation_id', 'event_identity_key_version', 'event_identity_fingerprint',
    'conversation_fingerprint', 'message_fingerprint', 'baseline_fingerprint_key_version',
    'baseline_status_fingerprint', 'baseline_assignee_fingerprint', 'delay_policy_version',
    'delay_seconds', 'knowledge_version',
  ].map((field) => [field, command[field]]));
}

function expectedIngressProvenance(command = bindCommand()) {
  return Object.fromEntries([
    'request_source', 'source_binding_sha256', 'reconciliation_scan_id',
    'reconciliation_expected_after_message_id', 'reconciliation_page_binding_sha256',
  ].map((field) => [field, command[field]]));
}

function completionCommand(overrides = {}) {
  return {
    brand_id: 'calapres', claim_id: 'bev_claim_0001', job_id: 'job_calapres_0001',
    conversation_id: '700001', expected_generation: 1, worker_id: 'core_worker_0001',
    lease_token: 'job_lease_0001', observation_id: 'obs_calapres_0001',
    observation_digest: digest('d'), audit_id: 'aud_observation_0001',
    outcome_class: 'observation_only', reason_code: 'synthetic_observation',
    risk_level: 'none', risk_digest: null, incident_id: null, ...overrides,
  };
}

function decisionOption(overrides = {}) {
  return {
    action: 'reply_only', command_digest: digest('e'), case_reply_sha256: digest('f'),
    knowledge_proposal_sha256: null, base_knowledge_version: null,
    knowledge_version_to_publish: null, supersedes_knowledge_version: null, ...overrides,
  };
}

function preparationCommand(overrides = {}) {
  return {
    brand_id: 'calapres', preparation_id: 'prep_calapres_0001',
    incident_id: 'inc_calapres_0001', expected_incident_revision: 1,
    source_observation_id: 'obs_calapres_0001', source_observation_digest: digest('d'),
    review_snapshot_digest: digest('1'), decision_options: [decisionOption()],
    nonce_fingerprint: digest('2'), nonce_key_version: 'hmac-sha256-v1',
    nonce_ttl_seconds: 300, ...overrides,
  };
}

function ownerCommand(overrides = {}) {
  return {
    brand_id: 'calapres', decision_id: 'dec_calapres_0001',
    approval_id: 'dec_calapres_0001', audit_id: 'aud_calapres_0001',
    incident_id: 'inc_calapres_0001', expected_incident_revision: 2,
    ...decisionOption(), nonce_fingerprint: digest('2'),
    nonce_key_version: 'hmac-sha256-v1', ...overrides,
  };
}

function storage(pool) {
  return new PostgresAtomicStorage({
    pool, brandId: 'calapres', statementTimeoutMs: 2500,
  });
}

function functionResult(operation, envelope) {
  return (call) => {
    if (call.tag === `function-${operation.replaceAll('_', '-')}`) {
      return { rows: [{ result: envelope }] };
    }
    return undefined;
  };
}

function assertTransaction(client, endTag = 'tx-commit') {
  assert.deepEqual(client.calls.slice(0, 3).map((call) => call.tag), [
    'tx-begin', 'tx-isolation', 'tx-timeout',
  ]);
  assert.equal(client.calls.at(-1).tag, endTag);
  assert.equal(client.released, true);
}

test('candidate parameterizes one JSONB function call and never interpolates command values', async () => {
  const command = requestCommand();
  const expected = databaseEnvelope('claim_request_replay', 'committed', 'processing_claimed', {
    claim_id: command.claim_id, lifecycle_status: 'processing',
    claimed_at: '2026-08-11T15:00:00.000Z', expires_at: '2026-08-11T15:10:00.000Z',
    lease_expires_at: '2026-08-11T15:05:00.000Z', attempt_count: 1,
    request_source: command.request_source,
    source_binding_sha256: command.source_binding_sha256,
  });
  const pool = new ScriptedPool(functionResult('claim_request_replay', expected));
  const adapter = storage(pool);
  const result = await adapter.claim_request_replay(command);
  assert.equal(adapter.implementation_status, IMPLEMENTATION_STATUS);
  assert.equal(IMPLEMENTATION_STATUS, 'implementation_candidate_pending_live_postgres_validation');
  assert.equal(result.outcome, 'processing_claimed');
  const client = pool.clients[0];
  assertTransaction(client);
  const call = client.calls.find((item) => item.tag === 'function-claim-request-replay');
  assert.equal(call.text, FUNCTION_SQL.claim_request_replay);
  assert.deepEqual(call.values, [JSON.stringify(command)]);
  assert.equal(call.text.includes(command.claim_id), false);
  assert.equal(call.text.includes(command.active_fingerprint), false);
  assert.deepEqual(client.calls.find((item) => item.tag === 'tx-timeout').values, ['2500']);
});

test('reconciliation scan claim uses one fixed JSONB function and an exact DB-clock lease bundle',
  async () => {
    const command = reconciliationScanCommand();
    const value = {
      account_id: command.account_id,
      inbox_id: command.inbox_id,
      channel: command.channel,
      scan_id: command.scan_id,
      lease_owner_id: command.lease_owner_id,
      lease_token: command.lease_token,
      lease_claimed_at: '2026-08-12T01:00:00.000Z',
      lease_expires_at: '2026-08-12T01:05:00.000Z',
      lease_duration_seconds: command.lease_duration_seconds,
      attempt_count: 1,
      max_pages: command.max_pages,
      activation_floor_at: command.activation_floor_at,
      activation_policy_version: command.activation_policy_version,
    };
    const envelope = databaseEnvelope(
      'claim_chatwoot_reconciliation_scan', 'committed', 'scan_lease_claimed', value,
    );
    const pool = new ScriptedPool(
      functionResult('claim_chatwoot_reconciliation_scan', envelope),
    );
    const result = await storage(pool).claim_chatwoot_reconciliation_scan(command);
    assert.equal(result.outcome, 'scan_lease_claimed');
    assert.deepEqual(result.value, value);
    assertTransaction(pool.clients[0]);
    const calls = pool.clients[0].calls.filter((call) => call.tag.startsWith('function-'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text, FUNCTION_SQL.claim_chatwoot_reconciliation_scan);
    assert.deepEqual(calls[0].values, [JSON.stringify(command)]);
  });

test('reconciliation cursor advance uses one fixed JSONB function and exact identifiers-only result',
  async () => {
    const command = reconciliationCursorCommand();
    const value = {
      account_id: command.account_id,
      inbox_id: command.inbox_id,
      channel: command.channel,
      conversation_id: command.conversation_id,
      scan_id: command.scan_id,
      expected_after_message_id: command.expected_after_message_id,
      new_after_message_id: command.new_after_message_id,
      page_binding_sha256: command.page_binding_sha256,
      outcome_digest: command.outcome_digest,
      row_count: command.row_count,
      advanced_at: '2026-08-12T01:00:00.000Z',
      activation_floor_at: command.activation_floor_at,
      activation_policy_version: command.activation_policy_version,
    };
    const envelope = databaseEnvelope(
      'compare_and_advance_chatwoot_message_cursor', 'committed', 'cursor_advanced', value,
    );
    const pool = new ScriptedPool(functionResult(
      'compare_and_advance_chatwoot_message_cursor', envelope,
    ));
    const result = await storage(pool).compare_and_advance_chatwoot_message_cursor(command);
    assert.equal(result.outcome, 'cursor_advanced');
    assert.deepEqual(result.value, value);
    assertTransaction(pool.clients[0]);
    const calls = pool.clients[0].calls.filter((call) => call.tag.startsWith('function-'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text, FUNCTION_SQL.compare_and_advance_chatwoot_message_cursor);
    assert.deepEqual(calls[0].values, [JSON.stringify(command)]);
    assert.equal(calls[0].text.includes(command.scan_id), false);
  });

test('reconciliation cursor read uses one fixed JSONB function and exact source-only result',
  async () => {
    const command = reconciliationCursorReadCommand();
    const value = {
      account_id: command.account_id,
      inbox_id: command.inbox_id,
      channel: command.channel,
      conversation_id: command.conversation_id,
      scan_id: command.scan_id,
      current_after_message_id: 0,
      activation_floor_at: command.activation_floor_at,
      activation_policy_version: command.activation_policy_version,
    };
    const envelope = databaseEnvelope(
      'read_chatwoot_reconciliation_cursor', 'committed', 'cursor_read', value,
    );
    const pool = new ScriptedPool(functionResult(
      'read_chatwoot_reconciliation_cursor', envelope,
    ));
    const result = await storage(pool).read_chatwoot_reconciliation_cursor(command);
    assert.equal(result.outcome, 'cursor_read');
    assert.deepEqual(result.value, value);
    assertTransaction(pool.clients[0]);
    const calls = pool.clients[0].calls.filter((call) => call.tag.startsWith('function-'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text, FUNCTION_SQL.read_chatwoot_reconciliation_cursor);
    assert.deepEqual(calls[0].values, [JSON.stringify(command)]);
    assert.equal(calls[0].text.includes(command.scan_id), false);
    assert.equal(JSON.stringify(result).includes(command.lease_token), false);
  });

test('driver failure rolls back and can never be represented as duplicate or committed', async () => {
  const error = new Error('synthetic connection loss');
  error.code = '57P01';
  const pool = new ScriptedPool((call) => {
    if (call.tag === 'function-claim-request-replay') throw error;
    return undefined;
  });
  const result = await storage(pool).claim_request_replay(requestCommand());
  assert.equal(result.status, 'unknown');
  assert.equal(result.error_code, 'driver_unknown');
  assertTransaction(pool.clients[0], 'tx-rollback');
  assert.equal(pool.clients[0].calls.some((call) => call.tag === 'tx-commit'), false);
});

test('adapter requires a dedicated releasable client and pinned Calapres brand', async () => {
  assert.throws(() => new PostgresAtomicStorage({
    pool: { query: async () => ({ rows: [] }) }, brandId: 'calapres',
  }), /connect\(\)/);
  assert.throws(() => new PostgresAtomicStorage({
    pool: new ScriptedPool(() => undefined), brandId: 'other',
  }), /pinned pilot brand/);
  const result = await new PostgresAtomicStorage({
    pool: { async connect() { return { query: async () => ({ rows: [] }) }; } },
    brandId: 'calapres',
  }).claim_request_replay(requestCommand());
  assert.equal(result.status, 'unknown');
  assert.equal(result.error_code, 'driver_unknown');
});

test('combined ingress bind crosses PostgreSQL in exactly one atomic function call', async () => {
  const command = bindCommand();
  const envelope = databaseEnvelope(
    'advance_conversation_generation', 'committed', 'ingress_bound',
    {
      request_claim_id: command.request_claim_id,
      business_claim_id: command.business_claim_id,
      job_id: command.job_id,
      conversation_id: command.conversation_id,
      generation: 1,
      due_at: '2026-08-11T15:01:00.000Z',
      state: 'pending',
      ...expectedIngressProvenance(command),
      ...expectedControl(command),
    },
  );
  const pool = new ScriptedPool(functionResult('advance_conversation_generation', envelope));
  const result = await storage(pool).advance_conversation_generation(command);
  assert.equal(result.outcome, 'ingress_bound');
  assert.equal(result.value.due_at, '2026-08-11T15:01:00.000Z');
  assertTransaction(pool.clients[0]);
  assert.equal(pool.clients[0].calls.filter((call) => call.tag.startsWith('function-')).length, 1);
});

test('reconciliation ingress uses its credential-specific function and rejects lease-token egress',
  async () => {
    const command = bindCommand({
      request_source: 'chatwoot_reconciliation_api_v1',
      source_binding_sha256: digest('7'),
      reconciliation_scan_id: 'cwrs_aaaaaaaaaaaaaaaaaaaaaaaa',
      reconciliation_scan_lease_token: 'reconciliation_lease_1',
      reconciliation_expected_after_message_id: 0,
      reconciliation_page_binding_sha256: digest('8'),
    });
    const value = {
      request_claim_id: command.request_claim_id,
      business_claim_id: command.business_claim_id,
      job_id: command.job_id,
      conversation_id: command.conversation_id,
      generation: 1,
      due_at: '2026-08-11T15:01:00.000Z',
      state: 'pending',
      ...expectedIngressProvenance(command),
      ...expectedControl(command),
    };
    const acceptedPool = new ScriptedPool((call) => {
      if (call.tag === 'function-advance-conversation-generation-reconciliation') {
        return { rows: [{ result: databaseEnvelope(
          'advance_conversation_generation', 'committed', 'ingress_bound', value,
        ) }] };
      }
      return undefined;
    });
    const accepted = await storage(acceptedPool).advance_conversation_generation(command);
    assert.equal(accepted.outcome, 'ingress_bound');
    assert.equal(accepted.value.reconciliation_page_binding_sha256, digest('8'));
    assert.doesNotMatch(JSON.stringify(accepted.value), /lease_token/);
    assertTransaction(acceptedPool.clients[0]);

    const leakedPool = new ScriptedPool((call) => {
      if (call.tag === 'function-advance-conversation-generation-reconciliation') {
        return { rows: [{ result: databaseEnvelope(
          'advance_conversation_generation', 'committed', 'ingress_bound', {
            ...value,
            reconciliation_scan_lease_token: command.reconciliation_scan_lease_token,
          },
        ) }] };
      }
      return undefined;
    });
    const leaked = await storage(leakedPool).advance_conversation_generation(command);
    assert.equal(leaked.status, 'unknown');
    assert.equal(leaked.error_code, 'schema_invalid');
    assertTransaction(leakedPool.clients[0], 'tx-rollback');
  });

test('PostgreSQL adapter accepts only a fully bound identifiers-only completed business result',
  async () => {
    const command = businessCommand();
    const value = {
      claim_id: command.claim_id,
      lifecycle_status: 'completed',
      job_id: 'job_calapres_0001',
      generation: 1,
      due_at: '2026-08-11T15:01:00.000Z',
      state: 'completed',
      observation_id: 'obs_calapres_0001',
      audit_id: 'aud_observation_0001',
      ...expectedControl(),
    };
    const pool = new ScriptedPool(functionResult('claim_business_event', databaseEnvelope(
      'claim_business_event', 'duplicate_or_conflict', 'duplicate_completed', value,
    )));
    const accepted = await storage(pool).claim_business_event(command);
    assert.equal(accepted.outcome, 'duplicate_completed');
    assert.deepEqual(accepted.value, value);
    assertTransaction(pool.clients[0]);

    const malformedPool = new ScriptedPool(functionResult('claim_business_event', databaseEnvelope(
      'claim_business_event', 'duplicate_or_conflict', 'duplicate_completed', {
        claim_id: command.claim_id,
        job_id: 'job_calapres_0001',
        observation_id: 'obs_calapres_0001',
        audit_id: 'aud_observation_0001',
      },
    )));
    const rejected = await storage(malformedPool).claim_business_event(command);
    assert.equal(rejected.status, 'unknown');
    assertTransaction(malformedPool.clients[0], 'tx-rollback');
  });

test('next-due consumer command contains no conversation identifier', async () => {
  const command = {
    brand_id: 'calapres', worker_id: 'core_worker_0001',
    lease_token: 'job_lease_0001', lease_duration_seconds: 300,
  };
  const envelope = databaseEnvelope('claim_due_conversation_retry', 'committed', 'job_claimed', {
    job_id: 'job_calapres_0001', conversation_id: '700001', generation: 1,
    business_claim_id: 'bev_claim_0001', due_at: '2026-08-11T15:01:00.000Z',
    ...expectedControl(),
    worker_id: command.worker_id, lease_token: command.lease_token,
    lease_expires_at: '2026-08-11T15:06:00.000Z', attempt_count: 1,
  });
  const pool = new ScriptedPool(functionResult('claim_due_conversation_retry', envelope));
  const result = await storage(pool).claim_due_conversation_retry(command);
  assert.equal(result.value.conversation_id, '700001');
  assert.deepEqual(
    Object.fromEntries(Object.keys(expectedControl()).map((key) => [key, result.value[key]])),
    expectedControl(),
  );
  const sent = JSON.parse(pool.clients[0].calls.find((call) =>
    call.tag === 'function-claim-due-conversation-retry').values[0]);
  assert.deepEqual(Object.keys(sent).sort(), [
    'brand_id', 'lease_duration_seconds', 'lease_token', 'worker_id',
  ]);
});

test('key coverage and alias conflicts remain unknown without reinterpretation', async () => {
  for (const [outcome, errorCode] of [
    ['key_coverage_incomplete', 'key_coverage_incomplete'],
    ['alias_conflict', 'key_alias_conflict'],
  ]) {
    const envelope = databaseEnvelope('claim_business_event', 'unknown', outcome, null, errorCode);
    const pool = new ScriptedPool(functionResult('claim_business_event', envelope));
    const result = await storage(pool).claim_business_event(businessCommand());
    assert.equal(result.status, 'unknown');
    assert.equal(result.error_code, errorCode);
    assertTransaction(pool.clients[0]);
  }
});

test('retry schedule carries durations and exact worker lease CAS only', async () => {
  const command = {
    brand_id: 'calapres', job_id: 'job_calapres_0001', conversation_id: '700001',
    expected_generation: 1, retry_idempotency_key: 'retry_key_0001', max_attempts: 3,
    safe_error_code: 'provider_unavailable', delay_seconds: 30, retention_seconds: 86400,
    expected_worker_id: 'core_worker_0001', expected_lease_token: 'job_lease_0001',
  };
  const envelope = databaseEnvelope('schedule_conversation_retry', 'committed', 'retry_scheduled', {
    job_id: command.job_id, generation: 1, attempt_count: 1,
    next_attempt_at: '2026-08-11T15:01:30.000Z', safe_error_code: command.safe_error_code,
  });
  const pool = new ScriptedPool(functionResult('schedule_conversation_retry', envelope));
  const result = await storage(pool).schedule_conversation_retry(command);
  assert.equal(result.outcome, 'retry_scheduled');
  const sent = JSON.parse(pool.clients[0].calls.find((call) =>
    call.tag === 'function-schedule-conversation-retry').values[0]);
  for (const forbidden of ['now', 'next_attempt_at', 'due_at', 'expires_at']) {
    assert.equal(Object.hasOwn(sent, forbidden), false);
  }
});

test('completion rollback cannot orphan outcome, audit, incident, or job state', async () => {
  const error = new Error('synthetic function failure');
  error.code = '57P01';
  const pool = new ScriptedPool((call) => {
    if (call.tag === 'function-complete-business-event') throw error;
    return undefined;
  });
  const result = await storage(pool).complete_business_event(completionCommand());
  assert.equal(result.status, 'unknown');
  assertTransaction(pool.clients[0], 'tx-rollback');
  assert.equal(pool.clients[0].calls.filter((call) => call.tag.startsWith('function-')).length, 1);
});

test('owner preparation and decision remain separate execute-only atomic calls', async () => {
  const preparation = preparationCommand();
  const preparedEnvelope = databaseEnvelope('prepare_owner_review', 'committed',
    'owner_review_prepared', {
      preparation_id: preparation.preparation_id, incident_id: preparation.incident_id,
      incident_revision: 2, option_count: 1,
      nonce_expires_at: '2026-08-11T15:05:00.000Z',
    });
  const prepPool = new ScriptedPool(functionResult('prepare_owner_review', preparedEnvelope));
  assert.equal((await storage(prepPool).prepare_owner_review(preparation)).status, 'committed');
  assertTransaction(prepPool.clients[0]);

  const decision = ownerCommand();
  const decisionEnvelope = databaseEnvelope('compare_and_commit_owner_decision', 'committed',
    'owner_decision_committed', {
      approval_id: decision.approval_id, audit_id: decision.audit_id, incident_revision: 3,
      ...decisionOption(),
    });
  const decisionPool = new ScriptedPool(
    functionResult('compare_and_commit_owner_decision', decisionEnvelope),
  );
  assert.equal((await storage(decisionPool).compare_and_commit_owner_decision(decision)).status,
    'committed');
  assertTransaction(decisionPool.clients[0]);
});

test('malformed or wrong-operation database envelopes fail closed and roll back', async () => {
  const pool = new ScriptedPool(functionResult('claim_request_replay',
    databaseEnvelope('claim_business_event', 'committed', 'prepared', {})));
  const result = await storage(pool).claim_request_replay(requestCommand());
  assert.equal(result.status, 'unknown');
  assert.equal(result.error_code, 'database_envelope_invalid');
  assertTransaction(pool.clients[0], 'tx-rollback');

  const cursorPool = new ScriptedPool(functionResult(
    'compare_and_advance_chatwoot_message_cursor',
    databaseEnvelope(
      'compare_and_advance_chatwoot_message_cursor', 'committed',
      'unverified_cursor', { cursor: 800001 },
    ),
  ));
  const cursorResult = await storage(cursorPool)
    .compare_and_advance_chatwoot_message_cursor(reconciliationCursorCommand());
  assert.equal(cursorResult.status, 'unknown');
  assert.equal(cursorResult.error_code, 'schema_invalid');
  assertTransaction(cursorPool.clients[0], 'tx-rollback');

  const readPool = new ScriptedPool(functionResult(
    'read_chatwoot_reconciliation_cursor',
    databaseEnvelope(
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
    ),
  ));
  const readResult = await storage(readPool)
    .read_chatwoot_reconciliation_cursor(reconciliationCursorReadCommand());
  assert.equal(readResult.status, 'unknown');
  assert.equal(readResult.error_code, 'schema_invalid');
  assertTransaction(readPool.clients[0], 'tx-rollback');
});

test('migration 0004 supplies DB-clock replay recovery, key registry, and durable next-due queue', () => {
  const migrationDir = join(__dirname, '../../postgres/migrations');
  const stateSql = readFileSync(join(migrationDir, '0001_calapres_cs_atomic_state.sql'), 'utf8');
  const dispatchSql = readFileSync(join(migrationDir, '0002_calapres_cs_atomic_functions.sql'), 'utf8');
  const boundarySql = readFileSync(join(migrationDir, '0003_calapres_cs_callable_boundary.sql'), 'utf8');
  const recoverySql = readFileSync(
    join(migrationDir, '0004_calapres_cs_replay_recovery_queue.sql'), 'utf8',
  );
  const rollbackPolicy = readFileSync(join(migrationDir, 'ROLLBACK.md'), 'utf8');

  for (const table of [
    'storage_key_registry', 'storage_key_registry_heads', 'conversation_job_queue',
    'conversation_generation_heads',
    'conversation_job_message_aliases',
  ]) {
    assert.match(recoverySql, new RegExp(`CREATE TABLE IF NOT EXISTS calapres_cs\\.${table}`));
  }
  assert.match(recoverySql, /lifecycle_status = 'processing'/);
  assert.match(recoverySql, /lifecycle_status = 'completed'/);
  assert.match(recoverySql, /lifecycle_status = 'legacy_unbound'/);
  assert.match(recoverySql, /request_replay_claims_processing_lease_idx/);
  assert.match(recoverySql, /request_claim_id text NOT NULL/);
  assert.match(recoverySql, /business_claim_id text NOT NULL/);
  for (const column of [
    'account_id', 'inbox_id', 'channel', 'anchor_message_id', 'correlation_id',
    'event_identity_key_version', 'event_identity_fingerprint', 'conversation_fingerprint',
    'message_fingerprint', 'baseline_fingerprint_key_version',
    'baseline_status_fingerprint', 'baseline_assignee_fingerprint',
    'delay_policy_version', 'delay_seconds', 'knowledge_version',
  ]) assert.match(recoverySql, new RegExp(`\\b${column}\\s+`));
  assert.match(recoverySql, /account_id = 179973/);
  assert.match(recoverySql, /inbox_id = 128031 AND channel = 'instagram'/);
  assert.match(recoverySql, /inbox_id = 128033 AND channel = 'tiktok'/);
  assert.match(recoverySql, /inbox_id = 128058 AND channel = 'whatsapp'/);
  assert.match(recoverySql, /inbox_id = 128326 AND channel = 'email'/);
  assert.match(recoverySql, /correlation_id = 'calapres:' \|\| conversation_id/);
  assert.match(recoverySql, /UNIQUE \(brand_id, request_claim_id\)/);
  assert.match(recoverySql, /UNIQUE \(brand_id, business_claim_id\)/);
  assert.match(recoverySql, /FOR UPDATE SKIP LOCKED/);
  assert.match(recoverySql, /ORDER BY next_attempt_at, job_id/);
  assert.match(recoverySql, /'due_at', calapres_cs\._rfc3339_utc\(v_job\.due_at\)/);
  assert.match(recoverySql, /UPDATE calapres_cs\.request_replay_claims[\s\S]*lifecycle_status = 'completed'/);
  assert.match(recoverySql, /INSERT INTO calapres_cs\.conversation_job_queue/);
  assert.match(recoverySql, /_job_reconciliation_control_matches_command\(v_job, p_command\)/);
  assert.equal((recoverySql.match(/_job_control_bundle\(v_job\) \|\| jsonb_build_object/g) || []).length, 8);
  assert.match(recoverySql, /event_identity_binding_mismatch/);
  assert.match(recoverySql, /message_identity_binding_mismatch/);
  assert.match(recoverySql, /completed_binding_invalid/);
  assert.doesNotMatch(recoverySql, /business_already_completed/);
  assert.match(recoverySql, /calapres:message_identity:v2/);
  assert.match(recoverySql, /v_event\.job_id <> p_command ->> 'job_id'/);
  assert.match(recoverySql, /v_request\.lease_token <> p_command ->> 'request_lease_token'/);
  assert.match(recoverySql, /completed business replay binding CAS failed/);
  assert.match(recoverySql, /p_command ->> 'message_fingerprint'/);
  assert.match(recoverySql, /INSERT INTO calapres_cs\.observation_outcomes/);
  assert.match(recoverySql, /INSERT INTO calapres_cs\.audit_events/);

  const requestClaimBranch = recoverySql.slice(
    recoverySql.indexOf("IF p_operation = 'claim_request_replay'"),
    recoverySql.indexOf("ELSIF p_operation = 'claim_business_event'"),
  );
  const businessClaimBranch = recoverySql.slice(
    recoverySql.indexOf("ELSIF p_operation = 'claim_business_event'"),
    recoverySql.indexOf("ELSIF p_operation = 'advance_conversation_generation'"),
  );
  assert.doesNotMatch(requestClaimBranch, /v_event\.lifecycle_status/);
  assert.ok(
    businessClaimBranch.indexOf("IF v_event.lifecycle_status = 'completed'") >= 0 &&
    businessClaimBranch.indexOf("IF v_event.lifecycle_status = 'completed'") <
      businessClaimBranch.indexOf('INSERT INTO calapres_cs.business_event_aliases'),
    'completed durable binding must be validated before business alias healing',
  );

  assert.equal((recoverySql.match(/v_now := clock_timestamp\(\)/g) || []).length, 1);
  assert.doesNotMatch(
    recoverySql,
    /p_command\s*->>\s*'(?:now|verified_at|valid_until|expires_at|due_at|next_attempt_at)'/,
  );
  assert.match(recoverySql, /request_ttl_seconds/);
  assert.match(recoverySql, /event_retention_seconds/);
  assert.match(recoverySql, /delay_seconds/);
  assert.match(recoverySql, /retention_seconds/);
  assert.match(recoverySql, /coverage_until >= p_required_through/);
  assert.match(recoverySql, /heads\.current_registry_version = v_registry_version/);
  assert.match(recoverySql, /'infinity'::timestamptz/);
  assert.match(recoverySql, /AT TIME ZONE 'UTC'|_rfc3339_utc/);

  const dueBranch = recoverySql.slice(
    recoverySql.indexOf("ELSIF p_operation = 'claim_due_conversation_retry'"),
    recoverySql.indexOf("ELSIF p_operation = 'transition_conversation_job'"),
  );
  assert.match(dueBranch, /'brand_id', 'worker_id', 'lease_token', 'lease_duration_seconds'/);
  assert.doesNotMatch(dueBranch, /p_command ->> 'conversation_id'/);
  assert.doesNotMatch(dueBranch, /p_command ->> 'expected_generation'/);

  const migration4FunctionNames = {
    ...FUNCTION_NAMES,
    claim_request_replay: 'calapres_cs.atomic_claim_request_replay',
    advance_conversation_generation: 'calapres_cs.atomic_advance_conversation_generation',
  };
  for (const operation of EDGE_OPERATIONS.slice(0, 8)) {
    const functionName = migration4FunctionNames[operation].replace('.', '\\.');
    assert.match(recoverySql, new RegExp(`CREATE OR REPLACE FUNCTION ${functionName}\\(p_command jsonb\\)`));
    assert.match(recoverySql, new RegExp(`_edge_atomic_dispatch_v2\\('${operation}', p_command\\)`));
  }
  assert.doesNotMatch(recoverySql, /_edge_atomic_dispatch_v2\('prepare_owner_review'/);
  assert.doesNotMatch(recoverySql, /_edge_atomic_dispatch_v2\('compare_and_commit_owner_decision'/);
  assert.match(recoverySql, /atomic_prepare_owner_review\(jsonb\)[\s\S]*FROM calapres_cs_edge_runtime/);
  assert.match(recoverySql, /atomic_claim_request_replay\(jsonb\)[\s\S]*FROM PUBLIC, calapres_cs_owner_runtime/);
  assert.match(recoverySql, /REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_edge_runtime/);
  assert.match(recoverySql, /REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_owner_runtime/);
  assert.doesNotMatch(
    recoverySql,
    /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[^;]*TO calapres_cs_edge_runtime/i,
  );
  assert.doesNotMatch(recoverySql, /\bEXECUTE\s+(?:format\s*\(|['"])/i);
  assert.match(recoverySql, /VALUES \(4, 'calapres_cs_replay_recovery_queue'\)/);

  assert.equal(OPERATIONS.length, 13);
  assert.equal(EDGE_OPERATIONS.length, 11);
  assert.equal(OWNER_OPERATIONS.length, 2);
  assert.deepEqual(Object.keys(FUNCTION_NAMES), [...OPERATIONS]);
  assert.deepEqual(Object.keys(FUNCTION_SQL), [...OPERATIONS]);
  const roleGrants = [...boundarySql.matchAll(
    /GRANT EXECUTE ON FUNCTION (calapres_cs\.atomic_[a-z_]+)\(jsonb\)\s+TO (calapres_cs_(?:edge|owner)_runtime);/g,
  )];
  assert.equal(roleGrants.filter((match) => match[2] === 'calapres_cs_edge_runtime').length, 8);
  assert.equal(roleGrants.filter((match) => match[2] === 'calapres_cs_owner_runtime').length, 2);
  assert.match(dispatchSql, /v_brand <> 'calapres'/);
  for (const [label, sql] of [
    ['dispatch', dispatchSql],
    ['boundary', boundarySql],
    ['recovery', recoverySql],
  ]) {
    const functionCount = (sql.match(/CREATE OR REPLACE FUNCTION/g) || []).length;
    const hardenedPathCount = (
      sql.match(/SET search_path TO pg_catalog, calapres_cs, pg_temp/g) || []
    ).length;
    assert.equal(hardenedPathCount, functionCount, `${label} functions must pin pg_temp last`);
    assert.doesNotMatch(
      sql,
      /SET search_path TO pg_catalog, calapres_cs(?:\s*\n|$)/,
      `${label} contains an unsafe search_path without pg_temp last`,
    );
  }
  assert.match(rollbackPolicy, /forward-only/i);
  for (const sql of [stateSql, dispatchSql, boundarySql, recoverySql]) {
    assert.doesNotMatch(sql, /DROP\s+(?:SCHEMA|TABLE)/i);
  }

  const allSchemaSql = `${stateSql}\n${recoverySql}`;
  for (const prohibitedColumn of [
    'address', 'attachment', 'email', 'message_body', 'model_draft', 'payment_data',
    'phone', 'prompt', 'raw_message', 'secret', 'shopify_payload', 'transcript',
  ]) {
    assert.doesNotMatch(allSchemaSql, new RegExp(`^\\s*${prohibitedColumn}\\s+`, 'im'));
  }
});

test('migration 0005 adds proof-bound Chatwoot scan leases and durable cursor CAS only to Edge',
  () => {
    const migrationDir = join(__dirname, '../../postgres/migrations');
    const boundarySql = readFileSync(
      join(migrationDir, '0003_calapres_cs_callable_boundary.sql'), 'utf8',
    );
    const reconciliationSql = readFileSync(
      join(migrationDir, '0005_calapres_cs_chatwoot_reconciliation.sql'), 'utf8',
    );
    for (const table of [
      'chatwoot_reconciliation_scan_leases',
      'chatwoot_reconciliation_message_cursors',
      'chatwoot_reconciliation_cursor_commits',
    ]) {
      assert.match(reconciliationSql,
        new RegExp(`CREATE TABLE IF NOT EXISTS calapres_cs\\.${table}`));
    }
    assert.equal((reconciliationSql.match(/v_now := clock_timestamp\(\)/g) || []).length, 2);
    assert.doesNotMatch(reconciliationSql,
      /p_command\s*->>\s*'(?:now|expires_at|lease_expires_at|advanced_at|due_at)'/);
    assert.match(reconciliationSql, /9007199254740991/);
    assert.match(reconciliationSql, /\^\(0\|\[1-9\]\[0-9\]\{0,15\}\)\$/);
    assert.match(reconciliationSql, /jsonb_array_length\(proof_rows\) BETWEEN 1 AND 99/);
    assert.match(reconciliationSql, /row_count = jsonb_array_length\(proof_rows\)/);
    assert.match(reconciliationSql, /business_event_aliases AS alias/);
    assert.match(reconciliationSql, /JOIN calapres_cs\.business_events AS event/);
    assert.match(reconciliationSql, /JOIN calapres_cs\.conversation_job_queue AS job/);
    assert.match(reconciliationSql, /job\.anchor_message_id = v_row ->> 'message_id'/);
    assert.match(reconciliationSql, /job\.generation = v_generation/);
    assert.match(reconciliationSql, /event\.expires_at > p_now/);
    assert.match(reconciliationSql, /job\.retention_until > p_now/);
    assert.match(reconciliationSql, /before_activation_floor/);
    assert.match(reconciliationSql, /private_message/);
    assert.match(reconciliationSql, /outgoing_message/);
    assert.match(reconciliationSql, /activity_message/);
    assert.match(reconciliationSql, /template_message/);
    assert.match(reconciliationSql, /bot_echo/);
    assert.match(reconciliationSql, /FOR UPDATE/);
    assert.match(reconciliationSql, /pg_advisory_xact_lock/);
    assert.match(reconciliationSql, /cursor_finalization_conflict/);
    assert.match(reconciliationSql, /duplicate_cursor_advance/);
    assert.match(reconciliationSql, /cursor_compare_failed/);
    assert.match(reconciliationSql, /cursor_durable_proof_invalid/);
    assert.match(reconciliationSql, /chatwoot cursor CAS failed/);

    const scanBranch = reconciliationSql.slice(
      reconciliationSql.indexOf("IF p_operation = 'claim_chatwoot_reconciliation_scan'"),
      reconciliationSql.indexOf(
        "ELSIF p_operation = 'compare_and_advance_chatwoot_message_cursor'",
      ),
    );
    assert.ok(
      scanBranch.indexOf('pg_advisory_xact_lock') <
        scanBranch.indexOf('FROM calapres_cs.chatwoot_reconciliation_scan_leases') &&
      scanBranch.indexOf('FROM calapres_cs.chatwoot_reconciliation_scan_leases') <
        scanBranch.indexOf('v_now := clock_timestamp()') &&
      scanBranch.indexOf('v_now := clock_timestamp()') <
        scanBranch.indexOf('v_lease_expires := v_now'),
      'scan claim must read authoritative time after its advisory and row locks',
    );

    const cursorBranch = reconciliationSql.slice(
      reconciliationSql.indexOf(
        "ELSIF p_operation = 'compare_and_advance_chatwoot_message_cursor'",
      ),
      reconciliationSql.indexOf('ALTER FUNCTION calapres_cs._chatwoot_uint53_text_valid'),
    );
    assert.ok(
      cursorBranch.indexOf('chatwoot_reconciliation_cursor_commits') <
        cursorBranch.indexOf('chatwoot_reconciliation_scan_leases'),
      'historical exact commit must reconcile before the live scan lease gate',
    );
    assert.match(cursorBranch,
      /_chatwoot_reconciliation_proofs_valid\(p_command, NULL, false\)/);
    assert.ok(
      cursorBranch.indexOf('pg_advisory_xact_lock') <
        cursorBranch.indexOf('FROM calapres_cs.chatwoot_reconciliation_scan_leases') &&
      cursorBranch.indexOf('FROM calapres_cs.chatwoot_reconciliation_scan_leases') <
        cursorBranch.indexOf('FROM calapres_cs.chatwoot_reconciliation_message_cursors') &&
      cursorBranch.indexOf('FROM calapres_cs.chatwoot_reconciliation_message_cursors') <
        cursorBranch.indexOf('v_now := clock_timestamp()') &&
      cursorBranch.indexOf('v_now := clock_timestamp()') <
        cursorBranch.indexOf('v_scan.lease_expires_at <= v_now'),
      'cursor first effect must validate lease time only after every advisory and row lock',
    );
    assert.ok(
      cursorBranch.indexOf('chatwoot_reconciliation_proofs_valid(p_command, v_now, true)') <
        cursorBranch.indexOf('INSERT INTO calapres_cs.chatwoot_reconciliation_cursor_commits'),
      'durable proof verification must dominate cursor commit',
    );
    assert.ok(
      cursorBranch.indexOf('INSERT INTO calapres_cs.chatwoot_reconciliation_cursor_commits') <
        cursorBranch.indexOf('INSERT INTO calapres_cs.chatwoot_reconciliation_message_cursors'),
      'proof ledger and cursor must be written inside one function transaction',
    );

    for (const operation of EDGE_OPERATIONS.slice(8, 10)) {
      const functionName = FUNCTION_NAMES[operation].replace('.', '\\.');
      assert.match(reconciliationSql,
        new RegExp(`CREATE OR REPLACE FUNCTION ${functionName}\\(\\s*p_command jsonb`));
      assert.match(reconciliationSql,
        new RegExp(`'${operation}', p_command`));
    }
    assert.equal((reconciliationSql.match(/SECURITY DEFINER/g) || []).length, 2);
    assert.equal((reconciliationSql.match(/SECURITY INVOKER/g) || []).length, 6);
    const functionCount = (reconciliationSql.match(/CREATE OR REPLACE FUNCTION/g) || []).length;
    const hardenedPathCount = (
      reconciliationSql.match(/SET search_path TO pg_catalog, calapres_cs, pg_temp/g) || []
    ).length;
    assert.equal(functionCount, 8);
    assert.equal(hardenedPathCount, functionCount);
    assert.doesNotMatch(reconciliationSql, /\bEXECUTE\s+(?:format\s*\(|['"])/i);
    assert.doesNotMatch(reconciliationSql,
      /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[^;]*TO calapres_cs_(?:edge|owner)_runtime/i);
    assert.match(reconciliationSql,
      /REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_edge_runtime/);
    assert.match(reconciliationSql,
      /REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_owner_runtime/);
    assert.doesNotMatch(reconciliationSql,
      /atomic_(?:claim_chatwoot_reconciliation_scan|compare_and_advance_chatwoot_message_cursor)\(jsonb\)[\s\S]{0,100}TO calapres_cs_owner_runtime/);

    const combinedGrants = [...`${boundarySql}\n${reconciliationSql}`.matchAll(
      /GRANT EXECUTE ON FUNCTION (calapres_cs\.atomic_[a-z_]+)\(jsonb\)\s+TO (calapres_cs_(?:edge|owner)_runtime);/g,
    )];
    assert.equal(combinedGrants.filter(
      (match) => match[2] === 'calapres_cs_edge_runtime').length, 10);
    assert.equal(combinedGrants.filter(
      (match) => match[2] === 'calapres_cs_owner_runtime').length, 2);
    assert.match(reconciliationSql,
      /VALUES \(5, 'calapres_cs_chatwoot_reconciliation'\)/);
    assert.doesNotMatch(reconciliationSql, /DROP\s+(?:SCHEMA|TABLE)/i);
    for (const prohibited of [
      'address', 'attachment', 'email', 'message_body', 'model_draft', 'payment_data',
      'phone', 'prompt', 'raw_message', 'secret', 'shopify_payload', 'transcript',
    ]) {
      assert.doesNotMatch(reconciliationSql,
        new RegExp(`^\\s*${prohibited}\\s+`, 'im'));
    }
  });

test('migration 0006 adds an exact live-lease cursor read and aligns proof retention', () => {
  const migrationDir = join(__dirname, '../../postgres/migrations');
  const boundarySql = readFileSync(
    join(migrationDir, '0003_calapres_cs_callable_boundary.sql'), 'utf8',
  );
  const reconciliationSql = readFileSync(
    join(migrationDir, '0005_calapres_cs_chatwoot_reconciliation.sql'), 'utf8',
  );
  const readSql = readFileSync(
    join(migrationDir, '0006_calapres_cs_chatwoot_reconciliation_cursor_read.sql'), 'utf8',
  );
  const readFunction = readSql.slice(
    readSql.indexOf(
      'CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_reconciliation_cursor_read_v1',
    ),
    readSql.indexOf(
      'ALTER FUNCTION calapres_cs._chatwoot_reconciliation_cursor_read_v1',
    ),
  );

  assert.match(readFunction, /chatwoot_reconciliation_cursor_read_command_v1/);
  assert.match(readFunction, /read_chatwoot_reconciliation_cursor/);
  assert.match(readFunction, /chatwoot_reconciliation_v1/);
  assert.match(readFunction, /p_command -> 'brand_id' <> '"calapres"'::jsonb/);
  assert.match(readFunction, /p_command ->> 'account_id' <> '179973'/);
  assert.match(readFunction, /_chatwoot_reconciliation_route_valid/);
  assert.match(readFunction, /conversation_id/);
  assert.match(readFunction, /scan_id/);
  assert.match(readFunction, /lease_token/);
  assert.match(readFunction, /2026-08-12T00:00:00\.000Z/);
  assert.match(readFunction, /2026-08-12-v1/);
  assert.match(readFunction, /customer_egress_allowed' <> 'false'::jsonb/);
  assert.doesNotMatch(readFunction,
    /p_command\s*->>?\s*'(?:now|read_at|lease_expires_at|expires_at)'/);
  assert.ok(
    readFunction.indexOf('FOR UPDATE') < readFunction.indexOf('v_now := clock_timestamp()'),
    'lease row must be locked before checking its DB-clock expiry',
  );
  assert.match(readFunction, /v_scan\.scan_id <> p_command ->> 'scan_id'/);
  assert.match(readFunction, /v_scan\.lease_token <> p_command ->> 'lease_token'/);
  assert.match(readFunction, /v_scan\.lease_expires_at <= v_now/);
  assert.match(readFunction, /'scan_lease_not_owned', NULL, NULL/);
  assert.match(readFunction, /v_current := 0/);
  assert.match(readFunction, /'current_after_message_id', v_current/);
  assert.doesNotMatch(readFunction,
    /\b(?:INSERT INTO|UPDATE|DELETE FROM)\s+calapres_cs/i);

  assert.match(readSql, /_chatwoot_sync_business_event_retention_v1/);
  assert.match(readSql, /registry\.coverage_until >= NEW\.retention_until/);
  assert.match(readSql, /expires_at = GREATEST\(expires_at, NEW\.retention_until\)/);
  assert.match(readSql,
    /business_event_aliases[\s\S]*retention_until = GREATEST\(retention_until, NEW\.retention_until\)/);
  assert.match(readSql, /event\.retention_until > p_now/);
  assert.doesNotMatch(
    readSql.slice(
      readSql.indexOf('CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_reconciliation_proofs_valid'),
      readSql.indexOf('ALTER FUNCTION calapres_cs._chatwoot_reconciliation_proofs_valid'),
    ),
    /event\.expires_at > p_now/,
  );
  assert.match(readSql, /existing business event retention binding is incomplete/);

  assert.match(readSql,
    /CREATE OR REPLACE FUNCTION calapres_cs\.atomic_read_chatwoot_reconciliation_cursor\([\s\S]*SECURITY DEFINER/);
  assert.match(readSql,
    /SELECT calapres_cs\._chatwoot_reconciliation_cursor_read_v1\(p_command\)/);
  assert.match(readSql,
    /REVOKE ALL ON FUNCTION calapres_cs\.atomic_read_chatwoot_reconciliation_cursor\(jsonb\)[\s\S]{0,100}FROM PUBLIC, calapres_cs_owner_runtime/);
  assert.match(readSql,
    /GRANT EXECUTE ON FUNCTION calapres_cs\.atomic_read_chatwoot_reconciliation_cursor\(jsonb\)[\s\S]{0,80}TO calapres_cs_edge_runtime/);
  assert.match(readSql,
    /REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_edge_runtime/);
  assert.match(readSql,
    /REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_owner_runtime/);
  assert.doesNotMatch(readSql,
    /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[^;]*TO calapres_cs_(?:edge|owner)_runtime/i);
  assert.doesNotMatch(readSql, /\bEXECUTE\s+(?:format\s*\(|['"])/i);

  const functionCount = (readSql.match(/CREATE OR REPLACE FUNCTION/g) || []).length;
  const hardenedPathCount = (
    readSql.match(/SET search_path TO pg_catalog, calapres_cs, pg_temp/g) || []
  ).length;
  assert.equal(functionCount, 4);
  assert.equal(hardenedPathCount, functionCount);
  assert.equal((readSql.match(/SECURITY DEFINER/g) || []).length, 1);
  assert.equal((readSql.match(/SECURITY INVOKER/g) || []).length, 3);
  assert.match(readSql,
    /VALUES \(6, 'calapres_cs_chatwoot_reconciliation_cursor_read'\)/);
  assert.doesNotMatch(readSql, /DROP\s+(?:SCHEMA|TABLE)/i);

  const combinedGrants = [...`${boundarySql}\n${reconciliationSql}\n${readSql}`.matchAll(
    /GRANT EXECUTE ON FUNCTION (calapres_cs\.atomic_[a-z_]+)\(jsonb\)\s+TO (calapres_cs_(?:edge|owner)_runtime);/g,
  )];
  assert.equal(combinedGrants.filter(
    (match) => match[2] === 'calapres_cs_edge_runtime').length, 11);
  assert.equal(combinedGrants.filter(
    (match) => match[2] === 'calapres_cs_owner_runtime').length, 2);
  for (const prohibited of [
    'address', 'attachment', 'email', 'message_body', 'model_draft', 'payment_data',
    'phone', 'prompt', 'raw_message', 'secret', 'shopify_payload', 'transcript',
  ]) {
    assert.doesNotMatch(readSql, new RegExp(`^\\s*${prohibited}\\s+`, 'im'));
  }
});

test('migration 0007 separates ingress credentials and gates reconciliation first effects', () => {
  const migrationDir = join(__dirname, '../../postgres/migrations');
  const provenanceSql = readFileSync(
    join(migrationDir, '0007_calapres_cs_ingress_provenance_boundary.sql'), 'utf8',
  );
  const recoverySql = readFileSync(
    join(migrationDir, '0004_calapres_cs_replay_recovery_queue.sql'), 'utf8',
  );
  const gate = provenanceSql.slice(
    provenanceSql.indexOf(
      'CREATE OR REPLACE FUNCTION calapres_cs._advance_reconciliation_ingress_v1',
    ),
    provenanceSql.indexOf(
      'CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_signed_webhook_request_replay',
    ),
  );

  assert.match(provenanceSql, /CREATE ROLE calapres_cs_webhook_runtime[\s\S]*NOLOGIN/);
  assert.match(provenanceSql, /CREATE ROLE calapres_cs_reconciliation_runtime[\s\S]*NOLOGIN/);
  assert.match(provenanceSql,
    /REVOKE calapres_cs_webhook_runtime FROM calapres_cs_reconciliation_runtime/);
  assert.match(provenanceSql,
    /REVOKE calapres_cs_reconciliation_runtime FROM calapres_cs_webhook_runtime/);
  assert.match(provenanceSql,
    /REVOKE ALL ON ALL FUNCTIONS IN SCHEMA calapres_cs[\s\S]*calapres_cs_edge_runtime/);

  const grants = [...provenanceSql.matchAll(
    /GRANT EXECUTE ON FUNCTION\s+(calapres_cs\.atomic_[a-z_]+)\(jsonb\)\s+TO (calapres_cs_(?:webhook|reconciliation)_runtime);/g,
  )];
  const webhookFunctions = grants.filter((match) => match[2] === 'calapres_cs_webhook_runtime')
    .map((match) => match[1]).sort();
  const reconciliationFunctions = grants
    .filter((match) => match[2] === 'calapres_cs_reconciliation_runtime')
    .map((match) => match[1]).sort();
  assert.deepEqual(webhookFunctions, [
    'calapres_cs.atomic_advance_signed_webhook_conversation_generation',
    'calapres_cs.atomic_claim_business_event',
    'calapres_cs.atomic_claim_due_conversation_retry',
    'calapres_cs.atomic_claim_signed_webhook_request_replay',
    'calapres_cs.atomic_complete_business_event',
    'calapres_cs.atomic_read_generation',
    'calapres_cs.atomic_schedule_conversation_retry',
    'calapres_cs.atomic_transition_conversation_job',
  ]);
  assert.deepEqual(reconciliationFunctions, [
    'calapres_cs.atomic_advance_reconciliation_conversation_generation',
    'calapres_cs.atomic_claim_business_event',
    'calapres_cs.atomic_claim_chatwoot_reconciliation_scan',
    'calapres_cs.atomic_claim_reconciliation_request_replay',
    'calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor',
    'calapres_cs.atomic_read_chatwoot_reconciliation_cursor',
  ]);
  assert.doesNotMatch(provenanceSql,
    /GRANT EXECUTE ON FUNCTION calapres_cs\.atomic_(?:claim_request_replay|advance_conversation_generation)\(jsonb\)/);
  assert.doesNotMatch(provenanceSql,
    /TO calapres_cs_reconciliation_runtime;[\s\S]{0,1}(?:\s*)GRANT EXECUTE ON FUNCTION calapres_cs\.atomic_(?:complete_business_event|read_generation|schedule_conversation_retry|claim_due_conversation_retry|transition_conversation_job)/);

  assert.match(provenanceSql,
    /p_command ->> 'request_source' = 'chatwoot_signed_webhook_v1'/);
  assert.match(provenanceSql,
    /p_command ->> 'request_source' = 'chatwoot_reconciliation_api_v1'/);
  assert.doesNotMatch(provenanceSql, /p_command - 'request_source'/);
  assert.match(provenanceSql,
    /jsonb_typeof\(p_command -> 'reconciliation_scan_lease_token'\) = 'null'/);
  assert.match(provenanceSql,
    /jsonb_typeof\(p_command -> 'reconciliation_page_binding_sha256'\) = 'null'/);

  assert.match(gate, /calapres:conversation:v2:/);
  assert.match(gate, /calapres:chatwoot-reconciliation-cursor:v1:/);
  assert.ok(
    gate.indexOf("v_request.lifecycle_status = 'completed'") <
      gate.indexOf('calapres:chatwoot-reconciliation-cursor:v1:'),
    'completed exact replay must bypass the expired lease/current cursor gate',
  );
  assert.ok(gate.indexOf('FOR UPDATE') < gate.indexOf('v_now := clock_timestamp()'));
  assert.match(gate, /v_scan\.lease_expires_at <= v_now/);
  assert.match(gate,
    /v_current <> \(p_command ->> 'reconciliation_expected_after_message_id'\)::bigint/);
  assert.match(gate, /request_provenance_mismatch/);
  assert.match(gate, /reconciliation_ingress_binding_invalid/);

  for (const field of [
    'request_source', 'source_binding_sha256', 'reconciliation_scan_id',
    'reconciliation_expected_after_message_id', 'reconciliation_page_binding_sha256',
  ]) assert.match(recoverySql, new RegExp(`ADD COLUMN IF NOT EXISTS ${field}`));
  assert.doesNotMatch(recoverySql, /ADD COLUMN IF NOT EXISTS reconciliation_scan_lease_token/);
  assert.match(recoverySql, /request_provenance_mismatch[\s\S]*INSERT INTO calapres_cs\.business_event_aliases/);
  assert.match(recoverySql, /reconciliation_page_binding_sha256/);

  const functionCount = (provenanceSql.match(/CREATE OR REPLACE FUNCTION/g) || []).length;
  const hardenedPathCount = (
    provenanceSql.match(/SET search_path TO pg_catalog, calapres_cs, pg_temp/g) || []
  ).length;
  assert.equal(functionCount, 5);
  assert.equal(hardenedPathCount, functionCount);
  assert.equal((provenanceSql.match(/SECURITY DEFINER/g) || []).length, 5);
  assert.match(provenanceSql,
    /VALUES \(7, 'calapres_cs_ingress_provenance_boundary'\)/);
  assert.doesNotMatch(provenanceSql, /DROP\s+(?:SCHEMA|TABLE)/i);
});

test('migration 0008 installs a deny-first model budget guard', () => {
  const migrationDir = join(__dirname, '../../postgres/migrations');
  const budgetSql = readFileSync(
    join(migrationDir, '0008_calapres_cs_model_budget_guard.sql'), 'utf8',
  );

  assert.match(budgetSql, /monthly_limit_microusd bigint NOT NULL DEFAULT 45000000/);
  assert.match(budgetSql, /reservation_microusd bigint NOT NULL DEFAULT 50000/);
  assert.match(budgetSql, /daily_conversation_request_limit integer NOT NULL DEFAULT 20/);
  assert.match(budgetSql, /enabled boolean NOT NULL DEFAULT false/);
  assert.match(budgetSql, /kill_switch boolean NOT NULL DEFAULT true/);
  assert.match(budgetSql, /pg_advisory_xact_lock/);
  assert.match(budgetSql, /outcome', 'monthly_budget_exhausted'/);
  assert.match(budgetSql, /outcome', 'conversation_daily_cap'/);
  assert.match(budgetSql, /GRANT EXECUTE ON FUNCTION calapres_cs\.atomic_reserve_model_budget\(jsonb\)\s+TO calapres_cs_webhook_runtime/);
  assert.match(budgetSql, /GRANT EXECUTE ON FUNCTION calapres_cs\.owner_set_model_budget_control\(jsonb\)\s+TO calapres_cs_owner_runtime/);
  assert.doesNotMatch(budgetSql, /(?:prompt|raw_message|message_body|transcript|phone|email|secret)\s+text/i);
  assert.match(budgetSql, /VALUES \(8, 'calapres_cs_model_budget_guard'\)/);
});

test('adapter stays provider-neutral and exposes only fixed function SQL', () => {
  const source = readFileSync(join(__dirname, '../../postgres/postgres-atomic-storage.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|connectionString|require\(['"]pg['"]\)/);
  assert.doesNotMatch(source, /INSERT INTO|UPDATE calapres_cs|DELETE FROM/i);
  for (const operation of OPERATIONS) {
    assert.match(FUNCTION_SQL[operation], /\$1::jsonb/);
    assert.match(FUNCTION_SQL[operation], new RegExp(FUNCTION_NAMES[operation].replace('.', '\\.')));
  }
  const reconciliationRequest = requestCommand({
    request_source: 'chatwoot_reconciliation_api_v1',
  });
  const reconciliationBind = bindCommand({
    request_source: 'chatwoot_reconciliation_api_v1',
    reconciliation_scan_id: 'cwrs_aaaaaaaaaaaaaaaaaaaaaaaa',
    reconciliation_scan_lease_token: 'reconciliation_lease_1',
    reconciliation_expected_after_message_id: 0,
    reconciliation_page_binding_sha256: digest('8'),
  });
  assert.match(functionSql('claim_request_replay', reconciliationRequest),
    new RegExp(RECONCILIATION_INGRESS_FUNCTION_NAMES.claim_request_replay.replace('.', '\\.')));
  assert.match(functionSql('advance_conversation_generation', reconciliationBind),
    new RegExp(RECONCILIATION_INGRESS_FUNCTION_NAMES.advance_conversation_generation
      .replace('.', '\\.')));
  assert.match(functionSql('claim_request_replay', requestCommand()),
    new RegExp(FUNCTION_NAMES.claim_request_replay.replace('.', '\\.')));
});
