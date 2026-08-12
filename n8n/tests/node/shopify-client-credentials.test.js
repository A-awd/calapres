'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  buildAdminGraphqlRequest,
  buildTokenRequest,
  parseTokenResponse,
  shouldRenewAccessToken,
  TOKEN_TTL_SECONDS,
} = require('../../adapters/shopify-client-credentials');

const config = {
  shop_subdomain: 'unywbe-ub',
  client_id: '57867f0663034dd51682842b705f003a',
  client_secret: 'secret-value-that-never-gets-logged',
};

test('client credentials request uses the exact myshopify subdomain and never changes scopes', () => {
  const request = buildTokenRequest(config);
  assert.equal(request.url, 'https://unywbe-ub.myshopify.com/admin/oauth/access_token');
  assert.equal(request.body.grant_type, 'client_credentials');
  assert.equal(request.body.client_id, config.client_id);
  assert.equal(request.body.client_secret, config.client_secret);
  assert.equal(JSON.stringify(request).includes('calapres.com'), false);
});

test('token response is accepted only with the expected TTL and read scopes', () => {
  const token = parseTokenResponse({
    access_token: 'shpat_readonly_token_1234567890',
    scope: 'read_orders read_products read_inventory read_locations',
    expires_in: TOKEN_TTL_SECONDS,
  }, 1000);
  assert.equal(token.issued_at_epoch_seconds, 1000);
  assert.equal(token.expires_at_epoch_seconds, 1000 + TOKEN_TTL_SECONDS);
  assert.deepEqual(token.scopes, ['read_inventory', 'read_locations', 'read_orders', 'read_products']);
  assert.throws(() => parseTokenResponse({
    access_token: 'shpat_readonly_token_1234567890',
    scope: 'read_orders write_orders',
    expires_in: TOKEN_TTL_SECONDS,
  }, 1000), /non-read scope/);
});

test('renewal happens before expiry and is safe with a missing cache', () => {
  assert.equal(shouldRenewAccessToken({
    issued_at_epoch_seconds: 1000,
    expires_at_epoch_seconds: 1000 + TOKEN_TTL_SECONDS,
    now_epoch_seconds: 1000 + TOKEN_TTL_SECONDS - 301,
  }), false);
  assert.equal(shouldRenewAccessToken({
    issued_at_epoch_seconds: 1000,
    expires_at_epoch_seconds: 1000 + TOKEN_TTL_SECONDS,
    now_epoch_seconds: 1000 + TOKEN_TTL_SECONDS - 300,
  }), true);
  assert.equal(shouldRenewAccessToken({
    issued_at_epoch_seconds: null,
    expires_at_epoch_seconds: null,
    now_epoch_seconds: 1000,
  }), true);
});

test('Admin API request is read-token based and uses no write operation', () => {
  const request = buildAdminGraphqlRequest({
    shop_subdomain: 'unywbe-ub',
    access_token: 'shpat_readonly_token_1234567890',
    api_version: '2026-07',
    query: 'query Orders($query: String) { orders(first: 1, query: $query) { nodes { id } } }',
    variables: { query: 'test' },
  });
  assert.match(request.url, /unywbe-ub\.myshopify\.com\/admin\/api\/2026-07\/graphql\.json$/);
  assert.equal(request.body.variables.query, 'test');
  assert.equal(JSON.stringify(request).includes('mutation'), false);
});
