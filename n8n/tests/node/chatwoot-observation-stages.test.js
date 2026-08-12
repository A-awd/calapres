'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { TextDecoder } = require('node:util');

const stagesModule = require('../../runtime/chatwoot-observation-stages.js');
const monolithicRuntime = require('../../runtime/chatwoot-observation-runtime.js');

const EVENT_KEY = 'calapres-identity-hmac-v1';
const BASELINE_KEY = 'calapres-hmac-v1';
const WEBHOOK_SECRET = 'test-chatwoot-webhook-secret-with-32-bytes';
const EVENT_SECRET = 'test-event-identity-secret-with-32-bytes';
const BASELINE_SECRET = 'test-baseline-state-secret-with-32-bytes';
const EPOCH = 1786453200;
const ATTACKS = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'chatwoot-observation-stage-attacks.json'),
  'utf8',
));

function sha256Hex(value) {
  return crypto.createHash('sha256').update(Buffer.from(value)).digest('hex');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const dependencies = Object.freeze({
  base64ToBytes: (value) => new Uint8Array(Buffer.from(value, 'base64')),
  bytesToBase64: (value) => Buffer.from(value).toString('base64'),
  utf8ToBytes: (value) => new Uint8Array(Buffer.from(value, 'utf8')),
  bytesToUtf8Fatal: (value) => new TextDecoder('utf-8', { fatal: true }).decode(value),
  sha256Hex,
  timingSafeEqualHex: (left, right) => {
    if (!/^[a-f0-9]{64}$/.test(left || '') || !/^[a-f0-9]{64}$/.test(right || '')) return false;
    return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
  },
});

const stages = stagesModule.createChatwootObservationStages(dependencies);

function hmac(secret, value) {
  return crypto.createHmac('sha256', secret).update(Buffer.from(value)).digest('hex');
}

function secretFor(keyVersion) {
  if (keyVersion === EVENT_KEY) return EVENT_SECRET;
  if (keyVersion === BASELINE_KEY) return BASELINE_SECRET;
  throw new Error('unknown test key version: ' + keyVersion);
}

function nativeHmacResults(requests) {
  return requests.map((request) => ({
    purpose: request.purpose,
    key_version: request.key_version,
    digest_hex: hmac(secretFor(request.key_version), request.material_utf8),
  }));
}

function payload(inboxId = 128058, overrides = {}) {
  const value = {
    event: 'message_created',
    id: 900001,
    message_type: 'incoming',
    private: false,
    content: 'وين طلبي؟',
    created_at: EPOCH,
    account: { id: 179973 },
    inbox: { id: inboxId },
    conversation: { id: 700001, account_id: 179973, inbox_id: inboxId },
    sender: { id: 810001, type: 'contact' },
    attachments: [],
  };
  return Object.assign(value, overrides);
}

function webhookProjection(rawText, overrides = {}) {
  const raw = Buffer.from(rawText, 'utf8');
  const timestamp = String(EPOCH);
  return {
    schema_version: '1.0',
    content_type: 'application/json; charset=utf-8',
    timestamp_header: timestamp,
    signature_header: 'sha256=' + hmac(WEBHOOK_SECRET, Buffer.concat([
      Buffer.from(timestamp + '.', 'utf8'), raw,
    ])),
    delivery_header: 'delivery-test-0001',
    raw_body_base64: raw.toString('base64'),
    received_epoch_seconds: EPOCH,
    ...overrides,
  };
}

function signedReplayGate(body) {
  const rawText = typeof body === 'string' ? body : JSON.stringify(body);
  const preflight = stages.prepareSignedIngress(webhookProjection(rawText));
  assert.equal(preflight.status, 'eligible');
  const computed = hmac(
    WEBHOOK_SECRET,
    Buffer.from(preflight.transient.signed_payload_base64, 'base64'),
  );
  const signed = stages.finalizeSignedHmac({
    preflight,
    computed_hmac_hex: computed,
    compared_epoch_seconds: EPOCH,
  });
  assert.equal(signed.status, 'verified');
  return Object.freeze({
    schema_version: '1.0', kind: 'chatwoot_request_replay_gate_v1',
    status: 'proceed_parse', response_code: 0, reason_code: null,
    raw_binding: signed.raw_binding,
    replay_key_fingerprint: signed.replay_identity.replay_key_fingerprint,
    customer_egress_allowed: false,
  });
}

function routeIdentity(inboxId = 128058, overrides = {}) {
  const replayGate = signedReplayGate(payload(inboxId, overrides));
  const eventPlan = stages.prepareEventIdentity({
    replay_gate: replayGate,
    active_key_version: EVENT_KEY,
    retained_key_versions: [],
  });
  const eventIdentity = stages.finalizeEventIdentity({
    event_plan: eventPlan,
    hmac_results: nativeHmacResults(eventPlan.hmac_requests),
  });
  return stages.finalizeRouteFingerprints({
    event_identity: eventIdentity,
    hmac_results: nativeHmacResults(eventIdentity.route_hmac_requests),
  });
}

function conversationHttp(route, overrides = {}) {
  return {
    status_code: 200,
    body: {
      id: Number(route.conversation_id),
      account_id: route.account_id,
      inbox_id: route.inbox_id,
      status: 'open',
      meta: { assignee: { id: 441001, account_id: route.account_id } },
      ...overrides,
    },
    error_code: null,
  };
}

function committedIngress(inboxId = 128058) {
  const route = routeIdentity(inboxId);
  const activeVersion = route.active_key_version;
  const core = {
    brand_id: 'calapres', account_id: route.account_id, inbox_id: route.inbox_id,
    channel: route.channel, conversation_id: route.conversation_id,
    anchor_message_id: route.message_id,
    conversation_fingerprint: route.conversation_fingerprints[activeVersion],
    message_fingerprint: route.message_fingerprints[activeVersion],
    correlation_id: route.correlation_id,
    event_identity_key_version: activeVersion,
    event_identity_fingerprint: route.event_identity_fingerprints[activeVersion],
    generation: 1, delay_policy_version: route.delay_policy_version,
    delay_seconds: route.delay_seconds, not_before: route.not_before,
    knowledge_version: '2026-08-11-v3',
  };
  const commitBinding = sha256Hex(Buffer.from(
    'calapres-observation-stage-binding-v1:' + stagesModule.stableJson(core),
  ));
  return Object.freeze({
    schema_version: '1.0', kind: 'chatwoot_ingress_commit_v1', status: 'committed',
    response_code: 204, reason_code: null,
    committed: Object.freeze({ ...core, commit_binding_sha256: commitBinding }),
    customer_egress_allowed: false,
  });
}

function readyWait(inboxId = 128058) {
  const commit = committedIngress(inboxId);
  const baseline = stages.prepareBaseline({
    ingress_commit: commit,
    conversation_http: conversationHttp(commit.committed),
    baseline_key_version: BASELINE_KEY,
  });
  return stages.finalizeWaitState({
    baseline_plan: baseline,
    hmac_results: nativeHmacResults(baseline.hmac_requests),
  }).wait_state;
}

function messageRow(wait, id = Number(wait.anchor_message_id), overrides = {}) {
  return {
    id,
    account_id: wait.account_id,
    inbox_id: wait.inbox_id,
    conversation_id: Number(wait.conversation_id),
    message_type: 0,
    private: false,
    created_at: EPOCH,
    content: id === Number(wait.anchor_message_id) ? 'وين طلبي؟' : 'رسالة أحدث',
    attachments: [],
    sender: { id: 810001, type: 'contact' },
    ...overrides,
  };
}

function messagesHttp(rows) {
  return { status_code: 200, body: { payload: rows }, error_code: null };
}

function runReread(wait, rows, gateOverrides = {}, conversationAfterOverrides = {}) {
  const start = Math.ceil(Date.parse(wait.not_before) / 1000) + 1;
  const before = conversationHttp(wait);
  const after = conversationHttp(wait, conversationAfterOverrides);
  const rereadPlan = stages.prepareBoundedReread({
    schema_version: '1.0',
    wait_state: wait,
    read_started_epoch_seconds: start,
    conversation_before: before,
    messages_first: messagesHttp(rows),
    messages_second: messagesHttp(rows),
    conversation_after: after,
  });
  const messagePlan = stages.prepareRereadMessageFingerprints({
    reread_plan: rereadPlan,
    event_hmac_results: nativeHmacResults(rereadPlan.event_hmac_requests),
  });
  return stages.finalizePostDelay({
    message_plan: messagePlan,
    message_hmac_results: nativeHmacResults(messagePlan.message_hmac_requests),
    baseline_hmac_results: nativeHmacResults(rereadPlan.baseline_hmac_requests),
    gate_state: {
      current_generation: wait.generation,
      idempotency_consumed: false,
      brand_enabled: true,
      kill_switch: false,
      ...gateOverrides,
    },
    evaluated_epoch_seconds: start + 1,
  });
}

test('parity manifest hash and selected monolithic runtime constants are exact', () => {
  const digest = sha256Hex(Buffer.from(stagesModule.stableJson(stagesModule.PARITY_MANIFEST)));
  assert.equal(digest, stagesModule.PARITY_MANIFEST_SHA256);
  assert.equal(stagesModule.ACCOUNT_ID, monolithicRuntime.ACCOUNT_ID);
  assert.deepEqual(stagesModule.INBOX_CHANNELS, monolithicRuntime.INBOX_CHANNELS);
  assert.equal(stagesModule.MAX_RAW_BODY_SIZE_BYTES, monolithicRuntime.MAX_RAW_BODY_SIZE_BYTES);
  assert.equal(stagesModule.MAX_AGE_SECONDS, monolithicRuntime.MAX_AGE_SECONDS);
  assert.equal(stagesModule.MAX_FUTURE_SKEW_SECONDS, monolithicRuntime.MAX_FUTURE_SKEW_SECONDS);
  assert.equal(stagesModule.SCAN_PAGE_SIZE_LIMIT, monolithicRuntime.SCAN_PAGE_SIZE_LIMIT);
  assert.equal(
    stagesModule.EVENT_IDENTITY_CANONICAL_FORMAT,
    monolithicRuntime.EVENT_IDENTITY_CANONICAL_FORMAT,
  );
  assert.deepEqual(stagesModule.WAIT_CARRIER_FIELD_ORDER, monolithicRuntime.WAIT_CARRIER_FIELD_ORDER);
});

test('event and PostgreSQL storage key versions use one collision-free exact mapping', () => {
  assert.deepEqual(stagesModule.EVENT_TO_STORAGE_KEY_VERSION, {
    'calapres-identity-hmac-v1': 'hmac-sha256-v1',
  });
  assert.deepEqual(stagesModule.STORAGE_TO_EVENT_KEY_VERSION, {
    'hmac-sha256-v1': 'calapres-identity-hmac-v1',
  });
  const eventVersion = 'calapres-identity-hmac-v1';
  const storageVersion = stagesModule.eventKeyVersionToStorage(eventVersion);
  assert.equal(storageVersion, 'hmac-sha256-v1');
  assert.equal(stagesModule.storageKeyVersionToEvent(storageVersion), eventVersion);
  assert.equal(new Set(Object.values(stagesModule.EVENT_TO_STORAGE_KEY_VERSION)).size,
    Object.keys(stagesModule.EVENT_TO_STORAGE_KEY_VERSION).length);
  assert.throws(() => stagesModule.eventKeyVersionToStorage('calapres-identity-hmac-v2'),
    /storage_key_version_unknown/);
  assert.throws(() => stagesModule.eventKeyVersionToStorage('hmac-sha256-v1'),
    /storage_key_version_unknown/);
  assert.throws(() => stagesModule.storageKeyVersionToEvent('hmac-sha256-v2'),
    /event_key_version_unknown/);
});

test('all four allowlisted inboxes pass the complete staged path', () => {
  const expected = new Map([
    [128031, 'instagram'], [128033, 'tiktok'], [128058, 'whatsapp'], [128326, 'email'],
  ]);
  for (const [inboxId, channel] of expected) {
    const wait = readyWait(inboxId);
    assert.equal(wait.channel, channel);
    const route = routeIdentity(inboxId);
    assert.deepEqual(route.storage_key_versions, {
      active: 'hmac-sha256-v1', retained: [],
    });
    const result = runReread(wait, [messageRow(wait)]);
    assert.equal(result.status, 'eligible');
    assert.equal(result.eligible_for_observation, true);
    assert.equal(result.verified_anchor.content, 'وين طلبي؟');
    assert.equal(result.verified_anchor.persistence_allowed, false);
    assert.equal(result.customer_egress_allowed, false);
    assert.equal(JSON.stringify(result).includes('first_rows'), false);
    assert.equal(JSON.stringify(result).includes('raw_body_base64'), false);
  }
});

test('the exact raw bytes are signed; JSON reserialization is not equivalent', () => {
  const raw = '{\n  "event": "message_created"\n}';
  const projection = webhookProjection(raw);
  const preflight = stages.prepareSignedIngress(projection);
  const reformatted = JSON.stringify(JSON.parse(raw));
  const wrong = hmac(WEBHOOK_SECRET, Buffer.from(projection.timestamp_header + '.' + reformatted));
  const rejected = stages.finalizeSignedHmac({
    preflight,
    computed_hmac_hex: wrong,
    compared_epoch_seconds: EPOCH,
  });
  assert.equal(rejected.status, 'fail_closed');
  assert.equal(rejected.reason_code, 'signature_mismatch');
  assert.equal(rejected.raw_binding, null);
});

test('preflight attack matrix rejects before any parse or persistence envelope', () => {
  const valid = webhookProjection(JSON.stringify(payload()));
  for (const attack of ATTACKS.preflight) {
    let candidate = { ...valid };
    if (attack.mutation === 'empty_body') candidate.raw_body_base64 = '';
    if (attack.mutation === 'oversized_body') {
      candidate.raw_body_base64 = Buffer.alloc(1024 * 1024 + 1, 0x61).toString('base64');
    }
    if (attack.mutation === 'stale_timestamp') candidate.timestamp_header = String(EPOCH - 301);
    if (attack.mutation === 'future_timestamp') candidate.timestamp_header = String(EPOCH + 61);
    if (attack.mutation === 'malformed_signature') candidate.signature_header = 'sha256=abc';
    if (attack.mutation === 'noncanonical_base64') candidate.raw_body_base64 = 'Zh==';
    const result = stages.prepareSignedIngress(candidate);
    assert.equal(result.status, attack.expected_status, attack.mutation);
    assert.equal(result.reason_code, attack.expected_reason, attack.mutation);
    assert.equal(result.response_code, attack.expected_code, attack.mutation);
    assert.equal(result.transient, null, attack.mutation);
  }
});

test('obsolete non-atomic replay and ingress ACK helpers are absent and fail closed', () => {
  assert.equal(stages.finalizeRequestReplay, undefined);
  assert.equal(stages.finalizeIngressCommit, undefined);
  const duplicate = {
    schema_version: '1.0', kind: 'chatwoot_request_replay_gate_v1',
    status: 'ack_duplicate', response_code: 204, reason_code: 'duplicate_delivery',
    raw_binding: null, replay_key_fingerprint: 'a'.repeat(64),
    customer_egress_allowed: false,
  };
  assert.throws(() => stages.prepareEventIdentity({
    replay_gate: duplicate, active_key_version: EVENT_KEY, retained_key_versions: [],
  }), /verified_replay_required/);
  const stageSource = fs.readFileSync(path.join(__dirname, '..', '..', 'runtime',
    'chatwoot-observation-stages.js'), 'utf8');
  assert.equal(stageSource.includes('finalizeRequestReplay'), false);
  assert.equal(stageSource.includes('finalizeIngressCommit'), false);
  assert.equal(stageSource.includes("outcome === 'duplicate'"), false);
});

test('raw binding, route, direction, visibility, sender, and bot gates fail closed', () => {
  const validGate = signedReplayGate(payload());
  const tampered = JSON.parse(JSON.stringify(validGate));
  tampered.raw_binding.raw_body_base64 = Buffer.from('{}').toString('base64');
  assert.throws(() => stages.prepareEventIdentity({
    replay_gate: tampered, active_key_version: EVENT_KEY, retained_key_versions: [],
  }), /raw_binding_mismatch/);

  const cases = [
    [payload(128058, { account: { id: 999999 } }), 'account_not_allowlisted'],
    [payload(128028), 'inbox_not_allowlisted'],
    [payload(128058, { message_type: 'outgoing' }), 'message_not_inbound'],
    [payload(128058, { private: true }), 'private_note_rejected'],
    [payload(128058, { sender: { id: 1, type: 'agent_bot' } }), 'bot_echo_rejected'],
    [payload(128058, { sender: null }), 'sender_ref_missing'],
  ];
  for (const [body, reason] of cases) {
    const gate = signedReplayGate(body);
    assert.throws(() => stages.prepareEventIdentity({
      replay_gate: gate, active_key_version: EVENT_KEY, retained_key_versions: [],
    }), new RegExp(reason));
  }
  const ignoredPayloadBrand = routeIdentity(128058, { brand_id: 'attacker-brand' });
  assert.equal(ignoredPayloadBrand.brand_id, 'calapres');
});

test('HMAC plans require exact statically-bound key-version results', () => {
  const replayGate = signedReplayGate(payload());
  const plan = stages.prepareEventIdentity({
    replay_gate: replayGate, active_key_version: EVENT_KEY, retained_key_versions: [],
  });
  assert.throws(() => stages.finalizeEventIdentity({ event_plan: plan, hmac_results: [] }),
    /event_identity_hmac_results_invalid/);
  const forged = nativeHmacResults(plan.hmac_requests);
  forged[0].key_version = 'calapres-identity-hmac-v2';
  assert.throws(() => stages.finalizeEventIdentity({ event_plan: plan, hmac_results: forged }),
    /event_identity_hmac_results_invalid/);
});

test('the Wait carrier is exact, identifiers-only, and binding protected', () => {
  const wait = readyWait();
  assert.equal(Object.keys(wait).length, stagesModule.WAIT_CARRIER_FIELD_ORDER.length + 1);
  assert.equal(JSON.stringify(wait).includes('وين طلبي'), false);
  assert.equal(JSON.stringify(wait).includes('sender'), false);
  assert.throws(() => stages.validateWaitState({ ...wait, content: 'leak' }), /wait_state_shape_invalid/);
  assert.throws(() => stages.validateWaitState({ ...wait, generation: 2 }),
    /wait_state_fingerprint_mismatch/);
});

test('bounded reread rejects changed sets, changed content, 100-row scans, and route drift', () => {
  const wait = readyWait();
  const start = Math.ceil(Date.parse(wait.not_before) / 1000) + 1;
  const base = {
    schema_version: '1.0', wait_state: wait, read_started_epoch_seconds: start,
    conversation_before: conversationHttp(wait),
    messages_first: messagesHttp([messageRow(wait)]),
    messages_second: messagesHttp([messageRow(wait, Number(wait.anchor_message_id), { content: 'نص متغير' })]),
    conversation_after: conversationHttp(wait),
  };
  assert.throws(() => stages.prepareBoundedReread(base), /scan_changed/);
  const hundred = Array.from({ length: 100 }, (_, index) =>
    messageRow(wait, Number(wait.anchor_message_id) + index));
  assert.throws(() => stages.prepareBoundedReread({
    ...base, messages_first: messagesHttp(hundred), messages_second: messagesHttp(hundred),
  }), /scan_truncated/);
  assert.throws(() => stages.prepareBoundedReread({
    ...base,
    messages_second: messagesHttp([messageRow(wait)]),
    conversation_after: conversationHttp(wait, { inbox_id: 128031 }),
  }), /conversation_route_invalid/);
});

test('bounded reread HMACs only the anchor and hashes canonical sanitized row sets and metadata', () => {
  const wait = readyWait();
  const start = Math.ceil(Date.parse(wait.not_before) / 1000) + 1;
  const anchor = messageRow(wait);
  const newer = messageRow(wait, Number(wait.anchor_message_id) + 1);
  const build = (firstRows, secondRows) => stages.prepareBoundedReread({
    schema_version: '1.0', wait_state: wait, read_started_epoch_seconds: start,
    conversation_before: conversationHttp(wait),
    messages_first: messagesHttp(firstRows), messages_second: messagesHttp(secondRows),
    conversation_after: conversationHttp(wait),
  });
  const plan = build([anchor, newer], [anchor, newer]);
  assert.equal(plan.event_hmac_requests.length, 1);
  assert.equal(plan.event_hmac_requests[0].purpose, 'message_event_' + wait.anchor_message_id);
  assert.equal(plan.baseline_hmac_requests.length, 4);
  const messagePlan = stages.prepareRereadMessageFingerprints({
    reread_plan: plan,
    event_hmac_results: nativeHmacResults(plan.event_hmac_requests),
  });
  assert.equal(messagePlan.message_hmac_requests.length, 1);
  assert.equal(
    messagePlan.message_hmac_requests[0].purpose,
    'message_anchor_' + wait.anchor_message_id,
  );

  for (const mutation of [
    { content: 'نص متغير' },
    { message_type: 1 },
    { private: true },
    { created_at: EPOCH + 1 },
    { sender: { id: 810001, type: 'agent' } },
    { attachments: [{ id: 1 }] },
  ]) {
    assert.throws(
      () => build([anchor, newer], [anchor, messageRow(
        wait, Number(wait.anchor_message_id) + 1, mutation,
      )]),
      /scan_changed/,
    );
  }
  assert.doesNotThrow(() => build([anchor, newer], [newer, anchor]));
  assert.throws(() => build([anchor, newer], [anchor, newer, newer]), /message_scan_invalid/);
});

test('same-second newer inbound, human, private, and agent-bot rows cancel without per-row HMAC', () => {
  const wait = readyWait();
  const next = Number(wait.anchor_message_id) + 1;
  for (const [row, reason] of [
    [messageRow(wait, next, { created_at: EPOCH }), 'newer_inbound'],
    [messageRow(wait, next, {
      created_at: EPOCH, message_type: 1, sender: { id: 441001, type: 'agent' },
    }), 'human_intervention'],
    [messageRow(wait, next, {
      created_at: EPOCH, message_type: 1, private: true,
      sender: { id: 441001, type: 'agent' },
    }), 'private_note_present'],
    [messageRow(wait, next, {
      created_at: EPOCH, message_type: 1,
      sender: { id: 991001, type: 'agent_bot' },
    }), 'newer_non_activity'],
  ]) {
    const result = runReread(wait, [messageRow(wait), row]);
    assert.equal(result.status, 'cancelled');
    assert.equal(result.cancellation_reason, reason);
    assert.equal(result.verified_anchor, null);
  }
});

test('anchor event or message HMAC mismatch fails closed after stable row-set hashing', () => {
  const wait = readyWait();
  const start = Math.ceil(Date.parse(wait.not_before) / 1000) + 1;
  const plan = stages.prepareBoundedReread({
    schema_version: '1.0', wait_state: wait, read_started_epoch_seconds: start,
    conversation_before: conversationHttp(wait),
    messages_first: messagesHttp([messageRow(wait)]),
    messages_second: messagesHttp([messageRow(wait)]),
    conversation_after: conversationHttp(wait),
  });
  const validEvents = nativeHmacResults(plan.event_hmac_requests);
  const validMessagePlan = stages.prepareRereadMessageFingerprints({
    reread_plan: plan, event_hmac_results: validEvents,
  });
  const baseline = nativeHmacResults(plan.baseline_hmac_requests);
  const gate = {
    current_generation: wait.generation, idempotency_consumed: false,
    brand_enabled: true, kill_switch: false,
  };
  const wrongEvents = clone(validEvents);
  wrongEvents[0].digest_hex = '0'.repeat(64);
  const wrongEventMessagePlan = stages.prepareRereadMessageFingerprints({
    reread_plan: plan, event_hmac_results: wrongEvents,
  });
  assert.throws(() => stages.finalizePostDelay({
    message_plan: wrongEventMessagePlan,
    message_hmac_results: nativeHmacResults(wrongEventMessagePlan.message_hmac_requests),
    baseline_hmac_results: baseline, gate_state: gate, evaluated_epoch_seconds: start + 1,
  }), /bounded_reread_binding_failed/);

  const wrongMessages = nativeHmacResults(validMessagePlan.message_hmac_requests);
  wrongMessages[0].digest_hex = 'f'.repeat(64);
  assert.throws(() => stages.finalizePostDelay({
    message_plan: validMessagePlan, message_hmac_results: wrongMessages,
    baseline_hmac_results: baseline, gate_state: gate, evaluated_epoch_seconds: start + 1,
  }), /bounded_reread_binding_failed/);
});

test('post-delay attack matrix cancels before anchor release', () => {
  for (const attack of ATTACKS.post_delay) {
    const wait = readyWait();
    let rows = [messageRow(wait)];
    const gate = {};
    if (attack.mutation === 'newer_inbound') rows.push(messageRow(wait, Number(wait.anchor_message_id) + 1));
    if (attack.mutation === 'human_reply') rows.push(messageRow(wait, Number(wait.anchor_message_id) + 1, {
      message_type: 1, content: 'تم الرد', sender: { id: 441001, type: 'agent' },
    }));
    if (attack.mutation === 'private_note') rows.push(messageRow(wait, Number(wait.anchor_message_id) + 1, {
      message_type: 1, private: true, content: 'ملاحظة', sender: { id: 441001, type: 'agent' },
    }));
    if (attack.mutation === 'stale_generation') gate.current_generation = wait.generation + 1;
    if (attack.mutation === 'kill_switch') gate.kill_switch = true;
    if (attack.mutation === 'brand_disabled') gate.brand_enabled = false;
    if (attack.mutation === 'idempotency_consumed') gate.idempotency_consumed = true;
    const result = runReread(wait, rows, gate);
    assert.equal(result.status, attack.expected_status, attack.mutation);
    assert.equal(result.cancellation_reason, attack.expected_reason, attack.mutation);
    assert.equal(result.verified_anchor, null, attack.mutation);
    assert.equal(result.customer_egress_allowed, false, attack.mutation);
  }
});

test('conversation status or assignee drift cancels and never releases content', () => {
  const wait = readyWait();
  const status = runReread(wait, [messageRow(wait)], {}, { status: 'pending' });
  assert.equal(status.status, 'cancelled');
  assert.equal(status.cancellation_reason, 'conversation_changed');
  assert.equal(status.verified_anchor, null);
  const assignee = runReread(wait, [messageRow(wait)], {}, {
    meta: { assignee: { id: 441002, account_id: wait.account_id } },
  });
  assert.equal(assignee.status, 'cancelled');
  assert.equal(assignee.cancellation_reason, 'conversation_changed');
});

test('plan mutation between native nodes is rejected before the next stage', () => {
  const wait = readyWait();
  const start = Math.ceil(Date.parse(wait.not_before) / 1000) + 1;
  const plan = stages.prepareBoundedReread({
    schema_version: '1.0', wait_state: wait, read_started_epoch_seconds: start,
    conversation_before: conversationHttp(wait), messages_first: messagesHttp([messageRow(wait)]),
    messages_second: messagesHttp([messageRow(wait)]), conversation_after: conversationHttp(wait),
  });
  const tampered = JSON.parse(JSON.stringify(plan));
  tampered.second_rows[0].anchor_content = 'محتوى محقون';
  assert.throws(() => stages.prepareRereadMessageFingerprints({
    reread_plan: tampered,
    event_hmac_results: nativeHmacResults(plan.event_hmac_requests),
  }), /reread_plan_invalid/);
});

test('fail-closed adapter emits only a safe reason code', () => {
  const envelope = stagesModule.failClosedEnvelope(
    'prepare_event_identity',
    new stagesModule.FailClosedError('verified_payload_json_invalid'),
  );
  assert.deepEqual(envelope, {
    schema_version: '1.0', kind: 'chatwoot_stage_failure_v1',
    stage: 'prepare_event_identity', status: 'fail_closed',
    reason_code: 'verified_payload_json_invalid', customer_egress_allowed: false,
  });
});

test('stage source has no direct effect, credential, secret, or customer-send access', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'runtime',
    'chatwoot-observation-stages.js'), 'utf8');
  for (const forbidden of [
    'require(', 'fetch(', '$http', 'process.env', 'getCredentials(', 'DataTable(',
    'api.chatwoot.com', 'access_token', 'hmacSecret', 'customer-send',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});
