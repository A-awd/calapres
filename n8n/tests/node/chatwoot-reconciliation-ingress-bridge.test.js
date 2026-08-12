'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const bridgePath = path.join(
  __dirname,
  '..',
  '..',
  'runtime',
  'chatwoot-reconciliation-ingress-bridge.js',
);
const reconciliationPath = path.join(
  __dirname,
  '..',
  '..',
  'runtime',
  'chatwoot-reconciliation-runtime.js',
);
const atomicPath = path.join(
  __dirname,
  '..',
  '..',
  'adapters',
  'atomic-storage-contract.js',
);

const {
  ACCOUNT_ID,
  BRAND_ID,
  INBOX_CHANNELS,
  NATIVE_CRYPTO_TRUST_BOUNDARY,
  REQUEST_ATTEMPT_IDENTITY_DOMAIN,
  REQUEST_SOURCE,
  ReconciliationIngressBridgeError,
  createChatwootReconciliationIngressBridge,
  stableJson,
} = require(bridgePath);
const { createChatwootReconciliationRuntime } = require(reconciliationPath);
const { patterns, validateCommand } = require(atomicPath);

const fixture = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'chatwoot-reconciliation-scenarios.json'),
  'utf8',
));

const EVENT_V1 = 'calapres-identity-hmac-v1';
const EVENT_V2 = 'calapres-identity-hmac-v2';
const STORAGE_V1 = 'hmac-sha256-v1';
const STORAGE_V2 = 'hmac-sha256-v2';
const EVENT_SECRETS = Object.freeze({
  [EVENT_V1]: 'test-reconciliation-event-secret-v1-with-32-bytes',
  [EVENT_V2]: 'test-reconciliation-event-secret-v2-with-32-bytes',
});
const candidatePages = new Map();

const sha256Hex = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

function hmac(keyVersion, material) {
  const secret = EVENT_SECRETS[keyVersion];
  if (!secret) throw new Error('unknown test key version: ' + keyVersion);
  return crypto.createHmac('sha256', secret).update(material, 'utf8').digest('hex');
}

function keyConfig(active = EVENT_V1, retained = []) {
  const map = {};
  for (const version of [active, ...retained]) {
    map[version] = version === EVENT_V1 ? STORAGE_V1 : STORAGE_V2;
  }
  return {
    active,
    retained,
    map,
    registry: active === EVENT_V2 ? 'calapres-storage-keys-v2' : 'calapres-storage-keys-v1',
  };
}

function createCandidate(config = keyConfig(), overrides = {}) {
  const inboxId = overrides.inbox_id || fixture.inboxes.whatsapp;
  const conversationId = overrides.conversation_id || 7001;
  const messageId = overrides.message_id || 201;
  const runtime = createChatwootReconciliationRuntime({
    sha256Hex,
    active_event_identity_key_version: config.active,
    retained_event_identity_key_versions: config.retained,
    activation_floor_at: fixture.activation_floor_at,
    activation_policy_version: fixture.activation_policy_version,
  });
  const page = runtime.normalizeMessagesAfterPage({
    schema_version: '1.0',
    kind: 'chatwoot_reconciliation_messages_after_projection_v1',
    status_code: 200,
    account_id: fixture.account_id,
    inbox_id: inboxId,
    conversation_id: conversationId,
    requested_after_message_id: messageId - 1,
    retry_after_seconds: null,
    error_code: null,
    rows: [{
      id: messageId,
      account_id: fixture.account_id,
      inbox_id: inboxId,
      conversation_id: conversationId,
      created_at: 1786492801,
      message_type: 0,
      private: false,
      sender_type: 'contact',
      attachment_count: overrides.attachment_count || 0,
    }],
  });
  assert.equal(page.event_candidates.length, 1);
  const candidate = page.event_candidates[0];
  candidatePages.set(candidate.candidate_binding_sha256, page);
  return candidate;
}

function reconciliationContext(candidate, overrides = {}) {
  const page = candidatePages.get(candidate.candidate_binding_sha256);
  assert.ok(page);
  return {
    scan_id: 'cwrs_' + 'a'.repeat(24),
    scan_lease_token: 'reconciliation_scan_lease_token_001',
    expected_after_message_id: page.requested_after_message_id,
    ...overrides,
  };
}

function createBridge(config = keyConfig(), overrides = {}) {
  const reconciliation = createChatwootReconciliationRuntime({
    sha256Hex,
    active_event_identity_key_version: config.active,
    retained_event_identity_key_versions: config.retained,
    activation_floor_at: fixture.activation_floor_at,
    activation_policy_version: fixture.activation_policy_version,
  });
  return createChatwootReconciliationIngressBridge({
    sha256Hex,
    validate_messages_page: (page) => reconciliation.validateMessagesPage(page),
    active_event_identity_key_version: config.active,
    retained_event_identity_key_versions: config.retained,
    event_to_storage_key_versions: config.map,
    key_registry_version: config.registry,
    activation_floor_at: fixture.activation_floor_at,
    activation_policy_version: fixture.activation_policy_version,
    request_ttl_seconds: 600,
    event_retention_seconds: 604800,
    lease_duration_seconds: 300,
    baseline_fingerprint_key_version: 'calapres-hmac-v1',
    knowledge_version: '2026-08-11-v3',
    retention_seconds: 7776000,
    ...overrides,
  });
}

function nativeCryptoChainOutput(carrier) {
  const output = clone(carrier);
  const lineage = carrier.native_crypto_lineage;
  assert.equal(lineage.trust_boundary, NATIVE_CRYPTO_TRUST_BOUNDARY);
  for (const step of lineage.steps) {
    const request = carrier[lineage.request_array_property][step.sequence - 1];
    assert.equal(request.purpose, step.purpose);
    assert.equal(request.key_version, step.key_version);
    assert.equal(request.request_binding_sha256, step.request_binding_sha256);
    output[step.digest_property] = hmac(request.key_version, request.material_utf8);
  }
  return output;
}

function complete(config = keyConfig(), options = {}) {
  const bridge = createBridge(config);
  const candidate = createCandidate(config, options);
  const plan = bridge.prepareCandidateIdentity({
    messages_page: candidatePages.get(candidate.candidate_binding_sha256),
    candidate,
    reconciliation_context: reconciliationContext(candidate, options.reconciliation_context),
    execution_id: options.execution_id || 'reconciliation_test_execution_001',
  });
  const identity = bridge.finalizeCandidateIdentity(nativeCryptoChainOutput(plan));
  const projection = bridge.finalizeRouteAndProjectAtomicClaims(
    nativeCryptoChainOutput(identity),
  );
  return { bridge, candidate, plan, identity, projection };
}

function assertBridgeError(action, reasonCode) {
  assert.throws(action, (error) =>
    error instanceof ReconciliationIngressBridgeError && error.reasonCode === reasonCode);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rehashMessagesPage(page) {
  const copy = clone(page);
  delete copy.page_binding_sha256;
  return {
    ...copy,
    page_binding_sha256: sha256Hex(
      'calapres-chatwoot-reconciliation-message-page-v1:' + stableJson(copy),
    ),
  };
}

test('bridge is Calapres-only, covers the four exact inboxes, and emits no signed-webhook claim', () => {
  assert.equal(BRAND_ID, 'calapres');
  assert.equal(ACCOUNT_ID, 179973);
  assert.deepEqual(INBOX_CHANNELS, {
    128031: 'instagram',
    128033: 'tiktok',
    128058: 'whatsapp',
    128326: 'email',
  });
  for (const [channel, inboxId] of Object.entries(fixture.inboxes)) {
    const { plan, projection } = complete(keyConfig(), {
      inbox_id: inboxId,
      conversation_id: 7100 + inboxId % 100,
      message_id: 301 + inboxId % 10,
      execution_id: 'execution_' + channel,
    });
    assert.equal(projection.route_identity.channel, channel);
    assert.equal(plan.ingress_mode, 'reconciliation_api_read');
    assert.equal(plan.signed_webhook_evidence, null);
    assert.equal(plan.raw_body_evidence, null);
    assert.equal(plan.trust_boundary, NATIVE_CRYPTO_TRUST_BOUNDARY);
    assert.equal(plan.cryptographic_verification_performed_in_code, false);
    assert.equal(projection.signed_webhook_evidence, null);
    assert.equal(projection.customer_egress_allowed, false);
    assert.equal(projection.trust_boundary, NATIVE_CRYPTO_TRUST_BOUNDARY);
    assert.equal(projection.cryptographic_verification_performed_in_code, false);
  }
});

test('happy path projects exact op1/op2 commands and an explicitly incomplete op4 control', () => {
  const { bridge, projection } = complete();
  assert.doesNotThrow(() => validateCommand(
    'claim_request_replay', projection.claim_request_replay_command,
  ));
  assert.doesNotThrow(() => validateCommand(
    'claim_business_event', projection.claim_business_event_command,
  ));
  assert.match(
    projection.claim_request_replay_command.claim_id,
    /^req_recon_[a-f0-9]{64}$/,
  );
  assert.match(
    projection.claim_business_event_command.claim_id,
    /^bev_claim_[a-f0-9]{64}$/,
  );
  assert.match(
    projection.advance_conversation_generation_control.proposed_job_id,
    /^job_[a-f0-9]{64}$/,
  );
  assert.equal(
    projection.advance_conversation_generation_control.ready_for_atomic_call,
    false,
  );
  assert.equal(projection.atomic_write_allowed, false);
  assert.equal(projection.request_source, REQUEST_SOURCE);
  assert.match(projection.source_binding_sha256, /^[a-f0-9]{64}$/);
  const control = projection.advance_conversation_generation_control;
  assert.equal(control.reconciliation_scan_id, projection.reconciliation_provenance.scan_id);
  assert.equal(
    control.reconciliation_scan_lease_token,
    projection.reconciliation_provenance.scan_lease_token,
  );
  assert.equal(
    control.reconciliation_expected_after_message_id,
    projection.reconciliation_provenance.expected_after_message_id,
  );
  assert.equal(
    control.reconciliation_page_binding_sha256,
    projection.reconciliation_provenance.page_binding_sha256,
  );
  assert.equal(Object.prototype.hasOwnProperty.call(control, 'page_binding_sha256'), false);
  assert.doesNotThrow(() => validateCommand('advance_conversation_generation', {
    brand_id: control.brand_id,
    request_claim_id: projection.claim_request_replay_command.claim_id,
    request_lease_owner_id: projection.claim_request_replay_command.lease_owner_id,
    request_lease_token: projection.claim_request_replay_command.lease_token,
    business_claim_id: projection.claim_business_event_command.claim_id,
    business_lease_owner_id: projection.claim_business_event_command.lease_owner_id,
    business_lease_token: projection.claim_business_event_command.lease_token,
    request_source: control.request_source,
    source_binding_sha256: control.source_binding_sha256,
    reconciliation_scan_id: control.reconciliation_scan_id,
    reconciliation_scan_lease_token: control.reconciliation_scan_lease_token,
    reconciliation_expected_after_message_id:
      control.reconciliation_expected_after_message_id,
    reconciliation_page_binding_sha256: control.reconciliation_page_binding_sha256,
    account_id: control.account_id,
    inbox_id: control.inbox_id,
    channel: control.channel,
    conversation_id: control.conversation_id,
    anchor_message_id: control.anchor_message_id,
    correlation_id: control.correlation_id,
    job_id: control.proposed_job_id,
    event_identity_key_version: control.event_identity_key_version,
    event_identity_fingerprint: control.event_identity_fingerprint,
    conversation_fingerprint: control.conversation_fingerprint,
    message_fingerprint: control.message_fingerprint,
    active_key_version: control.active_key_version,
    retained_message_fingerprints: control.retained_message_fingerprints,
    key_registry_version: control.key_registry_version,
    baseline_fingerprint_key_version: control.baseline_fingerprint_key_version,
    baseline_status_fingerprint: 'a'.repeat(64),
    baseline_assignee_fingerprint: 'b'.repeat(64),
    delay_policy_version: control.delay_policy_version,
    knowledge_version: control.knowledge_version,
    delay_seconds: control.delay_seconds,
    retention_seconds: control.retention_seconds,
  }));
  assert.deepEqual(
    projection.advance_conversation_generation_control.required_authoritative_inputs,
    [
      'request_processing_lease_result',
      'business_prepared_or_completed_result',
      'baseline_status_fingerprint',
      'baseline_assignee_fingerprint',
    ],
  );
  assert.equal(
    bridge.validateDurableIngressProjection(projection),
    projection,
  );
});

test('candidate binding rejects body, route, tuple, and candidate swaps before HMAC', () => {
  const bridge = createBridge();
  const candidate = createCandidate();
  const withBody = { ...candidate, raw_body_base64: 'e30=' };
  assertBridgeError(
    () => bridge.prepareCandidateIdentity({
      messages_page: candidatePages.get(candidate.candidate_binding_sha256),
      candidate: withBody,
      reconciliation_context: reconciliationContext(candidate),
      execution_id: 'candidate_body_attack',
    }),
    'candidate_shape_invalid',
  );

  const routeSwap = clone(candidate);
  routeSwap.inbox_id = fixture.inboxes.email;
  routeSwap.channel = 'email';
  assertBridgeError(
    () => bridge.prepareCandidateIdentity({
      messages_page: candidatePages.get(candidate.candidate_binding_sha256),
      candidate: routeSwap,
      reconciliation_context: reconciliationContext(candidate),
      execution_id: 'candidate_route_attack',
    }),
    'candidate_tuple_mismatch',
  );

  const tupleSwap = clone(candidate);
  tupleSwap.canonical_tuple.message_id = '999';
  assertBridgeError(
    () => bridge.prepareCandidateIdentity({
      messages_page: candidatePages.get(candidate.candidate_binding_sha256),
      candidate: tupleSwap,
      reconciliation_context: reconciliationContext(candidate),
      execution_id: 'candidate_tuple_attack',
    }),
    'candidate_tuple_mismatch',
  );

  const plan = bridge.prepareCandidateIdentity({
    messages_page: candidatePages.get(candidate.candidate_binding_sha256),
    candidate,
    reconciliation_context: reconciliationContext(candidate),
    execution_id: 'candidate_swap_attack',
  });
  const otherCandidate = createCandidate(keyConfig(), { message_id: 202 });
  const candidateSwap = clone(plan);
  candidateSwap.candidate = otherCandidate;
  assertBridgeError(
    () => bridge.finalizeCandidateIdentity(nativeCryptoChainOutput(candidateSwap)),
    'identity_plan_invalid',
  );
});

test('native Crypto output has exact fixed digest slots and the raw hmac_results API is disabled', () => {
  const bridge = createBridge();
  const candidate = createCandidate();
  const plan = bridge.prepareCandidateIdentity({
    messages_page: candidatePages.get(candidate.candidate_binding_sha256),
    candidate,
    reconciliation_context: reconciliationContext(candidate),
    execution_id: 'native_slot_attack',
  });
  const valid = nativeCryptoChainOutput(plan);
  const digestProperties = plan.native_crypto_lineage.steps.map(
    (step) => step.digest_property,
  );
  const missing = clone(valid);
  delete missing[digestProperties[0]];
  assertBridgeError(
    () => bridge.finalizeCandidateIdentity(missing),
    'identity_native_crypto_output_invalid',
  );
  const extra = clone(valid);
  extra.injected_digest = 'a'.repeat(64);
  assertBridgeError(
    () => bridge.finalizeCandidateIdentity(extra),
    'identity_native_crypto_output_invalid',
  );
  assertBridgeError(
    () => bridge.finalizeCandidateIdentity({
      identity_plan: plan,
      hmac_results: [],
    }),
    'identity_native_crypto_output_invalid',
  );
});

test('foreign-digest rebound path is absent: no split results API and only the direct graph is valid', () => {
  const bridge = createBridge();
  const firstCandidate = createCandidate();
  const secondCandidate = createCandidate(keyConfig(), { message_id: 202 });
  const firstPlan = bridge.prepareCandidateIdentity({
    messages_page: candidatePages.get(firstCandidate.candidate_binding_sha256),
    candidate: firstCandidate,
    reconciliation_context: reconciliationContext(firstCandidate),
    execution_id: 'first_direct_chain',
  });
  const secondPlan = bridge.prepareCandidateIdentity({
    messages_page: candidatePages.get(secondCandidate.candidate_binding_sha256),
    candidate: secondCandidate,
    reconciliation_context: reconciliationContext(secondCandidate),
    execution_id: 'second_direct_chain',
  });
  const firstIdentity = bridge.finalizeCandidateIdentity(nativeCryptoChainOutput(firstPlan));
  const secondIdentity = bridge.finalizeCandidateIdentity(nativeCryptoChainOutput(secondPlan));
  const graph = bridge.buildNativeCryptoDirectLineageGraph(
    firstIdentity.native_crypto_lineage,
    'Prepare Reconciliation Route Chain',
    'Finalize Reconciliation Route Chain',
  );
  const injected = clone(graph);
  const finalizerEdge = injected.connections.pop();
  injected.nodes.splice(-1, 0, {
    name: 'Foreign Digest Rebind',
    role: 'mutable_intermediary',
    node_type: 'n8n-nodes-base.set',
    node_type_version: 3,
    execution_mode: 'runOnceForEachItem',
  });
  injected.connections.push({
    from: finalizerEdge.from,
    to: 'Foreign Digest Rebind',
    output_index: 0,
    input_index: 0,
  }, {
    from: 'Foreign Digest Rebind',
    to: finalizerEdge.to,
    output_index: 0,
    input_index: 0,
  });
  assertBridgeError(
    () => bridge.validateNativeCryptoDirectLineageGraph(
      injected,
      firstIdentity.native_crypto_lineage,
      'Prepare Reconciliation Route Chain',
      'Finalize Reconciliation Route Chain',
    ),
    'native_crypto_graph_invalid',
  );
  assert.notDeepEqual(
    nativeCryptoChainOutput(firstIdentity),
    nativeCryptoChainOutput(secondIdentity),
  );
});

test('both native Crypto stages are exact sequential same-item graphs with per-item finalizers', () => {
  const { bridge, plan, identity } = complete();
  for (const [carrier, entryName, finalizerName] of [
    [plan, 'Prepare Reconciliation Candidate Identity', 'Finalize Reconciliation Candidate Identity'],
    [identity, 'Prepare Reconciliation Route Identity', 'Finalize Reconciliation Route Identity'],
  ]) {
    const lineage = carrier.native_crypto_lineage;
    const graph = bridge.buildNativeCryptoDirectLineageGraph(
      lineage, entryName, finalizerName,
    );
    assert.equal(
      bridge.validateNativeCryptoDirectLineageGraph(
        graph, lineage, entryName, finalizerName,
      ),
      graph,
    );
    assert.equal(graph.finalizer_execution_mode, 'runOnceForEachItem');
    assert.equal(graph.finalizer_reads_json_only, true);
    assert.equal(graph.input_all_allowed, false);
    assert.equal(graph.input_first_allowed, false);
    assert.equal(graph.split_allowed, false);
    assert.equal(graph.merge_allowed, false);
    assert.equal(graph.mutable_intermediary_allowed, false);
    const cryptoNodes = graph.nodes.filter((node) => node.role === 'native_crypto');
    assert.equal(cryptoNodes.length, lineage.steps.length);
    assert.equal(
      new Set(cryptoNodes.map((node) => node.parameters.dataPropertyName)).size,
      cryptoNodes.length,
    );
    for (const [index, node] of cryptoNodes.entries()) {
      const step = lineage.steps[index];
      assert.deepEqual(node.parameters, {
        action: 'hmac',
        binaryData: false,
        type: 'SHA256',
        dataPropertyName: step.digest_property,
        encoding: 'hex',
        value: step.value_expression,
      });
      assert.deepEqual(node.credentials, {
        crypto: {
          name: step.credential_placeholder,
          source_only_placeholder: true,
        },
      });
      const incoming = graph.connections.filter((edge) => edge.to === node.name);
      const outgoing = graph.connections.filter((edge) => edge.from === node.name);
      assert.equal(incoming.length, 1);
      assert.equal(outgoing.length, 1);
    }
    assert.deepEqual(
      graph.connections.filter((edge) => edge.to === finalizerName).map((edge) => edge.from),
      [cryptoNodes.at(-1).name],
    );
    for (const mutation of [
      (copy) => { copy.nodes[1].parameters.action = 'hash'; },
      (copy) => { copy.nodes[1].parameters.type = 'MD5'; },
      (copy) => { copy.nodes[1].parameters.encoding = 'base64'; },
      (copy) => { copy.nodes[1].parameters.value = '={{ $json.foreign_material }}'; },
      (copy) => { copy.nodes[1].parameters.dataPropertyName = 'foreign_digest'; },
      (copy) => { copy.nodes[1].credentials.crypto.name = 'Foreign HMAC'; },
    ]) {
      const changed = clone(graph);
      mutation(changed);
      assertBridgeError(
        () => bridge.validateNativeCryptoDirectLineageGraph(
          changed, lineage, entryName, finalizerName,
        ),
        'native_crypto_graph_invalid',
      );
    }
  }
});

test('request-attempt identity is domain separated and deterministic without body evidence', () => {
  const first = complete();
  const second = complete();
  assert.equal(stableJson(first.plan), stableJson(second.plan));
  assert.equal(stableJson(first.identity), stableJson(second.identity));
  assert.equal(stableJson(first.projection), stableJson(second.projection));
  const replayRequest = first.plan.hmac_requests.find((request) =>
    request.purpose === 'reconciliation_request_attempt');
  const eventRequest = first.plan.hmac_requests.find((request) =>
    request.purpose === 'event_identity');
  assert.ok(replayRequest.material_utf8.startsWith(REQUEST_ATTEMPT_IDENTITY_DOMAIN));
  assert.notEqual(replayRequest.material_utf8, eventRequest.material_utf8);
  assert.notEqual(
    first.identity.request_attempt_fingerprints[EVENT_V1],
    first.identity.event_identity_fingerprints[EVENT_V1],
  );
  assert.equal(first.plan.raw_body_evidence, null);
});

test('request-attempt material covers fixed provenance and excludes mutable scan lease authority', () => {
  const candidate = createCandidate();
  const bridge = createBridge();
  const firstPlan = bridge.prepareCandidateIdentity({
    messages_page: candidatePages.get(candidate.candidate_binding_sha256),
    candidate,
    reconciliation_context: reconciliationContext(candidate, {
      scan_lease_token: 'reconciliation_scan_lease_token_a',
    }),
    execution_id: 'lease_authority_a',
  });
  const secondPlan = bridge.prepareCandidateIdentity({
    messages_page: candidatePages.get(candidate.candidate_binding_sha256),
    candidate,
    reconciliation_context: reconciliationContext(candidate, {
      scan_lease_token: 'reconciliation_scan_lease_token_b',
    }),
    execution_id: 'lease_authority_a',
  });
  const firstRequest = firstPlan.hmac_requests.find((request) =>
    request.purpose === 'reconciliation_request_attempt');
  const secondRequest = secondPlan.hmac_requests.find((request) =>
    request.purpose === 'reconciliation_request_attempt');
  assert.equal(firstPlan.provenance.source_binding_sha256,
    secondPlan.provenance.source_binding_sha256);
  assert.equal(firstRequest.material_utf8, secondRequest.material_utf8);
  const material = JSON.parse(
    firstRequest.material_utf8.slice(REQUEST_ATTEMPT_IDENTITY_DOMAIN.length),
  );
  assert.deepEqual(Object.keys(material).sort(), [
    'account_id',
    'activation_floor_at',
    'activation_policy_version',
    'brand_id',
    'candidate_binding_sha256',
    'candidate_ref',
    'channel',
    'conversation_id',
    'expected_after_message_id',
    'inbox_id',
    'message_id',
    'page_binding_sha256',
    'request_source',
    'scan_id',
    'schema_version',
    'source',
  ]);
  assert.equal(material.request_source, REQUEST_SOURCE);
  assert.equal(Object.prototype.hasOwnProperty.call(material, 'scan_lease_token'), false);
  assert.notEqual(
    firstPlan.provenance.scan_lease_token,
    secondPlan.provenance.scan_lease_token,
  );
});

test('scan changes create a distinct attempt while authoritative cursor mismatch fails closed', () => {
  const candidate = createCandidate();
  const bridge = createBridge();
  const baseContext = reconciliationContext(candidate);
  const page = candidatePages.get(candidate.candidate_binding_sha256);
  const first = bridge.prepareCandidateIdentity({
    messages_page: page,
    candidate,
    reconciliation_context: baseContext,
    execution_id: 'scan_change_execution',
  });
  const second = bridge.prepareCandidateIdentity({
    messages_page: page,
    candidate,
    reconciliation_context: { ...baseContext, scan_id: 'cwrs_' + 'b'.repeat(24) },
    execution_id: 'scan_change_execution',
  });
  assert.notEqual(first.provenance.source_binding_sha256,
    second.provenance.source_binding_sha256);
  assert.notEqual(
    first.hmac_requests.find((request) =>
      request.purpose === 'reconciliation_request_attempt').material_utf8,
    second.hmac_requests.find((request) =>
      request.purpose === 'reconciliation_request_attempt').material_utf8,
  );
  assertBridgeError(
    () => bridge.prepareCandidateIdentity({
      messages_page: page,
      candidate,
      reconciliation_context: {
        ...baseContext,
        expected_after_message_id: baseContext.expected_after_message_id - 1,
      },
      execution_id: 'cursor_mismatch_execution',
    }),
    'reconciliation_context_invalid',
  );
});

test('full messages-page membership rejects page swaps, absent/duplicate candidates, and route swaps', () => {
  const candidateA = createCandidate(keyConfig(), { message_id: 211 });
  const pageA = candidatePages.get(candidateA.candidate_binding_sha256);
  const candidateB = createCandidate(keyConfig(), { message_id: 212 });
  const pageB = candidatePages.get(candidateB.candidate_binding_sha256);
  const bridge = createBridge();
  const contextA = reconciliationContext(candidateA);

  assertBridgeError(
    () => bridge.prepareCandidateIdentity({
      messages_page: pageB,
      candidate: candidateA,
      reconciliation_context: contextA,
      execution_id: 'page_swap_execution',
    }),
    'candidate_page_membership_invalid',
  );

  const absent = rehashMessagesPage({ ...clone(pageA), event_candidates: [] });
  assertBridgeError(
    () => bridge.prepareCandidateIdentity({
      messages_page: absent,
      candidate: candidateA,
      reconciliation_context: contextA,
      execution_id: 'candidate_absent_execution',
    }),
    'candidate_page_membership_invalid',
  );

  const duplicate = rehashMessagesPage({
    ...clone(pageA),
    event_candidates: [clone(candidateA), clone(candidateA)],
  });
  assertBridgeError(
    () => bridge.prepareCandidateIdentity({
      messages_page: duplicate,
      candidate: candidateA,
      reconciliation_context: contextA,
      execution_id: 'candidate_duplicate_execution',
    }),
    'candidate_page_membership_invalid',
  );

  const routeSwap = rehashMessagesPage({
    ...clone(pageA),
    inbox_id: fixture.inboxes.email,
    channel: 'email',
  });
  assertBridgeError(
    () => bridge.prepareCandidateIdentity({
      messages_page: routeSwap,
      candidate: candidateA,
      reconciliation_context: contextA,
      execution_id: 'page_route_swap_execution',
    }),
    'candidate_page_route_invalid',
  );

  const cursorSwap = rehashMessagesPage({
    ...clone(pageA),
    requested_after_message_id: pageA.requested_after_message_id - 1,
  });
  assertBridgeError(
    () => bridge.prepareCandidateIdentity({
      messages_page: cursorSwap,
      candidate: candidateA,
      reconciliation_context: contextA,
      execution_id: 'page_cursor_swap_execution',
    }),
    'reconciliation_context_invalid',
  );
});

test('execution changes rotate only lease ownership while durable message identities remain stable', () => {
  const first = complete(keyConfig(), { execution_id: 'execution_a' });
  const second = complete(keyConfig(), { execution_id: 'execution_b' });
  assert.equal(
    first.projection.route_identity.route_binding_sha256,
    second.projection.route_identity.route_binding_sha256,
  );
  assert.equal(
    first.projection.claim_request_replay_command.active_fingerprint,
    second.projection.claim_request_replay_command.active_fingerprint,
  );
  assert.equal(
    first.projection.claim_business_event_command.active_fingerprint,
    second.projection.claim_business_event_command.active_fingerprint,
  );
  assert.notEqual(
    first.projection.claim_request_replay_command.lease_token,
    second.projection.claim_request_replay_command.lease_token,
  );
  assert.notEqual(
    first.projection.claim_business_event_command.lease_token,
    second.projection.claim_business_event_command.lease_token,
  );
});

test('key rotation preserves shared event/message aliases while request attempts remain source-bound', () => {
  const v1 = complete(keyConfig(EVENT_V1, []));
  const rotated = complete(keyConfig(EVENT_V2, [EVENT_V1]));
  assert.notEqual(v1.candidate.candidate_ref, rotated.candidate.candidate_ref);
  assert.notEqual(
    v1.identity.request_attempt_fingerprints[EVENT_V1],
    rotated.identity.request_attempt_fingerprints[EVENT_V1],
  );
  assert.equal(
    v1.identity.event_identity_fingerprints[EVENT_V1],
    rotated.identity.event_identity_fingerprints[EVENT_V1],
  );
  assert.equal(
    v1.projection.route_identity.message_fingerprints[EVENT_V1],
    rotated.projection.route_identity.message_fingerprints[EVENT_V1],
  );
  assert.deepEqual(
    rotated.projection.claim_business_event_command.retained_fingerprints,
    [{
      fingerprint: v1.identity.event_identity_fingerprints[EVENT_V1],
      key_version: STORAGE_V1,
    }],
  );
  assert.equal(
    rotated.projection.claim_request_replay_command.active_key_version,
    STORAGE_V2,
  );
  assert.doesNotThrow(() => validateCommand(
    'claim_request_replay', rotated.projection.claim_request_replay_command,
  ));
  assert.doesNotThrow(() => validateCommand(
    'claim_business_event', rotated.projection.claim_business_event_command,
  ));
});

test('unknown or mismatched event-to-storage mappings fail before candidate processing', () => {
  const config = keyConfig(EVENT_V2, [EVENT_V1]);
  assertBridgeError(
    () => createBridge(config, {
      event_to_storage_key_versions: {
        [EVENT_V2]: STORAGE_V1,
        [EVENT_V1]: STORAGE_V2,
      },
    }),
    'storage_key_mapping_invalid',
  );
  assertBridgeError(
    () => createBridge(config, {
      event_to_storage_key_versions: {
        [EVENT_V2]: STORAGE_V2,
      },
    }),
    'storage_key_mapping_invalid',
  );
});

test('business claim identifier matches reconciliation proof contract; legacy bev_ form does not', () => {
  const { projection } = complete();
  const claimId = projection.claim_business_event_command.claim_id;
  assert.ok(patterns.RECONCILIATION_BUSINESS_CLAIM_ID.test(claimId));
  assert.equal(
    patterns.RECONCILIATION_BUSINESS_CLAIM_ID.test(
      'bev_' + projection.claim_business_event_command.active_fingerprint,
    ),
    false,
  );
});

test('op1 carries exact source provenance while shared op2 business identity stays source-neutral', () => {
  const { projection } = complete();
  assert.equal(projection.source, 'chatwoot_reconciliation_v1');
  assert.equal(projection.claim_request_replay_command.request_source, REQUEST_SOURCE);
  assert.equal(
    projection.claim_request_replay_command.source_binding_sha256,
    projection.source_binding_sha256,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      projection.claim_business_event_command,
      'request_source',
    ),
    false,
  );
  assert.ok(projection.required_atomic_contract_fields.includes(
    'advance_conversation_generation.reconciliation_page_binding_sha256',
  ));
  assert.doesNotThrow(() => validateCommand(
    'claim_request_replay', projection.claim_request_replay_command,
  ));
});

test('bridge source is effect-free and cannot emit content, contact data, waits, or egress', () => {
  const source = fs.readFileSync(bridgePath, 'utf8');
  for (const token of [
    'require(',
    'process.env',
    'node:http',
    'node:https',
    'node:fs',
    'INSERT INTO',
    'customer_send',
    'hmac_results',
    '$input.all()',
    '$input.first()',
  ]) assert.equal(source.includes(token), false, token);
  const { projection } = complete();
  const serialized = stableJson(projection);
  for (const forbiddenKey of [
    'raw_message',
    'message_body',
    'email',
    'phone',
    'address',
    'transcript',
  ]) assert.equal(serialized.includes('"' + forbiddenKey + '"'), false, forbiddenKey);
  assert.equal(
    projection.advance_conversation_generation_control.ready_for_atomic_call,
    false,
  );
  assert.equal(projection.customer_egress_allowed, false);
});
