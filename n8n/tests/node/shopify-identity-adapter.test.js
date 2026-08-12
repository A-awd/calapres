'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const {
  CUSTOMER_LINK_FIELDS,
  VERIFICATION_FIELDS,
  buildShopifyIdentityRequest,
  finalizeShopifyLiveOrderResponse,
  hmacFingerprint,
  projectCustomerLinkRow,
  projectVerificationRow,
  resolveShopifyIdentityResponse,
} = require('../../adapters/shopify-identity-adapter');

const fixture = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'shopify-identity-adapter-scenarios.json'),
  'utf8',
));

function inputFor(name, overrides = {}) {
  return {
    brand_id: fixture.brand_id,
    ...fixture[name],
    active_key: fixture.active_key,
    retained_keys: fixture.retained_keys,
    customer_links: [],
    now: '2026-08-11T15:00:00.000Z',
    ...overrides,
  };
}

function candidate(request, overrides = {}) {
  const activeFingerprint = request.request.fingerprints[0].fingerprint;
  const row = {
    brand_id: 'calapres',
    shopify_order_gid: fixture.shopify_ids.order_one,
    shopify_customer_gid: fixture.shopify_ids.customer_one,
    buyer_phone_fingerprint: null,
    email_fingerprint: null,
    fingerprint_key_version: fixture.active_key.key_version,
    status_class: 'active',
  };
  if (request.request.lookup_basis === 'buyer_phone_fingerprint') {
    row.buyer_phone_fingerprint = activeFingerprint;
  } else if (request.request.lookup_basis === 'email_fingerprint') {
    row.email_fingerprint = activeFingerprint;
  }
  return { ...row, ...overrides };
}

function socialLink(platform = 'instagram', overrides = {}) {
  const social = fixture[platform];
  const fingerprint = hmacFingerprint({
    brand_id: 'calapres',
    purpose: `channel_identity:${social.channel}`,
    normalized_value: social.source_identity,
    key_version: fixture.active_key.key_version,
    secret: fixture.active_key.secret,
  });
  return {
    brand_id: 'calapres',
    link_id: 'idl_synthetic0003',
    channel: social.channel,
    inbox_id: social.inbox_id,
    channel_identity_fingerprint: fingerprint,
    fingerprint_key_version: fixture.active_key.key_version,
    chatwoot_contact_id: social.chatwoot_contact_id,
    shopify_customer_gid: fixture.shopify_ids.customer_one,
    order_gid_scope: null,
    verification_method: 'owner_confirmed',
    assurance_level: 'verified',
    verified_at: '2026-08-11T14:00:00.000Z',
    expires_at: '2026-11-09T14:00:00.000Z',
    revoked_at: null,
    ...overrides,
  };
}

test('HMAC is deterministic, domain-separated, and version-bound', () => {
  const base = {
    brand_id: 'calapres',
    purpose: 'buyer_phone',
    normalized_value: fixture.whatsapp.source_identity,
    key_version: fixture.active_key.key_version,
    secret: fixture.active_key.secret,
  };
  const first = hmacFingerprint(base);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(hmacFingerprint(base), first);
  assert.notEqual(hmacFingerprint({ ...base, purpose: 'buyer_email' }), first);
  assert.notEqual(hmacFingerprint({ ...base, brand_id: 'future-brand' }), first);
  assert.notEqual(hmacFingerprint({
    ...base,
    key_version: fixture.retained_keys[0].key_version,
    secret: fixture.retained_keys[0].secret,
  }), first);
});

test('WhatsApp uses exact buyer-phone HMAC only: zero, one, multiple, guest, and mismatch', () => {
  const request = buildShopifyIdentityRequest(inputFor('whatsapp'));
  assert.equal(request.status, 'ready');
  assert.equal(request.request.lookup_basis, 'buyer_phone_fingerprint');
  assert.equal(request.request.fingerprints.length, 2);
  assert.equal(JSON.stringify(request).includes(fixture.whatsapp.source_identity), false);
  assert.equal(JSON.stringify(request).includes(fixture.active_key.secret), false);

  const zero = resolveShopifyIdentityResponse(request, []);
  assert.equal(zero.status, 'not_found');

  const one = resolveShopifyIdentityResponse(request, [candidate(request)]);
  assert.equal(one.status, 'candidate_identity_matched');
  assert.equal(one.live_fetch_required, true);
  assert.equal(one.candidate_kind, 'customer_order');
  assert.equal(one.shopify_customer_gid, fixture.shopify_ids.customer_one);

  const retainedKeyMatch = resolveShopifyIdentityResponse(request, [candidate(request, {
    buyer_phone_fingerprint: request.request.fingerprints[1].fingerprint,
    fingerprint_key_version: request.request.fingerprints[1].key_version,
  })]);
  assert.equal(retainedKeyMatch.status, 'candidate_identity_matched');
  assert.equal(retainedKeyMatch.live_fetch_required, true);

  const multiple = resolveShopifyIdentityResponse(request, [
    candidate(request),
    candidate(request, { shopify_order_gid: fixture.shopify_ids.order_two }),
  ]);
  assert.equal(multiple.status, 'ambiguous');
  assert.equal(multiple.match_count, 2);

  const guest = resolveShopifyIdentityResponse(request, [candidate(request, {
    shopify_customer_gid: null,
  })]);
  assert.equal(guest.status, 'candidate_identity_matched');
  assert.equal(guest.candidate_kind, 'guest_order');
  assert.equal(guest.live_fetch_required, true);

  const wrongFingerprint = 'f'.repeat(64);
  const mismatch = resolveShopifyIdentityResponse(request, [candidate(request, {
    buyer_phone_fingerprint: wrongFingerprint,
    email_fingerprint: request.request.fingerprints[0].fingerprint,
  })]);
  assert.equal(mismatch.status, 'mismatch');
});

test('email lookup uses canonical exact email HMAC and never phone fallback', () => {
  const mixedCase = buildShopifyIdentityRequest(inputFor('email'));
  const lowercase = buildShopifyIdentityRequest(inputFor('email', {
    source_identity: fixture.email.source_identity.toLowerCase(),
  }));
  assert.deepEqual(mixedCase.request.fingerprints, lowercase.request.fingerprints);
  assert.equal(mixedCase.request.lookup_basis, 'email_fingerprint');
  const match = resolveShopifyIdentityResponse(mixedCase, [candidate(mixedCase)]);
  assert.equal(match.status, 'candidate_identity_matched');
  assert.equal(match.live_fetch_required, true);
  const phoneOnly = resolveShopifyIdentityResponse(mixedCase, [candidate(mixedCase, {
    email_fingerprint: null,
    buyer_phone_fingerprint: mixedCase.request.fingerprints[0].fingerprint,
  })]);
  assert.equal(phoneOnly.status, 'mismatch');
});

test('Instagram and TikTok paths are blocked unless one active verified link exists', () => {
  const blocked = buildShopifyIdentityRequest(inputFor('instagram'));
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.reason_code, 'verified_social_link_required');

  const expired = buildShopifyIdentityRequest(inputFor('instagram', {
    customer_links: [socialLink('instagram', { expires_at: '2026-08-11T14:59:59.000Z' })],
  }));
  assert.equal(expired.status, 'blocked');

  const ready = buildShopifyIdentityRequest(inputFor('instagram', {
    customer_links: [socialLink()],
  }));
  assert.equal(ready.status, 'ready');
  assert.equal(ready.request.lookup_basis, 'verified_social_link');
  assert.equal(ready.request.shopify_customer_gid, fixture.shopify_ids.customer_one);
  assert.equal(JSON.stringify(ready).includes(fixture.instagram.source_identity), false);

  const verified = resolveShopifyIdentityResponse(ready, [candidate(ready)]);
  assert.equal(verified.status, 'candidate_identity_matched');
  assert.equal(verified.live_fetch_required, true);
  const mismatch = resolveShopifyIdentityResponse(ready, [candidate(ready, {
    shopify_customer_gid: fixture.shopify_ids.customer_other,
  })]);
  assert.equal(mismatch.status, 'mismatch');

  const tiktokReady = buildShopifyIdentityRequest(inputFor('tiktok', {
    customer_links: [socialLink('tiktok')],
  }));
  assert.equal(tiktokReady.status, 'ready');
  assert.equal(tiktokReady.request.channel, 'tiktok');
  assert.equal(tiktokReady.request.lookup_basis, 'verified_social_link');
});

test('stale-only and revoked-only indexes are distinct non-disclosing outcomes', () => {
  const request = buildShopifyIdentityRequest(inputFor('whatsapp'));
  const stale = resolveShopifyIdentityResponse(request, [candidate(request, {
    status_class: 'stale',
  })]);
  assert.equal(stale.status, 'stale_index_only');
  assert.equal(stale.live_fetch_required, false);
  assert.equal(stale.shopify_order_gid, null);
  const revoked = resolveShopifyIdentityResponse(request, [candidate(request, {
    status_class: 'revoked',
  })]);
  assert.equal(revoked.status, 'revoked_index_only');
  assert.equal(revoked.live_fetch_required, false);
  assert.equal(revoked.shopify_order_gid, null);
});

test('only a fresh exact sanitized Shopify live response finalizes identity', () => {
  const request = buildShopifyIdentityRequest(inputFor('whatsapp'));
  const candidateResult = resolveShopifyIdentityResponse(request, [candidate(request)]);
  assert.equal(candidateResult.status, 'candidate_identity_matched');
  assert.equal(candidateResult.live_fetch_required, true);

  const live = {
    source: 'shopify_admin_api_live',
    brand_id: 'calapres',
    shopify_order_gid: fixture.shopify_ids.order_one,
    shopify_customer_gid: fixture.shopify_ids.customer_one,
    order_status_class: 'fulfilled',
    fetched_at: '2026-08-11T15:00:01.000Z',
  };
  const finalized = finalizeShopifyLiveOrderResponse(candidateResult, live);
  assert.equal(finalized.status, 'verified_live_customer_order');
  assert.equal(finalized.live_fetch_required, false);
  assert.equal(finalized.live_fetch_verified, true);

  const mismatch = finalizeShopifyLiveOrderResponse(candidateResult, {
    ...live,
    shopify_customer_gid: fixture.shopify_ids.customer_other,
  });
  assert.equal(mismatch.status, 'blocked');
  assert.equal(mismatch.reason_code, 'live_shopify_identity_mismatch');
  assert.equal(mismatch.shopify_order_gid, null);

  const staleLive = finalizeShopifyLiveOrderResponse(candidateResult, {
    ...live,
    fetched_at: '2026-08-11T14:59:59.000Z',
  });
  assert.equal(staleLive.status, 'blocked');
  assert.equal(staleLive.reason_code, 'live_shopify_response_predates_candidate');

  const guestCandidate = resolveShopifyIdentityResponse(request, [candidate(request, {
    shopify_customer_gid: null,
  })]);
  const guestFinal = finalizeShopifyLiveOrderResponse(guestCandidate, {
    ...live,
    shopify_customer_gid: null,
  });
  assert.equal(guestFinal.status, 'verified_live_guest_order');

  const forgedShape = finalizeShopifyLiveOrderResponse({
    ...candidateResult,
    candidate_kind: 'guest_order',
  }, live);
  assert.equal(forgedShape.status, 'blocked');
  assert.equal(forgedShape.reason_code, 'candidate_identity_shape_mismatch');
});

test('flattened customer_links and verification projections are exact and raw-PII free', () => {
  const link = projectCustomerLinkRow(socialLink());
  assert.deepEqual(Object.keys(link).sort(), [...CUSTOMER_LINK_FIELDS].sort());
  const verification = projectVerificationRow({
    brand_id: 'calapres',
    challenge_id: 'ver_synthetic0003',
    channel: 'instagram',
    contact_fingerprint: 'a'.repeat(64),
    contact_fingerprint_key_version: 'hmac-sha256-v2',
    challenge_hash: 'b'.repeat(64),
    challenge_key_version: 'hmac-sha256-v3',
    status: 'pending',
    attempt_count: 0,
    expires_at: '2026-08-11T15:10:00.000Z',
    consumed_at: null,
    correlation_id: 'calapres:synthetic:0003',
  });
  assert.deepEqual(Object.keys(verification).sort(), [...VERIFICATION_FIELDS].sort());
  const durable = JSON.stringify({ link, verification });
  assert.equal(durable.includes(fixture.whatsapp.source_identity), false);
  assert.equal(durable.includes(fixture.email.source_identity), false);
  assert.equal(durable.includes(fixture.instagram.source_identity), false);
  assert.throws(() => projectCustomerLinkRow({
    ...socialLink(),
    email: fixture.email.source_identity,
  }), /contain exactly/);
});

test('brand mismatch and invalid local phone guesses fail closed', () => {
  assert.throws(() => buildShopifyIdentityRequest(inputFor('whatsapp', {
    source_identity: '0500000001',
  })), /exact E\.164/);
  const request = buildShopifyIdentityRequest(inputFor('whatsapp'));
  const mismatch = resolveShopifyIdentityResponse(request, [candidate(request, {
    brand_id: 'future-brand',
  })]);
  assert.equal(mismatch.status, 'not_found');
});
