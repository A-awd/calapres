'use strict';

const crypto = require('node:crypto');

const CHANNELS = new Set(['whatsapp', 'email', 'instagram', 'tiktok']);
const SOCIAL_CHANNELS = new Set(['instagram', 'tiktok']);
const HEX_64 = /^[a-f0-9]{64}$/;
const KEY_VERSION = /^hmac-sha256-v[1-9][0-9]*$/;
const BRAND_ID = /^[a-z][a-z0-9_-]{1,63}$/;
const SHOPIFY_CUSTOMER_GID = /^gid:\/\/shopify\/Customer\/[1-9][0-9]{0,30}$/;
const SHOPIFY_ORDER_GID = /^gid:\/\/shopify\/Order\/[1-9][0-9]{0,30}$/;
const RAW_PII_KEYS = new Set([
  'address',
  'email',
  'phone',
  'raw',
  'secret',
  'source_identity',
  'access_token',
  'challenge_plaintext',
]);

function fail(message) {
  throw new TypeError(message);
}

function exactObject(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} must contain exactly: ${expected.join(', ')}`);
  }
}

function assertString(value, pattern, label) {
  if (typeof value !== 'string' || !pattern.test(value)) fail(`${label} is invalid`);
}

function assertTimestamp(value, label, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || !value.includes('T') || !Number.isFinite(Date.parse(value))) {
    fail(`${label} must be an ISO timestamp${nullable ? ' or null' : ''}`);
  }
}

function normalizePhone(value) {
  if (typeof value !== 'string') fail('WhatsApp source identity must be an E.164 string');
  const normalized = value.trim();
  if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
    fail('WhatsApp source identity must be exact E.164; guessing or local-number expansion is forbidden');
  }
  return normalized;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') fail('email source identity must be a string');
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
    fail('email source identity is invalid');
  }
  return normalized;
}

function normalizeSocialSourceId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9:_-]{3,160}$/.test(value)) {
    fail('social source identity must be an opaque platform identifier, never a display name');
  }
  return value;
}

function validateKey(key, label) {
  exactObject(key, ['key_version', 'secret'], label);
  assertString(key.key_version, KEY_VERSION, `${label}.key_version`);
  if ((typeof key.secret !== 'string' && !Buffer.isBuffer(key.secret)) || key.secret.length < 16) {
    fail(`${label}.secret must contain at least 16 bytes`);
  }
}

function validateKeyring(activeKey, retainedKeys) {
  validateKey(activeKey, 'active_key');
  if (!Array.isArray(retainedKeys) || retainedKeys.length > 8) {
    fail('retained_keys must be an array with at most 8 entries');
  }
  const versions = new Set([activeKey.key_version]);
  for (const [index, key] of retainedKeys.entries()) {
    validateKey(key, `retained_keys[${index}]`);
    if (versions.has(key.key_version)) fail('fingerprint key versions must be unique');
    versions.add(key.key_version);
  }
}

function hmacFingerprint({ brand_id, purpose, normalized_value, key_version, secret }) {
  assertString(brand_id, BRAND_ID, 'brand_id');
  assertString(key_version, KEY_VERSION, 'key_version');
  if (typeof purpose !== 'string' || !/^[a-z][a-z0-9:_-]{2,80}$/.test(purpose)) {
    fail('purpose is invalid');
  }
  if (typeof normalized_value !== 'string' || normalized_value.length === 0) {
    fail('normalized_value is invalid');
  }
  if ((typeof secret !== 'string' && !Buffer.isBuffer(secret)) || secret.length < 16) {
    fail('secret must contain at least 16 bytes');
  }
  const domainSeparated = ['calapres-identity-v1', brand_id, purpose, key_version, normalized_value]
    .join('\u0000');
  return crypto.createHmac('sha256', secret).update(domainSeparated, 'utf8').digest('hex');
}

function fingerprintsForKeys(brandId, purpose, normalized, activeKey, retainedKeys) {
  return [activeKey, ...retainedKeys].map((key) => ({
    fingerprint: hmacFingerprint({
      brand_id: brandId,
      purpose,
      normalized_value: normalized,
      key_version: key.key_version,
      secret: key.secret,
    }),
    key_version: key.key_version,
  }));
}

function assertNoRawPii(value, label = 'durable projection') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRawPii(item, `${label}[${index}]`));
    return value;
  }
  if (!value || typeof value !== 'object') return value;
  for (const [key, nested] of Object.entries(value)) {
    if (RAW_PII_KEYS.has(key) || key.endsWith('_plaintext')) {
      fail(`${label} contains prohibited raw-PII field: ${key}`);
    }
    assertNoRawPii(nested, `${label}.${key}`);
  }
  return value;
}

function isActiveVerifiedLink(row, now) {
  return row.assurance_level === 'verified' &&
    row.verified_at !== null &&
    Date.parse(row.verified_at) <= now &&
    row.revoked_at === null &&
    (row.expires_at === null || Date.parse(row.expires_at) > now);
}

function buildShopifyIdentityRequest(input) {
  exactObject(input, [
    'brand_id',
    'channel',
    'inbox_id',
    'chatwoot_contact_id',
    'source_identity',
    'active_key',
    'retained_keys',
    'customer_links',
    'now',
  ], 'identity input');
  assertString(input.brand_id, BRAND_ID, 'brand_id');
  if (!CHANNELS.has(input.channel)) fail('channel is unsupported');
  assertString(input.inbox_id, /^[1-9][0-9]{0,30}$/, 'inbox_id');
  assertString(input.chatwoot_contact_id, /^[1-9][0-9]{0,30}$/, 'chatwoot_contact_id');
  assertTimestamp(input.now, 'now');
  if (!Array.isArray(input.customer_links)) fail('customer_links must be an array');
  validateKeyring(input.active_key, input.retained_keys);

  let normalized;
  let purpose;
  let lookupBasis;
  if (input.channel === 'whatsapp') {
    normalized = normalizePhone(input.source_identity);
    purpose = 'buyer_phone';
    lookupBasis = 'buyer_phone_fingerprint';
  } else if (input.channel === 'email') {
    normalized = normalizeEmail(input.source_identity);
    purpose = 'buyer_email';
    lookupBasis = 'email_fingerprint';
  } else {
    normalized = normalizeSocialSourceId(input.source_identity);
    purpose = `channel_identity:${input.channel}`;
    lookupBasis = 'verified_social_link';
  }

  const fingerprints = fingerprintsForKeys(
    input.brand_id,
    purpose,
    normalized,
    input.active_key,
    input.retained_keys,
  );
  let shopifyCustomerGid = null;
  let orderGidScope = null;
  let customerLinkId = null;

  if (SOCIAL_CHANNELS.has(input.channel)) {
    const now = Date.parse(input.now);
    const matches = input.customer_links.filter((row) => {
      try {
        projectCustomerLinkRow(row);
      } catch (_error) {
        return false;
      }
      const identityMatch = fingerprints.some((candidate) =>
        candidate.key_version === row.fingerprint_key_version &&
        candidate.fingerprint === row.channel_identity_fingerprint,
      );
      return row.brand_id === input.brand_id &&
        row.channel === input.channel &&
        row.inbox_id === input.inbox_id &&
        row.chatwoot_contact_id === input.chatwoot_contact_id &&
        identityMatch &&
        isActiveVerifiedLink(row, now);
    });
    if (matches.length !== 1) {
      return {
        status: 'blocked',
        reason_code: matches.length === 0
          ? 'verified_social_link_required'
          : 'ambiguous_verified_social_link',
        request: null,
      };
    }
    const link = matches[0];
    if (link.shopify_customer_gid === null && link.order_gid_scope === null) {
      return { status: 'blocked', reason_code: 'verified_social_link_has_no_scope', request: null };
    }
    shopifyCustomerGid = link.shopify_customer_gid;
    orderGidScope = link.order_gid_scope;
    customerLinkId = link.link_id;
  }

  const request = {
    schema_version: '1.0',
    brand_id: input.brand_id,
    channel: input.channel,
    lookup_created_at: input.now,
    lookup_basis: lookupBasis,
    fingerprints,
    shopify_customer_gid: shopifyCustomerGid,
    order_gid_scope: orderGidScope,
    customer_link_id: customerLinkId,
  };
  assertNoRawPii(request, 'Shopify identity request');
  return { status: 'ready', reason_code: null, request };
}

function validateCandidate(candidate, index) {
  exactObject(candidate, [
    'brand_id',
    'shopify_order_gid',
    'shopify_customer_gid',
    'buyer_phone_fingerprint',
    'email_fingerprint',
    'fingerprint_key_version',
    'status_class',
  ], `candidates[${index}]`);
  assertString(candidate.brand_id, BRAND_ID, `candidates[${index}].brand_id`);
  assertString(candidate.shopify_order_gid, SHOPIFY_ORDER_GID, `candidates[${index}].shopify_order_gid`);
  if (candidate.shopify_customer_gid !== null) {
    assertString(candidate.shopify_customer_gid, SHOPIFY_CUSTOMER_GID, `candidates[${index}].shopify_customer_gid`);
  }
  for (const field of ['buyer_phone_fingerprint', 'email_fingerprint']) {
    if (candidate[field] !== null) assertString(candidate[field], HEX_64, `candidates[${index}].${field}`);
  }
  assertString(candidate.fingerprint_key_version, KEY_VERSION, `candidates[${index}].fingerprint_key_version`);
  if (!['active', 'stale', 'revoked'].includes(candidate.status_class)) {
    fail(`candidates[${index}].status_class is invalid`);
  }
}

function resolveShopifyIdentityResponse(requestEnvelope, candidates) {
  exactObject(requestEnvelope, ['status', 'reason_code', 'request'], 'request envelope');
  if (requestEnvelope.status !== 'ready' || requestEnvelope.request === null) {
    return {
      status: 'blocked',
      reason_code: requestEnvelope.reason_code || 'lookup_request_not_ready',
      brand_id: null,
      channel: null,
      match_count: 0,
      shopify_order_gid: null,
      shopify_customer_gid: null,
      candidate_kind: null,
      lookup_created_at: null,
      live_fetch_required: false,
    };
  }
  if (!Array.isArray(candidates)) fail('candidates must be an array');
  candidates.forEach(validateCandidate);
  const request = requestEnvelope.request;
  const brandCandidates = candidates.filter((candidate) => candidate.brand_id === request.brand_id);
  const activeCandidates = brandCandidates.filter((candidate) => candidate.status_class === 'active');
  let matches;
  if (request.lookup_basis === 'buyer_phone_fingerprint' || request.lookup_basis === 'email_fingerprint') {
    const field = request.lookup_basis;
    matches = activeCandidates.filter((candidate) => request.fingerprints.some((fingerprint) =>
      fingerprint.key_version === candidate.fingerprint_key_version &&
      fingerprint.fingerprint === candidate[field],
    ));
  } else if (request.lookup_basis === 'verified_social_link') {
    matches = activeCandidates.filter((candidate) =>
      (request.shopify_customer_gid === null ||
        candidate.shopify_customer_gid === request.shopify_customer_gid) &&
      (request.order_gid_scope === null || candidate.shopify_order_gid === request.order_gid_scope),
    );
  } else {
    fail('lookup_basis is unsupported');
  }

  let status;
  let reasonCode;
  let selected = null;
  if (brandCandidates.length === 0) {
    status = 'not_found';
    reasonCode = 'zero_shopify_matches';
  } else if (activeCandidates.length === 0) {
    const classes = new Set(brandCandidates.map((candidate) => candidate.status_class));
    if (classes.size === 1 && classes.has('stale')) {
      status = 'stale_index_only';
      reasonCode = 'stale_shopify_index_requires_live_rebuild';
    } else if (classes.size === 1 && classes.has('revoked')) {
      status = 'revoked_index_only';
      reasonCode = 'revoked_shopify_index_match_forbidden';
    } else {
      status = 'inactive_index_only';
      reasonCode = 'inactive_shopify_index_requires_reverification';
    }
  } else if (matches.length === 0) {
    status = 'mismatch';
    reasonCode = 'identity_does_not_exactly_match';
  } else if (matches.length > 1) {
    status = 'ambiguous';
    reasonCode = 'multiple_exact_shopify_matches';
  } else {
    selected = matches[0];
    status = 'candidate_identity_matched';
    reasonCode = selected.shopify_customer_gid === null
      ? 'one_exact_guest_order_match'
      : 'one_exact_customer_match';
  }

  const result = {
    status,
    reason_code: reasonCode,
    brand_id: request.brand_id,
    channel: request.channel,
    match_count: matches.length,
    shopify_order_gid: selected ? selected.shopify_order_gid : null,
    shopify_customer_gid: selected ? selected.shopify_customer_gid : null,
    candidate_kind: selected
      ? (selected.shopify_customer_gid === null ? 'guest_order' : 'customer_order')
      : null,
    lookup_created_at: request.lookup_created_at,
    live_fetch_required: selected !== null,
  };
  assertNoRawPii(result, 'Shopify identity result');
  return result;
}

function finalizeShopifyLiveOrderResponse(candidateResult, liveResponse) {
  exactObject(candidateResult, [
    'status',
    'reason_code',
    'brand_id',
    'channel',
    'match_count',
    'shopify_order_gid',
    'shopify_customer_gid',
    'candidate_kind',
    'lookup_created_at',
    'live_fetch_required',
  ], 'candidate identity result');
  const blocked = (reasonCode) => ({
    status: 'blocked',
    reason_code: reasonCode,
    live_fetch_required: false,
    live_fetch_verified: false,
    brand_id: null,
    shopify_order_gid: null,
    shopify_customer_gid: null,
    order_status_class: null,
    fetched_at: null,
  });
  if (candidateResult.status !== 'candidate_identity_matched' ||
      candidateResult.live_fetch_required !== true ||
      candidateResult.match_count !== 1) {
    return blocked('candidate_identity_match_required');
  }
  const candidateShapeMatches =
    (candidateResult.candidate_kind === 'guest_order' &&
      candidateResult.shopify_customer_gid === null) ||
    (candidateResult.candidate_kind === 'customer_order' &&
      candidateResult.shopify_customer_gid !== null);
  if (!candidateShapeMatches) return blocked('candidate_identity_shape_mismatch');
  exactObject(liveResponse, [
    'source',
    'brand_id',
    'shopify_order_gid',
    'shopify_customer_gid',
    'order_status_class',
    'fetched_at',
  ], 'live Shopify response');
  if (liveResponse.source !== 'shopify_admin_api_live') fail('live Shopify source is invalid');
  assertString(liveResponse.brand_id, BRAND_ID, 'live Shopify brand_id');
  assertString(liveResponse.shopify_order_gid, SHOPIFY_ORDER_GID, 'live Shopify order GID');
  if (liveResponse.shopify_customer_gid !== null) {
    assertString(
      liveResponse.shopify_customer_gid,
      SHOPIFY_CUSTOMER_GID,
      'live Shopify customer GID',
    );
  }
  if (!['open', 'fulfilled', 'cancelled', 'refunded', 'closed'].includes(
    liveResponse.order_status_class,
  )) {
    fail('live Shopify order_status_class is invalid');
  }
  assertTimestamp(liveResponse.fetched_at, 'live Shopify fetched_at');
  assertTimestamp(candidateResult.lookup_created_at, 'candidate lookup_created_at');
  if (Date.parse(liveResponse.fetched_at) < Date.parse(candidateResult.lookup_created_at)) {
    return blocked('live_shopify_response_predates_candidate');
  }
  const exactMatch = liveResponse.brand_id === candidateResult.brand_id &&
    liveResponse.shopify_order_gid === candidateResult.shopify_order_gid &&
    liveResponse.shopify_customer_gid === candidateResult.shopify_customer_gid;
  if (!exactMatch) return blocked('live_shopify_identity_mismatch');

  const result = {
    status: candidateResult.candidate_kind === 'guest_order'
      ? 'verified_live_guest_order'
      : 'verified_live_customer_order',
    reason_code: 'live_shopify_identity_verified',
    live_fetch_required: false,
    live_fetch_verified: true,
    brand_id: liveResponse.brand_id,
    shopify_order_gid: liveResponse.shopify_order_gid,
    shopify_customer_gid: liveResponse.shopify_customer_gid,
    order_status_class: liveResponse.order_status_class,
    fetched_at: liveResponse.fetched_at,
  };
  assertNoRawPii(result, 'final live Shopify identity result');
  return result;
}

const CUSTOMER_LINK_FIELDS = Object.freeze([
  'brand_id',
  'link_id',
  'channel',
  'inbox_id',
  'channel_identity_fingerprint',
  'fingerprint_key_version',
  'chatwoot_contact_id',
  'shopify_customer_gid',
  'order_gid_scope',
  'verification_method',
  'assurance_level',
  'verified_at',
  'expires_at',
  'revoked_at',
]);

function projectCustomerLinkRow(row) {
  exactObject(row, CUSTOMER_LINK_FIELDS, 'customer_links row');
  assertString(row.brand_id, BRAND_ID, 'customer_links.brand_id');
  assertString(row.link_id, /^idl_[A-Za-z0-9_-]{8,80}$/, 'customer_links.link_id');
  if (!CHANNELS.has(row.channel)) fail('customer_links.channel is invalid');
  assertString(row.inbox_id, /^[1-9][0-9]{0,30}$/, 'customer_links.inbox_id');
  assertString(row.channel_identity_fingerprint, HEX_64, 'customer_links.channel_identity_fingerprint');
  assertString(row.fingerprint_key_version, KEY_VERSION, 'customer_links.fingerprint_key_version');
  assertString(row.chatwoot_contact_id, /^[1-9][0-9]{0,30}$/, 'customer_links.chatwoot_contact_id');
  if (row.shopify_customer_gid !== null) {
    assertString(row.shopify_customer_gid, SHOPIFY_CUSTOMER_GID, 'customer_links.shopify_customer_gid');
  }
  if (row.order_gid_scope !== null) {
    assertString(row.order_gid_scope, SHOPIFY_ORDER_GID, 'customer_links.order_gid_scope');
  }
  if (!['exact_channel', 'owner_confirmed', 'shopify_verified'].includes(row.verification_method)) {
    fail('customer_links.verification_method is invalid');
  }
  if (!['verified', 'revoked'].includes(row.assurance_level)) {
    fail('customer_links.assurance_level is invalid');
  }
  assertTimestamp(row.verified_at, 'customer_links.verified_at', true);
  assertTimestamp(row.expires_at, 'customer_links.expires_at', true);
  assertTimestamp(row.revoked_at, 'customer_links.revoked_at', true);
  if (row.assurance_level === 'verified' && (row.verified_at === null || row.revoked_at !== null)) {
    fail('verified customer_links rows require verified_at and forbid revoked_at');
  }
  if (row.assurance_level === 'revoked' && row.revoked_at === null) {
    fail('revoked customer_links rows require revoked_at');
  }
  if (row.expires_at !== null && row.verified_at !== null &&
      Date.parse(row.expires_at) <= Date.parse(row.verified_at)) {
    fail('customer_links.expires_at must be later than verified_at');
  }
  const projection = Object.fromEntries(CUSTOMER_LINK_FIELDS.map((field) => [field, row[field]]));
  assertNoRawPii(projection, 'customer_links row');
  return projection;
}

const VERIFICATION_FIELDS = Object.freeze([
  'brand_id',
  'challenge_id',
  'channel',
  'contact_fingerprint',
  'contact_fingerprint_key_version',
  'challenge_hash',
  'challenge_key_version',
  'status',
  'attempt_count',
  'expires_at',
  'consumed_at',
  'correlation_id',
]);

function projectVerificationRow(row) {
  exactObject(row, VERIFICATION_FIELDS, 'verification row');
  assertString(row.brand_id, BRAND_ID, 'verification.brand_id');
  assertString(row.challenge_id, /^ver_[A-Za-z0-9_-]{8,80}$/, 'verification.challenge_id');
  if (!CHANNELS.has(row.channel)) fail('verification.channel is invalid');
  assertString(row.contact_fingerprint, HEX_64, 'verification.contact_fingerprint');
  assertString(row.contact_fingerprint_key_version, KEY_VERSION, 'verification.contact_fingerprint_key_version');
  assertString(row.challenge_hash, HEX_64, 'verification.challenge_hash');
  assertString(row.challenge_key_version, KEY_VERSION, 'verification.challenge_key_version');
  if (!['pending', 'verified', 'failed', 'expired', 'consumed'].includes(row.status)) {
    fail('verification.status is invalid');
  }
  if (!Number.isInteger(row.attempt_count) || row.attempt_count < 0 || row.attempt_count > 10) {
    fail('verification.attempt_count is invalid');
  }
  assertTimestamp(row.expires_at, 'verification.expires_at');
  assertTimestamp(row.consumed_at, 'verification.consumed_at', true);
  if (row.status === 'consumed' && row.consumed_at === null) {
    fail('consumed verification rows require consumed_at');
  }
  if (row.status !== 'consumed' && row.consumed_at !== null) {
    fail('only consumed verification rows may set consumed_at');
  }
  assertString(row.correlation_id, /^[A-Za-z0-9:_-]{4,160}$/, 'verification.correlation_id');
  const projection = Object.fromEntries(VERIFICATION_FIELDS.map((field) => [field, row[field]]));
  assertNoRawPii(projection, 'verification row');
  return projection;
}

module.exports = {
  CUSTOMER_LINK_FIELDS,
  VERIFICATION_FIELDS,
  assertNoRawPii,
  buildShopifyIdentityRequest,
  finalizeShopifyLiveOrderResponse,
  hmacFingerprint,
  projectCustomerLinkRow,
  projectVerificationRow,
  resolveShopifyIdentityResponse,
};
