'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const signatureVectors = require('../fixtures/chatwoot-webhook-signature-vectors.json');

const {
  FailClosedError,
  DUAL_READ_RESULT_FIELD_ORDER,
  INBOX_CHANNELS,
  LIVE_REREAD_FIELD_ORDER,
  MAX_RAW_BODY_SIZE_BYTES,
  WAIT_CARRIER_FIELD_ORDER,
  createChatwootObservationRuntime,
} = require('../../runtime/chatwoot-observation-runtime');
const {
  ACTIVE_EVENT_KEY,
  NOW_EPOCH_SECONDS,
  RETAINED_EVENT_KEY,
  WEBHOOK_SECRET,
  anchorRow,
  bytes,
  clone,
  defaultConversation,
  makeRuntimeHarness,
  payloadFor,
  prepareScenario,
  runClearScenario,
  sha256,
  sign,
  signedRequest,
} = require('./chatwoot-observation-runtime-harness');

const INGRESS_FIELDS = Object.freeze([
  'schema_version',
  'kind',
  'source',
  'evidence_id',
  'signature_algorithm',
  'signature_message_format',
  'raw_body_size_bytes',
  'max_raw_body_size_bytes',
  'body_sha256',
  'delivery_id_source',
  'delivery_id_fingerprint',
  'delivery_id_trusted',
  'event_timestamp',
  'received_at',
  'verification_completed_at',
  'max_age_seconds',
  'max_future_skew_seconds',
  'signature_verified',
  'timestamp_verified',
  'replay_protection_verified',
  'replay_key_material_format',
  'replay_key_fingerprint',
  'accepted',
  'normalization_allowed',
  'reason_code',
  'transient_only',
  'persistence_allowed',
  'wait_payload_allowed',
  'data_table_payload_allowed',
  'audit_payload_allowed',
  'customer_egress_allowed',
]);
const EVENT_EVIDENCE_FIELDS = Object.freeze([
  'schema_version',
  'kind',
  'source',
  'evidence_id',
  'ingress_evidence_ref',
  'brand_scope',
  'event_identity_key_version',
  'canonical_tuple_format',
  'derived_channel',
  'channel_source',
  'event_identity_fingerprint',
  'signature_verified_before_parse',
  'replay_verified_before_parse',
  'verified_parse',
  'unsigned_delivery_used',
  'payload_brand_used',
  'raw_identifiers_in_evidence',
  'durable_projection_field',
  'transient_only',
  'persistence_allowed',
  'wait_payload_allowed',
  'data_table_payload_allowed',
  'audit_payload_allowed',
  'customer_egress_allowed',
]);
const DECISION_FIELDS = Object.freeze([
  'schema_version',
  'kind',
  'source',
  'decision_id',
  'evidence_ref',
  'live_read_evidence',
  'expected_generation',
  'current_generation',
  'generation_matches',
  'wait_state_binding_verified',
  'idempotency_consumed',
  'brand_enabled',
  'kill_switch',
  'eligible_for_observation',
  'observation_draft_allowed',
  'cancellation_reason',
  'evaluated_at',
  'transient_only',
  'persistence_allowed',
  'wait_payload_allowed',
  'data_table_payload_allowed',
  'audit_payload_allowed',
  'customer_egress_allowed',
]);

function sortedKeys(value) {
  return Object.keys(value).sort();
}

function assertExactKeys(value, expected) {
  assert.deepEqual(sortedKeys(value), [...expected].sort());
}

function validDecisionState(waitState, overrides = {}) {
  return {
    currentGeneration: waitState.generation,
    idempotencyConsumed: false,
    brandEnabled: true,
    killSwitch: false,
    ...overrides,
  };
}

async function rereadWithRows(rowsFactory, options = {}) {
  const scenario = await prepareScenario(options);
  const rows = rowsFactory(scenario.waitState);
  scenario.harness.setMessageResponses([
    { statusCode: 200, body: { payload: rows } },
    { statusCode: 200, body: { payload: rows } },
  ]);
  const evidence = await scenario.harness.runtime.performBoundedLiveReread({
    waitState: scenario.waitState,
  });
  const decision = scenario.harness.runtime.buildPostDelayDecision({
    waitState: scenario.waitState,
    evidence,
    state: validDecisionState(scenario.waitState),
  });
  return { ...scenario, evidence, decision };
}

test('signed ingress verifies exact bytes and atomically rejects a replay regardless of Delivery metadata', async () => {
  const harness = makeRuntimeHarness();
  const request = signedRequest(payloadFor());
  const accepted = await harness.runtime.verifySignedIngress(request);
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.normalization_allowed, true);
  assert.equal(accepted.signature_verified, true);
  assert.equal(accepted.replay_protection_verified, true);
  assert.equal(accepted.delivery_id_trusted, false);
  assertExactKeys(accepted, INGRESS_FIELDS);

  const duplicate = await harness.runtime.verifySignedIngress({
    ...request,
    deliveryHeader: 'attacker-controlled-different-delivery-id',
  });
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason_code, 'duplicate_delivery');
  assert.equal(duplicate.replay_key_fingerprint, accepted.replay_key_fingerprint);
  assert.equal(harness.calls.replayClaims.length, 2);

  const concurrentHarness = makeRuntimeHarness();
  const concurrent = await Promise.all(
    Array.from({ length: 32 }, () =>
      concurrentHarness.runtime.verifySignedIngress({ ...request })),
  );
  assert.equal(concurrent.filter((item) => item.accepted).length, 1);
  assert.equal(concurrent.filter((item) => item.reason_code === 'duplicate_delivery').length, 31);
});

test('signed ingress reproduces every repository public raw-byte signature vector', async () => {
  for (const vector of signatureVectors.vectors) {
    const harness = makeRuntimeHarness({
      nowEpochSeconds: Number(vector.timestamp) + 10,
      webhookSecret: signatureVectors.public_test_secret,
    });
    const evidence = await harness.runtime.verifySignedIngress({
      rawBodyBytes: bytes(vector.raw_body),
      timestamp: vector.timestamp,
      signatureHeader: vector.signature,
      deliveryHeader: null,
    });
    assert.equal(evidence.accepted, true, vector.name);
    assert.equal(evidence.signature_verified, true, vector.name);
  }
});

test('signed ingress rejects byte mutations and size violations before body HMAC or secret access', async () => {
  const harness = makeRuntimeHarness();
  const request = signedRequest(payloadFor());
  const mutatedBody = bytes(new TextDecoder().decode(request.rawBodyBytes) + ' ');
  const mismatch = await harness.runtime.verifySignedIngress({
    ...request,
    rawBodyBytes: mutatedBody,
  });
  assert.equal(mismatch.reason_code, 'signature_mismatch');
  assert.equal(mismatch.signature_verified, false);
  assert.notEqual(mismatch.body_sha256, null);

  const oversizedHarness = makeRuntimeHarness();
  const oversized = await oversizedHarness.runtime.verifySignedIngress({
    rawBodyBytes: new Uint8Array(MAX_RAW_BODY_SIZE_BYTES + 1),
    timestamp: String(NOW_EPOCH_SECONDS),
    signatureHeader: 'sha256=' + '0'.repeat(64),
    deliveryHeader: 'ignored-before-header-processing',
  });
  assert.equal(oversized.reason_code, 'payload_too_large');
  assert.equal(oversized.body_sha256, null);
  assert.equal(oversized.delivery_id_fingerprint, null);
  assert.equal(oversizedHarness.metrics.secretReads, 0);
  assert.equal(oversizedHarness.metrics.hmacInputLengths.length, 0);
  assert.equal(
    oversizedHarness.metrics.sha256InputLengths.includes(MAX_RAW_BODY_SIZE_BYTES + 1),
    false,
  );
  assert.equal(oversizedHarness.calls.replayClaims.length, 0);
});

test('signed ingress timestamp, signature, secret, and replay-store failures stay fail closed', async () => {
  const base = signedRequest(payloadFor());
  const cases = [
    [{ ...base, timestamp: null }, {}, 'timestamp_missing'],
    [{ ...base, timestamp: 'not-a-time' }, {}, 'timestamp_malformed'],
    [{ ...base, timestamp: String(NOW_EPOCH_SECONDS - 301) }, {}, 'timestamp_stale'],
    [{ ...base, timestamp: String(NOW_EPOCH_SECONDS + 61) }, {}, 'timestamp_future'],
    [{ ...base, signatureHeader: null }, {}, 'signature_missing'],
    [{ ...base, signatureHeader: 'sha256=BAD' }, {}, 'signature_malformed'],
    [base, { webhookSecretUnavailable: true }, 'verification_unavailable'],
    [base, { replayStoreUnavailable: true }, 'replay_store_unavailable'],
  ];
  for (const [request, harnessOptions, reason] of cases) {
    const harness = makeRuntimeHarness(harnessOptions);
    const result = await harness.runtime.verifySignedIngress(request);
    assert.equal(result.accepted, false, reason);
    assert.equal(result.normalization_allowed, false, reason);
    assert.equal(result.reason_code, reason);
    assert.equal(result.customer_egress_allowed, false);
  }
});

test('event identity is body-bound, stable across JSON formatting and fresh signatures, and route-derived', async () => {
  const firstHarness = makeRuntimeHarness();
  const firstPayload = payloadFor();
  const firstRequest = signedRequest(firstPayload);
  const firstIngress = await firstHarness.runtime.verifySignedIngress(firstRequest);
  const first = await firstHarness.runtime.deriveEventIdentity({
    rawBodyBytes: firstRequest.rawBodyBytes,
    ingressEvidence: firstIngress,
  });

  const reorderedText = JSON.stringify({
    content: firstPayload.content,
    id: firstPayload.id,
    conversation: firstPayload.conversation,
    inbox: firstPayload.inbox,
    account: firstPayload.account,
    event: firstPayload.event,
  }, null, 2);
  const secondHarness = makeRuntimeHarness();
  const secondRequest = signedRequest(firstPayload, {
    rawText: reorderedText,
    timestamp: String(NOW_EPOCH_SECONDS - 5),
    deliveryHeader: 'another-untrusted-id',
  });
  const secondIngress = await secondHarness.runtime.verifySignedIngress(secondRequest);
  const second = await secondHarness.runtime.deriveEventIdentity({
    rawBodyBytes: secondRequest.rawBodyBytes,
    ingressEvidence: secondIngress,
  });
  assert.notEqual(firstIngress.replay_key_fingerprint, secondIngress.replay_key_fingerprint);
  assert.equal(
    first.evidence.event_identity_fingerprint,
    second.evidence.event_identity_fingerprint,
  );
  assert.equal(first.evidence.derived_channel, 'whatsapp');
  assert.equal(first.evidence.payload_brand_used, false);
  assert.equal(first.evidence.unsigned_delivery_used, false);
  assertExactKeys(first.evidence, EVENT_EVIDENCE_FIELDS);
  assert.equal(Object.isFrozen(firstIngress), true);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.evidence), true);
  assert.equal(Object.isFrozen(first.canonicalTuple), true);
  assert.throws(() => {
    firstIngress.body_sha256 = 'f'.repeat(64);
  }, TypeError);

  const changedHarness = makeRuntimeHarness();
  const changedRequest = signedRequest(payloadFor({ messageId: 900002 }));
  const changedIngress = await changedHarness.runtime.verifySignedIngress(changedRequest);
  const changed = await changedHarness.runtime.deriveEventIdentity({
    rawBodyBytes: changedRequest.rawBodyBytes,
    ingressEvidence: changedIngress,
  });
  assert.notEqual(
    first.evidence.event_identity_fingerprint,
    changed.evidence.event_identity_fingerprint,
  );

  await assert.rejects(
    firstHarness.runtime.deriveEventIdentity({
      rawBodyBytes: bytes(new TextDecoder().decode(firstRequest.rawBodyBytes) + ' '),
      ingressEvidence: firstIngress,
    }),
    (error) => error instanceof FailClosedError &&
      error.reasonCode === 'verified_ingress_body_mismatch',
  );
  await assert.rejects(
    firstHarness.runtime.deriveEventIdentity({
      rawBodyBytes: firstRequest.rawBodyBytes,
      ingressEvidence: clone(firstIngress),
    }),
    (error) => error instanceof FailClosedError &&
      error.reasonCode === 'topology_verified_ingress_required',
  );
});

test('event identity maps all four exact inboxes and rejects aliases or unknown routes', async () => {
  for (const [inboxIdText, channel] of Object.entries(INBOX_CHANNELS)) {
    const inboxId = Number(inboxIdText);
    const harness = makeRuntimeHarness();
    const request = signedRequest(payloadFor({ inboxId }));
    const ingress = await harness.runtime.verifySignedIngress(request);
    const result = await harness.runtime.deriveEventIdentity({
      rawBodyBytes: request.rawBodyBytes,
      ingressEvidence: ingress,
    });
    assert.equal(result.evidence.derived_channel, channel);
  }

  for (const payload of [
    { ...payloadFor(), inbox_id: 128058 },
    payloadFor({ inboxId: 128028 }),
    payloadFor({ accountId: 999999 }),
  ]) {
    const harness = makeRuntimeHarness();
    const request = signedRequest(payload);
    const ingress = await harness.runtime.verifySignedIngress(request);
    await assert.rejects(
      harness.runtime.deriveEventIdentity({
        rawBodyBytes: request.rawBodyBytes,
        ingressEvidence: ingress,
      }),
      (error) => error instanceof FailClosedError,
    );
  }
});

test('bounded re-read and post-delay decision preserve every exact four-channel route', async () => {
  for (const [inboxIdText, channel] of Object.entries(INBOX_CHANNELS)) {
    const result = await runClearScenario({ inboxId: Number(inboxIdText) });
    assert.equal(result.waitState.channel, channel);
    assert.equal(result.reread.channel, channel);
    assert.equal(result.reread.inbox_id, Number(inboxIdText));
    assert.equal(result.reread.live_read_status, 'verified');
    assert.equal(result.decision.eligible_for_observation, true);
    assert.equal(result.decision.customer_egress_allowed, false);
  }
});

test('dual-read dedup is bound to verified event identity and reads active plus retained keys', async () => {
  const scenario = await prepareScenario();
  const unique = await scenario.harness.runtime.dualReadBusinessEventIdentity({
    identityResult: scenario.identityResult,
    requiredPriorVersions: [RETAINED_EVENT_KEY.version],
    dedupTtlSeconds: 3600,
    nowEpochSeconds: NOW_EPOCH_SECONDS,
  });
  assert.equal(unique.status, 'unique');
  assert.equal(unique.lookup_verified, true);
  assertExactKeys(unique, DUAL_READ_RESULT_FIELD_ORDER);
  assert.deepEqual(
    Object.keys(unique.candidate_event_identity_fingerprints).sort(),
    [ACTIVE_EVENT_KEY.version, RETAINED_EVENT_KEY.version].sort(),
  );
  const priorFingerprint =
    unique.candidate_event_identity_fingerprints[RETAINED_EVENT_KEY.version];
  scenario.harness.setExistingFingerprints([priorFingerprint]);
  const duplicate = await scenario.harness.runtime.dualReadBusinessEventIdentity({
    identityResult: scenario.identityResult,
    requiredPriorVersions: [RETAINED_EVENT_KEY.version],
    dedupTtlSeconds: 3600,
    nowEpochSeconds: NOW_EPOCH_SECONDS,
  });
  assert.equal(duplicate.status, 'duplicate');
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.matched_key_version, RETAINED_EVENT_KEY.version);
  assertExactKeys(duplicate, DUAL_READ_RESULT_FIELD_ORDER);
  assert.equal(JSON.stringify(duplicate).includes(ACTIVE_EVENT_KEY.secret), false);
  assert.equal(JSON.stringify(duplicate).includes(RETAINED_EVENT_KEY.secret), false);
  assert.equal(scenario.harness.calls.businessLookups.length, 2);
});

test('dual-read rejects unverified identity, duplicate key versions, and insufficient retention', async () => {
  const scenario = await prepareScenario();
  const missingIdentity = await scenario.harness.runtime.dualReadBusinessEventIdentity({
    identityResult: { canonicalTuple: scenario.identityResult.canonicalTuple },
    requiredPriorVersions: [RETAINED_EVENT_KEY.version],
    dedupTtlSeconds: 3600,
    nowEpochSeconds: NOW_EPOCH_SECONDS,
  });
  assert.equal(missingIdentity.status, 'verified_event_identity_required');
  assert.equal(missingIdentity.lookup_verified, false);
  const clonedIdentity = await scenario.harness.runtime.dualReadBusinessEventIdentity({
    identityResult: clone(scenario.identityResult),
    requiredPriorVersions: [RETAINED_EVENT_KEY.version],
    dedupTtlSeconds: 3600,
    nowEpochSeconds: NOW_EPOCH_SECONDS,
  });
  assert.equal(clonedIdentity.status, 'verified_event_identity_required');

  const shortRetentionHarness = makeRuntimeHarness({
    eventKeys: [
      ACTIVE_EVENT_KEY,
      { ...RETAINED_EVENT_KEY, retainUntilEpochSeconds: NOW_EPOCH_SECONDS + 3599 },
    ],
  });
  const request = signedRequest(payloadFor());
  const ingress = await shortRetentionHarness.runtime.verifySignedIngress(request);
  const identityResult = await shortRetentionHarness.runtime.deriveEventIdentity({
    rawBodyBytes: request.rawBodyBytes,
    ingressEvidence: ingress,
  });
  const short = await shortRetentionHarness.runtime.dualReadBusinessEventIdentity({
    identityResult,
    requiredPriorVersions: [RETAINED_EVENT_KEY.version],
    dedupTtlSeconds: 3600,
    nowEpochSeconds: NOW_EPOCH_SECONDS,
  });
  assert.equal(short.status, 'prior_key_retention_insufficient');
  assert.equal(shortRetentionHarness.calls.businessLookups.length, 0);

  const duplicateKeyHarness = makeRuntimeHarness({
    eventKeys: [ACTIVE_EVENT_KEY, { ...RETAINED_EVENT_KEY, version: ACTIVE_EVENT_KEY.version }],
  });
  const duplicateKey = await duplicateKeyHarness.runtime.dualReadBusinessEventIdentity({
    identityResult,
    requiredPriorVersions: [],
    dedupTtlSeconds: 3600,
    nowEpochSeconds: NOW_EPOCH_SECONDS,
  });
  assert.equal(duplicateKey.status, 'keyring_invalid');
});

test('bounded re-read performs exactly two anchor-minus-one scans and yields an exact sanitized decision', async () => {
  const result = await runClearScenario();
  assert.equal(result.reread.live_read_status, 'verified');
  assert.equal(result.reread.source_verified, true);
  assert.equal(result.reread.anchor_message_present, true);
  assert.equal(result.reread.anchor_is_latest_inbound, true);
  assert.equal(result.reread.newer_non_activity_present, false);
  assert.deepEqual(result.harness.calls.messages, [
    { accountId: 179973, conversationId: '700001', after: 900000 },
    { accountId: 179973, conversationId: '700001', after: 900000 },
  ]);
  assert.deepEqual(result.harness.calls.conversations, [
    { accountId: 179973, conversationId: '700001' },
    { accountId: 179973, conversationId: '700001' },
  ]);
  assertExactKeys(result.reread, LIVE_REREAD_FIELD_ORDER);
  assertExactKeys(result.decision, DECISION_FIELDS);
  assert.equal(result.decision.eligible_for_observation, true);
  assert.equal(result.decision.observation_draft_allowed, true);
  assert.equal(result.decision.customer_egress_allowed, false);
  const serialized = JSON.stringify({ reread: result.reread, decision: result.decision });
  assert.equal(serialized.includes('سر اختباري'), false);
  assert.equal(serialized.includes(WEBHOOK_SECRET), false);
  assert.equal(serialized.includes(ACTIVE_EVENT_KEY.secret), false);
});

test('bounded re-read fails closed on truncation, changed sets, duplicate IDs, old rows, and route mismatch', async () => {
  const truncatedScenario = await prepareScenario();
  const truncatedRows = Array.from({ length: 100 }, (_, index) =>
    anchorRow(truncatedScenario.waitState, {
      id: Number(truncatedScenario.waitState.anchor_message_id) + index,
      message_type: index === 0 ? 0 : 2,
    }));
  truncatedScenario.harness.setMessageResponses([
    { statusCode: 200, body: { payload: truncatedRows } },
    { statusCode: 200, body: { payload: truncatedRows } },
  ]);
  const truncated = await truncatedScenario.harness.runtime.performBoundedLiveReread({
    waitState: truncatedScenario.waitState,
  });
  assert.equal(truncated.live_read_status, 'scan_truncated');
  assert.equal(truncated.source_verified, false);

  const changedScenario = await prepareScenario();
  const anchor = anchorRow(changedScenario.waitState);
  changedScenario.harness.setMessageResponses([
    { statusCode: 200, body: { payload: [anchor] } },
    { statusCode: 200, body: { payload: [anchor, anchorRow(changedScenario.waitState, {
      id: Number(changedScenario.waitState.anchor_message_id) + 1,
      message_type: 2,
    })] } },
  ]);
  const changed = await changedScenario.harness.runtime.performBoundedLiveReread({
    waitState: changedScenario.waitState,
  });
  assert.equal(changed.live_read_status, 'scan_changed');

  for (const [name, rowsFactory] of [
    ['duplicate', (wait) => [anchorRow(wait), anchorRow(wait)]],
    ['old', (wait) => [
      anchorRow(wait),
      anchorRow(wait, { id: Number(wait.anchor_message_id) - 1, message_type: 2 }),
    ]],
  ]) {
    const result = await rereadWithRows(rowsFactory);
    assert.equal(result.evidence.live_read_status, 'schema_invalid', name);
    assert.equal(result.decision.cancellation_reason, 'live_reread_unavailable', name);
  }

  const routeScenario = await prepareScenario();
  routeScenario.harness.setConversationResponses([
    { statusCode: 200, body: defaultConversation({ account_id: 999999 }) },
  ]);
  const route = await routeScenario.harness.runtime.performBoundedLiveReread({
    waitState: routeScenario.waitState,
  });
  assert.equal(route.live_read_status, 'route_mismatch');
  const routeDecision = routeScenario.harness.runtime.buildPostDelayDecision({
    waitState: routeScenario.waitState,
    evidence: route,
    state: validDecisionState(routeScenario.waitState),
  });
  assert.equal(routeDecision.cancellation_reason, 'route_mismatch');
  assert.equal(routeScenario.harness.calls.messages.length, 0);
});

test('bounded re-read maps authorization, rate limit, schema, and transport failures without throwing open', async () => {
  for (const [statusCode, expected] of [[401, 'unauthorized'], [403, 'forbidden'], [404, 'not_found'], [429, 'rate_limited'], [500, 'unavailable']]) {
    const scenario = await prepareScenario();
    scenario.harness.setConversationResponses([{ statusCode, body: null }]);
    const result = await scenario.harness.runtime.performBoundedLiveReread({
      waitState: scenario.waitState,
    });
    assert.equal(result.live_read_status, expected);
    assert.equal(result.source_verified, false);
  }

  const badMessages = await prepareScenario();
  badMessages.harness.setMessageResponses([
    { statusCode: 200, body: { payload: 'not-an-array' } },
    { statusCode: 200, body: { payload: [] } },
  ]);
  const invalid = await badMessages.harness.runtime.performBoundedLiveReread({
    waitState: badMessages.waitState,
  });
  assert.equal(invalid.live_read_status, 'schema_invalid');

  const thrown = await prepareScenario({
    harnessOptions: {
      getConversation() {
        throw new Error('timeout');
      },
    },
  });
  const unavailable = await thrown.harness.runtime.performBoundedLiveReread({
    waitState: thrown.waitState,
  });
  assert.equal(unavailable.live_read_status, 'unavailable');
  assert.equal(unavailable.http_status, null);
});

test('numeric IDs cancel same-second newer inbound, human reply, private note, and bot output deterministically', async () => {
  const cases = [
    {
      name: 'newer inbound',
      row: { message_type: 0, private: false, sender: { type: 'contact' } },
      reason: 'newer_inbound',
    },
    {
      name: 'human reply',
      row: { message_type: 1, private: false, sender: { type: 'user' } },
      reason: 'human_intervention',
    },
    {
      name: 'private note',
      row: { message_type: 1, private: true, sender: { type: 'user' } },
      reason: 'private_note_present',
    },
    {
      name: 'another bot output',
      row: { message_type: 1, private: false, sender: { type: 'agent_bot' } },
      reason: 'newer_non_activity',
    },
  ];
  for (const item of cases) {
    const result = await rereadWithRows((waitState) => {
      const anchor = anchorRow(waitState);
      return [
        anchor,
        anchorRow(waitState, {
          id: Number(waitState.anchor_message_id) + 1,
          created_at: anchor.created_at,
          ...item.row,
        }),
      ];
    });
    assert.equal(result.evidence.live_read_status, 'verified', item.name);
    assert.equal(result.decision.cancellation_reason, item.reason, item.name);
    assert.equal(result.decision.eligible_for_observation, false, item.name);
  }
});

test('stable status or assignee changes cancel, while a change during the double scan invalidates the read', async () => {
  const statusScenario = await prepareScenario();
  const resolved = defaultConversation({
    id: 700001,
    account_id: 179973,
    inbox_id: 128058,
    status: 'resolved',
  });
  statusScenario.harness.setConversationResponses([
    { statusCode: 200, body: resolved },
    { statusCode: 200, body: resolved },
  ]);
  const statusEvidence = await statusScenario.harness.runtime.performBoundedLiveReread({
    waitState: statusScenario.waitState,
  });
  assert.equal(statusEvidence.status_changed, true);
  const statusDecision = statusScenario.harness.runtime.buildPostDelayDecision({
    waitState: statusScenario.waitState,
    evidence: statusEvidence,
    state: validDecisionState(statusScenario.waitState),
  });
  assert.equal(statusDecision.cancellation_reason, 'status_changed');

  const assigneeScenario = await prepareScenario();
  const assigned = defaultConversation({
    meta: { assignee: { id: 42, account_id: 179973 } },
  });
  assigneeScenario.harness.setConversationResponses([
    { statusCode: 200, body: assigned },
    { statusCode: 200, body: assigned },
  ]);
  const assigneeEvidence = await assigneeScenario.harness.runtime.performBoundedLiveReread({
    waitState: assigneeScenario.waitState,
  });
  assert.equal(assigneeEvidence.assignee_changed, true);
  const assigneeDecision = assigneeScenario.harness.runtime.buildPostDelayDecision({
    waitState: assigneeScenario.waitState,
    evidence: assigneeEvidence,
    state: validDecisionState(assigneeScenario.waitState),
  });
  assert.equal(assigneeDecision.cancellation_reason, 'assignee_changed');

  const movingScenario = await prepareScenario();
  movingScenario.harness.setConversationResponses([
    { statusCode: 200, body: defaultConversation({ status: 'open' }) },
    { statusCode: 200, body: defaultConversation({ status: 'resolved' }) },
  ]);
  const moving = await movingScenario.harness.runtime.performBoundedLiveReread({
    waitState: movingScenario.waitState,
  });
  assert.equal(moving.live_read_status, 'conversation_changed');
  assert.equal(moving.source_verified, false);
});

test('official meta.assignee shape is authoritative and conflicting assignee aliases fail closed', async () => {
  const acceptedScenario = await prepareScenario();
  const officiallyAssigned = defaultConversation({
    meta: { assignee: { id: 42, account_id: 179973 } },
  });
  acceptedScenario.harness.setConversationResponses([
    { statusCode: 200, body: officiallyAssigned },
    { statusCode: 200, body: officiallyAssigned },
  ]);
  const accepted = await acceptedScenario.harness.runtime.performBoundedLiveReread({
    waitState: acceptedScenario.waitState,
  });
  assert.equal(accepted.live_read_status, 'verified');
  assert.equal(accepted.assignee_changed, true);

  const conflictingScenario = await prepareScenario();
  conflictingScenario.harness.setConversationResponses([
    {
      statusCode: 200,
      body: defaultConversation({
        assignee_id: 43,
        meta: { assignee: { id: 42, account_id: 179973 } },
      }),
    },
  ]);
  const conflicting = await conflictingScenario.harness.runtime.performBoundedLiveReread({
    waitState: conflictingScenario.waitState,
  });
  assert.equal(conflicting.live_read_status, 'route_mismatch');
  assert.equal(conflicting.source_verified, false);
  assert.equal(conflictingScenario.harness.calls.messages.length, 0);
});

test('post-delay requires exact trusted inputs and preserves cancellation priority', async () => {
  const result = await runClearScenario();
  const runtime = result.harness.runtime;
  const stale = runtime.buildPostDelayDecision({
    waitState: result.waitState,
    evidence: result.reread,
    state: validDecisionState(result.waitState, { currentGeneration: 2 }),
  });
  assert.equal(stale.cancellation_reason, 'stale_generation');
  const disabled = runtime.buildPostDelayDecision({
    waitState: result.waitState,
    evidence: result.reread,
    state: validDecisionState(result.waitState, { brandEnabled: false, killSwitch: true }),
  });
  assert.equal(disabled.cancellation_reason, 'brand_disabled');
  const killed = runtime.buildPostDelayDecision({
    waitState: result.waitState,
    evidence: result.reread,
    state: validDecisionState(result.waitState, { killSwitch: true }),
  });
  assert.equal(killed.cancellation_reason, 'brand_kill_switch');
  const consumed = runtime.buildPostDelayDecision({
    waitState: result.waitState,
    evidence: result.reread,
    state: validDecisionState(result.waitState, { idempotencyConsumed: true }),
  });
  assert.equal(consumed.cancellation_reason, 'idempotency_consumed');

  const tamperedEvidence = clone(result.reread);
  tamperedEvidence.event_identity_fingerprint = 'f'.repeat(64);
  const binding = runtime.buildPostDelayDecision({
    waitState: result.waitState,
    evidence: tamperedEvidence,
    state: validDecisionState(result.waitState),
  });
  assert.equal(binding.cancellation_reason, 'wait_state_binding_mismatch');
  assert.equal(binding.wait_state_binding_verified, false);

  assert.throws(
    () => runtime.buildPostDelayDecision({
      waitState: result.waitState,
      evidence: { ...result.reread, content: 'poison' },
      state: validDecisionState(result.waitState),
    }),
    (error) => error instanceof FailClosedError &&
      error.reasonCode === 'post_delay_evidence_invalid',
  );
  assert.throws(
    () => runtime.buildPostDelayDecision({
      waitState: result.waitState,
      evidence: result.reread,
      state: { currentGeneration: 1 },
    }),
    (error) => error instanceof FailClosedError &&
      error.reasonCode === 'post_delay_state_invalid',
  );
});

test('tampered Wait state and missing dependencies stop before any Chatwoot read', async () => {
  const scenario = await prepareScenario();
  const tampered = clone(scenario.waitState);
  tampered.anchor_message_id = '900002';
  await assert.rejects(
    scenario.harness.runtime.performBoundedLiveReread({ waitState: tampered }),
    (error) => error instanceof FailClosedError &&
      error.reasonCode === 'wait_state_fingerprint_invalid',
  );
  assert.equal(scenario.harness.calls.conversations.length, 0);
  assert.equal(scenario.harness.calls.messages.length, 0);

  const noReadRuntime = createChatwootObservationRuntime({
    clock: { nowEpochSeconds: () => NOW_EPOCH_SECONDS },
    crypto: {
      sha256Hex: (value) => require('node:crypto').createHash('sha256')
        .update(Buffer.from(value)).digest('hex'),
      hmacSha256Hex: (secret, value) => require('node:crypto').createHmac('sha256', secret)
        .update(Buffer.from(value)).digest('hex'),
      timingSafeEqualHex: (left, right) => left === right,
    },
  });
  const missing = await noReadRuntime.performBoundedLiveReread({
    waitState: scenario.waitState,
  });
  assert.equal(missing.live_read_status, 'unavailable');
  assert.equal(missing.source_verified, false);
});

test('recomputed Wait carriers still cannot bypass live delay policy or not-before time', async () => {
  const scenario = await prepareScenario();
  const outOfRange = clone(scenario.waitState);
  outOfRange.delay_seconds = 1;
  const carrier = {};
  for (const field of WAIT_CARRIER_FIELD_ORDER) carrier[field] = outOfRange[field];
  outOfRange.wait_state_fingerprint = sha256(JSON.stringify(carrier));
  await assert.rejects(
    scenario.harness.runtime.performBoundedLiveReread({ waitState: outOfRange }),
    (error) => error instanceof FailClosedError &&
      error.reasonCode === 'wait_live_delay_invalid',
  );

  const futureScenario = await prepareScenario();
  const future = clone(futureScenario.waitState);
  future.not_before = new Date((NOW_EPOCH_SECONDS + 30) * 1000).toISOString();
  const futureCarrier = {};
  for (const field of WAIT_CARRIER_FIELD_ORDER) futureCarrier[field] = future[field];
  future.wait_state_fingerprint = sha256(JSON.stringify(futureCarrier));
  const early = await futureScenario.harness.runtime.performBoundedLiveReread({
    waitState: future,
  });
  assert.equal(early.live_read_status, 'unavailable');
  assert.equal(futureScenario.harness.calls.conversations.length, 0);
  assert.equal(futureScenario.harness.calls.messages.length, 0);
});

test('expired pinned event or baseline HMAC keys stop the post-Wait read before Chatwoot IO', async () => {
  const eventScenario = await prepareScenario();
  const eventKey = eventScenario.harness.eventKeys.find(
    (entry) => entry.version === eventScenario.waitState.event_identity_key_version,
  );
  eventKey.state = 'retained';
  eventKey.retainUntilEpochSeconds = NOW_EPOCH_SECONDS - 1;
  const eventExpired = await eventScenario.harness.runtime.performBoundedLiveReread({
    waitState: eventScenario.waitState,
  });
  assert.equal(eventExpired.live_read_status, 'unavailable');
  assert.equal(eventScenario.harness.calls.conversations.length, 0);

  const baselineScenario = await prepareScenario();
  baselineScenario.harness.baselineKey.state = 'retained';
  baselineScenario.harness.baselineKey.retainUntilEpochSeconds = NOW_EPOCH_SECONDS - 1;
  const baselineExpired = await baselineScenario.harness.runtime.performBoundedLiveReread({
    waitState: baselineScenario.waitState,
  });
  assert.equal(baselineExpired.live_read_status, 'unavailable');
  assert.equal(baselineScenario.harness.calls.conversations.length, 0);
});
