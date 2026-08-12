'use strict';

/*
 * Deterministic source generator for the immutable, source-only Edge v2.
 *
 * The generated TypeScript contains no top-level helper declarations because
 * the n8n Workflow SDK accepts flat declarations only. Runtime helpers live
 * inside Code-node strings. This script prints the candidate to stdout; it
 * never imports, updates, publishes, or activates an n8n workflow.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RUNTIME_PATH = path.join(REPO_ROOT, 'n8n', 'runtime', 'chatwoot-observation-stages.js');
const RECONCILIATION_RUNTIME_PATH = path.join(
  REPO_ROOT, 'n8n', 'runtime', 'chatwoot-reconciliation-runtime.js',
);
const RECONCILIATION_BRIDGE_PATH = path.join(
  REPO_ROOT, 'n8n', 'runtime', 'chatwoot-reconciliation-ingress-bridge.js',
);
const OUTPUT_PATH = path.join(
  REPO_ROOT,
  'n8n',
  'workflows',
  'calapres-customer-service-edge-v2.ts',
);

const runtimeSource = fs.readFileSync(RUNTIME_PATH, 'utf8');
const reconciliationRuntimeSource = fs.readFileSync(RECONCILIATION_RUNTIME_PATH, 'utf8');
const reconciliationBridgeSource = fs.readFileSync(RECONCILIATION_BRIDGE_PATH, 'utf8');
const runtimeForCode = runtimeSource.replace(/\bmodule\.exports\b/g, '__edgeModule.exports');
const reconciliationRuntimeForCode = reconciliationRuntimeSource.replace(
  /\bmodule\.exports\b/g, '__reconciliationModule.exports',
);
const reconciliationBridgeForCode = reconciliationBridgeSource.replace(
  /\bmodule\.exports\b/g, '__reconciliationBridgeModule.exports',
);
const priorSource = fs.readFileSync(OUTPUT_PATH, 'utf8');
const supportMatch = priorSource.match(
  /const STAGED_SUPPORT_SOURCE = (".*");\nconst STAGED_BOOTSTRAP =/,
);
if (!supportMatch) throw new Error('existing embedded Code support source is unavailable');
const supportSource = JSON.parse(supportMatch[1]);

const runtimeHash = crypto.createHash('sha256').update(runtimeSource).digest('hex');
const parityHash = 'dbb11ff31880ef59bb740bbc51aa61ed1d74ade8594c66bbdc47766eebdc2418';

const raw = (value) => ({ __raw: value });
const expression = (value) => raw(`expr(${JSON.stringify(value)})`);
const credential = (value) => raw(value);

function serialize(value, indentation = 0) {
  if (value && typeof value === 'object' && Object.keys(value).length === 1 && value.__raw) {
    return value.__raw;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const inner = value.map((item) => `${' '.repeat(indentation + 2)}${serialize(item, indentation + 2)}`);
    return `[\n${inner.join(',\n')}\n${' '.repeat(indentation)}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const inner = entries.map(([key, item]) =>
      `${' '.repeat(indentation + 2)}${JSON.stringify(key)}: ${serialize(item, indentation + 2)}`,
    );
    return `{\n${inner.join(',\n')}\n${' '.repeat(indentation)}}`;
  }
  return JSON.stringify(value);
}

const declarations = [];
function declare(variable, constructor, value) {
  declarations.push(`const ${variable} = ${constructor}(${serialize(value)});`);
}

function code(
  variable,
  name,
  body,
  position,
  bootstrap = false,
  continueOnError = false,
  mode = 'runOnceForAllItems',
) {
  declare(variable, 'node', {
    type: 'n8n-nodes-base.code',
    version: 2,
    config: {
      name,
      parameters: {
        mode,
        language: 'javaScript',
        jsCode: bootstrap ? raw(`STAGED_BOOTSTRAP + ${JSON.stringify(`\n${body}`)}`) : body,
      },
      ...(continueOnError ? { onError: 'continueRegularOutput' } : {}),
      position,
    },
  });
}

function condition(variable, name, predicate, position) {
  declare(variable, 'ifElse', {
    version: 2.3,
    config: {
      name,
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict',
            version: 2,
          },
          conditions: [{
            leftValue: expression(`{{ ${predicate} }}`),
            rightValue: true,
            operator: { type: 'boolean', operation: 'true', singleValue: true },
          }],
          combinator: 'and',
        },
      },
      position,
    },
  });
}

function postgres(
  variable,
  ordinal,
  operation,
  position,
  nameOverride = null,
  functionNameOverride = null,
  credentialVariable = 'webhookWorkerPostgresCredential',
) {
  const functionName = functionNameOverride || (
    operation === 'claim_request_replay'
      ? 'claim_signed_webhook_request_replay'
      : operation === 'advance_conversation_generation'
        ? 'advance_signed_webhook_conversation_generation'
        : operation
  );
  declare(variable, 'node', {
    type: 'n8n-nodes-base.postgres',
    version: 2.7,
    config: {
      name: nameOverride || `Postgres Edge Atomic ${String(ordinal).padStart(2, '0')} - ${operation}`,
      parameters: {
        resource: 'database',
        operation: 'executeQuery',
        query: `SELECT calapres_cs.atomic_${functionName}($1::jsonb) AS result`,
        options: {
          queryBatching: 'single',
          queryReplacement: expression('{{ [JSON.stringify($json.postgres_command)] }}'),
          replaceEmptyStrings: false,
        },
      },
      credentials: { postgres: credential(credentialVariable) },
      onError: 'continueRegularOutput',
      position,
    },
  });
}

function hmac(variable, name, valueExpression, outputField, credentialVariable, position, binary = false) {
  const parameters = {
    action: 'hmac',
    binaryData: binary,
    type: 'SHA256',
    dataPropertyName: outputField,
    encoding: 'hex',
  };
  if (binary) parameters.binaryPropertyName = 'signed_payload';
  else parameters.value = expression(valueExpression);
  declare(variable, 'node', {
    type: 'n8n-nodes-base.crypto',
    version: 2,
    config: {
      name,
      parameters,
      credentials: { crypto: credential(credentialVariable) },
      position,
    },
  });
}

function chatwootGet(variable, name, url, position) {
  declare(variable, 'node', {
    type: 'n8n-nodes-base.httpRequest',
    version: 4.5,
    config: {
      name,
      parameters: {
        method: 'GET',
        url: expression(url),
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        sendHeaders: true,
        specifyHeaders: 'keypair',
        headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
        sendBody: false,
        options: {
          timeout: 8000,
          redirect: { redirect: { followRedirects: false } },
          response: {
            response: { fullResponse: true, neverError: true, responseFormat: 'json' },
          },
        },
      },
      credentials: { httpHeaderAuth: credential('chatwootReadCredential') },
      onError: 'continueRegularOutput',
      position,
    },
  });
}

function respond(variable, name, statusCode, position, continueOutput = false) {
  declare(variable, 'node', {
    type: 'n8n-nodes-base.respondToWebhook',
    version: 1.5,
    config: {
      name,
      parameters: {
        respondWith: 'noData',
        options: { responseCode: statusCode },
        ...(continueOutput ? { enableResponseOutput: true } : {}),
      },
      position,
    },
  });
}

const RECON_PREPARE_CONTROL = String.raw`
const executionId = typeof $execution === 'object' && $execution !== null ? String($execution.id || '') : '';
if (!/^[A-Za-z0-9_-]{1,120}$/.test(executionId)) return [{ json: { reconciliation_ready: false, customer_egress_allowed: false } }];
const control = __reconciliationRuntime.prepareControl({ brand_enabled: true, kill_switch: true, api_credential_available: false });
return Object.keys(__reconciliationModule.exports.INBOX_CHANNELS).map((inboxId, index) => ({ json: {
  reconciliation_ready: false, control, inbox_id: Number(inboxId), page: 1,
  scan_id: 'cwrs_' + __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes('calapres:' + executionId)).slice(0, 24),
  lease_owner_id: 'reconciliation_' + executionId, lease_token: 'reconciliation_lease_' + executionId,
  execution_id: executionId, inbox_index: index, customer_egress_allowed: false,
} }));
`;

const RECON_BUILD_SCAN_CLAIM = String.raw`
try {
  const source = $json;
  const command = __reconciliationRuntime.buildScanClaimCommand({
    inbox_id: source.inbox_id, scan_id: source.scan_id, lease_owner_id: source.lease_owner_id,
    lease_token: source.lease_token, lease_duration_seconds: 300, max_pages: 1,
  });
  return [{ json: { ...source, reconciliation_ready: true, postgres_command: command, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'scan_claim_invalid'), customer_egress_allowed: false } }];
}
`;

const RECON_INTERPRET_SCAN = String.raw`
const result = $json.result && typeof $json.result === 'object' ? $json.result : null;
const value = result && result.value && typeof result.value === 'object' ? result.value : null;
const leased = result && result.status === 'committed' && result.outcome === 'scan_lease_acquired' && value;
return [{ json: { ...$('Prepare Reconciliation Control and Allowlisted Inbox Selection').item.json,
  scan_lease: leased ? value : null, reconciliation_ready: Boolean(leased), customer_egress_allowed: false } }];
`;

const RECON_PREPARE_DISCOVERY = String.raw`
try {
  const request = __reconciliationRuntime.buildConversationDiscoveryRequest($json.control, { inbox_id: $json.inbox_id, page: 1 });
  return [{ json: { ...$json, discovery_request: request, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { ...$json, reconciliation_ready: false, stage_failure: String(error && error.message || 'discovery_request_invalid'), customer_egress_allowed: false } }];
}
`;

const RECON_NORMALIZE_DISCOVERY = String.raw`
try {
  const envelope = __edgeHttpEnvelope($json);
  const body = envelope.body || {};
  const page = __reconciliationRuntime.normalizeConversationDiscoveryPage({
    schema_version: '1.0', kind: 'chatwoot_reconciliation_conversation_page_projection_v1',
    status_code: envelope.status_code, account_id: 179973, inbox_id: $json.inbox_id,
    requested_page: 1, retry_after_seconds: null, error_code: envelope.error_code,
    all_count: envelope.status_code === 200 && Array.isArray(body.data) ? body.data.length : null,
    rows: envelope.status_code === 200 && Array.isArray(body.data) ? body.data.map((row) => ({
      id: row.id, account_id: row.account_id || 179973, inbox_id: row.inbox_id || $json.inbox_id, status: row.status,
    })) : null,
  });
  const snapshot = __reconciliationRuntime.buildDiscoverySnapshot({ pages: [page], page_cap_reached: false });
  return [{ json: { ...$('Interpret Reconciliation Scan Lease').item.json, discovery_snapshot_a: snapshot, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { ...$('Interpret Reconciliation Scan Lease').item.json, reconciliation_ready: false, stage_failure: String(error && error.message || 'discovery_page_invalid'), customer_egress_allowed: false } }];
}
`;

const RECON_NORMALIZE_DISCOVERY_SECOND = String.raw`
try {
  const envelope = __edgeHttpEnvelope($json);
  const body = envelope.body || {};
  const page = __reconciliationRuntime.normalizeConversationDiscoveryPage({
    schema_version: '1.0', kind: 'chatwoot_reconciliation_conversation_page_projection_v1',
    status_code: envelope.status_code, account_id: 179973, inbox_id: $json.inbox_id,
    requested_page: 1, retry_after_seconds: null, error_code: envelope.error_code,
    all_count: envelope.status_code === 200 && Array.isArray(body.data) ? body.data.length : null,
    rows: envelope.status_code === 200 && Array.isArray(body.data) ? body.data.map((row) => ({
      id: row.id, account_id: row.account_id || 179973, inbox_id: row.inbox_id || $json.inbox_id, status: row.status,
    })) : null,
  });
  const first = $('Normalize Reconciliation Discovery Snapshot A').item.json;
  const snapshot = __reconciliationRuntime.buildDiscoverySnapshot({ pages: [page], page_cap_reached: false });
  const coverage = __reconciliationRuntime.evaluateDiscoveryConvergence({ first_snapshot: first.discovery_snapshot_a, second_snapshot: snapshot });
  return [{ json: { ...first, discovery_coverage: coverage, reconciliation_ready: coverage.bounded_convergence_passed, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'discovery_convergence_invalid'), customer_egress_allowed: false } }];
}
`;

const RECON_BUILD_CURSOR_READ = String.raw`
try {
  const conversationId = $json.discovery_coverage && $json.discovery_coverage.conversation_ids[0];
  if (!conversationId || !$json.scan_lease) throw new Error('no_reconciliation_conversation');
  return [{ json: { ...$json, conversation_id: conversationId, postgres_command: {
    brand_id: 'calapres', account_id: 179973, inbox_id: $json.inbox_id, channel: __reconciliationModule.exports.INBOX_CHANNELS[$json.inbox_id],
    conversation_id: conversationId, scan_id: $json.scan_id, scan_lease_token: $json.scan_lease.lease_token,
    operation: 'read_chatwoot_reconciliation_cursor', customer_egress_allowed: false,
  }, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'cursor_read_invalid'), customer_egress_allowed: false } }];
}
`;

const RECON_BUILD_MESSAGES_REQUEST = String.raw`
try {
  const cursor = $json.result && $json.result.value ? $json.result.value : $json.result;
  const after = cursor && Number.isSafeInteger(cursor.after_message_id) ? cursor.after_message_id : 0;
  const request = __reconciliationRuntime.buildMessagesAfterRequest($json.control, { inbox_id: $json.inbox_id, conversation_id: $json.conversation_id, after_message_id: after });
  return [{ json: { ...$json, cursor, expected_after_message_id: after, messages_request: request, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'messages_request_invalid'), customer_egress_allowed: false } }];
}
`;

const RECON_FINALIZE_MESSAGES = String.raw`
try {
  const envelope = __edgeHttpEnvelope($json);
  const body = envelope.body || {};
  const page = __reconciliationRuntime.normalizeMessagesAfterPage({
    schema_version: '1.0', kind: 'chatwoot_reconciliation_messages_after_projection_v1',
    status_code: envelope.status_code, account_id: 179973, inbox_id: $json.inbox_id,
    conversation_id: $json.conversation_id, requested_after_message_id: $json.expected_after_message_id,
    retry_after_seconds: null, error_code: envelope.error_code,
    rows: envelope.status_code === 200 && Array.isArray(body.payload) ? body.payload.map((row) => ({
      id: row.id, account_id: row.account_id || 179973, inbox_id: row.inbox_id || $json.inbox_id,
      conversation_id: row.conversation_id || $json.conversation_id, created_at: row.created_at,
      message_type: row.message_type, private: row.private, sender_type: row.sender && row.sender.type || null,
      attachment_count: Array.isArray(row.attachments) ? row.attachments.length : 0,
    })) : null,
  });
  const finalization = __reconciliationRuntime.finalizeMessagesPage(page);
  return [{ json: { ...$json, messages_page: page, messages_finalization: finalization, reconciliation_ready: finalization.status === 'ready', customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'messages_page_invalid'), customer_egress_allowed: false } }];
}
`;

const RECON_PREPARE_CANDIDATE = String.raw`
try {
  const candidate = $json.messages_finalization && $json.messages_finalization.event_candidates && $json.messages_finalization.event_candidates[0];
  if (!candidate) return [{ json: { reconciliation_ready: false, customer_egress_allowed: false } }];
  const plan = __reconciliationBridge.prepareCandidateIdentity({ messages_page: $json.messages_finalization, candidate, reconciliation_context: {
    scan_id: $json.scan_id, scan_lease_token: $json.scan_lease.lease_token, expected_after_message_id: $json.expected_after_message_id,
  }, execution_id: $json.execution_id });
  return [{ json: { ...$json, candidate_plan: plan, hmac_requests: plan.hmac_requests, reconciliation_ready: true, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'candidate_identity_invalid'), customer_egress_allowed: false } }];
}
`;

const RECON_BUILD_CURSOR_ADVANCE = String.raw`
try {
  const finalization = $json.messages_finalization;
  const command = __reconciliationRuntime.buildCursorAdvanceCommand({ finalization, scan_id: $json.scan_id, lease_token: $json.scan_lease.lease_token });
  return [{ json: { ...$json, postgres_command: command, reconciliation_ready: true, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'cursor_advance_invalid'), customer_egress_allowed: false } }];
}
`;

const INGRESS_PREFLIGHT = String.raw`
let preflight = null;
let disposition = 'service_unavailable';
try {
  const item = $input.first();
  const source = item && item.json && typeof item.json === 'object' ? item.json : {};
  const headers = source.headers && typeof source.headers === 'object' ? source.headers : {};
  const lowered = {};
  for (const [key, value] of Object.entries(headers)) lowered[String(key).toLowerCase()] = value;
  const rawBodyBase64 = typeof source.raw_body_base64 === 'string' ? source.raw_body_base64
    : typeof source.rawBody === 'string' ? source.rawBody
      : item && item.binary && item.binary.data && typeof item.binary.data.data === 'string'
        ? item.binary.data.data : '';
  preflight = __edgeStages.prepareSignedIngress({
    schema_version: '1.0', content_type: String(lowered['content-type'] || ''),
    timestamp_header: String(lowered['x-chatwoot-timestamp'] || ''),
    signature_header: String(lowered['x-chatwoot-signature'] || ''),
    delivery_header: lowered['x-chatwoot-delivery'] === undefined
      ? null : String(lowered['x-chatwoot-delivery']),
    raw_body_base64: rawBodyBase64,
    received_epoch_seconds: Math.floor(Date.now() / 1000)
  });
  const trustedRejected = preflight && preflight.schema_version === '1.0' &&
    preflight.kind === 'chatwoot_signed_ingress_preflight_v1' &&
    preflight.status === 'rejected' && preflight.transient === null &&
    preflight.customer_egress_allowed === false &&
    typeof preflight.reason_code === 'string' &&
    /^[a-z][a-z0-9_]{2,80}$/.test(preflight.reason_code);
  if (preflight && preflight.status === 'eligible' && preflight.response_code === 0 &&
      preflight.reason_code === null && preflight.customer_egress_allowed === false) {
    disposition = 'hmac_required';
  } else if (trustedRejected && preflight.response_code === 400) {
    disposition = 'bad_request';
  } else if (trustedRejected && preflight.response_code === 401) {
    disposition = 'unauthorized';
  } else if (trustedRejected && preflight.response_code === 413) {
    disposition = 'too_large';
  }
} catch (error) {
  preflight = __edgeFailure('prepare_signed_ingress', error);
}
if (disposition !== 'hmac_required') {
  return [{ json: { ingress_disposition: disposition, preflight,
    customer_egress_allowed: false } }];
}
return [{
  json: { ingress_disposition: disposition, preflight, customer_egress_allowed: false },
  binary: { signed_payload: { data: preflight.transient.signed_payload_base64,
    mimeType: 'application/octet-stream', fileName: 'signed-payload.bin' } }
}];`;

const FINALIZE_SIGNED_HMAC = String.raw`
let signedGate = null;
let disposition = 'service_unavailable';
try {
  const preflight = $json.preflight;
  const computed = $json.computed_hmac_hex;
  signedGate = __edgeStages.finalizeSignedHmac({ preflight,
    computed_hmac_hex: computed, compared_epoch_seconds: Math.floor(Date.now() / 1000) });
  if (signedGate && signedGate.schema_version === '1.0' &&
      signedGate.kind === 'chatwoot_signed_hmac_gate_v1' &&
      signedGate.status === 'verified' && signedGate.response_code === 0 &&
      signedGate.reason_code === null && signedGate.customer_egress_allowed === false) {
    disposition = 'verified';
  } else if (signedGate && signedGate.schema_version === '1.0' &&
      signedGate.kind === 'chatwoot_signed_hmac_gate_v1' &&
      signedGate.status === 'fail_closed' && signedGate.response_code === 401 &&
      signedGate.raw_binding === null && signedGate.replay_identity === null &&
      signedGate.customer_egress_allowed === false &&
      ['signature_mismatch', 'hmac_comparison_stale'].includes(signedGate.reason_code)) {
    disposition = 'unauthorized';
  }
} catch (error) {
  signedGate = __edgeFailure('finalize_signed_hmac', error);
}
return { json: { signed_gate: signedGate,
  hmac_disposition: disposition,
  cryptographic_verification_performed_in_code: false,
  customer_egress_allowed: false } };`;

const PREPARE_REQUEST = String.raw`
const signed = $('Finalize Signed HMAC Constant Time Gate').first().json.signed_gate;
const executionId = typeof $execution === 'object' && $execution !== null
  ? String($execution.id || '') : '';
if (!signed || signed.status !== 'verified' || !/^[A-Za-z0-9_-]{1,120}$/.test(executionId)) {
  return [{ json: { pipeline_status: 'retry', customer_egress_allowed: false } }];
}
const fingerprint = signed.replay_identity.replay_key_fingerprint;
const leaseOwner = 'edge_ingress_' + executionId;
const leaseToken = 'request_' + __edgeDependencies.sha256Hex(
  __edgeDependencies.utf8ToBytes(executionId + ':' + fingerprint)).slice(0, 48);
const command = {
  brand_id: 'calapres', claim_id: 'req_' + fingerprint,
  active_fingerprint: fingerprint, active_key_version: 'hmac-sha256-v1',
  retained_fingerprints: [], key_registry_version: 'calapres-storage-keys-v1',
  request_source: 'chatwoot_signed_webhook_v1',
  source_binding_sha256: fingerprint,
  request_ttl_seconds: 600, lease_owner_id: leaseOwner, lease_token: leaseToken,
  lease_duration_seconds: 300
};
return [{ json: { postgres_command: command,
  request_context: { claim_id: command.claim_id, lease_owner_id: leaseOwner,
    lease_token: leaseToken, request_source: command.request_source,
    source_binding_sha256: command.source_binding_sha256, signed_gate: signed },
  pipeline_status: 'request_claim_ready', customer_egress_allowed: false } }];`;

const INTERPRET_REQUEST = String.raw`
const source = $input.first().json || {};
const result = source.result && typeof source.result === 'object' && !Array.isArray(source.result)
  ? source.result : null;
const context = $('Prepare Request Replay Processing Lease').first().json.request_context;
const exactKeys = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === fields.length &&
  fields.every((field) => Object.prototype.hasOwnProperty.call(value, field));
const processingKeys = ['claim_id','lifecycle_status','claimed_at','expires_at',
  'lease_expires_at','attempt_count','request_source','source_binding_sha256'];
const completedKeys = ['account_id','inbox_id','channel','conversation_id','anchor_message_id',
  'correlation_id','event_identity_key_version','event_identity_fingerprint',
  'conversation_fingerprint','message_fingerprint','baseline_fingerprint_key_version',
  'baseline_status_fingerprint','baseline_assignee_fingerprint','delay_policy_version',
  'delay_seconds','knowledge_version','claim_id','lifecycle_status','claimed_at','expires_at',
  'lease_expires_at','attempt_count','request_source','source_binding_sha256',
  'business_claim_id','job_id','generation','due_at'];
const iso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const token = (value) => typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value) &&
  Number.isSafeInteger(Number(value)) && String(Number(value)) === value;
const opaque = (value) => typeof value === 'string' && /^[A-Za-z0-9:_-]{4,160}$/.test(value);
const hex = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const channels = { 128031: 'instagram', 128033: 'tiktok', 128058: 'whatsapp', 128326: 'email' };
let state = 'retry';
let linked = null;
if (result && result.contract_verified === true && result.operation === 'claim_request_replay' &&
    result.error_code === null && result.status === 'committed' &&
    ['processing_claimed', 'processing_owned', 'processing_recovered'].includes(result.outcome) &&
    exactKeys(result.value, processingKeys) && result.value.claim_id === context.claim_id &&
    result.value.request_source === context.request_source &&
    result.value.source_binding_sha256 === context.source_binding_sha256 &&
    result.value.lifecycle_status === 'processing' && iso(result.value.claimed_at) &&
    iso(result.value.expires_at) && iso(result.value.lease_expires_at) &&
    Number.isSafeInteger(result.value.attempt_count) && result.value.attempt_count > 0) {
  state = 'proceed';
} else if (result && result.contract_verified === true &&
    result.operation === 'claim_request_replay' && result.status === 'duplicate_or_conflict' &&
    result.outcome === 'duplicate_completed' && result.error_code === null &&
    exactKeys(result.value, completedKeys) && result.value.claim_id === context.claim_id &&
    result.value.request_source === context.request_source &&
    result.value.source_binding_sha256 === context.source_binding_sha256 &&
    result.value.lifecycle_status === 'completed' && result.value.account_id === 179973 &&
    channels[result.value.inbox_id] === result.value.channel && token(result.value.conversation_id) &&
    token(result.value.anchor_message_id) &&
    result.value.correlation_id === 'calapres:' + result.value.conversation_id + ':' +
      result.value.anchor_message_id &&
    result.value.event_identity_key_version === 'calapres-identity-hmac-v1' &&
    result.value.baseline_fingerprint_key_version === 'calapres-hmac-v1' &&
    result.value.delay_policy_version === '2026-08-11-v1' &&
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/.test(result.value.knowledge_version || '') &&
    ['event_identity_fingerprint','conversation_fingerprint','message_fingerprint',
      'baseline_status_fingerprint','baseline_assignee_fingerprint'].every((field) => hex(result.value[field])) &&
    opaque(result.value.business_claim_id) && opaque(result.value.job_id) &&
    iso(result.value.claimed_at) && iso(result.value.expires_at) &&
    iso(result.value.lease_expires_at) && iso(result.value.due_at) &&
    Number.isSafeInteger(result.value.attempt_count) && result.value.attempt_count > 0 &&
    Number.isSafeInteger(result.value.generation) && result.value.generation > 0 &&
    Number.isSafeInteger(result.value.delay_seconds) &&
    (result.value.channel === 'email'
      ? result.value.delay_seconds >= 120 && result.value.delay_seconds <= 300
      : result.value.delay_seconds >= 30 && result.value.delay_seconds <= 75)) {
  state = 'ack_completed';
  linked = { job_id: result.value.job_id, due_at: result.value.due_at };
}
return [{ json: { request_state: state, request_context: context, linked_job: linked,
  customer_egress_allowed: false } }];`;

const PREPARE_EVENT = String.raw`
const context = $input.first().json.request_context;
let plan;
try {
  const signed = context.signed_gate;
  const replayGate = {
    schema_version: '1.0', kind: 'chatwoot_request_replay_gate_v1',
    status: 'proceed_parse', response_code: 0, reason_code: null,
    raw_binding: signed.raw_binding,
    replay_key_fingerprint: signed.replay_identity.replay_key_fingerprint,
    customer_egress_allowed: false
  };
  plan = __edgeStages.prepareEventIdentity({ replay_gate: replayGate,
    active_key_version: 'calapres-identity-hmac-v1', retained_key_versions: [] });
} catch (error) {
  return [{ json: { pipeline_ready: false,
    stage_failure: __edgeFailure('prepare_event_identity', error),
    customer_egress_allowed: false } }];
}
if (!Array.isArray(plan.hmac_requests) || plan.hmac_requests.length !== 1) {
  return [{ json: { pipeline_ready: false,
    stage_failure: __edgeFailure('prepare_event_identity', new Error('event_hmac_cardinality_invalid')),
    customer_egress_allowed: false } }];
}
return [{ json: {
  pipeline_ready: true, event_plan: plan, request_context: context,
  cryptographic_verification_performed_in_code: false,
  customer_egress_allowed: false
} }];`;

const FINALIZE_EVENT = String.raw`
try {
  const plan = $json.event_plan;
  if (!plan || !Array.isArray(plan.hmac_requests) || plan.hmac_requests.length !== 1 ||
      !/^[a-f0-9]{64}$/.test($json.native_event_identity_v1_hex || '')) {
    throw new Error('event_native_chain_invalid');
  }
  const request = plan.hmac_requests[0];
  const identity = __edgeStages.finalizeEventIdentity({ event_plan: plan,
    hmac_results: [{ purpose: request.purpose, key_version: request.key_version,
      digest_hex: $json.native_event_identity_v1_hex }] });
  if (!Array.isArray(identity.route_hmac_requests) || identity.route_hmac_requests.length !== 2) {
    throw new Error('route_hmac_cardinality_invalid');
  }
  return { json: {
    pipeline_ready: true, event_identity: identity, request_context: $json.request_context,
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false
  } };
} catch (error) {
  return { json: { pipeline_ready: false,
    stage_failure: __edgeFailure('finalize_event_identity', error),
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } };
}`;

const FINALIZE_ROUTE = String.raw`
try {
  const identity = $json.event_identity;
  if (!identity || !Array.isArray(identity.route_hmac_requests) ||
      identity.route_hmac_requests.length !== 2 ||
      !/^[a-f0-9]{64}$/.test($json.native_message_anchor_v1_hex || '') ||
      !/^[a-f0-9]{64}$/.test($json.native_conversation_v1_hex || '')) {
    throw new Error('route_native_chain_invalid');
  }
  const route = __edgeStages.finalizeRouteFingerprints({
    event_identity: identity,
    hmac_results: identity.route_hmac_requests.map((request, index) => ({
      purpose: request.purpose, key_version: request.key_version,
      digest_hex: index === 0 ? $json.native_message_anchor_v1_hex
        : $json.native_conversation_v1_hex }))
  });
  const executionId = typeof $execution === 'object' && $execution !== null
    ? String($execution.id || '') : '';
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(executionId)) throw new Error('execution_id_invalid');
  const activeVersion = route.active_key_version;
  const eventFingerprint = route.event_identity_fingerprints[activeVersion];
  const leaseOwner = 'edge_ingress_' + executionId;
  const leaseToken = 'business_' + __edgeDependencies.sha256Hex(
    __edgeDependencies.utf8ToBytes(executionId + ':' + eventFingerprint)).slice(0, 48);
  const command = {
    brand_id: 'calapres', claim_id: 'bev_claim_' + eventFingerprint,
    active_fingerprint: eventFingerprint,
    active_key_version: route.storage_key_versions.active,
    retained_fingerprints: route.retained_key_versions.map((version, index) => ({
      fingerprint: route.event_identity_fingerprints[version],
      key_version: route.storage_key_versions.retained[index].storage_key_version
    })),
    key_registry_version: 'calapres-storage-keys-v1', event_retention_seconds: 604800,
    lease_owner_id: leaseOwner, lease_token: leaseToken, lease_duration_seconds: 300
  };
  return { json: { pipeline_ready: true, route_identity: route,
    request_context: $json.request_context,
    business_context: { claim_id: command.claim_id, lease_owner_id: leaseOwner,
      lease_token: leaseToken, job_id: 'job_' + route.message_fingerprints[activeVersion] },
    postgres_command: command, cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } };
} catch (error) {
  return { json: { pipeline_ready: false,
    stage_failure: __edgeFailure('finalize_route_identity', error),
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } };
}`;

const INTERPRET_BUSINESS = String.raw`
const source = $input.first().json || {};
const result = source.result && typeof source.result === 'object' && !Array.isArray(source.result)
  ? source.result : null;
const prepared = $('Finalize Route and Prepare Business Event Lease').first().json;
const exactKeys = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === fields.length &&
  fields.every((field) => Object.prototype.hasOwnProperty.call(value, field));
const opaque = (value) => typeof value === 'string' && /^[A-Za-z0-9:_-]{4,160}$/.test(value);
const token = (value) => typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value) &&
  Number.isSafeInteger(Number(value)) && String(Number(value)) === value;
const iso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const hex = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const preparedKeys = ['claim_id','lease_expires_at','attempt_count','job_id'];
const completedKeys = ['account_id','inbox_id','channel','conversation_id','anchor_message_id',
  'correlation_id','event_identity_key_version','event_identity_fingerprint',
  'conversation_fingerprint','message_fingerprint','baseline_fingerprint_key_version',
  'baseline_status_fingerprint','baseline_assignee_fingerprint','delay_policy_version',
  'delay_seconds','knowledge_version','claim_id','lifecycle_status','job_id','generation',
  'due_at','state','observation_id','audit_id'];
const route = prepared.route_identity;
let state = 'retry';
let businessContext = null;
let completedBundle = null;
const preparedResult = result && result.contract_verified === true &&
  result.operation === 'claim_business_event' && result.status === 'committed' &&
  ['prepared', 'prepared_owned', 'recovered_prepared'].includes(result.outcome) &&
  result.error_code === null && exactKeys(result.value, preparedKeys) &&
  opaque(result.value.claim_id) && iso(result.value.lease_expires_at) &&
  Number.isSafeInteger(result.value.attempt_count) && result.value.attempt_count > 0 &&
  result.value.job_id === null;
if (preparedResult) {
  state = 'proceed';
  businessContext = {
    claim_id: result.value.claim_id,
    lease_owner_id: prepared.business_context.lease_owner_id,
    lease_token: prepared.business_context.lease_token,
    job_id: prepared.business_context.job_id
  };
}
const completedResult = result && result.contract_verified === true &&
  result.operation === 'claim_business_event' && result.status === 'duplicate_or_conflict' &&
  result.outcome === 'duplicate_completed' && result.error_code === null &&
  exactKeys(result.value, completedKeys) && opaque(result.value.claim_id) &&
  result.value.lifecycle_status === 'completed' && opaque(result.value.job_id) &&
  Number.isSafeInteger(result.value.generation) && result.value.generation > 0 &&
  iso(result.value.due_at) && result.value.state === 'completed' &&
  opaque(result.value.observation_id) && opaque(result.value.audit_id) &&
  result.value.account_id === route.account_id && result.value.inbox_id === route.inbox_id &&
  result.value.channel === route.channel && result.value.conversation_id === route.conversation_id &&
  result.value.anchor_message_id === route.message_id && token(result.value.conversation_id) &&
  token(result.value.anchor_message_id) && result.value.correlation_id === route.correlation_id &&
  /^calapres-identity-hmac-v[1-9][0-9]*$/.test(result.value.event_identity_key_version || '') &&
  result.value.baseline_fingerprint_key_version &&
  /^calapres-hmac-v[1-9][0-9]*$/.test(result.value.baseline_fingerprint_key_version) &&
  /^2026-08-11-v[1-9][0-9]*$/.test(result.value.delay_policy_version || '') &&
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/.test(result.value.knowledge_version || '') &&
  ['event_identity_fingerprint','conversation_fingerprint','message_fingerprint',
    'baseline_status_fingerprint','baseline_assignee_fingerprint'].every((field) => hex(result.value[field])) &&
  Number.isSafeInteger(result.value.delay_seconds) &&
  (result.value.channel === 'email'
    ? result.value.delay_seconds >= 120 && result.value.delay_seconds <= 300
    : result.value.delay_seconds >= 30 && result.value.delay_seconds <= 75);
if (completedResult) {
  state = 'completed_reconcile';
  businessContext = {
    claim_id: result.value.claim_id,
    lease_owner_id: prepared.business_context.lease_owner_id,
    lease_token: prepared.business_context.lease_token,
    job_id: result.value.job_id
  };
  completedBundle = {
    account_id: result.value.account_id, inbox_id: result.value.inbox_id,
    channel: result.value.channel, conversation_id: result.value.conversation_id,
    anchor_message_id: result.value.anchor_message_id, correlation_id: result.value.correlation_id,
    event_identity_key_version: result.value.event_identity_key_version,
    event_identity_fingerprint: result.value.event_identity_fingerprint,
    conversation_fingerprint: result.value.conversation_fingerprint,
    message_fingerprint: result.value.message_fingerprint,
    baseline_fingerprint_key_version: result.value.baseline_fingerprint_key_version,
    baseline_status_fingerprint: result.value.baseline_status_fingerprint,
    baseline_assignee_fingerprint: result.value.baseline_assignee_fingerprint,
    delay_policy_version: result.value.delay_policy_version,
    delay_seconds: result.value.delay_seconds, knowledge_version: result.value.knowledge_version,
    claim_id: result.value.claim_id, lifecycle_status: result.value.lifecycle_status,
    job_id: result.value.job_id, generation: result.value.generation,
    due_at: result.value.due_at, state: result.value.state,
    observation_id: result.value.observation_id, audit_id: result.value.audit_id
  };
}
return [{ json: { business_state: state,
  route_identity: prepared.route_identity, request_context: prepared.request_context,
  business_context: businessContext, completed_bundle: completedBundle,
  customer_egress_allowed: false } }];`;

const BUILD_COMPLETED_RECONCILIATION = String.raw`
const state = $('Interpret Business Event Lease Result').first().json;
const route = state.route_identity;
const request = state.request_context;
const business = state.business_context;
const completed = state.completed_bundle;
try {
  if (state.business_state !== 'completed_reconcile' || !route || !request || !business || !completed ||
      completed.lifecycle_status !== 'completed' || completed.state !== 'completed' ||
      completed.claim_id !== business.claim_id || completed.job_id !== business.job_id) {
    throw new Error('completed_reconciliation_context_invalid');
  }
  const activeVersion = route.active_key_version;
  const command = {
    brand_id: 'calapres', request_claim_id: request.claim_id,
    request_lease_owner_id: request.lease_owner_id, request_lease_token: request.lease_token,
    business_claim_id: completed.claim_id,
    business_lease_owner_id: business.lease_owner_id,
    business_lease_token: business.lease_token,
    request_source: request.request_source,
    source_binding_sha256: request.source_binding_sha256,
    reconciliation_scan_id: null, reconciliation_scan_lease_token: null,
    reconciliation_expected_after_message_id: null,
    reconciliation_page_binding_sha256: null,
    account_id: completed.account_id, inbox_id: completed.inbox_id, channel: completed.channel,
    conversation_id: completed.conversation_id, anchor_message_id: completed.anchor_message_id,
    correlation_id: completed.correlation_id, job_id: completed.job_id,
    event_identity_key_version: activeVersion,
    event_identity_fingerprint: route.event_identity_fingerprints[activeVersion],
    conversation_fingerprint: completed.conversation_fingerprint,
    message_fingerprint: route.message_fingerprints[activeVersion],
    active_key_version: route.storage_key_versions.active,
    retained_message_fingerprints: route.retained_key_versions.map((version, index) => ({
      fingerprint: route.message_fingerprints[version],
      key_version: route.storage_key_versions.retained[index].storage_key_version
    })),
    key_registry_version: 'calapres-storage-keys-v1',
    baseline_fingerprint_key_version: completed.baseline_fingerprint_key_version,
    baseline_status_fingerprint: completed.baseline_status_fingerprint,
    baseline_assignee_fingerprint: completed.baseline_assignee_fingerprint,
    delay_policy_version: completed.delay_policy_version,
    knowledge_version: completed.knowledge_version, delay_seconds: completed.delay_seconds,
    retention_seconds: 7776000
  };
  return [{ json: { pipeline_ready: true, ingress_mode: 'completed_reconcile',
    postgres_command: command, expected_control: completed,
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { pipeline_ready: false, ingress_mode: 'invalid',
    stage_failure: __edgeFailure('build_completed_reconciliation', error),
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } }];
}`;

const PREPARE_BASELINE = String.raw`
const route = $('Interpret Business Event Lease Result').first().json.route_identity;
const http = __edgeHttpEnvelope($input.first().json);
try {
  if (http.status_code !== 200 || !http.body || typeof http.body !== 'object') {
    throw new Error('conversation_read_unavailable');
  }
  const body = http.body;
  const accountId = body.account_id;
  const inboxId = Object.prototype.hasOwnProperty.call(body, 'inbox_id') ? body.inbox_id
    : body.inbox && typeof body.inbox === 'object' ? body.inbox.id : null;
  if (accountId !== route.account_id || inboxId !== route.inbox_id ||
      String(body.id) !== route.conversation_id ||
      !['open', 'resolved', 'pending', 'snoozed'].includes(body.status)) {
    throw new Error('conversation_route_invalid');
  }
  const candidates = [];
  const containers = [
    [body, 'assignee_id'], [body, 'assignee'],
    [body.meta && typeof body.meta === 'object' ? body.meta : null, 'assignee']
  ];
  for (const [container, field] of containers) {
    if (!container || !Object.prototype.hasOwnProperty.call(container, field)) continue;
    const value = container[field];
    if (field === 'assignee_id' || value === null) candidates.push(value);
    else if (typeof value === 'object' && Number.isSafeInteger(value.id) &&
      (!Object.prototype.hasOwnProperty.call(value, 'account_id') || value.account_id === route.account_id)) {
      candidates.push(value.id);
    } else throw new Error('conversation_assignee_invalid');
  }
  if (candidates.length === 0 || candidates.some((value) => value !== candidates[0]) ||
      candidates.some((value) => value !== null && (!Number.isSafeInteger(value) || value < 1))) {
    throw new Error('conversation_assignee_invalid');
  }
  const canonical = { schema_version: '1.0', brand_id: 'calapres', account_id: route.account_id,
    inbox_id: route.inbox_id, conversation_id: route.conversation_id };
  const requests = [
    { purpose: 'baseline_status', key_version: 'calapres-hmac-v1',
      algorithm: 'hmac-sha256', encoding: 'hex',
      material_utf8: 'calapres-conversation-status-v1:' +
        JSON.stringify({ ...canonical, status: body.status }) },
    { purpose: 'baseline_assignee', key_version: 'calapres-hmac-v1',
      algorithm: 'hmac-sha256', encoding: 'hex',
      material_utf8: 'calapres-conversation-assignee-v1:' +
        JSON.stringify({ ...canonical, assignee_id: candidates[0] }) }
  ];
  const planCore = { schema_version: '1.0', kind: 'chatwoot_ingress_baseline_plan_v1',
    route_binding_sha256: route.route_binding_sha256,
    baseline_key_version: 'calapres-hmac-v1', hmac_requests: requests,
    customer_egress_allowed: false };
  const plan = { ...planCore,
    plan_binding_sha256: __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes(
      'calapres-ingress-baseline-plan-v1:' + __edgeModule.exports.stableJson(planCore))) };
  return [{ json: {
    pipeline_ready: true, baseline_plan: plan,
    route_state: $('Interpret Business Event Lease Result').first().json,
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false
  } }];
} catch (error) {
  return [{ json: { pipeline_ready: false,
    stage_failure: __edgeFailure('prepare_ingress_baseline', error),
    customer_egress_allowed: false } }];
}`;

const BUILD_COMBINED = String.raw`
try {
  const routeState = $json.route_state;
  const route = routeState.route_identity;
  const activeVersion = route.active_key_version;
  const plan = $json.baseline_plan;
  if (!plan || plan.schema_version !== '1.0' ||
      plan.kind !== 'chatwoot_ingress_baseline_plan_v1' ||
      plan.route_binding_sha256 !== route.route_binding_sha256 ||
      plan.baseline_key_version !== 'calapres-hmac-v1' ||
      plan.customer_egress_allowed !== false ||
      !Array.isArray(plan.hmac_requests) || plan.hmac_requests.length !== 2 ||
      plan.hmac_requests[0].purpose !== 'baseline_status' ||
      plan.hmac_requests[1].purpose !== 'baseline_assignee' ||
      !/^[a-f0-9]{64}$/.test($json.native_baseline_status_v1_hex || '') ||
      !/^[a-f0-9]{64}$/.test($json.native_baseline_assignee_v1_hex || '')) {
    throw new Error('baseline_native_chain_invalid');
  }
  const planCore = { ...plan };
  delete planCore.plan_binding_sha256;
  const expectedPlanBinding = __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes(
    'calapres-ingress-baseline-plan-v1:' + __edgeModule.exports.stableJson(planCore)));
  if (plan.plan_binding_sha256 !== expectedPlanBinding) throw new Error('baseline_plan_invalid');
  const request = routeState.request_context;
  const business = routeState.business_context;
  const command = {
    brand_id: 'calapres', request_claim_id: request.claim_id,
    request_lease_owner_id: request.lease_owner_id, request_lease_token: request.lease_token,
    business_claim_id: business.claim_id, business_lease_owner_id: business.lease_owner_id,
    business_lease_token: business.lease_token, request_source: request.request_source,
    source_binding_sha256: request.source_binding_sha256, reconciliation_scan_id: null,
    reconciliation_scan_lease_token: null, reconciliation_expected_after_message_id: null,
    reconciliation_page_binding_sha256: null, account_id: route.account_id,
    inbox_id: route.inbox_id, channel: route.channel, conversation_id: route.conversation_id,
    anchor_message_id: route.message_id, correlation_id: route.correlation_id,
    job_id: business.job_id, event_identity_key_version: activeVersion,
    event_identity_fingerprint: route.event_identity_fingerprints[activeVersion],
    conversation_fingerprint: route.conversation_fingerprints[activeVersion],
    message_fingerprint: route.message_fingerprints[activeVersion],
    active_key_version: route.storage_key_versions.active,
    retained_message_fingerprints: route.retained_key_versions.map((version, index) => ({
      fingerprint: route.message_fingerprints[version],
      key_version: route.storage_key_versions.retained[index].storage_key_version
    })),
    key_registry_version: 'calapres-storage-keys-v1',
    baseline_fingerprint_key_version: 'calapres-hmac-v1',
    baseline_status_fingerprint: $json.native_baseline_status_v1_hex,
    baseline_assignee_fingerprint: $json.native_baseline_assignee_v1_hex,
    delay_policy_version: route.delay_policy_version, knowledge_version: '2026-08-11-v3',
    delay_seconds: route.delay_seconds, retention_seconds: 7776000
  };
  return { json: { pipeline_ready: true, ingress_mode: 'new_pending',
    postgres_command: command, expected_control: null,
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } };
} catch (error) {
  return { json: { pipeline_ready: false, ingress_mode: 'invalid',
    postgres_command: null, expected_control: null,
    stage_failure: __edgeFailure('build_combined_ingress', error),
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } };
}`;

const PROJECT_DURABLE_COMMAND = String.raw`
const source = $input.first().json || {};
const exact = ['pipeline_ready','ingress_mode','postgres_command','expected_control',
  'cryptographic_verification_performed_in_code',
  'customer_egress_allowed'];
const valid = Object.keys(source).length === exact.length &&
  exact.every((field) => Object.prototype.hasOwnProperty.call(source, field)) &&
  source.pipeline_ready === true && source.ingress_mode === __expectedIngressMode &&
  source.postgres_command && typeof source.postgres_command === 'object' &&
  !Array.isArray(source.postgres_command) && source.customer_egress_allowed === false &&
  source.cryptographic_verification_performed_in_code === false &&
  ((source.ingress_mode === 'new_pending' && source.expected_control === null) ||
   (source.ingress_mode === 'completed_reconcile' && source.expected_control &&
    typeof source.expected_control === 'object' && !Array.isArray(source.expected_control)));
return [{ json: valid ? source : {
  pipeline_ready: false, ingress_mode: 'invalid', postgres_command: null,
  expected_control: null, cryptographic_verification_performed_in_code: false,
  customer_egress_allowed: false
} }];`;

const PROJECT_FRESH_DURABLE_COMMAND =
  "const __expectedIngressMode = 'new_pending';\n" + PROJECT_DURABLE_COMMAND;
const PROJECT_RECONCILIATION_DURABLE_COMMAND =
  "const __expectedIngressMode = 'completed_reconcile';\n" + PROJECT_DURABLE_COMMAND;

const FINALIZE_DURABLE_TEMPLATE = String.raw`
const source = $input.first().json || {};
const result = source.result && typeof source.result === 'object' && !Array.isArray(source.result)
  ? source.result : null;
const projected = $('__PROJECT_NODE__').first().json;
const command = projected.postgres_command;
const mode = projected.ingress_mode;
const requiredMode = '__INGRESS_MODE__';
const expectedControl = projected.expected_control;
let durable = null;
let ackMode = null;
const envelopeKeys = ['contract_verified','status','operation','outcome','value','error_code'];
const valueKeys = ['account_id','inbox_id','channel','conversation_id','anchor_message_id',
  'correlation_id','event_identity_key_version','event_identity_fingerprint',
  'conversation_fingerprint','message_fingerprint','baseline_fingerprint_key_version',
  'baseline_status_fingerprint','baseline_assignee_fingerprint','delay_policy_version',
  'delay_seconds','knowledge_version','request_claim_id','business_claim_id','job_id','generation',
  'due_at','state'];
const exactResult = result && Object.keys(result).length === envelopeKeys.length &&
  envelopeKeys.every((field) => Object.prototype.hasOwnProperty.call(result, field));
const outcomeValid = mode === requiredMode && exactResult && result.contract_verified === true &&
  result.operation === 'advance_conversation_generation' && result.error_code === null &&
  ((mode === 'new_pending' &&
    ((result.status === 'committed' && result.outcome === 'ingress_bound') ||
     (result.status === 'duplicate_or_conflict' && result.outcome === 'duplicate_ingress_bound'))) ||
   (mode === 'completed_reconcile' && result.status === 'duplicate_or_conflict' &&
    result.outcome === 'duplicate_ingress_bound'));
if (outcomeValid && result.value && typeof result.value === 'object') {
  const value = result.value;
  const exactValue = Object.keys(value).length === valueKeys.length &&
    valueKeys.every((field) => Object.prototype.hasOwnProperty.call(value, field));
  const control = mode === 'completed_reconcile' ? expectedControl : command;
  const exactControl = exactValue && [
    'account_id','inbox_id','channel','conversation_id','anchor_message_id','correlation_id',
    'event_identity_key_version','event_identity_fingerprint','conversation_fingerprint',
    'message_fingerprint','baseline_fingerprint_key_version','baseline_status_fingerprint',
    'baseline_assignee_fingerprint','delay_policy_version','delay_seconds','knowledge_version'
  ].every((field) => value[field] === control[field]);
  const stateValid = mode === 'completed_reconcile' ? value.state === 'completed'
    : value.state === 'pending';
  if (exactControl && stateValid && value.request_claim_id === command.request_claim_id &&
      value.business_claim_id === command.business_claim_id && value.job_id === command.job_id &&
      Number.isSafeInteger(value.generation) && value.generation > 0 &&
      typeof value.due_at === 'string' && Number.isFinite(Date.parse(value.due_at)) &&
      (mode !== 'completed_reconcile' ||
       (value.generation === expectedControl.generation && value.due_at === expectedControl.due_at))) {
    durable = {
      brand_id: 'calapres', request_claim_id: value.request_claim_id,
      business_claim_id: value.business_claim_id, job_id: value.job_id,
      account_id: value.account_id, inbox_id: value.inbox_id, channel: value.channel,
      conversation_id: value.conversation_id, anchor_message_id: value.anchor_message_id,
      correlation_id: value.correlation_id,
      event_identity_key_version: value.event_identity_key_version,
      event_identity_fingerprint: value.event_identity_fingerprint,
      conversation_fingerprint: value.conversation_fingerprint,
      message_fingerprint: value.message_fingerprint,
      baseline_fingerprint_key_version: value.baseline_fingerprint_key_version,
      baseline_status_fingerprint: value.baseline_status_fingerprint,
      baseline_assignee_fingerprint: value.baseline_assignee_fingerprint,
      delay_policy_version: value.delay_policy_version, delay_seconds: value.delay_seconds,
      knowledge_version: value.knowledge_version, generation: value.generation,
      due_at: value.due_at, state: value.state
    };
    ackMode = mode;
  }
}
return [{ json: { durable_state: durable ? 'committed' : 'retry', durable,
  ack_mode: ackMode,
  customer_egress_allowed: false } }];`;

const FINALIZE_FRESH_DURABLE = FINALIZE_DURABLE_TEMPLATE
  .replace('__PROJECT_NODE__', 'Project Exact Fresh Atomic Ingress Command')
  .replace('__INGRESS_MODE__', 'new_pending');
const FINALIZE_RECONCILIATION_DURABLE = FINALIZE_DURABLE_TEMPLATE
  .replace('__PROJECT_NODE__', 'Project Exact Completed Event Reconciliation Command')
  .replace('__INGRESS_MODE__', 'completed_reconcile');

const PROJECT_WAIT = String.raw`
const durable = $('Validate Fresh Combined Durable Commit Before 204').first().json.durable;
try {
  if (!durable || durable.state !== 'pending') throw new Error('durable_job_not_pending');
  const wait = {
    schema_version: '1.0', brand_id: 'calapres', account_id: durable.account_id,
    inbox_id: durable.inbox_id, channel: durable.channel,
    conversation_id: durable.conversation_id, anchor_message_id: durable.anchor_message_id,
    conversation_fingerprint: durable.conversation_fingerprint,
    message_fingerprint: durable.message_fingerprint, correlation_id: durable.correlation_id,
    event_identity_key_version: durable.event_identity_key_version,
    event_identity_fingerprint: durable.event_identity_fingerprint,
    generation: durable.generation,
    baseline_fingerprint_key_version: durable.baseline_fingerprint_key_version,
    baseline_status_fingerprint: durable.baseline_status_fingerprint,
    baseline_assignee_fingerprint: durable.baseline_assignee_fingerprint,
    delay_policy_version: durable.delay_policy_version, delay_mode: 'live_observation',
    delay_seconds: durable.delay_seconds, not_before: durable.due_at,
    knowledge_version: durable.knowledge_version, fixture_ref: null,
    customer_egress_allowed: false
  };
  const ordered = {};
  for (const field of __edgeModule.exports.WAIT_CARRIER_FIELD_ORDER) ordered[field] = wait[field];
  wait.wait_state_fingerprint = __edgeDependencies.sha256Hex(
    __edgeDependencies.utf8ToBytes(JSON.stringify(ordered)));
  __edgeStages.validateWaitState(wait);
  return [{ json: { job_id: durable.job_id, business_claim_id: durable.business_claim_id,
    due_at: durable.due_at, wait_state: wait, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { stage_failure: __edgeFailure('project_identifiers_only_wait', error),
    customer_egress_allowed: false } }];
}`;

const PREPARE_WORKER_CLAIM = String.raw`
const executionId = typeof $execution === 'object' && $execution !== null
  ? String($execution.id || '') : '';
if (!/^[A-Za-z0-9_-]{1,120}$/.test(executionId)) {
  return [{ json: { worker_claim_ready: false, customer_egress_allowed: false } }];
}
const workerId = 'edge_worker_' + executionId;
const leaseToken = 'worker_lease_' + __edgeDependencies.sha256Hex(
  __edgeDependencies.utf8ToBytes('calapres:' + executionId)).slice(0, 48);
return [{ json: { worker_claim_ready: true,
  postgres_command: { brand_id: 'calapres', worker_id: workerId,
    lease_token: leaseToken, lease_duration_seconds: 300 },
  customer_egress_allowed: false } }];`;

const INTERPRET_WORKER = String.raw`
const source = $input.first().json || {};
const result = source.result && typeof source.result === 'object' && !Array.isArray(source.result)
  ? source.result : null;
const command = $('Prepare Worker Claim Without Conversation Identifier').first().json.postgres_command;
const required = ['job_id','conversation_id','generation','business_claim_id','due_at','account_id',
  'inbox_id','channel','anchor_message_id','correlation_id','event_identity_key_version',
  'event_identity_fingerprint','conversation_fingerprint','message_fingerprint',
  'baseline_fingerprint_key_version','baseline_status_fingerprint',
  'baseline_assignee_fingerprint','delay_policy_version','delay_seconds','knowledge_version',
  'worker_id','lease_token','lease_expires_at','attempt_count'];
let worker = null;
if (result && result.contract_verified === true &&
    result.operation === 'claim_due_conversation_retry' && result.status === 'committed' &&
    ['job_claimed','job_lease_owned','job_lease_recovered'].includes(result.outcome) &&
    result.error_code === null && result.value &&
    Object.keys(result.value).length === required.length &&
    required.every((field) => Object.prototype.hasOwnProperty.call(result.value, field)) &&
    result.value.worker_id === command.worker_id && result.value.lease_token === command.lease_token &&
    Number.isSafeInteger(result.value.generation) && result.value.generation > 0 &&
    Number.isSafeInteger(result.value.attempt_count) && result.value.attempt_count > 0 &&
    typeof result.value.due_at === 'string' && Number.isFinite(Date.parse(result.value.due_at)) &&
    typeof result.value.lease_expires_at === 'string' &&
    Number.isFinite(Date.parse(result.value.lease_expires_at))) {
  worker = {
    brand_id: 'calapres', job_id: result.value.job_id,
    conversation_id: result.value.conversation_id, generation: result.value.generation,
    business_claim_id: result.value.business_claim_id, due_at: result.value.due_at,
    account_id: result.value.account_id, inbox_id: result.value.inbox_id,
    channel: result.value.channel, anchor_message_id: result.value.anchor_message_id,
    correlation_id: result.value.correlation_id,
    event_identity_key_version: result.value.event_identity_key_version,
    event_identity_fingerprint: result.value.event_identity_fingerprint,
    conversation_fingerprint: result.value.conversation_fingerprint,
    message_fingerprint: result.value.message_fingerprint,
    baseline_fingerprint_key_version: result.value.baseline_fingerprint_key_version,
    baseline_status_fingerprint: result.value.baseline_status_fingerprint,
    baseline_assignee_fingerprint: result.value.baseline_assignee_fingerprint,
    delay_policy_version: result.value.delay_policy_version,
    delay_seconds: result.value.delay_seconds, knowledge_version: result.value.knowledge_version,
    worker_id: result.value.worker_id, lease_token: result.value.lease_token,
    lease_expires_at: result.value.lease_expires_at, attempt_count: result.value.attempt_count
  };
}
const noJob = result && result.contract_verified === true &&
  result.operation === 'claim_due_conversation_retry' &&
  result.status === 'duplicate_or_conflict' && result.outcome === 'no_due_job' &&
  result.value === null && result.error_code === null;
return [{ json: { worker_state: worker ? 'leased' : noJob ? 'no_due_job' : 'retry_later',
  worker, customer_egress_allowed: false } }];`;

const TRUSTED_CONTROLS = String.raw`
const worker = $('Interpret Exclusive Worker Lease').first().json.worker;
return [{ json: { worker,
  trusted_control: {
    source: 'source_only_placeholder', brand_enabled: true, kill_switch: true,
    customer_egress_enabled: false, model_call_enabled: false
  },
  customer_egress_allowed: false
} }];`;

const PREPARE_WORKER_WAIT = String.raw`
const source = $('Attach Source Trusted Kill Switch').first().json;
const worker = source.worker;
try {
  if (!worker || source.trusted_control.source !== 'source_only_placeholder' ||
      source.trusted_control.kill_switch !== true) throw new Error('trusted_control_invalid');
  const wait = {
    schema_version: '1.0', brand_id: 'calapres', account_id: worker.account_id,
    inbox_id: worker.inbox_id, channel: worker.channel,
    conversation_id: worker.conversation_id, anchor_message_id: worker.anchor_message_id,
    conversation_fingerprint: worker.conversation_fingerprint,
    message_fingerprint: worker.message_fingerprint, correlation_id: worker.correlation_id,
    event_identity_key_version: worker.event_identity_key_version,
    event_identity_fingerprint: worker.event_identity_fingerprint,
    generation: worker.generation,
    baseline_fingerprint_key_version: worker.baseline_fingerprint_key_version,
    baseline_status_fingerprint: worker.baseline_status_fingerprint,
    baseline_assignee_fingerprint: worker.baseline_assignee_fingerprint,
    delay_policy_version: worker.delay_policy_version, delay_mode: 'live_observation',
    delay_seconds: worker.delay_seconds, not_before: worker.due_at,
    knowledge_version: worker.knowledge_version, fixture_ref: null,
    customer_egress_allowed: false
  };
  const ordered = {};
  for (const field of __edgeModule.exports.WAIT_CARRIER_FIELD_ORDER) ordered[field] = wait[field];
  wait.wait_state_fingerprint = __edgeDependencies.sha256Hex(
    __edgeDependencies.utf8ToBytes(JSON.stringify(ordered)));
  __edgeStages.validateWaitState(wait);
  return [{ json: { worker_ready: true, worker, wait_state: wait,
    trusted_control: source.trusted_control, customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { worker_ready: false, worker,
    stage_failure: __edgeFailure('prepare_worker_wait', error),
    customer_egress_allowed: false } }];
}`;

const PREPARE_BOUNDED = String.raw`
const carrier = $('Prepare Worker Identifiers Only Reread State').first().json;
try {
  const plan = __edgeStages.prepareBoundedReread({ schema_version: '1.0',
    wait_state: carrier.wait_state, read_started_epoch_seconds: Math.floor(Date.now() / 1000),
    conversation_before: __edgeHttpEnvelope($('GET Chatwoot Conversation Before Worker Reread').first().json),
    messages_first: __edgeHttpEnvelope($('GET Chatwoot Messages Worker Reread A').first().json),
    messages_second: __edgeHttpEnvelope($('GET Chatwoot Messages Worker Reread B').first().json),
    conversation_after: __edgeHttpEnvelope($('GET Chatwoot Conversation After Worker Reread').first().json)
  });
  if (!Array.isArray(plan.event_hmac_requests) || plan.event_hmac_requests.length !== 1 ||
      !Array.isArray(plan.baseline_hmac_requests) || plan.baseline_hmac_requests.length !== 4) {
    throw new Error('reread_hmac_cardinality_invalid');
  }
  return [{ json: {
    reread_ready: true, worker: carrier.worker, trusted_control: carrier.trusted_control,
    reread_plan: plan, cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false
  } }];
} catch (error) {
  return [{ json: { reread_ready: false, worker: carrier.worker,
    stage_failure: __edgeFailure('prepare_bounded_reread', error),
    customer_egress_allowed: false } }];
}`;

const PREPARE_REREAD_MESSAGE = String.raw`
try {
  const reread = $json.reread_plan;
  if (!reread || !Array.isArray(reread.event_hmac_requests) ||
      reread.event_hmac_requests.length !== 1 ||
      !/^[a-f0-9]{64}$/.test($json.native_reread_anchor_event_v1_hex || '')) {
    throw new Error('reread_event_native_chain_invalid');
  }
  const request = reread.event_hmac_requests[0];
  const eventResults = [{ purpose: request.purpose, key_version: request.key_version,
    digest_hex: $json.native_reread_anchor_event_v1_hex }];
  const plan = __edgeStages.prepareRereadMessageFingerprints({
    reread_plan: reread, event_hmac_results: eventResults });
  if (!Array.isArray(plan.message_hmac_requests) || plan.message_hmac_requests.length !== 1) {
    throw new Error('reread_message_hmac_cardinality_invalid');
  }
  return { json: {
    message_ready: true, worker: $json.worker, trusted_control: $json.trusted_control,
    message_plan: plan, cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false
  } };
} catch (error) {
  return { json: { message_ready: false, worker: $json.worker,
    stage_failure: __edgeFailure('prepare_reread_message', error),
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } };
}`;

const EXPAND_REREAD_BASELINE = String.raw`
try {
  const plan = $json.message_plan;
  if (!plan || !Array.isArray(plan.message_hmac_requests) ||
      plan.message_hmac_requests.length !== 1 ||
      !/^[a-f0-9]{64}$/.test($json.native_reread_anchor_message_v1_hex || '')) {
    throw new Error('reread_message_native_chain_invalid');
  }
  const messageRequest = plan.message_hmac_requests[0];
  const messageResults = [{ purpose: messageRequest.purpose,
    key_version: messageRequest.key_version,
    digest_hex: $json.native_reread_anchor_message_v1_hex }];
  const requests = plan.reread_plan.baseline_hmac_requests;
  if (!Array.isArray(requests) || requests.length !== 4) throw new Error('baseline_plan_invalid');
  return { json: {
    baseline_ready: true, worker: $json.worker, trusted_control: $json.trusted_control,
    message_plan: plan, message_hmac_results: messageResults,
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false
  } };
} catch (error) {
  return { json: { baseline_ready: false, worker: $json.worker,
    stage_failure: __edgeFailure('expand_reread_baseline', error),
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } };
}`;

const BUILD_GENERATION_READ = String.raw`
try {
  const plan = $json.message_plan.reread_plan;
  const properties = [
    'native_reread_before_status_v1_hex', 'native_reread_before_assignee_v1_hex',
    'native_reread_after_status_v1_hex', 'native_reread_after_assignee_v1_hex'
  ];
  if (!plan || !Array.isArray(plan.baseline_hmac_requests) ||
      plan.baseline_hmac_requests.length !== 4 ||
      properties.some((property) => !/^[a-f0-9]{64}$/.test($json[property] || ''))) {
    throw new Error('baseline_native_chain_invalid');
  }
  const baselineResults = plan.baseline_hmac_requests.map((request, index) => ({
    purpose: request.purpose, key_version: request.key_version,
    digest_hex: $json[properties[index]]
  }));
  return { json: { post_delay_material_ready: true, worker: $json.worker,
    trusted_control: $json.trusted_control, message_plan: $json.message_plan,
    message_hmac_results: $json.message_hmac_results,
    baseline_hmac_results: baselineResults,
    postgres_command: { brand_id: 'calapres', conversation_id: $json.worker.conversation_id,
      expected_generation: $json.worker.generation },
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } };
} catch (error) {
  return { json: { post_delay_material_ready: false, worker: $json.worker,
    stage_failure: __edgeFailure('build_generation_read', error),
    cryptographic_verification_performed_in_code: false,
    customer_egress_allowed: false } };
}`;

const FINALIZE_POST_DELAY = String.raw`
const material = $('Build Current Generation Read Command').first().json;
const resultSource = $input.first().json || {};
const result = resultSource.result && typeof resultSource.result === 'object'
  ? resultSource.result : null;
try {
  if (!material.post_delay_material_ready || !result || result.contract_verified !== true ||
      result.operation !== 'read_generation' || result.status !== 'committed' ||
      result.outcome !== 'generation_read' || result.error_code !== null || !result.value ||
      !Number.isSafeInteger(result.value.generation) || result.value.generation < 1) {
    throw new Error('generation_read_invalid');
  }
  const leaseCurrent = result.value.current === true &&
    result.value.job_id === material.worker.job_id && result.value.state === 'retry_running';
  const postDelay = __edgeStages.finalizePostDelay({
    message_plan: material.message_plan,
    message_hmac_results: material.message_hmac_results,
    baseline_hmac_results: material.baseline_hmac_results,
    gate_state: { current_generation: result.value.generation,
      idempotency_consumed: !leaseCurrent,
      brand_enabled: material.trusted_control.brand_enabled,
      kill_switch: material.trusted_control.kill_switch },
    evaluated_epoch_seconds: Math.floor(Date.now() / 1000)
  });
  return [{ json: { post_delay_ready: true, post_delay: postDelay,
    worker: material.worker, trusted_control: material.trusted_control,
    customer_egress_allowed: false } }];
} catch (error) {
  return [{ json: { post_delay_ready: false, worker: material.worker,
    stage_failure: __edgeFailure('finalize_post_delay', error),
    customer_egress_allowed: false } }];
}`;

const LLM_GATE_CLOSED = String.raw`
const wrapper = $('Finalize Post Delay Eligibility With Current Generation').first().json;
const wait = wrapper.message_plan ? wrapper.message_plan.reread_plan.wait_state
  : $('Prepare Worker Identifiers Only Reread State').first().json.wait_state;
const anchor = wrapper.post_delay.verified_anchor;
return [{ json: {
  schema_version: '1.0',
  event: {
    schema_version: '1.0', brand_id: 'calapres', account_id: wait.account_id,
    inbox_id: wait.inbox_id, channel: wait.channel,
    channel_capabilities: { supports_text: true, supports_attachments: true,
      supports_public_reply: true },
    conversation_id: wait.conversation_id, message_id: wait.anchor_message_id,
    delivery_id: null, correlation_id: wait.correlation_id,
    idempotency_key: wait.event_identity_fingerprint,
    event_at: new Date().toISOString(), direction: 'inbound', visibility: 'public',
    actor_type: 'contact', sender_ref: { kind: 'chatwoot_contact', id: 'verified_anchor' },
    content: { kind: anchor.attachment_count > 0 ? 'mixed' : 'text',
      text_present: typeof anchor.content === 'string' && anchor.content.length > 0,
      attachment_count: anchor.attachment_count },
    flags: { is_bot_echo: false, is_private_note: false }
  },
  runtime: { mode: 'observation', customer_egress_enabled: false, kill_switch: true,
    model_call_enabled: false },
  capabilities: { customer_lookup: 'disabled', order_lookup: 'disabled' },
  context: { knowledge_version: wait.knowledge_version, knowledge_facts: [],
    live_facts_status: 'not_requested', verified_live_facts: [] },
  candidate: null
} }];`;

const ENFORCE_OBSERVATION = String.raw`
const value = $input.first().json || {};
const safe = value.schema_version === '1.0' && value.brand_id === 'calapres' &&
  value.customer_egress_allowed === false && ['no_action','escalate'].includes(value.decision);
return [{ json: { schema_version: '1.0', brand_id: 'calapres',
  decision: safe ? value.decision : 'no_action',
  reason_code: safe && /^[a-z][a-z0-9_]{2,80}$/.test(value.reason_code || '')
    ? value.reason_code : 'edge_v2_core_output_invalid',
  outcome_class: safe && value.decision === 'escalate' ? 'owner_escalation' : 'observation_only',
  model_call_executed: false, private_action_executed: false,
  persistence_allowed: false, customer_egress_allowed: false
} }];`;

const BUILD_COMPLETION = String.raw`
const observation = $('Enforce Observation Only After Core').first().json;
const worker = $('Finalize Post Delay Eligibility With Current Generation').first().json.worker;
const digest = __edgeDependencies.sha256Hex(
  __edgeDependencies.utf8ToBytes(__edgeModule.exports.stableJson(observation)));
const escalation = observation.outcome_class === 'owner_escalation';
const incidentId = escalation ? 'inc_' + digest.slice(0, 40) : null;
const command = {
  brand_id: 'calapres', claim_id: worker.business_claim_id, job_id: worker.job_id,
  conversation_id: worker.conversation_id, expected_generation: worker.generation,
  worker_id: worker.worker_id, lease_token: worker.lease_token,
  observation_id: 'obs_' + digest.slice(0, 40), observation_digest: digest,
  audit_id: 'aud_' + digest.slice(0, 40), outcome_class: observation.outcome_class,
  reason_code: observation.reason_code, risk_level: escalation ? 'medium' : 'none',
  risk_digest: escalation ? digest : null, incident_id: incidentId
};
return [{ json: { postgres_command: command, worker,
  customer_egress_allowed: false } }];`;

const INTERPRET_COMPLETION = String.raw`
const source = $input.first().json || {};
const result = source.result && typeof source.result === 'object' ? source.result : null;
const done = result && result.contract_verified === true &&
  result.operation === 'complete_business_event' && result.error_code === null &&
  ((result.status === 'committed' && result.outcome === 'completed') ||
   (result.status === 'duplicate_or_conflict' && result.outcome === 'duplicate_completed'));
return [{ json: { completion_state: done ? 'done' : 'retry',
  worker: $('Build Sanitized Observation Completion Command').first().json.worker,
  customer_egress_allowed: false } }];`;

const PREPARE_TRANSITION = String.raw`
const source = $('Finalize Post Delay Eligibility With Current Generation').first().json;
const worker = source.worker;
const reason = source.post_delay && typeof source.post_delay.cancellation_reason === 'string'
  ? source.post_delay.cancellation_reason : 'fail_closed';
const human = ['conversation_changed','status_changed','assignee_changed','newer_inbound',
  'human_intervention','private_note_present','newer_non_activity'].includes(reason);
const digest = __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes(
  worker.job_id + ':' + worker.generation + ':' + reason));
return [{ json: { postgres_command: { brand_id: 'calapres', job_id: worker.job_id,
  conversation_id: worker.conversation_id, expected_generation: worker.generation,
  from_state: 'retry_running', to_state: human ? 'human_owned' : 'cancelled',
  transition_idempotency_key: 'transition_' + digest.slice(0, 48) },
  customer_egress_allowed: false } }];`;

const PREPARE_RETRY = String.raw`
const lease = $('Interpret Exclusive Worker Lease').first().json.worker;
if (!lease) return [{ json: { retry_ready: false, customer_egress_allowed: false } }];
const digest = __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes(
  lease.job_id + ':' + lease.generation + ':' + lease.worker_id + ':' + lease.attempt_count));
return [{ json: { retry_ready: true, postgres_command: {
  brand_id: 'calapres', job_id: lease.job_id, conversation_id: lease.conversation_id,
  expected_generation: lease.generation,
  retry_idempotency_key: 'retry_' + digest.slice(0, 48), max_attempts: 3,
  safe_error_code: 'edge_observation_retry', delay_seconds: 30, retention_seconds: 7776000,
  expected_worker_id: lease.worker_id, expected_lease_token: lease.lease_token
}, customer_egress_allowed: false } }];`;

module.exports = {
  runtimeSource,
  supportSource,
  runtimeHash,
  parityHash,
  declarations,
  declare,
  code,
  condition,
  postgres,
  hmac,
  chatwootGet,
  respond,
  expression,
  credential,
  raw,
  serialize,
  bodies: {
    INGRESS_PREFLIGHT,
    FINALIZE_SIGNED_HMAC,
    PREPARE_REQUEST,
    INTERPRET_REQUEST,
    PREPARE_EVENT,
    FINALIZE_EVENT,
    FINALIZE_ROUTE,
    INTERPRET_BUSINESS,
    BUILD_COMPLETED_RECONCILIATION,
    PREPARE_BASELINE,
    BUILD_COMBINED,
    PROJECT_FRESH_DURABLE_COMMAND,
    PROJECT_RECONCILIATION_DURABLE_COMMAND,
    FINALIZE_FRESH_DURABLE,
    FINALIZE_RECONCILIATION_DURABLE,
    PROJECT_WAIT,
    PREPARE_WORKER_CLAIM,
    INTERPRET_WORKER,
    TRUSTED_CONTROLS,
    PREPARE_WORKER_WAIT,
    PREPARE_BOUNDED,
    PREPARE_REREAD_MESSAGE,
    EXPAND_REREAD_BASELINE,
    BUILD_GENERATION_READ,
    FINALIZE_POST_DELAY,
    LLM_GATE_CLOSED,
    ENFORCE_OBSERVATION,
    BUILD_COMPLETION,
    INTERPRET_COMPLETION,
    PREPARE_TRANSITION,
    PREPARE_RETRY,
  },
};

const manualPreviewBody = String.raw`
return [{ json: {
  schema_version: '1.0', kind: 'calapres_edge_v2_manual_synthetic_preview_v1',
  source_only: true, recovery_schedule_enabled: false, kill_switch: true,
  model_call_enabled: false, customer_egress_allowed: false,
  note: 'No HTTP, database, Core, model, note, Shopify, or customer-send action executed.'
} }];`;

declare('manualObservationTest', 'trigger', {
  type: 'n8n-nodes-base.manualTrigger', version: 1,
  config: { name: 'Manual Synthetic Observation Preview Only', parameters: {}, position: [100, 900] },
});
code('manualSyntheticPreview', 'Manual Synthetic Terminal - No Effects', manualPreviewBody, [360, 900]);

declare('signedChatwootWebhook', 'trigger', {
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: {
    name: 'POST Calapres Chatwoot Signed Raw Webhook',
    parameters: {
      httpMethod: 'POST', path: 'calapres/customer-service/chatwoot/v2',
      authentication: 'none', responseMode: 'responseNode',
      options: { rawBody: true, ignoreBots: false, allowedOrigins: '' },
    },
    position: [100, 80],
  },
});
code(
  'signedIngressPreflight',
  'Signed Ingress Preflight - Raw Bytes 1MiB Gate',
  INGRESS_PREFLIGHT,
  [360, 80],
  true,
  true,
);
condition('preflightEligible', 'Preflight Eligible?', '$json.ingress_disposition === "hmac_required"', [620, 80]);
condition('preflightUnauthorized', 'Preflight Trusted Unauthorized?', '$json.ingress_disposition === "unauthorized"', [620, 260]);
condition('preflightBadRequest', 'Preflight Trusted Bad Request?', '$json.ingress_disposition === "bad_request"', [880, 340]);
condition('preflightTooLarge', 'Preflight Trusted Payload Too Large?', '$json.ingress_disposition === "too_large"', [1140, 420]);
hmac(
  'webhookHmac',
  'Crypto HMAC - Calapres Webhook v1 Placeholder',
  '',
  'computed_hmac_hex',
  'webhookHmacCredential',
  [880, 0],
  true,
);
code(
  'finalizeSignedHmac',
  'Finalize Signed HMAC Constant Time Gate',
  FINALIZE_SIGNED_HMAC,
  [1140, 0],
  true,
  false,
  'runOnceForEachItem',
);
condition('signedHmacVerified', 'Signed HMAC Verified?', '$json.hmac_disposition === "verified"', [1400, 0]);
condition('signedHmacUnauthorized', 'Signed HMAC Trusted Unauthorized?', '$json.hmac_disposition === "unauthorized"', [1660, 100]);
code(
  'prepareRequestReplayClaim',
  'Prepare Request Replay Processing Lease',
  PREPARE_REQUEST,
  [1660, -80],
  true,
);
postgres('postgresClaimRequestReplay', 1, 'claim_request_replay', [1920, -80]);
code(
  'interpretRequestReplay',
  'Interpret Request Replay Lease Result',
  INTERPRET_REQUEST,
  [2180, -80],
);
condition('requestReplayProceed', 'Request Replay Processing Lease Owned?', '$json.request_state === "proceed"', [2440, -80]);
condition('requestReplayCompleted', 'Completed Replay Linked to Durable Job?', '$json.request_state === "ack_completed"', [2700, 80]);

code('prepareEventIdentity', 'Parse Verified Raw Body and Prepare Event Identity HMAC', PREPARE_EVENT, [2700, -200], true);
condition('eventIdentityReady', 'Event Identity HMAC Ready?', '$json.pipeline_ready === true', [2960, -200]);
hmac(
  'eventIdentityHmac',
  'Crypto HMAC - Calapres Event Identity v1 Placeholder',
  '{{ $json.event_plan.hmac_requests[0].material_utf8 }}',
  'native_event_identity_v1_hex',
  'eventIdentityHmacCredential',
  [3220, -280],
);
code(
  'finalizeEventIdentity',
  'Finalize Event Identity and Prepare Fixed Route HMAC',
  FINALIZE_EVENT,
  [3480, -280],
  true,
  false,
  'runOnceForEachItem',
);
condition('routeHmacReady', 'Route Fingerprint HMAC Ready?', '$json.pipeline_ready === true', [3740, -280]);
hmac(
  'routeMessageHmac',
  'Crypto HMAC - Calapres Route Message v1 Placeholder',
  '{{ $json.event_identity.route_hmac_requests[0].material_utf8 }}',
  'native_message_anchor_v1_hex',
  'eventIdentityHmacCredential',
  [4000, -360],
);
hmac(
  'routeConversationHmac',
  'Crypto HMAC - Calapres Route Conversation v1 Placeholder',
  '{{ $json.event_identity.route_hmac_requests[1].material_utf8 }}',
  'native_conversation_v1_hex',
  'eventIdentityHmacCredential',
  [4130, -360],
);
code(
  'finalizeRouteAndBusiness',
  'Finalize Route and Prepare Business Event Lease',
  FINALIZE_ROUTE,
  [4260, -360],
  true,
  false,
  'runOnceForEachItem',
);
condition('businessClaimReady', 'Business Event Lease Command Ready?', '$json.pipeline_ready === true', [4520, -360]);
postgres('postgresClaimBusinessEvent', 2, 'claim_business_event', [4780, -440]);
code(
  'interpretBusinessEvent',
  'Interpret Business Event Lease Result',
  INTERPRET_BUSINESS,
  [5040, -440],
);
condition('businessProceed', 'Business Event Lease Owned?', '$json.business_state === "proceed"', [5300, -440]);
condition(
  'businessCompletedReconcile',
  'Completed Business Event Requires Atomic Request Reconciliation?',
  '$json.business_state === "completed_reconcile"',
  [5300, -200],
);
code(
  'buildCompletedReconciliation',
  'Build Completed Event Atomic Request Reconciliation',
  BUILD_COMPLETED_RECONCILIATION,
  [5560, -200],
  true,
);
condition(
  'completedReconciliationReady',
  'Completed Event Reconciliation Command Ready?',
  '$json.pipeline_ready === true && $json.ingress_mode === "completed_reconcile"',
  [5820, -200],
);

chatwootGet(
  'getBaselineConversation',
  'GET Baseline Chatwoot Conversation Before Durable Commit',
  'https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $("Interpret Business Event Lease Result").item.json.route_identity.conversation_id }}',
  [5560, -520],
);
code(
  'prepareIngressBaseline',
  'Prepare Strict Baseline Status and Assignee HMAC',
  PREPARE_BASELINE,
  [5820, -520],
  true,
);
condition('ingressBaselineReady', 'Ingress Baseline HMAC Ready?', '$json.pipeline_ready === true', [6080, -520]);
hmac(
  'ingressBaselineStatusHmac',
  'Crypto HMAC - Calapres Ingress Baseline Status v1 Placeholder',
  '{{ $json.baseline_plan.hmac_requests[0].material_utf8 }}',
  'native_baseline_status_v1_hex',
  'baselineHmacCredential',
  [6340, -600],
);
hmac(
  'ingressBaselineAssigneeHmac',
  'Crypto HMAC - Calapres Ingress Baseline Assignee v1 Placeholder',
  '{{ $json.baseline_plan.hmac_requests[1].material_utf8 }}',
  'native_baseline_assignee_v1_hex',
  'baselineHmacCredential',
  [6470, -600],
);
code(
  'buildCombinedIngress',
  'Build Combined Durable Ingress Command',
  BUILD_COMBINED,
  [6600, -600],
  true,
  false,
  'runOnceForEachItem',
);
condition('combinedIngressReady', 'Combined Durable Command Ready?', '$json.pipeline_ready === true', [6860, -600]);
code(
  'projectFreshDurableCommand',
  'Project Exact Fresh Atomic Ingress Command',
  PROJECT_FRESH_DURABLE_COMMAND,
  [7120, -520],
);
postgres('postgresAdvanceGeneration', 4, 'advance_conversation_generation', [7380, -680]);
code(
  'finalizeFreshDurableCommit',
  'Validate Fresh Combined Durable Commit Before 204',
  FINALIZE_FRESH_DURABLE,
  [7640, -680],
);
condition('freshDurableCommitReady', 'Fresh Durable Job Committed and Pending?', '$json.durable_state === "committed" && $json.ack_mode === "new_pending" && $json.durable.state === "pending"', [7900, -680]);

code(
  'projectReconciliationDurableCommand',
  'Project Exact Completed Event Reconciliation Command',
  PROJECT_RECONCILIATION_DURABLE_COMMAND,
  [6080, -200],
);
postgres(
  'postgresReconcileCompletedEvent',
  4,
  'advance_conversation_generation',
  [6340, -200],
  'Postgres Edge Atomic 04R - advance_conversation_generation completed event reconciliation',
);
code(
  'finalizeReconciliationDurableCommit',
  'Validate Completed Event Atomic Reconciliation Before 204',
  FINALIZE_RECONCILIATION_DURABLE,
  [6600, -200],
);
condition('durableReconciled', 'Completed Event Request Atomically Reconciled?', '$json.durable_state === "committed" && $json.ack_mode === "completed_reconcile" && $json.durable.state === "completed"', [6860, -200]);

respond('respondUnauthorized', 'Respond 401 Unauthorized Fail Closed', 401, [1660, 260]);
respond('respondBadRequest', 'Respond 400 Invalid Webhook Request', 400, [1140, 340]);
respond('respondPayloadTooLarge', 'Respond 413 Payload Too Large', 413, [1400, 420]);
respond('respondServiceUnavailable', 'Respond 503 Fail Closed - Delivery Retry Not Guaranteed', 503, [5040, 260]);
respond('respondReplayCompleted', 'Respond 204 Completed Replay Linked Job', 204, [2960, 80]);
respond('respondReconciled', 'Respond 204 Only After Completed Event Atomic Reconciliation', 204, [8420, -440]);
respond('respondAccepted', 'Respond 204 Only After Combined Durable Commit', 204, [8420, -760], true);

code('projectIdentifiersOnlyWait', 'Project DB Due At Into Identifiers Only Wait', PROJECT_WAIT, [8680, -760], true);
condition('waitProjectionReady', 'Identifiers Only DB Due Wait Ready?', '$json.wait_state && !$json.stage_failure', [8940, -760]);
declare('identifiersOnlyWait', 'node', {
  type: 'n8n-nodes-base.wait', version: 1.1,
  config: {
    name: 'Wait Until PostgreSQL Due At - Identifiers Only',
    parameters: { resume: 'specificTime', dateTime: expression('{{ $json.due_at }}') },
    position: [9200, -840],
  },
});

declare('recoverySchedule', 'trigger', {
  type: 'n8n-nodes-base.scheduleTrigger', version: 1.3,
  config: {
    name: 'Recovery Schedule 30 Minutes - Source Disabled Pending Cost SLA Approval',
    parameters: {
      rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] },
      skipDurableScheduler: false,
    },
    disabled: true,
    position: [8160, 700],
  },
});

code('reconPrepareControl', 'Prepare Reconciliation Control and Allowlisted Inbox Selection', RECON_PREPARE_CONTROL, [8420, 700], true);
code('reconBuildScanClaim', 'Build Chatwoot Reconciliation Scan Lease Command', RECON_BUILD_SCAN_CLAIM, [8680, 700], true);
postgres('reconClaimScan', 11, 'claim_chatwoot_reconciliation_scan', [8940, 700], 'Postgres Reconciliation 11 - claim_chatwoot_reconciliation_scan', 'claim_chatwoot_reconciliation_scan', 'reconciliationPostgresCredential');
code('reconInterpretScan', 'Interpret Reconciliation Scan Lease', RECON_INTERPRET_SCAN, [9200, 700], true);
condition('reconScanOwned', 'Reconciliation Scan Lease Owned?', '$json.reconciliation_ready === true && $json.scan_lease !== null', [9460, 700]);
code('reconPrepareDiscovery', 'Prepare Bounded Chatwoot Conversation Discovery', RECON_PREPARE_DISCOVERY, [9720, 700], true);
chatwootGet('reconDiscoveryA', 'GET Chatwoot Reconciliation Discovery A', 'https://app.chatwoot.com/api/v1/accounts/179973/conversations?status=all&assignee_type=all&inbox_id={{ $json.inbox_id }}&page=1', [9980, 700]);
code('reconNormalizeDiscoveryA', 'Normalize Reconciliation Discovery Snapshot A', RECON_NORMALIZE_DISCOVERY, [10240, 700], true);
chatwootGet('reconDiscoveryB', 'GET Chatwoot Reconciliation Discovery B', 'https://app.chatwoot.com/api/v1/accounts/179973/conversations?status=all&assignee_type=all&inbox_id={{ $json.inbox_id }}&page=1', [10500, 700]);
code('reconNormalizeDiscoveryB', 'Normalize Reconciliation Discovery Snapshot B and Prove Convergence', RECON_NORMALIZE_DISCOVERY_SECOND, [10760, 700], true);
condition('reconConverged', 'Bounded Reconciliation Discovery Converged?', '$json.reconciliation_ready === true && $json.discovery_coverage.bounded_convergence_passed === true', [11020, 700]);
code('reconBuildCursorRead', 'Build Reconciliation Cursor Read Command', RECON_BUILD_CURSOR_READ, [11280, 700], true);
postgres('reconReadCursor', 13, 'read_chatwoot_reconciliation_cursor', [11540, 700], 'Postgres Reconciliation 13 - read_chatwoot_reconciliation_cursor', 'read_chatwoot_reconciliation_cursor', 'reconciliationPostgresCredential');
code('reconBuildMessagesRequest', 'Build Bounded Messages After Cursor Request', RECON_BUILD_MESSAGES_REQUEST, [11800, 700], true);
chatwootGet('reconMessages', 'GET Chatwoot Reconciliation Messages After Cursor', 'https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $json.conversation_id }}/messages?after={{ $json.expected_after_message_id }}', [12060, 700]);
code('reconFinalizeMessages', 'Validate Reconciliation Messages Page and Candidate Proof', RECON_FINALIZE_MESSAGES, [12320, 700], true);
condition('reconMessagesReady', 'Reconciliation Page 1-99 Proof Ready?', '$json.reconciliation_ready === true && $json.messages_finalization.status === "ready"', [12580, 700]);
code('reconPrepareCandidate', 'Prepare Reconciliation Candidate Identity HMAC Chain', RECON_PREPARE_CANDIDATE, [12840, 700], true);
hmac('reconCandidateHmac01', 'Crypto Reconciliation 01 candidate_identity event_identity v1 Placeholder', '{{ $json.hmac_requests[0].material_utf8 }}', 'reconciliation_hmac_candidate_identity_01_event_identity_v1', 'eventIdentityHmacCredential', [13100, 700]);
hmac('reconCandidateHmac02', 'Crypto Reconciliation 02 candidate_identity request_attempt_identity v1 Placeholder', '{{ $json.hmac_requests[1].material_utf8 }}', 'reconciliation_hmac_candidate_identity_02_request_attempt_identity_v1', 'eventIdentityHmacCredential', [13230, 700]);
hmac('reconCandidateHmac03', 'Crypto Reconciliation 03 candidate_identity event_identity v2 Placeholder', '{{ $json.hmac_requests[2].material_utf8 }}', 'reconciliation_hmac_candidate_identity_03_event_identity_v2', 'eventIdentityHmacCredential', [13360, 700]);
hmac('reconCandidateHmac04', 'Crypto Reconciliation 04 candidate_identity request_attempt_identity v2 Placeholder', '{{ $json.hmac_requests[3].material_utf8 }}', 'reconciliation_hmac_candidate_identity_04_request_attempt_identity_v2', 'eventIdentityHmacCredential', [13490, 700]);
code('reconBuildCursorAdvance', 'Build Reconciliation Cursor Compare and Advance Command', RECON_BUILD_CURSOR_ADVANCE, [13750, 700], true);
postgres('reconAdvanceCursor', 12, 'compare_and_advance_chatwoot_message_cursor', [14010, 700], 'Postgres Reconciliation 12 - compare_and_advance_chatwoot_message_cursor', 'compare_and_advance_chatwoot_message_cursor', 'reconciliationPostgresCredential');
code('reconTerminal', 'Reconciliation Observation Terminal - No Send', "return [{ json: { reconciliation_terminal: true, customer_egress_allowed: false } }];", [14270, 700]);
code(
  'prepareWorkerClaim',
  'Prepare Worker Claim Without Conversation Identifier',
  PREPARE_WORKER_CLAIM,
  [8940, -600],
  true,
);
postgres('postgresClaimDue', 7, 'claim_due_conversation_retry', [9200, -600]);
code('interpretWorkerLease', 'Interpret Exclusive Worker Lease', INTERPRET_WORKER, [9460, -600]);
condition('workerLeaseOwned', 'Exclusive Worker Lease Owned?', '$json.worker_state === "leased"', [9720, -600]);
code('attachTrustedControls', 'Attach Source Trusted Kill Switch', TRUSTED_CONTROLS, [9980, -680]);
code(
  'prepareWorkerWait',
  'Prepare Worker Identifiers Only Reread State',
  PREPARE_WORKER_WAIT,
  [10240, -680],
  true,
);
condition('workerWaitReady', 'Worker Reread State Fully Bound?', '$json.worker_ready === true', [10500, -680]);

chatwootGet(
  'getConversationBefore',
  'GET Chatwoot Conversation Before Worker Reread',
  'https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $("Prepare Worker Identifiers Only Reread State").item.json.wait_state.conversation_id }}',
  [10760, -760],
);
chatwootGet(
  'getMessagesFirst',
  'GET Chatwoot Messages Worker Reread A',
  'https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $("Prepare Worker Identifiers Only Reread State").item.json.wait_state.conversation_id }}/messages?after={{ Number($("Prepare Worker Identifiers Only Reread State").item.json.wait_state.anchor_message_id) - 1 }}',
  [11020, -760],
);
chatwootGet(
  'getMessagesSecond',
  'GET Chatwoot Messages Worker Reread B',
  'https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $("Prepare Worker Identifiers Only Reread State").item.json.wait_state.conversation_id }}/messages?after={{ Number($("Prepare Worker Identifiers Only Reread State").item.json.wait_state.anchor_message_id) - 1 }}',
  [11280, -760],
);
chatwootGet(
  'getConversationAfter',
  'GET Chatwoot Conversation After Worker Reread',
  'https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $("Prepare Worker Identifiers Only Reread State").item.json.wait_state.conversation_id }}',
  [11540, -760],
);
code('prepareBoundedReread', 'Prepare Strict Bounded Double Reread', PREPARE_BOUNDED, [11800, -760], true);
condition('rereadEventReady', 'Bounded Reread Event HMAC Ready?', '$json.reread_ready === true', [12060, -760]);
hmac(
  'rereadEventHmac',
  'Crypto HMAC - Reread Anchor Event Identity Placeholder',
  '{{ $json.reread_plan.event_hmac_requests[0].material_utf8 }}',
  'native_reread_anchor_event_v1_hex',
  'eventIdentityHmacCredential',
  [12320, -840],
);
code(
  'prepareRereadMessage',
  'Finalize Anchor Event and Prepare Anchor Message HMAC',
  PREPARE_REREAD_MESSAGE,
  [12580, -840],
  true,
  false,
  'runOnceForEachItem',
);
condition('rereadMessageReady', 'Reread Message HMAC Ready?', '$json.message_ready === true', [12840, -840]);
hmac(
  'rereadMessageHmac',
  'Crypto HMAC - Reread Anchor Message Fingerprint Placeholder',
  '{{ $json.message_plan.message_hmac_requests[0].material_utf8 }}',
  'native_reread_anchor_message_v1_hex',
  'eventIdentityHmacCredential',
  [13100, -920],
);
code(
  'expandRereadBaseline',
  'Finalize Anchor Message and Prepare Fixed Baseline HMAC',
  EXPAND_REREAD_BASELINE,
  [13360, -920],
  true,
  false,
  'runOnceForEachItem',
);
condition('rereadBaselineReady', 'Reread Baseline HMAC Ready?', '$json.baseline_ready === true', [13620, -920]);
hmac(
  'rereadBeforeStatusHmac',
  'Crypto HMAC - Reread Before Status Placeholder',
  '{{ $json.message_plan.reread_plan.baseline_hmac_requests[0].material_utf8 }}',
  'native_reread_before_status_v1_hex',
  'baselineHmacCredential',
  [13880, -1000],
);
hmac(
  'rereadBeforeAssigneeHmac',
  'Crypto HMAC - Reread Before Assignee Placeholder',
  '{{ $json.message_plan.reread_plan.baseline_hmac_requests[1].material_utf8 }}',
  'native_reread_before_assignee_v1_hex',
  'baselineHmacCredential',
  [14010, -1000],
);
hmac(
  'rereadAfterStatusHmac',
  'Crypto HMAC - Reread After Status Placeholder',
  '{{ $json.message_plan.reread_plan.baseline_hmac_requests[2].material_utf8 }}',
  'native_reread_after_status_v1_hex',
  'baselineHmacCredential',
  [14140, -1000],
);
hmac(
  'rereadAfterAssigneeHmac',
  'Crypto HMAC - Reread After Assignee Placeholder',
  '{{ $json.message_plan.reread_plan.baseline_hmac_requests[3].material_utf8 }}',
  'native_reread_after_assignee_v1_hex',
  'baselineHmacCredential',
  [14270, -1000],
);
code(
  'buildGenerationRead',
  'Build Current Generation Read Command',
  BUILD_GENERATION_READ,
  [14140, -1000],
  true,
  false,
  'runOnceForEachItem',
);
condition('generationReadReady', 'Post Delay Material and Generation Read Ready?', '$json.post_delay_material_ready === true', [14400, -1000]);
postgres('postgresReadGeneration', 5, 'read_generation', [14660, -1080]);
code(
  'finalizePostDelay',
  'Finalize Post Delay Eligibility With Current Generation',
  FINALIZE_POST_DELAY,
  [14920, -1080],
  true,
);
condition('postDelayFinalized', 'Post Delay Gate Finalized?', '$json.post_delay_ready === true', [15180, -1080]);
condition('postDelayEligible', 'Post Delay Eligible for Core?', '$json.post_delay.eligible_for_observation === true', [15440, -1160]);

code('llmTrustGateClosed', 'LLM Trust Gate Closed - No Call', LLM_GATE_CLOSED, [15700, -1240]);
declare('callImmutableCore', 'node', {
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'Call Immutable Optix Core v1 - Observation No LLM',
    parameters: {
      mode: 'once', source: 'database',
      workflowId: {
        __rl: true, mode: 'id', value: 'uCBXuRjlv8NyeikO',
        cachedResultName: 'Optix | Customer Service Core v1',
      },
      options: { waitForSubWorkflow: true },
    },
    position: [15960, -1240],
  },
});
code('enforceObservationOnly', 'Enforce Observation Only After Core', ENFORCE_OBSERVATION, [16220, -1240]);
code(
  'buildCompletion',
  'Build Sanitized Observation Completion Command',
  BUILD_COMPLETION,
  [16480, -1240],
  true,
);
postgres('postgresCompleteBusinessEvent', 3, 'complete_business_event', [16740, -1240]);
code('interpretCompletion', 'Interpret Atomic Observation Completion', INTERPRET_COMPLETION, [17000, -1240]);
condition('completionDone', 'Observation Completion Durable?', '$json.completion_state === "done"', [17260, -1240]);

code('prepareTransition', 'Prepare Safe Cancellation or Human Owned Transition', PREPARE_TRANSITION, [15700, -960], true);
postgres('postgresTransitionJob', 8, 'transition_conversation_job', [15960, -960]);

code('prepareRetry', 'Prepare Worker Lease CAS Retry', PREPARE_RETRY, [15440, -520], true);
condition('retryReady', 'Worker Retry Command Ready?', '$json.retry_ready === true', [15700, -520]);
postgres('postgresScheduleRetry', 6, 'schedule_conversation_retry', [15960, -520]);

code(
  'terminalSafe',
  'Terminal Safe No Egress',
  "return [{ json: { terminal: true, customer_egress_allowed: false } }];",
  [17520, -400],
);

const preamble = `import { expr, ifElse, newCredential, node, trigger, workflow } from '@n8n/workflow-sdk';\n\n` +
  `/*\n * Calapres Customer Service Edge v2 - immutable source-only candidate.\n` +
  ` * Same logical Edge target; never imported, credential-bound, published, or activated here.\n` +
  ` * The 30-minute recovery schedule is source-disabled pending cost/SLA approval.\n` +
  ` * There is no customer send, private note, Shopify write, Data Table, or model call.\n */\n\n` +
  `const STAGED_RUNTIME_SOURCE = ${JSON.stringify(runtimeSource)};\n` +
  `const STAGED_RUNTIME_SOURCE_SHA256 = ${JSON.stringify(runtimeHash)};\n` +
  `const STAGED_RUNTIME_PARITY_SHA256 = ${JSON.stringify(parityHash)};\n` +
  `const STAGED_SUPPORT_SOURCE = ${JSON.stringify(supportSource)};\n` +
  `const STAGED_BOOTSTRAP = ${JSON.stringify(
    `const __edgeModule = { exports: {} };\n${runtimeForCode}\n${supportSource}\n` +
    `const __reconciliationModule = { exports: {} };\n(function(){\n${reconciliationRuntimeForCode}\n})();\n` +
    `const __reconciliationBridgeModule = { exports: {} };\n(function(){\n${reconciliationBridgeForCode}\n})();\n` +
    `const __reconciliationRuntime = __reconciliationModule.exports.createChatwootReconciliationRuntime({\n` +
    `  sha256Hex: (value) => __edgeDependencies.sha256Hex(value),\n` +
    `  active_event_identity_key_version: 'calapres-identity-hmac-v1',\n` +
    `  retained_event_identity_key_versions: ['calapres-identity-hmac-v2'],\n` +
    `  activation_floor_at: '2026-08-12T00:00:00.000Z',\n` +
    `  activation_policy_version: '2026-08-12-v1',\n` +
    `});\n` +
    `const __reconciliationBridge = __reconciliationBridgeModule.exports.createChatwootReconciliationIngressBridge({\n` +
    `  sha256Hex: (value) => __edgeDependencies.sha256Hex(value),\n` +
    `  validate_messages_page: (value) => __reconciliationRuntime.validateMessagesPage(value),\n` +
    `  active_event_identity_key_version: 'calapres-identity-hmac-v1',\n` +
    `  retained_event_identity_key_versions: ['calapres-identity-hmac-v2'],\n` +
    `  event_to_storage_key_versions: { 'calapres-identity-hmac-v1': 'hmac-sha256-v1', 'calapres-identity-hmac-v2': 'hmac-sha256-v2' },\n` +
    `  key_registry_version: 'calapres-storage-keys-v1', request_ttl_seconds: 300, event_retention_seconds: 604800, lease_duration_seconds: 300,\n` +
    `  baseline_fingerprint_key_version: 'calapres-hmac-v1', knowledge_version: '2026-08-11-v3', retention_seconds: 7776000,\n` +
    `  activation_floor_at: '2026-08-12T00:00:00.000Z',\n` +
    `  activation_policy_version: '2026-08-12-v1',\n` +
    `});`,
  )};\n\n` +
  `const webhookHmacCredential = newCredential('Calapres Chatwoot Webhook HMAC v1');\n` +
  `const eventIdentityHmacCredential = newCredential('Calapres Event Identity HMAC v1');\n` +
  `const baselineHmacCredential = newCredential('Calapres Baseline HMAC v1');\n` +
  `const webhookWorkerPostgresCredential = newCredential('Calapres Customer Service PostgreSQL Webhook and Worker Runtime');\n` +
  `const reconciliationPostgresCredential = newCredential('Calapres Customer Service PostgreSQL Reconciliation Runtime');\n` +
  `const chatwootReadCredential = newCredential('Calapres Chatwoot Read Only');\n\n`;

const graph = String.raw`
export default workflow('calapres-customer-service-edge-v2', 'Calapres | Customer Service Edge v2')
  .add(manualObservationTest)
  .to(manualSyntheticPreview)
  .add(signedChatwootWebhook)
  .to(signedIngressPreflight)
  .to(
    preflightEligible
      .onTrue(
        webhookHmac
          .to(finalizeSignedHmac)
          .to(
            signedHmacVerified
              .onTrue(
                prepareRequestReplayClaim
                  .to(postgresClaimRequestReplay)
                  .to(interpretRequestReplay)
                  .to(
                    requestReplayProceed
                      .onTrue(
                        prepareEventIdentity
                          .to(
                            eventIdentityReady
                              .onTrue(
                                eventIdentityHmac
                                  .to(finalizeEventIdentity)
                                  .to(
                                    routeHmacReady
                                      .onTrue(
                                        routeMessageHmac
                                          .to(routeConversationHmac)
                                          .to(finalizeRouteAndBusiness)
                                          .to(
                                            businessClaimReady
                                              .onTrue(
                                                postgresClaimBusinessEvent
                                                  .to(interpretBusinessEvent)
                                                  .to(
                                                    businessProceed
                                                      .onTrue(
                                                        getBaselineConversation
                                                          .to(prepareIngressBaseline)
                                                          .to(
                                                            ingressBaselineReady
                                                              .onTrue(
                                                                ingressBaselineStatusHmac
                                                                  .to(ingressBaselineAssigneeHmac)
                                                                  .to(buildCombinedIngress)
                                                                  .to(
                                                                    combinedIngressReady
                                                                      .onTrue(
                                                                        projectFreshDurableCommand
                                                                          .to(postgresAdvanceGeneration)
                                                                          .to(finalizeFreshDurableCommit)
                                                                          .to(
                                                                            freshDurableCommitReady
                                                                              .onTrue(
                                                                                respondAccepted
                                                                                  .to(projectIdentifiersOnlyWait)
                                                                                  .to(
                                                                                    waitProjectionReady
                                                                                      .onTrue(
                                                                                        identifiersOnlyWait
                                                                                          .to(prepareWorkerClaim)
                                                                                          .to(postgresClaimDue)
                                                                                          .to(interpretWorkerLease)
                                                                                          .to(
                                                                                            workerLeaseOwned
                                                                                              .onTrue(
                                                                                                attachTrustedControls
                                                                                                  .to(prepareWorkerWait)
                                                                                                  .to(
                                                                                                    workerWaitReady
                                                                                                      .onTrue(
                                                                                                        getConversationBefore
                                                                                                          .to(getMessagesFirst)
                                                                                                          .to(getMessagesSecond)
                                                                                                          .to(getConversationAfter)
                                                                                                          .to(prepareBoundedReread)
                                                                                                          .to(
                                                                                                            rereadEventReady
                                                                                                              .onTrue(
                                                                                                                rereadEventHmac
                                                                                                                  .to(prepareRereadMessage)
                                                                                                                  .to(
                                                                                                                    rereadMessageReady
                                                                                                                      .onTrue(
                                                                                                                        rereadMessageHmac
                                                                                                                          .to(expandRereadBaseline)
                                                                                                                          .to(
                                                                                                                            rereadBaselineReady
                                                                                                                              .onTrue(
                                                                                                                                rereadBeforeStatusHmac
                                                                                                                                  .to(rereadBeforeAssigneeHmac)
                                                                                                                                  .to(rereadAfterStatusHmac)
                                                                                                                                  .to(rereadAfterAssigneeHmac)
                                                                                                                                  .to(buildGenerationRead)
                                                                                                                                  .to(
                                                                                                                                    generationReadReady
                                                                                                                                      .onTrue(
                                                                                                                                        postgresReadGeneration
                                                                                                                                          .to(finalizePostDelay)
                                                                                                                                          .to(
                                                                                                                                            postDelayFinalized
                                                                                                                                              .onTrue(
                                                                                                                                                postDelayEligible
                                                                                                                                                  .onTrue(
                                                                                                                                                    llmTrustGateClosed
                                                                                                                                                      .to(callImmutableCore)
                                                                                                                                                      .to(enforceObservationOnly)
                                                                                                                                                      .to(buildCompletion)
                                                                                                                                                      .to(postgresCompleteBusinessEvent)
                                                                                                                                                      .to(interpretCompletion)
                                                                                                                                                      .to(
                                                                                                                                                        completionDone
                                                                                                                                                          .onTrue(terminalSafe)
                                                                                                                                                          .onFalse(
                                                                                                                                                            prepareRetry
                                                                                                                                                              .to(
                                                                                                                                                                retryReady
                                                                                                                                                                  .onTrue(postgresScheduleRetry.to(terminalSafe))
                                                                                                                                                                  .onFalse(terminalSafe),
                                                                                                                                                              ),
                                                                                                                                                          ),
                                                                                                                                                      ),
                                                                                                                                                  )
                                                                                                                                                  .onFalse(
                                                                                                                                                    prepareTransition
                                                                                                                                                      .to(postgresTransitionJob)
                                                                                                                                                      .to(terminalSafe),
                                                                                                                                                  ),
                                                                                                                                              )
                                                                                                                                              .onFalse(prepareRetry.to(retryReady)),
                                                                                                                                          ),
                                                                                                                                      )
                                                                                                                                      .onFalse(prepareRetry.to(retryReady)),
                                                                                                                                  ),
                                                                                                                              )
                                                                                                                              .onFalse(prepareRetry.to(retryReady)),
                                                                                                                          ),
                                                                                                                      )
                                                                                                                      .onFalse(prepareRetry.to(retryReady)),
                                                                                                                  ),
                                                                                                              )
                                                                                                              .onFalse(prepareRetry.to(retryReady)),
                                                                                                          ),
                                                                                                      )
                                                                                                      .onFalse(prepareRetry.to(retryReady)),
                                                                                                  ),
                                                                                              )
                                                                                              .onFalse(terminalSafe),
                                                                                          ),
                                                                                      )
                                                                                      .onFalse(terminalSafe),
                                                                                  ),
                                                                              )
                                                                              .onFalse(respondServiceUnavailable),
                                                                          ),
                                                                      )
                                                                      .onFalse(respondServiceUnavailable),
                                                                  ),
                                                              )
                                                              .onFalse(respondServiceUnavailable),
                                                          ),
                                                      )
                                                      .onFalse(
                                                        businessCompletedReconcile
                                                          .onTrue(
                                                            buildCompletedReconciliation
                                                              .to(
                                                                completedReconciliationReady
                                                                  .onTrue(
                                                                    projectReconciliationDurableCommand
                                                                      .to(postgresReconcileCompletedEvent)
                                                                      .to(finalizeReconciliationDurableCommit)
                                                                      .to(
                                                                        durableReconciled
                                                                          .onTrue(respondReconciled)
                                                                          .onFalse(respondServiceUnavailable),
                                                                      ),
                                                                  )
                                                                  .onFalse(respondServiceUnavailable),
                                                              ),
                                                          )
                                                          .onFalse(respondServiceUnavailable),
                                                      ),
                                                  ),
                                              )
                                              .onFalse(respondServiceUnavailable),
                                          ),
                                      )
                                      .onFalse(respondServiceUnavailable),
                                  ),
                              )
                              .onFalse(respondServiceUnavailable),
                          ),
                      )
                      .onFalse(
                        requestReplayCompleted
                          .onTrue(respondReplayCompleted)
                          .onFalse(respondServiceUnavailable),
                      ),
                  ),
              )
              .onFalse(
                signedHmacUnauthorized
                  .onTrue(respondUnauthorized)
                  .onFalse(respondServiceUnavailable),
              ),
          ),
      )
      .onFalse(
        preflightUnauthorized
          .onTrue(respondUnauthorized)
          .onFalse(
            preflightBadRequest
              .onTrue(respondBadRequest)
              .onFalse(
                preflightTooLarge
                  .onTrue(respondPayloadTooLarge)
                  .onFalse(respondServiceUnavailable),
              ),
          ),
      ),
  )
  .add(recoverySchedule)
  .to(reconPrepareControl)
  .to(reconBuildScanClaim)
  .to(reconClaimScan)
  .to(reconInterpretScan)
  .to(
    reconScanOwned
      .onTrue(
        reconPrepareDiscovery
          .to(reconDiscoveryA)
          .to(reconNormalizeDiscoveryA)
          .to(reconDiscoveryB)
          .to(reconNormalizeDiscoveryB)
          .to(
            reconConverged
              .onTrue(
                reconBuildCursorRead
                  .to(reconReadCursor)
                  .to(reconBuildMessagesRequest)
                  .to(reconMessages)
                  .to(reconFinalizeMessages)
                  .to(
                    reconMessagesReady
                      .onTrue(
                        reconPrepareCandidate
                          .to(reconCandidateHmac01)
                          .to(reconCandidateHmac02)
                          .to(reconCandidateHmac03)
                          .to(reconCandidateHmac04)
                          .to(reconBuildCursorAdvance)
                          .to(reconAdvanceCursor)
                          .to(reconTerminal)
                          .to(prepareWorkerClaim)
                          .to(postgresClaimDue)
                          .to(interpretWorkerLease),
                      )
                      .onFalse(reconTerminal),
                  ),
              )
              .onFalse(reconTerminal.to ? reconTerminal : terminalSafe),
          ),
      )
      .onFalse(reconTerminal.to ? reconTerminal : terminalSafe),
  );
`;

const generatedSource = `${preamble}${declarations.join('\n\n')}\n${graph}`;
if (process.argv.includes('--write')) {
  fs.writeFileSync(OUTPUT_PATH, generatedSource, 'utf8');
} else {
  process.stdout.write(generatedSource);
}
