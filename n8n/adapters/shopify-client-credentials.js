'use strict';

const SHOP_SUBDOMAIN = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;
const CLIENT_ID = /^[A-Za-z0-9_-]{12,200}$/;
const ACCESS_TOKEN = /^[A-Za-z0-9_-]{20,512}$/;
const API_VERSION = /^20[0-9]{2}-[0-9]{2}$/;
const READ_SCOPES = new Set([
  'read_inventory',
  'read_locations',
  'read_orders',
  'read_products',
]);
const TOKEN_TTL_SECONDS = 24 * 60 * 60;
const RENEWAL_SKEW_SECONDS = 5 * 60;

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

function validateConfig(config) {
  exactObject(config, ['shop_subdomain', 'client_id', 'client_secret'], 'Shopify client credentials');
  if (typeof config.shop_subdomain !== 'string' || !SHOP_SUBDOMAIN.test(config.shop_subdomain)) {
    fail('shop_subdomain must be the exact myshopify.com subdomain');
  }
  if (typeof config.client_id !== 'string' || !CLIENT_ID.test(config.client_id)) {
    fail('client_id is invalid');
  }
  if (typeof config.client_secret !== 'string' || config.client_secret.length < 16 ||
      /[\r\n]/.test(config.client_secret)) {
    fail('client_secret is invalid');
  }
  return true;
}

function buildTokenRequest(config) {
  validateConfig(config);
  return Object.freeze({
    method: 'POST',
    url: `https://${config.shop_subdomain}.myshopify.com/admin/oauth/access_token`,
    headers: Object.freeze({ 'content-type': 'application/x-www-form-urlencoded' }),
    body: Object.freeze({
      grant_type: 'client_credentials',
      client_id: config.client_id,
      client_secret: config.client_secret,
    }),
  });
}

function parseScope(scope) {
  if (typeof scope !== 'string' || scope.trim() === '') fail('Shopify token scope is invalid');
  const scopes = [...new Set(scope.trim().split(/\s+/))].sort();
  if (scopes.length === 0 || scopes.some((item) => !READ_SCOPES.has(item))) {
    fail('Shopify token contains a non-read scope');
  }
  return scopes;
}

function parseTokenResponse(payload, nowEpochSeconds) {
  exactObject(payload, ['access_token', 'scope', 'expires_in'], 'Shopify token response');
  if (typeof nowEpochSeconds !== 'number' || !Number.isSafeInteger(nowEpochSeconds) || nowEpochSeconds < 0) {
    fail('now_epoch_seconds is invalid');
  }
  if (typeof payload.access_token !== 'string' || !ACCESS_TOKEN.test(payload.access_token)) {
    fail('Shopify access_token is invalid');
  }
  if (payload.expires_in !== TOKEN_TTL_SECONDS) fail('Shopify token TTL is unexpected');
  const scopes = parseScope(payload.scope);
  return Object.freeze({
    access_token: payload.access_token,
    scopes,
    issued_at_epoch_seconds: nowEpochSeconds,
    expires_at_epoch_seconds: nowEpochSeconds + payload.expires_in,
  });
}

function shouldRenewAccessToken(state) {
  exactObject(state, ['issued_at_epoch_seconds', 'expires_at_epoch_seconds', 'now_epoch_seconds'], 'token state');
  return !Number.isSafeInteger(state.issued_at_epoch_seconds) ||
    !Number.isSafeInteger(state.expires_at_epoch_seconds) ||
    !Number.isSafeInteger(state.now_epoch_seconds) ||
    state.expires_at_epoch_seconds - state.now_epoch_seconds <= RENEWAL_SKEW_SECONDS;
}

function buildAdminGraphqlRequest(input) {
  exactObject(input, ['shop_subdomain', 'access_token', 'api_version', 'query', 'variables'], 'Shopify API request');
  if (typeof input.shop_subdomain !== 'string' || !SHOP_SUBDOMAIN.test(input.shop_subdomain)) {
    fail('shop_subdomain is invalid');
  }
  if (typeof input.access_token !== 'string' || !ACCESS_TOKEN.test(input.access_token)) {
    fail('access_token is invalid');
  }
  if (typeof input.api_version !== 'string' || !API_VERSION.test(input.api_version)) fail('api_version is invalid');
  if (typeof input.query !== 'string' || input.query.trim() === '') fail('query is invalid');
  if (!input.variables || typeof input.variables !== 'object' || Array.isArray(input.variables)) {
    fail('variables must be an object');
  }
  return Object.freeze({
    method: 'POST',
    url: `https://${input.shop_subdomain}.myshopify.com/admin/api/${input.api_version}/graphql.json`,
    headers: Object.freeze({
      'content-type': 'application/json',
      'x-shopify-access-token': input.access_token,
    }),
    body: Object.freeze({ query: input.query, variables: input.variables }),
  });
}

module.exports = {
  READ_SCOPES,
  RENEWAL_SKEW_SECONDS,
  TOKEN_TTL_SECONDS,
  buildAdminGraphqlRequest,
  buildTokenRequest,
  parseTokenResponse,
  shouldRenewAccessToken,
  validateConfig,
};
