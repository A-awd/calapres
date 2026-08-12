'use strict';

const crypto = require('node:crypto');

const {
  WAIT_CARRIER_FIELD_ORDER,
  createChatwootObservationRuntime,
} = require('../../runtime/chatwoot-observation-runtime');

const NOW_EPOCH_SECONDS = 1786450332;
const WEBHOOK_SECRET = 'calapres-public-webhook-secret-v1';
const ACTIVE_EVENT_KEY = Object.freeze({
  version: 'calapres-identity-hmac-v2',
  secret: 'calapres-public-event-identity-key-v2',
  state: 'active',
});
const RETAINED_EVENT_KEY = Object.freeze({
  version: 'calapres-identity-hmac-v1',
  secret: 'calapres-public-event-identity-key-v1',
  state: 'retained',
  retainUntilEpochSeconds: NOW_EPOCH_SECONDS + 86400,
});
const BASELINE_KEY = Object.freeze({
  version: 'calapres-hmac-v1',
  secret: 'calapres-public-baseline-key-v1',
  state: 'active',
});
const ANCHOR_MESSAGE_FINGERPRINT_DOMAIN = 'calapres-message-anchor-v1:';
const STATUS_FINGERPRINT_DOMAIN = 'calapres-conversation-status-v1:';
const ASSIGNEE_FINGERPRINT_DOMAIN = 'calapres-conversation-assignee-v1:';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function bytes(value) {
  return new TextEncoder().encode(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function sign(secret, timestamp, rawBodyBytes) {
  const prefix = bytes(timestamp + '.');
  return 'sha256=' + hmac(secret, Buffer.concat([
    Buffer.from(prefix),
    Buffer.from(rawBodyBytes),
  ]));
}

function payloadFor(overrides = {}) {
  const accountId = overrides.accountId === undefined ? 179973 : overrides.accountId;
  const inboxId = overrides.inboxId === undefined ? 128058 : overrides.inboxId;
  const conversationId = overrides.conversationId === undefined
    ? 700001
    : overrides.conversationId;
  const messageId = overrides.messageId === undefined ? 900001 : overrides.messageId;
  return {
    event: 'message_created',
    account: { id: accountId },
    inbox: { id: inboxId },
    conversation: {
      id: conversationId,
      account_id: accountId,
      inbox_id: inboxId,
    },
    id: messageId,
    content: overrides.content || 'نص عميل حساس لا يجوز أن يخرج في الدليل',
  };
}

function signedRequest(payload, options = {}) {
  const rawText = options.rawText === undefined ? JSON.stringify(payload) : options.rawText;
  const rawBodyBytes = bytes(rawText);
  const timestamp = options.timestamp || String(NOW_EPOCH_SECONDS - 10);
  const secret = options.secret || WEBHOOK_SECRET;
  return {
    rawBodyBytes,
    timestamp,
    signatureHeader: options.signatureHeader || sign(secret, timestamp, rawBodyBytes),
    deliveryHeader: options.deliveryHeader === undefined
      ? 'public-delivery-metadata-001'
      : options.deliveryHeader,
  };
}

function defaultConversation(overrides = {}) {
  return {
    id: 700001,
    account_id: 179973,
    inbox_id: 128058,
    status: 'open',
    meta: { assignee: null },
    ...overrides,
  };
}

function messageRow(overrides = {}) {
  return {
    id: 900001,
    account_id: 179973,
    inbox_id: 128058,
    conversation_id: '700001',
    message_type: 0,
    private: false,
    created_at: NOW_EPOCH_SECONDS - 20,
    sender: { type: 'contact' },
    content: 'سر اختباري يجب ألا يظهر في دليل إعادة القراءة',
    ...overrides,
  };
}

function makeRuntimeHarness(options = {}) {
  const state = {
    nowEpochSeconds: options.nowEpochSeconds || NOW_EPOCH_SECONDS,
    messageResponses: [],
    conversationResponses: [],
    existingFingerprints: new Set(options.existingFingerprints || []),
  };
  const calls = {
    replayClaims: [],
    businessLookups: [],
    conversations: [],
    messages: [],
  };
  const metrics = {
    secretReads: 0,
    sha256InputLengths: [],
    hmacInputLengths: [],
  };
  const replayFingerprints = new Set();
  const eventKeys = (options.eventKeys || [ACTIVE_EVENT_KEY, RETAINED_EVENT_KEY]).map(clone);
  const baselineKey = clone(options.baselineKey || BASELINE_KEY);

  const dependencies = {
    clock: {
      nowEpochSeconds() {
        return state.nowEpochSeconds;
      },
    },
    crypto: {
      sha256Hex(input) {
        metrics.sha256InputLengths.push(input.length);
        return sha256(Buffer.from(input));
      },
      hmacSha256Hex(secret, input) {
        metrics.hmacInputLengths.push(input.length);
        return hmac(secret, Buffer.from(input));
      },
      timingSafeEqualHex(left, right) {
        const leftBytes = Buffer.from(left, 'hex');
        const rightBytes = Buffer.from(right, 'hex');
        return leftBytes.length === rightBytes.length &&
          crypto.timingSafeEqual(leftBytes, rightBytes);
      },
    },
    secrets: {
      async chatwootWebhookSecret() {
        metrics.secretReads += 1;
        if (options.webhookSecretUnavailable) throw new Error('secret unavailable');
        return options.webhookSecret || WEBHOOK_SECRET;
      },
    },
    requestReplayStore: {
      async claim(command) {
        calls.replayClaims.push(clone(command));
        if (options.replayStoreUnavailable) throw new Error('replay store unavailable');
        if (replayFingerprints.has(command.fingerprint)) {
          return { atomic: true, status: 'duplicate' };
        }
        replayFingerprints.add(command.fingerprint);
        return { atomic: true, status: 'claimed' };
      },
    },
    eventIdentityKeys: {
      async active() {
        return clone(eventKeys.find((entry) => entry.state === 'active'));
      },
      async get(version) {
        return clone(eventKeys.find((entry) => entry.version === version));
      },
      async list() {
        return clone(eventKeys);
      },
    },
    baselineKeys: {
      async get(version) {
        return version === baselineKey.version ? clone(baselineKey) : undefined;
      },
    },
    businessEventStore: {
      async lookup(command) {
        calls.businessLookups.push(clone(command));
        if (options.businessStoreUnavailable) throw new Error('business store unavailable');
        return {
          verified: true,
          existingFingerprints: [...state.existingFingerprints],
        };
      },
    },
    chatwootRead: {
      async getConversation(command) {
        calls.conversations.push(clone(command));
        if (typeof options.getConversation === 'function') {
          return options.getConversation(command, calls.conversations.length - 1);
        }
        const index = Math.min(
          calls.conversations.length - 1,
          Math.max(0, state.conversationResponses.length - 1),
        );
        return clone(state.conversationResponses[index]);
      },
      async getMessages(command) {
        calls.messages.push(clone(command));
        if (typeof options.getMessages === 'function') {
          return options.getMessages(command, calls.messages.length - 1);
        }
        const index = Math.min(
          calls.messages.length - 1,
          Math.max(0, state.messageResponses.length - 1),
        );
        return clone(state.messageResponses[index]);
      },
    },
  };

  return {
    runtime: createChatwootObservationRuntime(dependencies),
    calls,
    metrics,
    state,
    eventKeys,
    baselineKey,
    setConversationResponses(responses) {
      state.conversationResponses = responses.map(clone);
    },
    setMessageResponses(responses) {
      state.messageResponses = responses.map(clone);
    },
    setExistingFingerprints(fingerprints) {
      state.existingFingerprints = new Set(fingerprints);
    },
  };
}

function fingerprintState(secret, waitIdentity, kind, value) {
  const canonical = {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: waitIdentity.account_id,
    inbox_id: waitIdentity.inbox_id,
    conversation_id: waitIdentity.conversation_id,
  };
  let domain;
  if (kind === 'status') {
    domain = STATUS_FINGERPRINT_DOMAIN;
    canonical.status = value;
  } else {
    domain = ASSIGNEE_FINGERPRINT_DOMAIN;
    canonical.assignee_id = value;
  }
  return hmac(secret, domain + JSON.stringify(canonical));
}

function buildWaitState(identityResult, harness, options = {}) {
  const tuple = identityResult.canonicalTuple;
  const activeKey = harness.eventKeys.find(
    (entry) => entry.version === identityResult.evidence.event_identity_key_version,
  );
  const waitIdentity = {
    account_id: tuple.account_id,
    inbox_id: tuple.inbox_id,
    conversation_id: tuple.conversation_id,
  };
  const anchorCanonical = {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: tuple.account_id,
    inbox_id: tuple.inbox_id,
    conversation_id: tuple.conversation_id,
    message_id: tuple.message_id,
    direction: 'inbound',
    visibility: 'public',
    event_identity_key_version: activeKey.version,
    event_identity_fingerprint: identityResult.evidence.event_identity_fingerprint,
  };
  const channelByInbox = {
    128031: 'instagram',
    128033: 'tiktok',
    128058: 'whatsapp',
    128326: 'email',
  };
  const waitState = {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: tuple.account_id,
    inbox_id: tuple.inbox_id,
    channel: channelByInbox[tuple.inbox_id],
    conversation_id: tuple.conversation_id,
    anchor_message_id: tuple.message_id,
    conversation_fingerprint: sha256(
      'calapres-test-conversation:' + tuple.conversation_id,
    ),
    message_fingerprint: hmac(
      activeKey.secret,
      ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(anchorCanonical),
    ),
    correlation_id: 'calapres:' + tuple.conversation_id + ':' + tuple.message_id,
    event_identity_key_version: activeKey.version,
    event_identity_fingerprint: identityResult.evidence.event_identity_fingerprint,
    generation: options.generation || 1,
    baseline_fingerprint_key_version: harness.baselineKey.version,
    baseline_status_fingerprint: fingerprintState(
      harness.baselineKey.secret,
      waitIdentity,
      'status',
      options.baselineStatus || 'open',
    ),
    baseline_assignee_fingerprint: fingerprintState(
      harness.baselineKey.secret,
      waitIdentity,
      'assignee',
      options.baselineAssignee === undefined ? null : options.baselineAssignee,
    ),
    delay_policy_version: '2026-08-11-v1',
    delay_mode: 'live_observation',
    delay_seconds: tuple.inbox_id === 128326 ? 120 : 30,
    not_before: new Date((harness.state.nowEpochSeconds - 1) * 1000).toISOString(),
    knowledge_version: '2026-08-11-v3',
    fixture_ref: null,
    customer_egress_allowed: false,
  };
  const carrier = {};
  for (const field of WAIT_CARRIER_FIELD_ORDER) carrier[field] = waitState[field];
  waitState.wait_state_fingerprint = sha256(JSON.stringify(carrier));
  return waitState;
}

function routeOverrides(waitState) {
  return {
    id: Number(waitState.conversation_id),
    account_id: waitState.account_id,
    inbox_id: waitState.inbox_id,
  };
}

function anchorRow(waitState, overrides = {}) {
  return messageRow({
    id: Number(waitState.anchor_message_id),
    account_id: waitState.account_id,
    inbox_id: waitState.inbox_id,
    conversation_id: waitState.conversation_id,
    ...overrides,
  });
}

async function prepareScenario(options = {}) {
  const harness = makeRuntimeHarness(options.harnessOptions || {});
  const payload = options.payload || payloadFor({ inboxId: options.inboxId });
  const request = signedRequest(payload, options.requestOptions || {});
  const ingress = await harness.runtime.verifySignedIngress(request);
  const identityResult = await harness.runtime.deriveEventIdentity({
    rawBodyBytes: request.rawBodyBytes,
    ingressEvidence: ingress,
  });
  const waitState = buildWaitState(identityResult, harness, options.waitOptions || {});
  const conversation = defaultConversation({
    ...routeOverrides(waitState),
    ...(options.conversation || {}),
  });
  const rows = options.rows || [anchorRow(waitState)];
  harness.setConversationResponses(
    options.conversationResponses || [
      { statusCode: 200, body: conversation },
      { statusCode: 200, body: conversation },
    ],
  );
  harness.setMessageResponses(
    options.messageResponses || [
      { statusCode: 200, body: { payload: rows } },
      { statusCode: 200, body: { payload: rows } },
    ],
  );
  return { harness, payload, request, ingress, identityResult, waitState };
}

async function runClearScenario(options = {}) {
  const scenario = await prepareScenario(options);
  const reread = await scenario.harness.runtime.performBoundedLiveReread({
    waitState: scenario.waitState,
  });
  const decision = scenario.harness.runtime.buildPostDelayDecision({
    waitState: scenario.waitState,
    evidence: reread,
    state: {
      currentGeneration: scenario.waitState.generation,
      idempotencyConsumed: false,
      brandEnabled: true,
      killSwitch: false,
    },
  });
  return { ...scenario, reread, decision };
}

module.exports = Object.freeze({
  NOW_EPOCH_SECONDS,
  WEBHOOK_SECRET,
  ACTIVE_EVENT_KEY,
  RETAINED_EVENT_KEY,
  BASELINE_KEY,
  anchorRow,
  buildWaitState,
  bytes,
  clone,
  defaultConversation,
  hmac,
  makeRuntimeHarness,
  messageRow,
  payloadFor,
  prepareScenario,
  runClearScenario,
  sha256,
  sign,
  signedRequest,
});
