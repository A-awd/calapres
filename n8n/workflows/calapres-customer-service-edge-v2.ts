import { expr, ifElse, newCredential, node, trigger, workflow } from '@n8n/workflow-sdk';

/*
 * Calapres Customer Service Edge v2 - immutable source-only candidate.
 * Same logical Edge target; never imported, credential-bound, published, or activated here.
 * The 30-minute recovery schedule is source-disabled pending cost/SLA approval.
 * There is no customer send, private note, Shopify write, Data Table, or model call.
 */

const STAGED_RUNTIME_SOURCE = "'use strict';\n\n/*\n * Pure, credential-free stages for the Calapres Chatwoot Edge.\n *\n * Native n8n nodes own all effects:\n * - Webhook supplies exact raw bytes;\n * - Crypto supplies secret-keyed HMAC results;\n * - PostgreSQL supplies atomic result envelopes;\n * - HTTP Request supplies Chatwoot response envelopes.\n *\n * This module validates and binds those envelopes. It performs no network,\n * credential, database, filesystem, wait, workflow, model, or send action.\n */\n\nconst ACCOUNT_ID = 179973;\nconst BRAND_ID = 'calapres';\nconst INBOX_CHANNELS = Object.freeze({\n  128031: 'instagram',\n  128033: 'tiktok',\n  128058: 'whatsapp',\n  128326: 'email',\n});\nconst MAX_RAW_BODY_SIZE_BYTES = 1024 * 1024;\nconst MAX_AGE_SECONDS = 300;\nconst MAX_FUTURE_SKEW_SECONDS = 60;\nconst SCAN_PAGE_SIZE_LIMIT = 100;\nconst EVENT_IDENTITY_CANONICAL_FORMAT =\n  'json-minified-ordered:[schema_version,account_id,inbox_id,event,conversation_id,message_id]';\nconst DELAY_POLICY_VERSION = '2026-08-11-v1';\nconst DELAY_RANGES = Object.freeze({\n  instagram: Object.freeze({ minimum: 30, maximum: 75 }),\n  tiktok: Object.freeze({ minimum: 30, maximum: 75 }),\n  whatsapp: Object.freeze({ minimum: 30, maximum: 75 }),\n  email: Object.freeze({ minimum: 120, maximum: 300 }),\n});\nconst EVENT_KEY_VERSION = /^calapres-identity-hmac-v[1-9][0-9]*$/;\nconst BASELINE_KEY_VERSION = /^calapres-hmac-v[1-9][0-9]*$/;\nconst EVENT_TO_STORAGE_KEY_VERSION = Object.freeze({\n  'calapres-identity-hmac-v1': 'hmac-sha256-v1',\n});\nconst STORAGE_TO_EVENT_KEY_VERSION = Object.freeze({\n  'hmac-sha256-v1': 'calapres-identity-hmac-v1',\n});\nconst HEX_64 = /^[a-f0-9]{64}$/;\nconst SIGNATURE_HEADER = /^sha256=[a-f0-9]{64}$/;\nconst TIMESTAMP_HEADER = /^[0-9]{10}$/;\nconst POSITIVE_DECIMAL_TOKEN = /^[1-9][0-9]{0,15}$/;\nconst KNOWLEDGE_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;\nconst SAFE_ERROR_CODE = /^[a-z][a-z0-9_]{2,80}$/;\nconst STRICT_ISO_TIMESTAMP =\n  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;\nconst CONTENT_TYPE = /^application\\/json(?:\\s*;\\s*charset=(?:utf-8|utf8))?$/i;\nconst BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;\nconst ANCHOR_MESSAGE_FINGERPRINT_DOMAIN = 'calapres-message-anchor-v1:';\nconst CONVERSATION_FINGERPRINT_DOMAIN = 'calapres-conversation-v1:';\nconst MESSAGE_SET_FINGERPRINT_DOMAIN = 'calapres-chatwoot-message-set-v1:';\nconst STATUS_FINGERPRINT_DOMAIN = 'calapres-conversation-status-v1:';\nconst ASSIGNEE_FINGERPRINT_DOMAIN = 'calapres-conversation-assignee-v1:';\nconst PLAN_BINDING_DOMAIN = 'calapres-observation-stage-binding-v1:';\n\nconst WAIT_CARRIER_FIELD_ORDER = Object.freeze([\n  'schema_version',\n  'brand_id',\n  'account_id',\n  'inbox_id',\n  'channel',\n  'conversation_id',\n  'anchor_message_id',\n  'conversation_fingerprint',\n  'message_fingerprint',\n  'correlation_id',\n  'event_identity_key_version',\n  'event_identity_fingerprint',\n  'generation',\n  'baseline_fingerprint_key_version',\n  'baseline_status_fingerprint',\n  'baseline_assignee_fingerprint',\n  'delay_policy_version',\n  'delay_mode',\n  'delay_seconds',\n  'not_before',\n  'knowledge_version',\n  'fixture_ref',\n  'customer_egress_allowed',\n]);\nconst WAIT_CARRIER_EXACT_KEYS = new Set([...WAIT_CARRIER_FIELD_ORDER, 'wait_state_fingerprint']);\n\nconst PARITY_MANIFEST = Object.freeze({\n  account_id: ACCOUNT_ID,\n  inbox_channels: INBOX_CHANNELS,\n  max_raw_body_size_bytes: MAX_RAW_BODY_SIZE_BYTES,\n  max_age_seconds: MAX_AGE_SECONDS,\n  max_future_skew_seconds: MAX_FUTURE_SKEW_SECONDS,\n  scan_page_size_limit: SCAN_PAGE_SIZE_LIMIT,\n  event_identity_canonical_format: EVENT_IDENTITY_CANONICAL_FORMAT,\n  event_to_storage_key_version: EVENT_TO_STORAGE_KEY_VERSION,\n  wait_carrier_field_order: WAIT_CARRIER_FIELD_ORDER,\n});\n// SHA-256 of stableJson(PARITY_MANIFEST). Tests recompute this and compare the\n// selected exported constants with chatwoot-observation-runtime.js.\nconst PARITY_MANIFEST_SHA256 = 'dbb11ff31880ef59bb740bbc51aa61ed1d74ade8594c66bbdc47766eebdc2418';\n\nclass FailClosedError extends Error {\n  constructor(reasonCode) {\n    super(reasonCode);\n    this.name = 'FailClosedError';\n    this.reasonCode = reasonCode;\n  }\n}\n\nfunction fail(reasonCode) {\n  throw new FailClosedError(reasonCode);\n}\n\nfunction plainObject(value) {\n  return value !== null && typeof value === 'object' && !Array.isArray(value);\n}\n\nfunction exactObject(value, fields, reasonCode) {\n  if (!plainObject(value)) fail(reasonCode);\n  const expected = fields instanceof Set ? fields : new Set(fields);\n  const keys = Object.keys(value);\n  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) fail(reasonCode);\n  return value;\n}\n\nfunction hasOwn(value, field) {\n  return plainObject(value) && Object.prototype.hasOwnProperty.call(value, field);\n}\n\nfunction stableJson(value) {\n  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';\n  if (plainObject(value)) {\n    return '{' + Object.keys(value).sort().map((key) =>\n      JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';\n  }\n  return JSON.stringify(value);\n}\n\nfunction orderedJson(value, fieldOrder) {\n  const ordered = {};\n  for (const field of fieldOrder) ordered[field] = value[field];\n  return JSON.stringify(ordered);\n}\n\nfunction dependencies(value) {\n  if (!plainObject(value) ||\n      typeof value.base64ToBytes !== 'function' ||\n      typeof value.bytesToBase64 !== 'function' ||\n      typeof value.utf8ToBytes !== 'function' ||\n      typeof value.bytesToUtf8Fatal !== 'function' ||\n      typeof value.sha256Hex !== 'function' ||\n      typeof value.timingSafeEqualHex !== 'function') {\n    fail('stage_dependencies_unavailable');\n  }\n  return value;\n}\n\nfunction bytes(value) {\n  if (!(value instanceof Uint8Array)) fail('stage_bytes_invalid');\n  return value;\n}\n\nfunction sha256Hex(deps, value) {\n  const digest = deps.sha256Hex(bytes(value));\n  if (!HEX_64.test(digest || '')) fail('stage_sha256_output_invalid');\n  return digest;\n}\n\nfunction sha256Text(deps, value) {\n  if (typeof value !== 'string') fail('stage_sha256_text_invalid');\n  return sha256Hex(deps, deps.utf8ToBytes(value));\n}\n\nfunction binding(deps, value) {\n  return sha256Text(deps, PLAN_BINDING_DOMAIN + stableJson(value));\n}\n\nfunction decodeCanonicalBase64(deps, value, reasonCode) {\n  if (typeof value !== 'string' || value.length % 4 !== 0 || !BASE64.test(value)) fail(reasonCode);\n  let decoded;\n  try {\n    decoded = bytes(deps.base64ToBytes(value));\n  } catch (_error) {\n    fail(reasonCode);\n  }\n  if (deps.bytesToBase64(decoded) !== value) fail(reasonCode);\n  return decoded;\n}\n\nfunction concatBytes(left, right) {\n  const output = new Uint8Array(left.length + right.length);\n  output.set(left, 0);\n  output.set(right, left.length);\n  return output;\n}\n\nfunction isoFromEpochSeconds(value) {\n  if (!Number.isSafeInteger(value) || value < 0) fail('clock_invalid');\n  const result = new Date(value * 1000);\n  if (Number.isNaN(result.getTime())) fail('clock_invalid');\n  return result.toISOString();\n}\n\nfunction parseIso(value, reasonCode) {\n  if (typeof value !== 'string' || !STRICT_ISO_TIMESTAMP.test(value)) fail(reasonCode);\n  const parsed = Date.parse(value);\n  if (!Number.isFinite(parsed)) fail(reasonCode);\n  return parsed;\n}\n\nfunction positiveToken(value, reasonCode) {\n  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);\n  if (typeof value !== 'string' || !POSITIVE_DECIMAL_TOKEN.test(value) ||\n      !Number.isSafeInteger(Number(value)) || String(Number(value)) !== value) fail(reasonCode);\n  return value;\n}\n\nfunction eventKeyVersionToStorage(value) {\n  if (!Object.prototype.hasOwnProperty.call(EVENT_TO_STORAGE_KEY_VERSION, value)) {\n    fail('storage_key_version_unknown');\n  }\n  return EVENT_TO_STORAGE_KEY_VERSION[value];\n}\n\nfunction storageKeyVersionToEvent(value) {\n  if (!Object.prototype.hasOwnProperty.call(STORAGE_TO_EVENT_KEY_VERSION, value)) {\n    fail('event_key_version_unknown');\n  }\n  return STORAGE_TO_EVENT_KEY_VERSION[value];\n}\n\nfunction integerId(value, reasonCode) {\n  if (!Number.isSafeInteger(value)) fail(reasonCode);\n  return value;\n}\n\nfunction normalizedEventTime(value) {\n  if (Number.isSafeInteger(value) && value >= 0) return isoFromEpochSeconds(value);\n  if (typeof value !== 'string') fail('event_time_invalid');\n  const documented = value.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) UTC$/);\n  const normalized = documented ? documented[1] + 'T' + documented[2] + 'Z' : value;\n  const parsed = parseIso(normalized, 'event_time_invalid');\n  return new Date(parsed).toISOString();\n}\n\nfunction deterministicDelay(seed, minimum, maximum) {\n  let hash = 2166136261;\n  for (const character of seed) {\n    hash ^= character.charCodeAt(0);\n    hash = Math.imul(hash, 16777619) >>> 0;\n  }\n  return minimum + (hash % (maximum - minimum + 1));\n}\n\nfunction response(status, responseCode, reasonCode, transient = null) {\n  return Object.freeze({\n    schema_version: '1.0',\n    kind: 'chatwoot_signed_ingress_preflight_v1',\n    status,\n    response_code: responseCode,\n    reason_code: reasonCode,\n    transient,\n    customer_egress_allowed: false,\n  });\n}\n\nfunction validatePreflight(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'transient',\n    'customer_egress_allowed',\n  ], 'preflight_envelope_invalid');\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_signed_ingress_preflight_v1' ||\n      value.customer_egress_allowed !== false) fail('preflight_envelope_invalid');\n  if (value.status !== 'eligible') fail('preflight_not_eligible');\n  if (value.response_code !== 0 || value.reason_code !== null) fail('preflight_envelope_invalid');\n  exactObject(value.transient, [\n    'timestamp', 'signature_header', 'supplied_digest_hex', 'raw_body_base64',\n    'raw_body_size_bytes', 'body_sha256', 'signed_payload_base64', 'received_epoch_seconds',\n    'received_at', 'delivery_id_fingerprint', 'preflight_binding_sha256',\n  ], 'preflight_transient_invalid');\n  const copy = { ...value.transient };\n  delete copy.preflight_binding_sha256;\n  if (binding(deps, copy) !== value.transient.preflight_binding_sha256) fail('preflight_binding_mismatch');\n  return value.transient;\n}\n\nfunction prepareSignedIngress(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, [\n    'schema_version', 'content_type', 'timestamp_header', 'signature_header',\n    'delivery_header', 'raw_body_base64', 'received_epoch_seconds',\n  ], 'webhook_projection_invalid');\n  if (input.schema_version !== '1.0') fail('webhook_projection_invalid');\n  if (typeof input.content_type !== 'string' || !CONTENT_TYPE.test(input.content_type)) {\n    return response('rejected', 400, 'content_type_invalid');\n  }\n  let raw;\n  try {\n    raw = decodeCanonicalBase64(deps, input.raw_body_base64, 'raw_body_base64_invalid');\n  } catch (error) {\n    if (error instanceof FailClosedError) return response('rejected', 400, error.reasonCode);\n    throw error;\n  }\n  if (raw.length === 0) return response('rejected', 400, 'payload_empty');\n  if (raw.length > MAX_RAW_BODY_SIZE_BYTES) return response('rejected', 413, 'payload_too_large');\n  if (!Number.isSafeInteger(input.received_epoch_seconds) || input.received_epoch_seconds < 0) {\n    return response('rejected', 400, 'clock_invalid');\n  }\n  if (typeof input.timestamp_header !== 'string' || !TIMESTAMP_HEADER.test(input.timestamp_header)) {\n    return response('rejected', 401, 'timestamp_malformed');\n  }\n  const timestamp = Number(input.timestamp_header);\n  const age = input.received_epoch_seconds - timestamp;\n  if (age > MAX_AGE_SECONDS) return response('rejected', 401, 'timestamp_stale');\n  if (age < -MAX_FUTURE_SKEW_SECONDS) return response('rejected', 401, 'timestamp_future');\n  if (typeof input.signature_header !== 'string' || !SIGNATURE_HEADER.test(input.signature_header)) {\n    return response('rejected', 401, 'signature_malformed');\n  }\n  if (input.delivery_header !== null &&\n      (typeof input.delivery_header !== 'string' || input.delivery_header.length < 1 ||\n       input.delivery_header.length > 512)) {\n    return response('rejected', 400, 'delivery_header_invalid');\n  }\n  const bodySha256 = sha256Hex(deps, raw);\n  const signedBytes = concatBytes(deps.utf8ToBytes(input.timestamp_header + '.'), raw);\n  const projected = {\n    timestamp: input.timestamp_header,\n    signature_header: input.signature_header,\n    supplied_digest_hex: input.signature_header.slice('sha256='.length),\n    raw_body_base64: input.raw_body_base64,\n    raw_body_size_bytes: raw.length,\n    body_sha256: bodySha256,\n    signed_payload_base64: deps.bytesToBase64(signedBytes),\n    received_epoch_seconds: input.received_epoch_seconds,\n    received_at: isoFromEpochSeconds(input.received_epoch_seconds),\n    delivery_id_fingerprint: input.delivery_header === null\n      ? null\n      : sha256Text(deps, input.delivery_header),\n  };\n  projected.preflight_binding_sha256 = binding(deps, projected);\n  return response('eligible', 0, null, Object.freeze(projected));\n}\n\nfunction finalizeSignedHmac(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['preflight', 'computed_hmac_hex', 'compared_epoch_seconds'], 'hmac_result_input_invalid');\n  const preflight = validatePreflight(input.preflight, deps);\n  if (!HEX_64.test(input.computed_hmac_hex || '') ||\n      !Number.isSafeInteger(input.compared_epoch_seconds) || input.compared_epoch_seconds < 0) {\n    fail('hmac_result_input_invalid');\n  }\n  if (input.compared_epoch_seconds - preflight.received_epoch_seconds > MAX_AGE_SECONDS ||\n      input.compared_epoch_seconds < preflight.received_epoch_seconds) {\n    return Object.freeze({\n      schema_version: '1.0', kind: 'chatwoot_signed_hmac_gate_v1', status: 'fail_closed',\n      response_code: 401, reason_code: 'hmac_comparison_stale', raw_binding: null,\n      replay_identity: null, customer_egress_allowed: false,\n    });\n  }\n  if (deps.timingSafeEqualHex(input.computed_hmac_hex, preflight.supplied_digest_hex) !== true) {\n    return Object.freeze({\n      schema_version: '1.0', kind: 'chatwoot_signed_hmac_gate_v1', status: 'fail_closed',\n      response_code: 401, reason_code: 'signature_mismatch', raw_binding: null,\n      replay_identity: null, customer_egress_allowed: false,\n    });\n  }\n  const replayFingerprint = sha256Text(\n    deps,\n    preflight.signature_header + ':' + preflight.timestamp + ':' + preflight.body_sha256,\n  );\n  const rawBinding = {\n    timestamp: preflight.timestamp,\n    raw_body_base64: preflight.raw_body_base64,\n    raw_body_size_bytes: preflight.raw_body_size_bytes,\n    body_sha256: preflight.body_sha256,\n    preflight_binding_sha256: preflight.preflight_binding_sha256,\n  };\n  rawBinding.raw_binding_sha256 = binding(deps, rawBinding);\n  return Object.freeze({\n    schema_version: '1.0',\n    kind: 'chatwoot_signed_hmac_gate_v1',\n    status: 'verified',\n    response_code: 0,\n    reason_code: null,\n    raw_binding: Object.freeze(rawBinding),\n    replay_identity: Object.freeze({\n      replay_key_fingerprint: replayFingerprint,\n      received_at: preflight.received_at,\n      expires_at: isoFromEpochSeconds(preflight.received_epoch_seconds + MAX_AGE_SECONDS + MAX_FUTURE_SKEW_SECONDS),\n    }),\n    customer_egress_allowed: false,\n  });\n}\n\nfunction canonicalEventTuple(payload) {\n  if (!plainObject(payload)) fail('payload_not_object');\n  for (const field of ['account', 'inbox', 'conversation']) {\n    if (hasOwn(payload, field) && !plainObject(payload[field])) fail(field + '_container_invalid');\n  }\n  if (hasOwn(payload, 'account') && hasOwn(payload, 'account_id')) fail('account_id_alias_conflict');\n  if (hasOwn(payload, 'inbox') && hasOwn(payload, 'inbox_id')) fail('inbox_id_alias_conflict');\n  if (hasOwn(payload, 'conversation') && hasOwn(payload, 'conversation_id')) fail('conversation_id_alias_conflict');\n  if (hasOwn(payload, 'id') && hasOwn(payload, 'message_id')) fail('message_id_alias_conflict');\n  const accountId = integerId(hasOwn(payload, 'account') ? payload.account.id : payload.account_id,\n    'account_id_invalid');\n  const inboxId = integerId(hasOwn(payload, 'inbox') ? payload.inbox.id : payload.inbox_id,\n    'inbox_id_invalid');\n  if (accountId !== ACCOUNT_ID) fail('account_not_allowlisted');\n  if (!INBOX_CHANNELS[inboxId]) fail('inbox_not_allowlisted');\n  if (hasOwn(payload, 'conversation') && hasOwn(payload.conversation, 'account_id') &&\n      payload.conversation.account_id !== accountId) fail('account_mismatch');\n  if (hasOwn(payload, 'conversation') && hasOwn(payload.conversation, 'inbox_id') &&\n      payload.conversation.inbox_id !== inboxId) fail('inbox_mismatch');\n  if (payload.event !== 'message_created') fail('event_not_supported');\n  return Object.freeze({\n    schema_version: '1.0',\n    account_id: accountId,\n    inbox_id: inboxId,\n    event: 'message_created',\n    conversation_id: positiveToken(\n      hasOwn(payload, 'conversation') ? payload.conversation.id : payload.conversation_id,\n      'conversation_id_invalid',\n    ),\n    message_id: positiveToken(hasOwn(payload, 'id') ? payload.id : payload.message_id,\n      'message_id_invalid'),\n  });\n}\n\nfunction validateReplayGate(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'raw_binding',\n    'replay_key_fingerprint', 'customer_egress_allowed',\n  ], 'replay_gate_invalid');\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_request_replay_gate_v1' ||\n      value.status !== 'proceed_parse' || value.response_code !== 0 || value.reason_code !== null ||\n      value.customer_egress_allowed !== false || !HEX_64.test(value.replay_key_fingerprint || '')) {\n    fail('verified_replay_required');\n  }\n  const raw = value.raw_binding;\n  exactObject(raw, [\n    'timestamp', 'raw_body_base64', 'raw_body_size_bytes', 'body_sha256',\n    'preflight_binding_sha256', 'raw_binding_sha256',\n  ], 'raw_binding_invalid');\n  const copy = { ...raw };\n  delete copy.raw_binding_sha256;\n  if (binding(deps, copy) !== raw.raw_binding_sha256) fail('raw_binding_mismatch');\n  return raw;\n}\n\nfunction prepareEventIdentity(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['replay_gate', 'active_key_version', 'retained_key_versions'],\n    'event_identity_input_invalid');\n  const rawBinding = validateReplayGate(input.replay_gate, deps);\n  if (!EVENT_KEY_VERSION.test(input.active_key_version || '') ||\n      !Array.isArray(input.retained_key_versions) || input.retained_key_versions.length > 8 ||\n      input.retained_key_versions.some((value) => !EVENT_KEY_VERSION.test(value || '')) ||\n      new Set([input.active_key_version, ...input.retained_key_versions]).size !==\n        input.retained_key_versions.length + 1) fail('event_keyring_invalid');\n  for (const keyVersion of [input.active_key_version, ...input.retained_key_versions]) {\n    eventKeyVersionToStorage(keyVersion);\n  }\n  const raw = decodeCanonicalBase64(deps, rawBinding.raw_body_base64, 'raw_body_base64_invalid');\n  if (raw.length !== rawBinding.raw_body_size_bytes ||\n      sha256Hex(deps, raw) !== rawBinding.body_sha256) fail('verified_raw_body_mismatch');\n  let payload;\n  try {\n    payload = JSON.parse(deps.bytesToUtf8Fatal(raw));\n  } catch (_error) {\n    fail('verified_payload_json_invalid');\n  }\n  const tuple = canonicalEventTuple(payload);\n  const sender = plainObject(payload.sender) ? payload.sender : null;\n  const senderId = sender && (typeof sender.id === 'string' || Number.isSafeInteger(sender.id))\n    ? String(sender.id) : null;\n  const senderType = sender && typeof sender.type === 'string' ? sender.type.toLowerCase() : null;\n  if (!(payload.message_type === 'incoming' || payload.message_type === 0)) fail('message_not_inbound');\n  if (payload.private === true) fail('private_note_rejected');\n  if (senderType === 'bot' || senderType === 'agent_bot') fail('bot_echo_rejected');\n  if (!senderId || senderId.length > 200) fail('sender_ref_missing');\n  const eventAt = normalizedEventTime(payload.created_at);\n  if (hasOwn(payload, 'attachments') && !Array.isArray(payload.attachments)) fail('attachments_invalid');\n  const attachmentCount = Array.isArray(payload.attachments) ? payload.attachments.length : 0;\n  if (attachmentCount > 32) fail('attachments_excessive');\n  const textPresent = typeof payload.content === 'string' && payload.content.trim().length > 0;\n  const contentKind = textPresent && attachmentCount > 0 ? 'mixed'\n    : attachmentCount > 0 ? 'media' : textPresent ? 'text' : 'unsupported';\n  const route = {\n    brand_id: BRAND_ID,\n    account_id: tuple.account_id,\n    inbox_id: tuple.inbox_id,\n    channel: INBOX_CHANNELS[tuple.inbox_id],\n    conversation_id: tuple.conversation_id,\n    message_id: tuple.message_id,\n    event_at: eventAt,\n    content_kind: contentKind,\n    text_present: textPresent,\n    attachment_count: attachmentCount,\n  };\n  const keyVersions = [input.active_key_version, ...input.retained_key_versions];\n  const hmacRequests = keyVersions.map((keyVersion) => Object.freeze({\n    purpose: 'event_identity',\n    key_version: keyVersion,\n    algorithm: 'hmac-sha256',\n    encoding: 'hex',\n    material_utf8: JSON.stringify(tuple),\n  }));\n  const planCore = {\n    schema_version: '1.0',\n    kind: 'chatwoot_event_identity_plan_v1',\n    route,\n    canonical_tuple: tuple,\n    active_key_version: input.active_key_version,\n    retained_key_versions: [...input.retained_key_versions],\n    hmac_requests: hmacRequests,\n    replay_key_fingerprint: input.replay_gate.replay_key_fingerprint,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...planCore, plan_binding_sha256: binding(deps, planCore) });\n}\n\nfunction validateEventPlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'route', 'canonical_tuple', 'active_key_version',\n    'retained_key_versions', 'hmac_requests', 'replay_key_fingerprint',\n    'customer_egress_allowed', 'plan_binding_sha256',\n  ], 'event_identity_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_event_identity_plan_v1' ||\n      value.customer_egress_allowed !== false || !HEX_64.test(value.replay_key_fingerprint || '') ||\n      binding(deps, core) !== value.plan_binding_sha256) fail('event_identity_plan_invalid');\n  if (!EVENT_KEY_VERSION.test(value.active_key_version || '') ||\n      !Array.isArray(value.retained_key_versions) || !Array.isArray(value.hmac_requests)) {\n    fail('event_identity_plan_invalid');\n  }\n  return value;\n}\n\nfunction hmacResults(value, expectedRequests, reasonCode) {\n  if (!Array.isArray(value) || value.length !== expectedRequests.length) fail(reasonCode);\n  const expected = new Map(expectedRequests.map((request) =>\n    [request.purpose + ':' + request.key_version, request]));\n  const actual = new Map();\n  for (const result of value) {\n    exactObject(result, ['purpose', 'key_version', 'digest_hex'], reasonCode);\n    const key = result.purpose + ':' + result.key_version;\n    if (!expected.has(key) || actual.has(key) || !HEX_64.test(result.digest_hex || '')) fail(reasonCode);\n    actual.set(key, result.digest_hex);\n  }\n  if (actual.size !== expected.size) fail(reasonCode);\n  return actual;\n}\n\nfunction finalizeEventIdentity(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['event_plan', 'hmac_results'], 'event_identity_result_input_invalid');\n  const plan = validateEventPlan(input.event_plan, deps);\n  const results = hmacResults(input.hmac_results, plan.hmac_requests, 'event_identity_hmac_results_invalid');\n  const fingerprints = {};\n  for (const request of plan.hmac_requests) {\n    fingerprints[request.key_version] = results.get(request.purpose + ':' + request.key_version);\n  }\n  const routeRequests = [];\n  for (const keyVersion of [plan.active_key_version, ...plan.retained_key_versions]) {\n    const eventFingerprint = fingerprints[keyVersion];\n    const messageCanonical = {\n      schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.route.account_id,\n      inbox_id: plan.route.inbox_id, conversation_id: plan.route.conversation_id,\n      message_id: plan.route.message_id, direction: 'inbound', visibility: 'public',\n      event_identity_key_version: keyVersion, event_identity_fingerprint: eventFingerprint,\n    };\n    const conversationCanonical = {\n      schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.route.account_id,\n      inbox_id: plan.route.inbox_id, conversation_id: plan.route.conversation_id,\n      event_identity_key_version: keyVersion,\n    };\n    routeRequests.push(Object.freeze({\n      purpose: 'message_anchor', key_version: keyVersion, algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(messageCanonical),\n    }));\n    routeRequests.push(Object.freeze({\n      purpose: 'conversation', key_version: keyVersion, algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: CONVERSATION_FINGERPRINT_DOMAIN + JSON.stringify(conversationCanonical),\n    }));\n  }\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_event_identity_final_v1',\n    route: plan.route, canonical_tuple: plan.canonical_tuple,\n    active_key_version: plan.active_key_version,\n    retained_key_versions: plan.retained_key_versions,\n    event_identity_fingerprints: fingerprints,\n    route_hmac_requests: routeRequests,\n    replay_key_fingerprint: plan.replay_key_fingerprint,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, identity_binding_sha256: binding(deps, core) });\n}\n\nfunction validateEventIdentity(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'route', 'canonical_tuple', 'active_key_version',\n    'retained_key_versions', 'event_identity_fingerprints', 'route_hmac_requests',\n    'replay_key_fingerprint', 'customer_egress_allowed', 'identity_binding_sha256',\n  ], 'event_identity_final_invalid');\n  const core = { ...value };\n  delete core.identity_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_event_identity_final_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.identity_binding_sha256 ||\n      !Array.isArray(value.route_hmac_requests)) fail('event_identity_final_invalid');\n  return value;\n}\n\nfunction finalizeRouteFingerprints(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['event_identity', 'hmac_results'], 'route_fingerprint_input_invalid');\n  const identity = validateEventIdentity(input.event_identity, deps);\n  const results = hmacResults(input.hmac_results, identity.route_hmac_requests,\n    'route_fingerprint_hmac_results_invalid');\n  const messageFingerprints = {};\n  const conversationFingerprints = {};\n  for (const version of [identity.active_key_version, ...identity.retained_key_versions]) {\n    messageFingerprints[version] = results.get('message_anchor:' + version);\n    conversationFingerprints[version] = results.get('conversation:' + version);\n  }\n  const delayRange = DELAY_RANGES[identity.route.channel];\n  const seed = [BRAND_ID, identity.route.account_id, identity.route.inbox_id,\n    identity.route.conversation_id, identity.route.message_id].join(':');\n  const delaySeconds = deterministicDelay(seed, delayRange.minimum, delayRange.maximum);\n  const notBefore = new Date(parseIso(identity.route.event_at, 'event_time_invalid') + delaySeconds * 1000)\n    .toISOString();\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_route_identity_v1',\n    brand_id: BRAND_ID, account_id: identity.route.account_id, inbox_id: identity.route.inbox_id,\n    channel: identity.route.channel, conversation_id: identity.route.conversation_id,\n    message_id: identity.route.message_id, event_at: identity.route.event_at,\n    content_kind: identity.route.content_kind, text_present: identity.route.text_present,\n    attachment_count: identity.route.attachment_count,\n    correlation_id: 'calapres:' + identity.route.conversation_id + ':' + identity.route.message_id,\n    active_key_version: identity.active_key_version,\n    retained_key_versions: identity.retained_key_versions,\n    storage_key_versions: Object.freeze({\n      active: eventKeyVersionToStorage(identity.active_key_version),\n      retained: Object.freeze(identity.retained_key_versions.map((version) => Object.freeze({\n        event_key_version: version,\n        storage_key_version: eventKeyVersionToStorage(version),\n      }))),\n    }),\n    event_identity_fingerprints: identity.event_identity_fingerprints,\n    message_fingerprints: messageFingerprints,\n    conversation_fingerprints: conversationFingerprints,\n    replay_key_fingerprint: identity.replay_key_fingerprint,\n    delay_policy_version: DELAY_POLICY_VERSION, delay_seconds: delaySeconds, not_before: notBefore,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, route_binding_sha256: binding(deps, core) });\n}\n\nfunction httpEnvelope(value) {\n  exactObject(value, ['status_code', 'body', 'error_code'], 'http_envelope_invalid');\n  if (value.status_code !== null &&\n      (!Number.isSafeInteger(value.status_code) || value.status_code < 100 || value.status_code > 599)) {\n    fail('http_envelope_invalid');\n  }\n  if (value.status_code === null) {\n    if (value.body !== null || typeof value.error_code !== 'string' || !SAFE_ERROR_CODE.test(value.error_code)) {\n      fail('http_envelope_invalid');\n    }\n  } else if (value.error_code !== null || (value.body !== null && !plainObject(value.body))) {\n    fail('http_envelope_invalid');\n  }\n  return value;\n}\n\nfunction conversationSnapshot(envelope, expected) {\n  const http = httpEnvelope(envelope);\n  if (http.status_code !== 200 || !plainObject(http.body)) fail('conversation_read_unavailable');\n  const body = http.body;\n  const accountId = body.account_id;\n  const inboxId = hasOwn(body, 'inbox_id') ? body.inbox_id\n    : plainObject(body.inbox) ? body.inbox.id : null;\n  const conversationId = positiveToken(body.id, 'conversation_route_invalid');\n  if (accountId !== expected.account_id || inboxId !== expected.inbox_id ||\n      conversationId !== expected.conversation_id ||\n      !['open', 'resolved', 'pending', 'snoozed'].includes(body.status)) fail('conversation_route_invalid');\n  const candidates = [];\n  const add = (container, field) => {\n    if (!plainObject(container) || !hasOwn(container, field)) return true;\n    const value = container[field];\n    if (field === 'assignee_id') { candidates.push(value); return true; }\n    if (value === null) { candidates.push(null); return true; }\n    if (!plainObject(value) || !hasOwn(value, 'id')) return false;\n    if (hasOwn(value, 'account_id') && value.account_id !== expected.account_id) return false;\n    candidates.push(value.id);\n    return true;\n  };\n  if (!add(body, 'assignee_id') || !add(body, 'assignee') || !add(body.meta, 'assignee') ||\n      candidates.length === 0) fail('conversation_assignee_invalid');\n  for (const candidate of candidates) {\n    if (candidate !== null && (!Number.isSafeInteger(candidate) || candidate < 1)) {\n      fail('conversation_assignee_invalid');\n    }\n  }\n  if (candidates.some((candidate) => candidate !== candidates[0])) fail('conversation_assignee_invalid');\n  return Object.freeze({ status: body.status, assignee_id: candidates[0] });\n}\n\nfunction validateIngressCommit(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'committed',\n    'customer_egress_allowed',\n  ], 'ingress_commit_invalid');\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_ingress_commit_v1' ||\n      value.status !== 'committed' || value.response_code !== 204 || value.reason_code !== null ||\n      value.customer_egress_allowed !== false) fail('ingress_commit_required');\n  exactObject(value.committed, [\n    'brand_id', 'account_id', 'inbox_id', 'channel', 'conversation_id', 'anchor_message_id',\n    'conversation_fingerprint', 'message_fingerprint', 'correlation_id',\n    'event_identity_key_version', 'event_identity_fingerprint', 'generation',\n    'delay_policy_version', 'delay_seconds', 'not_before', 'knowledge_version',\n    'commit_binding_sha256',\n  ], 'ingress_commit_invalid');\n  const core = { ...value.committed };\n  delete core.commit_binding_sha256;\n  if (binding(deps, core) !== value.committed.commit_binding_sha256) fail('ingress_commit_binding_mismatch');\n  return value.committed;\n}\n\nfunction baselineMaterial(commit, keyVersion, kind, value) {\n  const canonical = {\n    schema_version: '1.0', brand_id: BRAND_ID, account_id: commit.account_id,\n    inbox_id: commit.inbox_id, conversation_id: commit.conversation_id,\n  };\n  if (kind === 'status') canonical.status = value;\n  else canonical.assignee_id = value;\n  return (kind === 'status' ? STATUS_FINGERPRINT_DOMAIN : ASSIGNEE_FINGERPRINT_DOMAIN) +\n    JSON.stringify(canonical);\n}\n\nfunction prepareBaseline(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['ingress_commit', 'conversation_http', 'baseline_key_version'],\n    'baseline_input_invalid');\n  const commit = validateIngressCommit(input.ingress_commit, deps);\n  if (!BASELINE_KEY_VERSION.test(input.baseline_key_version || '')) fail('baseline_key_version_invalid');\n  const snapshot = conversationSnapshot(input.conversation_http, commit);\n  const requests = [\n    Object.freeze({ purpose: 'baseline_status', key_version: input.baseline_key_version,\n      algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: baselineMaterial(commit, input.baseline_key_version, 'status', snapshot.status) }),\n    Object.freeze({ purpose: 'baseline_assignee', key_version: input.baseline_key_version,\n      algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: baselineMaterial(commit, input.baseline_key_version, 'assignee', snapshot.assignee_id) }),\n  ];\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_baseline_plan_v1', commit,\n    baseline_key_version: input.baseline_key_version, hmac_requests: requests,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });\n}\n\nfunction validateBaselinePlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'commit', 'baseline_key_version', 'hmac_requests',\n    'customer_egress_allowed', 'plan_binding_sha256',\n  ], 'baseline_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_baseline_plan_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||\n      !BASELINE_KEY_VERSION.test(value.baseline_key_version || '') || !Array.isArray(value.hmac_requests)) {\n    fail('baseline_plan_invalid');\n  }\n  return value;\n}\n\nfunction validateWaitState(value, deps) {\n  exactObject(value, WAIT_CARRIER_EXACT_KEYS, 'wait_state_shape_invalid');\n  if (value.schema_version !== '1.0' || value.brand_id !== BRAND_ID || value.account_id !== ACCOUNT_ID ||\n      INBOX_CHANNELS[value.inbox_id] !== value.channel || value.customer_egress_allowed !== false ||\n      value.fixture_ref !== null || value.delay_mode !== 'live_observation' ||\n      value.delay_policy_version !== DELAY_POLICY_VERSION ||\n      !EVENT_KEY_VERSION.test(value.event_identity_key_version || '') ||\n      !BASELINE_KEY_VERSION.test(value.baseline_fingerprint_key_version || '') ||\n      !KNOWLEDGE_VERSION.test(value.knowledge_version || '') ||\n      !Number.isSafeInteger(value.generation) || value.generation < 1) fail('wait_state_invalid');\n  positiveToken(value.conversation_id, 'wait_state_invalid');\n  positiveToken(value.anchor_message_id, 'wait_state_invalid');\n  for (const field of [\n    'conversation_fingerprint', 'message_fingerprint', 'event_identity_fingerprint',\n    'baseline_status_fingerprint', 'baseline_assignee_fingerprint', 'wait_state_fingerprint',\n  ]) if (!HEX_64.test(value[field] || '')) fail('wait_state_invalid');\n  parseIso(value.not_before, 'wait_state_invalid');\n  const core = { ...value };\n  delete core.wait_state_fingerprint;\n  if (sha256Text(deps, orderedJson(core, WAIT_CARRIER_FIELD_ORDER)) !== value.wait_state_fingerprint) {\n    fail('wait_state_fingerprint_mismatch');\n  }\n  return value;\n}\n\nfunction finalizeWaitState(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['baseline_plan', 'hmac_results'], 'wait_state_input_invalid');\n  const plan = validateBaselinePlan(input.baseline_plan, deps);\n  const results = hmacResults(input.hmac_results, plan.hmac_requests, 'baseline_hmac_results_invalid');\n  const commit = plan.commit;\n  const wait = {\n    schema_version: '1.0', brand_id: BRAND_ID, account_id: commit.account_id,\n    inbox_id: commit.inbox_id, channel: commit.channel, conversation_id: commit.conversation_id,\n    anchor_message_id: commit.anchor_message_id,\n    conversation_fingerprint: commit.conversation_fingerprint,\n    message_fingerprint: commit.message_fingerprint, correlation_id: commit.correlation_id,\n    event_identity_key_version: commit.event_identity_key_version,\n    event_identity_fingerprint: commit.event_identity_fingerprint, generation: commit.generation,\n    baseline_fingerprint_key_version: plan.baseline_key_version,\n    baseline_status_fingerprint: results.get('baseline_status:' + plan.baseline_key_version),\n    baseline_assignee_fingerprint: results.get('baseline_assignee:' + plan.baseline_key_version),\n    delay_policy_version: commit.delay_policy_version, delay_mode: 'live_observation',\n    delay_seconds: commit.delay_seconds, not_before: commit.not_before,\n    knowledge_version: commit.knowledge_version, fixture_ref: null, customer_egress_allowed: false,\n  };\n  wait.wait_state_fingerprint = sha256Text(deps, orderedJson(wait, WAIT_CARRIER_FIELD_ORDER));\n  validateWaitState(wait, deps);\n  return Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_identifiers_only_wait_v1', status: 'ready',\n    wait_state: Object.freeze(wait), customer_egress_allowed: false,\n  });\n}\n\nfunction normalizeMessageRow(row, wait, deps) {\n  if (!plainObject(row) || !Number.isSafeInteger(row.id) || row.id < 1 ||\n      row.account_id !== wait.account_id || row.inbox_id !== wait.inbox_id ||\n      positiveToken(row.conversation_id, 'message_row_invalid') !== wait.conversation_id ||\n      ![0, 1, 2].includes(row.message_type) || typeof row.private !== 'boolean' ||\n      !Number.isSafeInteger(row.created_at) || row.created_at < 0) fail('message_row_invalid');\n  if (hasOwn(row, 'content') && row.content !== null && typeof row.content !== 'string') {\n    fail('message_content_invalid');\n  }\n  const content = typeof row.content === 'string' ? row.content : '';\n  const contentBytes = deps.utf8ToBytes(content);\n  if (contentBytes.length > MAX_RAW_BODY_SIZE_BYTES) fail('message_content_excessive');\n  if (hasOwn(row, 'attachments') && !Array.isArray(row.attachments)) fail('message_attachments_invalid');\n  const attachmentCount = Array.isArray(row.attachments) ? row.attachments.length : 0;\n  if (attachmentCount > 32) fail('message_attachments_excessive');\n  const senderType = plainObject(row.sender) && typeof row.sender.type === 'string'\n    ? row.sender.type.toLowerCase() : null;\n  const direction = row.message_type === 0 ? 'inbound' : row.message_type === 1 ? 'outbound' : 'activity';\n  const visibility = row.private ? 'private' : 'public';\n  return Object.freeze({\n    id: row.id, message_type: row.message_type, private: row.private,\n    created_at: isoFromEpochSeconds(row.created_at), sender_type: senderType,\n    direction, visibility, content_sha256: sha256Hex(deps, contentBytes),\n    attachment_count: attachmentCount,\n    anchor_content: String(row.id) === wait.anchor_message_id ? content : null,\n  });\n}\n\nfunction scanRows(envelope, wait, deps) {\n  const http = httpEnvelope(envelope);\n  if (http.status_code !== 200 || !plainObject(http.body) || !Array.isArray(http.body.payload)) {\n    fail('message_scan_unavailable');\n  }\n  if (http.body.payload.length < 1) fail('anchor_missing');\n  if (http.body.payload.length >= SCAN_PAGE_SIZE_LIMIT) fail('scan_truncated');\n  const rows = http.body.payload.map((row) => normalizeMessageRow(row, wait, deps));\n  const anchor = Number(wait.anchor_message_id);\n  if (new Set(rows.map((row) => row.id)).size !== rows.length ||\n      rows.some((row) => row.id < anchor)) {\n    fail('message_scan_invalid');\n  }\n  const anchors = rows.filter((row) => row.id === anchor);\n  if (anchors.length !== 1) fail('anchor_missing');\n  if (anchors[0].message_type !== 0 || anchors[0].private !== false) fail('anchor_invalid');\n  if (rows.filter((row) => row.message_type !== 2).length < 1) fail('message_scan_invalid');\n  return rows;\n}\n\nfunction prepareBoundedReread(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, [\n    'schema_version', 'wait_state', 'read_started_epoch_seconds', 'conversation_before',\n    'messages_first', 'messages_second', 'conversation_after',\n  ], 'reread_input_invalid');\n  if (input.schema_version !== '1.0' || !Number.isSafeInteger(input.read_started_epoch_seconds) ||\n      input.read_started_epoch_seconds < 0) fail('reread_input_invalid');\n  const wait = validateWaitState(input.wait_state, deps);\n  if (input.read_started_epoch_seconds * 1000 < parseIso(wait.not_before, 'wait_state_invalid')) {\n    fail('wait_not_elapsed');\n  }\n  const before = conversationSnapshot(input.conversation_before, wait);\n  const firstRows = scanRows(input.messages_first, wait, deps);\n  const secondRows = scanRows(input.messages_second, wait, deps);\n  const after = conversationSnapshot(input.conversation_after, wait);\n  const uniqueRows = new Map();\n  for (const row of [...firstRows, ...secondRows]) {\n    const existing = uniqueRows.get(row.id);\n    const stable = { ...row, anchor_content: null };\n    if (existing && stableJson({ ...existing, anchor_content: null }) !== stableJson(stable)) {\n      fail('scan_changed');\n    }\n    uniqueRows.set(row.id, row);\n  }\n  const anchorId = Number(wait.anchor_message_id);\n  const anchorTuple = {\n    schema_version: '1.0', account_id: wait.account_id, inbox_id: wait.inbox_id,\n    event: 'message_created', conversation_id: wait.conversation_id,\n    message_id: wait.anchor_message_id,\n  };\n  const eventRequests = [Object.freeze({ purpose: 'message_event_' + anchorId,\n    key_version: wait.event_identity_key_version, algorithm: 'hmac-sha256', encoding: 'hex',\n    material_utf8: JSON.stringify(anchorTuple) })];\n  const baselineRequests = [\n    ['conversation_before_status', 'status', before.status],\n    ['conversation_before_assignee', 'assignee', before.assignee_id],\n    ['conversation_after_status', 'status', after.status],\n    ['conversation_after_assignee', 'assignee', after.assignee_id],\n  ].map(([purpose, kind, value]) => Object.freeze({\n    purpose, key_version: wait.baseline_fingerprint_key_version,\n    algorithm: 'hmac-sha256', encoding: 'hex',\n    material_utf8: baselineMaterial(wait, wait.baseline_fingerprint_key_version, kind, value),\n  }));\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_bounded_reread_plan_v1', wait_state: wait,\n    read_started_at: isoFromEpochSeconds(input.read_started_epoch_seconds),\n    first_rows: firstRows, second_rows: secondRows,\n    event_hmac_requests: eventRequests, baseline_hmac_requests: baselineRequests,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });\n}\n\nfunction validateRereadPlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'wait_state', 'read_started_at', 'first_rows', 'second_rows',\n    'event_hmac_requests', 'baseline_hmac_requests', 'customer_egress_allowed',\n    'plan_binding_sha256',\n  ], 'reread_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_bounded_reread_plan_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||\n      !Array.isArray(value.first_rows) || !Array.isArray(value.second_rows) ||\n      !Array.isArray(value.event_hmac_requests) || !Array.isArray(value.baseline_hmac_requests)) {\n    fail('reread_plan_invalid');\n  }\n  validateWaitState(value.wait_state, deps);\n  return value;\n}\n\nfunction prepareRereadMessageFingerprints(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['reread_plan', 'event_hmac_results'], 'reread_event_results_input_invalid');\n  const plan = validateRereadPlan(input.reread_plan, deps);\n  const events = hmacResults(input.event_hmac_results, plan.event_hmac_requests,\n    'reread_event_hmac_results_invalid');\n  const anchorId = Number(plan.wait_state.anchor_message_id);\n  const anchors = plan.second_rows.filter((row) => row.id === anchorId);\n  if (anchors.length !== 1) fail('anchor_missing');\n  const eventFingerprint = events.get(\n    'message_event_' + anchorId + ':' + plan.wait_state.event_identity_key_version,\n  );\n  const canonical = {\n    schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.wait_state.account_id,\n    inbox_id: plan.wait_state.inbox_id, conversation_id: plan.wait_state.conversation_id,\n    message_id: plan.wait_state.anchor_message_id,\n    direction: anchors[0].direction, visibility: anchors[0].visibility,\n    event_identity_key_version: plan.wait_state.event_identity_key_version,\n    event_identity_fingerprint: eventFingerprint,\n  };\n  const messageRequests = [Object.freeze({ purpose: 'message_anchor_' + anchorId,\n    key_version: plan.wait_state.event_identity_key_version, algorithm: 'hmac-sha256',\n    encoding: 'hex',\n    material_utf8: ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(canonical) })];\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_reread_message_plan_v1', reread_plan: plan,\n    event_hmac_results: input.event_hmac_results, message_hmac_requests: messageRequests,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });\n}\n\nfunction validateMessagePlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'reread_plan', 'event_hmac_results', 'message_hmac_requests',\n    'customer_egress_allowed', 'plan_binding_sha256',\n  ], 'reread_message_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_reread_message_plan_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||\n      !Array.isArray(value.message_hmac_requests)) fail('reread_message_plan_invalid');\n  validateRereadPlan(value.reread_plan, deps);\n  return value;\n}\n\nfunction gateState(value) {\n  exactObject(value, [\n    'current_generation', 'idempotency_consumed', 'brand_enabled', 'kill_switch',\n  ], 'post_delay_gate_state_invalid');\n  if (!Number.isSafeInteger(value.current_generation) || value.current_generation < 1 ||\n      typeof value.idempotency_consumed !== 'boolean' || typeof value.brand_enabled !== 'boolean' ||\n      typeof value.kill_switch !== 'boolean') fail('post_delay_gate_state_invalid');\n  return value;\n}\n\nfunction setFingerprint(deps, rows) {\n  const canonicalRows = rows.map((row) => ({\n    id: row.id,\n    message_type: row.message_type,\n    private: row.private,\n    created_at: row.created_at,\n    sender_type: row.sender_type,\n    direction: row.direction,\n    visibility: row.visibility,\n    content_sha256: row.content_sha256,\n    attachment_count: row.attachment_count,\n  })).sort((left, right) => left.id - right.id);\n  return sha256Text(deps, MESSAGE_SET_FINGERPRINT_DOMAIN + JSON.stringify(canonicalRows));\n}\n\nfunction finalizePostDelay(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, [\n    'message_plan', 'message_hmac_results', 'baseline_hmac_results', 'gate_state',\n    'evaluated_epoch_seconds',\n  ], 'post_delay_input_invalid');\n  const plan = validateMessagePlan(input.message_plan, deps);\n  const reread = plan.reread_plan;\n  const wait = reread.wait_state;\n  const eventResults = hmacResults(plan.event_hmac_results, reread.event_hmac_requests,\n    'reread_event_hmac_results_invalid');\n  const messageResults = hmacResults(input.message_hmac_results, plan.message_hmac_requests,\n    'reread_message_hmac_results_invalid');\n  const baselineResults = hmacResults(input.baseline_hmac_results, reread.baseline_hmac_requests,\n    'reread_baseline_hmac_results_invalid');\n  const state = gateState(input.gate_state);\n  if (!Number.isSafeInteger(input.evaluated_epoch_seconds) || input.evaluated_epoch_seconds < 0 ||\n      input.evaluated_epoch_seconds * 1000 < parseIso(reread.read_started_at, 'reread_time_invalid')) {\n    fail('reread_time_invalid');\n  }\n  const first = reread.first_rows;\n  const second = reread.second_rows;\n  const firstSet = setFingerprint(deps, first);\n  const secondSet = setFingerprint(deps, second);\n  const anchorId = Number(wait.anchor_message_id);\n  const firstAnchor = first.filter((row) => row.id === anchorId);\n  const secondAnchor = second.filter((row) => row.id === anchorId);\n  const anchorEventFingerprint = eventResults.get(\n    'message_event_' + anchorId + ':' + wait.event_identity_key_version,\n  );\n  const anchorMessageFingerprint = messageResults.get(\n    'message_anchor_' + anchorId + ':' + wait.event_identity_key_version,\n  );\n  if (firstAnchor.length !== 1 || secondAnchor.length !== 1 ||\n      firstSet !== secondSet || firstAnchor[0].content_sha256 !== secondAnchor[0].content_sha256 ||\n      anchorMessageFingerprint !== wait.message_fingerprint ||\n      anchorEventFingerprint !== wait.event_identity_fingerprint) {\n    fail('bounded_reread_binding_failed');\n  }\n  const key = wait.baseline_fingerprint_key_version;\n  const beforeStatus = baselineResults.get('conversation_before_status:' + key);\n  const beforeAssignee = baselineResults.get('conversation_before_assignee:' + key);\n  const afterStatus = baselineResults.get('conversation_after_status:' + key);\n  const afterAssignee = baselineResults.get('conversation_after_assignee:' + key);\n  const rows = second;\n  const latest = (predicate) => {\n    const matches = rows.filter(predicate);\n    return matches.length ? matches.reduce((a, b) => a.id > b.id ? a : b) : null;\n  };\n  const latestInbound = latest((row) => row.message_type === 0 && row.private === false);\n  const latestHuman = latest((row) => row.message_type === 1 && row.private === false &&\n    ['user', 'agent'].includes(row.sender_type));\n  const latestPrivate = latest((row) => row.message_type !== 2 && row.private === true);\n  const latestNonActivity = latest((row) => row.message_type !== 2);\n  let cancellationReason = null;\n  if (beforeStatus !== afterStatus || beforeAssignee !== afterAssignee) cancellationReason = 'conversation_changed';\n  else if (afterStatus !== wait.baseline_status_fingerprint) cancellationReason = 'status_changed';\n  else if (afterAssignee !== wait.baseline_assignee_fingerprint) cancellationReason = 'assignee_changed';\n  else if (!state.brand_enabled) cancellationReason = 'brand_disabled';\n  else if (state.kill_switch) cancellationReason = 'brand_kill_switch';\n  else if (state.idempotency_consumed) cancellationReason = 'idempotency_consumed';\n  else if (state.current_generation !== wait.generation) cancellationReason = 'stale_generation';\n  else if (latestInbound && latestInbound.id > anchorId) cancellationReason = 'newer_inbound';\n  else if (latestHuman && latestHuman.id > anchorId) cancellationReason = 'human_intervention';\n  else if (latestPrivate && latestPrivate.id > anchorId) cancellationReason = 'private_note_present';\n  else if (latestNonActivity && latestNonActivity.id > anchorId) cancellationReason = 'newer_non_activity';\n  const eligible = cancellationReason === null;\n  const anchor = secondAnchor[0];\n  const summaryCore = {\n    wait_state_fingerprint: wait.wait_state_fingerprint,\n    scan_first_count: first.length, scan_second_count: second.length,\n    scan_first_set_fingerprint: firstSet, scan_second_set_fingerprint: secondSet,\n    anchor_message_id: wait.anchor_message_id,\n    anchor_message_fingerprint: anchorMessageFingerprint,\n    current_generation: state.current_generation,\n    expected_generation: wait.generation,\n    conversation_snapshots_stable: beforeStatus === afterStatus && beforeAssignee === afterAssignee,\n    evaluated_at: isoFromEpochSeconds(input.evaluated_epoch_seconds),\n  };\n  const verifiedAnchor = eligible ? Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_verified_anchor_for_llm_v1',\n    account_id: wait.account_id, inbox_id: wait.inbox_id, channel: wait.channel,\n    conversation_id: wait.conversation_id, message_id: wait.anchor_message_id,\n    content: anchor.anchor_content, content_sha256: anchor.content_sha256,\n    attachment_count: anchor.attachment_count, transient_only: true,\n    persistence_allowed: false, customer_egress_allowed: false,\n  }) : null;\n  return Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_post_delay_stage_v1',\n    status: eligible ? 'eligible' : 'cancelled', eligible_for_observation: eligible,\n    cancellation_reason: cancellationReason,\n    live_reread_summary: Object.freeze({ ...summaryCore,\n      summary_binding_sha256: binding(deps, summaryCore) }),\n    verified_anchor: verifiedAnchor,\n    transient_only: true, persistence_allowed: false, customer_egress_allowed: false,\n  });\n}\n\nfunction failClosedEnvelope(stage, error) {\n  const reasonCode = error instanceof FailClosedError ? error.reasonCode : 'stage_unexpected_failure';\n  if (typeof stage !== 'string' || !/^[a-z][a-z0-9_]{2,80}$/.test(stage)) {\n    fail('stage_name_invalid');\n  }\n  return Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_stage_failure_v1', stage,\n    status: 'fail_closed', reason_code: reasonCode,\n    customer_egress_allowed: false,\n  });\n}\n\nfunction createChatwootObservationStages(injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  return Object.freeze({\n    prepareSignedIngress: (input) => prepareSignedIngress(input, deps),\n    finalizeSignedHmac: (input) => finalizeSignedHmac(input, deps),\n    prepareEventIdentity: (input) => prepareEventIdentity(input, deps),\n    finalizeEventIdentity: (input) => finalizeEventIdentity(input, deps),\n    finalizeRouteFingerprints: (input) => finalizeRouteFingerprints(input, deps),\n    prepareBaseline: (input) => prepareBaseline(input, deps),\n    finalizeWaitState: (input) => finalizeWaitState(input, deps),\n    prepareBoundedReread: (input) => prepareBoundedReread(input, deps),\n    prepareRereadMessageFingerprints: (input) => prepareRereadMessageFingerprints(input, deps),\n    finalizePostDelay: (input) => finalizePostDelay(input, deps),\n    validateWaitState: (input) => validateWaitState(input, deps),\n  });\n}\n\nmodule.exports = Object.freeze({\n  ACCOUNT_ID,\n  BRAND_ID,\n  INBOX_CHANNELS,\n  MAX_RAW_BODY_SIZE_BYTES,\n  MAX_AGE_SECONDS,\n  MAX_FUTURE_SKEW_SECONDS,\n  SCAN_PAGE_SIZE_LIMIT,\n  EVENT_IDENTITY_CANONICAL_FORMAT,\n  EVENT_TO_STORAGE_KEY_VERSION,\n  STORAGE_TO_EVENT_KEY_VERSION,\n  WAIT_CARRIER_FIELD_ORDER,\n  PARITY_MANIFEST,\n  PARITY_MANIFEST_SHA256,\n  FailClosedError,\n  stableJson,\n  canonicalEventTuple,\n  eventKeyVersionToStorage,\n  storageKeyVersionToEvent,\n  failClosedEnvelope,\n  createChatwootObservationStages,\n});\n";
const STAGED_RUNTIME_SOURCE_SHA256 = "0045d7cd9313919c175c81e724f285aad1d10830993ded77f8b23ec8aa1d2b1c";
const STAGED_RUNTIME_PARITY_SHA256 = "dbb11ff31880ef59bb740bbc51aa61ed1d74ade8594c66bbdc47766eebdc2418";
const STAGED_SUPPORT_SOURCE = "\nfunction __edgeSha256Hex(input) {\n  const source = input instanceof Uint8Array ? Array.from(input) : [];\n  const bytes = source.slice();\n  const bitLength = bytes.length * 8;\n  const constants = [\n    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,\n    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,\n    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,\n    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,\n    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,\n    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,\n    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,\n    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2\n  ];\n  const rotate = (value, shift) => (value >>> shift) | (value << (32 - shift));\n  bytes.push(0x80);\n  while (bytes.length % 64 !== 56) bytes.push(0);\n  const high = Math.floor(bitLength / 0x100000000);\n  const low = bitLength >>> 0;\n  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);\n  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);\n  const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];\n  const words = new Uint32Array(64);\n  for (let offset = 0; offset < bytes.length; offset += 64) {\n    for (let index = 0; index < 16; index += 1) {\n      const start = offset + index * 4;\n      words[index] = ((bytes[start] << 24) | (bytes[start + 1] << 16) |\n        (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0;\n    }\n    for (let index = 16; index < 64; index += 1) {\n      const x = words[index - 15];\n      const y = words[index - 2];\n      const sigma0 = rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3);\n      const sigma1 = rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10);\n      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;\n    }\n    let [a,b,c,d,e,f,g,h] = hash;\n    for (let index = 0; index < 64; index += 1) {\n      const sum1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);\n      const choose = (e & f) ^ (~e & g);\n      const temporary1 = (h + sum1 + choose + constants[index] + words[index]) >>> 0;\n      const sum0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);\n      const majority = (a & b) ^ (a & c) ^ (b & c);\n      const temporary2 = (sum0 + majority) >>> 0;\n      h = g; g = f; f = e; e = (d + temporary1) >>> 0;\n      d = c; c = b; b = a; a = (temporary1 + temporary2) >>> 0;\n    }\n    hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;\n    hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;\n    hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;\n    hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;\n  }\n  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');\n}\nfunction __edgeTimingSafeEqualHex(left, right) {\n  if (!/^[a-f0-9]{64}$/.test(left || '') || !/^[a-f0-9]{64}$/.test(right || '')) return false;\n  let difference = 0;\n  for (let index = 0; index < 64; index += 1) {\n    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);\n  }\n  return difference === 0;\n}\nconst __edgeDependencies = Object.freeze({\n  base64ToBytes: (value) => new Uint8Array(Buffer.from(value, 'base64')),\n  bytesToBase64: (value) => Buffer.from(value).toString('base64'),\n  utf8ToBytes: (value) => new Uint8Array(Buffer.from(value, 'utf8')),\n  bytesToUtf8Fatal: (value) => new TextDecoder('utf-8', { fatal: true }).decode(value),\n  sha256Hex: __edgeSha256Hex,\n  timingSafeEqualHex: __edgeTimingSafeEqualHex\n});\nconst __edgeStages = __edgeModule.exports.createChatwootObservationStages(__edgeDependencies);\nfunction __edgeFailure(stage, error) {\n  return __edgeModule.exports.failClosedEnvelope(stage, error);\n}\nfunction __edgeHttpEnvelope(value) {\n  const source = value && typeof value === 'object' ? value : {};\n  const status = Number.isSafeInteger(source.statusCode) ? source.statusCode\n    : Number.isSafeInteger(source.status_code) ? source.status_code : null;\n  return {\n    status_code: status,\n    body: status === null ? null : (source.body && typeof source.body === 'object' ? source.body : null),\n    error_code: status === null ? 'chatwoot_read_unknown' : null\n  };\n}\n";
const STAGED_BOOTSTRAP = "const __edgeModule = { exports: {} };\n'use strict';\n\n/*\n * Pure, credential-free stages for the Calapres Chatwoot Edge.\n *\n * Native n8n nodes own all effects:\n * - Webhook supplies exact raw bytes;\n * - Crypto supplies secret-keyed HMAC results;\n * - PostgreSQL supplies atomic result envelopes;\n * - HTTP Request supplies Chatwoot response envelopes.\n *\n * This module validates and binds those envelopes. It performs no network,\n * credential, database, filesystem, wait, workflow, model, or send action.\n */\n\nconst ACCOUNT_ID = 179973;\nconst BRAND_ID = 'calapres';\nconst INBOX_CHANNELS = Object.freeze({\n  128031: 'instagram',\n  128033: 'tiktok',\n  128058: 'whatsapp',\n  128326: 'email',\n});\nconst MAX_RAW_BODY_SIZE_BYTES = 1024 * 1024;\nconst MAX_AGE_SECONDS = 300;\nconst MAX_FUTURE_SKEW_SECONDS = 60;\nconst SCAN_PAGE_SIZE_LIMIT = 100;\nconst EVENT_IDENTITY_CANONICAL_FORMAT =\n  'json-minified-ordered:[schema_version,account_id,inbox_id,event,conversation_id,message_id]';\nconst DELAY_POLICY_VERSION = '2026-08-11-v1';\nconst DELAY_RANGES = Object.freeze({\n  instagram: Object.freeze({ minimum: 30, maximum: 75 }),\n  tiktok: Object.freeze({ minimum: 30, maximum: 75 }),\n  whatsapp: Object.freeze({ minimum: 30, maximum: 75 }),\n  email: Object.freeze({ minimum: 120, maximum: 300 }),\n});\nconst EVENT_KEY_VERSION = /^calapres-identity-hmac-v[1-9][0-9]*$/;\nconst BASELINE_KEY_VERSION = /^calapres-hmac-v[1-9][0-9]*$/;\nconst EVENT_TO_STORAGE_KEY_VERSION = Object.freeze({\n  'calapres-identity-hmac-v1': 'hmac-sha256-v1',\n});\nconst STORAGE_TO_EVENT_KEY_VERSION = Object.freeze({\n  'hmac-sha256-v1': 'calapres-identity-hmac-v1',\n});\nconst HEX_64 = /^[a-f0-9]{64}$/;\nconst SIGNATURE_HEADER = /^sha256=[a-f0-9]{64}$/;\nconst TIMESTAMP_HEADER = /^[0-9]{10}$/;\nconst POSITIVE_DECIMAL_TOKEN = /^[1-9][0-9]{0,15}$/;\nconst KNOWLEDGE_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;\nconst SAFE_ERROR_CODE = /^[a-z][a-z0-9_]{2,80}$/;\nconst STRICT_ISO_TIMESTAMP =\n  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;\nconst CONTENT_TYPE = /^application\\/json(?:\\s*;\\s*charset=(?:utf-8|utf8))?$/i;\nconst BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;\nconst ANCHOR_MESSAGE_FINGERPRINT_DOMAIN = 'calapres-message-anchor-v1:';\nconst CONVERSATION_FINGERPRINT_DOMAIN = 'calapres-conversation-v1:';\nconst MESSAGE_SET_FINGERPRINT_DOMAIN = 'calapres-chatwoot-message-set-v1:';\nconst STATUS_FINGERPRINT_DOMAIN = 'calapres-conversation-status-v1:';\nconst ASSIGNEE_FINGERPRINT_DOMAIN = 'calapres-conversation-assignee-v1:';\nconst PLAN_BINDING_DOMAIN = 'calapres-observation-stage-binding-v1:';\n\nconst WAIT_CARRIER_FIELD_ORDER = Object.freeze([\n  'schema_version',\n  'brand_id',\n  'account_id',\n  'inbox_id',\n  'channel',\n  'conversation_id',\n  'anchor_message_id',\n  'conversation_fingerprint',\n  'message_fingerprint',\n  'correlation_id',\n  'event_identity_key_version',\n  'event_identity_fingerprint',\n  'generation',\n  'baseline_fingerprint_key_version',\n  'baseline_status_fingerprint',\n  'baseline_assignee_fingerprint',\n  'delay_policy_version',\n  'delay_mode',\n  'delay_seconds',\n  'not_before',\n  'knowledge_version',\n  'fixture_ref',\n  'customer_egress_allowed',\n]);\nconst WAIT_CARRIER_EXACT_KEYS = new Set([...WAIT_CARRIER_FIELD_ORDER, 'wait_state_fingerprint']);\n\nconst PARITY_MANIFEST = Object.freeze({\n  account_id: ACCOUNT_ID,\n  inbox_channels: INBOX_CHANNELS,\n  max_raw_body_size_bytes: MAX_RAW_BODY_SIZE_BYTES,\n  max_age_seconds: MAX_AGE_SECONDS,\n  max_future_skew_seconds: MAX_FUTURE_SKEW_SECONDS,\n  scan_page_size_limit: SCAN_PAGE_SIZE_LIMIT,\n  event_identity_canonical_format: EVENT_IDENTITY_CANONICAL_FORMAT,\n  event_to_storage_key_version: EVENT_TO_STORAGE_KEY_VERSION,\n  wait_carrier_field_order: WAIT_CARRIER_FIELD_ORDER,\n});\n// SHA-256 of stableJson(PARITY_MANIFEST). Tests recompute this and compare the\n// selected exported constants with chatwoot-observation-runtime.js.\nconst PARITY_MANIFEST_SHA256 = 'dbb11ff31880ef59bb740bbc51aa61ed1d74ade8594c66bbdc47766eebdc2418';\n\nclass FailClosedError extends Error {\n  constructor(reasonCode) {\n    super(reasonCode);\n    this.name = 'FailClosedError';\n    this.reasonCode = reasonCode;\n  }\n}\n\nfunction fail(reasonCode) {\n  throw new FailClosedError(reasonCode);\n}\n\nfunction plainObject(value) {\n  return value !== null && typeof value === 'object' && !Array.isArray(value);\n}\n\nfunction exactObject(value, fields, reasonCode) {\n  if (!plainObject(value)) fail(reasonCode);\n  const expected = fields instanceof Set ? fields : new Set(fields);\n  const keys = Object.keys(value);\n  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) fail(reasonCode);\n  return value;\n}\n\nfunction hasOwn(value, field) {\n  return plainObject(value) && Object.prototype.hasOwnProperty.call(value, field);\n}\n\nfunction stableJson(value) {\n  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';\n  if (plainObject(value)) {\n    return '{' + Object.keys(value).sort().map((key) =>\n      JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';\n  }\n  return JSON.stringify(value);\n}\n\nfunction orderedJson(value, fieldOrder) {\n  const ordered = {};\n  for (const field of fieldOrder) ordered[field] = value[field];\n  return JSON.stringify(ordered);\n}\n\nfunction dependencies(value) {\n  if (!plainObject(value) ||\n      typeof value.base64ToBytes !== 'function' ||\n      typeof value.bytesToBase64 !== 'function' ||\n      typeof value.utf8ToBytes !== 'function' ||\n      typeof value.bytesToUtf8Fatal !== 'function' ||\n      typeof value.sha256Hex !== 'function' ||\n      typeof value.timingSafeEqualHex !== 'function') {\n    fail('stage_dependencies_unavailable');\n  }\n  return value;\n}\n\nfunction bytes(value) {\n  if (!(value instanceof Uint8Array)) fail('stage_bytes_invalid');\n  return value;\n}\n\nfunction sha256Hex(deps, value) {\n  const digest = deps.sha256Hex(bytes(value));\n  if (!HEX_64.test(digest || '')) fail('stage_sha256_output_invalid');\n  return digest;\n}\n\nfunction sha256Text(deps, value) {\n  if (typeof value !== 'string') fail('stage_sha256_text_invalid');\n  return sha256Hex(deps, deps.utf8ToBytes(value));\n}\n\nfunction binding(deps, value) {\n  return sha256Text(deps, PLAN_BINDING_DOMAIN + stableJson(value));\n}\n\nfunction decodeCanonicalBase64(deps, value, reasonCode) {\n  if (typeof value !== 'string' || value.length % 4 !== 0 || !BASE64.test(value)) fail(reasonCode);\n  let decoded;\n  try {\n    decoded = bytes(deps.base64ToBytes(value));\n  } catch (_error) {\n    fail(reasonCode);\n  }\n  if (deps.bytesToBase64(decoded) !== value) fail(reasonCode);\n  return decoded;\n}\n\nfunction concatBytes(left, right) {\n  const output = new Uint8Array(left.length + right.length);\n  output.set(left, 0);\n  output.set(right, left.length);\n  return output;\n}\n\nfunction isoFromEpochSeconds(value) {\n  if (!Number.isSafeInteger(value) || value < 0) fail('clock_invalid');\n  const result = new Date(value * 1000);\n  if (Number.isNaN(result.getTime())) fail('clock_invalid');\n  return result.toISOString();\n}\n\nfunction parseIso(value, reasonCode) {\n  if (typeof value !== 'string' || !STRICT_ISO_TIMESTAMP.test(value)) fail(reasonCode);\n  const parsed = Date.parse(value);\n  if (!Number.isFinite(parsed)) fail(reasonCode);\n  return parsed;\n}\n\nfunction positiveToken(value, reasonCode) {\n  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);\n  if (typeof value !== 'string' || !POSITIVE_DECIMAL_TOKEN.test(value) ||\n      !Number.isSafeInteger(Number(value)) || String(Number(value)) !== value) fail(reasonCode);\n  return value;\n}\n\nfunction eventKeyVersionToStorage(value) {\n  if (!Object.prototype.hasOwnProperty.call(EVENT_TO_STORAGE_KEY_VERSION, value)) {\n    fail('storage_key_version_unknown');\n  }\n  return EVENT_TO_STORAGE_KEY_VERSION[value];\n}\n\nfunction storageKeyVersionToEvent(value) {\n  if (!Object.prototype.hasOwnProperty.call(STORAGE_TO_EVENT_KEY_VERSION, value)) {\n    fail('event_key_version_unknown');\n  }\n  return STORAGE_TO_EVENT_KEY_VERSION[value];\n}\n\nfunction integerId(value, reasonCode) {\n  if (!Number.isSafeInteger(value)) fail(reasonCode);\n  return value;\n}\n\nfunction normalizedEventTime(value) {\n  if (Number.isSafeInteger(value) && value >= 0) return isoFromEpochSeconds(value);\n  if (typeof value !== 'string') fail('event_time_invalid');\n  const documented = value.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) UTC$/);\n  const normalized = documented ? documented[1] + 'T' + documented[2] + 'Z' : value;\n  const parsed = parseIso(normalized, 'event_time_invalid');\n  return new Date(parsed).toISOString();\n}\n\nfunction deterministicDelay(seed, minimum, maximum) {\n  let hash = 2166136261;\n  for (const character of seed) {\n    hash ^= character.charCodeAt(0);\n    hash = Math.imul(hash, 16777619) >>> 0;\n  }\n  return minimum + (hash % (maximum - minimum + 1));\n}\n\nfunction response(status, responseCode, reasonCode, transient = null) {\n  return Object.freeze({\n    schema_version: '1.0',\n    kind: 'chatwoot_signed_ingress_preflight_v1',\n    status,\n    response_code: responseCode,\n    reason_code: reasonCode,\n    transient,\n    customer_egress_allowed: false,\n  });\n}\n\nfunction validatePreflight(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'transient',\n    'customer_egress_allowed',\n  ], 'preflight_envelope_invalid');\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_signed_ingress_preflight_v1' ||\n      value.customer_egress_allowed !== false) fail('preflight_envelope_invalid');\n  if (value.status !== 'eligible') fail('preflight_not_eligible');\n  if (value.response_code !== 0 || value.reason_code !== null) fail('preflight_envelope_invalid');\n  exactObject(value.transient, [\n    'timestamp', 'signature_header', 'supplied_digest_hex', 'raw_body_base64',\n    'raw_body_size_bytes', 'body_sha256', 'signed_payload_base64', 'received_epoch_seconds',\n    'received_at', 'delivery_id_fingerprint', 'preflight_binding_sha256',\n  ], 'preflight_transient_invalid');\n  const copy = { ...value.transient };\n  delete copy.preflight_binding_sha256;\n  if (binding(deps, copy) !== value.transient.preflight_binding_sha256) fail('preflight_binding_mismatch');\n  return value.transient;\n}\n\nfunction prepareSignedIngress(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, [\n    'schema_version', 'content_type', 'timestamp_header', 'signature_header',\n    'delivery_header', 'raw_body_base64', 'received_epoch_seconds',\n  ], 'webhook_projection_invalid');\n  if (input.schema_version !== '1.0') fail('webhook_projection_invalid');\n  if (typeof input.content_type !== 'string' || !CONTENT_TYPE.test(input.content_type)) {\n    return response('rejected', 400, 'content_type_invalid');\n  }\n  let raw;\n  try {\n    raw = decodeCanonicalBase64(deps, input.raw_body_base64, 'raw_body_base64_invalid');\n  } catch (error) {\n    if (error instanceof FailClosedError) return response('rejected', 400, error.reasonCode);\n    throw error;\n  }\n  if (raw.length === 0) return response('rejected', 400, 'payload_empty');\n  if (raw.length > MAX_RAW_BODY_SIZE_BYTES) return response('rejected', 413, 'payload_too_large');\n  if (!Number.isSafeInteger(input.received_epoch_seconds) || input.received_epoch_seconds < 0) {\n    return response('rejected', 400, 'clock_invalid');\n  }\n  if (typeof input.timestamp_header !== 'string' || !TIMESTAMP_HEADER.test(input.timestamp_header)) {\n    return response('rejected', 401, 'timestamp_malformed');\n  }\n  const timestamp = Number(input.timestamp_header);\n  const age = input.received_epoch_seconds - timestamp;\n  if (age > MAX_AGE_SECONDS) return response('rejected', 401, 'timestamp_stale');\n  if (age < -MAX_FUTURE_SKEW_SECONDS) return response('rejected', 401, 'timestamp_future');\n  if (typeof input.signature_header !== 'string' || !SIGNATURE_HEADER.test(input.signature_header)) {\n    return response('rejected', 401, 'signature_malformed');\n  }\n  if (input.delivery_header !== null &&\n      (typeof input.delivery_header !== 'string' || input.delivery_header.length < 1 ||\n       input.delivery_header.length > 512)) {\n    return response('rejected', 400, 'delivery_header_invalid');\n  }\n  const bodySha256 = sha256Hex(deps, raw);\n  const signedBytes = concatBytes(deps.utf8ToBytes(input.timestamp_header + '.'), raw);\n  const projected = {\n    timestamp: input.timestamp_header,\n    signature_header: input.signature_header,\n    supplied_digest_hex: input.signature_header.slice('sha256='.length),\n    raw_body_base64: input.raw_body_base64,\n    raw_body_size_bytes: raw.length,\n    body_sha256: bodySha256,\n    signed_payload_base64: deps.bytesToBase64(signedBytes),\n    received_epoch_seconds: input.received_epoch_seconds,\n    received_at: isoFromEpochSeconds(input.received_epoch_seconds),\n    delivery_id_fingerprint: input.delivery_header === null\n      ? null\n      : sha256Text(deps, input.delivery_header),\n  };\n  projected.preflight_binding_sha256 = binding(deps, projected);\n  return response('eligible', 0, null, Object.freeze(projected));\n}\n\nfunction finalizeSignedHmac(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['preflight', 'computed_hmac_hex', 'compared_epoch_seconds'], 'hmac_result_input_invalid');\n  const preflight = validatePreflight(input.preflight, deps);\n  if (!HEX_64.test(input.computed_hmac_hex || '') ||\n      !Number.isSafeInteger(input.compared_epoch_seconds) || input.compared_epoch_seconds < 0) {\n    fail('hmac_result_input_invalid');\n  }\n  if (input.compared_epoch_seconds - preflight.received_epoch_seconds > MAX_AGE_SECONDS ||\n      input.compared_epoch_seconds < preflight.received_epoch_seconds) {\n    return Object.freeze({\n      schema_version: '1.0', kind: 'chatwoot_signed_hmac_gate_v1', status: 'fail_closed',\n      response_code: 401, reason_code: 'hmac_comparison_stale', raw_binding: null,\n      replay_identity: null, customer_egress_allowed: false,\n    });\n  }\n  if (deps.timingSafeEqualHex(input.computed_hmac_hex, preflight.supplied_digest_hex) !== true) {\n    return Object.freeze({\n      schema_version: '1.0', kind: 'chatwoot_signed_hmac_gate_v1', status: 'fail_closed',\n      response_code: 401, reason_code: 'signature_mismatch', raw_binding: null,\n      replay_identity: null, customer_egress_allowed: false,\n    });\n  }\n  const replayFingerprint = sha256Text(\n    deps,\n    preflight.signature_header + ':' + preflight.timestamp + ':' + preflight.body_sha256,\n  );\n  const rawBinding = {\n    timestamp: preflight.timestamp,\n    raw_body_base64: preflight.raw_body_base64,\n    raw_body_size_bytes: preflight.raw_body_size_bytes,\n    body_sha256: preflight.body_sha256,\n    preflight_binding_sha256: preflight.preflight_binding_sha256,\n  };\n  rawBinding.raw_binding_sha256 = binding(deps, rawBinding);\n  return Object.freeze({\n    schema_version: '1.0',\n    kind: 'chatwoot_signed_hmac_gate_v1',\n    status: 'verified',\n    response_code: 0,\n    reason_code: null,\n    raw_binding: Object.freeze(rawBinding),\n    replay_identity: Object.freeze({\n      replay_key_fingerprint: replayFingerprint,\n      received_at: preflight.received_at,\n      expires_at: isoFromEpochSeconds(preflight.received_epoch_seconds + MAX_AGE_SECONDS + MAX_FUTURE_SKEW_SECONDS),\n    }),\n    customer_egress_allowed: false,\n  });\n}\n\nfunction canonicalEventTuple(payload) {\n  if (!plainObject(payload)) fail('payload_not_object');\n  for (const field of ['account', 'inbox', 'conversation']) {\n    if (hasOwn(payload, field) && !plainObject(payload[field])) fail(field + '_container_invalid');\n  }\n  if (hasOwn(payload, 'account') && hasOwn(payload, 'account_id')) fail('account_id_alias_conflict');\n  if (hasOwn(payload, 'inbox') && hasOwn(payload, 'inbox_id')) fail('inbox_id_alias_conflict');\n  if (hasOwn(payload, 'conversation') && hasOwn(payload, 'conversation_id')) fail('conversation_id_alias_conflict');\n  if (hasOwn(payload, 'id') && hasOwn(payload, 'message_id')) fail('message_id_alias_conflict');\n  const accountId = integerId(hasOwn(payload, 'account') ? payload.account.id : payload.account_id,\n    'account_id_invalid');\n  const inboxId = integerId(hasOwn(payload, 'inbox') ? payload.inbox.id : payload.inbox_id,\n    'inbox_id_invalid');\n  if (accountId !== ACCOUNT_ID) fail('account_not_allowlisted');\n  if (!INBOX_CHANNELS[inboxId]) fail('inbox_not_allowlisted');\n  if (hasOwn(payload, 'conversation') && hasOwn(payload.conversation, 'account_id') &&\n      payload.conversation.account_id !== accountId) fail('account_mismatch');\n  if (hasOwn(payload, 'conversation') && hasOwn(payload.conversation, 'inbox_id') &&\n      payload.conversation.inbox_id !== inboxId) fail('inbox_mismatch');\n  if (payload.event !== 'message_created') fail('event_not_supported');\n  return Object.freeze({\n    schema_version: '1.0',\n    account_id: accountId,\n    inbox_id: inboxId,\n    event: 'message_created',\n    conversation_id: positiveToken(\n      hasOwn(payload, 'conversation') ? payload.conversation.id : payload.conversation_id,\n      'conversation_id_invalid',\n    ),\n    message_id: positiveToken(hasOwn(payload, 'id') ? payload.id : payload.message_id,\n      'message_id_invalid'),\n  });\n}\n\nfunction validateReplayGate(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'raw_binding',\n    'replay_key_fingerprint', 'customer_egress_allowed',\n  ], 'replay_gate_invalid');\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_request_replay_gate_v1' ||\n      value.status !== 'proceed_parse' || value.response_code !== 0 || value.reason_code !== null ||\n      value.customer_egress_allowed !== false || !HEX_64.test(value.replay_key_fingerprint || '')) {\n    fail('verified_replay_required');\n  }\n  const raw = value.raw_binding;\n  exactObject(raw, [\n    'timestamp', 'raw_body_base64', 'raw_body_size_bytes', 'body_sha256',\n    'preflight_binding_sha256', 'raw_binding_sha256',\n  ], 'raw_binding_invalid');\n  const copy = { ...raw };\n  delete copy.raw_binding_sha256;\n  if (binding(deps, copy) !== raw.raw_binding_sha256) fail('raw_binding_mismatch');\n  return raw;\n}\n\nfunction prepareEventIdentity(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['replay_gate', 'active_key_version', 'retained_key_versions'],\n    'event_identity_input_invalid');\n  const rawBinding = validateReplayGate(input.replay_gate, deps);\n  if (!EVENT_KEY_VERSION.test(input.active_key_version || '') ||\n      !Array.isArray(input.retained_key_versions) || input.retained_key_versions.length > 8 ||\n      input.retained_key_versions.some((value) => !EVENT_KEY_VERSION.test(value || '')) ||\n      new Set([input.active_key_version, ...input.retained_key_versions]).size !==\n        input.retained_key_versions.length + 1) fail('event_keyring_invalid');\n  for (const keyVersion of [input.active_key_version, ...input.retained_key_versions]) {\n    eventKeyVersionToStorage(keyVersion);\n  }\n  const raw = decodeCanonicalBase64(deps, rawBinding.raw_body_base64, 'raw_body_base64_invalid');\n  if (raw.length !== rawBinding.raw_body_size_bytes ||\n      sha256Hex(deps, raw) !== rawBinding.body_sha256) fail('verified_raw_body_mismatch');\n  let payload;\n  try {\n    payload = JSON.parse(deps.bytesToUtf8Fatal(raw));\n  } catch (_error) {\n    fail('verified_payload_json_invalid');\n  }\n  const tuple = canonicalEventTuple(payload);\n  const sender = plainObject(payload.sender) ? payload.sender : null;\n  const senderId = sender && (typeof sender.id === 'string' || Number.isSafeInteger(sender.id))\n    ? String(sender.id) : null;\n  const senderType = sender && typeof sender.type === 'string' ? sender.type.toLowerCase() : null;\n  if (!(payload.message_type === 'incoming' || payload.message_type === 0)) fail('message_not_inbound');\n  if (payload.private === true) fail('private_note_rejected');\n  if (senderType === 'bot' || senderType === 'agent_bot') fail('bot_echo_rejected');\n  if (!senderId || senderId.length > 200) fail('sender_ref_missing');\n  const eventAt = normalizedEventTime(payload.created_at);\n  if (hasOwn(payload, 'attachments') && !Array.isArray(payload.attachments)) fail('attachments_invalid');\n  const attachmentCount = Array.isArray(payload.attachments) ? payload.attachments.length : 0;\n  if (attachmentCount > 32) fail('attachments_excessive');\n  const textPresent = typeof payload.content === 'string' && payload.content.trim().length > 0;\n  const contentKind = textPresent && attachmentCount > 0 ? 'mixed'\n    : attachmentCount > 0 ? 'media' : textPresent ? 'text' : 'unsupported';\n  const route = {\n    brand_id: BRAND_ID,\n    account_id: tuple.account_id,\n    inbox_id: tuple.inbox_id,\n    channel: INBOX_CHANNELS[tuple.inbox_id],\n    conversation_id: tuple.conversation_id,\n    message_id: tuple.message_id,\n    event_at: eventAt,\n    content_kind: contentKind,\n    text_present: textPresent,\n    attachment_count: attachmentCount,\n  };\n  const keyVersions = [input.active_key_version, ...input.retained_key_versions];\n  const hmacRequests = keyVersions.map((keyVersion) => Object.freeze({\n    purpose: 'event_identity',\n    key_version: keyVersion,\n    algorithm: 'hmac-sha256',\n    encoding: 'hex',\n    material_utf8: JSON.stringify(tuple),\n  }));\n  const planCore = {\n    schema_version: '1.0',\n    kind: 'chatwoot_event_identity_plan_v1',\n    route,\n    canonical_tuple: tuple,\n    active_key_version: input.active_key_version,\n    retained_key_versions: [...input.retained_key_versions],\n    hmac_requests: hmacRequests,\n    replay_key_fingerprint: input.replay_gate.replay_key_fingerprint,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...planCore, plan_binding_sha256: binding(deps, planCore) });\n}\n\nfunction validateEventPlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'route', 'canonical_tuple', 'active_key_version',\n    'retained_key_versions', 'hmac_requests', 'replay_key_fingerprint',\n    'customer_egress_allowed', 'plan_binding_sha256',\n  ], 'event_identity_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_event_identity_plan_v1' ||\n      value.customer_egress_allowed !== false || !HEX_64.test(value.replay_key_fingerprint || '') ||\n      binding(deps, core) !== value.plan_binding_sha256) fail('event_identity_plan_invalid');\n  if (!EVENT_KEY_VERSION.test(value.active_key_version || '') ||\n      !Array.isArray(value.retained_key_versions) || !Array.isArray(value.hmac_requests)) {\n    fail('event_identity_plan_invalid');\n  }\n  return value;\n}\n\nfunction hmacResults(value, expectedRequests, reasonCode) {\n  if (!Array.isArray(value) || value.length !== expectedRequests.length) fail(reasonCode);\n  const expected = new Map(expectedRequests.map((request) =>\n    [request.purpose + ':' + request.key_version, request]));\n  const actual = new Map();\n  for (const result of value) {\n    exactObject(result, ['purpose', 'key_version', 'digest_hex'], reasonCode);\n    const key = result.purpose + ':' + result.key_version;\n    if (!expected.has(key) || actual.has(key) || !HEX_64.test(result.digest_hex || '')) fail(reasonCode);\n    actual.set(key, result.digest_hex);\n  }\n  if (actual.size !== expected.size) fail(reasonCode);\n  return actual;\n}\n\nfunction finalizeEventIdentity(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['event_plan', 'hmac_results'], 'event_identity_result_input_invalid');\n  const plan = validateEventPlan(input.event_plan, deps);\n  const results = hmacResults(input.hmac_results, plan.hmac_requests, 'event_identity_hmac_results_invalid');\n  const fingerprints = {};\n  for (const request of plan.hmac_requests) {\n    fingerprints[request.key_version] = results.get(request.purpose + ':' + request.key_version);\n  }\n  const routeRequests = [];\n  for (const keyVersion of [plan.active_key_version, ...plan.retained_key_versions]) {\n    const eventFingerprint = fingerprints[keyVersion];\n    const messageCanonical = {\n      schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.route.account_id,\n      inbox_id: plan.route.inbox_id, conversation_id: plan.route.conversation_id,\n      message_id: plan.route.message_id, direction: 'inbound', visibility: 'public',\n      event_identity_key_version: keyVersion, event_identity_fingerprint: eventFingerprint,\n    };\n    const conversationCanonical = {\n      schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.route.account_id,\n      inbox_id: plan.route.inbox_id, conversation_id: plan.route.conversation_id,\n      event_identity_key_version: keyVersion,\n    };\n    routeRequests.push(Object.freeze({\n      purpose: 'message_anchor', key_version: keyVersion, algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(messageCanonical),\n    }));\n    routeRequests.push(Object.freeze({\n      purpose: 'conversation', key_version: keyVersion, algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: CONVERSATION_FINGERPRINT_DOMAIN + JSON.stringify(conversationCanonical),\n    }));\n  }\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_event_identity_final_v1',\n    route: plan.route, canonical_tuple: plan.canonical_tuple,\n    active_key_version: plan.active_key_version,\n    retained_key_versions: plan.retained_key_versions,\n    event_identity_fingerprints: fingerprints,\n    route_hmac_requests: routeRequests,\n    replay_key_fingerprint: plan.replay_key_fingerprint,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, identity_binding_sha256: binding(deps, core) });\n}\n\nfunction validateEventIdentity(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'route', 'canonical_tuple', 'active_key_version',\n    'retained_key_versions', 'event_identity_fingerprints', 'route_hmac_requests',\n    'replay_key_fingerprint', 'customer_egress_allowed', 'identity_binding_sha256',\n  ], 'event_identity_final_invalid');\n  const core = { ...value };\n  delete core.identity_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_event_identity_final_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.identity_binding_sha256 ||\n      !Array.isArray(value.route_hmac_requests)) fail('event_identity_final_invalid');\n  return value;\n}\n\nfunction finalizeRouteFingerprints(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['event_identity', 'hmac_results'], 'route_fingerprint_input_invalid');\n  const identity = validateEventIdentity(input.event_identity, deps);\n  const results = hmacResults(input.hmac_results, identity.route_hmac_requests,\n    'route_fingerprint_hmac_results_invalid');\n  const messageFingerprints = {};\n  const conversationFingerprints = {};\n  for (const version of [identity.active_key_version, ...identity.retained_key_versions]) {\n    messageFingerprints[version] = results.get('message_anchor:' + version);\n    conversationFingerprints[version] = results.get('conversation:' + version);\n  }\n  const delayRange = DELAY_RANGES[identity.route.channel];\n  const seed = [BRAND_ID, identity.route.account_id, identity.route.inbox_id,\n    identity.route.conversation_id, identity.route.message_id].join(':');\n  const delaySeconds = deterministicDelay(seed, delayRange.minimum, delayRange.maximum);\n  const notBefore = new Date(parseIso(identity.route.event_at, 'event_time_invalid') + delaySeconds * 1000)\n    .toISOString();\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_route_identity_v1',\n    brand_id: BRAND_ID, account_id: identity.route.account_id, inbox_id: identity.route.inbox_id,\n    channel: identity.route.channel, conversation_id: identity.route.conversation_id,\n    message_id: identity.route.message_id, event_at: identity.route.event_at,\n    content_kind: identity.route.content_kind, text_present: identity.route.text_present,\n    attachment_count: identity.route.attachment_count,\n    correlation_id: 'calapres:' + identity.route.conversation_id + ':' + identity.route.message_id,\n    active_key_version: identity.active_key_version,\n    retained_key_versions: identity.retained_key_versions,\n    storage_key_versions: Object.freeze({\n      active: eventKeyVersionToStorage(identity.active_key_version),\n      retained: Object.freeze(identity.retained_key_versions.map((version) => Object.freeze({\n        event_key_version: version,\n        storage_key_version: eventKeyVersionToStorage(version),\n      }))),\n    }),\n    event_identity_fingerprints: identity.event_identity_fingerprints,\n    message_fingerprints: messageFingerprints,\n    conversation_fingerprints: conversationFingerprints,\n    replay_key_fingerprint: identity.replay_key_fingerprint,\n    delay_policy_version: DELAY_POLICY_VERSION, delay_seconds: delaySeconds, not_before: notBefore,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, route_binding_sha256: binding(deps, core) });\n}\n\nfunction httpEnvelope(value) {\n  exactObject(value, ['status_code', 'body', 'error_code'], 'http_envelope_invalid');\n  if (value.status_code !== null &&\n      (!Number.isSafeInteger(value.status_code) || value.status_code < 100 || value.status_code > 599)) {\n    fail('http_envelope_invalid');\n  }\n  if (value.status_code === null) {\n    if (value.body !== null || typeof value.error_code !== 'string' || !SAFE_ERROR_CODE.test(value.error_code)) {\n      fail('http_envelope_invalid');\n    }\n  } else if (value.error_code !== null || (value.body !== null && !plainObject(value.body))) {\n    fail('http_envelope_invalid');\n  }\n  return value;\n}\n\nfunction conversationSnapshot(envelope, expected) {\n  const http = httpEnvelope(envelope);\n  if (http.status_code !== 200 || !plainObject(http.body)) fail('conversation_read_unavailable');\n  const body = http.body;\n  const accountId = body.account_id;\n  const inboxId = hasOwn(body, 'inbox_id') ? body.inbox_id\n    : plainObject(body.inbox) ? body.inbox.id : null;\n  const conversationId = positiveToken(body.id, 'conversation_route_invalid');\n  if (accountId !== expected.account_id || inboxId !== expected.inbox_id ||\n      conversationId !== expected.conversation_id ||\n      !['open', 'resolved', 'pending', 'snoozed'].includes(body.status)) fail('conversation_route_invalid');\n  const candidates = [];\n  const add = (container, field) => {\n    if (!plainObject(container) || !hasOwn(container, field)) return true;\n    const value = container[field];\n    if (field === 'assignee_id') { candidates.push(value); return true; }\n    if (value === null) { candidates.push(null); return true; }\n    if (!plainObject(value) || !hasOwn(value, 'id')) return false;\n    if (hasOwn(value, 'account_id') && value.account_id !== expected.account_id) return false;\n    candidates.push(value.id);\n    return true;\n  };\n  if (!add(body, 'assignee_id') || !add(body, 'assignee') || !add(body.meta, 'assignee') ||\n      candidates.length === 0) fail('conversation_assignee_invalid');\n  for (const candidate of candidates) {\n    if (candidate !== null && (!Number.isSafeInteger(candidate) || candidate < 1)) {\n      fail('conversation_assignee_invalid');\n    }\n  }\n  if (candidates.some((candidate) => candidate !== candidates[0])) fail('conversation_assignee_invalid');\n  return Object.freeze({ status: body.status, assignee_id: candidates[0] });\n}\n\nfunction validateIngressCommit(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'committed',\n    'customer_egress_allowed',\n  ], 'ingress_commit_invalid');\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_ingress_commit_v1' ||\n      value.status !== 'committed' || value.response_code !== 204 || value.reason_code !== null ||\n      value.customer_egress_allowed !== false) fail('ingress_commit_required');\n  exactObject(value.committed, [\n    'brand_id', 'account_id', 'inbox_id', 'channel', 'conversation_id', 'anchor_message_id',\n    'conversation_fingerprint', 'message_fingerprint', 'correlation_id',\n    'event_identity_key_version', 'event_identity_fingerprint', 'generation',\n    'delay_policy_version', 'delay_seconds', 'not_before', 'knowledge_version',\n    'commit_binding_sha256',\n  ], 'ingress_commit_invalid');\n  const core = { ...value.committed };\n  delete core.commit_binding_sha256;\n  if (binding(deps, core) !== value.committed.commit_binding_sha256) fail('ingress_commit_binding_mismatch');\n  return value.committed;\n}\n\nfunction baselineMaterial(commit, keyVersion, kind, value) {\n  const canonical = {\n    schema_version: '1.0', brand_id: BRAND_ID, account_id: commit.account_id,\n    inbox_id: commit.inbox_id, conversation_id: commit.conversation_id,\n  };\n  if (kind === 'status') canonical.status = value;\n  else canonical.assignee_id = value;\n  return (kind === 'status' ? STATUS_FINGERPRINT_DOMAIN : ASSIGNEE_FINGERPRINT_DOMAIN) +\n    JSON.stringify(canonical);\n}\n\nfunction prepareBaseline(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['ingress_commit', 'conversation_http', 'baseline_key_version'],\n    'baseline_input_invalid');\n  const commit = validateIngressCommit(input.ingress_commit, deps);\n  if (!BASELINE_KEY_VERSION.test(input.baseline_key_version || '')) fail('baseline_key_version_invalid');\n  const snapshot = conversationSnapshot(input.conversation_http, commit);\n  const requests = [\n    Object.freeze({ purpose: 'baseline_status', key_version: input.baseline_key_version,\n      algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: baselineMaterial(commit, input.baseline_key_version, 'status', snapshot.status) }),\n    Object.freeze({ purpose: 'baseline_assignee', key_version: input.baseline_key_version,\n      algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: baselineMaterial(commit, input.baseline_key_version, 'assignee', snapshot.assignee_id) }),\n  ];\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_baseline_plan_v1', commit,\n    baseline_key_version: input.baseline_key_version, hmac_requests: requests,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });\n}\n\nfunction validateBaselinePlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'commit', 'baseline_key_version', 'hmac_requests',\n    'customer_egress_allowed', 'plan_binding_sha256',\n  ], 'baseline_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_baseline_plan_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||\n      !BASELINE_KEY_VERSION.test(value.baseline_key_version || '') || !Array.isArray(value.hmac_requests)) {\n    fail('baseline_plan_invalid');\n  }\n  return value;\n}\n\nfunction validateWaitState(value, deps) {\n  exactObject(value, WAIT_CARRIER_EXACT_KEYS, 'wait_state_shape_invalid');\n  if (value.schema_version !== '1.0' || value.brand_id !== BRAND_ID || value.account_id !== ACCOUNT_ID ||\n      INBOX_CHANNELS[value.inbox_id] !== value.channel || value.customer_egress_allowed !== false ||\n      value.fixture_ref !== null || value.delay_mode !== 'live_observation' ||\n      value.delay_policy_version !== DELAY_POLICY_VERSION ||\n      !EVENT_KEY_VERSION.test(value.event_identity_key_version || '') ||\n      !BASELINE_KEY_VERSION.test(value.baseline_fingerprint_key_version || '') ||\n      !KNOWLEDGE_VERSION.test(value.knowledge_version || '') ||\n      !Number.isSafeInteger(value.generation) || value.generation < 1) fail('wait_state_invalid');\n  positiveToken(value.conversation_id, 'wait_state_invalid');\n  positiveToken(value.anchor_message_id, 'wait_state_invalid');\n  for (const field of [\n    'conversation_fingerprint', 'message_fingerprint', 'event_identity_fingerprint',\n    'baseline_status_fingerprint', 'baseline_assignee_fingerprint', 'wait_state_fingerprint',\n  ]) if (!HEX_64.test(value[field] || '')) fail('wait_state_invalid');\n  parseIso(value.not_before, 'wait_state_invalid');\n  const core = { ...value };\n  delete core.wait_state_fingerprint;\n  if (sha256Text(deps, orderedJson(core, WAIT_CARRIER_FIELD_ORDER)) !== value.wait_state_fingerprint) {\n    fail('wait_state_fingerprint_mismatch');\n  }\n  return value;\n}\n\nfunction finalizeWaitState(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['baseline_plan', 'hmac_results'], 'wait_state_input_invalid');\n  const plan = validateBaselinePlan(input.baseline_plan, deps);\n  const results = hmacResults(input.hmac_results, plan.hmac_requests, 'baseline_hmac_results_invalid');\n  const commit = plan.commit;\n  const wait = {\n    schema_version: '1.0', brand_id: BRAND_ID, account_id: commit.account_id,\n    inbox_id: commit.inbox_id, channel: commit.channel, conversation_id: commit.conversation_id,\n    anchor_message_id: commit.anchor_message_id,\n    conversation_fingerprint: commit.conversation_fingerprint,\n    message_fingerprint: commit.message_fingerprint, correlation_id: commit.correlation_id,\n    event_identity_key_version: commit.event_identity_key_version,\n    event_identity_fingerprint: commit.event_identity_fingerprint, generation: commit.generation,\n    baseline_fingerprint_key_version: plan.baseline_key_version,\n    baseline_status_fingerprint: results.get('baseline_status:' + plan.baseline_key_version),\n    baseline_assignee_fingerprint: results.get('baseline_assignee:' + plan.baseline_key_version),\n    delay_policy_version: commit.delay_policy_version, delay_mode: 'live_observation',\n    delay_seconds: commit.delay_seconds, not_before: commit.not_before,\n    knowledge_version: commit.knowledge_version, fixture_ref: null, customer_egress_allowed: false,\n  };\n  wait.wait_state_fingerprint = sha256Text(deps, orderedJson(wait, WAIT_CARRIER_FIELD_ORDER));\n  validateWaitState(wait, deps);\n  return Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_identifiers_only_wait_v1', status: 'ready',\n    wait_state: Object.freeze(wait), customer_egress_allowed: false,\n  });\n}\n\nfunction normalizeMessageRow(row, wait, deps) {\n  if (!plainObject(row) || !Number.isSafeInteger(row.id) || row.id < 1 ||\n      row.account_id !== wait.account_id || row.inbox_id !== wait.inbox_id ||\n      positiveToken(row.conversation_id, 'message_row_invalid') !== wait.conversation_id ||\n      ![0, 1, 2].includes(row.message_type) || typeof row.private !== 'boolean' ||\n      !Number.isSafeInteger(row.created_at) || row.created_at < 0) fail('message_row_invalid');\n  if (hasOwn(row, 'content') && row.content !== null && typeof row.content !== 'string') {\n    fail('message_content_invalid');\n  }\n  const content = typeof row.content === 'string' ? row.content : '';\n  const contentBytes = deps.utf8ToBytes(content);\n  if (contentBytes.length > MAX_RAW_BODY_SIZE_BYTES) fail('message_content_excessive');\n  if (hasOwn(row, 'attachments') && !Array.isArray(row.attachments)) fail('message_attachments_invalid');\n  const attachmentCount = Array.isArray(row.attachments) ? row.attachments.length : 0;\n  if (attachmentCount > 32) fail('message_attachments_excessive');\n  const senderType = plainObject(row.sender) && typeof row.sender.type === 'string'\n    ? row.sender.type.toLowerCase() : null;\n  const direction = row.message_type === 0 ? 'inbound' : row.message_type === 1 ? 'outbound' : 'activity';\n  const visibility = row.private ? 'private' : 'public';\n  return Object.freeze({\n    id: row.id, message_type: row.message_type, private: row.private,\n    created_at: isoFromEpochSeconds(row.created_at), sender_type: senderType,\n    direction, visibility, content_sha256: sha256Hex(deps, contentBytes),\n    attachment_count: attachmentCount,\n    anchor_content: String(row.id) === wait.anchor_message_id ? content : null,\n  });\n}\n\nfunction scanRows(envelope, wait, deps) {\n  const http = httpEnvelope(envelope);\n  if (http.status_code !== 200 || !plainObject(http.body) || !Array.isArray(http.body.payload)) {\n    fail('message_scan_unavailable');\n  }\n  if (http.body.payload.length < 1) fail('anchor_missing');\n  if (http.body.payload.length >= SCAN_PAGE_SIZE_LIMIT) fail('scan_truncated');\n  const rows = http.body.payload.map((row) => normalizeMessageRow(row, wait, deps));\n  const anchor = Number(wait.anchor_message_id);\n  if (new Set(rows.map((row) => row.id)).size !== rows.length ||\n      rows.some((row) => row.id < anchor)) {\n    fail('message_scan_invalid');\n  }\n  const anchors = rows.filter((row) => row.id === anchor);\n  if (anchors.length !== 1) fail('anchor_missing');\n  if (anchors[0].message_type !== 0 || anchors[0].private !== false) fail('anchor_invalid');\n  if (rows.filter((row) => row.message_type !== 2).length < 1) fail('message_scan_invalid');\n  return rows;\n}\n\nfunction prepareBoundedReread(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, [\n    'schema_version', 'wait_state', 'read_started_epoch_seconds', 'conversation_before',\n    'messages_first', 'messages_second', 'conversation_after',\n  ], 'reread_input_invalid');\n  if (input.schema_version !== '1.0' || !Number.isSafeInteger(input.read_started_epoch_seconds) ||\n      input.read_started_epoch_seconds < 0) fail('reread_input_invalid');\n  const wait = validateWaitState(input.wait_state, deps);\n  if (input.read_started_epoch_seconds * 1000 < parseIso(wait.not_before, 'wait_state_invalid')) {\n    fail('wait_not_elapsed');\n  }\n  const before = conversationSnapshot(input.conversation_before, wait);\n  const firstRows = scanRows(input.messages_first, wait, deps);\n  const secondRows = scanRows(input.messages_second, wait, deps);\n  const after = conversationSnapshot(input.conversation_after, wait);\n  const uniqueRows = new Map();\n  for (const row of [...firstRows, ...secondRows]) {\n    const existing = uniqueRows.get(row.id);\n    const stable = { ...row, anchor_content: null };\n    if (existing && stableJson({ ...existing, anchor_content: null }) !== stableJson(stable)) {\n      fail('scan_changed');\n    }\n    uniqueRows.set(row.id, row);\n  }\n  const anchorId = Number(wait.anchor_message_id);\n  const anchorTuple = {\n    schema_version: '1.0', account_id: wait.account_id, inbox_id: wait.inbox_id,\n    event: 'message_created', conversation_id: wait.conversation_id,\n    message_id: wait.anchor_message_id,\n  };\n  const eventRequests = [Object.freeze({ purpose: 'message_event_' + anchorId,\n    key_version: wait.event_identity_key_version, algorithm: 'hmac-sha256', encoding: 'hex',\n    material_utf8: JSON.stringify(anchorTuple) })];\n  const baselineRequests = [\n    ['conversation_before_status', 'status', before.status],\n    ['conversation_before_assignee', 'assignee', before.assignee_id],\n    ['conversation_after_status', 'status', after.status],\n    ['conversation_after_assignee', 'assignee', after.assignee_id],\n  ].map(([purpose, kind, value]) => Object.freeze({\n    purpose, key_version: wait.baseline_fingerprint_key_version,\n    algorithm: 'hmac-sha256', encoding: 'hex',\n    material_utf8: baselineMaterial(wait, wait.baseline_fingerprint_key_version, kind, value),\n  }));\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_bounded_reread_plan_v1', wait_state: wait,\n    read_started_at: isoFromEpochSeconds(input.read_started_epoch_seconds),\n    first_rows: firstRows, second_rows: secondRows,\n    event_hmac_requests: eventRequests, baseline_hmac_requests: baselineRequests,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });\n}\n\nfunction validateRereadPlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'wait_state', 'read_started_at', 'first_rows', 'second_rows',\n    'event_hmac_requests', 'baseline_hmac_requests', 'customer_egress_allowed',\n    'plan_binding_sha256',\n  ], 'reread_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_bounded_reread_plan_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||\n      !Array.isArray(value.first_rows) || !Array.isArray(value.second_rows) ||\n      !Array.isArray(value.event_hmac_requests) || !Array.isArray(value.baseline_hmac_requests)) {\n    fail('reread_plan_invalid');\n  }\n  validateWaitState(value.wait_state, deps);\n  return value;\n}\n\nfunction prepareRereadMessageFingerprints(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['reread_plan', 'event_hmac_results'], 'reread_event_results_input_invalid');\n  const plan = validateRereadPlan(input.reread_plan, deps);\n  const events = hmacResults(input.event_hmac_results, plan.event_hmac_requests,\n    'reread_event_hmac_results_invalid');\n  const anchorId = Number(plan.wait_state.anchor_message_id);\n  const anchors = plan.second_rows.filter((row) => row.id === anchorId);\n  if (anchors.length !== 1) fail('anchor_missing');\n  const eventFingerprint = events.get(\n    'message_event_' + anchorId + ':' + plan.wait_state.event_identity_key_version,\n  );\n  const canonical = {\n    schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.wait_state.account_id,\n    inbox_id: plan.wait_state.inbox_id, conversation_id: plan.wait_state.conversation_id,\n    message_id: plan.wait_state.anchor_message_id,\n    direction: anchors[0].direction, visibility: anchors[0].visibility,\n    event_identity_key_version: plan.wait_state.event_identity_key_version,\n    event_identity_fingerprint: eventFingerprint,\n  };\n  const messageRequests = [Object.freeze({ purpose: 'message_anchor_' + anchorId,\n    key_version: plan.wait_state.event_identity_key_version, algorithm: 'hmac-sha256',\n    encoding: 'hex',\n    material_utf8: ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(canonical) })];\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_reread_message_plan_v1', reread_plan: plan,\n    event_hmac_results: input.event_hmac_results, message_hmac_requests: messageRequests,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });\n}\n\nfunction validateMessagePlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'reread_plan', 'event_hmac_results', 'message_hmac_requests',\n    'customer_egress_allowed', 'plan_binding_sha256',\n  ], 'reread_message_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_reread_message_plan_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||\n      !Array.isArray(value.message_hmac_requests)) fail('reread_message_plan_invalid');\n  validateRereadPlan(value.reread_plan, deps);\n  return value;\n}\n\nfunction gateState(value) {\n  exactObject(value, [\n    'current_generation', 'idempotency_consumed', 'brand_enabled', 'kill_switch',\n  ], 'post_delay_gate_state_invalid');\n  if (!Number.isSafeInteger(value.current_generation) || value.current_generation < 1 ||\n      typeof value.idempotency_consumed !== 'boolean' || typeof value.brand_enabled !== 'boolean' ||\n      typeof value.kill_switch !== 'boolean') fail('post_delay_gate_state_invalid');\n  return value;\n}\n\nfunction setFingerprint(deps, rows) {\n  const canonicalRows = rows.map((row) => ({\n    id: row.id,\n    message_type: row.message_type,\n    private: row.private,\n    created_at: row.created_at,\n    sender_type: row.sender_type,\n    direction: row.direction,\n    visibility: row.visibility,\n    content_sha256: row.content_sha256,\n    attachment_count: row.attachment_count,\n  })).sort((left, right) => left.id - right.id);\n  return sha256Text(deps, MESSAGE_SET_FINGERPRINT_DOMAIN + JSON.stringify(canonicalRows));\n}\n\nfunction finalizePostDelay(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, [\n    'message_plan', 'message_hmac_results', 'baseline_hmac_results', 'gate_state',\n    'evaluated_epoch_seconds',\n  ], 'post_delay_input_invalid');\n  const plan = validateMessagePlan(input.message_plan, deps);\n  const reread = plan.reread_plan;\n  const wait = reread.wait_state;\n  const eventResults = hmacResults(plan.event_hmac_results, reread.event_hmac_requests,\n    'reread_event_hmac_results_invalid');\n  const messageResults = hmacResults(input.message_hmac_results, plan.message_hmac_requests,\n    'reread_message_hmac_results_invalid');\n  const baselineResults = hmacResults(input.baseline_hmac_results, reread.baseline_hmac_requests,\n    'reread_baseline_hmac_results_invalid');\n  const state = gateState(input.gate_state);\n  if (!Number.isSafeInteger(input.evaluated_epoch_seconds) || input.evaluated_epoch_seconds < 0 ||\n      input.evaluated_epoch_seconds * 1000 < parseIso(reread.read_started_at, 'reread_time_invalid')) {\n    fail('reread_time_invalid');\n  }\n  const first = reread.first_rows;\n  const second = reread.second_rows;\n  const firstSet = setFingerprint(deps, first);\n  const secondSet = setFingerprint(deps, second);\n  const anchorId = Number(wait.anchor_message_id);\n  const firstAnchor = first.filter((row) => row.id === anchorId);\n  const secondAnchor = second.filter((row) => row.id === anchorId);\n  const anchorEventFingerprint = eventResults.get(\n    'message_event_' + anchorId + ':' + wait.event_identity_key_version,\n  );\n  const anchorMessageFingerprint = messageResults.get(\n    'message_anchor_' + anchorId + ':' + wait.event_identity_key_version,\n  );\n  if (firstAnchor.length !== 1 || secondAnchor.length !== 1 ||\n      firstSet !== secondSet || firstAnchor[0].content_sha256 !== secondAnchor[0].content_sha256 ||\n      anchorMessageFingerprint !== wait.message_fingerprint ||\n      anchorEventFingerprint !== wait.event_identity_fingerprint) {\n    fail('bounded_reread_binding_failed');\n  }\n  const key = wait.baseline_fingerprint_key_version;\n  const beforeStatus = baselineResults.get('conversation_before_status:' + key);\n  const beforeAssignee = baselineResults.get('conversation_before_assignee:' + key);\n  const afterStatus = baselineResults.get('conversation_after_status:' + key);\n  const afterAssignee = baselineResults.get('conversation_after_assignee:' + key);\n  const rows = second;\n  const latest = (predicate) => {\n    const matches = rows.filter(predicate);\n    return matches.length ? matches.reduce((a, b) => a.id > b.id ? a : b) : null;\n  };\n  const latestInbound = latest((row) => row.message_type === 0 && row.private === false);\n  const latestHuman = latest((row) => row.message_type === 1 && row.private === false &&\n    ['user', 'agent'].includes(row.sender_type));\n  const latestPrivate = latest((row) => row.message_type !== 2 && row.private === true);\n  const latestNonActivity = latest((row) => row.message_type !== 2);\n  let cancellationReason = null;\n  if (beforeStatus !== afterStatus || beforeAssignee !== afterAssignee) cancellationReason = 'conversation_changed';\n  else if (afterStatus !== wait.baseline_status_fingerprint) cancellationReason = 'status_changed';\n  else if (afterAssignee !== wait.baseline_assignee_fingerprint) cancellationReason = 'assignee_changed';\n  else if (!state.brand_enabled) cancellationReason = 'brand_disabled';\n  else if (state.kill_switch) cancellationReason = 'brand_kill_switch';\n  else if (state.idempotency_consumed) cancellationReason = 'idempotency_consumed';\n  else if (state.current_generation !== wait.generation) cancellationReason = 'stale_generation';\n  else if (latestInbound && latestInbound.id > anchorId) cancellationReason = 'newer_inbound';\n  else if (latestHuman && latestHuman.id > anchorId) cancellationReason = 'human_intervention';\n  else if (latestPrivate && latestPrivate.id > anchorId) cancellationReason = 'private_note_present';\n  else if (latestNonActivity && latestNonActivity.id > anchorId) cancellationReason = 'newer_non_activity';\n  const eligible = cancellationReason === null;\n  const anchor = secondAnchor[0];\n  const summaryCore = {\n    wait_state_fingerprint: wait.wait_state_fingerprint,\n    scan_first_count: first.length, scan_second_count: second.length,\n    scan_first_set_fingerprint: firstSet, scan_second_set_fingerprint: secondSet,\n    anchor_message_id: wait.anchor_message_id,\n    anchor_message_fingerprint: anchorMessageFingerprint,\n    current_generation: state.current_generation,\n    expected_generation: wait.generation,\n    conversation_snapshots_stable: beforeStatus === afterStatus && beforeAssignee === afterAssignee,\n    evaluated_at: isoFromEpochSeconds(input.evaluated_epoch_seconds),\n  };\n  const verifiedAnchor = eligible ? Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_verified_anchor_for_llm_v1',\n    account_id: wait.account_id, inbox_id: wait.inbox_id, channel: wait.channel,\n    conversation_id: wait.conversation_id, message_id: wait.anchor_message_id,\n    content: anchor.anchor_content, content_sha256: anchor.content_sha256,\n    attachment_count: anchor.attachment_count, transient_only: true,\n    persistence_allowed: false, customer_egress_allowed: false,\n  }) : null;\n  return Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_post_delay_stage_v1',\n    status: eligible ? 'eligible' : 'cancelled', eligible_for_observation: eligible,\n    cancellation_reason: cancellationReason,\n    live_reread_summary: Object.freeze({ ...summaryCore,\n      summary_binding_sha256: binding(deps, summaryCore) }),\n    verified_anchor: verifiedAnchor,\n    transient_only: true, persistence_allowed: false, customer_egress_allowed: false,\n  });\n}\n\nfunction failClosedEnvelope(stage, error) {\n  const reasonCode = error instanceof FailClosedError ? error.reasonCode : 'stage_unexpected_failure';\n  if (typeof stage !== 'string' || !/^[a-z][a-z0-9_]{2,80}$/.test(stage)) {\n    fail('stage_name_invalid');\n  }\n  return Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_stage_failure_v1', stage,\n    status: 'fail_closed', reason_code: reasonCode,\n    customer_egress_allowed: false,\n  });\n}\n\nfunction createChatwootObservationStages(injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  return Object.freeze({\n    prepareSignedIngress: (input) => prepareSignedIngress(input, deps),\n    finalizeSignedHmac: (input) => finalizeSignedHmac(input, deps),\n    prepareEventIdentity: (input) => prepareEventIdentity(input, deps),\n    finalizeEventIdentity: (input) => finalizeEventIdentity(input, deps),\n    finalizeRouteFingerprints: (input) => finalizeRouteFingerprints(input, deps),\n    prepareBaseline: (input) => prepareBaseline(input, deps),\n    finalizeWaitState: (input) => finalizeWaitState(input, deps),\n    prepareBoundedReread: (input) => prepareBoundedReread(input, deps),\n    prepareRereadMessageFingerprints: (input) => prepareRereadMessageFingerprints(input, deps),\n    finalizePostDelay: (input) => finalizePostDelay(input, deps),\n    validateWaitState: (input) => validateWaitState(input, deps),\n  });\n}\n\n__edgeModule.exports = Object.freeze({\n  ACCOUNT_ID,\n  BRAND_ID,\n  INBOX_CHANNELS,\n  MAX_RAW_BODY_SIZE_BYTES,\n  MAX_AGE_SECONDS,\n  MAX_FUTURE_SKEW_SECONDS,\n  SCAN_PAGE_SIZE_LIMIT,\n  EVENT_IDENTITY_CANONICAL_FORMAT,\n  EVENT_TO_STORAGE_KEY_VERSION,\n  STORAGE_TO_EVENT_KEY_VERSION,\n  WAIT_CARRIER_FIELD_ORDER,\n  PARITY_MANIFEST,\n  PARITY_MANIFEST_SHA256,\n  FailClosedError,\n  stableJson,\n  canonicalEventTuple,\n  eventKeyVersionToStorage,\n  storageKeyVersionToEvent,\n  failClosedEnvelope,\n  createChatwootObservationStages,\n});\n\n\nfunction __edgeSha256Hex(input) {\n  const source = input instanceof Uint8Array ? Array.from(input) : [];\n  const bytes = source.slice();\n  const bitLength = bytes.length * 8;\n  const constants = [\n    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,\n    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,\n    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,\n    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,\n    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,\n    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,\n    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,\n    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2\n  ];\n  const rotate = (value, shift) => (value >>> shift) | (value << (32 - shift));\n  bytes.push(0x80);\n  while (bytes.length % 64 !== 56) bytes.push(0);\n  const high = Math.floor(bitLength / 0x100000000);\n  const low = bitLength >>> 0;\n  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);\n  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);\n  const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];\n  const words = new Uint32Array(64);\n  for (let offset = 0; offset < bytes.length; offset += 64) {\n    for (let index = 0; index < 16; index += 1) {\n      const start = offset + index * 4;\n      words[index] = ((bytes[start] << 24) | (bytes[start + 1] << 16) |\n        (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0;\n    }\n    for (let index = 16; index < 64; index += 1) {\n      const x = words[index - 15];\n      const y = words[index - 2];\n      const sigma0 = rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3);\n      const sigma1 = rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10);\n      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;\n    }\n    let [a,b,c,d,e,f,g,h] = hash;\n    for (let index = 0; index < 64; index += 1) {\n      const sum1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);\n      const choose = (e & f) ^ (~e & g);\n      const temporary1 = (h + sum1 + choose + constants[index] + words[index]) >>> 0;\n      const sum0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);\n      const majority = (a & b) ^ (a & c) ^ (b & c);\n      const temporary2 = (sum0 + majority) >>> 0;\n      h = g; g = f; f = e; e = (d + temporary1) >>> 0;\n      d = c; c = b; b = a; a = (temporary1 + temporary2) >>> 0;\n    }\n    hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;\n    hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;\n    hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;\n    hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;\n  }\n  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');\n}\nfunction __edgeTimingSafeEqualHex(left, right) {\n  if (!/^[a-f0-9]{64}$/.test(left || '') || !/^[a-f0-9]{64}$/.test(right || '')) return false;\n  let difference = 0;\n  for (let index = 0; index < 64; index += 1) {\n    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);\n  }\n  return difference === 0;\n}\nconst __edgeDependencies = Object.freeze({\n  base64ToBytes: (value) => new Uint8Array(Buffer.from(value, 'base64')),\n  bytesToBase64: (value) => Buffer.from(value).toString('base64'),\n  utf8ToBytes: (value) => new Uint8Array(Buffer.from(value, 'utf8')),\n  bytesToUtf8Fatal: (value) => new TextDecoder('utf-8', { fatal: true }).decode(value),\n  sha256Hex: __edgeSha256Hex,\n  timingSafeEqualHex: __edgeTimingSafeEqualHex\n});\nconst __edgeStages = __edgeModule.exports.createChatwootObservationStages(__edgeDependencies);\nfunction __edgeFailure(stage, error) {\n  return __edgeModule.exports.failClosedEnvelope(stage, error);\n}\nfunction __edgeHttpEnvelope(value) {\n  const source = value && typeof value === 'object' ? value : {};\n  const status = Number.isSafeInteger(source.statusCode) ? source.statusCode\n    : Number.isSafeInteger(source.status_code) ? source.status_code : null;\n  return {\n    status_code: status,\n    body: status === null ? null : (source.body && typeof source.body === 'object' ? source.body : null),\n    error_code: status === null ? 'chatwoot_read_unknown' : null\n  };\n}\n\nconst __reconciliationModule = { exports: {} };\n(function(){\n'use strict';\n\n/*\n * Pure, credential-free Chatwoot reconciliation contract for the Calapres Edge.\n *\n * This module performs no network, credential, database, filesystem, clock, wait,\n * workflow, model, or customer-send action. Callers inject only deterministic\n * hashing and owner-approved non-secret release controls. Native workflow nodes\n * must own HTTP/HMAC/database effects and must project Chatwoot responses to the\n * exact PII-free shapes accepted here before invoking this runtime.\n */\n\nconst BRAND_ID = 'calapres';\nconst ACCOUNT_ID = 179973;\nconst SOURCE = 'chatwoot_reconciliation_v1';\nconst CANONICAL_TUPLE_FORMAT =\n  'json-minified-ordered:[schema_version,account_id,inbox_id,event,conversation_id,message_id]';\nconst INBOX_CHANNELS = Object.freeze({\n  128031: 'instagram',\n  128033: 'tiktok',\n  128058: 'whatsapp',\n  128326: 'email',\n});\nconst MAX_DISCOVERY_ROWS = 100;\nconst MAX_DISCOVERY_PAGES = 100;\nconst MAX_MESSAGE_ROWS = 100;\nconst MAX_FINALIZABLE_MESSAGE_ROWS = 99;\nconst MAX_RETAINED_KEY_VERSIONS = 8;\nconst KEY_VERSION = /^calapres-identity-hmac-v[1-9][0-9]*$/;\nconst POLICY_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;\nconst SAFE_CODE = /^[a-z][a-z0-9_]{2,80}$/;\nconst OPAQUE_ID = /^[A-Za-z0-9:_-]{4,160}$/;\nconst BUSINESS_CLAIM_ID = /^bev_claim_[A-Za-z0-9_-]{4,120}$/;\nconst JOB_ID = /^job_[A-Za-z0-9_-]{4,120}$/;\nconst HEX_24 = /^[a-f0-9]{24}$/;\nconst HEX_64 = /^[a-f0-9]{64}$/;\nconst POSITIVE_TOKEN = /^[1-9][0-9]{0,30}$/;\nconst STRICT_ISO_TIMESTAMP =\n  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;\nconst DISCOVERY_PAGE_KEYS = Object.freeze([\n  'schema_version', 'kind', 'status_code', 'account_id', 'inbox_id', 'requested_page',\n  'retry_after_seconds', 'error_code', 'all_count', 'rows',\n]);\nconst DISCOVERY_ROW_KEYS = Object.freeze(['id', 'account_id', 'inbox_id', 'status']);\nconst MESSAGE_PAGE_KEYS = Object.freeze([\n  'schema_version', 'kind', 'status_code', 'account_id', 'inbox_id', 'conversation_id',\n  'requested_after_message_id', 'retry_after_seconds', 'error_code', 'rows',\n]);\nconst MESSAGE_ROW_KEYS = Object.freeze([\n  'id', 'account_id', 'inbox_id', 'conversation_id', 'created_at', 'message_type',\n  'private', 'sender_type', 'attachment_count',\n]);\nconst MESSAGE_TYPES = new Set([0, 1, 2, 3]);\nconst SENDER_TYPES = new Set(['contact', 'user', 'agent', 'agent_bot', 'bot', null]);\nconst CONVERSATION_STATUSES = new Set(['open', 'resolved', 'pending', 'snoozed']);\nconst DURABLE_OUTCOMES = new Set(['durable_bound', 'durable_duplicate']);\nconst DETERMINISTIC_EXCLUSION_REASONS = new Set([\n  'before_activation_floor',\n  'private_message',\n  'outgoing_message',\n  'activity_message',\n  'template_message',\n  'bot_echo',\n]);\nconst PROOF_ROW_KEYS = Object.freeze([\n  'message_id',\n  'classification',\n  'outcome',\n  'reason_code',\n  'created_at',\n  'message_type',\n  'private',\n  'sender_type',\n  'event_identity_key_version',\n  'event_identity_fingerprint',\n  'business_claim_id',\n  'job_id',\n  'generation',\n]);\nconst CURSOR_PROOF_CANONICAL_FORMAT =\n  'utf8(domain+stable-json-v1);object-keys-recursive-lexicographic;array-order-preserved';\nconst CURSOR_PAGE_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-cursor-page-binding-v1:';\nconst CURSOR_OUTCOME_DIGEST_DOMAIN =\n  'calapres-chatwoot-reconciliation-cursor-outcome-digest-v1:';\n\nclass ReconciliationContractError extends Error {\n  constructor(reasonCode) {\n    super(reasonCode);\n    this.name = 'ReconciliationContractError';\n    this.reasonCode = reasonCode;\n  }\n}\n\nfunction fail(reasonCode) {\n  throw new ReconciliationContractError(reasonCode);\n}\n\nfunction plainObject(value) {\n  return value !== null && typeof value === 'object' && !Array.isArray(value);\n}\n\nfunction exactObject(value, fields, reasonCode) {\n  if (!plainObject(value)) fail(reasonCode);\n  const expected = fields instanceof Set ? fields : new Set(fields);\n  const keys = Object.keys(value);\n  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) fail(reasonCode);\n  return value;\n}\n\nfunction deepFreeze(value) {\n  if (Array.isArray(value)) {\n    value.forEach(deepFreeze);\n  } else if (plainObject(value)) {\n    Object.values(value).forEach(deepFreeze);\n  }\n  return Object.freeze(value);\n}\n\nfunction stableJson(value) {\n  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';\n  if (plainObject(value)) {\n    return '{' + Object.keys(value).sort().map((key) =>\n      JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';\n  }\n  return JSON.stringify(value);\n}\n\nfunction parseIso(value, reasonCode) {\n  if (typeof value !== 'string' || !STRICT_ISO_TIMESTAMP.test(value)) fail(reasonCode);\n  const parsed = Date.parse(value);\n  if (!Number.isFinite(parsed)) fail(reasonCode);\n  return parsed;\n}\n\nfunction normalizeIso(value, reasonCode) {\n  return new Date(parseIso(value, reasonCode)).toISOString();\n}\n\nfunction safeInteger(value, minimum, maximum, reasonCode) {\n  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(reasonCode);\n  return value;\n}\n\nfunction positiveToken(value, reasonCode) {\n  if (Number.isSafeInteger(value) && value > 0) return String(value);\n  if (typeof value !== 'string' || !POSITIVE_TOKEN.test(value)) fail(reasonCode);\n  const numeric = Number(value);\n  if (!Number.isSafeInteger(numeric) || String(numeric) !== value) fail(reasonCode);\n  return value;\n}\n\nfunction tokenToInteger(value, reasonCode) {\n  return Number(positiveToken(value, reasonCode));\n}\n\nfunction channelForInbox(inboxId) {\n  safeInteger(inboxId, 1, Number.MAX_SAFE_INTEGER, 'inbox_id_invalid');\n  const channel = INBOX_CHANNELS[inboxId];\n  if (!channel) fail('inbox_not_allowlisted');\n  return channel;\n}\n\nfunction validateAccountInbox(accountId, inboxId) {\n  if (accountId !== ACCOUNT_ID) fail('account_not_allowlisted');\n  return channelForInbox(inboxId);\n}\n\nfunction safeErrorCode(value, reasonCode) {\n  if (value !== null && (typeof value !== 'string' || !SAFE_CODE.test(value))) fail(reasonCode);\n  return value;\n}\n\nfunction validateTransportFields(statusCode, retryAfterSeconds, errorCode, rows, reasonCode) {\n  if (statusCode !== null) safeInteger(statusCode, 100, 599, reasonCode);\n  if (retryAfterSeconds !== null) safeInteger(retryAfterSeconds, 1, 86400, reasonCode);\n  safeErrorCode(errorCode, reasonCode);\n  if (statusCode === 200) {\n    if (retryAfterSeconds !== null || errorCode !== null || !Array.isArray(rows)) fail(reasonCode);\n    return null;\n  }\n  if (rows !== null) fail(reasonCode);\n  if (statusCode === null && errorCode === null) fail(reasonCode);\n  if (statusCode === 429) return ['retry_later', 'chatwoot_rate_limited'];\n  if (statusCode !== null && statusCode >= 500) return ['retry_later', 'chatwoot_server_unavailable'];\n  if (statusCode === null) return ['retry_later', errorCode];\n  if (statusCode === 401) return ['fail_closed', 'chatwoot_unauthorized'];\n  if (statusCode === 403) return ['fail_closed', 'chatwoot_forbidden'];\n  if (statusCode === 404) return ['fail_closed', 'chatwoot_route_not_found'];\n  return ['fail_closed', 'chatwoot_unexpected_status'];\n}\n\nfunction canonicalTuple(accountId, inboxId, conversationId, messageId) {\n  return Object.freeze({\n    schema_version: '1.0',\n    account_id: accountId,\n    inbox_id: inboxId,\n    event: 'message_created',\n    conversation_id: positiveToken(conversationId, 'conversation_id_invalid'),\n    message_id: positiveToken(messageId, 'message_id_invalid'),\n  });\n}\n\nfunction orderedTupleJson(tuple) {\n  return JSON.stringify({\n    schema_version: tuple.schema_version,\n    account_id: tuple.account_id,\n    inbox_id: tuple.inbox_id,\n    event: tuple.event,\n    conversation_id: tuple.conversation_id,\n    message_id: tuple.message_id,\n  });\n}\n\nfunction normalizeProofRows(value) {\n  if (!Array.isArray(value) || value.length < 1 ||\n      value.length > MAX_FINALIZABLE_MESSAGE_ROWS) {\n    fail('proof_rows_invalid');\n  }\n  const normalized = [];\n  let previousMessageId = 0;\n  for (const sourceRow of value) {\n    exactObject(sourceRow, PROOF_ROW_KEYS, 'proof_row_invalid');\n    const messageId = positiveToken(sourceRow.message_id, 'proof_message_id_invalid');\n    const numericMessageId = tokenToInteger(messageId, 'proof_message_id_invalid');\n    if (numericMessageId <= previousMessageId) fail('proof_rows_not_strictly_sorted');\n    previousMessageId = numericMessageId;\n    const candidate = sourceRow.classification === 'event_candidate';\n    const excluded = sourceRow.classification === 'deterministically_excluded';\n    if (!candidate && !excluded) fail('proof_classification_invalid');\n    if (candidate) {\n      if (!DURABLE_OUTCOMES.has(sourceRow.outcome) || sourceRow.reason_code !== null ||\n          sourceRow.created_at !== null || sourceRow.message_type !== null ||\n          sourceRow.private !== null || sourceRow.sender_type !== null ||\n          !KEY_VERSION.test(sourceRow.event_identity_key_version || '') ||\n          !HEX_64.test(sourceRow.event_identity_fingerprint || '') ||\n          typeof sourceRow.business_claim_id !== 'string' ||\n          !BUSINESS_CLAIM_ID.test(sourceRow.business_claim_id) ||\n          typeof sourceRow.job_id !== 'string' || !JOB_ID.test(sourceRow.job_id) ||\n          !Number.isSafeInteger(sourceRow.generation) || sourceRow.generation < 1 ||\n          sourceRow.generation > 2147483647) {\n        fail('candidate_proof_invalid');\n      }\n    } else {\n      if (sourceRow.outcome !== 'deterministically_excluded' ||\n          !DETERMINISTIC_EXCLUSION_REASONS.has(sourceRow.reason_code) ||\n          !Number.isSafeInteger(sourceRow.created_at) || sourceRow.created_at < 0 ||\n          sourceRow.created_at > 253402300799 || !MESSAGE_TYPES.has(sourceRow.message_type) ||\n          typeof sourceRow.private !== 'boolean' || !SENDER_TYPES.has(sourceRow.sender_type) ||\n          sourceRow.event_identity_key_version !== null ||\n          sourceRow.event_identity_fingerprint !== null ||\n          sourceRow.business_claim_id !== null || sourceRow.job_id !== null ||\n          sourceRow.generation !== null) {\n        fail('exclusion_proof_invalid');\n      }\n    }\n    normalized.push({\n      message_id: messageId,\n      classification: sourceRow.classification,\n      outcome: sourceRow.outcome,\n      reason_code: sourceRow.reason_code,\n      created_at: sourceRow.created_at,\n      message_type: sourceRow.message_type,\n      private: sourceRow.private,\n      sender_type: sourceRow.sender_type,\n      event_identity_key_version: sourceRow.event_identity_key_version,\n      event_identity_fingerprint: sourceRow.event_identity_fingerprint,\n      business_claim_id: sourceRow.business_claim_id,\n      job_id: sourceRow.job_id,\n      generation: sourceRow.generation,\n    });\n  }\n  return normalized;\n}\n\nfunction deterministicExclusionReason(row, activationFloorEpochMilliseconds) {\n  if (row.created_at * 1000 < activationFloorEpochMilliseconds) {\n    return 'before_activation_floor';\n  }\n  if (row.private === true) return 'private_message';\n  if (row.message_type === 1) return 'outgoing_message';\n  if (row.message_type === 2) return 'activity_message';\n  if (row.message_type === 3) return 'template_message';\n  if (row.sender_type === 'agent_bot' || row.sender_type === 'bot') return 'bot_echo';\n  return null;\n}\n\nfunction cursorProofCanonical(input) {\n  exactObject(input, [\n    'schema_version', 'source', 'brand_id', 'account_id', 'inbox_id', 'channel',\n    'conversation_id', 'expected_after_message_id', 'new_after_message_id',\n    'activation_floor_at', 'activation_policy_version', 'proof_rows',\n  ], 'cursor_proof_canonical_invalid');\n  const channel = validateAccountInbox(input.account_id, input.inbox_id);\n  const conversationId = positiveToken(input.conversation_id, 'conversation_id_invalid');\n  const expected = safeInteger(input.expected_after_message_id, 0, Number.MAX_SAFE_INTEGER,\n    'expected_after_message_id_invalid');\n  const next = safeInteger(input.new_after_message_id, 1, Number.MAX_SAFE_INTEGER,\n    'new_after_message_id_invalid');\n  const activationFloorAt = normalizeIso(input.activation_floor_at, 'activation_floor_invalid');\n  const proofRows = normalizeProofRows(input.proof_rows);\n  for (const proofRow of proofRows) {\n    if (proofRow.classification === 'deterministically_excluded' &&\n        deterministicExclusionReason(proofRow, Date.parse(activationFloorAt)) !==\n          proofRow.reason_code) {\n      fail('exclusion_reason_evidence_mismatch');\n    }\n  }\n  const maximumProofMessageId = tokenToInteger(\n    proofRows[proofRows.length - 1].message_id,\n    'proof_message_id_invalid',\n  );\n  if (input.schema_version !== '1.0' || input.source !== SOURCE ||\n      input.brand_id !== BRAND_ID || input.channel !== channel || next <= expected ||\n      proofRows.some((row) => tokenToInteger(row.message_id, 'proof_message_id_invalid') <= expected) ||\n      next !== maximumProofMessageId || input.activation_floor_at !== activationFloorAt ||\n      !POLICY_VERSION.test(input.activation_policy_version || '')) {\n    fail('cursor_proof_canonical_invalid');\n  }\n  return deepFreeze({\n    schema_version: '1.0',\n    source: SOURCE,\n    brand_id: BRAND_ID,\n    account_id: input.account_id,\n    inbox_id: input.inbox_id,\n    channel,\n    conversation_id: conversationId,\n    expected_after_message_id: expected,\n    new_after_message_id: next,\n    activation_floor_at: activationFloorAt,\n    activation_policy_version: input.activation_policy_version,\n    proof_rows: proofRows,\n  });\n}\n\nfunction dependencies(value) {\n  exactObject(value, [\n    'sha256Hex', 'active_event_identity_key_version', 'retained_event_identity_key_versions',\n    'activation_floor_at', 'activation_policy_version',\n  ], 'reconciliation_dependencies_invalid');\n  if (typeof value.sha256Hex !== 'function' ||\n      !KEY_VERSION.test(value.active_event_identity_key_version || '') ||\n      !Array.isArray(value.retained_event_identity_key_versions) ||\n      value.retained_event_identity_key_versions.length > MAX_RETAINED_KEY_VERSIONS ||\n      value.retained_event_identity_key_versions.some((entry) => !KEY_VERSION.test(entry || '')) ||\n      new Set([\n        value.active_event_identity_key_version,\n        ...value.retained_event_identity_key_versions,\n      ]).size !== value.retained_event_identity_key_versions.length + 1 ||\n      !POLICY_VERSION.test(value.activation_policy_version || '')) {\n    fail('reconciliation_dependencies_invalid');\n  }\n  const activationFloorAt = normalizeIso(value.activation_floor_at, 'activation_floor_invalid');\n  return Object.freeze({\n    sha256Hex: value.sha256Hex,\n    activeEventIdentityKeyVersion: value.active_event_identity_key_version,\n    retainedEventIdentityKeyVersions: Object.freeze([...value.retained_event_identity_key_versions]),\n    activationFloorAt,\n    activationFloorEpochMilliseconds: Date.parse(activationFloorAt),\n    activationPolicyVersion: value.activation_policy_version,\n  });\n}\n\nfunction digest(deps, domain, value) {\n  const result = deps.sha256Hex(domain + stableJson(value));\n  if (!HEX_64.test(result || '')) fail('sha256_dependency_output_invalid');\n  return result;\n}\n\nfunction blockedPage(kind, accountId, inboxId, channel, route, status, reasonCode) {\n  return deepFreeze({\n    schema_version: '1.0',\n    kind,\n    status,\n    reason_code: reasonCode,\n    source: SOURCE,\n    brand_id: BRAND_ID,\n    account_id: accountId,\n    inbox_id: inboxId,\n    channel,\n    ...route,\n    cursor_advance_ready: false,\n    api_retry_required: status === 'retry_later',\n    customer_egress_allowed: false,\n  });\n}\n\nfunction createChatwootReconciliationRuntime(injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n\n  function prepareControl(input) {\n    exactObject(input, ['brand_enabled', 'kill_switch', 'api_credential_available'],\n      'reconciliation_control_invalid');\n    if (typeof input.brand_enabled !== 'boolean' || typeof input.kill_switch !== 'boolean' ||\n        typeof input.api_credential_available !== 'boolean') fail('reconciliation_control_invalid');\n    let reasonCode = null;\n    if (!input.brand_enabled) reasonCode = 'brand_disabled';\n    else if (input.kill_switch) reasonCode = 'brand_kill_switch';\n    else if (!input.api_credential_available) reasonCode = 'chatwoot_credential_unavailable';\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_control_v1',\n      status: reasonCode === null ? 'ready' : 'blocked',\n      reason_code: reasonCode,\n      brand_id: BRAND_ID,\n      account_id: ACCOUNT_ID,\n      activation_floor_at: deps.activationFloorAt,\n      activation_policy_version: deps.activationPolicyVersion,\n      api_calls_allowed: reasonCode === null,\n      customer_egress_allowed: false,\n    });\n  }\n\n  function validateControl(control) {\n    exactObject(control, [\n      'schema_version', 'kind', 'status', 'reason_code', 'brand_id', 'account_id',\n      'activation_floor_at', 'activation_policy_version', 'api_calls_allowed',\n      'customer_egress_allowed',\n    ], 'reconciliation_control_invalid');\n    if (control.schema_version !== '1.0' ||\n        control.kind !== 'chatwoot_reconciliation_control_v1' ||\n        control.brand_id !== BRAND_ID || control.account_id !== ACCOUNT_ID ||\n        control.activation_floor_at !== deps.activationFloorAt ||\n        control.activation_policy_version !== deps.activationPolicyVersion ||\n        control.customer_egress_allowed !== false ||\n        !['ready', 'blocked'].includes(control.status) ||\n        typeof control.api_calls_allowed !== 'boolean' ||\n        (control.status === 'ready') !== control.api_calls_allowed ||\n        (control.status === 'ready' ? control.reason_code !== null :\n          (typeof control.reason_code !== 'string' || !SAFE_CODE.test(control.reason_code)))) {\n      fail('reconciliation_control_invalid');\n    }\n    return control;\n  }\n\n  function blockedRequest(reasonCode) {\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_api_request_plan_v1',\n      status: 'blocked',\n      reason_code: reasonCode,\n      request: null,\n      api_call_allowed: false,\n      customer_egress_allowed: false,\n    });\n  }\n\n  function buildConversationDiscoveryRequest(control, input) {\n    validateControl(control);\n    exactObject(input, ['inbox_id', 'page'], 'discovery_request_input_invalid');\n    const channel = channelForInbox(input.inbox_id);\n    safeInteger(input.page, 1, MAX_DISCOVERY_PAGES, 'discovery_page_invalid');\n    if (!control.api_calls_allowed) return blockedRequest(control.reason_code);\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_api_request_plan_v1',\n      status: 'ready',\n      reason_code: null,\n      request: {\n        method: 'GET',\n        path: `/api/v1/accounts/${ACCOUNT_ID}/conversations`,\n        query: {\n          status: 'all',\n          assignee_type: 'all',\n          inbox_id: input.inbox_id,\n          page: input.page,\n        },\n        account_id: ACCOUNT_ID,\n        inbox_id: input.inbox_id,\n        channel,\n      },\n      api_call_allowed: true,\n      customer_egress_allowed: false,\n    });\n  }\n\n  function buildMessagesAfterRequest(control, input) {\n    validateControl(control);\n    exactObject(input, ['inbox_id', 'conversation_id', 'after_message_id'],\n      'messages_request_input_invalid');\n    const channel = channelForInbox(input.inbox_id);\n    const conversationId = positiveToken(input.conversation_id, 'conversation_id_invalid');\n    const after = safeInteger(input.after_message_id, 0, Number.MAX_SAFE_INTEGER,\n      'after_message_id_invalid');\n    if (!control.api_calls_allowed) return blockedRequest(control.reason_code);\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_api_request_plan_v1',\n      status: 'ready',\n      reason_code: null,\n      request: {\n        method: 'GET',\n        path: `/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`,\n        query: { after },\n        account_id: ACCOUNT_ID,\n        inbox_id: input.inbox_id,\n        channel,\n        conversation_id: conversationId,\n      },\n      api_call_allowed: true,\n      customer_egress_allowed: false,\n    });\n  }\n\n  function normalizeConversationDiscoveryPage(input) {\n    exactObject(input, DISCOVERY_PAGE_KEYS, 'discovery_projection_invalid');\n    if (input.schema_version !== '1.0' ||\n        input.kind !== 'chatwoot_reconciliation_conversation_page_projection_v1') {\n      fail('discovery_projection_invalid');\n    }\n    const channel = validateAccountInbox(input.account_id, input.inbox_id);\n    safeInteger(input.requested_page, 1, MAX_DISCOVERY_PAGES, 'discovery_page_invalid');\n    const transport = validateTransportFields(\n      input.status_code, input.retry_after_seconds, input.error_code, input.rows,\n      'discovery_projection_invalid',\n    );\n    if (transport) {\n      if (input.all_count !== null) fail('discovery_projection_invalid');\n      return blockedPage(\n        'chatwoot_reconciliation_discovery_page_v1', input.account_id, input.inbox_id,\n        channel,\n        {\n          requested_page: input.requested_page,\n          all_count: null,\n          conversation_ids: [],\n          page_row_count: 0,\n          coverage: 'incomplete',\n        },\n        transport[0], transport[1],\n      );\n    }\n    safeInteger(input.all_count, 0, Number.MAX_SAFE_INTEGER, 'discovery_all_count_invalid');\n    if (input.rows.length > MAX_DISCOVERY_ROWS) fail('discovery_page_oversized');\n    const ids = [];\n    const seen = new Set();\n    for (const row of input.rows) {\n      exactObject(row, DISCOVERY_ROW_KEYS, 'discovery_row_invalid');\n      validateAccountInbox(row.account_id, row.inbox_id);\n      if (row.account_id !== input.account_id || row.inbox_id !== input.inbox_id ||\n          !CONVERSATION_STATUSES.has(row.status)) fail('discovery_row_route_invalid');\n      const id = positiveToken(row.id, 'conversation_id_invalid');\n      if (seen.has(id)) fail('discovery_row_duplicate');\n      seen.add(id);\n      ids.push(id);\n    }\n    ids.sort((left, right) => tokenToInteger(left, 'conversation_id_invalid') -\n      tokenToInteger(right, 'conversation_id_invalid'));\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_discovery_page_v1',\n      status: 'ready',\n      reason_code: null,\n      source: SOURCE,\n      brand_id: BRAND_ID,\n      account_id: input.account_id,\n      inbox_id: input.inbox_id,\n      channel,\n      requested_page: input.requested_page,\n      all_count: input.all_count,\n      conversation_ids: ids,\n      page_row_count: ids.length,\n      coverage: 'incomplete',\n      cursor_advance_ready: false,\n      api_retry_required: false,\n      customer_egress_allowed: false,\n    });\n  }\n\n  function validateDiscoveryPage(page) {\n    exactObject(page, [\n      'schema_version', 'kind', 'status', 'reason_code', 'source', 'brand_id', 'account_id',\n      'inbox_id', 'channel', 'requested_page', 'all_count', 'conversation_ids',\n      'page_row_count', 'coverage', 'cursor_advance_ready', 'api_retry_required',\n      'customer_egress_allowed',\n    ], 'discovery_page_invalid');\n    if (page.schema_version !== '1.0' ||\n        page.kind !== 'chatwoot_reconciliation_discovery_page_v1' ||\n        page.source !== SOURCE || page.brand_id !== BRAND_ID || page.account_id !== ACCOUNT_ID ||\n        INBOX_CHANNELS[page.inbox_id] !== page.channel || page.status !== 'ready' ||\n        page.reason_code !== null || page.coverage !== 'incomplete' ||\n        page.cursor_advance_ready !== false || page.api_retry_required !== false ||\n        page.customer_egress_allowed !== false || !Array.isArray(page.conversation_ids) ||\n        page.conversation_ids.length !== page.page_row_count ||\n        page.conversation_ids.some((id) => !POSITIVE_TOKEN.test(id))) {\n      fail('discovery_page_invalid');\n    }\n    return page;\n  }\n\n  function buildDiscoverySnapshot(input) {\n    exactObject(input, ['pages', 'page_cap_reached'], 'discovery_snapshot_input_invalid');\n    if (!Array.isArray(input.pages) || input.pages.length < 1 ||\n        input.pages.length > MAX_DISCOVERY_PAGES || typeof input.page_cap_reached !== 'boolean') {\n      fail('discovery_snapshot_input_invalid');\n    }\n    const pages = input.pages.map(validateDiscoveryPage);\n    const first = pages[0];\n    const allIds = [];\n    const seen = new Set();\n    let reasonCode = null;\n    for (let index = 0; index < pages.length; index += 1) {\n      const page = pages[index];\n      if (page.account_id !== first.account_id || page.inbox_id !== first.inbox_id ||\n          page.channel !== first.channel || page.requested_page !== index + 1) {\n        fail('discovery_page_sequence_invalid');\n      }\n      if (page.all_count !== first.all_count) reasonCode = 'discovery_count_changed';\n      for (const id of page.conversation_ids) {\n        if (seen.has(id)) reasonCode = 'discovery_page_overlap';\n        else {\n          seen.add(id);\n          allIds.push(id);\n        }\n      }\n    }\n    allIds.sort((left, right) => tokenToInteger(left, 'conversation_id_invalid') -\n      tokenToInteger(right, 'conversation_id_invalid'));\n    if (input.page_cap_reached) reasonCode = 'discovery_page_cap_reached';\n    else if (allIds.length !== first.all_count) reasonCode = reasonCode || 'discovery_count_incomplete';\n    const boundedComplete = reasonCode === null;\n    const core = {\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_discovery_snapshot_v1',\n      source: SOURCE,\n      brand_id: BRAND_ID,\n      account_id: first.account_id,\n      inbox_id: first.inbox_id,\n      channel: first.channel,\n      status: boundedComplete ? 'bounded_scan_complete' : 'incomplete',\n      reason_code: reasonCode,\n      coverage: 'incomplete',\n      all_count: first.all_count,\n      page_count: pages.length,\n      conversation_ids: allIds,\n      bounded_scan_complete: boundedComplete,\n      page_cap_reached: input.page_cap_reached,\n      no_loss_claimed: false,\n      customer_egress_allowed: false,\n    };\n    return deepFreeze({\n      ...core,\n      snapshot_digest: digest(deps, 'calapres-chatwoot-reconciliation-snapshot-v1:', core),\n    });\n  }\n\n  function validateDiscoverySnapshot(snapshot) {\n    exactObject(snapshot, [\n      'schema_version', 'kind', 'source', 'brand_id', 'account_id', 'inbox_id', 'channel',\n      'status', 'reason_code', 'coverage', 'all_count', 'page_count', 'conversation_ids',\n      'bounded_scan_complete', 'page_cap_reached', 'no_loss_claimed',\n      'customer_egress_allowed', 'snapshot_digest',\n    ], 'discovery_snapshot_invalid');\n    const core = { ...snapshot };\n    delete core.snapshot_digest;\n    if (snapshot.schema_version !== '1.0' ||\n        snapshot.kind !== 'chatwoot_reconciliation_discovery_snapshot_v1' ||\n        snapshot.source !== SOURCE || snapshot.brand_id !== BRAND_ID ||\n        snapshot.account_id !== ACCOUNT_ID || INBOX_CHANNELS[snapshot.inbox_id] !== snapshot.channel ||\n        snapshot.coverage !== 'incomplete' || snapshot.no_loss_claimed !== false ||\n        snapshot.customer_egress_allowed !== false || !Array.isArray(snapshot.conversation_ids) ||\n        !HEX_64.test(snapshot.snapshot_digest || '') ||\n        digest(deps, 'calapres-chatwoot-reconciliation-snapshot-v1:', core) !==\n          snapshot.snapshot_digest) fail('discovery_snapshot_invalid');\n    return snapshot;\n  }\n\n  function evaluateDiscoveryConvergence(input) {\n    exactObject(input, ['first_snapshot', 'second_snapshot'], 'discovery_convergence_input_invalid');\n    const first = validateDiscoverySnapshot(input.first_snapshot);\n    const second = validateDiscoverySnapshot(input.second_snapshot);\n    if (first.account_id !== second.account_id || first.inbox_id !== second.inbox_id ||\n        first.channel !== second.channel) fail('discovery_snapshot_route_mismatch');\n    const converged = first.bounded_scan_complete === true &&\n      second.bounded_scan_complete === true && first.all_count === second.all_count &&\n      stableJson(first.conversation_ids) === stableJson(second.conversation_ids);\n    const ids = [...new Set([...first.conversation_ids, ...second.conversation_ids])]\n      .sort((left, right) => tokenToInteger(left, 'conversation_id_invalid') -\n        tokenToInteger(right, 'conversation_id_invalid'));\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_discovery_coverage_v1',\n      source: SOURCE,\n      brand_id: BRAND_ID,\n      account_id: first.account_id,\n      inbox_id: first.inbox_id,\n      channel: first.channel,\n      status: converged ? 'converged_bounded' : 'incomplete',\n      reason_code: converged ? null : 'discovery_not_converged',\n      coverage: converged ? 'best_effort' : 'incomplete',\n      first_snapshot_digest: first.snapshot_digest,\n      second_snapshot_digest: second.snapshot_digest,\n      conversation_ids: ids,\n      bounded_convergence_passed: converged,\n      discovery_watermark_advance_allowed: false,\n      no_loss_claimed: false,\n      customer_egress_allowed: false,\n    });\n  }\n\n  function classifyMessage(row) {\n    const exclusion = deterministicExclusionReason(\n      row,\n      deps.activationFloorEpochMilliseconds,\n    );\n    if (exclusion !== null) return exclusion;\n    if (row.message_type === 0 && row.private === false && row.sender_type === 'contact') return null;\n    fail('inbound_sender_not_contact');\n  }\n\n  function eventCandidate(row, channel) {\n    const tuple = canonicalTuple(row.account_id, row.inbox_id, row.conversation_id, row.id);\n    const tupleJson = orderedTupleJson(tuple);\n    const keyVersions = [\n      deps.activeEventIdentityKeyVersion,\n      ...deps.retainedEventIdentityKeyVersions,\n    ];\n    const hmacRequests = keyVersions.map((keyVersion) => ({\n      purpose: 'event_identity',\n      key_version: keyVersion,\n      algorithm: 'hmac-sha256',\n      encoding: 'hex',\n      material_utf8: tupleJson,\n    }));\n    const core = {\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_event_candidate_v1',\n      source: SOURCE,\n      brand_id: BRAND_ID,\n      account_id: row.account_id,\n      inbox_id: row.inbox_id,\n      channel,\n      event: 'message_created',\n      conversation_id: tuple.conversation_id,\n      message_id: tuple.message_id,\n      event_at: new Date(row.created_at * 1000).toISOString(),\n      direction: 'incoming',\n      visibility: 'public',\n      sender_class: 'contact',\n      attachment_count: row.attachment_count,\n      canonical_tuple_format: CANONICAL_TUPLE_FORMAT,\n      canonical_tuple: tuple,\n      active_event_identity_key_version: deps.activeEventIdentityKeyVersion,\n      retained_event_identity_key_versions: [...deps.retainedEventIdentityKeyVersions],\n      event_identity_hmac_requests: hmacRequests,\n      activation_floor_at: deps.activationFloorAt,\n      activation_policy_version: deps.activationPolicyVersion,\n      content_state: 'deferred_live_reread',\n      live_reread_required: true,\n      raw_content_used: false,\n      raw_contact_used: false,\n      transient_only: true,\n      persistence_allowed: false,\n      wait_payload_allowed: false,\n      audit_payload_allowed: false,\n      customer_egress_allowed: false,\n    };\n    return deepFreeze({\n      ...core,\n      candidate_ref: 'cwr_' + digest(\n        deps, 'calapres-chatwoot-reconciliation-candidate-v1:', core,\n      ).slice(0, 24),\n      candidate_binding_sha256: digest(\n        deps, 'calapres-chatwoot-reconciliation-candidate-binding-v1:', core,\n      ),\n    });\n  }\n\n  function normalizeMessagesAfterPage(input) {\n    exactObject(input, MESSAGE_PAGE_KEYS, 'messages_projection_invalid');\n    if (input.schema_version !== '1.0' ||\n        input.kind !== 'chatwoot_reconciliation_messages_after_projection_v1') {\n      fail('messages_projection_invalid');\n    }\n    const channel = validateAccountInbox(input.account_id, input.inbox_id);\n    const conversationId = positiveToken(input.conversation_id, 'conversation_id_invalid');\n    const after = safeInteger(input.requested_after_message_id, 0, Number.MAX_SAFE_INTEGER,\n      'after_message_id_invalid');\n    const transport = validateTransportFields(\n      input.status_code, input.retry_after_seconds, input.error_code, input.rows,\n      'messages_projection_invalid',\n    );\n    if (transport) {\n      return blockedPage(\n        'chatwoot_reconciliation_messages_page_v1', input.account_id, input.inbox_id,\n        channel,\n        {\n          conversation_id: conversationId,\n          requested_after_message_id: after,\n          proposed_next_after_message_id: null,\n          page_row_count: 0,\n          page_full: false,\n          continue_required_after_commit: false,\n          event_candidates: [],\n          deterministic_exclusions: [],\n          outcome_requirements: [],\n          activation_floor_at: deps.activationFloorAt,\n          activation_policy_version: deps.activationPolicyVersion,\n          incident_required: transport[0] === 'fail_closed',\n          manual_resolution_required: transport[0] === 'fail_closed',\n          page_binding_sha256: null,\n        },\n        transport[0], transport[1],\n      );\n    }\n    if (input.rows.length > MAX_MESSAGE_ROWS) fail('messages_page_oversized');\n    const rows = [];\n    const ids = new Set();\n    for (const sourceRow of input.rows) {\n      exactObject(sourceRow, MESSAGE_ROW_KEYS, 'message_row_invalid');\n      const rowChannel = validateAccountInbox(sourceRow.account_id, sourceRow.inbox_id);\n      if (rowChannel !== channel || sourceRow.account_id !== input.account_id ||\n          sourceRow.inbox_id !== input.inbox_id ||\n          positiveToken(sourceRow.conversation_id, 'conversation_id_invalid') !== conversationId ||\n          !MESSAGE_TYPES.has(sourceRow.message_type) || typeof sourceRow.private !== 'boolean' ||\n          !SENDER_TYPES.has(sourceRow.sender_type)) fail('message_row_route_or_type_invalid');\n      const id = tokenToInteger(sourceRow.id, 'message_id_invalid');\n      if (id <= after || ids.has(id)) fail('message_cursor_order_invalid');\n      ids.add(id);\n      safeInteger(sourceRow.created_at, 0, 253402300799, 'message_created_at_invalid');\n      safeInteger(sourceRow.attachment_count, 0, 32, 'attachment_count_invalid');\n      rows.push({\n        id,\n        account_id: sourceRow.account_id,\n        inbox_id: sourceRow.inbox_id,\n        conversation_id: conversationId,\n        created_at: sourceRow.created_at,\n        message_type: sourceRow.message_type,\n        private: sourceRow.private,\n        sender_type: sourceRow.sender_type,\n        attachment_count: sourceRow.attachment_count,\n      });\n    }\n    rows.sort((left, right) => left.id - right.id);\n    if (rows.length === MAX_MESSAGE_ROWS) {\n      return deepFreeze({\n        schema_version: '1.0',\n        kind: 'chatwoot_reconciliation_messages_page_v1',\n        status: 'incomplete',\n        reason_code: 'scan_truncated',\n        source: SOURCE,\n        brand_id: BRAND_ID,\n        account_id: input.account_id,\n        inbox_id: input.inbox_id,\n        channel,\n        conversation_id: conversationId,\n        requested_after_message_id: after,\n        proposed_next_after_message_id: null,\n        page_row_count: rows.length,\n        page_full: true,\n        continue_required_after_commit: false,\n        event_candidates: [],\n        deterministic_exclusions: [],\n        outcome_requirements: [],\n        activation_floor_at: deps.activationFloorAt,\n        activation_policy_version: deps.activationPolicyVersion,\n        incident_required: true,\n        manual_resolution_required: true,\n        cursor_advance_ready: false,\n        api_retry_required: true,\n        customer_egress_allowed: false,\n        page_binding_sha256: null,\n      });\n    }\n    const candidates = [];\n    const exclusions = [];\n    const requirements = [];\n    for (const row of rows) {\n      const exclusion = classifyMessage(row);\n      if (exclusion === null) {\n        candidates.push(eventCandidate(row, channel));\n        requirements.push({\n          message_id: String(row.id),\n          classification: 'event_candidate',\n          required_reason_code: null,\n          created_at: null,\n          message_type: null,\n          private: null,\n          sender_type: null,\n          allowed_outcomes: ['durable_bound', 'durable_duplicate'],\n        });\n      } else {\n        exclusions.push({\n          message_id: String(row.id),\n          reason_code: exclusion,\n          activation_policy_version: deps.activationPolicyVersion,\n        });\n        requirements.push({\n          message_id: String(row.id),\n          classification: 'deterministically_excluded',\n          required_reason_code: exclusion,\n          created_at: row.created_at,\n          message_type: row.message_type,\n          private: row.private,\n          sender_type: row.sender_type,\n          allowed_outcomes: ['deterministically_excluded'],\n        });\n      }\n    }\n    const next = rows.length === 0 ? after : Math.max(...rows.map((row) => row.id));\n    const core = {\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_messages_page_v1',\n      status: 'ready',\n      reason_code: null,\n      source: SOURCE,\n      brand_id: BRAND_ID,\n      account_id: input.account_id,\n      inbox_id: input.inbox_id,\n      channel,\n      conversation_id: conversationId,\n      requested_after_message_id: after,\n      proposed_next_after_message_id: next,\n      page_row_count: rows.length,\n      page_full: false,\n      continue_required_after_commit: false,\n      event_candidates: candidates,\n      deterministic_exclusions: exclusions,\n      outcome_requirements: requirements,\n      activation_floor_at: deps.activationFloorAt,\n      activation_policy_version: deps.activationPolicyVersion,\n      incident_required: false,\n      manual_resolution_required: false,\n      cursor_advance_ready: false,\n      api_retry_required: false,\n      customer_egress_allowed: false,\n    };\n    return deepFreeze({\n      ...core,\n      page_binding_sha256: digest(\n        deps, 'calapres-chatwoot-reconciliation-message-page-v1:', core,\n      ),\n    });\n  }\n\n  function validateMessagesPage(page) {\n    exactObject(page, [\n      'schema_version', 'kind', 'status', 'reason_code', 'source', 'brand_id', 'account_id',\n      'inbox_id', 'channel', 'conversation_id', 'requested_after_message_id',\n      'proposed_next_after_message_id', 'page_row_count', 'page_full',\n      'continue_required_after_commit', 'event_candidates', 'deterministic_exclusions',\n      'outcome_requirements', 'activation_floor_at', 'activation_policy_version',\n      'incident_required', 'manual_resolution_required', 'cursor_advance_ready',\n      'api_retry_required', 'customer_egress_allowed',\n      'page_binding_sha256',\n    ], 'messages_page_invalid');\n    const core = { ...page };\n    delete core.page_binding_sha256;\n    if (page.schema_version !== '1.0' ||\n        page.kind !== 'chatwoot_reconciliation_messages_page_v1' || page.status !== 'ready' ||\n        page.reason_code !== null || page.source !== SOURCE || page.brand_id !== BRAND_ID ||\n        page.account_id !== ACCOUNT_ID || INBOX_CHANNELS[page.inbox_id] !== page.channel ||\n        page.activation_floor_at !== deps.activationFloorAt ||\n        page.activation_policy_version !== deps.activationPolicyVersion ||\n        page.page_row_count > MAX_FINALIZABLE_MESSAGE_ROWS || page.page_full !== false ||\n        page.continue_required_after_commit !== false || page.incident_required !== false ||\n        page.manual_resolution_required !== false ||\n        page.cursor_advance_ready !== false || page.api_retry_required !== false ||\n        page.customer_egress_allowed !== false || !Array.isArray(page.event_candidates) ||\n        !Array.isArray(page.deterministic_exclusions) ||\n        !Array.isArray(page.outcome_requirements) ||\n        page.outcome_requirements.length !== page.page_row_count ||\n        !HEX_64.test(page.page_binding_sha256 || '') ||\n        digest(deps, 'calapres-chatwoot-reconciliation-message-page-v1:', core) !==\n          page.page_binding_sha256) fail('messages_page_invalid');\n    return page;\n  }\n\n  function blockedFinalization(page, reasonCode) {\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_cursor_finalization_v1',\n      status: 'blocked',\n      reason_code: reasonCode,\n      source: SOURCE,\n      brand_id: BRAND_ID,\n      account_id: page.account_id,\n      inbox_id: page.inbox_id,\n      channel: page.channel,\n      conversation_id: page.conversation_id,\n      expected_after_message_id: page.requested_after_message_id,\n      new_after_message_id: null,\n      activation_floor_at: deps.activationFloorAt,\n      activation_policy_version: deps.activationPolicyVersion,\n      proof_rows: [],\n      page_binding_sha256: null,\n      outcome_digest: null,\n      row_count: page.page_row_count,\n      cursor_advance_ready: false,\n      continue_required: false,\n      no_loss_claimed: false,\n      customer_egress_allowed: false,\n    });\n  }\n\n  function finalizeMessagesPage(input) {\n    exactObject(input, ['page', 'proof_rows'], 'message_proofs_input_invalid');\n    const page = validateMessagesPage(input.page);\n    if (!Array.isArray(input.proof_rows)) return blockedFinalization(page, 'proof_rows_missing');\n    if (input.proof_rows.length !== page.outcome_requirements.length) {\n      return blockedFinalization(page, 'proof_row_count_mismatch');\n    }\n    let canonical;\n    try {\n      canonical = cursorProofCanonical({\n        schema_version: '1.0',\n        source: SOURCE,\n        brand_id: BRAND_ID,\n        account_id: page.account_id,\n        inbox_id: page.inbox_id,\n        channel: page.channel,\n        conversation_id: page.conversation_id,\n        expected_after_message_id: page.requested_after_message_id,\n        new_after_message_id: page.proposed_next_after_message_id,\n        activation_floor_at: deps.activationFloorAt,\n        activation_policy_version: deps.activationPolicyVersion,\n        proof_rows: input.proof_rows,\n      });\n    } catch (error) {\n      if (error instanceof ReconciliationContractError) {\n        return blockedFinalization(page, error.reasonCode);\n      }\n      throw error;\n    }\n    for (let index = 0; index < page.outcome_requirements.length; index += 1) {\n      const requirement = page.outcome_requirements[index];\n      const proof = canonical.proof_rows[index];\n      if (proof.message_id !== requirement.message_id ||\n          proof.classification !== requirement.classification ||\n          proof.created_at !== requirement.created_at ||\n          proof.message_type !== requirement.message_type ||\n          proof.private !== requirement.private ||\n          proof.sender_type !== requirement.sender_type ||\n          !requirement.allowed_outcomes.includes(proof.outcome)) {\n        return blockedFinalization(page, 'proof_requirement_mismatch');\n      }\n      if (proof.classification === 'event_candidate') {\n        if (proof.event_identity_key_version !== deps.activeEventIdentityKeyVersion) {\n          return blockedFinalization(page, 'proof_key_version_mismatch');\n        }\n      } else if (proof.reason_code !== requirement.required_reason_code) {\n        return blockedFinalization(page, 'exclusion_reason_mismatch');\n      }\n    }\n    const pageBindingSha256 = digest(deps, CURSOR_PAGE_BINDING_DOMAIN, canonical);\n    const outcomeDigest = digest(deps, CURSOR_OUTCOME_DIGEST_DOMAIN, canonical);\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_cursor_finalization_v1',\n      status: 'ready',\n      reason_code: null,\n      source: SOURCE,\n      brand_id: BRAND_ID,\n      account_id: page.account_id,\n      inbox_id: page.inbox_id,\n      channel: page.channel,\n      conversation_id: page.conversation_id,\n      expected_after_message_id: page.requested_after_message_id,\n      new_after_message_id: page.proposed_next_after_message_id,\n      activation_floor_at: deps.activationFloorAt,\n      activation_policy_version: deps.activationPolicyVersion,\n      proof_rows: canonical.proof_rows,\n      page_binding_sha256: pageBindingSha256,\n      outcome_digest: outcomeDigest,\n      row_count: canonical.proof_rows.length,\n      cursor_advance_ready: true,\n      continue_required: page.continue_required_after_commit,\n      no_loss_claimed: false,\n      customer_egress_allowed: false,\n    });\n  }\n\n  function buildScanClaimCommand(input) {\n    exactObject(input, [\n      'inbox_id', 'scan_id', 'lease_owner_id', 'lease_token', 'lease_duration_seconds',\n      'max_pages',\n    ], 'scan_claim_input_invalid');\n    const channel = channelForInbox(input.inbox_id);\n    if (typeof input.scan_id !== 'string' || !/^cwrs_[a-f0-9]{24}$/.test(input.scan_id) ||\n        typeof input.lease_owner_id !== 'string' || !OPAQUE_ID.test(input.lease_owner_id) ||\n        typeof input.lease_token !== 'string' || !OPAQUE_ID.test(input.lease_token)) {\n      fail('scan_claim_input_invalid');\n    }\n    safeInteger(input.lease_duration_seconds, 30, 900, 'scan_lease_duration_invalid');\n    safeInteger(input.max_pages, 1, MAX_DISCOVERY_PAGES, 'scan_max_pages_invalid');\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_scan_claim_command_v1',\n      operation: 'claim_chatwoot_reconciliation_scan',\n      source: SOURCE,\n      brand_id: BRAND_ID,\n      account_id: ACCOUNT_ID,\n      inbox_id: input.inbox_id,\n      channel,\n      scan_id: input.scan_id,\n      lease_owner_id: input.lease_owner_id,\n      lease_token: input.lease_token,\n      lease_duration_seconds: input.lease_duration_seconds,\n      max_pages: input.max_pages,\n      activation_floor_at: deps.activationFloorAt,\n      activation_policy_version: deps.activationPolicyVersion,\n      customer_egress_allowed: false,\n    });\n  }\n\n  function buildCursorAdvanceCommand(input) {\n    exactObject(input, ['finalization', 'scan_id', 'lease_token'],\n      'cursor_command_input_invalid');\n    const finalization = input.finalization;\n    exactObject(finalization, [\n      'schema_version', 'kind', 'status', 'reason_code', 'source', 'brand_id', 'account_id',\n      'inbox_id', 'channel', 'conversation_id', 'expected_after_message_id',\n      'new_after_message_id', 'activation_floor_at', 'activation_policy_version',\n      'proof_rows', 'page_binding_sha256', 'outcome_digest', 'row_count',\n      'cursor_advance_ready', 'continue_required', 'no_loss_claimed', 'customer_egress_allowed',\n    ], 'cursor_finalization_invalid');\n    let canonical;\n    try {\n      canonical = cursorProofCanonical({\n        schema_version: finalization.schema_version,\n        source: finalization.source,\n        brand_id: finalization.brand_id,\n        account_id: finalization.account_id,\n        inbox_id: finalization.inbox_id,\n        channel: finalization.channel,\n        conversation_id: finalization.conversation_id,\n        expected_after_message_id: finalization.expected_after_message_id,\n        new_after_message_id: finalization.new_after_message_id,\n        activation_floor_at: finalization.activation_floor_at,\n        activation_policy_version: finalization.activation_policy_version,\n        proof_rows: finalization.proof_rows,\n      });\n    } catch (error) {\n      if (error instanceof ReconciliationContractError) fail('cursor_finalization_invalid');\n      throw error;\n    }\n    const expectedPageBinding = digest(deps, CURSOR_PAGE_BINDING_DOMAIN, canonical);\n    const expectedOutcomeDigest = digest(deps, CURSOR_OUTCOME_DIGEST_DOMAIN, canonical);\n    if (finalization.schema_version !== '1.0' ||\n        finalization.kind !== 'chatwoot_reconciliation_cursor_finalization_v1' ||\n        finalization.status !== 'ready' || finalization.reason_code !== null ||\n        finalization.source !== SOURCE || finalization.brand_id !== BRAND_ID ||\n        finalization.account_id !== ACCOUNT_ID ||\n        INBOX_CHANNELS[finalization.inbox_id] !== finalization.channel ||\n        finalization.activation_floor_at !== deps.activationFloorAt ||\n        finalization.activation_policy_version !== deps.activationPolicyVersion ||\n        finalization.cursor_advance_ready !== true || finalization.no_loss_claimed !== false ||\n        finalization.customer_egress_allowed !== false ||\n        finalization.continue_required !== false ||\n        !Number.isSafeInteger(finalization.expected_after_message_id) ||\n        !Number.isSafeInteger(finalization.new_after_message_id) ||\n        finalization.new_after_message_id <= finalization.expected_after_message_id ||\n        finalization.row_count !== canonical.proof_rows.length ||\n        !HEX_64.test(finalization.page_binding_sha256 || '') ||\n        !HEX_64.test(finalization.outcome_digest || '') ||\n        finalization.page_binding_sha256 !== expectedPageBinding ||\n        finalization.outcome_digest !== expectedOutcomeDigest ||\n        typeof input.scan_id !== 'string' || !/^cwrs_[a-f0-9]{24}$/.test(input.scan_id) ||\n        typeof input.lease_token !== 'string' || !OPAQUE_ID.test(input.lease_token)) {\n      fail('cursor_finalization_invalid');\n    }\n    return deepFreeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_cursor_advance_command_v1',\n      operation: 'compare_and_advance_chatwoot_message_cursor',\n      source: SOURCE,\n      brand_id: BRAND_ID,\n      account_id: finalization.account_id,\n      inbox_id: finalization.inbox_id,\n      channel: finalization.channel,\n      conversation_id: finalization.conversation_id,\n      scan_id: input.scan_id,\n      lease_token: input.lease_token,\n      expected_after_message_id: finalization.expected_after_message_id,\n      new_after_message_id: finalization.new_after_message_id,\n      proof_rows: canonical.proof_rows,\n      page_binding_sha256: finalization.page_binding_sha256,\n      outcome_digest: finalization.outcome_digest,\n      row_count: finalization.row_count,\n      activation_floor_at: deps.activationFloorAt,\n      activation_policy_version: deps.activationPolicyVersion,\n      customer_egress_allowed: false,\n    });\n  }\n\n  return Object.freeze({\n    prepareControl,\n    buildConversationDiscoveryRequest,\n    buildMessagesAfterRequest,\n    normalizeConversationDiscoveryPage,\n    buildDiscoverySnapshot,\n    evaluateDiscoveryConvergence,\n    normalizeMessagesAfterPage,\n    validateMessagesPage,\n    finalizeMessagesPage,\n    buildScanClaimCommand,\n    buildCursorAdvanceCommand,\n  });\n}\n\n__reconciliationModule.exports = Object.freeze({\n  BRAND_ID,\n  ACCOUNT_ID,\n  SOURCE,\n  CANONICAL_TUPLE_FORMAT,\n  CURSOR_PROOF_CANONICAL_FORMAT,\n  CURSOR_PAGE_BINDING_DOMAIN,\n  CURSOR_OUTCOME_DIGEST_DOMAIN,\n  INBOX_CHANNELS,\n  MAX_DISCOVERY_ROWS,\n  MAX_DISCOVERY_PAGES,\n  MAX_MESSAGE_ROWS,\n  MAX_FINALIZABLE_MESSAGE_ROWS,\n  ReconciliationContractError,\n  stableJson,\n  canonicalTuple,\n  cursorProofCanonical,\n  createChatwootReconciliationRuntime,\n});\n\n})();\nconst __reconciliationBridgeModule = { exports: {} };\n(function(){\n'use strict';\n\n/*\n * Pure, credential-free bridge from a transient Chatwoot reconciliation\n * candidate to the identifier-only inputs of the durable ingress pipeline.\n *\n * This module does not verify, accept, or claim a signed webhook. Native n8n\n * Crypto nodes own HMAC execution. PostgreSQL nodes own all atomic effects.\n * The bridge only validates exact envelopes, binds native HMAC results to the\n * requests that produced them, and projects commands/control fields.\n */\n\nconst BRAND_ID = 'calapres';\nconst ACCOUNT_ID = 179973;\nconst SOURCE = 'chatwoot_reconciliation_v1';\nconst CANONICAL_TUPLE_FORMAT =\n  'json-minified-ordered:[schema_version,account_id,inbox_id,event,conversation_id,message_id]';\nconst INBOX_CHANNELS = Object.freeze({\n  128031: 'instagram',\n  128033: 'tiktok',\n  128058: 'whatsapp',\n  128326: 'email',\n});\nconst DELAY_POLICY_VERSION = '2026-08-11-v1';\nconst DELAY_RANGES = Object.freeze({\n  instagram: Object.freeze({ minimum: 30, maximum: 75 }),\n  tiktok: Object.freeze({ minimum: 30, maximum: 75 }),\n  whatsapp: Object.freeze({ minimum: 30, maximum: 75 }),\n  email: Object.freeze({ minimum: 120, maximum: 300 }),\n});\n\nconst REQUEST_SOURCE = 'chatwoot_reconciliation_api_v1';\nconst REQUEST_ATTEMPT_IDENTITY_DOMAIN =\n  'calapres-chatwoot-reconciliation-request-attempt-v1:';\nconst SOURCE_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-source-binding-v1:';\nconst MESSAGE_FINGERPRINT_DOMAIN = 'calapres-message-anchor-v1:';\nconst CONVERSATION_FINGERPRINT_DOMAIN = 'calapres-conversation-v1:';\nconst HMAC_REQUEST_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-hmac-request-binding-v1:';\nconst NATIVE_CRYPTO_LINEAGE_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-native-crypto-lineage-v1:';\nconst NATIVE_CRYPTO_PARENT_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-native-crypto-parent-v1:';\nconst IDENTITY_PLAN_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-ingress-plan-v1:';\nconst IDENTITY_SEED_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-ingress-identity-seed-v1:';\nconst IDENTITY_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-ingress-identity-v1:';\nconst ROUTE_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-ingress-route-v1:';\nconst PROJECTION_BINDING_DOMAIN =\n  'calapres-chatwoot-reconciliation-durable-projection-v1:';\nconst REQUEST_LEASE_TOKEN_DOMAIN =\n  'calapres-chatwoot-reconciliation-request-lease-v1:';\nconst BUSINESS_LEASE_TOKEN_DOMAIN =\n  'calapres-chatwoot-reconciliation-business-lease-v1:';\nconst NATIVE_CRYPTO_TRUST_BOUNDARY = 'n8n_native_crypto_direct_lineage_v1';\nconst NATIVE_CRYPTO_NODE_TYPE = 'n8n-nodes-base.crypto';\nconst NATIVE_CRYPTO_NODE_TYPE_VERSION = 2;\nconst NATIVE_CRYPTO_CREDENTIAL_TYPE = 'crypto';\n\nconst CANDIDATE_CORE_FIELDS = Object.freeze([\n  'schema_version',\n  'kind',\n  'source',\n  'brand_id',\n  'account_id',\n  'inbox_id',\n  'channel',\n  'event',\n  'conversation_id',\n  'message_id',\n  'event_at',\n  'direction',\n  'visibility',\n  'sender_class',\n  'attachment_count',\n  'canonical_tuple_format',\n  'canonical_tuple',\n  'active_event_identity_key_version',\n  'retained_event_identity_key_versions',\n  'event_identity_hmac_requests',\n  'activation_floor_at',\n  'activation_policy_version',\n  'content_state',\n  'live_reread_required',\n  'raw_content_used',\n  'raw_contact_used',\n  'transient_only',\n  'persistence_allowed',\n  'wait_payload_allowed',\n  'audit_payload_allowed',\n  'customer_egress_allowed',\n]);\nconst CANDIDATE_FIELDS = Object.freeze([\n  ...CANDIDATE_CORE_FIELDS,\n  'candidate_ref',\n  'candidate_binding_sha256',\n]);\nconst TUPLE_FIELDS = Object.freeze([\n  'schema_version',\n  'account_id',\n  'inbox_id',\n  'event',\n  'conversation_id',\n  'message_id',\n]);\nconst HMAC_REQUEST_FIELDS = Object.freeze([\n  'purpose',\n  'key_version',\n  'algorithm',\n  'encoding',\n  'material_utf8',\n]);\nconst BOUND_HMAC_REQUEST_FIELDS = Object.freeze([\n  ...HMAC_REQUEST_FIELDS,\n  'request_binding_sha256',\n]);\nconst NATIVE_CRYPTO_STEP_FIELDS = Object.freeze([\n  'sequence',\n  'purpose',\n  'key_version',\n  'request_binding_sha256',\n  'node_name',\n  'node_type',\n  'node_type_version',\n  'action',\n  'hash_type',\n  'binary_data',\n  'encoding',\n  'value_expression',\n  'digest_property',\n  'credential_type',\n  'credential_placeholder',\n]);\nconst NATIVE_CRYPTO_LINEAGE_FIELDS = Object.freeze([\n  'schema_version',\n  'kind',\n  'trust_boundary',\n  'stage',\n  'single_item_required',\n  'direct_lineage_required',\n  'split_allowed',\n  'merge_allowed',\n  'mutable_intermediary_allowed',\n  'cryptographic_verification_performed_in_code',\n  'parent_binding_sha256',\n  'request_array_property',\n  'steps',\n  'lineage_binding_sha256',\n]);\nconst TRUST_LABEL_FIELDS = Object.freeze([\n  'trust_boundary',\n  'native_crypto_direct_lineage_required',\n  'cryptographic_verification_performed_in_code',\n]);\nconst PLAN_FIELDS = Object.freeze([\n  'schema_version', 'kind', 'source', 'ingress_mode', 'execution_id',\n  'candidate', 'provenance', 'hmac_requests', 'native_crypto_lineage',\n  ...TRUST_LABEL_FIELDS,\n  'signed_webhook_evidence', 'raw_body_evidence', 'customer_egress_allowed',\n  'plan_binding_sha256',\n]);\nconst IDENTITY_FIELDS = Object.freeze([\n  'schema_version', 'kind', 'source', 'ingress_mode', 'execution_id',\n  'candidate', 'provenance', 'event_identity_fingerprints',\n  'request_attempt_fingerprints', 'identity_seed_sha256', 'route_hmac_requests',\n  'native_crypto_lineage', ...TRUST_LABEL_FIELDS,\n  'signed_webhook_evidence', 'raw_body_evidence', 'customer_egress_allowed',\n  'identity_binding_sha256',\n]);\nconst PROVENANCE_FIELDS = Object.freeze([\n  'schema_version',\n  'request_source',\n  'source',\n  'brand_id',\n  'account_id',\n  'inbox_id',\n  'channel',\n  'conversation_id',\n  'message_id',\n  'scan_id',\n  'expected_after_message_id',\n  'page_binding_sha256',\n  'candidate_ref',\n  'candidate_binding_sha256',\n  'activation_floor_at',\n  'activation_policy_version',\n  'kind',\n  'scan_lease_token',\n  'customer_egress_allowed',\n  'source_binding_sha256',\n]);\n\nconst HEX_64 = /^[a-f0-9]{64}$/;\nconst EVENT_KEY_VERSION = /^calapres-identity-hmac-v([1-9][0-9]*)$/;\nconst STORAGE_KEY_VERSION = /^hmac-sha256-v([1-9][0-9]*)$/;\nconst KEY_REGISTRY_VERSION = /^calapres-storage-keys-v[1-9][0-9]*$/;\nconst BASELINE_KEY_VERSION = /^calapres-hmac-v[1-9][0-9]*$/;\nconst POLICY_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;\nconst KNOWLEDGE_VERSION = POLICY_VERSION;\nconst EXECUTION_ID = /^[A-Za-z0-9_-]{1,120}$/;\nconst SCAN_ID = /^cwrs_[a-f0-9]{24}$/;\nconst OPAQUE_ID = /^[A-Za-z0-9:_-]{4,160}$/;\nconst POSITIVE_TOKEN = /^[1-9][0-9]{0,30}$/;\nconst STRICT_ISO_TIMESTAMP =\n  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;\n\nclass ReconciliationIngressBridgeError extends Error {\n  constructor(reasonCode) {\n    super(reasonCode);\n    this.name = 'ReconciliationIngressBridgeError';\n    this.reasonCode = reasonCode;\n  }\n}\n\nfunction fail(reasonCode) {\n  throw new ReconciliationIngressBridgeError(reasonCode);\n}\n\nfunction plainObject(value) {\n  return value !== null && typeof value === 'object' && !Array.isArray(value);\n}\n\nfunction exactObject(value, fields, reasonCode) {\n  if (!plainObject(value)) fail(reasonCode);\n  const expected = fields instanceof Set ? fields : new Set(fields);\n  const keys = Object.keys(value);\n  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) fail(reasonCode);\n  return value;\n}\n\nfunction deepFreeze(value) {\n  if (Array.isArray(value)) value.forEach(deepFreeze);\n  else if (plainObject(value)) Object.values(value).forEach(deepFreeze);\n  return Object.freeze(value);\n}\n\nfunction stableJson(value) {\n  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';\n  if (plainObject(value)) {\n    return '{' + Object.keys(value).sort().map((key) =>\n      JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';\n  }\n  return JSON.stringify(value);\n}\n\nfunction pick(value, fields) {\n  const result = {};\n  for (const field of fields) result[field] = value[field];\n  return result;\n}\n\nfunction normalizeIso(value, reasonCode) {\n  if (typeof value !== 'string' || !STRICT_ISO_TIMESTAMP.test(value)) fail(reasonCode);\n  const milliseconds = Date.parse(value);\n  if (!Number.isFinite(milliseconds)) fail(reasonCode);\n  return new Date(milliseconds).toISOString();\n}\n\nfunction positiveToken(value, maximumDigits, reasonCode) {\n  if (typeof value !== 'string' || value.length > maximumDigits || !POSITIVE_TOKEN.test(value) ||\n      !Number.isSafeInteger(Number(value)) || String(Number(value)) !== value) fail(reasonCode);\n  return value;\n}\n\nfunction integerBetween(value, minimum, maximum, reasonCode) {\n  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(reasonCode);\n  return value;\n}\n\nfunction dependencies(value) {\n  exactObject(value, [\n    'sha256Hex',\n    'validate_messages_page',\n    'active_event_identity_key_version',\n    'retained_event_identity_key_versions',\n    'event_to_storage_key_versions',\n    'key_registry_version',\n    'activation_floor_at',\n    'activation_policy_version',\n    'request_ttl_seconds',\n    'event_retention_seconds',\n    'lease_duration_seconds',\n    'baseline_fingerprint_key_version',\n    'knowledge_version',\n    'retention_seconds',\n  ], 'bridge_dependencies_invalid');\n  if (typeof value.sha256Hex !== 'function' ||\n      typeof value.validate_messages_page !== 'function' ||\n      !EVENT_KEY_VERSION.test(value.active_event_identity_key_version || '') ||\n      !Array.isArray(value.retained_event_identity_key_versions) ||\n      value.retained_event_identity_key_versions.length > 8 ||\n      value.retained_event_identity_key_versions.some((entry) =>\n        !EVENT_KEY_VERSION.test(entry || '')) ||\n      new Set([\n        value.active_event_identity_key_version,\n        ...value.retained_event_identity_key_versions,\n      ]).size !== value.retained_event_identity_key_versions.length + 1 ||\n      !KEY_REGISTRY_VERSION.test(value.key_registry_version || '') ||\n      !POLICY_VERSION.test(value.activation_policy_version || '') ||\n      !BASELINE_KEY_VERSION.test(value.baseline_fingerprint_key_version || '') ||\n      !KNOWLEDGE_VERSION.test(value.knowledge_version || '')) {\n    fail('bridge_dependencies_invalid');\n  }\n  const keyVersions = [\n    value.active_event_identity_key_version,\n    ...value.retained_event_identity_key_versions,\n  ];\n  exactObject(value.event_to_storage_key_versions, keyVersions, 'storage_key_mapping_invalid');\n  const storageVersions = [];\n  for (const eventVersion of keyVersions) {\n    const eventMatch = eventVersion.match(EVENT_KEY_VERSION);\n    const storageVersion = value.event_to_storage_key_versions[eventVersion];\n    const storageMatch = typeof storageVersion === 'string'\n      ? storageVersion.match(STORAGE_KEY_VERSION) : null;\n    if (!storageMatch || storageMatch[1] !== eventMatch[1]) fail('storage_key_mapping_invalid');\n    storageVersions.push(storageVersion);\n  }\n  if (new Set(storageVersions).size !== storageVersions.length) fail('storage_key_mapping_invalid');\n  const requestTtlSeconds = integerBetween(\n    value.request_ttl_seconds, 60, 86400, 'request_ttl_invalid',\n  );\n  const eventRetentionSeconds = integerBetween(\n    value.event_retention_seconds, 300, 604800, 'event_retention_invalid',\n  );\n  const leaseDurationSeconds = integerBetween(\n    value.lease_duration_seconds, 1, 900, 'lease_duration_invalid',\n  );\n  if (leaseDurationSeconds > requestTtlSeconds || leaseDurationSeconds > eventRetentionSeconds) {\n    fail('lease_duration_invalid');\n  }\n  const retentionSeconds = integerBetween(\n    value.retention_seconds, 86400, 31536000, 'retention_seconds_invalid',\n  );\n  return Object.freeze({\n    sha256Hex: value.sha256Hex,\n    validateMessagesPage: value.validate_messages_page,\n    activeEventIdentityKeyVersion: value.active_event_identity_key_version,\n    retainedEventIdentityKeyVersions: Object.freeze([\n      ...value.retained_event_identity_key_versions,\n    ]),\n    keyVersions: Object.freeze(keyVersions),\n    eventToStorageKeyVersions: Object.freeze({ ...value.event_to_storage_key_versions }),\n    keyRegistryVersion: value.key_registry_version,\n    activationFloorAt: normalizeIso(value.activation_floor_at, 'activation_floor_invalid'),\n    activationPolicyVersion: value.activation_policy_version,\n    requestTtlSeconds,\n    eventRetentionSeconds,\n    leaseDurationSeconds,\n    baselineFingerprintKeyVersion: value.baseline_fingerprint_key_version,\n    knowledgeVersion: value.knowledge_version,\n    retentionSeconds,\n  });\n}\n\nfunction digestText(deps, value) {\n  const result = deps.sha256Hex(value);\n  if (!HEX_64.test(result || '')) fail('sha256_dependency_output_invalid');\n  return result;\n}\n\nfunction digest(deps, domain, value) {\n  return digestText(deps, domain + stableJson(value));\n}\n\nfunction orderedTupleJson(tuple) {\n  return JSON.stringify({\n    schema_version: tuple.schema_version,\n    account_id: tuple.account_id,\n    inbox_id: tuple.inbox_id,\n    event: tuple.event,\n    conversation_id: tuple.conversation_id,\n    message_id: tuple.message_id,\n  });\n}\n\nfunction rawHmacRequest(purpose, keyVersion, materialUtf8) {\n  return Object.freeze({\n    purpose,\n    key_version: keyVersion,\n    algorithm: 'hmac-sha256',\n    encoding: 'hex',\n    material_utf8: materialUtf8,\n  });\n}\n\nfunction sourceProvenance(candidate, messagesPage, reconciliationContext, deps) {\n  exactObject(reconciliationContext, [\n    'scan_id',\n    'scan_lease_token',\n    'expected_after_message_id',\n  ], 'reconciliation_context_invalid');\n  if (typeof reconciliationContext.scan_id !== 'string' ||\n      !SCAN_ID.test(reconciliationContext.scan_id) ||\n      typeof reconciliationContext.scan_lease_token !== 'string' ||\n      !OPAQUE_ID.test(reconciliationContext.scan_lease_token) ||\n      !Number.isSafeInteger(reconciliationContext.expected_after_message_id) ||\n      reconciliationContext.expected_after_message_id < 0 ||\n      !Number.isSafeInteger(messagesPage.requested_after_message_id) ||\n      messagesPage.requested_after_message_id < 0 ||\n      messagesPage.requested_after_message_id !==\n        reconciliationContext.expected_after_message_id ||\n      messagesPage.requested_after_message_id >= Number(candidate.message_id) ||\n      !HEX_64.test(messagesPage.page_binding_sha256 || '')) {\n    fail('reconciliation_context_invalid');\n  }\n  const bindingCore = {\n    schema_version: '1.0',\n    request_source: REQUEST_SOURCE,\n    source: SOURCE,\n    brand_id: BRAND_ID,\n    account_id: candidate.account_id,\n    inbox_id: candidate.inbox_id,\n    channel: candidate.channel,\n    conversation_id: candidate.conversation_id,\n    message_id: candidate.message_id,\n    scan_id: reconciliationContext.scan_id,\n    expected_after_message_id: reconciliationContext.expected_after_message_id,\n    page_binding_sha256: messagesPage.page_binding_sha256,\n    candidate_ref: candidate.candidate_ref,\n    candidate_binding_sha256: candidate.candidate_binding_sha256,\n    activation_floor_at: deps.activationFloorAt,\n    activation_policy_version: deps.activationPolicyVersion,\n  };\n  const core = {\n    ...bindingCore,\n    kind: 'chatwoot_reconciliation_source_provenance_v1',\n    scan_lease_token: reconciliationContext.scan_lease_token,\n    customer_egress_allowed: false,\n  };\n  return deepFreeze({\n    ...core,\n    source_binding_sha256: digest(deps, SOURCE_BINDING_DOMAIN, bindingCore),\n  });\n}\n\nfunction boundHmacRequest(deps, stage, parentBinding, request) {\n  const requestBinding = digest(deps, HMAC_REQUEST_BINDING_DOMAIN, {\n    stage,\n    parent_binding_sha256: parentBinding,\n    request,\n  });\n  return Object.freeze({ ...request, request_binding_sha256: requestBinding });\n}\n\nfunction nativeCryptoCredentialPlaceholder(keyVersion) {\n  const match = keyVersion.match(EVENT_KEY_VERSION);\n  if (!match) fail('native_crypto_key_version_invalid');\n  return 'Calapres Event Identity HMAC v' + match[1];\n}\n\nfunction nativeCryptoDigestProperty(stage, sequence, request) {\n  const version = request.key_version.match(EVENT_KEY_VERSION);\n  if (!version || !/^[a-z][a-z0-9_]{2,80}$/.test(stage) ||\n      !/^[a-z][a-z0-9_]{2,80}$/.test(request.purpose)) {\n    fail('native_crypto_lineage_invalid');\n  }\n  return [\n    'reconciliation_hmac',\n    stage,\n    String(sequence).padStart(2, '0'),\n    request.purpose,\n    'v' + version[1],\n  ].join('_');\n}\n\nfunction nativeCryptoNodeName(stage, sequence, request) {\n  return [\n    'Crypto Reconciliation',\n    String(sequence).padStart(2, '0'),\n    stage,\n    request.purpose,\n    request.key_version,\n    'Placeholder',\n  ].join(' - ');\n}\n\nfunction buildNativeCryptoLineage(deps, stage, parentBinding, requestArrayProperty, requests) {\n  if (!HEX_64.test(parentBinding || '') ||\n      !['hmac_requests', 'route_hmac_requests'].includes(requestArrayProperty) ||\n      !Array.isArray(requests) || requests.length < 1 || requests.length > 36) {\n    fail('native_crypto_lineage_invalid');\n  }\n  const steps = requests.map((request, index) => {\n    exactObject(request, BOUND_HMAC_REQUEST_FIELDS, 'native_crypto_lineage_invalid');\n    const sequence = index + 1;\n    return Object.freeze({\n      sequence,\n      purpose: request.purpose,\n      key_version: request.key_version,\n      request_binding_sha256: request.request_binding_sha256,\n      node_name: nativeCryptoNodeName(stage, sequence, request),\n      node_type: NATIVE_CRYPTO_NODE_TYPE,\n      node_type_version: NATIVE_CRYPTO_NODE_TYPE_VERSION,\n      action: 'hmac',\n      hash_type: 'SHA256',\n      binary_data: false,\n      encoding: 'hex',\n      value_expression:\n        '={{ $json.' + requestArrayProperty + '[' + index + '].material_utf8 }}',\n      digest_property: nativeCryptoDigestProperty(stage, sequence, request),\n      credential_type: NATIVE_CRYPTO_CREDENTIAL_TYPE,\n      credential_placeholder: nativeCryptoCredentialPlaceholder(request.key_version),\n    });\n  });\n  if (new Set(steps.map((step) => step.digest_property)).size !== steps.length ||\n      new Set(steps.map((step) => step.node_name)).size !== steps.length) {\n    fail('native_crypto_lineage_invalid');\n  }\n  const core = {\n    schema_version: '1.0',\n    kind: 'chatwoot_reconciliation_native_crypto_lineage_v1',\n    trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,\n    stage,\n    single_item_required: true,\n    direct_lineage_required: true,\n    split_allowed: false,\n    merge_allowed: false,\n    mutable_intermediary_allowed: false,\n    cryptographic_verification_performed_in_code: false,\n    parent_binding_sha256: parentBinding,\n    request_array_property: requestArrayProperty,\n    steps: Object.freeze(steps),\n  };\n  return deepFreeze({\n    ...core,\n    lineage_binding_sha256: digest(deps, NATIVE_CRYPTO_LINEAGE_BINDING_DOMAIN, core),\n  });\n}\n\nfunction validateNativeCryptoLineage(\n  value, deps, stage, parentBinding, requestArrayProperty, requests,\n) {\n  exactObject(value, NATIVE_CRYPTO_LINEAGE_FIELDS, 'native_crypto_lineage_invalid');\n  if (!Array.isArray(value.steps) ||\n      value.steps.some((step) => {\n        try {\n          exactObject(step, NATIVE_CRYPTO_STEP_FIELDS, 'native_crypto_lineage_invalid');\n          return false;\n        } catch (_error) {\n          return true;\n        }\n      })) fail('native_crypto_lineage_invalid');\n  const expected = buildNativeCryptoLineage(\n    deps, stage, parentBinding, requestArrayProperty, requests,\n  );\n  if (stableJson(value) !== stableJson(expected)) fail('native_crypto_lineage_invalid');\n  return value;\n}\n\nfunction nativeCryptoParentBinding(deps, stage, value) {\n  return digest(deps, NATIVE_CRYPTO_PARENT_BINDING_DOMAIN, { stage, value });\n}\n\nfunction nativeCryptoOutput(value, baseFields, validateBase, reasonCode) {\n  if (!plainObject(value) || baseFields.some((field) =>\n    !Object.prototype.hasOwnProperty.call(value, field))) fail(reasonCode);\n  const base = pick(value, baseFields);\n  validateBase(base);\n  const lineage = base.native_crypto_lineage;\n  const digestProperties = lineage.steps.map((step) => step.digest_property);\n  exactObject(value, [...baseFields, ...digestProperties], reasonCode);\n  const results = new Map();\n  for (const step of lineage.steps) {\n    const keyedPurpose = step.purpose + ':' + step.key_version;\n    if (results.has(keyedPurpose) || !HEX_64.test(value[step.digest_property] || '')) {\n      fail(reasonCode);\n    }\n    results.set(keyedPurpose, value[step.digest_property]);\n  }\n  if (results.size !== lineage.steps.length) fail(reasonCode);\n  return Object.freeze({ base, results });\n}\n\nfunction validateCandidate(value, deps) {\n  exactObject(value, CANDIDATE_FIELDS, 'candidate_shape_invalid');\n  exactObject(value.canonical_tuple, TUPLE_FIELDS, 'candidate_tuple_invalid');\n  const channel = INBOX_CHANNELS[value.inbox_id];\n  const conversationId = positiveToken(value.conversation_id, 30, 'candidate_route_invalid');\n  const messageId = positiveToken(value.message_id, 15, 'candidate_route_invalid');\n  const eventAt = normalizeIso(value.event_at, 'candidate_event_time_invalid');\n  if (value.schema_version !== '1.0' ||\n      value.kind !== 'chatwoot_reconciliation_event_candidate_v1' ||\n      value.source !== SOURCE || value.brand_id !== BRAND_ID ||\n      value.account_id !== ACCOUNT_ID || !channel || value.channel !== channel ||\n      value.event !== 'message_created' || value.direction !== 'incoming' ||\n      value.visibility !== 'public' || value.sender_class !== 'contact' ||\n      !Number.isSafeInteger(value.attachment_count) || value.attachment_count < 0 ||\n      value.attachment_count > 32 || value.canonical_tuple_format !== CANONICAL_TUPLE_FORMAT ||\n      value.active_event_identity_key_version !== deps.activeEventIdentityKeyVersion ||\n      stableJson(value.retained_event_identity_key_versions) !==\n        stableJson(deps.retainedEventIdentityKeyVersions) ||\n      value.activation_floor_at !== deps.activationFloorAt ||\n      value.activation_policy_version !== deps.activationPolicyVersion ||\n      value.content_state !== 'deferred_live_reread' || value.live_reread_required !== true ||\n      value.raw_content_used !== false || value.raw_contact_used !== false ||\n      value.transient_only !== true || value.persistence_allowed !== false ||\n      value.wait_payload_allowed !== false || value.audit_payload_allowed !== false ||\n      value.customer_egress_allowed !== false ||\n      eventAt !== value.event_at || Date.parse(eventAt) < Date.parse(deps.activationFloorAt)) {\n    fail('candidate_invalid');\n  }\n  const expectedTuple = {\n    schema_version: '1.0',\n    account_id: ACCOUNT_ID,\n    inbox_id: value.inbox_id,\n    event: 'message_created',\n    conversation_id: conversationId,\n    message_id: messageId,\n  };\n  if (stableJson(value.canonical_tuple) !== stableJson(expectedTuple)) {\n    fail('candidate_tuple_mismatch');\n  }\n  if (!Array.isArray(value.event_identity_hmac_requests) ||\n      value.event_identity_hmac_requests.length !== deps.keyVersions.length) {\n    fail('candidate_hmac_requests_invalid');\n  }\n  const tupleJson = orderedTupleJson(expectedTuple);\n  const expectedEventRequests = deps.keyVersions.map((keyVersion) =>\n    rawHmacRequest('event_identity', keyVersion, tupleJson));\n  for (let index = 0; index < expectedEventRequests.length; index += 1) {\n    exactObject(\n      value.event_identity_hmac_requests[index],\n      HMAC_REQUEST_FIELDS,\n      'candidate_hmac_requests_invalid',\n    );\n    if (stableJson(value.event_identity_hmac_requests[index]) !==\n        stableJson(expectedEventRequests[index])) fail('candidate_hmac_requests_invalid');\n  }\n  const core = pick(value, CANDIDATE_CORE_FIELDS);\n  const expectedRef = 'cwr_' + digest(\n    deps, 'calapres-chatwoot-reconciliation-candidate-v1:', core,\n  ).slice(0, 24);\n  const expectedBinding = digest(\n    deps, 'calapres-chatwoot-reconciliation-candidate-binding-v1:', core,\n  );\n  if (value.candidate_ref !== expectedRef ||\n      value.candidate_binding_sha256 !== expectedBinding) fail('candidate_binding_invalid');\n  return value;\n}\n\nfunction validateCandidateMembership(messagesPage, candidate, deps) {\n  let page;\n  try {\n    page = deps.validateMessagesPage(messagesPage);\n  } catch (_error) {\n    fail('messages_page_invalid');\n  }\n  if (!plainObject(page) || stableJson(page) !== stableJson(messagesPage) ||\n      !Array.isArray(page.event_candidates)) fail('messages_page_invalid');\n  const validatedCandidate = validateCandidate(candidate, deps);\n  const matches = page.event_candidates.filter((entry) =>\n    plainObject(entry) && entry.candidate_ref === validatedCandidate.candidate_ref);\n  if (matches.length !== 1 || stableJson(matches[0]) !== stableJson(validatedCandidate)) {\n    fail('candidate_page_membership_invalid');\n  }\n  if (page.account_id !== validatedCandidate.account_id ||\n      page.inbox_id !== validatedCandidate.inbox_id ||\n      page.channel !== validatedCandidate.channel ||\n      page.conversation_id !== validatedCandidate.conversation_id ||\n      page.activation_floor_at !== validatedCandidate.activation_floor_at ||\n      page.activation_policy_version !== validatedCandidate.activation_policy_version ||\n      !Number.isSafeInteger(page.requested_after_message_id) ||\n      !Number.isSafeInteger(page.proposed_next_after_message_id) ||\n      page.requested_after_message_id >= Number(validatedCandidate.message_id) ||\n      page.proposed_next_after_message_id < Number(validatedCandidate.message_id)) {\n    fail('candidate_page_route_invalid');\n  }\n  return Object.freeze({ page, candidate: validatedCandidate });\n}\n\nfunction expectedInitialRequests(candidate, provenance, deps) {\n  const tupleJson = orderedTupleJson(candidate.canonical_tuple);\n  const attemptCanonical = {\n    schema_version: '1.0',\n    request_source: provenance.request_source,\n    source: provenance.source,\n    brand_id: provenance.brand_id,\n    account_id: provenance.account_id,\n    inbox_id: provenance.inbox_id,\n    channel: provenance.channel,\n    conversation_id: provenance.conversation_id,\n    message_id: provenance.message_id,\n    scan_id: provenance.scan_id,\n    expected_after_message_id: provenance.expected_after_message_id,\n    page_binding_sha256: provenance.page_binding_sha256,\n    candidate_ref: provenance.candidate_ref,\n    candidate_binding_sha256: provenance.candidate_binding_sha256,\n    activation_floor_at: provenance.activation_floor_at,\n    activation_policy_version: provenance.activation_policy_version,\n  };\n  const requests = [];\n  for (const keyVersion of deps.keyVersions) {\n    const eventRequest = rawHmacRequest('event_identity', keyVersion, tupleJson);\n    const replayRequest = rawHmacRequest(\n      'reconciliation_request_attempt',\n      keyVersion,\n      REQUEST_ATTEMPT_IDENTITY_DOMAIN + stableJson(attemptCanonical),\n    );\n    requests.push(boundHmacRequest(\n      deps, 'event_identity', candidate.candidate_binding_sha256, eventRequest,\n    ));\n    requests.push(boundHmacRequest(\n      deps, 'request_attempt_identity', provenance.source_binding_sha256, replayRequest,\n    ));\n  }\n  return Object.freeze(requests);\n}\n\nfunction validatePlan(value, deps) {\n  exactObject(value, PLAN_FIELDS, 'identity_plan_invalid');\n  const candidate = validateCandidate(value.candidate, deps);\n  if (typeof value.execution_id !== 'string' || !EXECUTION_ID.test(value.execution_id)) {\n    fail('identity_plan_invalid');\n  }\n  exactObject(value.provenance, PROVENANCE_FIELDS, 'identity_plan_invalid');\n  const expectedProvenance = sourceProvenance(\n    candidate,\n    {\n      requested_after_message_id: value.provenance.expected_after_message_id,\n      page_binding_sha256: value.provenance.page_binding_sha256,\n    },\n    {\n      scan_id: value.provenance.scan_id,\n      scan_lease_token: value.provenance.scan_lease_token,\n      expected_after_message_id: value.provenance.expected_after_message_id,\n    },\n    deps,\n  );\n  if (stableJson(value.provenance) !== stableJson(expectedProvenance)) {\n    fail('identity_plan_invalid');\n  }\n  const expectedRequests = expectedInitialRequests(candidate, expectedProvenance, deps);\n  const expectedParentBinding = nativeCryptoParentBinding(deps, 'candidate_identity', {\n    candidate_binding_sha256: candidate.candidate_binding_sha256,\n    source_binding_sha256: expectedProvenance.source_binding_sha256,\n    execution_id: value.execution_id,\n  });\n  validateNativeCryptoLineage(\n    value.native_crypto_lineage,\n    deps,\n    'candidate_identity',\n    expectedParentBinding,\n    'hmac_requests',\n    expectedRequests,\n  );\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' ||\n      value.kind !== 'chatwoot_reconciliation_ingress_identity_plan_v1' ||\n      value.source !== SOURCE || value.ingress_mode !== 'reconciliation_api_read' ||\n      value.trust_boundary !== NATIVE_CRYPTO_TRUST_BOUNDARY ||\n      value.native_crypto_direct_lineage_required !== true ||\n      value.cryptographic_verification_performed_in_code !== false ||\n      value.signed_webhook_evidence !== null || value.raw_body_evidence !== null ||\n      value.customer_egress_allowed !== false || !Array.isArray(value.hmac_requests) ||\n      stableJson(value.hmac_requests) !== stableJson(expectedRequests) ||\n      value.plan_binding_sha256 !== digest(deps, IDENTITY_PLAN_BINDING_DOMAIN, core)) {\n    fail('identity_plan_invalid');\n  }\n  return value;\n}\n\nfunction identitySeed(candidate, provenance, eventFingerprints, attemptFingerprints, deps) {\n  return digest(deps, IDENTITY_SEED_BINDING_DOMAIN, {\n    source: SOURCE,\n    request_source: REQUEST_SOURCE,\n    source_binding_sha256: provenance.source_binding_sha256,\n    candidate_ref: candidate.candidate_ref,\n    candidate_binding_sha256: candidate.candidate_binding_sha256,\n    event_identity_fingerprints: eventFingerprints,\n    request_attempt_fingerprints: attemptFingerprints,\n  });\n}\n\nfunction expectedRouteRequests(candidate, eventFingerprints, seed, deps) {\n  const requests = [];\n  for (const keyVersion of deps.keyVersions) {\n    const eventFingerprint = eventFingerprints[keyVersion];\n    const messageCanonical = {\n      schema_version: '1.0',\n      brand_id: BRAND_ID,\n      account_id: candidate.account_id,\n      inbox_id: candidate.inbox_id,\n      conversation_id: candidate.conversation_id,\n      message_id: candidate.message_id,\n      direction: 'inbound',\n      visibility: 'public',\n      event_identity_key_version: keyVersion,\n      event_identity_fingerprint: eventFingerprint,\n    };\n    const conversationCanonical = {\n      schema_version: '1.0',\n      brand_id: BRAND_ID,\n      account_id: candidate.account_id,\n      inbox_id: candidate.inbox_id,\n      conversation_id: candidate.conversation_id,\n      event_identity_key_version: keyVersion,\n    };\n    requests.push(boundHmacRequest(\n      deps,\n      'message_anchor',\n      seed,\n      rawHmacRequest(\n        'message_anchor',\n        keyVersion,\n        MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(messageCanonical),\n      ),\n    ));\n    requests.push(boundHmacRequest(\n      deps,\n      'conversation',\n      seed,\n      rawHmacRequest(\n        'conversation',\n        keyVersion,\n        CONVERSATION_FINGERPRINT_DOMAIN + JSON.stringify(conversationCanonical),\n      ),\n    ));\n  }\n  return Object.freeze(requests);\n}\n\nfunction validateFingerprintMap(value, keyVersions, reasonCode) {\n  exactObject(value, keyVersions, reasonCode);\n  for (const keyVersion of keyVersions) {\n    if (!HEX_64.test(value[keyVersion] || '')) fail(reasonCode);\n  }\n  return value;\n}\n\nfunction validateIdentity(value, deps) {\n  exactObject(value, IDENTITY_FIELDS, 'identity_invalid');\n  const candidate = validateCandidate(value.candidate, deps);\n  if (typeof value.execution_id !== 'string' || !EXECUTION_ID.test(value.execution_id)) {\n    fail('identity_invalid');\n  }\n  exactObject(value.provenance, PROVENANCE_FIELDS, 'identity_invalid');\n  const expectedProvenance = sourceProvenance(\n    candidate,\n    {\n      requested_after_message_id: value.provenance.expected_after_message_id,\n      page_binding_sha256: value.provenance.page_binding_sha256,\n    },\n    {\n      scan_id: value.provenance.scan_id,\n      scan_lease_token: value.provenance.scan_lease_token,\n      expected_after_message_id: value.provenance.expected_after_message_id,\n    },\n    deps,\n  );\n  if (stableJson(value.provenance) !== stableJson(expectedProvenance)) fail('identity_invalid');\n  validateFingerprintMap(\n    value.event_identity_fingerprints, deps.keyVersions, 'identity_fingerprints_invalid',\n  );\n  validateFingerprintMap(\n    value.request_attempt_fingerprints, deps.keyVersions, 'attempt_fingerprints_invalid',\n  );\n  const expectedSeed = identitySeed(\n    candidate,\n    expectedProvenance,\n    value.event_identity_fingerprints,\n    value.request_attempt_fingerprints,\n    deps,\n  );\n  const expectedRequests = expectedRouteRequests(\n    candidate, value.event_identity_fingerprints, expectedSeed, deps,\n  );\n  const expectedParentBinding = nativeCryptoParentBinding(deps, 'route_identity', {\n    identity_seed_sha256: expectedSeed,\n    execution_id: value.execution_id,\n  });\n  validateNativeCryptoLineage(\n    value.native_crypto_lineage,\n    deps,\n    'route_identity',\n    expectedParentBinding,\n    'route_hmac_requests',\n    expectedRequests,\n  );\n  const core = { ...value };\n  delete core.identity_binding_sha256;\n  if (value.schema_version !== '1.0' ||\n      value.kind !== 'chatwoot_reconciliation_ingress_identity_v1' ||\n      value.source !== SOURCE || value.ingress_mode !== 'reconciliation_api_read' ||\n      value.identity_seed_sha256 !== expectedSeed ||\n      stableJson(value.route_hmac_requests) !== stableJson(expectedRequests) ||\n      value.trust_boundary !== NATIVE_CRYPTO_TRUST_BOUNDARY ||\n      value.native_crypto_direct_lineage_required !== true ||\n      value.cryptographic_verification_performed_in_code !== false ||\n      value.signed_webhook_evidence !== null || value.raw_body_evidence !== null ||\n      value.customer_egress_allowed !== false ||\n      value.identity_binding_sha256 !== digest(deps, IDENTITY_BINDING_DOMAIN, core)) {\n    fail('identity_invalid');\n  }\n  return value;\n}\n\nfunction deterministicDelay(seed, minimum, maximum) {\n  let hash = 2166136261;\n  for (const character of seed) {\n    hash ^= character.charCodeAt(0);\n    hash = Math.imul(hash, 16777619) >>> 0;\n  }\n  return minimum + (hash % (maximum - minimum + 1));\n}\n\nfunction storageAliases(fingerprints, deps) {\n  return deps.retainedEventIdentityKeyVersions.map((keyVersion) => Object.freeze({\n    fingerprint: fingerprints[keyVersion],\n    key_version: deps.eventToStorageKeyVersions[keyVersion],\n  }));\n}\n\nfunction validateProjection(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'source', 'request_source', 'source_binding_sha256',\n    'ingress_mode', 'candidate_ref', 'candidate_binding_sha256',\n    'reconciliation_provenance', 'route_identity',\n    'claim_request_replay_command',\n    'claim_business_event_command',\n    'advance_conversation_generation_control', 'atomic_write_allowed',\n    'required_atomic_contract_fields',\n    ...TRUST_LABEL_FIELDS,\n    'signed_webhook_evidence', 'raw_body_evidence', 'customer_egress_allowed',\n    'projection_binding_sha256',\n  ], 'durable_projection_invalid');\n  const core = { ...value };\n  delete core.projection_binding_sha256;\n  if (value.schema_version !== '1.0' ||\n      value.kind !== 'chatwoot_reconciliation_durable_ingress_projection_v1' ||\n      value.source !== SOURCE || value.request_source !== REQUEST_SOURCE ||\n      !HEX_64.test(value.source_binding_sha256 || '') ||\n      value.ingress_mode !== 'reconciliation_api_read' ||\n      value.trust_boundary !== NATIVE_CRYPTO_TRUST_BOUNDARY ||\n      value.native_crypto_direct_lineage_required !== true ||\n      value.cryptographic_verification_performed_in_code !== false ||\n      value.atomic_write_allowed !== false ||\n      value.signed_webhook_evidence !== null || value.raw_body_evidence !== null ||\n      value.customer_egress_allowed !== false ||\n      value.projection_binding_sha256 !== digest(deps, PROJECTION_BINDING_DOMAIN, core)) {\n    fail('durable_projection_invalid');\n  }\n  return value;\n}\n\nfunction buildNativeCryptoDirectLineageGraph(lineage, entryNodeName, finalizerNodeName) {\n  exactObject(lineage, NATIVE_CRYPTO_LINEAGE_FIELDS, 'native_crypto_lineage_invalid');\n  if (!Array.isArray(lineage.steps) || lineage.steps.length < 1 ||\n      typeof entryNodeName !== 'string' || entryNodeName.length < 1 ||\n      entryNodeName.length > 160 || typeof finalizerNodeName !== 'string' ||\n      finalizerNodeName.length < 1 || finalizerNodeName.length > 160 ||\n      entryNodeName === finalizerNodeName) fail('native_crypto_graph_invalid');\n  const nodes = [{\n    name: entryNodeName,\n    role: 'entry',\n    node_type: 'n8n-nodes-base.code',\n    node_type_version: 2,\n    execution_mode: 'runOnceForEachItem',\n  }];\n  for (const step of lineage.steps) {\n    exactObject(step, NATIVE_CRYPTO_STEP_FIELDS, 'native_crypto_lineage_invalid');\n    nodes.push({\n      name: step.node_name,\n      role: 'native_crypto',\n      node_type: step.node_type,\n      node_type_version: step.node_type_version,\n      execution_mode: 'one_input_item_to_one_output_item',\n      parameters: {\n        action: step.action,\n        binaryData: step.binary_data,\n        type: step.hash_type,\n        dataPropertyName: step.digest_property,\n        encoding: step.encoding,\n        value: step.value_expression,\n      },\n      credentials: {\n        [step.credential_type]: {\n          name: step.credential_placeholder,\n          source_only_placeholder: true,\n        },\n      },\n    });\n  }\n  nodes.push({\n    name: finalizerNodeName,\n    role: 'finalizer',\n    node_type: 'n8n-nodes-base.code',\n    node_type_version: 2,\n    execution_mode: 'runOnceForEachItem',\n  });\n  const connections = [];\n  for (let index = 0; index < nodes.length - 1; index += 1) {\n    connections.push(Object.freeze({\n      from: nodes[index].name,\n      to: nodes[index + 1].name,\n      output_index: 0,\n      input_index: 0,\n    }));\n  }\n  return deepFreeze({\n    schema_version: '1.0',\n    kind: 'chatwoot_reconciliation_native_crypto_graph_contract_v1',\n    trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,\n    stage: lineage.stage,\n    entry_node_name: entryNodeName,\n    finalizer_node_name: finalizerNodeName,\n    single_item_required: true,\n    direct_lineage_required: true,\n    split_allowed: false,\n    merge_allowed: false,\n    mutable_intermediary_allowed: false,\n    finalizer_reads_json_only: true,\n    finalizer_execution_mode: 'runOnceForEachItem',\n    input_all_allowed: false,\n    input_first_allowed: false,\n    cryptographic_verification_performed_in_code: false,\n    nodes: Object.freeze(nodes.map((node) => deepFreeze(node))),\n    connections: Object.freeze(connections),\n  });\n}\n\nfunction validateNativeCryptoDirectLineageGraph(\n  value, lineage, entryNodeName, finalizerNodeName,\n) {\n  const expected = buildNativeCryptoDirectLineageGraph(\n    lineage, entryNodeName, finalizerNodeName,\n  );\n  if (stableJson(value) !== stableJson(expected)) fail('native_crypto_graph_invalid');\n  const incoming = new Map(expected.nodes.map((node) => [node.name, 0]));\n  const outgoing = new Map(expected.nodes.map((node) => [node.name, 0]));\n  for (const connection of value.connections) {\n    if (!incoming.has(connection.to) || !outgoing.has(connection.from)) {\n      fail('native_crypto_graph_invalid');\n    }\n    incoming.set(connection.to, incoming.get(connection.to) + 1);\n    outgoing.set(connection.from, outgoing.get(connection.from) + 1);\n  }\n  for (const node of value.nodes.filter((entry) => entry.role === 'native_crypto')) {\n    if (incoming.get(node.name) !== 1 || outgoing.get(node.name) !== 1 ||\n        node.node_type !== NATIVE_CRYPTO_NODE_TYPE ||\n        node.execution_mode !== 'one_input_item_to_one_output_item') {\n      fail('native_crypto_graph_invalid');\n    }\n  }\n  if (incoming.get(finalizerNodeName) !== 1 || outgoing.get(finalizerNodeName) !== 0 ||\n      incoming.get(entryNodeName) !== 0 || outgoing.get(entryNodeName) !== 1) {\n    fail('native_crypto_graph_invalid');\n  }\n  return value;\n}\n\nfunction createChatwootReconciliationIngressBridge(injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n\n  function prepareCandidateIdentity(input) {\n    exactObject(input, [\n      'messages_page', 'candidate', 'reconciliation_context', 'execution_id',\n    ], 'prepare_candidate_input_invalid');\n    if (typeof input.execution_id !== 'string' || !EXECUTION_ID.test(input.execution_id)) {\n      fail('execution_id_invalid');\n    }\n    const membership = validateCandidateMembership(\n      input.messages_page, input.candidate, deps,\n    );\n    const candidate = membership.candidate;\n    const provenance = sourceProvenance(\n      candidate, membership.page, input.reconciliation_context, deps,\n    );\n    const requests = expectedInitialRequests(candidate, provenance, deps);\n    const lineageParent = nativeCryptoParentBinding(deps, 'candidate_identity', {\n      candidate_binding_sha256: candidate.candidate_binding_sha256,\n      source_binding_sha256: provenance.source_binding_sha256,\n      execution_id: input.execution_id,\n    });\n    const core = {\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_ingress_identity_plan_v1',\n      source: SOURCE,\n      ingress_mode: 'reconciliation_api_read',\n      execution_id: input.execution_id,\n      candidate,\n      provenance,\n      hmac_requests: requests,\n      native_crypto_lineage: buildNativeCryptoLineage(\n        deps, 'candidate_identity', lineageParent, 'hmac_requests', requests,\n      ),\n      trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,\n      native_crypto_direct_lineage_required: true,\n      cryptographic_verification_performed_in_code: false,\n      signed_webhook_evidence: null,\n      raw_body_evidence: null,\n      customer_egress_allowed: false,\n    };\n    return deepFreeze({\n      ...core,\n      plan_binding_sha256: digest(deps, IDENTITY_PLAN_BINDING_DOMAIN, core),\n    });\n  }\n\n  function finalizeCandidateIdentity(nativeCryptoChainOutput) {\n    const chain = nativeCryptoOutput(\n      nativeCryptoChainOutput,\n      PLAN_FIELDS,\n      (value) => validatePlan(value, deps),\n      'identity_native_crypto_output_invalid',\n    );\n    const plan = chain.base;\n    const results = chain.results;\n    const eventFingerprints = {};\n    const attemptFingerprints = {};\n    for (const keyVersion of deps.keyVersions) {\n      eventFingerprints[keyVersion] = results.get('event_identity:' + keyVersion);\n      attemptFingerprints[keyVersion] =\n        results.get('reconciliation_request_attempt:' + keyVersion);\n    }\n    const seed = identitySeed(\n      plan.candidate, plan.provenance, eventFingerprints, attemptFingerprints, deps,\n    );\n    const routeRequests = expectedRouteRequests(\n      plan.candidate, eventFingerprints, seed, deps,\n    );\n    const lineageParent = nativeCryptoParentBinding(deps, 'route_identity', {\n      identity_seed_sha256: seed,\n      execution_id: plan.execution_id,\n    });\n    const core = {\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_ingress_identity_v1',\n      source: SOURCE,\n      ingress_mode: 'reconciliation_api_read',\n      execution_id: plan.execution_id,\n      candidate: plan.candidate,\n      provenance: plan.provenance,\n      event_identity_fingerprints: Object.freeze(eventFingerprints),\n      request_attempt_fingerprints: Object.freeze(attemptFingerprints),\n      identity_seed_sha256: seed,\n      route_hmac_requests: routeRequests,\n      native_crypto_lineage: buildNativeCryptoLineage(\n        deps, 'route_identity', lineageParent, 'route_hmac_requests', routeRequests,\n      ),\n      trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,\n      native_crypto_direct_lineage_required: true,\n      cryptographic_verification_performed_in_code: false,\n      signed_webhook_evidence: null,\n      raw_body_evidence: null,\n      customer_egress_allowed: false,\n    };\n    return deepFreeze({\n      ...core,\n      identity_binding_sha256: digest(deps, IDENTITY_BINDING_DOMAIN, core),\n    });\n  }\n\n  function finalizeRouteAndProjectAtomicClaims(nativeCryptoChainOutput) {\n    const chain = nativeCryptoOutput(\n      nativeCryptoChainOutput,\n      IDENTITY_FIELDS,\n      (value) => validateIdentity(value, deps),\n      'route_native_crypto_output_invalid',\n    );\n    const identity = chain.base;\n    const results = chain.results;\n    const eventFingerprints = identity.event_identity_fingerprints;\n    const provenance = identity.provenance;\n    const attemptFingerprints = identity.request_attempt_fingerprints;\n    const messageFingerprints = {};\n    const conversationFingerprints = {};\n    for (const keyVersion of deps.keyVersions) {\n      messageFingerprints[keyVersion] = results.get('message_anchor:' + keyVersion);\n      conversationFingerprints[keyVersion] = results.get('conversation:' + keyVersion);\n    }\n    const candidate = identity.candidate;\n    const activeVersion = deps.activeEventIdentityKeyVersion;\n    const activeStorageVersion = deps.eventToStorageKeyVersions[activeVersion];\n    const delayRange = DELAY_RANGES[candidate.channel];\n    const delaySeed = [\n      BRAND_ID,\n      candidate.account_id,\n      candidate.inbox_id,\n      candidate.conversation_id,\n      candidate.message_id,\n    ].join(':');\n    const delaySeconds = deterministicDelay(\n      delaySeed, delayRange.minimum, delayRange.maximum,\n    );\n    const eventAtMilliseconds = Date.parse(candidate.event_at);\n    const notBefore = new Date(eventAtMilliseconds + delaySeconds * 1000).toISOString();\n    const correlationId =\n      'calapres:' + candidate.conversation_id + ':' + candidate.message_id;\n    const routeCore = {\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_route_identity_v1',\n      source: SOURCE,\n      request_source: REQUEST_SOURCE,\n      source_binding_sha256: provenance.source_binding_sha256,\n      ingress_mode: 'reconciliation_api_read',\n      candidate_ref: candidate.candidate_ref,\n      candidate_binding_sha256: candidate.candidate_binding_sha256,\n      brand_id: BRAND_ID,\n      account_id: candidate.account_id,\n      inbox_id: candidate.inbox_id,\n      channel: candidate.channel,\n      conversation_id: candidate.conversation_id,\n      message_id: candidate.message_id,\n      event_at: candidate.event_at,\n      content_state: candidate.content_state,\n      attachment_count: candidate.attachment_count,\n      correlation_id: correlationId,\n      active_key_version: activeVersion,\n      retained_key_versions: Object.freeze([...deps.retainedEventIdentityKeyVersions]),\n      storage_key_versions: Object.freeze({\n        active: activeStorageVersion,\n        retained: Object.freeze(deps.retainedEventIdentityKeyVersions.map((keyVersion) =>\n          Object.freeze({\n            event_key_version: keyVersion,\n            storage_key_version: deps.eventToStorageKeyVersions[keyVersion],\n          }))),\n      }),\n      event_identity_fingerprints: Object.freeze(eventFingerprints),\n      request_attempt_fingerprints: Object.freeze(attemptFingerprints),\n      message_fingerprints: Object.freeze(messageFingerprints),\n      conversation_fingerprints: Object.freeze(conversationFingerprints),\n      request_attempt_key_fingerprint: attemptFingerprints[activeVersion],\n      delay_policy_version: DELAY_POLICY_VERSION,\n      delay_seconds: delaySeconds,\n      not_before: notBefore,\n      live_reread_required: true,\n      signed_webhook_evidence: null,\n      raw_body_evidence: null,\n      customer_egress_allowed: false,\n    };\n    const route = deepFreeze({\n      ...routeCore,\n      route_binding_sha256: digest(deps, ROUTE_BINDING_DOMAIN, routeCore),\n    });\n    const leaseOwnerId = 'edge_reconciliation_' + identity.execution_id;\n    const requestLeaseToken = 'request_recon_' + digest(deps, REQUEST_LEASE_TOKEN_DOMAIN, {\n      execution_id: identity.execution_id,\n      candidate_ref: candidate.candidate_ref,\n      request_attempt_fingerprint: attemptFingerprints[activeVersion],\n    }).slice(0, 48);\n    const businessLeaseToken = 'business_recon_' + digest(deps, BUSINESS_LEASE_TOKEN_DOMAIN, {\n      execution_id: identity.execution_id,\n      candidate_ref: candidate.candidate_ref,\n      event_identity_fingerprint: eventFingerprints[activeVersion],\n    }).slice(0, 48);\n    const requestCommand = Object.freeze({\n      brand_id: BRAND_ID,\n      claim_id: 'req_recon_' + attemptFingerprints[activeVersion],\n      active_fingerprint: attemptFingerprints[activeVersion],\n      active_key_version: activeStorageVersion,\n      retained_fingerprints: Object.freeze(storageAliases(attemptFingerprints, deps)),\n      key_registry_version: deps.keyRegistryVersion,\n      request_source: REQUEST_SOURCE,\n      source_binding_sha256: provenance.source_binding_sha256,\n      request_ttl_seconds: deps.requestTtlSeconds,\n      lease_owner_id: leaseOwnerId,\n      lease_token: requestLeaseToken,\n      lease_duration_seconds: deps.leaseDurationSeconds,\n    });\n    const businessCommand = Object.freeze({\n      brand_id: BRAND_ID,\n      claim_id: 'bev_claim_' + eventFingerprints[activeVersion],\n      active_fingerprint: eventFingerprints[activeVersion],\n      active_key_version: activeStorageVersion,\n      retained_fingerprints: Object.freeze(storageAliases(eventFingerprints, deps)),\n      key_registry_version: deps.keyRegistryVersion,\n      event_retention_seconds: deps.eventRetentionSeconds,\n      lease_owner_id: leaseOwnerId,\n      lease_token: businessLeaseToken,\n      lease_duration_seconds: deps.leaseDurationSeconds,\n    });\n    const advanceControl = Object.freeze({\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_advance_generation_control_v1',\n      operation: 'advance_conversation_generation',\n      ready_for_atomic_call: false,\n      request_source: REQUEST_SOURCE,\n      source_binding_sha256: provenance.source_binding_sha256,\n      reconciliation_scan_id: provenance.scan_id,\n      reconciliation_scan_lease_token: provenance.scan_lease_token,\n      reconciliation_expected_after_message_id: provenance.expected_after_message_id,\n      reconciliation_page_binding_sha256: provenance.page_binding_sha256,\n      brand_id: BRAND_ID,\n      account_id: candidate.account_id,\n      inbox_id: candidate.inbox_id,\n      channel: candidate.channel,\n      conversation_id: candidate.conversation_id,\n      anchor_message_id: candidate.message_id,\n      correlation_id: correlationId,\n      proposed_job_id: 'job_' + messageFingerprints[activeVersion],\n      event_identity_key_version: activeVersion,\n      event_identity_fingerprint: eventFingerprints[activeVersion],\n      conversation_fingerprint: conversationFingerprints[activeVersion],\n      message_fingerprint: messageFingerprints[activeVersion],\n      active_key_version: activeStorageVersion,\n      retained_message_fingerprints: Object.freeze(storageAliases(messageFingerprints, deps)),\n      key_registry_version: deps.keyRegistryVersion,\n      baseline_fingerprint_key_version: deps.baselineFingerprintKeyVersion,\n      delay_policy_version: DELAY_POLICY_VERSION,\n      knowledge_version: deps.knowledgeVersion,\n      delay_seconds: delaySeconds,\n      retention_seconds: deps.retentionSeconds,\n      required_authoritative_inputs: Object.freeze([\n        'request_processing_lease_result',\n        'business_prepared_or_completed_result',\n        'baseline_status_fingerprint',\n        'baseline_assignee_fingerprint',\n      ]),\n      customer_egress_allowed: false,\n    });\n    const core = {\n      schema_version: '1.0',\n      kind: 'chatwoot_reconciliation_durable_ingress_projection_v1',\n      source: SOURCE,\n      request_source: REQUEST_SOURCE,\n      source_binding_sha256: provenance.source_binding_sha256,\n      ingress_mode: 'reconciliation_api_read',\n      candidate_ref: candidate.candidate_ref,\n      candidate_binding_sha256: candidate.candidate_binding_sha256,\n      reconciliation_provenance: provenance,\n      route_identity: route,\n      claim_request_replay_command: requestCommand,\n      claim_business_event_command: businessCommand,\n      advance_conversation_generation_control: advanceControl,\n      atomic_write_allowed: false,\n      required_atomic_contract_fields: Object.freeze([\n        'claim_request_replay.request_source',\n        'claim_request_replay.source_binding_sha256',\n        'advance_conversation_generation.request_source',\n        'advance_conversation_generation.source_binding_sha256',\n        'advance_conversation_generation.reconciliation_scan_id',\n        'advance_conversation_generation.reconciliation_scan_lease_token',\n        'advance_conversation_generation.reconciliation_expected_after_message_id',\n        'advance_conversation_generation.reconciliation_page_binding_sha256',\n      ]),\n      trust_boundary: NATIVE_CRYPTO_TRUST_BOUNDARY,\n      native_crypto_direct_lineage_required: true,\n      cryptographic_verification_performed_in_code: false,\n      signed_webhook_evidence: null,\n      raw_body_evidence: null,\n      customer_egress_allowed: false,\n    };\n    return deepFreeze({\n      ...core,\n      projection_binding_sha256: digest(deps, PROJECTION_BINDING_DOMAIN, core),\n    });\n  }\n\n  return Object.freeze({\n    prepareCandidateIdentity,\n    finalizeCandidateIdentity,\n    finalizeRouteAndProjectAtomicClaims,\n    validateDurableIngressProjection: (value) => validateProjection(value, deps),\n    buildNativeCryptoDirectLineageGraph: (lineage, entryNodeName, finalizerNodeName) =>\n      buildNativeCryptoDirectLineageGraph(lineage, entryNodeName, finalizerNodeName),\n    validateNativeCryptoDirectLineageGraph: (\n      value, lineage, entryNodeName, finalizerNodeName,\n    ) => validateNativeCryptoDirectLineageGraph(\n      value, lineage, entryNodeName, finalizerNodeName,\n    ),\n  });\n}\n\n__reconciliationBridgeModule.exports = Object.freeze({\n  BRAND_ID,\n  ACCOUNT_ID,\n  SOURCE,\n  REQUEST_SOURCE,\n  CANONICAL_TUPLE_FORMAT,\n  INBOX_CHANNELS,\n  DELAY_POLICY_VERSION,\n  REQUEST_ATTEMPT_IDENTITY_DOMAIN,\n  SOURCE_BINDING_DOMAIN,\n  MESSAGE_FINGERPRINT_DOMAIN,\n  CONVERSATION_FINGERPRINT_DOMAIN,\n  NATIVE_CRYPTO_TRUST_BOUNDARY,\n  NATIVE_CRYPTO_NODE_TYPE,\n  NATIVE_CRYPTO_NODE_TYPE_VERSION,\n  ReconciliationIngressBridgeError,\n  stableJson,\n  createChatwootReconciliationIngressBridge,\n});\n\n})();\nconst __reconciliationRuntime = __reconciliationModule.exports.createChatwootReconciliationRuntime({\n  sha256Hex: (value) => __edgeDependencies.sha256Hex(value),\n  active_event_identity_key_version: 'calapres-identity-hmac-v1',\n  retained_event_identity_key_versions: ['calapres-identity-hmac-v2'],\n  activation_floor_at: '2026-08-12T00:00:00.000Z',\n  activation_policy_version: '2026-08-12-v1',\n});\nconst __reconciliationBridge = __reconciliationBridgeModule.exports.createChatwootReconciliationIngressBridge({\n  sha256Hex: (value) => __edgeDependencies.sha256Hex(value),\n  validate_messages_page: (value) => __reconciliationRuntime.validateMessagesPage(value),\n  active_event_identity_key_version: 'calapres-identity-hmac-v1',\n  retained_event_identity_key_versions: ['calapres-identity-hmac-v2'],\n  event_to_storage_key_versions: { 'calapres-identity-hmac-v1': 'hmac-sha256-v1', 'calapres-identity-hmac-v2': 'hmac-sha256-v2' },\n  key_registry_version: 'calapres-storage-keys-v1', request_ttl_seconds: 300, event_retention_seconds: 604800, lease_duration_seconds: 300,\n  baseline_fingerprint_key_version: 'calapres-hmac-v1', knowledge_version: '2026-08-11-v3', retention_seconds: 7776000,\n  activation_floor_at: '2026-08-12T00:00:00.000Z',\n  activation_policy_version: '2026-08-12-v1',\n});";

const webhookHmacCredential = newCredential('Calapres Chatwoot Webhook HMAC v1');
const eventIdentityHmacCredential = newCredential('Calapres Event Identity HMAC v1');
const baselineHmacCredential = newCredential('Calapres Baseline HMAC v1');
const webhookWorkerPostgresCredential = newCredential('Calapres Customer Service PostgreSQL Webhook and Worker Runtime');
const reconciliationPostgresCredential = newCredential('Calapres Customer Service PostgreSQL Reconciliation Runtime');
const chatwootReadCredential = newCredential('Calapres Chatwoot Read Only');

const manualObservationTest = trigger({
  "type": "n8n-nodes-base.manualTrigger",
  "version": 1,
  "config": {
    "name": "Manual Synthetic Observation Preview Only",
    "parameters": {},
    "position": [
      100,
      900
    ]
  }
});

const manualSyntheticPreview = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Manual Synthetic Terminal - No Effects",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nreturn [{ json: {\n  schema_version: '1.0', kind: 'calapres_edge_v2_manual_synthetic_preview_v1',\n  source_only: true, recovery_schedule_enabled: false, kill_switch: true,\n  model_call_enabled: false, customer_egress_allowed: false,\n  note: 'No HTTP, database, Core, model, note, Shopify, or customer-send action executed.'\n} }];"
    },
    "position": [
      360,
      900
    ]
  }
});

const signedChatwootWebhook = trigger({
  "type": "n8n-nodes-base.webhook",
  "version": 2.1,
  "config": {
    "name": "POST Calapres Chatwoot Signed Raw Webhook",
    "parameters": {
      "httpMethod": "POST",
      "path": "calapres/customer-service/chatwoot/v2",
      "authentication": "none",
      "responseMode": "responseNode",
      "options": {
        "rawBody": true,
        "ignoreBots": false,
        "allowedOrigins": ""
      }
    },
    "position": [
      100,
      80
    ]
  }
});

const signedIngressPreflight = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Signed Ingress Preflight - Raw Bytes 1MiB Gate",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nlet preflight = null;\nlet disposition = 'service_unavailable';\ntry {\n  const item = $input.first();\n  const source = item && item.json && typeof item.json === 'object' ? item.json : {};\n  const headers = source.headers && typeof source.headers === 'object' ? source.headers : {};\n  const lowered = {};\n  for (const [key, value] of Object.entries(headers)) lowered[String(key).toLowerCase()] = value;\n  const rawBodyBase64 = typeof source.raw_body_base64 === 'string' ? source.raw_body_base64\n    : typeof source.rawBody === 'string' ? source.rawBody\n      : item && item.binary && item.binary.data && typeof item.binary.data.data === 'string'\n        ? item.binary.data.data : '';\n  preflight = __edgeStages.prepareSignedIngress({\n    schema_version: '1.0', content_type: String(lowered['content-type'] || ''),\n    timestamp_header: String(lowered['x-chatwoot-timestamp'] || ''),\n    signature_header: String(lowered['x-chatwoot-signature'] || ''),\n    delivery_header: lowered['x-chatwoot-delivery'] === undefined\n      ? null : String(lowered['x-chatwoot-delivery']),\n    raw_body_base64: rawBodyBase64,\n    received_epoch_seconds: Math.floor(Date.now() / 1000)\n  });\n  const trustedRejected = preflight && preflight.schema_version === '1.0' &&\n    preflight.kind === 'chatwoot_signed_ingress_preflight_v1' &&\n    preflight.status === 'rejected' && preflight.transient === null &&\n    preflight.customer_egress_allowed === false &&\n    typeof preflight.reason_code === 'string' &&\n    /^[a-z][a-z0-9_]{2,80}$/.test(preflight.reason_code);\n  if (preflight && preflight.status === 'eligible' && preflight.response_code === 0 &&\n      preflight.reason_code === null && preflight.customer_egress_allowed === false) {\n    disposition = 'hmac_required';\n  } else if (trustedRejected && preflight.response_code === 400) {\n    disposition = 'bad_request';\n  } else if (trustedRejected && preflight.response_code === 401) {\n    disposition = 'unauthorized';\n  } else if (trustedRejected && preflight.response_code === 413) {\n    disposition = 'too_large';\n  }\n} catch (error) {\n  preflight = __edgeFailure('prepare_signed_ingress', error);\n}\nif (disposition !== 'hmac_required') {\n  return [{ json: { ingress_disposition: disposition, preflight,\n    customer_egress_allowed: false } }];\n}\nreturn [{\n  json: { ingress_disposition: disposition, preflight, customer_egress_allowed: false },\n  binary: { signed_payload: { data: preflight.transient.signed_payload_base64,\n    mimeType: 'application/octet-stream', fileName: 'signed-payload.bin' } }\n}];"
    },
    "onError": "continueRegularOutput",
    "position": [
      360,
      80
    ]
  }
});

const preflightEligible = ifElse({
  "version": 2.3,
  "config": {
    "name": "Preflight Eligible?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.ingress_disposition === \"hmac_required\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      620,
      80
    ]
  }
});

const preflightUnauthorized = ifElse({
  "version": 2.3,
  "config": {
    "name": "Preflight Trusted Unauthorized?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.ingress_disposition === \"unauthorized\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      620,
      260
    ]
  }
});

const preflightBadRequest = ifElse({
  "version": 2.3,
  "config": {
    "name": "Preflight Trusted Bad Request?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.ingress_disposition === \"bad_request\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      880,
      340
    ]
  }
});

const preflightTooLarge = ifElse({
  "version": 2.3,
  "config": {
    "name": "Preflight Trusted Payload Too Large?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.ingress_disposition === \"too_large\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      1140,
      420
    ]
  }
});

const webhookHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Calapres Webhook v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": true,
      "type": "SHA256",
      "dataPropertyName": "computed_hmac_hex",
      "encoding": "hex",
      "binaryPropertyName": "signed_payload"
    },
    "credentials": {
      "crypto": webhookHmacCredential
    },
    "position": [
      880,
      0
    ]
  }
});

const finalizeSignedHmac = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Finalize Signed HMAC Constant Time Gate",
    "parameters": {
      "mode": "runOnceForEachItem",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nlet signedGate = null;\nlet disposition = 'service_unavailable';\ntry {\n  const preflight = $json.preflight;\n  const computed = $json.computed_hmac_hex;\n  signedGate = __edgeStages.finalizeSignedHmac({ preflight,\n    computed_hmac_hex: computed, compared_epoch_seconds: Math.floor(Date.now() / 1000) });\n  if (signedGate && signedGate.schema_version === '1.0' &&\n      signedGate.kind === 'chatwoot_signed_hmac_gate_v1' &&\n      signedGate.status === 'verified' && signedGate.response_code === 0 &&\n      signedGate.reason_code === null && signedGate.customer_egress_allowed === false) {\n    disposition = 'verified';\n  } else if (signedGate && signedGate.schema_version === '1.0' &&\n      signedGate.kind === 'chatwoot_signed_hmac_gate_v1' &&\n      signedGate.status === 'fail_closed' && signedGate.response_code === 401 &&\n      signedGate.raw_binding === null && signedGate.replay_identity === null &&\n      signedGate.customer_egress_allowed === false &&\n      ['signature_mismatch', 'hmac_comparison_stale'].includes(signedGate.reason_code)) {\n    disposition = 'unauthorized';\n  }\n} catch (error) {\n  signedGate = __edgeFailure('finalize_signed_hmac', error);\n}\nreturn { json: { signed_gate: signedGate,\n  hmac_disposition: disposition,\n  cryptographic_verification_performed_in_code: false,\n  customer_egress_allowed: false } };"
    },
    "position": [
      1140,
      0
    ]
  }
});

const signedHmacVerified = ifElse({
  "version": 2.3,
  "config": {
    "name": "Signed HMAC Verified?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.hmac_disposition === \"verified\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      1400,
      0
    ]
  }
});

const signedHmacUnauthorized = ifElse({
  "version": 2.3,
  "config": {
    "name": "Signed HMAC Trusted Unauthorized?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.hmac_disposition === \"unauthorized\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      1660,
      100
    ]
  }
});

const prepareRequestReplayClaim = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Request Replay Processing Lease",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst signed = $('Finalize Signed HMAC Constant Time Gate').first().json.signed_gate;\nconst executionId = typeof $execution === 'object' && $execution !== null\n  ? String($execution.id || '') : '';\nif (!signed || signed.status !== 'verified' || !/^[A-Za-z0-9_-]{1,120}$/.test(executionId)) {\n  return [{ json: { pipeline_status: 'retry', customer_egress_allowed: false } }];\n}\nconst fingerprint = signed.replay_identity.replay_key_fingerprint;\nconst leaseOwner = 'edge_ingress_' + executionId;\nconst leaseToken = 'request_' + __edgeDependencies.sha256Hex(\n  __edgeDependencies.utf8ToBytes(executionId + ':' + fingerprint)).slice(0, 48);\nconst command = {\n  brand_id: 'calapres', claim_id: 'req_' + fingerprint,\n  active_fingerprint: fingerprint, active_key_version: 'hmac-sha256-v1',\n  retained_fingerprints: [], key_registry_version: 'calapres-storage-keys-v1',\n  request_source: 'chatwoot_signed_webhook_v1',\n  source_binding_sha256: fingerprint,\n  request_ttl_seconds: 600, lease_owner_id: leaseOwner, lease_token: leaseToken,\n  lease_duration_seconds: 300\n};\nreturn [{ json: { postgres_command: command,\n  request_context: { claim_id: command.claim_id, lease_owner_id: leaseOwner,\n    lease_token: leaseToken, request_source: command.request_source,\n    source_binding_sha256: command.source_binding_sha256, signed_gate: signed },\n  pipeline_status: 'request_claim_ready', customer_egress_allowed: false } }];"
    },
    "position": [
      1660,
      -80
    ]
  }
});

const postgresClaimRequestReplay = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Edge Atomic 01 - claim_request_replay",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_claim_signed_webhook_request_replay($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": webhookWorkerPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      1920,
      -80
    ]
  }
});

const interpretRequestReplay = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Interpret Request Replay Lease Result",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nconst source = $input.first().json || {};\nconst result = source.result && typeof source.result === 'object' && !Array.isArray(source.result)\n  ? source.result : null;\nconst context = $('Prepare Request Replay Processing Lease').first().json.request_context;\nconst exactKeys = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) &&\n  Object.keys(value).length === fields.length &&\n  fields.every((field) => Object.prototype.hasOwnProperty.call(value, field));\nconst processingKeys = ['claim_id','lifecycle_status','claimed_at','expires_at',\n  'lease_expires_at','attempt_count','request_source','source_binding_sha256'];\nconst completedKeys = ['account_id','inbox_id','channel','conversation_id','anchor_message_id',\n  'correlation_id','event_identity_key_version','event_identity_fingerprint',\n  'conversation_fingerprint','message_fingerprint','baseline_fingerprint_key_version',\n  'baseline_status_fingerprint','baseline_assignee_fingerprint','delay_policy_version',\n  'delay_seconds','knowledge_version','claim_id','lifecycle_status','claimed_at','expires_at',\n  'lease_expires_at','attempt_count','request_source','source_binding_sha256',\n  'business_claim_id','job_id','generation','due_at'];\nconst iso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));\nconst token = (value) => typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value) &&\n  Number.isSafeInteger(Number(value)) && String(Number(value)) === value;\nconst opaque = (value) => typeof value === 'string' && /^[A-Za-z0-9:_-]{4,160}$/.test(value);\nconst hex = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);\nconst channels = { 128031: 'instagram', 128033: 'tiktok', 128058: 'whatsapp', 128326: 'email' };\nlet state = 'retry';\nlet linked = null;\nif (result && result.contract_verified === true && result.operation === 'claim_request_replay' &&\n    result.error_code === null && result.status === 'committed' &&\n    ['processing_claimed', 'processing_owned', 'processing_recovered'].includes(result.outcome) &&\n    exactKeys(result.value, processingKeys) && result.value.claim_id === context.claim_id &&\n    result.value.request_source === context.request_source &&\n    result.value.source_binding_sha256 === context.source_binding_sha256 &&\n    result.value.lifecycle_status === 'processing' && iso(result.value.claimed_at) &&\n    iso(result.value.expires_at) && iso(result.value.lease_expires_at) &&\n    Number.isSafeInteger(result.value.attempt_count) && result.value.attempt_count > 0) {\n  state = 'proceed';\n} else if (result && result.contract_verified === true &&\n    result.operation === 'claim_request_replay' && result.status === 'duplicate_or_conflict' &&\n    result.outcome === 'duplicate_completed' && result.error_code === null &&\n    exactKeys(result.value, completedKeys) && result.value.claim_id === context.claim_id &&\n    result.value.request_source === context.request_source &&\n    result.value.source_binding_sha256 === context.source_binding_sha256 &&\n    result.value.lifecycle_status === 'completed' && result.value.account_id === 179973 &&\n    channels[result.value.inbox_id] === result.value.channel && token(result.value.conversation_id) &&\n    token(result.value.anchor_message_id) &&\n    result.value.correlation_id === 'calapres:' + result.value.conversation_id + ':' +\n      result.value.anchor_message_id &&\n    result.value.event_identity_key_version === 'calapres-identity-hmac-v1' &&\n    result.value.baseline_fingerprint_key_version === 'calapres-hmac-v1' &&\n    result.value.delay_policy_version === '2026-08-11-v1' &&\n    /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/.test(result.value.knowledge_version || '') &&\n    ['event_identity_fingerprint','conversation_fingerprint','message_fingerprint',\n      'baseline_status_fingerprint','baseline_assignee_fingerprint'].every((field) => hex(result.value[field])) &&\n    opaque(result.value.business_claim_id) && opaque(result.value.job_id) &&\n    iso(result.value.claimed_at) && iso(result.value.expires_at) &&\n    iso(result.value.lease_expires_at) && iso(result.value.due_at) &&\n    Number.isSafeInteger(result.value.attempt_count) && result.value.attempt_count > 0 &&\n    Number.isSafeInteger(result.value.generation) && result.value.generation > 0 &&\n    Number.isSafeInteger(result.value.delay_seconds) &&\n    (result.value.channel === 'email'\n      ? result.value.delay_seconds >= 120 && result.value.delay_seconds <= 300\n      : result.value.delay_seconds >= 30 && result.value.delay_seconds <= 75)) {\n  state = 'ack_completed';\n  linked = { job_id: result.value.job_id, due_at: result.value.due_at };\n}\nreturn [{ json: { request_state: state, request_context: context, linked_job: linked,\n  customer_egress_allowed: false } }];"
    },
    "position": [
      2180,
      -80
    ]
  }
});

const requestReplayProceed = ifElse({
  "version": 2.3,
  "config": {
    "name": "Request Replay Processing Lease Owned?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.request_state === \"proceed\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      2440,
      -80
    ]
  }
});

const requestReplayCompleted = ifElse({
  "version": 2.3,
  "config": {
    "name": "Completed Replay Linked to Durable Job?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.request_state === \"ack_completed\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      2700,
      80
    ]
  }
});

const prepareEventIdentity = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Parse Verified Raw Body and Prepare Event Identity HMAC",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst context = $input.first().json.request_context;\nlet plan;\ntry {\n  const signed = context.signed_gate;\n  const replayGate = {\n    schema_version: '1.0', kind: 'chatwoot_request_replay_gate_v1',\n    status: 'proceed_parse', response_code: 0, reason_code: null,\n    raw_binding: signed.raw_binding,\n    replay_key_fingerprint: signed.replay_identity.replay_key_fingerprint,\n    customer_egress_allowed: false\n  };\n  plan = __edgeStages.prepareEventIdentity({ replay_gate: replayGate,\n    active_key_version: 'calapres-identity-hmac-v1', retained_key_versions: [] });\n} catch (error) {\n  return [{ json: { pipeline_ready: false,\n    stage_failure: __edgeFailure('prepare_event_identity', error),\n    customer_egress_allowed: false } }];\n}\nif (!Array.isArray(plan.hmac_requests) || plan.hmac_requests.length !== 1) {\n  return [{ json: { pipeline_ready: false,\n    stage_failure: __edgeFailure('prepare_event_identity', new Error('event_hmac_cardinality_invalid')),\n    customer_egress_allowed: false } }];\n}\nreturn [{ json: {\n  pipeline_ready: true, event_plan: plan, request_context: context,\n  cryptographic_verification_performed_in_code: false,\n  customer_egress_allowed: false\n} }];"
    },
    "position": [
      2700,
      -200
    ]
  }
});

const eventIdentityReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Event Identity HMAC Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.pipeline_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      2960,
      -200
    ]
  }
});

const eventIdentityHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Calapres Event Identity v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_event_identity_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.event_plan.hmac_requests[0].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      3220,
      -280
    ]
  }
});

const finalizeEventIdentity = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Finalize Event Identity and Prepare Fixed Route HMAC",
    "parameters": {
      "mode": "runOnceForEachItem",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const plan = $json.event_plan;\n  if (!plan || !Array.isArray(plan.hmac_requests) || plan.hmac_requests.length !== 1 ||\n      !/^[a-f0-9]{64}$/.test($json.native_event_identity_v1_hex || '')) {\n    throw new Error('event_native_chain_invalid');\n  }\n  const request = plan.hmac_requests[0];\n  const identity = __edgeStages.finalizeEventIdentity({ event_plan: plan,\n    hmac_results: [{ purpose: request.purpose, key_version: request.key_version,\n      digest_hex: $json.native_event_identity_v1_hex }] });\n  if (!Array.isArray(identity.route_hmac_requests) || identity.route_hmac_requests.length !== 2) {\n    throw new Error('route_hmac_cardinality_invalid');\n  }\n  return { json: {\n    pipeline_ready: true, event_identity: identity, request_context: $json.request_context,\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false\n  } };\n} catch (error) {\n  return { json: { pipeline_ready: false,\n    stage_failure: __edgeFailure('finalize_event_identity', error),\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } };\n}"
    },
    "position": [
      3480,
      -280
    ]
  }
});

const routeHmacReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Route Fingerprint HMAC Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.pipeline_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      3740,
      -280
    ]
  }
});

const routeMessageHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Calapres Route Message v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_message_anchor_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.event_identity.route_hmac_requests[0].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      4000,
      -360
    ]
  }
});

const routeConversationHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Calapres Route Conversation v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_conversation_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.event_identity.route_hmac_requests[1].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      4130,
      -360
    ]
  }
});

const finalizeRouteAndBusiness = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Finalize Route and Prepare Business Event Lease",
    "parameters": {
      "mode": "runOnceForEachItem",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const identity = $json.event_identity;\n  if (!identity || !Array.isArray(identity.route_hmac_requests) ||\n      identity.route_hmac_requests.length !== 2 ||\n      !/^[a-f0-9]{64}$/.test($json.native_message_anchor_v1_hex || '') ||\n      !/^[a-f0-9]{64}$/.test($json.native_conversation_v1_hex || '')) {\n    throw new Error('route_native_chain_invalid');\n  }\n  const route = __edgeStages.finalizeRouteFingerprints({\n    event_identity: identity,\n    hmac_results: identity.route_hmac_requests.map((request, index) => ({\n      purpose: request.purpose, key_version: request.key_version,\n      digest_hex: index === 0 ? $json.native_message_anchor_v1_hex\n        : $json.native_conversation_v1_hex }))\n  });\n  const executionId = typeof $execution === 'object' && $execution !== null\n    ? String($execution.id || '') : '';\n  if (!/^[A-Za-z0-9_-]{1,120}$/.test(executionId)) throw new Error('execution_id_invalid');\n  const activeVersion = route.active_key_version;\n  const eventFingerprint = route.event_identity_fingerprints[activeVersion];\n  const leaseOwner = 'edge_ingress_' + executionId;\n  const leaseToken = 'business_' + __edgeDependencies.sha256Hex(\n    __edgeDependencies.utf8ToBytes(executionId + ':' + eventFingerprint)).slice(0, 48);\n  const command = {\n    brand_id: 'calapres', claim_id: 'bev_claim_' + eventFingerprint,\n    active_fingerprint: eventFingerprint,\n    active_key_version: route.storage_key_versions.active,\n    retained_fingerprints: route.retained_key_versions.map((version, index) => ({\n      fingerprint: route.event_identity_fingerprints[version],\n      key_version: route.storage_key_versions.retained[index].storage_key_version\n    })),\n    key_registry_version: 'calapres-storage-keys-v1', event_retention_seconds: 604800,\n    lease_owner_id: leaseOwner, lease_token: leaseToken, lease_duration_seconds: 300\n  };\n  return { json: { pipeline_ready: true, route_identity: route,\n    request_context: $json.request_context,\n    business_context: { claim_id: command.claim_id, lease_owner_id: leaseOwner,\n      lease_token: leaseToken, job_id: 'job_' + route.message_fingerprints[activeVersion] },\n    postgres_command: command, cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } };\n} catch (error) {\n  return { json: { pipeline_ready: false,\n    stage_failure: __edgeFailure('finalize_route_identity', error),\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } };\n}"
    },
    "position": [
      4260,
      -360
    ]
  }
});

const businessClaimReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Business Event Lease Command Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.pipeline_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      4520,
      -360
    ]
  }
});

const postgresClaimBusinessEvent = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Edge Atomic 02 - claim_business_event",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_claim_business_event($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": webhookWorkerPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      4780,
      -440
    ]
  }
});

const interpretBusinessEvent = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Interpret Business Event Lease Result",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nconst source = $input.first().json || {};\nconst result = source.result && typeof source.result === 'object' && !Array.isArray(source.result)\n  ? source.result : null;\nconst prepared = $('Finalize Route and Prepare Business Event Lease').first().json;\nconst exactKeys = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) &&\n  Object.keys(value).length === fields.length &&\n  fields.every((field) => Object.prototype.hasOwnProperty.call(value, field));\nconst opaque = (value) => typeof value === 'string' && /^[A-Za-z0-9:_-]{4,160}$/.test(value);\nconst token = (value) => typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value) &&\n  Number.isSafeInteger(Number(value)) && String(Number(value)) === value;\nconst iso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));\nconst hex = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);\nconst preparedKeys = ['claim_id','lease_expires_at','attempt_count','job_id'];\nconst completedKeys = ['account_id','inbox_id','channel','conversation_id','anchor_message_id',\n  'correlation_id','event_identity_key_version','event_identity_fingerprint',\n  'conversation_fingerprint','message_fingerprint','baseline_fingerprint_key_version',\n  'baseline_status_fingerprint','baseline_assignee_fingerprint','delay_policy_version',\n  'delay_seconds','knowledge_version','claim_id','lifecycle_status','job_id','generation',\n  'due_at','state','observation_id','audit_id'];\nconst route = prepared.route_identity;\nlet state = 'retry';\nlet businessContext = null;\nlet completedBundle = null;\nconst preparedResult = result && result.contract_verified === true &&\n  result.operation === 'claim_business_event' && result.status === 'committed' &&\n  ['prepared', 'prepared_owned', 'recovered_prepared'].includes(result.outcome) &&\n  result.error_code === null && exactKeys(result.value, preparedKeys) &&\n  opaque(result.value.claim_id) && iso(result.value.lease_expires_at) &&\n  Number.isSafeInteger(result.value.attempt_count) && result.value.attempt_count > 0 &&\n  result.value.job_id === null;\nif (preparedResult) {\n  state = 'proceed';\n  businessContext = {\n    claim_id: result.value.claim_id,\n    lease_owner_id: prepared.business_context.lease_owner_id,\n    lease_token: prepared.business_context.lease_token,\n    job_id: prepared.business_context.job_id\n  };\n}\nconst completedResult = result && result.contract_verified === true &&\n  result.operation === 'claim_business_event' && result.status === 'duplicate_or_conflict' &&\n  result.outcome === 'duplicate_completed' && result.error_code === null &&\n  exactKeys(result.value, completedKeys) && opaque(result.value.claim_id) &&\n  result.value.lifecycle_status === 'completed' && opaque(result.value.job_id) &&\n  Number.isSafeInteger(result.value.generation) && result.value.generation > 0 &&\n  iso(result.value.due_at) && result.value.state === 'completed' &&\n  opaque(result.value.observation_id) && opaque(result.value.audit_id) &&\n  result.value.account_id === route.account_id && result.value.inbox_id === route.inbox_id &&\n  result.value.channel === route.channel && result.value.conversation_id === route.conversation_id &&\n  result.value.anchor_message_id === route.message_id && token(result.value.conversation_id) &&\n  token(result.value.anchor_message_id) && result.value.correlation_id === route.correlation_id &&\n  /^calapres-identity-hmac-v[1-9][0-9]*$/.test(result.value.event_identity_key_version || '') &&\n  result.value.baseline_fingerprint_key_version &&\n  /^calapres-hmac-v[1-9][0-9]*$/.test(result.value.baseline_fingerprint_key_version) &&\n  /^2026-08-11-v[1-9][0-9]*$/.test(result.value.delay_policy_version || '') &&\n  /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/.test(result.value.knowledge_version || '') &&\n  ['event_identity_fingerprint','conversation_fingerprint','message_fingerprint',\n    'baseline_status_fingerprint','baseline_assignee_fingerprint'].every((field) => hex(result.value[field])) &&\n  Number.isSafeInteger(result.value.delay_seconds) &&\n  (result.value.channel === 'email'\n    ? result.value.delay_seconds >= 120 && result.value.delay_seconds <= 300\n    : result.value.delay_seconds >= 30 && result.value.delay_seconds <= 75);\nif (completedResult) {\n  state = 'completed_reconcile';\n  businessContext = {\n    claim_id: result.value.claim_id,\n    lease_owner_id: prepared.business_context.lease_owner_id,\n    lease_token: prepared.business_context.lease_token,\n    job_id: result.value.job_id\n  };\n  completedBundle = {\n    account_id: result.value.account_id, inbox_id: result.value.inbox_id,\n    channel: result.value.channel, conversation_id: result.value.conversation_id,\n    anchor_message_id: result.value.anchor_message_id, correlation_id: result.value.correlation_id,\n    event_identity_key_version: result.value.event_identity_key_version,\n    event_identity_fingerprint: result.value.event_identity_fingerprint,\n    conversation_fingerprint: result.value.conversation_fingerprint,\n    message_fingerprint: result.value.message_fingerprint,\n    baseline_fingerprint_key_version: result.value.baseline_fingerprint_key_version,\n    baseline_status_fingerprint: result.value.baseline_status_fingerprint,\n    baseline_assignee_fingerprint: result.value.baseline_assignee_fingerprint,\n    delay_policy_version: result.value.delay_policy_version,\n    delay_seconds: result.value.delay_seconds, knowledge_version: result.value.knowledge_version,\n    claim_id: result.value.claim_id, lifecycle_status: result.value.lifecycle_status,\n    job_id: result.value.job_id, generation: result.value.generation,\n    due_at: result.value.due_at, state: result.value.state,\n    observation_id: result.value.observation_id, audit_id: result.value.audit_id\n  };\n}\nreturn [{ json: { business_state: state,\n  route_identity: prepared.route_identity, request_context: prepared.request_context,\n  business_context: businessContext, completed_bundle: completedBundle,\n  customer_egress_allowed: false } }];"
    },
    "position": [
      5040,
      -440
    ]
  }
});

const businessProceed = ifElse({
  "version": 2.3,
  "config": {
    "name": "Business Event Lease Owned?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.business_state === \"proceed\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      5300,
      -440
    ]
  }
});

const businessCompletedReconcile = ifElse({
  "version": 2.3,
  "config": {
    "name": "Completed Business Event Requires Atomic Request Reconciliation?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.business_state === \"completed_reconcile\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      5300,
      -200
    ]
  }
});

const buildCompletedReconciliation = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Completed Event Atomic Request Reconciliation",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst state = $('Interpret Business Event Lease Result').first().json;\nconst route = state.route_identity;\nconst request = state.request_context;\nconst business = state.business_context;\nconst completed = state.completed_bundle;\ntry {\n  if (state.business_state !== 'completed_reconcile' || !route || !request || !business || !completed ||\n      completed.lifecycle_status !== 'completed' || completed.state !== 'completed' ||\n      completed.claim_id !== business.claim_id || completed.job_id !== business.job_id) {\n    throw new Error('completed_reconciliation_context_invalid');\n  }\n  const activeVersion = route.active_key_version;\n  const command = {\n    brand_id: 'calapres', request_claim_id: request.claim_id,\n    request_lease_owner_id: request.lease_owner_id, request_lease_token: request.lease_token,\n    business_claim_id: completed.claim_id,\n    business_lease_owner_id: business.lease_owner_id,\n    business_lease_token: business.lease_token,\n    request_source: request.request_source,\n    source_binding_sha256: request.source_binding_sha256,\n    reconciliation_scan_id: null, reconciliation_scan_lease_token: null,\n    reconciliation_expected_after_message_id: null,\n    reconciliation_page_binding_sha256: null,\n    account_id: completed.account_id, inbox_id: completed.inbox_id, channel: completed.channel,\n    conversation_id: completed.conversation_id, anchor_message_id: completed.anchor_message_id,\n    correlation_id: completed.correlation_id, job_id: completed.job_id,\n    event_identity_key_version: activeVersion,\n    event_identity_fingerprint: route.event_identity_fingerprints[activeVersion],\n    conversation_fingerprint: completed.conversation_fingerprint,\n    message_fingerprint: route.message_fingerprints[activeVersion],\n    active_key_version: route.storage_key_versions.active,\n    retained_message_fingerprints: route.retained_key_versions.map((version, index) => ({\n      fingerprint: route.message_fingerprints[version],\n      key_version: route.storage_key_versions.retained[index].storage_key_version\n    })),\n    key_registry_version: 'calapres-storage-keys-v1',\n    baseline_fingerprint_key_version: completed.baseline_fingerprint_key_version,\n    baseline_status_fingerprint: completed.baseline_status_fingerprint,\n    baseline_assignee_fingerprint: completed.baseline_assignee_fingerprint,\n    delay_policy_version: completed.delay_policy_version,\n    knowledge_version: completed.knowledge_version, delay_seconds: completed.delay_seconds,\n    retention_seconds: 7776000\n  };\n  return [{ json: { pipeline_ready: true, ingress_mode: 'completed_reconcile',\n    postgres_command: command, expected_control: completed,\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { pipeline_ready: false, ingress_mode: 'invalid',\n    stage_failure: __edgeFailure('build_completed_reconciliation', error),\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } }];\n}"
    },
    "position": [
      5560,
      -200
    ]
  }
});

const completedReconciliationReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Completed Event Reconciliation Command Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.pipeline_ready === true && $json.ingress_mode === \"completed_reconcile\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      5820,
      -200
    ]
  }
});

const getBaselineConversation = node({
  "type": "n8n-nodes-base.httpRequest",
  "version": 4.5,
  "config": {
    "name": "GET Baseline Chatwoot Conversation Before Durable Commit",
    "parameters": {
      "method": "GET",
      "url": expr("https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $(\"Interpret Business Event Lease Result\").item.json.route_identity.conversation_id }}"),
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "specifyHeaders": "keypair",
      "headerParameters": {
        "parameters": [
          {
            "name": "Accept",
            "value": "application/json"
          }
        ]
      },
      "sendBody": false,
      "options": {
        "timeout": 8000,
        "redirect": {
          "redirect": {
            "followRedirects": false
          }
        },
        "response": {
          "response": {
            "fullResponse": true,
            "neverError": true,
            "responseFormat": "json"
          }
        }
      }
    },
    "credentials": {
      "httpHeaderAuth": chatwootReadCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      5560,
      -520
    ]
  }
});

const prepareIngressBaseline = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Strict Baseline Status and Assignee HMAC",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst route = $('Interpret Business Event Lease Result').first().json.route_identity;\nconst http = __edgeHttpEnvelope($input.first().json);\ntry {\n  if (http.status_code !== 200 || !http.body || typeof http.body !== 'object') {\n    throw new Error('conversation_read_unavailable');\n  }\n  const body = http.body;\n  const accountId = body.account_id;\n  const inboxId = Object.prototype.hasOwnProperty.call(body, 'inbox_id') ? body.inbox_id\n    : body.inbox && typeof body.inbox === 'object' ? body.inbox.id : null;\n  if (accountId !== route.account_id || inboxId !== route.inbox_id ||\n      String(body.id) !== route.conversation_id ||\n      !['open', 'resolved', 'pending', 'snoozed'].includes(body.status)) {\n    throw new Error('conversation_route_invalid');\n  }\n  const candidates = [];\n  const containers = [\n    [body, 'assignee_id'], [body, 'assignee'],\n    [body.meta && typeof body.meta === 'object' ? body.meta : null, 'assignee']\n  ];\n  for (const [container, field] of containers) {\n    if (!container || !Object.prototype.hasOwnProperty.call(container, field)) continue;\n    const value = container[field];\n    if (field === 'assignee_id' || value === null) candidates.push(value);\n    else if (typeof value === 'object' && Number.isSafeInteger(value.id) &&\n      (!Object.prototype.hasOwnProperty.call(value, 'account_id') || value.account_id === route.account_id)) {\n      candidates.push(value.id);\n    } else throw new Error('conversation_assignee_invalid');\n  }\n  if (candidates.length === 0 || candidates.some((value) => value !== candidates[0]) ||\n      candidates.some((value) => value !== null && (!Number.isSafeInteger(value) || value < 1))) {\n    throw new Error('conversation_assignee_invalid');\n  }\n  const canonical = { schema_version: '1.0', brand_id: 'calapres', account_id: route.account_id,\n    inbox_id: route.inbox_id, conversation_id: route.conversation_id };\n  const requests = [\n    { purpose: 'baseline_status', key_version: 'calapres-hmac-v1',\n      algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: 'calapres-conversation-status-v1:' +\n        JSON.stringify({ ...canonical, status: body.status }) },\n    { purpose: 'baseline_assignee', key_version: 'calapres-hmac-v1',\n      algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: 'calapres-conversation-assignee-v1:' +\n        JSON.stringify({ ...canonical, assignee_id: candidates[0] }) }\n  ];\n  const planCore = { schema_version: '1.0', kind: 'chatwoot_ingress_baseline_plan_v1',\n    route_binding_sha256: route.route_binding_sha256,\n    baseline_key_version: 'calapres-hmac-v1', hmac_requests: requests,\n    customer_egress_allowed: false };\n  const plan = { ...planCore,\n    plan_binding_sha256: __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes(\n      'calapres-ingress-baseline-plan-v1:' + __edgeModule.exports.stableJson(planCore))) };\n  return [{ json: {\n    pipeline_ready: true, baseline_plan: plan,\n    route_state: $('Interpret Business Event Lease Result').first().json,\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false\n  } }];\n} catch (error) {\n  return [{ json: { pipeline_ready: false,\n    stage_failure: __edgeFailure('prepare_ingress_baseline', error),\n    customer_egress_allowed: false } }];\n}"
    },
    "position": [
      5820,
      -520
    ]
  }
});

const ingressBaselineReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Ingress Baseline HMAC Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.pipeline_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      6080,
      -520
    ]
  }
});

const ingressBaselineStatusHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Calapres Ingress Baseline Status v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_baseline_status_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.baseline_plan.hmac_requests[0].material_utf8 }}")
    },
    "credentials": {
      "crypto": baselineHmacCredential
    },
    "position": [
      6340,
      -600
    ]
  }
});

const ingressBaselineAssigneeHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Calapres Ingress Baseline Assignee v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_baseline_assignee_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.baseline_plan.hmac_requests[1].material_utf8 }}")
    },
    "credentials": {
      "crypto": baselineHmacCredential
    },
    "position": [
      6470,
      -600
    ]
  }
});

const buildCombinedIngress = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Combined Durable Ingress Command",
    "parameters": {
      "mode": "runOnceForEachItem",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const routeState = $json.route_state;\n  const route = routeState.route_identity;\n  const activeVersion = route.active_key_version;\n  const plan = $json.baseline_plan;\n  if (!plan || plan.schema_version !== '1.0' ||\n      plan.kind !== 'chatwoot_ingress_baseline_plan_v1' ||\n      plan.route_binding_sha256 !== route.route_binding_sha256 ||\n      plan.baseline_key_version !== 'calapres-hmac-v1' ||\n      plan.customer_egress_allowed !== false ||\n      !Array.isArray(plan.hmac_requests) || plan.hmac_requests.length !== 2 ||\n      plan.hmac_requests[0].purpose !== 'baseline_status' ||\n      plan.hmac_requests[1].purpose !== 'baseline_assignee' ||\n      !/^[a-f0-9]{64}$/.test($json.native_baseline_status_v1_hex || '') ||\n      !/^[a-f0-9]{64}$/.test($json.native_baseline_assignee_v1_hex || '')) {\n    throw new Error('baseline_native_chain_invalid');\n  }\n  const planCore = { ...plan };\n  delete planCore.plan_binding_sha256;\n  const expectedPlanBinding = __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes(\n    'calapres-ingress-baseline-plan-v1:' + __edgeModule.exports.stableJson(planCore)));\n  if (plan.plan_binding_sha256 !== expectedPlanBinding) throw new Error('baseline_plan_invalid');\n  const request = routeState.request_context;\n  const business = routeState.business_context;\n  const command = {\n    brand_id: 'calapres', request_claim_id: request.claim_id,\n    request_lease_owner_id: request.lease_owner_id, request_lease_token: request.lease_token,\n    business_claim_id: business.claim_id, business_lease_owner_id: business.lease_owner_id,\n    business_lease_token: business.lease_token, request_source: request.request_source,\n    source_binding_sha256: request.source_binding_sha256, reconciliation_scan_id: null,\n    reconciliation_scan_lease_token: null, reconciliation_expected_after_message_id: null,\n    reconciliation_page_binding_sha256: null, account_id: route.account_id,\n    inbox_id: route.inbox_id, channel: route.channel, conversation_id: route.conversation_id,\n    anchor_message_id: route.message_id, correlation_id: route.correlation_id,\n    job_id: business.job_id, event_identity_key_version: activeVersion,\n    event_identity_fingerprint: route.event_identity_fingerprints[activeVersion],\n    conversation_fingerprint: route.conversation_fingerprints[activeVersion],\n    message_fingerprint: route.message_fingerprints[activeVersion],\n    active_key_version: route.storage_key_versions.active,\n    retained_message_fingerprints: route.retained_key_versions.map((version, index) => ({\n      fingerprint: route.message_fingerprints[version],\n      key_version: route.storage_key_versions.retained[index].storage_key_version\n    })),\n    key_registry_version: 'calapres-storage-keys-v1',\n    baseline_fingerprint_key_version: 'calapres-hmac-v1',\n    baseline_status_fingerprint: $json.native_baseline_status_v1_hex,\n    baseline_assignee_fingerprint: $json.native_baseline_assignee_v1_hex,\n    delay_policy_version: route.delay_policy_version, knowledge_version: '2026-08-11-v3',\n    delay_seconds: route.delay_seconds, retention_seconds: 7776000\n  };\n  return { json: { pipeline_ready: true, ingress_mode: 'new_pending',\n    postgres_command: command, expected_control: null,\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } };\n} catch (error) {\n  return { json: { pipeline_ready: false, ingress_mode: 'invalid',\n    postgres_command: null, expected_control: null,\n    stage_failure: __edgeFailure('build_combined_ingress', error),\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } };\n}"
    },
    "position": [
      6600,
      -600
    ]
  }
});

const combinedIngressReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Combined Durable Command Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.pipeline_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      6860,
      -600
    ]
  }
});

const projectFreshDurableCommand = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Project Exact Fresh Atomic Ingress Command",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "const __expectedIngressMode = 'new_pending';\n\nconst source = $input.first().json || {};\nconst exact = ['pipeline_ready','ingress_mode','postgres_command','expected_control',\n  'cryptographic_verification_performed_in_code',\n  'customer_egress_allowed'];\nconst valid = Object.keys(source).length === exact.length &&\n  exact.every((field) => Object.prototype.hasOwnProperty.call(source, field)) &&\n  source.pipeline_ready === true && source.ingress_mode === __expectedIngressMode &&\n  source.postgres_command && typeof source.postgres_command === 'object' &&\n  !Array.isArray(source.postgres_command) && source.customer_egress_allowed === false &&\n  source.cryptographic_verification_performed_in_code === false &&\n  ((source.ingress_mode === 'new_pending' && source.expected_control === null) ||\n   (source.ingress_mode === 'completed_reconcile' && source.expected_control &&\n    typeof source.expected_control === 'object' && !Array.isArray(source.expected_control)));\nreturn [{ json: valid ? source : {\n  pipeline_ready: false, ingress_mode: 'invalid', postgres_command: null,\n  expected_control: null, cryptographic_verification_performed_in_code: false,\n  customer_egress_allowed: false\n} }];"
    },
    "position": [
      7120,
      -520
    ]
  }
});

const postgresAdvanceGeneration = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Edge Atomic 04 - advance_conversation_generation",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_advance_signed_webhook_conversation_generation($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": webhookWorkerPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      7380,
      -680
    ]
  }
});

const finalizeFreshDurableCommit = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Validate Fresh Combined Durable Commit Before 204",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nconst source = $input.first().json || {};\nconst result = source.result && typeof source.result === 'object' && !Array.isArray(source.result)\n  ? source.result : null;\nconst projected = $('Project Exact Fresh Atomic Ingress Command').first().json;\nconst command = projected.postgres_command;\nconst mode = projected.ingress_mode;\nconst requiredMode = 'new_pending';\nconst expectedControl = projected.expected_control;\nlet durable = null;\nlet ackMode = null;\nconst envelopeKeys = ['contract_verified','status','operation','outcome','value','error_code'];\nconst valueKeys = ['account_id','inbox_id','channel','conversation_id','anchor_message_id',\n  'correlation_id','event_identity_key_version','event_identity_fingerprint',\n  'conversation_fingerprint','message_fingerprint','baseline_fingerprint_key_version',\n  'baseline_status_fingerprint','baseline_assignee_fingerprint','delay_policy_version',\n  'delay_seconds','knowledge_version','request_claim_id','business_claim_id','job_id','generation',\n  'due_at','state'];\nconst exactResult = result && Object.keys(result).length === envelopeKeys.length &&\n  envelopeKeys.every((field) => Object.prototype.hasOwnProperty.call(result, field));\nconst outcomeValid = mode === requiredMode && exactResult && result.contract_verified === true &&\n  result.operation === 'advance_conversation_generation' && result.error_code === null &&\n  ((mode === 'new_pending' &&\n    ((result.status === 'committed' && result.outcome === 'ingress_bound') ||\n     (result.status === 'duplicate_or_conflict' && result.outcome === 'duplicate_ingress_bound'))) ||\n   (mode === 'completed_reconcile' && result.status === 'duplicate_or_conflict' &&\n    result.outcome === 'duplicate_ingress_bound'));\nif (outcomeValid && result.value && typeof result.value === 'object') {\n  const value = result.value;\n  const exactValue = Object.keys(value).length === valueKeys.length &&\n    valueKeys.every((field) => Object.prototype.hasOwnProperty.call(value, field));\n  const control = mode === 'completed_reconcile' ? expectedControl : command;\n  const exactControl = exactValue && [\n    'account_id','inbox_id','channel','conversation_id','anchor_message_id','correlation_id',\n    'event_identity_key_version','event_identity_fingerprint','conversation_fingerprint',\n    'message_fingerprint','baseline_fingerprint_key_version','baseline_status_fingerprint',\n    'baseline_assignee_fingerprint','delay_policy_version','delay_seconds','knowledge_version'\n  ].every((field) => value[field] === control[field]);\n  const stateValid = mode === 'completed_reconcile' ? value.state === 'completed'\n    : value.state === 'pending';\n  if (exactControl && stateValid && value.request_claim_id === command.request_claim_id &&\n      value.business_claim_id === command.business_claim_id && value.job_id === command.job_id &&\n      Number.isSafeInteger(value.generation) && value.generation > 0 &&\n      typeof value.due_at === 'string' && Number.isFinite(Date.parse(value.due_at)) &&\n      (mode !== 'completed_reconcile' ||\n       (value.generation === expectedControl.generation && value.due_at === expectedControl.due_at))) {\n    durable = {\n      brand_id: 'calapres', request_claim_id: value.request_claim_id,\n      business_claim_id: value.business_claim_id, job_id: value.job_id,\n      account_id: value.account_id, inbox_id: value.inbox_id, channel: value.channel,\n      conversation_id: value.conversation_id, anchor_message_id: value.anchor_message_id,\n      correlation_id: value.correlation_id,\n      event_identity_key_version: value.event_identity_key_version,\n      event_identity_fingerprint: value.event_identity_fingerprint,\n      conversation_fingerprint: value.conversation_fingerprint,\n      message_fingerprint: value.message_fingerprint,\n      baseline_fingerprint_key_version: value.baseline_fingerprint_key_version,\n      baseline_status_fingerprint: value.baseline_status_fingerprint,\n      baseline_assignee_fingerprint: value.baseline_assignee_fingerprint,\n      delay_policy_version: value.delay_policy_version, delay_seconds: value.delay_seconds,\n      knowledge_version: value.knowledge_version, generation: value.generation,\n      due_at: value.due_at, state: value.state\n    };\n    ackMode = mode;\n  }\n}\nreturn [{ json: { durable_state: durable ? 'committed' : 'retry', durable,\n  ack_mode: ackMode,\n  customer_egress_allowed: false } }];"
    },
    "position": [
      7640,
      -680
    ]
  }
});

const freshDurableCommitReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Fresh Durable Job Committed and Pending?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.durable_state === \"committed\" && $json.ack_mode === \"new_pending\" && $json.durable.state === \"pending\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      7900,
      -680
    ]
  }
});

const projectReconciliationDurableCommand = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Project Exact Completed Event Reconciliation Command",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "const __expectedIngressMode = 'completed_reconcile';\n\nconst source = $input.first().json || {};\nconst exact = ['pipeline_ready','ingress_mode','postgres_command','expected_control',\n  'cryptographic_verification_performed_in_code',\n  'customer_egress_allowed'];\nconst valid = Object.keys(source).length === exact.length &&\n  exact.every((field) => Object.prototype.hasOwnProperty.call(source, field)) &&\n  source.pipeline_ready === true && source.ingress_mode === __expectedIngressMode &&\n  source.postgres_command && typeof source.postgres_command === 'object' &&\n  !Array.isArray(source.postgres_command) && source.customer_egress_allowed === false &&\n  source.cryptographic_verification_performed_in_code === false &&\n  ((source.ingress_mode === 'new_pending' && source.expected_control === null) ||\n   (source.ingress_mode === 'completed_reconcile' && source.expected_control &&\n    typeof source.expected_control === 'object' && !Array.isArray(source.expected_control)));\nreturn [{ json: valid ? source : {\n  pipeline_ready: false, ingress_mode: 'invalid', postgres_command: null,\n  expected_control: null, cryptographic_verification_performed_in_code: false,\n  customer_egress_allowed: false\n} }];"
    },
    "position": [
      6080,
      -200
    ]
  }
});

const postgresReconcileCompletedEvent = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Edge Atomic 04R - advance_conversation_generation completed event reconciliation",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_advance_signed_webhook_conversation_generation($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": webhookWorkerPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      6340,
      -200
    ]
  }
});

const finalizeReconciliationDurableCommit = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Validate Completed Event Atomic Reconciliation Before 204",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nconst source = $input.first().json || {};\nconst result = source.result && typeof source.result === 'object' && !Array.isArray(source.result)\n  ? source.result : null;\nconst projected = $('Project Exact Completed Event Reconciliation Command').first().json;\nconst command = projected.postgres_command;\nconst mode = projected.ingress_mode;\nconst requiredMode = 'completed_reconcile';\nconst expectedControl = projected.expected_control;\nlet durable = null;\nlet ackMode = null;\nconst envelopeKeys = ['contract_verified','status','operation','outcome','value','error_code'];\nconst valueKeys = ['account_id','inbox_id','channel','conversation_id','anchor_message_id',\n  'correlation_id','event_identity_key_version','event_identity_fingerprint',\n  'conversation_fingerprint','message_fingerprint','baseline_fingerprint_key_version',\n  'baseline_status_fingerprint','baseline_assignee_fingerprint','delay_policy_version',\n  'delay_seconds','knowledge_version','request_claim_id','business_claim_id','job_id','generation',\n  'due_at','state'];\nconst exactResult = result && Object.keys(result).length === envelopeKeys.length &&\n  envelopeKeys.every((field) => Object.prototype.hasOwnProperty.call(result, field));\nconst outcomeValid = mode === requiredMode && exactResult && result.contract_verified === true &&\n  result.operation === 'advance_conversation_generation' && result.error_code === null &&\n  ((mode === 'new_pending' &&\n    ((result.status === 'committed' && result.outcome === 'ingress_bound') ||\n     (result.status === 'duplicate_or_conflict' && result.outcome === 'duplicate_ingress_bound'))) ||\n   (mode === 'completed_reconcile' && result.status === 'duplicate_or_conflict' &&\n    result.outcome === 'duplicate_ingress_bound'));\nif (outcomeValid && result.value && typeof result.value === 'object') {\n  const value = result.value;\n  const exactValue = Object.keys(value).length === valueKeys.length &&\n    valueKeys.every((field) => Object.prototype.hasOwnProperty.call(value, field));\n  const control = mode === 'completed_reconcile' ? expectedControl : command;\n  const exactControl = exactValue && [\n    'account_id','inbox_id','channel','conversation_id','anchor_message_id','correlation_id',\n    'event_identity_key_version','event_identity_fingerprint','conversation_fingerprint',\n    'message_fingerprint','baseline_fingerprint_key_version','baseline_status_fingerprint',\n    'baseline_assignee_fingerprint','delay_policy_version','delay_seconds','knowledge_version'\n  ].every((field) => value[field] === control[field]);\n  const stateValid = mode === 'completed_reconcile' ? value.state === 'completed'\n    : value.state === 'pending';\n  if (exactControl && stateValid && value.request_claim_id === command.request_claim_id &&\n      value.business_claim_id === command.business_claim_id && value.job_id === command.job_id &&\n      Number.isSafeInteger(value.generation) && value.generation > 0 &&\n      typeof value.due_at === 'string' && Number.isFinite(Date.parse(value.due_at)) &&\n      (mode !== 'completed_reconcile' ||\n       (value.generation === expectedControl.generation && value.due_at === expectedControl.due_at))) {\n    durable = {\n      brand_id: 'calapres', request_claim_id: value.request_claim_id,\n      business_claim_id: value.business_claim_id, job_id: value.job_id,\n      account_id: value.account_id, inbox_id: value.inbox_id, channel: value.channel,\n      conversation_id: value.conversation_id, anchor_message_id: value.anchor_message_id,\n      correlation_id: value.correlation_id,\n      event_identity_key_version: value.event_identity_key_version,\n      event_identity_fingerprint: value.event_identity_fingerprint,\n      conversation_fingerprint: value.conversation_fingerprint,\n      message_fingerprint: value.message_fingerprint,\n      baseline_fingerprint_key_version: value.baseline_fingerprint_key_version,\n      baseline_status_fingerprint: value.baseline_status_fingerprint,\n      baseline_assignee_fingerprint: value.baseline_assignee_fingerprint,\n      delay_policy_version: value.delay_policy_version, delay_seconds: value.delay_seconds,\n      knowledge_version: value.knowledge_version, generation: value.generation,\n      due_at: value.due_at, state: value.state\n    };\n    ackMode = mode;\n  }\n}\nreturn [{ json: { durable_state: durable ? 'committed' : 'retry', durable,\n  ack_mode: ackMode,\n  customer_egress_allowed: false } }];"
    },
    "position": [
      6600,
      -200
    ]
  }
});

const durableReconciled = ifElse({
  "version": 2.3,
  "config": {
    "name": "Completed Event Request Atomically Reconciled?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.durable_state === \"committed\" && $json.ack_mode === \"completed_reconcile\" && $json.durable.state === \"completed\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      6860,
      -200
    ]
  }
});

const respondUnauthorized = node({
  "type": "n8n-nodes-base.respondToWebhook",
  "version": 1.5,
  "config": {
    "name": "Respond 401 Unauthorized Fail Closed",
    "parameters": {
      "respondWith": "noData",
      "options": {
        "responseCode": 401
      }
    },
    "position": [
      1660,
      260
    ]
  }
});

const respondBadRequest = node({
  "type": "n8n-nodes-base.respondToWebhook",
  "version": 1.5,
  "config": {
    "name": "Respond 400 Invalid Webhook Request",
    "parameters": {
      "respondWith": "noData",
      "options": {
        "responseCode": 400
      }
    },
    "position": [
      1140,
      340
    ]
  }
});

const respondPayloadTooLarge = node({
  "type": "n8n-nodes-base.respondToWebhook",
  "version": 1.5,
  "config": {
    "name": "Respond 413 Payload Too Large",
    "parameters": {
      "respondWith": "noData",
      "options": {
        "responseCode": 413
      }
    },
    "position": [
      1400,
      420
    ]
  }
});

const respondServiceUnavailable = node({
  "type": "n8n-nodes-base.respondToWebhook",
  "version": 1.5,
  "config": {
    "name": "Respond 503 Fail Closed - Delivery Retry Not Guaranteed",
    "parameters": {
      "respondWith": "noData",
      "options": {
        "responseCode": 503
      }
    },
    "position": [
      5040,
      260
    ]
  }
});

const respondReplayCompleted = node({
  "type": "n8n-nodes-base.respondToWebhook",
  "version": 1.5,
  "config": {
    "name": "Respond 204 Completed Replay Linked Job",
    "parameters": {
      "respondWith": "noData",
      "options": {
        "responseCode": 204
      }
    },
    "position": [
      2960,
      80
    ]
  }
});

const respondReconciled = node({
  "type": "n8n-nodes-base.respondToWebhook",
  "version": 1.5,
  "config": {
    "name": "Respond 204 Only After Completed Event Atomic Reconciliation",
    "parameters": {
      "respondWith": "noData",
      "options": {
        "responseCode": 204
      }
    },
    "position": [
      8420,
      -440
    ]
  }
});

const respondAccepted = node({
  "type": "n8n-nodes-base.respondToWebhook",
  "version": 1.5,
  "config": {
    "name": "Respond 204 Only After Combined Durable Commit",
    "parameters": {
      "respondWith": "noData",
      "options": {
        "responseCode": 204
      },
      "enableResponseOutput": true
    },
    "position": [
      8420,
      -760
    ]
  }
});

const projectIdentifiersOnlyWait = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Project DB Due At Into Identifiers Only Wait",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst durable = $('Validate Fresh Combined Durable Commit Before 204').first().json.durable;\ntry {\n  if (!durable || durable.state !== 'pending') throw new Error('durable_job_not_pending');\n  const wait = {\n    schema_version: '1.0', brand_id: 'calapres', account_id: durable.account_id,\n    inbox_id: durable.inbox_id, channel: durable.channel,\n    conversation_id: durable.conversation_id, anchor_message_id: durable.anchor_message_id,\n    conversation_fingerprint: durable.conversation_fingerprint,\n    message_fingerprint: durable.message_fingerprint, correlation_id: durable.correlation_id,\n    event_identity_key_version: durable.event_identity_key_version,\n    event_identity_fingerprint: durable.event_identity_fingerprint,\n    generation: durable.generation,\n    baseline_fingerprint_key_version: durable.baseline_fingerprint_key_version,\n    baseline_status_fingerprint: durable.baseline_status_fingerprint,\n    baseline_assignee_fingerprint: durable.baseline_assignee_fingerprint,\n    delay_policy_version: durable.delay_policy_version, delay_mode: 'live_observation',\n    delay_seconds: durable.delay_seconds, not_before: durable.due_at,\n    knowledge_version: durable.knowledge_version, fixture_ref: null,\n    customer_egress_allowed: false\n  };\n  const ordered = {};\n  for (const field of __edgeModule.exports.WAIT_CARRIER_FIELD_ORDER) ordered[field] = wait[field];\n  wait.wait_state_fingerprint = __edgeDependencies.sha256Hex(\n    __edgeDependencies.utf8ToBytes(JSON.stringify(ordered)));\n  __edgeStages.validateWaitState(wait);\n  return [{ json: { job_id: durable.job_id, business_claim_id: durable.business_claim_id,\n    due_at: durable.due_at, wait_state: wait, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { stage_failure: __edgeFailure('project_identifiers_only_wait', error),\n    customer_egress_allowed: false } }];\n}"
    },
    "position": [
      8680,
      -760
    ]
  }
});

const waitProjectionReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Identifiers Only DB Due Wait Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.wait_state && !$json.stage_failure }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      8940,
      -760
    ]
  }
});

const identifiersOnlyWait = node({
  "type": "n8n-nodes-base.wait",
  "version": 1.1,
  "config": {
    "name": "Wait Until PostgreSQL Due At - Identifiers Only",
    "parameters": {
      "resume": "specificTime",
      "dateTime": expr("{{ $json.due_at }}")
    },
    "position": [
      9200,
      -840
    ]
  }
});

const recoverySchedule = trigger({
  "type": "n8n-nodes-base.scheduleTrigger",
  "version": 1.3,
  "config": {
    "name": "Recovery Schedule 30 Minutes - Source Disabled Pending Cost SLA Approval",
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "minutes",
            "minutesInterval": 30
          }
        ]
      },
      "skipDurableScheduler": false
    },
    "disabled": true,
    "position": [
      8160,
      700
    ]
  }
});

const reconPrepareControl = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Reconciliation Control and Allowlisted Inbox Selection",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst executionId = typeof $execution === 'object' && $execution !== null ? String($execution.id || '') : '';\nif (!/^[A-Za-z0-9_-]{1,120}$/.test(executionId)) return [{ json: { reconciliation_ready: false, customer_egress_allowed: false } }];\nconst control = __reconciliationRuntime.prepareControl({ brand_enabled: true, kill_switch: true, api_credential_available: false });\nreturn Object.keys(__reconciliationModule.exports.INBOX_CHANNELS).map((inboxId, index) => ({ json: {\n  reconciliation_ready: false, control, inbox_id: Number(inboxId), page: 1,\n  scan_id: 'cwrs_' + __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes('calapres:' + executionId)).slice(0, 24),\n  lease_owner_id: 'reconciliation_' + executionId, lease_token: 'reconciliation_lease_' + executionId,\n  execution_id: executionId, inbox_index: index, customer_egress_allowed: false,\n} }));\n"
    },
    "position": [
      8420,
      700
    ]
  }
});

const reconBuildScanClaim = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Chatwoot Reconciliation Scan Lease Command",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const source = $json;\n  const command = __reconciliationRuntime.buildScanClaimCommand({\n    inbox_id: source.inbox_id, scan_id: source.scan_id, lease_owner_id: source.lease_owner_id,\n    lease_token: source.lease_token, lease_duration_seconds: 300, max_pages: 1,\n  });\n  return [{ json: { ...source, reconciliation_ready: true, postgres_command: command, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'scan_claim_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      8680,
      700
    ]
  }
});

const reconClaimScan = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Reconciliation 11 - claim_chatwoot_reconciliation_scan",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_claim_chatwoot_reconciliation_scan($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": reconciliationPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      8940,
      700
    ]
  }
});

const reconInterpretScan = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Interpret Reconciliation Scan Lease",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst result = $json.result && typeof $json.result === 'object' ? $json.result : null;\nconst value = result && result.value && typeof result.value === 'object' ? result.value : null;\nconst leased = result && result.status === 'committed' && result.outcome === 'scan_lease_acquired' && value;\nreturn [{ json: { ...$('Prepare Reconciliation Control and Allowlisted Inbox Selection').item.json,\n  scan_lease: leased ? value : null, reconciliation_ready: Boolean(leased), customer_egress_allowed: false } }];\n"
    },
    "position": [
      9200,
      700
    ]
  }
});

const reconScanOwned = ifElse({
  "version": 2.3,
  "config": {
    "name": "Reconciliation Scan Lease Owned?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.reconciliation_ready === true && $json.scan_lease !== null }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      9460,
      700
    ]
  }
});

const reconPrepareDiscovery = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Bounded Chatwoot Conversation Discovery",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const request = __reconciliationRuntime.buildConversationDiscoveryRequest($json.control, { inbox_id: $json.inbox_id, page: 1 });\n  return [{ json: { ...$json, discovery_request: request, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { ...$json, reconciliation_ready: false, stage_failure: String(error && error.message || 'discovery_request_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      9720,
      700
    ]
  }
});

const reconDiscoveryA = node({
  "type": "n8n-nodes-base.httpRequest",
  "version": 4.5,
  "config": {
    "name": "GET Chatwoot Reconciliation Discovery A",
    "parameters": {
      "method": "GET",
      "url": expr("https://app.chatwoot.com/api/v1/accounts/179973/conversations?status=all&assignee_type=all&inbox_id={{ $json.inbox_id }}&page=1"),
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "specifyHeaders": "keypair",
      "headerParameters": {
        "parameters": [
          {
            "name": "Accept",
            "value": "application/json"
          }
        ]
      },
      "sendBody": false,
      "options": {
        "timeout": 8000,
        "redirect": {
          "redirect": {
            "followRedirects": false
          }
        },
        "response": {
          "response": {
            "fullResponse": true,
            "neverError": true,
            "responseFormat": "json"
          }
        }
      }
    },
    "credentials": {
      "httpHeaderAuth": chatwootReadCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      9980,
      700
    ]
  }
});

const reconNormalizeDiscoveryA = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Normalize Reconciliation Discovery Snapshot A",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const envelope = __edgeHttpEnvelope($json);\n  const body = envelope.body || {};\n  const page = __reconciliationRuntime.normalizeConversationDiscoveryPage({\n    schema_version: '1.0', kind: 'chatwoot_reconciliation_conversation_page_projection_v1',\n    status_code: envelope.status_code, account_id: 179973, inbox_id: $json.inbox_id,\n    requested_page: 1, retry_after_seconds: null, error_code: envelope.error_code,\n    all_count: envelope.status_code === 200 && Array.isArray(body.data) ? body.data.length : null,\n    rows: envelope.status_code === 200 && Array.isArray(body.data) ? body.data.map((row) => ({\n      id: row.id, account_id: row.account_id || 179973, inbox_id: row.inbox_id || $json.inbox_id, status: row.status,\n    })) : null,\n  });\n  const snapshot = __reconciliationRuntime.buildDiscoverySnapshot({ pages: [page], page_cap_reached: false });\n  return [{ json: { ...$('Interpret Reconciliation Scan Lease').item.json, discovery_snapshot_a: snapshot, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { ...$('Interpret Reconciliation Scan Lease').item.json, reconciliation_ready: false, stage_failure: String(error && error.message || 'discovery_page_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      10240,
      700
    ]
  }
});

const reconDiscoveryB = node({
  "type": "n8n-nodes-base.httpRequest",
  "version": 4.5,
  "config": {
    "name": "GET Chatwoot Reconciliation Discovery B",
    "parameters": {
      "method": "GET",
      "url": expr("https://app.chatwoot.com/api/v1/accounts/179973/conversations?status=all&assignee_type=all&inbox_id={{ $json.inbox_id }}&page=1"),
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "specifyHeaders": "keypair",
      "headerParameters": {
        "parameters": [
          {
            "name": "Accept",
            "value": "application/json"
          }
        ]
      },
      "sendBody": false,
      "options": {
        "timeout": 8000,
        "redirect": {
          "redirect": {
            "followRedirects": false
          }
        },
        "response": {
          "response": {
            "fullResponse": true,
            "neverError": true,
            "responseFormat": "json"
          }
        }
      }
    },
    "credentials": {
      "httpHeaderAuth": chatwootReadCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      10500,
      700
    ]
  }
});

const reconNormalizeDiscoveryB = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Normalize Reconciliation Discovery Snapshot B and Prove Convergence",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const envelope = __edgeHttpEnvelope($json);\n  const body = envelope.body || {};\n  const page = __reconciliationRuntime.normalizeConversationDiscoveryPage({\n    schema_version: '1.0', kind: 'chatwoot_reconciliation_conversation_page_projection_v1',\n    status_code: envelope.status_code, account_id: 179973, inbox_id: $json.inbox_id,\n    requested_page: 1, retry_after_seconds: null, error_code: envelope.error_code,\n    all_count: envelope.status_code === 200 && Array.isArray(body.data) ? body.data.length : null,\n    rows: envelope.status_code === 200 && Array.isArray(body.data) ? body.data.map((row) => ({\n      id: row.id, account_id: row.account_id || 179973, inbox_id: row.inbox_id || $json.inbox_id, status: row.status,\n    })) : null,\n  });\n  const first = $('Normalize Reconciliation Discovery Snapshot A').item.json;\n  const snapshot = __reconciliationRuntime.buildDiscoverySnapshot({ pages: [page], page_cap_reached: false });\n  const coverage = __reconciliationRuntime.evaluateDiscoveryConvergence({ first_snapshot: first.discovery_snapshot_a, second_snapshot: snapshot });\n  return [{ json: { ...first, discovery_coverage: coverage, reconciliation_ready: coverage.bounded_convergence_passed, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'discovery_convergence_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      10760,
      700
    ]
  }
});

const reconConverged = ifElse({
  "version": 2.3,
  "config": {
    "name": "Bounded Reconciliation Discovery Converged?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.reconciliation_ready === true && $json.discovery_coverage.bounded_convergence_passed === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      11020,
      700
    ]
  }
});

const reconBuildCursorRead = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Reconciliation Cursor Read Command",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const conversationId = $json.discovery_coverage && $json.discovery_coverage.conversation_ids[0];\n  if (!conversationId || !$json.scan_lease) throw new Error('no_reconciliation_conversation');\n  return [{ json: { ...$json, conversation_id: conversationId, postgres_command: {\n    brand_id: 'calapres', account_id: 179973, inbox_id: $json.inbox_id, channel: __reconciliationModule.exports.INBOX_CHANNELS[$json.inbox_id],\n    conversation_id: conversationId, scan_id: $json.scan_id, scan_lease_token: $json.scan_lease.lease_token,\n    operation: 'read_chatwoot_reconciliation_cursor', customer_egress_allowed: false,\n  }, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'cursor_read_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      11280,
      700
    ]
  }
});

const reconReadCursor = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Reconciliation 13 - read_chatwoot_reconciliation_cursor",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_read_chatwoot_reconciliation_cursor($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": reconciliationPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      11540,
      700
    ]
  }
});

const reconBuildMessagesRequest = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Bounded Messages After Cursor Request",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const cursor = $json.result && $json.result.value ? $json.result.value : $json.result;\n  const after = cursor && Number.isSafeInteger(cursor.after_message_id) ? cursor.after_message_id : 0;\n  const request = __reconciliationRuntime.buildMessagesAfterRequest($json.control, { inbox_id: $json.inbox_id, conversation_id: $json.conversation_id, after_message_id: after });\n  return [{ json: { ...$json, cursor, expected_after_message_id: after, messages_request: request, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'messages_request_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      11800,
      700
    ]
  }
});

const reconMessages = node({
  "type": "n8n-nodes-base.httpRequest",
  "version": 4.5,
  "config": {
    "name": "GET Chatwoot Reconciliation Messages After Cursor",
    "parameters": {
      "method": "GET",
      "url": expr("https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $json.conversation_id }}/messages?after={{ $json.expected_after_message_id }}"),
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "specifyHeaders": "keypair",
      "headerParameters": {
        "parameters": [
          {
            "name": "Accept",
            "value": "application/json"
          }
        ]
      },
      "sendBody": false,
      "options": {
        "timeout": 8000,
        "redirect": {
          "redirect": {
            "followRedirects": false
          }
        },
        "response": {
          "response": {
            "fullResponse": true,
            "neverError": true,
            "responseFormat": "json"
          }
        }
      }
    },
    "credentials": {
      "httpHeaderAuth": chatwootReadCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      12060,
      700
    ]
  }
});

const reconFinalizeMessages = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Validate Reconciliation Messages Page and Candidate Proof",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const envelope = __edgeHttpEnvelope($json);\n  const body = envelope.body || {};\n  const page = __reconciliationRuntime.normalizeMessagesAfterPage({\n    schema_version: '1.0', kind: 'chatwoot_reconciliation_messages_after_projection_v1',\n    status_code: envelope.status_code, account_id: 179973, inbox_id: $json.inbox_id,\n    conversation_id: $json.conversation_id, requested_after_message_id: $json.expected_after_message_id,\n    retry_after_seconds: null, error_code: envelope.error_code,\n    rows: envelope.status_code === 200 && Array.isArray(body.payload) ? body.payload.map((row) => ({\n      id: row.id, account_id: row.account_id || 179973, inbox_id: row.inbox_id || $json.inbox_id,\n      conversation_id: row.conversation_id || $json.conversation_id, created_at: row.created_at,\n      message_type: row.message_type, private: row.private, sender_type: row.sender && row.sender.type || null,\n      attachment_count: Array.isArray(row.attachments) ? row.attachments.length : 0,\n    })) : null,\n  });\n  const finalization = __reconciliationRuntime.finalizeMessagesPage(page);\n  return [{ json: { ...$json, messages_page: page, messages_finalization: finalization, reconciliation_ready: finalization.status === 'ready', customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'messages_page_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      12320,
      700
    ]
  }
});

const reconMessagesReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Reconciliation Page 1-99 Proof Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.reconciliation_ready === true && $json.messages_finalization.status === \"ready\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      12580,
      700
    ]
  }
});

const reconPrepareCandidate = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Reconciliation Candidate Identity HMAC Chain",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const candidate = $json.messages_finalization && $json.messages_finalization.event_candidates && $json.messages_finalization.event_candidates[0];\n  if (!candidate) return [{ json: { reconciliation_ready: false, customer_egress_allowed: false } }];\n  const plan = __reconciliationBridge.prepareCandidateIdentity({ messages_page: $json.messages_finalization, candidate, reconciliation_context: {\n    scan_id: $json.scan_id, scan_lease_token: $json.scan_lease.lease_token, expected_after_message_id: $json.expected_after_message_id,\n  }, execution_id: $json.execution_id });\n  return [{ json: { ...$json, candidate_plan: plan, hmac_requests: plan.hmac_requests, reconciliation_ready: true, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'candidate_identity_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      12840,
      700
    ]
  }
});

const reconCandidateHmac01 = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation 01 candidate_identity event_identity v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "reconciliation_hmac_candidate_identity_01_event_identity_v1",
      "encoding": "hex",
      "value": expr("{{ $json.hmac_requests[0].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      13100,
      700
    ]
  }
});

const reconCandidateHmac02 = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation 02 candidate_identity request_attempt_identity v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "reconciliation_hmac_candidate_identity_02_request_attempt_identity_v1",
      "encoding": "hex",
      "value": expr("{{ $json.hmac_requests[1].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      13230,
      700
    ]
  }
});

const reconCandidateHmac03 = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation 03 candidate_identity event_identity v2 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "reconciliation_hmac_candidate_identity_03_event_identity_v2",
      "encoding": "hex",
      "value": expr("{{ $json.hmac_requests[2].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      13360,
      700
    ]
  }
});

const reconCandidateHmac04 = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation 04 candidate_identity request_attempt_identity v2 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "reconciliation_hmac_candidate_identity_04_request_attempt_identity_v2",
      "encoding": "hex",
      "value": expr("{{ $json.hmac_requests[3].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      13490,
      700
    ]
  }
});

const reconFinalizeCandidate = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Finalize Reconciliation Candidate Identity",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const plan = $json.candidate_plan;\n  const digestFields = {\n    reconciliation_hmac_candidate_identity_01_event_identity_v1: $json.reconciliation_hmac_candidate_identity_01_event_identity_v1,\n    reconciliation_hmac_candidate_identity_02_request_attempt_identity_v1: $json.reconciliation_hmac_candidate_identity_02_request_attempt_identity_v1,\n    reconciliation_hmac_candidate_identity_03_event_identity_v2: $json.reconciliation_hmac_candidate_identity_03_event_identity_v2,\n    reconciliation_hmac_candidate_identity_04_request_attempt_identity_v2: $json.reconciliation_hmac_candidate_identity_04_request_attempt_identity_v2,\n  };\n  const identity = __reconciliationBridge.finalizeCandidateIdentity({ ...plan, ...digestFields });\n  return [{ json: { ...$json, ...identity, candidate_identity: identity, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'candidate_hmac_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      13750,
      700
    ]
  }
});

const reconRouteHmac01 = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation 05 route_identity message_anchor v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "reconciliation_hmac_route_identity_01_message_anchor_v1",
      "encoding": "hex",
      "value": expr("{{ $json.route_hmac_requests[0].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      14010,
      700
    ]
  }
});

const reconRouteHmac02 = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation 06 route_identity conversation v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "reconciliation_hmac_route_identity_02_conversation_v1",
      "encoding": "hex",
      "value": expr("{{ $json.route_hmac_requests[1].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      14140,
      700
    ]
  }
});

const reconRouteHmac03 = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation 07 route_identity message_anchor v2 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "reconciliation_hmac_route_identity_03_message_anchor_v2",
      "encoding": "hex",
      "value": expr("{{ $json.route_hmac_requests[2].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      14270,
      700
    ]
  }
});

const reconRouteHmac04 = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation 08 route_identity conversation v2 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "reconciliation_hmac_route_identity_04_conversation_v2",
      "encoding": "hex",
      "value": expr("{{ $json.route_hmac_requests[3].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      14400,
      700
    ]
  }
});

const reconFinalizeRoute = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Finalize Reconciliation Route and Atomic Claims",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const identity = $json.candidate_identity;\n  const route = __reconciliationBridge.finalizeRouteAndProjectAtomicClaims({\n    ...identity,\n    reconciliation_hmac_route_identity_01_message_anchor_v1: $json.reconciliation_hmac_route_identity_01_message_anchor_v1,\n    reconciliation_hmac_route_identity_02_conversation_v1: $json.reconciliation_hmac_route_identity_02_conversation_v1,\n    reconciliation_hmac_route_identity_03_message_anchor_v2: $json.reconciliation_hmac_route_identity_03_message_anchor_v2,\n    reconciliation_hmac_route_identity_04_conversation_v2: $json.reconciliation_hmac_route_identity_04_conversation_v2,\n  });\n  return [{ json: { ...$json, reconciliation_projection: route, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'route_hmac_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      14530,
      700
    ]
  }
});

const reconBaselineConversation = node({
  "type": "n8n-nodes-base.httpRequest",
  "version": 4.5,
  "config": {
    "name": "GET Reconciliation Conversation Baseline",
    "parameters": {
      "method": "GET",
      "url": expr("https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $json.candidate_identity.candidate.conversation_id }}"),
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "specifyHeaders": "keypair",
      "headerParameters": {
        "parameters": [
          {
            "name": "Accept",
            "value": "application/json"
          }
        ]
      },
      "sendBody": false,
      "options": {
        "timeout": 8000,
        "redirect": {
          "redirect": {
            "followRedirects": false
          }
        },
        "response": {
          "response": {
            "fullResponse": true,
            "neverError": true,
            "responseFormat": "json"
          }
        }
      }
    },
    "credentials": {
      "httpHeaderAuth": chatwootReadCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      14790,
      700
    ]
  }
});

const reconPrepareBaseline = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Reconciliation Baseline HMAC",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const envelope = __edgeHttpEnvelope($json);\n  const body = envelope.body || {};\n  const status = typeof body.status === 'string' ? body.status : null;\n  const assignee = body.meta && body.meta.assignee && body.meta.assignee.id;\n  if (envelope.status_code !== 200 || !status || !Number.isSafeInteger(assignee)) throw new Error('reconciliation_baseline_unavailable');\n  return [{ json: { ...$json, baseline_plan: { status, assignee: String(assignee), baseline_key_version: 'calapres-hmac-v1', customer_egress_allowed: false }, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'reconciliation_baseline_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      15050,
      700
    ]
  }
});

const reconBaselineStatus = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation Baseline Status v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_reconciliation_baseline_status_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.baseline_plan.status }}")
    },
    "credentials": {
      "crypto": baselineHmacCredential
    },
    "position": [
      15310,
      700
    ]
  }
});

const reconBaselineAssignee = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto Reconciliation Baseline Assignee v1 Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_reconciliation_baseline_assignee_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.baseline_plan.assignee }}")
    },
    "credentials": {
      "crypto": baselineHmacCredential
    },
    "position": [
      15440,
      700
    ]
  }
});

const reconBuildRequestClaim = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Reconciliation Request Replay Claim",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst projection = $json.reconciliation_projection;\nreturn [{ json: { ...$json, postgres_command: projection && projection.claim_request_replay_command || null, reconciliation_ready: Boolean(projection), customer_egress_allowed: false } }];\n"
    },
    "position": [
      14790,
      700
    ]
  }
});

const reconClaimRequest = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Reconciliation 01 - claim_reconciliation_request_replay",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_claim_reconciliation_request_replay($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": reconciliationPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      15050,
      700
    ]
  }
});

const reconInterpretRequest = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Interpret Reconciliation Request Replay Claim",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst result = $json.result && typeof $json.result === 'object' ? $json.result : null;\nconst value = result && result.value && typeof result.value === 'object' ? result.value : null;\nconst ready = result && ['committed', 'duplicate_or_conflict'].includes(result.status) && value;\nreturn [{ json: { ...$json, request_result: result, request_claim: ready ? value : null, reconciliation_ready: Boolean(ready), customer_egress_allowed: false } }];\n"
    },
    "position": [
      15310,
      700
    ]
  }
});

const reconBuildBusinessClaim = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Reconciliation Business Event Claim",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst projection = $json.reconciliation_projection;\nreturn [{ json: { ...$json, postgres_command: projection && projection.claim_business_event_command || null, reconciliation_ready: Boolean(projection && $json.request_claim), customer_egress_allowed: false } }];\n"
    },
    "position": [
      15570,
      700
    ]
  }
});

const reconClaimBusiness = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Reconciliation 02 - claim_business_event",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_claim_business_event($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": reconciliationPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      15830,
      700
    ]
  }
});

const reconInterpretBusiness = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Interpret Reconciliation Business Event Claim",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst result = $json.result && typeof $json.result === 'object' ? $json.result : null;\nconst value = result && result.value && typeof result.value === 'object' ? result.value : null;\nconst ready = result && ['committed', 'duplicate_or_conflict'].includes(result.status) && value;\nreturn [{ json: { ...$json, business_result: result, business_claim: ready ? value : null, reconciliation_ready: Boolean(ready), customer_egress_allowed: false } }];\n"
    },
    "position": [
      16090,
      700
    ]
  }
});

const reconBuildAdvance = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Reconciliation Atomic Generation Command",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const projection = $json.reconciliation_projection;\n  const request = $json.request_claim;\n  const business = $json.business_claim;\n  const control = projection && projection.advance_conversation_generation_control;\n  if (!projection || !request || !business || !control || !$json.native_reconciliation_baseline_status_v1_hex || !$json.native_reconciliation_baseline_assignee_v1_hex) throw new Error('reconciliation_op4_inputs_missing');\n  return [{ json: { ...$json, postgres_command: { ...control, request_claim_id: request.claim_id, business_claim_id: business.claim_id, request_lease_owner_id: request.lease_owner_id, request_lease_token: request.lease_token, business_lease_owner_id: business.lease_owner_id, business_lease_token: business.lease_token, baseline_status_fingerprint: $json.native_reconciliation_baseline_status_v1_hex, baseline_assignee_fingerprint: $json.native_reconciliation_baseline_assignee_v1_hex, request_processing_lease_result: $json.request_result, business_prepared_or_completed_result: $json.business_result, ready_for_atomic_call: true, customer_egress_allowed: false }, reconciliation_ready: true, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'reconciliation_op4_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      16350,
      700
    ]
  }
});

const reconAdvanceGeneration = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Reconciliation 04 - advance_reconciliation_conversation_generation",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_advance_reconciliation_conversation_generation($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": reconciliationPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      16610,
      700
    ]
  }
});

const reconBuildCursorAdvance = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Reconciliation Cursor Compare and Advance Command",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const source = $json.messages_finalization;\n  const value = $json.result && $json.result.value && typeof $json.result.value === 'object' ? $json.result.value : null;\n  const candidates = source && Array.isArray(source.outcome_requirements) ? source.outcome_requirements.filter((row) => row.classification === 'event_candidate') : [];\n  if (!value || $json.result.status !== 'committed' || candidates.length !== 1) throw new Error('cursor_requires_one_durable_candidate');\n  const proofRows = source.outcome_requirements.map((row) => row.classification === 'deterministically_excluded' ? ({ message_id: row.message_id, classification: row.classification, outcome: 'deterministically_excluded', reason_code: row.required_reason_code, created_at: row.created_at, message_type: row.message_type, private: row.private, sender_type: row.sender_type, event_identity_key_version: null, event_identity_fingerprint: null, business_claim_id: null, job_id: null, generation: null }) : ({ message_id: row.message_id, classification: 'event_candidate', outcome: 'durable_bound', reason_code: null, created_at: null, message_type: null, private: null, sender_type: null, event_identity_key_version: $json.candidate_identity.active_event_identity_key_version, event_identity_fingerprint: $json.candidate_identity.event_identity_fingerprints[$json.candidate_identity.active_event_identity_key_version], business_claim_id: value.business_claim_id || $json.business_claim.claim_id, job_id: value.job_id, generation: value.generation }));\n  const finalization = { schema_version: '1.0', kind: 'chatwoot_reconciliation_cursor_finalization_v1', status: 'ready', reason_code: null, source: 'chatwoot_reconciliation_v1', brand_id: 'calapres', account_id: 179973, inbox_id: $json.inbox_id, channel: __reconciliationModule.exports.INBOX_CHANNELS[$json.inbox_id], conversation_id: $json.conversation_id, expected_after_message_id: $json.expected_after_message_id, new_after_message_id: source.proposed_next_after_message_id, activation_floor_at: '2026-08-12T00:00:00.000Z', activation_policy_version: '2026-08-12-v1', proof_rows: proofRows, page_binding_sha256: null, outcome_digest: null, row_count: proofRows.length, cursor_advance_ready: true, continue_required: false, no_loss_claimed: false, customer_egress_allowed: false };\n  const command = __reconciliationRuntime.buildCursorAdvanceCommand({ finalization, scan_id: $json.scan_id, lease_token: $json.scan_lease.lease_token });\n  return [{ json: { ...$json, postgres_command: command, reconciliation_ready: true, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { reconciliation_ready: false, stage_failure: String(error && error.message || 'cursor_advance_invalid'), customer_egress_allowed: false } }];\n}\n"
    },
    "position": [
      16870,
      700
    ]
  }
});

const reconAdvanceCursor = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Reconciliation 12 - compare_and_advance_chatwoot_message_cursor",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": reconciliationPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      17130,
      700
    ]
  }
});

const reconTerminal = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Reconciliation Observation Terminal - No Send",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "return [{ json: { reconciliation_terminal: true, customer_egress_allowed: false } }];"
    },
    "position": [
      17390,
      700
    ]
  }
});

const prepareWorkerClaim = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Worker Claim Without Conversation Identifier",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst executionId = typeof $execution === 'object' && $execution !== null\n  ? String($execution.id || '') : '';\nif (!/^[A-Za-z0-9_-]{1,120}$/.test(executionId)) {\n  return [{ json: { worker_claim_ready: false, customer_egress_allowed: false } }];\n}\nconst workerId = 'edge_worker_' + executionId;\nconst leaseToken = 'worker_lease_' + __edgeDependencies.sha256Hex(\n  __edgeDependencies.utf8ToBytes('calapres:' + executionId)).slice(0, 48);\nreturn [{ json: { worker_claim_ready: true,\n  postgres_command: { brand_id: 'calapres', worker_id: workerId,\n    lease_token: leaseToken, lease_duration_seconds: 300 },\n  customer_egress_allowed: false } }];"
    },
    "position": [
      8940,
      -600
    ]
  }
});

const postgresClaimDue = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Edge Atomic 07 - claim_due_conversation_retry",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_claim_due_conversation_retry($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": webhookWorkerPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      9200,
      -600
    ]
  }
});

const interpretWorkerLease = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Interpret Exclusive Worker Lease",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nconst source = $input.first().json || {};\nconst result = source.result && typeof source.result === 'object' && !Array.isArray(source.result)\n  ? source.result : null;\nconst command = $('Prepare Worker Claim Without Conversation Identifier').first().json.postgres_command;\nconst required = ['job_id','conversation_id','generation','business_claim_id','due_at','account_id',\n  'inbox_id','channel','anchor_message_id','correlation_id','event_identity_key_version',\n  'event_identity_fingerprint','conversation_fingerprint','message_fingerprint',\n  'baseline_fingerprint_key_version','baseline_status_fingerprint',\n  'baseline_assignee_fingerprint','delay_policy_version','delay_seconds','knowledge_version',\n  'worker_id','lease_token','lease_expires_at','attempt_count'];\nlet worker = null;\nif (result && result.contract_verified === true &&\n    result.operation === 'claim_due_conversation_retry' && result.status === 'committed' &&\n    ['job_claimed','job_lease_owned','job_lease_recovered'].includes(result.outcome) &&\n    result.error_code === null && result.value &&\n    Object.keys(result.value).length === required.length &&\n    required.every((field) => Object.prototype.hasOwnProperty.call(result.value, field)) &&\n    result.value.worker_id === command.worker_id && result.value.lease_token === command.lease_token &&\n    Number.isSafeInteger(result.value.generation) && result.value.generation > 0 &&\n    Number.isSafeInteger(result.value.attempt_count) && result.value.attempt_count > 0 &&\n    typeof result.value.due_at === 'string' && Number.isFinite(Date.parse(result.value.due_at)) &&\n    typeof result.value.lease_expires_at === 'string' &&\n    Number.isFinite(Date.parse(result.value.lease_expires_at))) {\n  worker = {\n    brand_id: 'calapres', job_id: result.value.job_id,\n    conversation_id: result.value.conversation_id, generation: result.value.generation,\n    business_claim_id: result.value.business_claim_id, due_at: result.value.due_at,\n    account_id: result.value.account_id, inbox_id: result.value.inbox_id,\n    channel: result.value.channel, anchor_message_id: result.value.anchor_message_id,\n    correlation_id: result.value.correlation_id,\n    event_identity_key_version: result.value.event_identity_key_version,\n    event_identity_fingerprint: result.value.event_identity_fingerprint,\n    conversation_fingerprint: result.value.conversation_fingerprint,\n    message_fingerprint: result.value.message_fingerprint,\n    baseline_fingerprint_key_version: result.value.baseline_fingerprint_key_version,\n    baseline_status_fingerprint: result.value.baseline_status_fingerprint,\n    baseline_assignee_fingerprint: result.value.baseline_assignee_fingerprint,\n    delay_policy_version: result.value.delay_policy_version,\n    delay_seconds: result.value.delay_seconds, knowledge_version: result.value.knowledge_version,\n    worker_id: result.value.worker_id, lease_token: result.value.lease_token,\n    lease_expires_at: result.value.lease_expires_at, attempt_count: result.value.attempt_count\n  };\n}\nconst noJob = result && result.contract_verified === true &&\n  result.operation === 'claim_due_conversation_retry' &&\n  result.status === 'duplicate_or_conflict' && result.outcome === 'no_due_job' &&\n  result.value === null && result.error_code === null;\nreturn [{ json: { worker_state: worker ? 'leased' : noJob ? 'no_due_job' : 'retry_later',\n  worker, customer_egress_allowed: false } }];"
    },
    "position": [
      9460,
      -600
    ]
  }
});

const workerLeaseOwned = ifElse({
  "version": 2.3,
  "config": {
    "name": "Exclusive Worker Lease Owned?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.worker_state === \"leased\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      9720,
      -600
    ]
  }
});

const attachTrustedControls = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Attach Source Trusted Kill Switch",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nconst worker = $('Interpret Exclusive Worker Lease').first().json.worker;\nreturn [{ json: { worker,\n  trusted_control: {\n    source: 'source_only_placeholder', brand_enabled: true, kill_switch: true,\n    customer_egress_enabled: false, model_call_enabled: false\n  },\n  customer_egress_allowed: false\n} }];"
    },
    "position": [
      9980,
      -680
    ]
  }
});

const prepareWorkerWait = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Worker Identifiers Only Reread State",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst source = $('Attach Source Trusted Kill Switch').first().json;\nconst worker = source.worker;\ntry {\n  if (!worker || source.trusted_control.source !== 'source_only_placeholder' ||\n      source.trusted_control.kill_switch !== true) throw new Error('trusted_control_invalid');\n  const wait = {\n    schema_version: '1.0', brand_id: 'calapres', account_id: worker.account_id,\n    inbox_id: worker.inbox_id, channel: worker.channel,\n    conversation_id: worker.conversation_id, anchor_message_id: worker.anchor_message_id,\n    conversation_fingerprint: worker.conversation_fingerprint,\n    message_fingerprint: worker.message_fingerprint, correlation_id: worker.correlation_id,\n    event_identity_key_version: worker.event_identity_key_version,\n    event_identity_fingerprint: worker.event_identity_fingerprint,\n    generation: worker.generation,\n    baseline_fingerprint_key_version: worker.baseline_fingerprint_key_version,\n    baseline_status_fingerprint: worker.baseline_status_fingerprint,\n    baseline_assignee_fingerprint: worker.baseline_assignee_fingerprint,\n    delay_policy_version: worker.delay_policy_version, delay_mode: 'live_observation',\n    delay_seconds: worker.delay_seconds, not_before: worker.due_at,\n    knowledge_version: worker.knowledge_version, fixture_ref: null,\n    customer_egress_allowed: false\n  };\n  const ordered = {};\n  for (const field of __edgeModule.exports.WAIT_CARRIER_FIELD_ORDER) ordered[field] = wait[field];\n  wait.wait_state_fingerprint = __edgeDependencies.sha256Hex(\n    __edgeDependencies.utf8ToBytes(JSON.stringify(ordered)));\n  __edgeStages.validateWaitState(wait);\n  return [{ json: { worker_ready: true, worker, wait_state: wait,\n    trusted_control: source.trusted_control, customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { worker_ready: false, worker,\n    stage_failure: __edgeFailure('prepare_worker_wait', error),\n    customer_egress_allowed: false } }];\n}"
    },
    "position": [
      10240,
      -680
    ]
  }
});

const workerWaitReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Worker Reread State Fully Bound?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.worker_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      10500,
      -680
    ]
  }
});

const getConversationBefore = node({
  "type": "n8n-nodes-base.httpRequest",
  "version": 4.5,
  "config": {
    "name": "GET Chatwoot Conversation Before Worker Reread",
    "parameters": {
      "method": "GET",
      "url": expr("https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $(\"Prepare Worker Identifiers Only Reread State\").item.json.wait_state.conversation_id }}"),
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "specifyHeaders": "keypair",
      "headerParameters": {
        "parameters": [
          {
            "name": "Accept",
            "value": "application/json"
          }
        ]
      },
      "sendBody": false,
      "options": {
        "timeout": 8000,
        "redirect": {
          "redirect": {
            "followRedirects": false
          }
        },
        "response": {
          "response": {
            "fullResponse": true,
            "neverError": true,
            "responseFormat": "json"
          }
        }
      }
    },
    "credentials": {
      "httpHeaderAuth": chatwootReadCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      10760,
      -760
    ]
  }
});

const getMessagesFirst = node({
  "type": "n8n-nodes-base.httpRequest",
  "version": 4.5,
  "config": {
    "name": "GET Chatwoot Messages Worker Reread A",
    "parameters": {
      "method": "GET",
      "url": expr("https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $(\"Prepare Worker Identifiers Only Reread State\").item.json.wait_state.conversation_id }}/messages?after={{ Number($(\"Prepare Worker Identifiers Only Reread State\").item.json.wait_state.anchor_message_id) - 1 }}"),
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "specifyHeaders": "keypair",
      "headerParameters": {
        "parameters": [
          {
            "name": "Accept",
            "value": "application/json"
          }
        ]
      },
      "sendBody": false,
      "options": {
        "timeout": 8000,
        "redirect": {
          "redirect": {
            "followRedirects": false
          }
        },
        "response": {
          "response": {
            "fullResponse": true,
            "neverError": true,
            "responseFormat": "json"
          }
        }
      }
    },
    "credentials": {
      "httpHeaderAuth": chatwootReadCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      11020,
      -760
    ]
  }
});

const getMessagesSecond = node({
  "type": "n8n-nodes-base.httpRequest",
  "version": 4.5,
  "config": {
    "name": "GET Chatwoot Messages Worker Reread B",
    "parameters": {
      "method": "GET",
      "url": expr("https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $(\"Prepare Worker Identifiers Only Reread State\").item.json.wait_state.conversation_id }}/messages?after={{ Number($(\"Prepare Worker Identifiers Only Reread State\").item.json.wait_state.anchor_message_id) - 1 }}"),
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "specifyHeaders": "keypair",
      "headerParameters": {
        "parameters": [
          {
            "name": "Accept",
            "value": "application/json"
          }
        ]
      },
      "sendBody": false,
      "options": {
        "timeout": 8000,
        "redirect": {
          "redirect": {
            "followRedirects": false
          }
        },
        "response": {
          "response": {
            "fullResponse": true,
            "neverError": true,
            "responseFormat": "json"
          }
        }
      }
    },
    "credentials": {
      "httpHeaderAuth": chatwootReadCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      11280,
      -760
    ]
  }
});

const getConversationAfter = node({
  "type": "n8n-nodes-base.httpRequest",
  "version": 4.5,
  "config": {
    "name": "GET Chatwoot Conversation After Worker Reread",
    "parameters": {
      "method": "GET",
      "url": expr("https://app.chatwoot.com/api/v1/accounts/179973/conversations/{{ $(\"Prepare Worker Identifiers Only Reread State\").item.json.wait_state.conversation_id }}"),
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "specifyHeaders": "keypair",
      "headerParameters": {
        "parameters": [
          {
            "name": "Accept",
            "value": "application/json"
          }
        ]
      },
      "sendBody": false,
      "options": {
        "timeout": 8000,
        "redirect": {
          "redirect": {
            "followRedirects": false
          }
        },
        "response": {
          "response": {
            "fullResponse": true,
            "neverError": true,
            "responseFormat": "json"
          }
        }
      }
    },
    "credentials": {
      "httpHeaderAuth": chatwootReadCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      11540,
      -760
    ]
  }
});

const prepareBoundedReread = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Strict Bounded Double Reread",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst carrier = $('Prepare Worker Identifiers Only Reread State').first().json;\ntry {\n  const plan = __edgeStages.prepareBoundedReread({ schema_version: '1.0',\n    wait_state: carrier.wait_state, read_started_epoch_seconds: Math.floor(Date.now() / 1000),\n    conversation_before: __edgeHttpEnvelope($('GET Chatwoot Conversation Before Worker Reread').first().json),\n    messages_first: __edgeHttpEnvelope($('GET Chatwoot Messages Worker Reread A').first().json),\n    messages_second: __edgeHttpEnvelope($('GET Chatwoot Messages Worker Reread B').first().json),\n    conversation_after: __edgeHttpEnvelope($('GET Chatwoot Conversation After Worker Reread').first().json)\n  });\n  if (!Array.isArray(plan.event_hmac_requests) || plan.event_hmac_requests.length !== 1 ||\n      !Array.isArray(plan.baseline_hmac_requests) || plan.baseline_hmac_requests.length !== 4) {\n    throw new Error('reread_hmac_cardinality_invalid');\n  }\n  return [{ json: {\n    reread_ready: true, worker: carrier.worker, trusted_control: carrier.trusted_control,\n    reread_plan: plan, cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false\n  } }];\n} catch (error) {\n  return [{ json: { reread_ready: false, worker: carrier.worker,\n    stage_failure: __edgeFailure('prepare_bounded_reread', error),\n    customer_egress_allowed: false } }];\n}"
    },
    "position": [
      11800,
      -760
    ]
  }
});

const rereadEventReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Bounded Reread Event HMAC Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.reread_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      12060,
      -760
    ]
  }
});

const rereadEventHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Reread Anchor Event Identity Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_reread_anchor_event_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.reread_plan.event_hmac_requests[0].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      12320,
      -840
    ]
  }
});

const prepareRereadMessage = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Finalize Anchor Event and Prepare Anchor Message HMAC",
    "parameters": {
      "mode": "runOnceForEachItem",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const reread = $json.reread_plan;\n  if (!reread || !Array.isArray(reread.event_hmac_requests) ||\n      reread.event_hmac_requests.length !== 1 ||\n      !/^[a-f0-9]{64}$/.test($json.native_reread_anchor_event_v1_hex || '')) {\n    throw new Error('reread_event_native_chain_invalid');\n  }\n  const request = reread.event_hmac_requests[0];\n  const eventResults = [{ purpose: request.purpose, key_version: request.key_version,\n    digest_hex: $json.native_reread_anchor_event_v1_hex }];\n  const plan = __edgeStages.prepareRereadMessageFingerprints({\n    reread_plan: reread, event_hmac_results: eventResults });\n  if (!Array.isArray(plan.message_hmac_requests) || plan.message_hmac_requests.length !== 1) {\n    throw new Error('reread_message_hmac_cardinality_invalid');\n  }\n  return { json: {\n    message_ready: true, worker: $json.worker, trusted_control: $json.trusted_control,\n    message_plan: plan, cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false\n  } };\n} catch (error) {\n  return { json: { message_ready: false, worker: $json.worker,\n    stage_failure: __edgeFailure('prepare_reread_message', error),\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } };\n}"
    },
    "position": [
      12580,
      -840
    ]
  }
});

const rereadMessageReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Reread Message HMAC Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.message_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      12840,
      -840
    ]
  }
});

const rereadMessageHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Reread Anchor Message Fingerprint Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_reread_anchor_message_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.message_plan.message_hmac_requests[0].material_utf8 }}")
    },
    "credentials": {
      "crypto": eventIdentityHmacCredential
    },
    "position": [
      13100,
      -920
    ]
  }
});

const expandRereadBaseline = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Finalize Anchor Message and Prepare Fixed Baseline HMAC",
    "parameters": {
      "mode": "runOnceForEachItem",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const plan = $json.message_plan;\n  if (!plan || !Array.isArray(plan.message_hmac_requests) ||\n      plan.message_hmac_requests.length !== 1 ||\n      !/^[a-f0-9]{64}$/.test($json.native_reread_anchor_message_v1_hex || '')) {\n    throw new Error('reread_message_native_chain_invalid');\n  }\n  const messageRequest = plan.message_hmac_requests[0];\n  const messageResults = [{ purpose: messageRequest.purpose,\n    key_version: messageRequest.key_version,\n    digest_hex: $json.native_reread_anchor_message_v1_hex }];\n  const requests = plan.reread_plan.baseline_hmac_requests;\n  if (!Array.isArray(requests) || requests.length !== 4) throw new Error('baseline_plan_invalid');\n  return { json: {\n    baseline_ready: true, worker: $json.worker, trusted_control: $json.trusted_control,\n    message_plan: plan, message_hmac_results: messageResults,\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false\n  } };\n} catch (error) {\n  return { json: { baseline_ready: false, worker: $json.worker,\n    stage_failure: __edgeFailure('expand_reread_baseline', error),\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } };\n}"
    },
    "position": [
      13360,
      -920
    ]
  }
});

const rereadBaselineReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Reread Baseline HMAC Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.baseline_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      13620,
      -920
    ]
  }
});

const rereadBeforeStatusHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Reread Before Status Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_reread_before_status_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.message_plan.reread_plan.baseline_hmac_requests[0].material_utf8 }}")
    },
    "credentials": {
      "crypto": baselineHmacCredential
    },
    "position": [
      13880,
      -1000
    ]
  }
});

const rereadBeforeAssigneeHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Reread Before Assignee Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_reread_before_assignee_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.message_plan.reread_plan.baseline_hmac_requests[1].material_utf8 }}")
    },
    "credentials": {
      "crypto": baselineHmacCredential
    },
    "position": [
      14010,
      -1000
    ]
  }
});

const rereadAfterStatusHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Reread After Status Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_reread_after_status_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.message_plan.reread_plan.baseline_hmac_requests[2].material_utf8 }}")
    },
    "credentials": {
      "crypto": baselineHmacCredential
    },
    "position": [
      14140,
      -1000
    ]
  }
});

const rereadAfterAssigneeHmac = node({
  "type": "n8n-nodes-base.crypto",
  "version": 2,
  "config": {
    "name": "Crypto HMAC - Reread After Assignee Placeholder",
    "parameters": {
      "action": "hmac",
      "binaryData": false,
      "type": "SHA256",
      "dataPropertyName": "native_reread_after_assignee_v1_hex",
      "encoding": "hex",
      "value": expr("{{ $json.message_plan.reread_plan.baseline_hmac_requests[3].material_utf8 }}")
    },
    "credentials": {
      "crypto": baselineHmacCredential
    },
    "position": [
      14270,
      -1000
    ]
  }
});

const buildGenerationRead = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Current Generation Read Command",
    "parameters": {
      "mode": "runOnceForEachItem",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\ntry {\n  const plan = $json.message_plan.reread_plan;\n  const properties = [\n    'native_reread_before_status_v1_hex', 'native_reread_before_assignee_v1_hex',\n    'native_reread_after_status_v1_hex', 'native_reread_after_assignee_v1_hex'\n  ];\n  if (!plan || !Array.isArray(plan.baseline_hmac_requests) ||\n      plan.baseline_hmac_requests.length !== 4 ||\n      properties.some((property) => !/^[a-f0-9]{64}$/.test($json[property] || ''))) {\n    throw new Error('baseline_native_chain_invalid');\n  }\n  const baselineResults = plan.baseline_hmac_requests.map((request, index) => ({\n    purpose: request.purpose, key_version: request.key_version,\n    digest_hex: $json[properties[index]]\n  }));\n  return { json: { post_delay_material_ready: true, worker: $json.worker,\n    trusted_control: $json.trusted_control, message_plan: $json.message_plan,\n    message_hmac_results: $json.message_hmac_results,\n    baseline_hmac_results: baselineResults,\n    postgres_command: { brand_id: 'calapres', conversation_id: $json.worker.conversation_id,\n      expected_generation: $json.worker.generation },\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } };\n} catch (error) {\n  return { json: { post_delay_material_ready: false, worker: $json.worker,\n    stage_failure: __edgeFailure('build_generation_read', error),\n    cryptographic_verification_performed_in_code: false,\n    customer_egress_allowed: false } };\n}"
    },
    "position": [
      14140,
      -1000
    ]
  }
});

const generationReadReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Post Delay Material and Generation Read Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.post_delay_material_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      14400,
      -1000
    ]
  }
});

const postgresReadGeneration = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Edge Atomic 05 - read_generation",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_read_generation($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": webhookWorkerPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      14660,
      -1080
    ]
  }
});

const finalizePostDelay = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Finalize Post Delay Eligibility With Current Generation",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst material = $('Build Current Generation Read Command').first().json;\nconst resultSource = $input.first().json || {};\nconst result = resultSource.result && typeof resultSource.result === 'object'\n  ? resultSource.result : null;\ntry {\n  if (!material.post_delay_material_ready || !result || result.contract_verified !== true ||\n      result.operation !== 'read_generation' || result.status !== 'committed' ||\n      result.outcome !== 'generation_read' || result.error_code !== null || !result.value ||\n      !Number.isSafeInteger(result.value.generation) || result.value.generation < 1) {\n    throw new Error('generation_read_invalid');\n  }\n  const leaseCurrent = result.value.current === true &&\n    result.value.job_id === material.worker.job_id && result.value.state === 'retry_running';\n  const postDelay = __edgeStages.finalizePostDelay({\n    message_plan: material.message_plan,\n    message_hmac_results: material.message_hmac_results,\n    baseline_hmac_results: material.baseline_hmac_results,\n    gate_state: { current_generation: result.value.generation,\n      idempotency_consumed: !leaseCurrent,\n      brand_enabled: material.trusted_control.brand_enabled,\n      kill_switch: material.trusted_control.kill_switch },\n    evaluated_epoch_seconds: Math.floor(Date.now() / 1000)\n  });\n  return [{ json: { post_delay_ready: true, post_delay: postDelay,\n    worker: material.worker, trusted_control: material.trusted_control,\n    customer_egress_allowed: false } }];\n} catch (error) {\n  return [{ json: { post_delay_ready: false, worker: material.worker,\n    stage_failure: __edgeFailure('finalize_post_delay', error),\n    customer_egress_allowed: false } }];\n}"
    },
    "position": [
      14920,
      -1080
    ]
  }
});

const postDelayFinalized = ifElse({
  "version": 2.3,
  "config": {
    "name": "Post Delay Gate Finalized?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.post_delay_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      15180,
      -1080
    ]
  }
});

const postDelayEligible = ifElse({
  "version": 2.3,
  "config": {
    "name": "Post Delay Eligible for Core?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.post_delay.eligible_for_observation === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      15440,
      -1160
    ]
  }
});

const llmTrustGateClosed = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "LLM Trust Gate Closed - No Call",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nconst wrapper = $('Finalize Post Delay Eligibility With Current Generation').first().json;\nconst wait = wrapper.message_plan ? wrapper.message_plan.reread_plan.wait_state\n  : $('Prepare Worker Identifiers Only Reread State').first().json.wait_state;\nconst anchor = wrapper.post_delay.verified_anchor;\nreturn [{ json: {\n  schema_version: '1.0',\n  event: {\n    schema_version: '1.0', brand_id: 'calapres', account_id: wait.account_id,\n    inbox_id: wait.inbox_id, channel: wait.channel,\n    channel_capabilities: { supports_text: true, supports_attachments: true,\n      supports_public_reply: true },\n    conversation_id: wait.conversation_id, message_id: wait.anchor_message_id,\n    delivery_id: null, correlation_id: wait.correlation_id,\n    idempotency_key: wait.event_identity_fingerprint,\n    event_at: new Date().toISOString(), direction: 'inbound', visibility: 'public',\n    actor_type: 'contact', sender_ref: { kind: 'chatwoot_contact', id: 'verified_anchor' },\n    content: { kind: anchor.attachment_count > 0 ? 'mixed' : 'text',\n      text_present: typeof anchor.content === 'string' && anchor.content.length > 0,\n      attachment_count: anchor.attachment_count },\n    flags: { is_bot_echo: false, is_private_note: false }\n  },\n  runtime: { mode: 'observation', customer_egress_enabled: false, kill_switch: true,\n    model_call_enabled: false },\n  capabilities: { customer_lookup: 'disabled', order_lookup: 'disabled' },\n  context: { knowledge_version: wait.knowledge_version, knowledge_facts: [],\n    live_facts_status: 'not_requested', verified_live_facts: [] },\n  candidate: null\n} }];"
    },
    "position": [
      15700,
      -1240
    ]
  }
});

const callImmutableCore = node({
  "type": "n8n-nodes-base.executeWorkflow",
  "version": 1.3,
  "config": {
    "name": "Call Immutable Optix Core v1 - Observation No LLM",
    "parameters": {
      "mode": "once",
      "source": "database",
      "workflowId": {
        "__rl": true,
        "mode": "id",
        "value": "uCBXuRjlv8NyeikO",
        "cachedResultName": "Optix | Customer Service Core v1"
      },
      "options": {
        "waitForSubWorkflow": true
      }
    },
    "position": [
      15960,
      -1240
    ]
  }
});

const enforceObservationOnly = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Enforce Observation Only After Core",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nconst value = $input.first().json || {};\nconst safe = value.schema_version === '1.0' && value.brand_id === 'calapres' &&\n  value.customer_egress_allowed === false && ['no_action','escalate'].includes(value.decision);\nreturn [{ json: { schema_version: '1.0', brand_id: 'calapres',\n  decision: safe ? value.decision : 'no_action',\n  reason_code: safe && /^[a-z][a-z0-9_]{2,80}$/.test(value.reason_code || '')\n    ? value.reason_code : 'edge_v2_core_output_invalid',\n  outcome_class: safe && value.decision === 'escalate' ? 'owner_escalation' : 'observation_only',\n  model_call_executed: false, private_action_executed: false,\n  persistence_allowed: false, customer_egress_allowed: false\n} }];"
    },
    "position": [
      16220,
      -1240
    ]
  }
});

const buildCompletion = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Build Sanitized Observation Completion Command",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst observation = $('Enforce Observation Only After Core').first().json;\nconst worker = $('Finalize Post Delay Eligibility With Current Generation').first().json.worker;\nconst digest = __edgeDependencies.sha256Hex(\n  __edgeDependencies.utf8ToBytes(__edgeModule.exports.stableJson(observation)));\nconst escalation = observation.outcome_class === 'owner_escalation';\nconst incidentId = escalation ? 'inc_' + digest.slice(0, 40) : null;\nconst command = {\n  brand_id: 'calapres', claim_id: worker.business_claim_id, job_id: worker.job_id,\n  conversation_id: worker.conversation_id, expected_generation: worker.generation,\n  worker_id: worker.worker_id, lease_token: worker.lease_token,\n  observation_id: 'obs_' + digest.slice(0, 40), observation_digest: digest,\n  audit_id: 'aud_' + digest.slice(0, 40), outcome_class: observation.outcome_class,\n  reason_code: observation.reason_code, risk_level: escalation ? 'medium' : 'none',\n  risk_digest: escalation ? digest : null, incident_id: incidentId\n};\nreturn [{ json: { postgres_command: command, worker,\n  customer_egress_allowed: false } }];"
    },
    "position": [
      16480,
      -1240
    ]
  }
});

const postgresCompleteBusinessEvent = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Edge Atomic 03 - complete_business_event",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_complete_business_event($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": webhookWorkerPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      16740,
      -1240
    ]
  }
});

const interpretCompletion = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Interpret Atomic Observation Completion",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "\nconst source = $input.first().json || {};\nconst result = source.result && typeof source.result === 'object' ? source.result : null;\nconst done = result && result.contract_verified === true &&\n  result.operation === 'complete_business_event' && result.error_code === null &&\n  ((result.status === 'committed' && result.outcome === 'completed') ||\n   (result.status === 'duplicate_or_conflict' && result.outcome === 'duplicate_completed'));\nreturn [{ json: { completion_state: done ? 'done' : 'retry',\n  worker: $('Build Sanitized Observation Completion Command').first().json.worker,\n  customer_egress_allowed: false } }];"
    },
    "position": [
      17000,
      -1240
    ]
  }
});

const completionDone = ifElse({
  "version": 2.3,
  "config": {
    "name": "Observation Completion Durable?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.completion_state === \"done\" }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      17260,
      -1240
    ]
  }
});

const prepareTransition = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Safe Cancellation or Human Owned Transition",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst source = $('Finalize Post Delay Eligibility With Current Generation').first().json;\nconst worker = source.worker;\nconst reason = source.post_delay && typeof source.post_delay.cancellation_reason === 'string'\n  ? source.post_delay.cancellation_reason : 'fail_closed';\nconst human = ['conversation_changed','status_changed','assignee_changed','newer_inbound',\n  'human_intervention','private_note_present','newer_non_activity'].includes(reason);\nconst digest = __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes(\n  worker.job_id + ':' + worker.generation + ':' + reason));\nreturn [{ json: { postgres_command: { brand_id: 'calapres', job_id: worker.job_id,\n  conversation_id: worker.conversation_id, expected_generation: worker.generation,\n  from_state: 'retry_running', to_state: human ? 'human_owned' : 'cancelled',\n  transition_idempotency_key: 'transition_' + digest.slice(0, 48) },\n  customer_egress_allowed: false } }];"
    },
    "position": [
      15700,
      -960
    ]
  }
});

const postgresTransitionJob = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Edge Atomic 08 - transition_conversation_job",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_transition_conversation_job($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": webhookWorkerPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      15960,
      -960
    ]
  }
});

const prepareRetry = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Prepare Worker Lease CAS Retry",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": STAGED_BOOTSTRAP + "\n\nconst lease = $('Interpret Exclusive Worker Lease').first().json.worker;\nif (!lease) return [{ json: { retry_ready: false, customer_egress_allowed: false } }];\nconst digest = __edgeDependencies.sha256Hex(__edgeDependencies.utf8ToBytes(\n  lease.job_id + ':' + lease.generation + ':' + lease.worker_id + ':' + lease.attempt_count));\nreturn [{ json: { retry_ready: true, postgres_command: {\n  brand_id: 'calapres', job_id: lease.job_id, conversation_id: lease.conversation_id,\n  expected_generation: lease.generation,\n  retry_idempotency_key: 'retry_' + digest.slice(0, 48), max_attempts: 3,\n  safe_error_code: 'edge_observation_retry', delay_seconds: 30, retention_seconds: 7776000,\n  expected_worker_id: lease.worker_id, expected_lease_token: lease.lease_token\n}, customer_egress_allowed: false } }];"
    },
    "position": [
      15440,
      -520
    ]
  }
});

const retryReady = ifElse({
  "version": 2.3,
  "config": {
    "name": "Worker Retry Command Ready?",
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "leftValue": expr("{{ $json.retry_ready === true }}"),
            "rightValue": true,
            "operator": {
              "type": "boolean",
              "operation": "true",
              "singleValue": true
            }
          }
        ],
        "combinator": "and"
      }
    },
    "position": [
      15700,
      -520
    ]
  }
});

const postgresScheduleRetry = node({
  "type": "n8n-nodes-base.postgres",
  "version": 2.7,
  "config": {
    "name": "Postgres Edge Atomic 06 - schedule_conversation_retry",
    "parameters": {
      "resource": "database",
      "operation": "executeQuery",
      "query": "SELECT calapres_cs.atomic_schedule_conversation_retry($1::jsonb) AS result",
      "options": {
        "queryBatching": "single",
        "queryReplacement": expr("{{ [JSON.stringify($json.postgres_command)] }}"),
        "replaceEmptyStrings": false
      }
    },
    "credentials": {
      "postgres": webhookWorkerPostgresCredential
    },
    "onError": "continueRegularOutput",
    "position": [
      15960,
      -520
    ]
  }
});

const terminalSafe = node({
  "type": "n8n-nodes-base.code",
  "version": 2,
  "config": {
    "name": "Terminal Safe No Egress",
    "parameters": {
      "mode": "runOnceForAllItems",
      "language": "javaScript",
      "jsCode": "return [{ json: { terminal: true, customer_egress_allowed: false } }];"
    },
    "position": [
      17520,
      -400
    ]
  }
});

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
                          .to(reconFinalizeCandidate)
                          .to(reconRouteHmac01)
                          .to(reconRouteHmac02)
                          .to(reconRouteHmac03)
                          .to(reconRouteHmac04)
                          .to(reconFinalizeRoute)
                          .to(reconBaselineConversation)
                          .to(reconPrepareBaseline)
                          .to(reconBaselineStatus)
                          .to(reconBaselineAssignee)
                          .to(reconBuildRequestClaim)
                          .to(reconClaimRequest)
                          .to(reconInterpretRequest)
                          .to(reconBuildBusinessClaim)
                          .to(reconClaimBusiness)
                          .to(reconInterpretBusiness)
                          .to(reconBuildAdvance)
                          .to(reconAdvanceGeneration)
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
