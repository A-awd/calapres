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
const STAGED_BOOTSTRAP = "const __edgeModule = { exports: {} };\n'use strict';\n\n/*\n * Pure, credential-free stages for the Calapres Chatwoot Edge.\n *\n * Native n8n nodes own all effects:\n * - Webhook supplies exact raw bytes;\n * - Crypto supplies secret-keyed HMAC results;\n * - PostgreSQL supplies atomic result envelopes;\n * - HTTP Request supplies Chatwoot response envelopes.\n *\n * This module validates and binds those envelopes. It performs no network,\n * credential, database, filesystem, wait, workflow, model, or send action.\n */\n\nconst ACCOUNT_ID = 179973;\nconst BRAND_ID = 'calapres';\nconst INBOX_CHANNELS = Object.freeze({\n  128031: 'instagram',\n  128033: 'tiktok',\n  128058: 'whatsapp',\n  128326: 'email',\n});\nconst MAX_RAW_BODY_SIZE_BYTES = 1024 * 1024;\nconst MAX_AGE_SECONDS = 300;\nconst MAX_FUTURE_SKEW_SECONDS = 60;\nconst SCAN_PAGE_SIZE_LIMIT = 100;\nconst EVENT_IDENTITY_CANONICAL_FORMAT =\n  'json-minified-ordered:[schema_version,account_id,inbox_id,event,conversation_id,message_id]';\nconst DELAY_POLICY_VERSION = '2026-08-11-v1';\nconst DELAY_RANGES = Object.freeze({\n  instagram: Object.freeze({ minimum: 30, maximum: 75 }),\n  tiktok: Object.freeze({ minimum: 30, maximum: 75 }),\n  whatsapp: Object.freeze({ minimum: 30, maximum: 75 }),\n  email: Object.freeze({ minimum: 120, maximum: 300 }),\n});\nconst EVENT_KEY_VERSION = /^calapres-identity-hmac-v[1-9][0-9]*$/;\nconst BASELINE_KEY_VERSION = /^calapres-hmac-v[1-9][0-9]*$/;\nconst EVENT_TO_STORAGE_KEY_VERSION = Object.freeze({\n  'calapres-identity-hmac-v1': 'hmac-sha256-v1',\n});\nconst STORAGE_TO_EVENT_KEY_VERSION = Object.freeze({\n  'hmac-sha256-v1': 'calapres-identity-hmac-v1',\n});\nconst HEX_64 = /^[a-f0-9]{64}$/;\nconst SIGNATURE_HEADER = /^sha256=[a-f0-9]{64}$/;\nconst TIMESTAMP_HEADER = /^[0-9]{10}$/;\nconst POSITIVE_DECIMAL_TOKEN = /^[1-9][0-9]{0,15}$/;\nconst KNOWLEDGE_VERSION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$/;\nconst SAFE_ERROR_CODE = /^[a-z][a-z0-9_]{2,80}$/;\nconst STRICT_ISO_TIMESTAMP =\n  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;\nconst CONTENT_TYPE = /^application\\/json(?:\\s*;\\s*charset=(?:utf-8|utf8))?$/i;\nconst BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;\nconst ANCHOR_MESSAGE_FINGERPRINT_DOMAIN = 'calapres-message-anchor-v1:';\nconst CONVERSATION_FINGERPRINT_DOMAIN = 'calapres-conversation-v1:';\nconst MESSAGE_SET_FINGERPRINT_DOMAIN = 'calapres-chatwoot-message-set-v1:';\nconst STATUS_FINGERPRINT_DOMAIN = 'calapres-conversation-status-v1:';\nconst ASSIGNEE_FINGERPRINT_DOMAIN = 'calapres-conversation-assignee-v1:';\nconst PLAN_BINDING_DOMAIN = 'calapres-observation-stage-binding-v1:';\n\nconst WAIT_CARRIER_FIELD_ORDER = Object.freeze([\n  'schema_version',\n  'brand_id',\n  'account_id',\n  'inbox_id',\n  'channel',\n  'conversation_id',\n  'anchor_message_id',\n  'conversation_fingerprint',\n  'message_fingerprint',\n  'correlation_id',\n  'event_identity_key_version',\n  'event_identity_fingerprint',\n  'generation',\n  'baseline_fingerprint_key_version',\n  'baseline_status_fingerprint',\n  'baseline_assignee_fingerprint',\n  'delay_policy_version',\n  'delay_mode',\n  'delay_seconds',\n  'not_before',\n  'knowledge_version',\n  'fixture_ref',\n  'customer_egress_allowed',\n]);\nconst WAIT_CARRIER_EXACT_KEYS = new Set([...WAIT_CARRIER_FIELD_ORDER, 'wait_state_fingerprint']);\n\nconst PARITY_MANIFEST = Object.freeze({\n  account_id: ACCOUNT_ID,\n  inbox_channels: INBOX_CHANNELS,\n  max_raw_body_size_bytes: MAX_RAW_BODY_SIZE_BYTES,\n  max_age_seconds: MAX_AGE_SECONDS,\n  max_future_skew_seconds: MAX_FUTURE_SKEW_SECONDS,\n  scan_page_size_limit: SCAN_PAGE_SIZE_LIMIT,\n  event_identity_canonical_format: EVENT_IDENTITY_CANONICAL_FORMAT,\n  event_to_storage_key_version: EVENT_TO_STORAGE_KEY_VERSION,\n  wait_carrier_field_order: WAIT_CARRIER_FIELD_ORDER,\n});\n// SHA-256 of stableJson(PARITY_MANIFEST). Tests recompute this and compare the\n// selected exported constants with chatwoot-observation-runtime.js.\nconst PARITY_MANIFEST_SHA256 = 'dbb11ff31880ef59bb740bbc51aa61ed1d74ade8594c66bbdc47766eebdc2418';\n\nclass FailClosedError extends Error {\n  constructor(reasonCode) {\n    super(reasonCode);\n    this.name = 'FailClosedError';\n    this.reasonCode = reasonCode;\n  }\n}\n\nfunction fail(reasonCode) {\n  throw new FailClosedError(reasonCode);\n}\n\nfunction plainObject(value) {\n  return value !== null && typeof value === 'object' && !Array.isArray(value);\n}\n\nfunction exactObject(value, fields, reasonCode) {\n  if (!plainObject(value)) fail(reasonCode);\n  const expected = fields instanceof Set ? fields : new Set(fields);\n  const keys = Object.keys(value);\n  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) fail(reasonCode);\n  return value;\n}\n\nfunction hasOwn(value, field) {\n  return plainObject(value) && Object.prototype.hasOwnProperty.call(value, field);\n}\n\nfunction stableJson(value) {\n  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';\n  if (plainObject(value)) {\n    return '{' + Object.keys(value).sort().map((key) =>\n      JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';\n  }\n  return JSON.stringify(value);\n}\n\nfunction orderedJson(value, fieldOrder) {\n  const ordered = {};\n  for (const field of fieldOrder) ordered[field] = value[field];\n  return JSON.stringify(ordered);\n}\n\nfunction dependencies(value) {\n  if (!plainObject(value) ||\n      typeof value.base64ToBytes !== 'function' ||\n      typeof value.bytesToBase64 !== 'function' ||\n      typeof value.utf8ToBytes !== 'function' ||\n      typeof value.bytesToUtf8Fatal !== 'function' ||\n      typeof value.sha256Hex !== 'function' ||\n      typeof value.timingSafeEqualHex !== 'function') {\n    fail('stage_dependencies_unavailable');\n  }\n  return value;\n}\n\nfunction bytes(value) {\n  if (!(value instanceof Uint8Array)) fail('stage_bytes_invalid');\n  return value;\n}\n\nfunction sha256Hex(deps, value) {\n  const digest = deps.sha256Hex(bytes(value));\n  if (!HEX_64.test(digest || '')) fail('stage_sha256_output_invalid');\n  return digest;\n}\n\nfunction sha256Text(deps, value) {\n  if (typeof value !== 'string') fail('stage_sha256_text_invalid');\n  return sha256Hex(deps, deps.utf8ToBytes(value));\n}\n\nfunction binding(deps, value) {\n  return sha256Text(deps, PLAN_BINDING_DOMAIN + stableJson(value));\n}\n\nfunction decodeCanonicalBase64(deps, value, reasonCode) {\n  if (typeof value !== 'string' || value.length % 4 !== 0 || !BASE64.test(value)) fail(reasonCode);\n  let decoded;\n  try {\n    decoded = bytes(deps.base64ToBytes(value));\n  } catch (_error) {\n    fail(reasonCode);\n  }\n  if (deps.bytesToBase64(decoded) !== value) fail(reasonCode);\n  return decoded;\n}\n\nfunction concatBytes(left, right) {\n  const output = new Uint8Array(left.length + right.length);\n  output.set(left, 0);\n  output.set(right, left.length);\n  return output;\n}\n\nfunction isoFromEpochSeconds(value) {\n  if (!Number.isSafeInteger(value) || value < 0) fail('clock_invalid');\n  const result = new Date(value * 1000);\n  if (Number.isNaN(result.getTime())) fail('clock_invalid');\n  return result.toISOString();\n}\n\nfunction parseIso(value, reasonCode) {\n  if (typeof value !== 'string' || !STRICT_ISO_TIMESTAMP.test(value)) fail(reasonCode);\n  const parsed = Date.parse(value);\n  if (!Number.isFinite(parsed)) fail(reasonCode);\n  return parsed;\n}\n\nfunction positiveToken(value, reasonCode) {\n  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);\n  if (typeof value !== 'string' || !POSITIVE_DECIMAL_TOKEN.test(value) ||\n      !Number.isSafeInteger(Number(value)) || String(Number(value)) !== value) fail(reasonCode);\n  return value;\n}\n\nfunction eventKeyVersionToStorage(value) {\n  if (!Object.prototype.hasOwnProperty.call(EVENT_TO_STORAGE_KEY_VERSION, value)) {\n    fail('storage_key_version_unknown');\n  }\n  return EVENT_TO_STORAGE_KEY_VERSION[value];\n}\n\nfunction storageKeyVersionToEvent(value) {\n  if (!Object.prototype.hasOwnProperty.call(STORAGE_TO_EVENT_KEY_VERSION, value)) {\n    fail('event_key_version_unknown');\n  }\n  return STORAGE_TO_EVENT_KEY_VERSION[value];\n}\n\nfunction integerId(value, reasonCode) {\n  if (!Number.isSafeInteger(value)) fail(reasonCode);\n  return value;\n}\n\nfunction normalizedEventTime(value) {\n  if (Number.isSafeInteger(value) && value >= 0) return isoFromEpochSeconds(value);\n  if (typeof value !== 'string') fail('event_time_invalid');\n  const documented = value.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) UTC$/);\n  const normalized = documented ? documented[1] + 'T' + documented[2] + 'Z' : value;\n  const parsed = parseIso(normalized, 'event_time_invalid');\n  return new Date(parsed).toISOString();\n}\n\nfunction deterministicDelay(seed, minimum, maximum) {\n  let hash = 2166136261;\n  for (const character of seed) {\n    hash ^= character.charCodeAt(0);\n    hash = Math.imul(hash, 16777619) >>> 0;\n  }\n  return minimum + (hash % (maximum - minimum + 1));\n}\n\nfunction response(status, responseCode, reasonCode, transient = null) {\n  return Object.freeze({\n    schema_version: '1.0',\n    kind: 'chatwoot_signed_ingress_preflight_v1',\n    status,\n    response_code: responseCode,\n    reason_code: reasonCode,\n    transient,\n    customer_egress_allowed: false,\n  });\n}\n\nfunction validatePreflight(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'transient',\n    'customer_egress_allowed',\n  ], 'preflight_envelope_invalid');\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_signed_ingress_preflight_v1' ||\n      value.customer_egress_allowed !== false) fail('preflight_envelope_invalid');\n  if (value.status !== 'eligible') fail('preflight_not_eligible');\n  if (value.response_code !== 0 || value.reason_code !== null) fail('preflight_envelope_invalid');\n  exactObject(value.transient, [\n    'timestamp', 'signature_header', 'supplied_digest_hex', 'raw_body_base64',\n    'raw_body_size_bytes', 'body_sha256', 'signed_payload_base64', 'received_epoch_seconds',\n    'received_at', 'delivery_id_fingerprint', 'preflight_binding_sha256',\n  ], 'preflight_transient_invalid');\n  const copy = { ...value.transient };\n  delete copy.preflight_binding_sha256;\n  if (binding(deps, copy) !== value.transient.preflight_binding_sha256) fail('preflight_binding_mismatch');\n  return value.transient;\n}\n\nfunction prepareSignedIngress(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, [\n    'schema_version', 'content_type', 'timestamp_header', 'signature_header',\n    'delivery_header', 'raw_body_base64', 'received_epoch_seconds',\n  ], 'webhook_projection_invalid');\n  if (input.schema_version !== '1.0') fail('webhook_projection_invalid');\n  if (typeof input.content_type !== 'string' || !CONTENT_TYPE.test(input.content_type)) {\n    return response('rejected', 400, 'content_type_invalid');\n  }\n  let raw;\n  try {\n    raw = decodeCanonicalBase64(deps, input.raw_body_base64, 'raw_body_base64_invalid');\n  } catch (error) {\n    if (error instanceof FailClosedError) return response('rejected', 400, error.reasonCode);\n    throw error;\n  }\n  if (raw.length === 0) return response('rejected', 400, 'payload_empty');\n  if (raw.length > MAX_RAW_BODY_SIZE_BYTES) return response('rejected', 413, 'payload_too_large');\n  if (!Number.isSafeInteger(input.received_epoch_seconds) || input.received_epoch_seconds < 0) {\n    return response('rejected', 400, 'clock_invalid');\n  }\n  if (typeof input.timestamp_header !== 'string' || !TIMESTAMP_HEADER.test(input.timestamp_header)) {\n    return response('rejected', 401, 'timestamp_malformed');\n  }\n  const timestamp = Number(input.timestamp_header);\n  const age = input.received_epoch_seconds - timestamp;\n  if (age > MAX_AGE_SECONDS) return response('rejected', 401, 'timestamp_stale');\n  if (age < -MAX_FUTURE_SKEW_SECONDS) return response('rejected', 401, 'timestamp_future');\n  if (typeof input.signature_header !== 'string' || !SIGNATURE_HEADER.test(input.signature_header)) {\n    return response('rejected', 401, 'signature_malformed');\n  }\n  if (input.delivery_header !== null &&\n      (typeof input.delivery_header !== 'string' || input.delivery_header.length < 1 ||\n       input.delivery_header.length > 512)) {\n    return response('rejected', 400, 'delivery_header_invalid');\n  }\n  const bodySha256 = sha256Hex(deps, raw);\n  const signedBytes = concatBytes(deps.utf8ToBytes(input.timestamp_header + '.'), raw);\n  const projected = {\n    timestamp: input.timestamp_header,\n    signature_header: input.signature_header,\n    supplied_digest_hex: input.signature_header.slice('sha256='.length),\n    raw_body_base64: input.raw_body_base64,\n    raw_body_size_bytes: raw.length,\n    body_sha256: bodySha256,\n    signed_payload_base64: deps.bytesToBase64(signedBytes),\n    received_epoch_seconds: input.received_epoch_seconds,\n    received_at: isoFromEpochSeconds(input.received_epoch_seconds),\n    delivery_id_fingerprint: input.delivery_header === null\n      ? null\n      : sha256Text(deps, input.delivery_header),\n  };\n  projected.preflight_binding_sha256 = binding(deps, projected);\n  return response('eligible', 0, null, Object.freeze(projected));\n}\n\nfunction finalizeSignedHmac(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['preflight', 'computed_hmac_hex', 'compared_epoch_seconds'], 'hmac_result_input_invalid');\n  const preflight = validatePreflight(input.preflight, deps);\n  if (!HEX_64.test(input.computed_hmac_hex || '') ||\n      !Number.isSafeInteger(input.compared_epoch_seconds) || input.compared_epoch_seconds < 0) {\n    fail('hmac_result_input_invalid');\n  }\n  if (input.compared_epoch_seconds - preflight.received_epoch_seconds > MAX_AGE_SECONDS ||\n      input.compared_epoch_seconds < preflight.received_epoch_seconds) {\n    return Object.freeze({\n      schema_version: '1.0', kind: 'chatwoot_signed_hmac_gate_v1', status: 'fail_closed',\n      response_code: 401, reason_code: 'hmac_comparison_stale', raw_binding: null,\n      replay_identity: null, customer_egress_allowed: false,\n    });\n  }\n  if (deps.timingSafeEqualHex(input.computed_hmac_hex, preflight.supplied_digest_hex) !== true) {\n    return Object.freeze({\n      schema_version: '1.0', kind: 'chatwoot_signed_hmac_gate_v1', status: 'fail_closed',\n      response_code: 401, reason_code: 'signature_mismatch', raw_binding: null,\n      replay_identity: null, customer_egress_allowed: false,\n    });\n  }\n  const replayFingerprint = sha256Text(\n    deps,\n    preflight.signature_header + ':' + preflight.timestamp + ':' + preflight.body_sha256,\n  );\n  const rawBinding = {\n    timestamp: preflight.timestamp,\n    raw_body_base64: preflight.raw_body_base64,\n    raw_body_size_bytes: preflight.raw_body_size_bytes,\n    body_sha256: preflight.body_sha256,\n    preflight_binding_sha256: preflight.preflight_binding_sha256,\n  };\n  rawBinding.raw_binding_sha256 = binding(deps, rawBinding);\n  return Object.freeze({\n    schema_version: '1.0',\n    kind: 'chatwoot_signed_hmac_gate_v1',\n    status: 'verified',\n    response_code: 0,\n    reason_code: null,\n    raw_binding: Object.freeze(rawBinding),\n    replay_identity: Object.freeze({\n      replay_key_fingerprint: replayFingerprint,\n      received_at: preflight.received_at,\n      expires_at: isoFromEpochSeconds(preflight.received_epoch_seconds + MAX_AGE_SECONDS + MAX_FUTURE_SKEW_SECONDS),\n    }),\n    customer_egress_allowed: false,\n  });\n}\n\nfunction canonicalEventTuple(payload) {\n  if (!plainObject(payload)) fail('payload_not_object');\n  for (const field of ['account', 'inbox', 'conversation']) {\n    if (hasOwn(payload, field) && !plainObject(payload[field])) fail(field + '_container_invalid');\n  }\n  if (hasOwn(payload, 'account') && hasOwn(payload, 'account_id')) fail('account_id_alias_conflict');\n  if (hasOwn(payload, 'inbox') && hasOwn(payload, 'inbox_id')) fail('inbox_id_alias_conflict');\n  if (hasOwn(payload, 'conversation') && hasOwn(payload, 'conversation_id')) fail('conversation_id_alias_conflict');\n  if (hasOwn(payload, 'id') && hasOwn(payload, 'message_id')) fail('message_id_alias_conflict');\n  const accountId = integerId(hasOwn(payload, 'account') ? payload.account.id : payload.account_id,\n    'account_id_invalid');\n  const inboxId = integerId(hasOwn(payload, 'inbox') ? payload.inbox.id : payload.inbox_id,\n    'inbox_id_invalid');\n  if (accountId !== ACCOUNT_ID) fail('account_not_allowlisted');\n  if (!INBOX_CHANNELS[inboxId]) fail('inbox_not_allowlisted');\n  if (hasOwn(payload, 'conversation') && hasOwn(payload.conversation, 'account_id') &&\n      payload.conversation.account_id !== accountId) fail('account_mismatch');\n  if (hasOwn(payload, 'conversation') && hasOwn(payload.conversation, 'inbox_id') &&\n      payload.conversation.inbox_id !== inboxId) fail('inbox_mismatch');\n  if (payload.event !== 'message_created') fail('event_not_supported');\n  return Object.freeze({\n    schema_version: '1.0',\n    account_id: accountId,\n    inbox_id: inboxId,\n    event: 'message_created',\n    conversation_id: positiveToken(\n      hasOwn(payload, 'conversation') ? payload.conversation.id : payload.conversation_id,\n      'conversation_id_invalid',\n    ),\n    message_id: positiveToken(hasOwn(payload, 'id') ? payload.id : payload.message_id,\n      'message_id_invalid'),\n  });\n}\n\nfunction validateReplayGate(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'raw_binding',\n    'replay_key_fingerprint', 'customer_egress_allowed',\n  ], 'replay_gate_invalid');\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_request_replay_gate_v1' ||\n      value.status !== 'proceed_parse' || value.response_code !== 0 || value.reason_code !== null ||\n      value.customer_egress_allowed !== false || !HEX_64.test(value.replay_key_fingerprint || '')) {\n    fail('verified_replay_required');\n  }\n  const raw = value.raw_binding;\n  exactObject(raw, [\n    'timestamp', 'raw_body_base64', 'raw_body_size_bytes', 'body_sha256',\n    'preflight_binding_sha256', 'raw_binding_sha256',\n  ], 'raw_binding_invalid');\n  const copy = { ...raw };\n  delete copy.raw_binding_sha256;\n  if (binding(deps, copy) !== raw.raw_binding_sha256) fail('raw_binding_mismatch');\n  return raw;\n}\n\nfunction prepareEventIdentity(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['replay_gate', 'active_key_version', 'retained_key_versions'],\n    'event_identity_input_invalid');\n  const rawBinding = validateReplayGate(input.replay_gate, deps);\n  if (!EVENT_KEY_VERSION.test(input.active_key_version || '') ||\n      !Array.isArray(input.retained_key_versions) || input.retained_key_versions.length > 8 ||\n      input.retained_key_versions.some((value) => !EVENT_KEY_VERSION.test(value || '')) ||\n      new Set([input.active_key_version, ...input.retained_key_versions]).size !==\n        input.retained_key_versions.length + 1) fail('event_keyring_invalid');\n  for (const keyVersion of [input.active_key_version, ...input.retained_key_versions]) {\n    eventKeyVersionToStorage(keyVersion);\n  }\n  const raw = decodeCanonicalBase64(deps, rawBinding.raw_body_base64, 'raw_body_base64_invalid');\n  if (raw.length !== rawBinding.raw_body_size_bytes ||\n      sha256Hex(deps, raw) !== rawBinding.body_sha256) fail('verified_raw_body_mismatch');\n  let payload;\n  try {\n    payload = JSON.parse(deps.bytesToUtf8Fatal(raw));\n  } catch (_error) {\n    fail('verified_payload_json_invalid');\n  }\n  const tuple = canonicalEventTuple(payload);\n  const sender = plainObject(payload.sender) ? payload.sender : null;\n  const senderId = sender && (typeof sender.id === 'string' || Number.isSafeInteger(sender.id))\n    ? String(sender.id) : null;\n  const senderType = sender && typeof sender.type === 'string' ? sender.type.toLowerCase() : null;\n  if (!(payload.message_type === 'incoming' || payload.message_type === 0)) fail('message_not_inbound');\n  if (payload.private === true) fail('private_note_rejected');\n  if (senderType === 'bot' || senderType === 'agent_bot') fail('bot_echo_rejected');\n  if (!senderId || senderId.length > 200) fail('sender_ref_missing');\n  const eventAt = normalizedEventTime(payload.created_at);\n  if (hasOwn(payload, 'attachments') && !Array.isArray(payload.attachments)) fail('attachments_invalid');\n  const attachmentCount = Array.isArray(payload.attachments) ? payload.attachments.length : 0;\n  if (attachmentCount > 32) fail('attachments_excessive');\n  const textPresent = typeof payload.content === 'string' && payload.content.trim().length > 0;\n  const contentKind = textPresent && attachmentCount > 0 ? 'mixed'\n    : attachmentCount > 0 ? 'media' : textPresent ? 'text' : 'unsupported';\n  const route = {\n    brand_id: BRAND_ID,\n    account_id: tuple.account_id,\n    inbox_id: tuple.inbox_id,\n    channel: INBOX_CHANNELS[tuple.inbox_id],\n    conversation_id: tuple.conversation_id,\n    message_id: tuple.message_id,\n    event_at: eventAt,\n    content_kind: contentKind,\n    text_present: textPresent,\n    attachment_count: attachmentCount,\n  };\n  const keyVersions = [input.active_key_version, ...input.retained_key_versions];\n  const hmacRequests = keyVersions.map((keyVersion) => Object.freeze({\n    purpose: 'event_identity',\n    key_version: keyVersion,\n    algorithm: 'hmac-sha256',\n    encoding: 'hex',\n    material_utf8: JSON.stringify(tuple),\n  }));\n  const planCore = {\n    schema_version: '1.0',\n    kind: 'chatwoot_event_identity_plan_v1',\n    route,\n    canonical_tuple: tuple,\n    active_key_version: input.active_key_version,\n    retained_key_versions: [...input.retained_key_versions],\n    hmac_requests: hmacRequests,\n    replay_key_fingerprint: input.replay_gate.replay_key_fingerprint,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...planCore, plan_binding_sha256: binding(deps, planCore) });\n}\n\nfunction validateEventPlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'route', 'canonical_tuple', 'active_key_version',\n    'retained_key_versions', 'hmac_requests', 'replay_key_fingerprint',\n    'customer_egress_allowed', 'plan_binding_sha256',\n  ], 'event_identity_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_event_identity_plan_v1' ||\n      value.customer_egress_allowed !== false || !HEX_64.test(value.replay_key_fingerprint || '') ||\n      binding(deps, core) !== value.plan_binding_sha256) fail('event_identity_plan_invalid');\n  if (!EVENT_KEY_VERSION.test(value.active_key_version || '') ||\n      !Array.isArray(value.retained_key_versions) || !Array.isArray(value.hmac_requests)) {\n    fail('event_identity_plan_invalid');\n  }\n  return value;\n}\n\nfunction hmacResults(value, expectedRequests, reasonCode) {\n  if (!Array.isArray(value) || value.length !== expectedRequests.length) fail(reasonCode);\n  const expected = new Map(expectedRequests.map((request) =>\n    [request.purpose + ':' + request.key_version, request]));\n  const actual = new Map();\n  for (const result of value) {\n    exactObject(result, ['purpose', 'key_version', 'digest_hex'], reasonCode);\n    const key = result.purpose + ':' + result.key_version;\n    if (!expected.has(key) || actual.has(key) || !HEX_64.test(result.digest_hex || '')) fail(reasonCode);\n    actual.set(key, result.digest_hex);\n  }\n  if (actual.size !== expected.size) fail(reasonCode);\n  return actual;\n}\n\nfunction finalizeEventIdentity(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['event_plan', 'hmac_results'], 'event_identity_result_input_invalid');\n  const plan = validateEventPlan(input.event_plan, deps);\n  const results = hmacResults(input.hmac_results, plan.hmac_requests, 'event_identity_hmac_results_invalid');\n  const fingerprints = {};\n  for (const request of plan.hmac_requests) {\n    fingerprints[request.key_version] = results.get(request.purpose + ':' + request.key_version);\n  }\n  const routeRequests = [];\n  for (const keyVersion of [plan.active_key_version, ...plan.retained_key_versions]) {\n    const eventFingerprint = fingerprints[keyVersion];\n    const messageCanonical = {\n      schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.route.account_id,\n      inbox_id: plan.route.inbox_id, conversation_id: plan.route.conversation_id,\n      message_id: plan.route.message_id, direction: 'inbound', visibility: 'public',\n      event_identity_key_version: keyVersion, event_identity_fingerprint: eventFingerprint,\n    };\n    const conversationCanonical = {\n      schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.route.account_id,\n      inbox_id: plan.route.inbox_id, conversation_id: plan.route.conversation_id,\n      event_identity_key_version: keyVersion,\n    };\n    routeRequests.push(Object.freeze({\n      purpose: 'message_anchor', key_version: keyVersion, algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(messageCanonical),\n    }));\n    routeRequests.push(Object.freeze({\n      purpose: 'conversation', key_version: keyVersion, algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: CONVERSATION_FINGERPRINT_DOMAIN + JSON.stringify(conversationCanonical),\n    }));\n  }\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_event_identity_final_v1',\n    route: plan.route, canonical_tuple: plan.canonical_tuple,\n    active_key_version: plan.active_key_version,\n    retained_key_versions: plan.retained_key_versions,\n    event_identity_fingerprints: fingerprints,\n    route_hmac_requests: routeRequests,\n    replay_key_fingerprint: plan.replay_key_fingerprint,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, identity_binding_sha256: binding(deps, core) });\n}\n\nfunction validateEventIdentity(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'route', 'canonical_tuple', 'active_key_version',\n    'retained_key_versions', 'event_identity_fingerprints', 'route_hmac_requests',\n    'replay_key_fingerprint', 'customer_egress_allowed', 'identity_binding_sha256',\n  ], 'event_identity_final_invalid');\n  const core = { ...value };\n  delete core.identity_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_event_identity_final_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.identity_binding_sha256 ||\n      !Array.isArray(value.route_hmac_requests)) fail('event_identity_final_invalid');\n  return value;\n}\n\nfunction finalizeRouteFingerprints(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['event_identity', 'hmac_results'], 'route_fingerprint_input_invalid');\n  const identity = validateEventIdentity(input.event_identity, deps);\n  const results = hmacResults(input.hmac_results, identity.route_hmac_requests,\n    'route_fingerprint_hmac_results_invalid');\n  const messageFingerprints = {};\n  const conversationFingerprints = {};\n  for (const version of [identity.active_key_version, ...identity.retained_key_versions]) {\n    messageFingerprints[version] = results.get('message_anchor:' + version);\n    conversationFingerprints[version] = results.get('conversation:' + version);\n  }\n  const delayRange = DELAY_RANGES[identity.route.channel];\n  const seed = [BRAND_ID, identity.route.account_id, identity.route.inbox_id,\n    identity.route.conversation_id, identity.route.message_id].join(':');\n  const delaySeconds = deterministicDelay(seed, delayRange.minimum, delayRange.maximum);\n  const notBefore = new Date(parseIso(identity.route.event_at, 'event_time_invalid') + delaySeconds * 1000)\n    .toISOString();\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_route_identity_v1',\n    brand_id: BRAND_ID, account_id: identity.route.account_id, inbox_id: identity.route.inbox_id,\n    channel: identity.route.channel, conversation_id: identity.route.conversation_id,\n    message_id: identity.route.message_id, event_at: identity.route.event_at,\n    content_kind: identity.route.content_kind, text_present: identity.route.text_present,\n    attachment_count: identity.route.attachment_count,\n    correlation_id: 'calapres:' + identity.route.conversation_id + ':' + identity.route.message_id,\n    active_key_version: identity.active_key_version,\n    retained_key_versions: identity.retained_key_versions,\n    storage_key_versions: Object.freeze({\n      active: eventKeyVersionToStorage(identity.active_key_version),\n      retained: Object.freeze(identity.retained_key_versions.map((version) => Object.freeze({\n        event_key_version: version,\n        storage_key_version: eventKeyVersionToStorage(version),\n      }))),\n    }),\n    event_identity_fingerprints: identity.event_identity_fingerprints,\n    message_fingerprints: messageFingerprints,\n    conversation_fingerprints: conversationFingerprints,\n    replay_key_fingerprint: identity.replay_key_fingerprint,\n    delay_policy_version: DELAY_POLICY_VERSION, delay_seconds: delaySeconds, not_before: notBefore,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, route_binding_sha256: binding(deps, core) });\n}\n\nfunction httpEnvelope(value) {\n  exactObject(value, ['status_code', 'body', 'error_code'], 'http_envelope_invalid');\n  if (value.status_code !== null &&\n      (!Number.isSafeInteger(value.status_code) || value.status_code < 100 || value.status_code > 599)) {\n    fail('http_envelope_invalid');\n  }\n  if (value.status_code === null) {\n    if (value.body !== null || typeof value.error_code !== 'string' || !SAFE_ERROR_CODE.test(value.error_code)) {\n      fail('http_envelope_invalid');\n    }\n  } else if (value.error_code !== null || (value.body !== null && !plainObject(value.body))) {\n    fail('http_envelope_invalid');\n  }\n  return value;\n}\n\nfunction conversationSnapshot(envelope, expected) {\n  const http = httpEnvelope(envelope);\n  if (http.status_code !== 200 || !plainObject(http.body)) fail('conversation_read_unavailable');\n  const body = http.body;\n  const accountId = body.account_id;\n  const inboxId = hasOwn(body, 'inbox_id') ? body.inbox_id\n    : plainObject(body.inbox) ? body.inbox.id : null;\n  const conversationId = positiveToken(body.id, 'conversation_route_invalid');\n  if (accountId !== expected.account_id || inboxId !== expected.inbox_id ||\n      conversationId !== expected.conversation_id ||\n      !['open', 'resolved', 'pending', 'snoozed'].includes(body.status)) fail('conversation_route_invalid');\n  const candidates = [];\n  const add = (container, field) => {\n    if (!plainObject(container) || !hasOwn(container, field)) return true;\n    const value = container[field];\n    if (field === 'assignee_id') { candidates.push(value); return true; }\n    if (value === null) { candidates.push(null); return true; }\n    if (!plainObject(value) || !hasOwn(value, 'id')) return false;\n    if (hasOwn(value, 'account_id') && value.account_id !== expected.account_id) return false;\n    candidates.push(value.id);\n    return true;\n  };\n  if (!add(body, 'assignee_id') || !add(body, 'assignee') || !add(body.meta, 'assignee') ||\n      candidates.length === 0) fail('conversation_assignee_invalid');\n  for (const candidate of candidates) {\n    if (candidate !== null && (!Number.isSafeInteger(candidate) || candidate < 1)) {\n      fail('conversation_assignee_invalid');\n    }\n  }\n  if (candidates.some((candidate) => candidate !== candidates[0])) fail('conversation_assignee_invalid');\n  return Object.freeze({ status: body.status, assignee_id: candidates[0] });\n}\n\nfunction validateIngressCommit(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'status', 'response_code', 'reason_code', 'committed',\n    'customer_egress_allowed',\n  ], 'ingress_commit_invalid');\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_ingress_commit_v1' ||\n      value.status !== 'committed' || value.response_code !== 204 || value.reason_code !== null ||\n      value.customer_egress_allowed !== false) fail('ingress_commit_required');\n  exactObject(value.committed, [\n    'brand_id', 'account_id', 'inbox_id', 'channel', 'conversation_id', 'anchor_message_id',\n    'conversation_fingerprint', 'message_fingerprint', 'correlation_id',\n    'event_identity_key_version', 'event_identity_fingerprint', 'generation',\n    'delay_policy_version', 'delay_seconds', 'not_before', 'knowledge_version',\n    'commit_binding_sha256',\n  ], 'ingress_commit_invalid');\n  const core = { ...value.committed };\n  delete core.commit_binding_sha256;\n  if (binding(deps, core) !== value.committed.commit_binding_sha256) fail('ingress_commit_binding_mismatch');\n  return value.committed;\n}\n\nfunction baselineMaterial(commit, keyVersion, kind, value) {\n  const canonical = {\n    schema_version: '1.0', brand_id: BRAND_ID, account_id: commit.account_id,\n    inbox_id: commit.inbox_id, conversation_id: commit.conversation_id,\n  };\n  if (kind === 'status') canonical.status = value;\n  else canonical.assignee_id = value;\n  return (kind === 'status' ? STATUS_FINGERPRINT_DOMAIN : ASSIGNEE_FINGERPRINT_DOMAIN) +\n    JSON.stringify(canonical);\n}\n\nfunction prepareBaseline(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['ingress_commit', 'conversation_http', 'baseline_key_version'],\n    'baseline_input_invalid');\n  const commit = validateIngressCommit(input.ingress_commit, deps);\n  if (!BASELINE_KEY_VERSION.test(input.baseline_key_version || '')) fail('baseline_key_version_invalid');\n  const snapshot = conversationSnapshot(input.conversation_http, commit);\n  const requests = [\n    Object.freeze({ purpose: 'baseline_status', key_version: input.baseline_key_version,\n      algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: baselineMaterial(commit, input.baseline_key_version, 'status', snapshot.status) }),\n    Object.freeze({ purpose: 'baseline_assignee', key_version: input.baseline_key_version,\n      algorithm: 'hmac-sha256', encoding: 'hex',\n      material_utf8: baselineMaterial(commit, input.baseline_key_version, 'assignee', snapshot.assignee_id) }),\n  ];\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_baseline_plan_v1', commit,\n    baseline_key_version: input.baseline_key_version, hmac_requests: requests,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });\n}\n\nfunction validateBaselinePlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'commit', 'baseline_key_version', 'hmac_requests',\n    'customer_egress_allowed', 'plan_binding_sha256',\n  ], 'baseline_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_baseline_plan_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||\n      !BASELINE_KEY_VERSION.test(value.baseline_key_version || '') || !Array.isArray(value.hmac_requests)) {\n    fail('baseline_plan_invalid');\n  }\n  return value;\n}\n\nfunction validateWaitState(value, deps) {\n  exactObject(value, WAIT_CARRIER_EXACT_KEYS, 'wait_state_shape_invalid');\n  if (value.schema_version !== '1.0' || value.brand_id !== BRAND_ID || value.account_id !== ACCOUNT_ID ||\n      INBOX_CHANNELS[value.inbox_id] !== value.channel || value.customer_egress_allowed !== false ||\n      value.fixture_ref !== null || value.delay_mode !== 'live_observation' ||\n      value.delay_policy_version !== DELAY_POLICY_VERSION ||\n      !EVENT_KEY_VERSION.test(value.event_identity_key_version || '') ||\n      !BASELINE_KEY_VERSION.test(value.baseline_fingerprint_key_version || '') ||\n      !KNOWLEDGE_VERSION.test(value.knowledge_version || '') ||\n      !Number.isSafeInteger(value.generation) || value.generation < 1) fail('wait_state_invalid');\n  positiveToken(value.conversation_id, 'wait_state_invalid');\n  positiveToken(value.anchor_message_id, 'wait_state_invalid');\n  for (const field of [\n    'conversation_fingerprint', 'message_fingerprint', 'event_identity_fingerprint',\n    'baseline_status_fingerprint', 'baseline_assignee_fingerprint', 'wait_state_fingerprint',\n  ]) if (!HEX_64.test(value[field] || '')) fail('wait_state_invalid');\n  parseIso(value.not_before, 'wait_state_invalid');\n  const core = { ...value };\n  delete core.wait_state_fingerprint;\n  if (sha256Text(deps, orderedJson(core, WAIT_CARRIER_FIELD_ORDER)) !== value.wait_state_fingerprint) {\n    fail('wait_state_fingerprint_mismatch');\n  }\n  return value;\n}\n\nfunction finalizeWaitState(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['baseline_plan', 'hmac_results'], 'wait_state_input_invalid');\n  const plan = validateBaselinePlan(input.baseline_plan, deps);\n  const results = hmacResults(input.hmac_results, plan.hmac_requests, 'baseline_hmac_results_invalid');\n  const commit = plan.commit;\n  const wait = {\n    schema_version: '1.0', brand_id: BRAND_ID, account_id: commit.account_id,\n    inbox_id: commit.inbox_id, channel: commit.channel, conversation_id: commit.conversation_id,\n    anchor_message_id: commit.anchor_message_id,\n    conversation_fingerprint: commit.conversation_fingerprint,\n    message_fingerprint: commit.message_fingerprint, correlation_id: commit.correlation_id,\n    event_identity_key_version: commit.event_identity_key_version,\n    event_identity_fingerprint: commit.event_identity_fingerprint, generation: commit.generation,\n    baseline_fingerprint_key_version: plan.baseline_key_version,\n    baseline_status_fingerprint: results.get('baseline_status:' + plan.baseline_key_version),\n    baseline_assignee_fingerprint: results.get('baseline_assignee:' + plan.baseline_key_version),\n    delay_policy_version: commit.delay_policy_version, delay_mode: 'live_observation',\n    delay_seconds: commit.delay_seconds, not_before: commit.not_before,\n    knowledge_version: commit.knowledge_version, fixture_ref: null, customer_egress_allowed: false,\n  };\n  wait.wait_state_fingerprint = sha256Text(deps, orderedJson(wait, WAIT_CARRIER_FIELD_ORDER));\n  validateWaitState(wait, deps);\n  return Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_identifiers_only_wait_v1', status: 'ready',\n    wait_state: Object.freeze(wait), customer_egress_allowed: false,\n  });\n}\n\nfunction normalizeMessageRow(row, wait, deps) {\n  if (!plainObject(row) || !Number.isSafeInteger(row.id) || row.id < 1 ||\n      row.account_id !== wait.account_id || row.inbox_id !== wait.inbox_id ||\n      positiveToken(row.conversation_id, 'message_row_invalid') !== wait.conversation_id ||\n      ![0, 1, 2].includes(row.message_type) || typeof row.private !== 'boolean' ||\n      !Number.isSafeInteger(row.created_at) || row.created_at < 0) fail('message_row_invalid');\n  if (hasOwn(row, 'content') && row.content !== null && typeof row.content !== 'string') {\n    fail('message_content_invalid');\n  }\n  const content = typeof row.content === 'string' ? row.content : '';\n  const contentBytes = deps.utf8ToBytes(content);\n  if (contentBytes.length > MAX_RAW_BODY_SIZE_BYTES) fail('message_content_excessive');\n  if (hasOwn(row, 'attachments') && !Array.isArray(row.attachments)) fail('message_attachments_invalid');\n  const attachmentCount = Array.isArray(row.attachments) ? row.attachments.length : 0;\n  if (attachmentCount > 32) fail('message_attachments_excessive');\n  const senderType = plainObject(row.sender) && typeof row.sender.type === 'string'\n    ? row.sender.type.toLowerCase() : null;\n  const direction = row.message_type === 0 ? 'inbound' : row.message_type === 1 ? 'outbound' : 'activity';\n  const visibility = row.private ? 'private' : 'public';\n  return Object.freeze({\n    id: row.id, message_type: row.message_type, private: row.private,\n    created_at: isoFromEpochSeconds(row.created_at), sender_type: senderType,\n    direction, visibility, content_sha256: sha256Hex(deps, contentBytes),\n    attachment_count: attachmentCount,\n    anchor_content: String(row.id) === wait.anchor_message_id ? content : null,\n  });\n}\n\nfunction scanRows(envelope, wait, deps) {\n  const http = httpEnvelope(envelope);\n  if (http.status_code !== 200 || !plainObject(http.body) || !Array.isArray(http.body.payload)) {\n    fail('message_scan_unavailable');\n  }\n  if (http.body.payload.length < 1) fail('anchor_missing');\n  if (http.body.payload.length >= SCAN_PAGE_SIZE_LIMIT) fail('scan_truncated');\n  const rows = http.body.payload.map((row) => normalizeMessageRow(row, wait, deps));\n  const anchor = Number(wait.anchor_message_id);\n  if (new Set(rows.map((row) => row.id)).size !== rows.length ||\n      rows.some((row) => row.id < anchor)) {\n    fail('message_scan_invalid');\n  }\n  const anchors = rows.filter((row) => row.id === anchor);\n  if (anchors.length !== 1) fail('anchor_missing');\n  if (anchors[0].message_type !== 0 || anchors[0].private !== false) fail('anchor_invalid');\n  if (rows.filter((row) => row.message_type !== 2).length < 1) fail('message_scan_invalid');\n  return rows;\n}\n\nfunction prepareBoundedReread(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, [\n    'schema_version', 'wait_state', 'read_started_epoch_seconds', 'conversation_before',\n    'messages_first', 'messages_second', 'conversation_after',\n  ], 'reread_input_invalid');\n  if (input.schema_version !== '1.0' || !Number.isSafeInteger(input.read_started_epoch_seconds) ||\n      input.read_started_epoch_seconds < 0) fail('reread_input_invalid');\n  const wait = validateWaitState(input.wait_state, deps);\n  if (input.read_started_epoch_seconds * 1000 < parseIso(wait.not_before, 'wait_state_invalid')) {\n    fail('wait_not_elapsed');\n  }\n  const before = conversationSnapshot(input.conversation_before, wait);\n  const firstRows = scanRows(input.messages_first, wait, deps);\n  const secondRows = scanRows(input.messages_second, wait, deps);\n  const after = conversationSnapshot(input.conversation_after, wait);\n  const uniqueRows = new Map();\n  for (const row of [...firstRows, ...secondRows]) {\n    const existing = uniqueRows.get(row.id);\n    const stable = { ...row, anchor_content: null };\n    if (existing && stableJson({ ...existing, anchor_content: null }) !== stableJson(stable)) {\n      fail('scan_changed');\n    }\n    uniqueRows.set(row.id, row);\n  }\n  const anchorId = Number(wait.anchor_message_id);\n  const anchorTuple = {\n    schema_version: '1.0', account_id: wait.account_id, inbox_id: wait.inbox_id,\n    event: 'message_created', conversation_id: wait.conversation_id,\n    message_id: wait.anchor_message_id,\n  };\n  const eventRequests = [Object.freeze({ purpose: 'message_event_' + anchorId,\n    key_version: wait.event_identity_key_version, algorithm: 'hmac-sha256', encoding: 'hex',\n    material_utf8: JSON.stringify(anchorTuple) })];\n  const baselineRequests = [\n    ['conversation_before_status', 'status', before.status],\n    ['conversation_before_assignee', 'assignee', before.assignee_id],\n    ['conversation_after_status', 'status', after.status],\n    ['conversation_after_assignee', 'assignee', after.assignee_id],\n  ].map(([purpose, kind, value]) => Object.freeze({\n    purpose, key_version: wait.baseline_fingerprint_key_version,\n    algorithm: 'hmac-sha256', encoding: 'hex',\n    material_utf8: baselineMaterial(wait, wait.baseline_fingerprint_key_version, kind, value),\n  }));\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_bounded_reread_plan_v1', wait_state: wait,\n    read_started_at: isoFromEpochSeconds(input.read_started_epoch_seconds),\n    first_rows: firstRows, second_rows: secondRows,\n    event_hmac_requests: eventRequests, baseline_hmac_requests: baselineRequests,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });\n}\n\nfunction validateRereadPlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'wait_state', 'read_started_at', 'first_rows', 'second_rows',\n    'event_hmac_requests', 'baseline_hmac_requests', 'customer_egress_allowed',\n    'plan_binding_sha256',\n  ], 'reread_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_bounded_reread_plan_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||\n      !Array.isArray(value.first_rows) || !Array.isArray(value.second_rows) ||\n      !Array.isArray(value.event_hmac_requests) || !Array.isArray(value.baseline_hmac_requests)) {\n    fail('reread_plan_invalid');\n  }\n  validateWaitState(value.wait_state, deps);\n  return value;\n}\n\nfunction prepareRereadMessageFingerprints(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, ['reread_plan', 'event_hmac_results'], 'reread_event_results_input_invalid');\n  const plan = validateRereadPlan(input.reread_plan, deps);\n  const events = hmacResults(input.event_hmac_results, plan.event_hmac_requests,\n    'reread_event_hmac_results_invalid');\n  const anchorId = Number(plan.wait_state.anchor_message_id);\n  const anchors = plan.second_rows.filter((row) => row.id === anchorId);\n  if (anchors.length !== 1) fail('anchor_missing');\n  const eventFingerprint = events.get(\n    'message_event_' + anchorId + ':' + plan.wait_state.event_identity_key_version,\n  );\n  const canonical = {\n    schema_version: '1.0', brand_id: BRAND_ID, account_id: plan.wait_state.account_id,\n    inbox_id: plan.wait_state.inbox_id, conversation_id: plan.wait_state.conversation_id,\n    message_id: plan.wait_state.anchor_message_id,\n    direction: anchors[0].direction, visibility: anchors[0].visibility,\n    event_identity_key_version: plan.wait_state.event_identity_key_version,\n    event_identity_fingerprint: eventFingerprint,\n  };\n  const messageRequests = [Object.freeze({ purpose: 'message_anchor_' + anchorId,\n    key_version: plan.wait_state.event_identity_key_version, algorithm: 'hmac-sha256',\n    encoding: 'hex',\n    material_utf8: ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + JSON.stringify(canonical) })];\n  const core = {\n    schema_version: '1.0', kind: 'chatwoot_reread_message_plan_v1', reread_plan: plan,\n    event_hmac_results: input.event_hmac_results, message_hmac_requests: messageRequests,\n    customer_egress_allowed: false,\n  };\n  return Object.freeze({ ...core, plan_binding_sha256: binding(deps, core) });\n}\n\nfunction validateMessagePlan(value, deps) {\n  exactObject(value, [\n    'schema_version', 'kind', 'reread_plan', 'event_hmac_results', 'message_hmac_requests',\n    'customer_egress_allowed', 'plan_binding_sha256',\n  ], 'reread_message_plan_invalid');\n  const core = { ...value };\n  delete core.plan_binding_sha256;\n  if (value.schema_version !== '1.0' || value.kind !== 'chatwoot_reread_message_plan_v1' ||\n      value.customer_egress_allowed !== false || binding(deps, core) !== value.plan_binding_sha256 ||\n      !Array.isArray(value.message_hmac_requests)) fail('reread_message_plan_invalid');\n  validateRereadPlan(value.reread_plan, deps);\n  return value;\n}\n\nfunction gateState(value) {\n  exactObject(value, [\n    'current_generation', 'idempotency_consumed', 'brand_enabled', 'kill_switch',\n  ], 'post_delay_gate_state_invalid');\n  if (!Number.isSafeInteger(value.current_generation) || value.current_generation < 1 ||\n      typeof value.idempotency_consumed !== 'boolean' || typeof value.brand_enabled !== 'boolean' ||\n      typeof value.kill_switch !== 'boolean') fail('post_delay_gate_state_invalid');\n  return value;\n}\n\nfunction setFingerprint(deps, rows) {\n  const canonicalRows = rows.map((row) => ({\n    id: row.id,\n    message_type: row.message_type,\n    private: row.private,\n    created_at: row.created_at,\n    sender_type: row.sender_type,\n    direction: row.direction,\n    visibility: row.visibility,\n    content_sha256: row.content_sha256,\n    attachment_count: row.attachment_count,\n  })).sort((left, right) => left.id - right.id);\n  return sha256Text(deps, MESSAGE_SET_FINGERPRINT_DOMAIN + JSON.stringify(canonicalRows));\n}\n\nfunction finalizePostDelay(input, injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  exactObject(input, [\n    'message_plan', 'message_hmac_results', 'baseline_hmac_results', 'gate_state',\n    'evaluated_epoch_seconds',\n  ], 'post_delay_input_invalid');\n  const plan = validateMessagePlan(input.message_plan, deps);\n  const reread = plan.reread_plan;\n  const wait = reread.wait_state;\n  const eventResults = hmacResults(plan.event_hmac_results, reread.event_hmac_requests,\n    'reread_event_hmac_results_invalid');\n  const messageResults = hmacResults(input.message_hmac_results, plan.message_hmac_requests,\n    'reread_message_hmac_results_invalid');\n  const baselineResults = hmacResults(input.baseline_hmac_results, reread.baseline_hmac_requests,\n    'reread_baseline_hmac_results_invalid');\n  const state = gateState(input.gate_state);\n  if (!Number.isSafeInteger(input.evaluated_epoch_seconds) || input.evaluated_epoch_seconds < 0 ||\n      input.evaluated_epoch_seconds * 1000 < parseIso(reread.read_started_at, 'reread_time_invalid')) {\n    fail('reread_time_invalid');\n  }\n  const first = reread.first_rows;\n  const second = reread.second_rows;\n  const firstSet = setFingerprint(deps, first);\n  const secondSet = setFingerprint(deps, second);\n  const anchorId = Number(wait.anchor_message_id);\n  const firstAnchor = first.filter((row) => row.id === anchorId);\n  const secondAnchor = second.filter((row) => row.id === anchorId);\n  const anchorEventFingerprint = eventResults.get(\n    'message_event_' + anchorId + ':' + wait.event_identity_key_version,\n  );\n  const anchorMessageFingerprint = messageResults.get(\n    'message_anchor_' + anchorId + ':' + wait.event_identity_key_version,\n  );\n  if (firstAnchor.length !== 1 || secondAnchor.length !== 1 ||\n      firstSet !== secondSet || firstAnchor[0].content_sha256 !== secondAnchor[0].content_sha256 ||\n      anchorMessageFingerprint !== wait.message_fingerprint ||\n      anchorEventFingerprint !== wait.event_identity_fingerprint) {\n    fail('bounded_reread_binding_failed');\n  }\n  const key = wait.baseline_fingerprint_key_version;\n  const beforeStatus = baselineResults.get('conversation_before_status:' + key);\n  const beforeAssignee = baselineResults.get('conversation_before_assignee:' + key);\n  const afterStatus = baselineResults.get('conversation_after_status:' + key);\n  const afterAssignee = baselineResults.get('conversation_after_assignee:' + key);\n  const rows = second;\n  const latest = (predicate) => {\n    const matches = rows.filter(predicate);\n    return matches.length ? matches.reduce((a, b) => a.id > b.id ? a : b) : null;\n  };\n  const latestInbound = latest((row) => row.message_type === 0 && row.private === false);\n  const latestHuman = latest((row) => row.message_type === 1 && row.private === false &&\n    ['user', 'agent'].includes(row.sender_type));\n  const latestPrivate = latest((row) => row.message_type !== 2 && row.private === true);\n  const latestNonActivity = latest((row) => row.message_type !== 2);\n  let cancellationReason = null;\n  if (beforeStatus !== afterStatus || beforeAssignee !== afterAssignee) cancellationReason = 'conversation_changed';\n  else if (afterStatus !== wait.baseline_status_fingerprint) cancellationReason = 'status_changed';\n  else if (afterAssignee !== wait.baseline_assignee_fingerprint) cancellationReason = 'assignee_changed';\n  else if (!state.brand_enabled) cancellationReason = 'brand_disabled';\n  else if (state.kill_switch) cancellationReason = 'brand_kill_switch';\n  else if (state.idempotency_consumed) cancellationReason = 'idempotency_consumed';\n  else if (state.current_generation !== wait.generation) cancellationReason = 'stale_generation';\n  else if (latestInbound && latestInbound.id > anchorId) cancellationReason = 'newer_inbound';\n  else if (latestHuman && latestHuman.id > anchorId) cancellationReason = 'human_intervention';\n  else if (latestPrivate && latestPrivate.id > anchorId) cancellationReason = 'private_note_present';\n  else if (latestNonActivity && latestNonActivity.id > anchorId) cancellationReason = 'newer_non_activity';\n  const eligible = cancellationReason === null;\n  const anchor = secondAnchor[0];\n  const summaryCore = {\n    wait_state_fingerprint: wait.wait_state_fingerprint,\n    scan_first_count: first.length, scan_second_count: second.length,\n    scan_first_set_fingerprint: firstSet, scan_second_set_fingerprint: secondSet,\n    anchor_message_id: wait.anchor_message_id,\n    anchor_message_fingerprint: anchorMessageFingerprint,\n    current_generation: state.current_generation,\n    expected_generation: wait.generation,\n    conversation_snapshots_stable: beforeStatus === afterStatus && beforeAssignee === afterAssignee,\n    evaluated_at: isoFromEpochSeconds(input.evaluated_epoch_seconds),\n  };\n  const verifiedAnchor = eligible ? Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_verified_anchor_for_llm_v1',\n    account_id: wait.account_id, inbox_id: wait.inbox_id, channel: wait.channel,\n    conversation_id: wait.conversation_id, message_id: wait.anchor_message_id,\n    content: anchor.anchor_content, content_sha256: anchor.content_sha256,\n    attachment_count: anchor.attachment_count, transient_only: true,\n    persistence_allowed: false, customer_egress_allowed: false,\n  }) : null;\n  return Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_post_delay_stage_v1',\n    status: eligible ? 'eligible' : 'cancelled', eligible_for_observation: eligible,\n    cancellation_reason: cancellationReason,\n    live_reread_summary: Object.freeze({ ...summaryCore,\n      summary_binding_sha256: binding(deps, summaryCore) }),\n    verified_anchor: verifiedAnchor,\n    transient_only: true, persistence_allowed: false, customer_egress_allowed: false,\n  });\n}\n\nfunction failClosedEnvelope(stage, error) {\n  const reasonCode = error instanceof FailClosedError ? error.reasonCode : 'stage_unexpected_failure';\n  if (typeof stage !== 'string' || !/^[a-z][a-z0-9_]{2,80}$/.test(stage)) {\n    fail('stage_name_invalid');\n  }\n  return Object.freeze({\n    schema_version: '1.0', kind: 'chatwoot_stage_failure_v1', stage,\n    status: 'fail_closed', reason_code: reasonCode,\n    customer_egress_allowed: false,\n  });\n}\n\nfunction createChatwootObservationStages(injectedDependencies) {\n  const deps = dependencies(injectedDependencies);\n  return Object.freeze({\n    prepareSignedIngress: (input) => prepareSignedIngress(input, deps),\n    finalizeSignedHmac: (input) => finalizeSignedHmac(input, deps),\n    prepareEventIdentity: (input) => prepareEventIdentity(input, deps),\n    finalizeEventIdentity: (input) => finalizeEventIdentity(input, deps),\n    finalizeRouteFingerprints: (input) => finalizeRouteFingerprints(input, deps),\n    prepareBaseline: (input) => prepareBaseline(input, deps),\n    finalizeWaitState: (input) => finalizeWaitState(input, deps),\n    prepareBoundedReread: (input) => prepareBoundedReread(input, deps),\n    prepareRereadMessageFingerprints: (input) => prepareRereadMessageFingerprints(input, deps),\n    finalizePostDelay: (input) => finalizePostDelay(input, deps),\n    validateWaitState: (input) => validateWaitState(input, deps),\n  });\n}\n\n__edgeModule.exports = Object.freeze({\n  ACCOUNT_ID,\n  BRAND_ID,\n  INBOX_CHANNELS,\n  MAX_RAW_BODY_SIZE_BYTES,\n  MAX_AGE_SECONDS,\n  MAX_FUTURE_SKEW_SECONDS,\n  SCAN_PAGE_SIZE_LIMIT,\n  EVENT_IDENTITY_CANONICAL_FORMAT,\n  EVENT_TO_STORAGE_KEY_VERSION,\n  STORAGE_TO_EVENT_KEY_VERSION,\n  WAIT_CARRIER_FIELD_ORDER,\n  PARITY_MANIFEST,\n  PARITY_MANIFEST_SHA256,\n  FailClosedError,\n  stableJson,\n  canonicalEventTuple,\n  eventKeyVersionToStorage,\n  storageKeyVersionToEvent,\n  failClosedEnvelope,\n  createChatwootObservationStages,\n});\n\n\nfunction __edgeSha256Hex(input) {\n  const source = input instanceof Uint8Array ? Array.from(input) : [];\n  const bytes = source.slice();\n  const bitLength = bytes.length * 8;\n  const constants = [\n    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,\n    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,\n    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,\n    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,\n    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,\n    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,\n    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,\n    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2\n  ];\n  const rotate = (value, shift) => (value >>> shift) | (value << (32 - shift));\n  bytes.push(0x80);\n  while (bytes.length % 64 !== 56) bytes.push(0);\n  const high = Math.floor(bitLength / 0x100000000);\n  const low = bitLength >>> 0;\n  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);\n  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);\n  const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];\n  const words = new Uint32Array(64);\n  for (let offset = 0; offset < bytes.length; offset += 64) {\n    for (let index = 0; index < 16; index += 1) {\n      const start = offset + index * 4;\n      words[index] = ((bytes[start] << 24) | (bytes[start + 1] << 16) |\n        (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0;\n    }\n    for (let index = 16; index < 64; index += 1) {\n      const x = words[index - 15];\n      const y = words[index - 2];\n      const sigma0 = rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3);\n      const sigma1 = rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10);\n      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;\n    }\n    let [a,b,c,d,e,f,g,h] = hash;\n    for (let index = 0; index < 64; index += 1) {\n      const sum1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);\n      const choose = (e & f) ^ (~e & g);\n      const temporary1 = (h + sum1 + choose + constants[index] + words[index]) >>> 0;\n      const sum0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);\n      const majority = (a & b) ^ (a & c) ^ (b & c);\n      const temporary2 = (sum0 + majority) >>> 0;\n      h = g; g = f; f = e; e = (d + temporary1) >>> 0;\n      d = c; c = b; b = a; a = (temporary1 + temporary2) >>> 0;\n    }\n    hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;\n    hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;\n    hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;\n    hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;\n  }\n  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');\n}\nfunction __edgeTimingSafeEqualHex(left, right) {\n  if (!/^[a-f0-9]{64}$/.test(left || '') || !/^[a-f0-9]{64}$/.test(right || '')) return false;\n  let difference = 0;\n  for (let index = 0; index < 64; index += 1) {\n    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);\n  }\n  return difference === 0;\n}\nconst __edgeDependencies = Object.freeze({\n  base64ToBytes: (value) => new Uint8Array(Buffer.from(value, 'base64')),\n  bytesToBase64: (value) => Buffer.from(value).toString('base64'),\n  utf8ToBytes: (value) => new Uint8Array(Buffer.from(value, 'utf8')),\n  bytesToUtf8Fatal: (value) => new TextDecoder('utf-8', { fatal: true }).decode(value),\n  sha256Hex: __edgeSha256Hex,\n  timingSafeEqualHex: __edgeTimingSafeEqualHex\n});\nconst __edgeStages = __edgeModule.exports.createChatwootObservationStages(__edgeDependencies);\nfunction __edgeFailure(stage, error) {\n  return __edgeModule.exports.failClosedEnvelope(stage, error);\n}\nfunction __edgeHttpEnvelope(value) {\n  const source = value && typeof value === 'object' ? value : {};\n  const status = Number.isSafeInteger(source.statusCode) ? source.statusCode\n    : Number.isSafeInteger(source.status_code) ? source.status_code : null;\n  return {\n    status_code: status,\n    body: status === null ? null : (source.body && typeof source.body === 'object' ? source.body : null),\n    error_code: status === null ? 'chatwoot_read_unknown' : null\n  };\n}\n";

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
              .onTrue(getConversationBefore)
              .onFalse(prepareRetry.to(retryReady)),
          ),
      )
      .onFalse(terminalSafe),
  );
