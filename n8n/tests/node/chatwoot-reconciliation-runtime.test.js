'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const runtimePath = path.join(
  __dirname,
  '..',
  '..',
  'runtime',
  'chatwoot-reconciliation-runtime.js',
);
const {
  ACCOUNT_ID,
  BRAND_ID,
  CANONICAL_TUPLE_FORMAT,
  CURSOR_OUTCOME_DIGEST_DOMAIN,
  CURSOR_PAGE_BINDING_DOMAIN,
  CURSOR_PROOF_CANONICAL_FORMAT,
  INBOX_CHANNELS,
  MAX_FINALIZABLE_MESSAGE_ROWS,
  MAX_MESSAGE_ROWS,
  ReconciliationContractError,
  canonicalTuple,
  createChatwootReconciliationRuntime,
  cursorProofCanonical,
  stableJson,
} = require(runtimePath);

const fixture = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'chatwoot-reconciliation-scenarios.json'),
  'utf8',
));

const sha256Hex = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

function createRuntime(overrides = {}) {
  return createChatwootReconciliationRuntime({
    sha256Hex,
    active_event_identity_key_version: 'calapres-identity-hmac-v1',
    retained_event_identity_key_versions: ['calapres-identity-hmac-v2'],
    activation_floor_at: fixture.activation_floor_at,
    activation_policy_version: fixture.activation_policy_version,
    ...overrides,
  });
}

function readyControl(runtime = createRuntime()) {
  return runtime.prepareControl({
    brand_enabled: true,
    kill_switch: false,
    api_credential_available: true,
  });
}

function discoveryProjection(overrides = {}) {
  return {
    schema_version: '1.0',
    kind: 'chatwoot_reconciliation_conversation_page_projection_v1',
    status_code: 200,
    account_id: fixture.account_id,
    inbox_id: fixture.inboxes.whatsapp,
    requested_page: 1,
    retry_after_seconds: null,
    error_code: null,
    all_count: fixture.discovery_rows.length,
    rows: fixture.discovery_rows.map((row) => ({ ...row })),
    ...overrides,
  };
}

function messagesProjection(overrides = {}) {
  return {
    schema_version: '1.0',
    kind: 'chatwoot_reconciliation_messages_after_projection_v1',
    status_code: 200,
    account_id: fixture.account_id,
    inbox_id: fixture.inboxes.whatsapp,
    conversation_id: 7001,
    requested_after_message_id: 99,
    retry_after_seconds: null,
    error_code: null,
    rows: fixture.message_rows.map((row) => ({ ...row })),
    ...overrides,
  };
}

function durableProofRows(page, durableOutcome = 'durable_bound') {
  return page.outcome_requirements.map((requirement) => {
    if (requirement.classification === 'deterministically_excluded') {
      return {
        message_id: requirement.message_id,
        classification: 'deterministically_excluded',
        outcome: 'deterministically_excluded',
        reason_code: requirement.required_reason_code,
        created_at: requirement.created_at,
        message_type: requirement.message_type,
        private: requirement.private,
        sender_type: requirement.sender_type,
        event_identity_key_version: null,
        event_identity_fingerprint: null,
        business_claim_id: null,
        job_id: null,
        generation: null,
      };
    }
    return {
      message_id: requirement.message_id,
      classification: 'event_candidate',
      outcome: durableOutcome,
      reason_code: null,
      created_at: null,
      message_type: null,
      private: null,
      sender_type: null,
      event_identity_key_version: 'calapres-identity-hmac-v1',
      event_identity_fingerprint: sha256Hex(`event:${requirement.message_id}`),
      business_claim_id: `bev_claim_msg_${requirement.message_id}`,
      job_id: `job_calapres_${requirement.message_id}`,
      generation: 1,
    };
  });
}

function canonicalFromFinalization(finalization) {
  return cursorProofCanonical({
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
}

function rehashFinalization(finalization) {
  const canonical = canonicalFromFinalization(finalization);
  return {
    ...finalization,
    page_binding_sha256: sha256Hex(CURSOR_PAGE_BINDING_DOMAIN + stableJson(canonical)),
    outcome_digest: sha256Hex(CURSOR_OUTCOME_DIGEST_DOMAIN + stableJson(canonical)),
  };
}

function assertContractError(action, reasonCode) {
  assert.throws(action, (error) =>
    error instanceof ReconciliationContractError && error.reasonCode === reasonCode);
}

test('runtime is fixed to Calapres account and the four exact inboxes', () => {
  assert.equal(BRAND_ID, 'calapres');
  assert.equal(ACCOUNT_ID, 179973);
  assert.deepEqual(INBOX_CHANNELS, {
    128031: 'instagram',
    128033: 'tiktok',
    128058: 'whatsapp',
    128326: 'email',
  });
  assert.equal(CANONICAL_TUPLE_FORMAT,
    'json-minified-ordered:[schema_version,account_id,inbox_id,event,conversation_id,message_id]');
  assert.deepEqual(canonicalTuple(179973, 128058, 7001, 101), {
    schema_version: '1.0',
    account_id: 179973,
    inbox_id: 128058,
    event: 'message_created',
    conversation_id: '7001',
    message_id: '101',
  });

  const runtime = createRuntime();
  const control = readyControl(runtime);
  for (const inboxId of Object.keys(INBOX_CHANNELS).map(Number)) {
    const request = runtime.buildConversationDiscoveryRequest(control, { inbox_id: inboxId, page: 1 });
    assert.equal(request.status, 'ready');
    assert.equal(request.request.account_id, 179973);
    assert.equal(request.request.channel, INBOX_CHANNELS[inboxId]);
  }
  assertContractError(
    () => runtime.buildConversationDiscoveryRequest(control, { inbox_id: 128028, page: 1 }),
    'inbox_not_allowlisted',
  );
});

test('owner-approved activation floor and policy are trusted DI, not scan payload fields', () => {
  const runtime = createRuntime();
  const command = runtime.buildScanClaimCommand({
    inbox_id: fixture.inboxes.whatsapp,
    scan_id: 'cwrs_' + 'a'.repeat(24),
    lease_owner_id: 'edge_reconciliation_worker_1',
    lease_token: 'lease_token_1',
    lease_duration_seconds: 300,
    max_pages: 50,
  });
  assert.equal(command.activation_floor_at, fixture.activation_floor_at);
  assert.equal(command.activation_policy_version, fixture.activation_policy_version);
  assert.equal(Object.prototype.hasOwnProperty.call(command, 'now'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(command, 'requested_at'), false);
  assertContractError(
    () => runtime.buildScanClaimCommand({
      inbox_id: fixture.inboxes.whatsapp,
      scan_id: 'cwrs_' + 'a'.repeat(24),
      lease_owner_id: 'edge_reconciliation_worker_1',
      lease_token: 'lease_token_1',
      lease_duration_seconds: 300,
      max_pages: 50,
      activation_floor_at: '2000-01-01T00:00:00.000Z',
    }),
    'scan_claim_input_invalid',
  );
  assertContractError(
    () => createRuntime({ activation_floor_at: 'not-a-date' }),
    'activation_floor_invalid',
  );
});

test('kill switch, disabled brand, and absent credential produce no API request', () => {
  const runtime = createRuntime();
  const controls = [
    runtime.prepareControl({
      brand_enabled: true,
      kill_switch: true,
      api_credential_available: true,
    }),
    runtime.prepareControl({
      brand_enabled: false,
      kill_switch: false,
      api_credential_available: true,
    }),
    runtime.prepareControl({
      brand_enabled: true,
      kill_switch: false,
      api_credential_available: false,
    }),
  ];
  for (const control of controls) {
    assert.equal(control.api_calls_allowed, false);
    const discovery = runtime.buildConversationDiscoveryRequest(control, {
      inbox_id: fixture.inboxes.whatsapp,
      page: 1,
    });
    const messages = runtime.buildMessagesAfterRequest(control, {
      inbox_id: fixture.inboxes.whatsapp,
      conversation_id: '7001',
      after_message_id: 0,
    });
    assert.equal(discovery.api_call_allowed, false);
    assert.equal(discovery.request, null);
    assert.equal(messages.api_call_allowed, false);
    assert.equal(messages.request, null);
    assert.equal(discovery.customer_egress_allowed, false);
  }
});

test('request plans are credential-free and use documented page and after parameters', () => {
  const runtime = createRuntime();
  const control = readyControl(runtime);
  const discovery = runtime.buildConversationDiscoveryRequest(control, {
    inbox_id: fixture.inboxes.instagram,
    page: 3,
  });
  assert.deepEqual(discovery.request.query, {
    status: 'all',
    assignee_type: 'all',
    inbox_id: fixture.inboxes.instagram,
    page: 3,
  });
  const messages = runtime.buildMessagesAfterRequest(control, {
    inbox_id: fixture.inboxes.email,
    conversation_id: 9876,
    after_message_id: 123,
  });
  assert.deepEqual(messages.request.query, { after: 123 });
  assert.equal(messages.request.path,
    '/api/v1/accounts/179973/conversations/9876/messages');
  const serialized = JSON.stringify([discovery, messages]);
  assert.equal(/api_access_token|authorization|credential|secret/i.test(serialized), false);
});

test('conversation discovery normalizes exact PII-free rows and rejects route or PII extras', () => {
  const runtime = createRuntime();
  const page = runtime.normalizeConversationDiscoveryPage(discoveryProjection());
  assert.equal(page.status, 'ready');
  assert.deepEqual(page.conversation_ids, ['7001', '7002']);
  assert.equal(page.coverage, 'incomplete');
  assert.equal(page.cursor_advance_ready, false);

  const poisoned = discoveryProjection({
    rows: [{ ...fixture.discovery_rows[0], meta: { sender: { email: 'synthetic@example.test' } } }],
    all_count: 1,
  });
  assertContractError(() => runtime.normalizeConversationDiscoveryPage(poisoned),
    'discovery_row_invalid');
  assertContractError(() => runtime.normalizeConversationDiscoveryPage(discoveryProjection({
    account_id: 999,
  })), 'account_not_allowlisted');
  assertContractError(() => runtime.normalizeConversationDiscoveryPage(discoveryProjection({
    inbox_id: 128028,
  })), 'inbox_not_allowlisted');
});

test('discovery transport errors remain incomplete and never advance a cursor', () => {
  const runtime = createRuntime();
  const rateLimited = runtime.normalizeConversationDiscoveryPage(discoveryProjection({
    status_code: 429,
    retry_after_seconds: 45,
    all_count: null,
    rows: null,
  }));
  assert.equal(rateLimited.status, 'retry_later');
  assert.equal(rateLimited.reason_code, 'chatwoot_rate_limited');
  assert.equal(rateLimited.coverage, 'incomplete');
  assert.equal(rateLimited.cursor_advance_ready, false);
  assert.equal(rateLimited.api_retry_required, true);

  const forbidden = runtime.normalizeConversationDiscoveryPage(discoveryProjection({
    status_code: 403,
    all_count: null,
    rows: null,
  }));
  assert.equal(forbidden.status, 'fail_closed');
  assert.equal(forbidden.cursor_advance_ready, false);
  assertContractError(() => runtime.normalizeConversationDiscoveryPage(discoveryProjection({
    status_code: 429,
    retry_after_seconds: 30,
    all_count: null,
    rows: [],
  })), 'discovery_projection_invalid');
});

test('two bounded identical discovery scans yield best-effort only, never no-loss', () => {
  const runtime = createRuntime();
  const firstPage = runtime.normalizeConversationDiscoveryPage(discoveryProjection());
  const first = runtime.buildDiscoverySnapshot({ pages: [firstPage], page_cap_reached: false });
  const secondPage = runtime.normalizeConversationDiscoveryPage(discoveryProjection({
    rows: [...fixture.discovery_rows].reverse(),
  }));
  const second = runtime.buildDiscoverySnapshot({ pages: [secondPage], page_cap_reached: false });
  const coverage = runtime.evaluateDiscoveryConvergence({
    first_snapshot: first,
    second_snapshot: second,
  });
  assert.equal(coverage.status, 'converged_bounded');
  assert.equal(coverage.coverage, 'best_effort');
  assert.equal(coverage.bounded_convergence_passed, true);
  assert.equal(coverage.discovery_watermark_advance_allowed, false);
  assert.equal(coverage.no_loss_claimed, false);
});

test('mutable, overlapping, capped, or changed discovery remains incomplete', () => {
  const runtime = createRuntime();
  const stablePage = runtime.normalizeConversationDiscoveryPage(discoveryProjection());
  const stable = runtime.buildDiscoverySnapshot({ pages: [stablePage], page_cap_reached: false });
  const changedPage = runtime.normalizeConversationDiscoveryPage(discoveryProjection({
    all_count: 2,
    rows: [
      fixture.discovery_rows[0],
      { ...fixture.discovery_rows[1], id: 7003 },
    ],
  }));
  const changed = runtime.buildDiscoverySnapshot({ pages: [changedPage], page_cap_reached: false });
  const coverage = runtime.evaluateDiscoveryConvergence({
    first_snapshot: stable,
    second_snapshot: changed,
  });
  assert.equal(coverage.coverage, 'incomplete');
  assert.equal(coverage.bounded_convergence_passed, false);

  const capped = runtime.buildDiscoverySnapshot({ pages: [stablePage], page_cap_reached: true });
  assert.equal(capped.status, 'incomplete');
  assert.equal(capped.reason_code, 'discovery_page_cap_reached');

  const pageOne = runtime.normalizeConversationDiscoveryPage(discoveryProjection({
    all_count: 3,
    rows: [fixture.discovery_rows[0], fixture.discovery_rows[1]],
  }));
  const pageTwo = runtime.normalizeConversationDiscoveryPage(discoveryProjection({
    requested_page: 2,
    all_count: 3,
    rows: [fixture.discovery_rows[1]],
  }));
  const overlapping = runtime.buildDiscoverySnapshot({
    pages: [pageOne, pageTwo],
    page_cap_reached: false,
  });
  assert.equal(overlapping.status, 'incomplete');
  assert.equal(overlapping.reason_code, 'discovery_page_overlap');
});

test('messages accept only post-floor inbound public contacts and deterministically exclude known cases', () => {
  const runtime = createRuntime();
  const page = runtime.normalizeMessagesAfterPage(messagesProjection());
  assert.equal(page.status, 'ready');
  assert.equal(page.event_candidates.length, 1);
  const candidate = page.event_candidates[0];
  assert.equal(candidate.source, 'chatwoot_reconciliation_v1');
  assert.equal(candidate.message_id, '101');
  assert.equal(candidate.direction, 'incoming');
  assert.equal(candidate.visibility, 'public');
  assert.equal(candidate.sender_class, 'contact');
  assert.equal(candidate.content_state, 'deferred_live_reread');
  assert.equal(candidate.raw_content_used, false);
  assert.equal(candidate.raw_contact_used, false);
  assert.equal(candidate.persistence_allowed, false);
  assert.equal(candidate.live_reread_required, true);
  assert.deepEqual(candidate.canonical_tuple, {
    schema_version: '1.0',
    account_id: 179973,
    inbox_id: 128058,
    event: 'message_created',
    conversation_id: '7001',
    message_id: '101',
  });
  assert.equal(candidate.event_identity_hmac_requests[0].material_utf8,
    JSON.stringify(candidate.canonical_tuple));
  assert.deepEqual(
    page.deterministic_exclusions.map((entry) => entry.reason_code),
    [
      'before_activation_floor',
      'private_message',
      'outgoing_message',
      'activity_message',
      'template_message',
      'bot_echo',
    ],
  );
  assert.equal(page.cursor_advance_ready, false);
});

test('PII and message content cannot enter the projected row or normalized candidate', () => {
  const runtime = createRuntime();
  const clean = runtime.normalizeMessagesAfterPage(messagesProjection());
  const serialized = JSON.stringify(clean);
  const keys = [];
  const visit = (value) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) {
        keys.push(key);
        visit(nested);
      }
    }
  };
  visit(clean);
  for (const forbidden of ['content', 'email', 'phone_number', 'sender_name', 'data_url']) {
    assert.equal(keys.includes(forbidden), false, forbidden);
  }
  assert.equal(serialized.includes('synthetic private message'), false);
  assert.equal(serialized.includes('synthetic@example.test'), false);
  assert.equal(serialized.includes('+966500000000'), false);

  for (const poison of [
    { content: 'synthetic private message' },
    { email: 'synthetic@example.test' },
    { phone_number: '+966500000000' },
    { sender_name: 'Synthetic Contact' },
    { data_url: 'https://example.test/private.jpg' },
  ]) {
    const rows = fixture.message_rows.map((row) => ({ ...row }));
    rows[1] = { ...rows[1], ...poison };
    assertContractError(
      () => runtime.normalizeMessagesAfterPage(messagesProjection({ rows })),
      'message_row_invalid',
    );
  }
});

test('unknown message types, sender types, and anomalous inbound agents fail closed', () => {
  const runtime = createRuntime();
  const base = { ...fixture.message_rows[1] };
  assertContractError(() => runtime.normalizeMessagesAfterPage(messagesProjection({
    rows: [{ ...base, message_type: 99 }],
  })), 'message_row_route_or_type_invalid');
  assertContractError(() => runtime.normalizeMessagesAfterPage(messagesProjection({
    rows: [{ ...base, sender_type: 'unknown_actor' }],
  })), 'message_row_route_or_type_invalid');
  assertContractError(() => runtime.normalizeMessagesAfterPage(messagesProjection({
    rows: [{ ...base, sender_type: 'user' }],
  })), 'inbound_sender_not_contact');
  assertContractError(() => runtime.normalizeMessagesAfterPage(messagesProjection({
    rows: [{ ...base, account_id: 999 }],
  })), 'account_not_allowlisted');
});

test('bootstrap of a new conversation excludes old history but keeps post-floor messages', () => {
  const runtime = createRuntime();
  const rows = [
    { ...fixture.message_rows[0], id: 1, conversation_id: 9001 },
    { ...fixture.message_rows[1], id: 2, conversation_id: 9001 },
  ];
  const page = runtime.normalizeMessagesAfterPage(messagesProjection({
    conversation_id: 9001,
    requested_after_message_id: 0,
    rows,
  }));
  assert.deepEqual(page.deterministic_exclusions, [{
    message_id: '1',
    reason_code: 'before_activation_floor',
    activation_policy_version: fixture.activation_policy_version,
  }]);
  assert.equal(page.event_candidates.length, 1);
  assert.equal(page.event_candidates[0].message_id, '2');
  const finalization = runtime.finalizeMessagesPage({
    page,
    proof_rows: durableProofRows(page),
  });
  assert.equal(finalization.status, 'ready');
  assert.equal(finalization.new_after_message_id, 2);
});

test('fractional activation floors exclude the whole earlier Chatwoot second', () => {
  const fractionalRuntime = createRuntime({
    activation_floor_at: '2026-08-12T00:00:00.500Z',
  });
  const rows = [1786492800, 1786492801].map((createdAt, index) => ({
    ...fixture.message_rows[1],
    id: 401 + index,
    created_at: createdAt,
  }));
  const page = fractionalRuntime.normalizeMessagesAfterPage(messagesProjection({
    requested_after_message_id: 400,
    rows,
  }));

  assert.deepEqual(page.deterministic_exclusions, [{
    message_id: '401',
    reason_code: 'before_activation_floor',
    activation_policy_version: fixture.activation_policy_version,
  }]);
  assert.equal(page.event_candidates.length, 1);
  assert.equal(page.event_candidates[0].message_id, '402');
});

test('a raw 100-row page is truncated and cannot skip an omitted lower ID', () => {
  const runtime = createRuntime();
  const rows = Array.from({ length: MAX_MESSAGE_ROWS }, (_, index) => ({
    id: 201 + index,
    account_id: 179973,
    inbox_id: 128058,
    conversation_id: 7001,
    created_at: 1786493000 + index,
    message_type: 0,
    private: false,
    sender_type: 'contact',
    attachment_count: 0,
  })).reverse();
  const page = runtime.normalizeMessagesAfterPage(messagesProjection({
    requested_after_message_id: 100,
    rows,
  }));
  // Message 150 may have a later created_at and be omitted by Chatwoot's created_at-ordered LIMIT 100.
  // Advancing to returned max 300 would then lose 150 forever.
  assert.equal(page.page_row_count, 100);
  assert.equal(page.status, 'incomplete');
  assert.equal(page.reason_code, 'scan_truncated');
  assert.equal(page.page_full, true);
  assert.equal(page.proposed_next_after_message_id, null);
  assert.equal(page.cursor_advance_ready, false);
  assert.equal(page.continue_required_after_commit, false);
  assert.equal(page.event_candidates.length, 0);
  assert.equal(page.outcome_requirements.length, 0);
  assert.equal(page.incident_required, true);
  assert.equal(page.manual_resolution_required, true);
  assert.equal(page.api_retry_required, true);
  assertContractError(() => runtime.finalizeMessagesPage({
    page,
    proof_rows: [],
  }), 'messages_page_invalid');

  const oversized = [...rows, { ...rows[0], id: 301 }];
  assertContractError(() => runtime.normalizeMessagesAfterPage(messagesProjection({
    requested_after_message_id: 100,
    rows: oversized,
  })), 'messages_page_oversized');
});

test('one through 99 rows can finalize, but never request another max-ID page', () => {
  const runtime = createRuntime();
  const rows = Array.from({ length: MAX_FINALIZABLE_MESSAGE_ROWS }, (_, index) => ({
    id: 201 + index,
    account_id: 179973,
    inbox_id: 128058,
    conversation_id: 7001,
    created_at: 1786493000 + index,
    message_type: 0,
    private: false,
    sender_type: 'contact',
    attachment_count: 0,
  }));
  const page = runtime.normalizeMessagesAfterPage(messagesProjection({
    requested_after_message_id: 200,
    rows,
  }));
  assert.equal(page.status, 'ready');
  assert.equal(page.page_row_count, 99);
  assert.equal(page.page_full, false);
  assert.equal(page.continue_required_after_commit, false);
  const finalization = runtime.finalizeMessagesPage({
    page,
    proof_rows: durableProofRows(page, 'durable_duplicate'),
  });
  assert.equal(finalization.cursor_advance_ready, true);
  assert.equal(finalization.new_after_message_id, 299);
  assert.equal(finalization.continue_required, false);
});

test('a zero-row page is a no-op and cannot issue a cursor command', () => {
  const runtime = createRuntime();
  const page = runtime.normalizeMessagesAfterPage(messagesProjection({ rows: [] }));
  assert.equal(page.status, 'ready');
  assert.equal(page.page_row_count, 0);
  assert.equal(page.proposed_next_after_message_id, page.requested_after_message_id);
  assert.deepEqual(page.event_candidates, []);
  assert.deepEqual(page.outcome_requirements, []);
  assert.equal(page.cursor_advance_ready, false);
  const finalization = runtime.finalizeMessagesPage({ page, proof_rows: [] });
  assert.equal(finalization.status, 'blocked');
  assert.equal(finalization.reason_code, 'proof_rows_invalid');
  assert.equal(finalization.cursor_advance_ready, false);
});

test('duplicate, stale, or malformed message cursors fail closed', () => {
  const runtime = createRuntime();
  const row = { ...fixture.message_rows[1] };
  assertContractError(() => runtime.normalizeMessagesAfterPage(messagesProjection({
    requested_after_message_id: row.id,
    rows: [row],
  })), 'message_cursor_order_invalid');
  assertContractError(() => runtime.normalizeMessagesAfterPage(messagesProjection({
    rows: [row, { ...row }],
  })), 'message_cursor_order_invalid');
  assertContractError(() => runtime.normalizeMessagesAfterPage(messagesProjection({
    rows: [{ ...row, conversation_id: 9999 }],
  })), 'message_row_route_or_type_invalid');
});

test('429, 5xx, timeout, and malformed error envelopes never advance message cursor', () => {
  const runtime = createRuntime();
  const cases = [
    { status_code: 429, retry_after_seconds: 30, rows: null },
    { status_code: 503, rows: null },
    { status_code: null, error_code: 'chatwoot_timeout', rows: null },
    { status_code: 401, rows: null },
  ];
  for (const overrides of cases) {
    const page = runtime.normalizeMessagesAfterPage(messagesProjection(overrides));
    assert.equal(page.cursor_advance_ready, false);
    assert.equal(page.proposed_next_after_message_id, null);
    assert.equal(page.event_candidates.length, 0);
    assert.equal(page.customer_egress_allowed, false);
  }
  assertContractError(() => runtime.normalizeMessagesAfterPage(messagesProjection({
    status_code: 429,
    retry_after_seconds: 30,
    rows: [],
  })), 'messages_projection_invalid');
});

test('cursor finalization requires one exact durable or deterministic outcome for every row', () => {
  const runtime = createRuntime();
  const page = runtime.normalizeMessagesAfterPage(messagesProjection());
  const proofRows = durableProofRows(page);
  const missing = runtime.finalizeMessagesPage({ page, proof_rows: proofRows.slice(0, -1) });
  assert.equal(missing.status, 'blocked');
  assert.equal(missing.cursor_advance_ready, false);
  assert.equal(missing.reason_code, 'proof_row_count_mismatch');

  const candidateRequirement = page.outcome_requirements.find(
    (entry) => entry.classification === 'event_candidate',
  );
  const forged = proofRows.map((entry) => entry.message_id === candidateRequirement.message_id
    ? {
      message_id: entry.message_id,
      classification: 'deterministically_excluded',
      outcome: 'deterministically_excluded',
      reason_code: 'before_activation_floor',
      created_at: 1786492799,
      message_type: 0,
      private: false,
      sender_type: 'contact',
      event_identity_key_version: null,
      event_identity_fingerprint: null,
      business_claim_id: null,
      job_id: null,
      generation: null,
    }
    : entry);
  const forgedResult = runtime.finalizeMessagesPage({ page, proof_rows: forged });
  assert.equal(forgedResult.status, 'blocked');
  assert.equal(forgedResult.reason_code, 'proof_requirement_mismatch');

  const exclusion = page.outcome_requirements.find(
    (entry) => entry.classification === 'deterministically_excluded',
  );
  const wrongReason = proofRows.map((entry) => entry.message_id === exclusion.message_id
    ? { ...entry, reason_code: 'private_message' }
    : entry);
  const wrongReasonResult = runtime.finalizeMessagesPage({ page, proof_rows: wrongReason });
  assert.equal(wrongReasonResult.status, 'blocked');
  assert.equal(wrongReasonResult.reason_code, 'exclusion_reason_evidence_mismatch');

  const complete = runtime.finalizeMessagesPage({ page, proof_rows: proofRows });
  assert.equal(complete.status, 'ready');
  assert.equal(complete.cursor_advance_ready, true);
  assert.equal(complete.expected_after_message_id, 99);
  assert.equal(complete.new_after_message_id, 106);
  assert.match(complete.outcome_digest, /^[a-f0-9]{64}$/);
  assert.equal(complete.no_loss_claimed, false);
});

test('proof rows reject duplicates, disorder, extras, missing durable refs, exclusion refs, and max drift', () => {
  const runtime = createRuntime();
  const page = runtime.normalizeMessagesAfterPage(messagesProjection());
  const base = durableProofRows(page);
  const blockedReason = (proofRows) => runtime.finalizeMessagesPage({
    page,
    proof_rows: proofRows,
  }).reason_code;

  const duplicate = base.map((row) => ({ ...row }));
  duplicate[1].message_id = duplicate[0].message_id;
  assert.equal(blockedReason(duplicate), 'proof_rows_not_strictly_sorted');
  assert.equal(blockedReason([...base].reverse()), 'proof_rows_not_strictly_sorted');
  assert.equal(blockedReason([...base, { ...base[base.length - 1], message_id: '107' }]),
    'proof_row_count_mismatch');

  const extraProperty = base.map((row) => ({ ...row }));
  extraProperty[0].raw_content = 'forbidden';
  assert.equal(blockedReason(extraProperty), 'proof_row_invalid');

  const candidateIndex = base.findIndex((row) => row.classification === 'event_candidate');
  const candidateWithoutRefs = base.map((row) => ({ ...row }));
  candidateWithoutRefs[candidateIndex].business_claim_id = null;
  assert.equal(blockedReason(candidateWithoutRefs), 'candidate_proof_invalid');
  const candidateWithExclusionEvidence = base.map((row) => ({ ...row }));
  candidateWithExclusionEvidence[candidateIndex].created_at = 1786492801;
  assert.equal(blockedReason(candidateWithExclusionEvidence), 'candidate_proof_invalid');

  const exclusionIndex = base.findIndex(
    (row) => row.classification === 'deterministically_excluded',
  );
  const exclusionWithRefs = base.map((row) => ({ ...row }));
  exclusionWithRefs[exclusionIndex].job_id = 'forbidden_job_ref';
  assert.equal(blockedReason(exclusionWithRefs), 'exclusion_proof_invalid');
  const exclusionEvidenceDrift = base.map((row) => ({ ...row }));
  exclusionEvidenceDrift[exclusionIndex].created_at = 1786492801;
  assert.equal(blockedReason(exclusionEvidenceDrift), 'exclusion_reason_evidence_mismatch');

  const maximumDrift = base.map((row) => ({ ...row }));
  maximumDrift[maximumDrift.length - 1].message_id = '107';
  assert.equal(blockedReason(maximumDrift), 'cursor_proof_canonical_invalid');
});

test('cursor command recomputes exact proof digests and rejects binding, route, or policy drift', () => {
  const runtime = createRuntime();
  const page = runtime.normalizeMessagesAfterPage(messagesProjection());
  const finalization = runtime.finalizeMessagesPage({
    page,
    proof_rows: durableProofRows(page),
  });
  const scanId = 'cwrs_' + 'c'.repeat(24);
  const leaseToken = 'lease_token_proof';
  const build = (value) => runtime.buildCursorAdvanceCommand({
    finalization: value,
    scan_id: scanId,
    lease_token: leaseToken,
  });
  const canonical = canonicalFromFinalization(finalization);
  assert.equal(
    CURSOR_PROOF_CANONICAL_FORMAT,
    'utf8(domain+stable-json-v1);object-keys-recursive-lexicographic;array-order-preserved',
  );
  assert.equal(
    finalization.page_binding_sha256,
    sha256Hex(CURSOR_PAGE_BINDING_DOMAIN + stableJson(canonical)),
  );
  assert.equal(
    finalization.outcome_digest,
    sha256Hex(CURSOR_OUTCOME_DIGEST_DOMAIN + stableJson(canonical)),
  );
  assert.deepEqual(build(finalization).proof_rows, finalization.proof_rows);

  assertContractError(() => build({
    ...finalization,
    page_binding_sha256: '0'.repeat(64),
  }), 'cursor_finalization_invalid');
  assertContractError(() => build({
    ...finalization,
    outcome_digest: '0'.repeat(64),
  }), 'cursor_finalization_invalid');
  assertContractError(() => build({
    ...finalization,
    channel: 'email',
  }), 'cursor_finalization_invalid');

  const foreignPolicy = rehashFinalization({
    ...finalization,
    activation_policy_version: '2026-08-12-v2',
  });
  assertContractError(() => build(foreignPolicy), 'cursor_finalization_invalid');
});

test('committed cursor fixtures carry the exact canonical proof digests', () => {
  const validDir = path.join(__dirname, '..', 'fixtures', 'valid');
  const finalization = JSON.parse(fs.readFileSync(path.join(
    validDir,
    'chatwoot-reconciliation-cursor-finalization--synthetic-whatsapp.json',
  ), 'utf8'));
  const command = JSON.parse(fs.readFileSync(path.join(
    validDir,
    'chatwoot-reconciliation-cursor-advance-command--synthetic-whatsapp.json',
  ), 'utf8'));
  const canonical = canonicalFromFinalization(finalization);
  const pageBinding = sha256Hex(CURSOR_PAGE_BINDING_DOMAIN + stableJson(canonical));
  const outcomeDigest = sha256Hex(CURSOR_OUTCOME_DIGEST_DOMAIN + stableJson(canonical));
  assert.equal(finalization.page_binding_sha256, pageBinding);
  assert.equal(finalization.outcome_digest, outcomeDigest);
  assert.equal(command.page_binding_sha256, pageBinding);
  assert.equal(command.outcome_digest, outcomeDigest);
  assert.deepEqual(command.proof_rows, canonical.proof_rows);
});

test('future scan and cursor commands are pure exact envelopes with no timestamps or writes', () => {
  const runtime = createRuntime();
  const scanId = 'cwrs_' + 'b'.repeat(24);
  const leaseToken = 'lease_token_2';
  const scan = runtime.buildScanClaimCommand({
    inbox_id: fixture.inboxes.whatsapp,
    scan_id: scanId,
    lease_owner_id: 'edge_reconciliation_worker_2',
    lease_token: leaseToken,
    lease_duration_seconds: 300,
    max_pages: 100,
  });
  assert.equal(scan.operation, 'claim_chatwoot_reconciliation_scan');
  assert.equal(scan.activation_floor_at, fixture.activation_floor_at);
  assert.equal(scan.customer_egress_allowed, false);

  const page = runtime.normalizeMessagesAfterPage(messagesProjection());
  const finalization = runtime.finalizeMessagesPage({ page, proof_rows: durableProofRows(page) });
  const cursor = runtime.buildCursorAdvanceCommand({ finalization, scan_id: scanId, lease_token: leaseToken });
  assert.equal(cursor.operation, 'compare_and_advance_chatwoot_message_cursor');
  assert.equal(cursor.expected_after_message_id, 99);
  assert.equal(cursor.new_after_message_id, 106);
  assert.equal(cursor.activation_policy_version, fixture.activation_policy_version);
  assert.equal(cursor.customer_egress_allowed, false);
  const proofKeys = [
    'message_id', 'classification', 'outcome', 'reason_code', 'created_at',
    'message_type', 'private', 'sender_type', 'event_identity_key_version',
    'event_identity_fingerprint', 'business_claim_id', 'job_id', 'generation',
  ];
  assert.deepEqual(Object.keys(cursor.proof_rows[0]), proofKeys);
  assert.equal(cursor.proof_rows.length, cursor.row_count);
  assert.equal(
    Number(cursor.proof_rows[cursor.proof_rows.length - 1].message_id),
    cursor.new_after_message_id,
  );
  const serialized = JSON.stringify([scan, cursor]);
  for (const forbidden of [
    'content', 'email', 'phone', 'address', 'attachment', 'token_value', 'secret',
    'committed_at', 'now',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }

  assert.throws(() => runtime.buildCursorAdvanceCommand({
    finalization: { ...finalization, cursor_advance_ready: false },
    scan_id: scanId,
    lease_token: leaseToken,
  }));
});

test('runtime source contains no effectful API, credential, environment, or persistence primitive', () => {
  const source = fs.readFileSync(runtimePath, 'utf8');
  const forbiddenPatterns = [
    /require\s*\(/,
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /process\.env/,
    /child_process/,
    /node:http/,
    /node:https/,
    /node:net/,
    /node:fs/,
    /api_access_token/i,
    /authorization\s*:/i,
    /INSERT\s+INTO/i,
    /UPDATE\s+[^\n]+SET/i,
    /customer_send/i,
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(source), false, String(pattern));
  }
  assert.equal(source.includes('customer_egress_allowed: false'), true);
  assert.equal(source.includes('no_loss_claimed: false'), true);
});
