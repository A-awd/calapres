'use strict';

const SHOP_SUBDOMAIN = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;
const API_VERSION = /^20[0-9]{2}-[0-9]{2}$/;
const CUSTOMER_GID = /^gid:\/\/shopify\/Customer\/[1-9][0-9]{0,30}$/;
const PHONE = /^\+[1-9][0-9]{7,14}$/;

const CUSTOMER_LOOKUP_QUERY = `query CustomerByPhone($query: String!) {
  customers(first: 10, query: $query) {
    nodes { id phone firstName displayName }
  }
}`;

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

function buildShopifyCustomerPhoneLookupRequest(input) {
  exactObject(input, ['shop_subdomain', 'api_version', 'phone'], 'Shopify customer lookup');
  if (!SHOP_SUBDOMAIN.test(input.shop_subdomain)) fail('shop_subdomain is invalid');
  if (!API_VERSION.test(input.api_version)) fail('api_version is invalid');
  if (!PHONE.test(input.phone)) fail('phone must be exact E.164');
  return Object.freeze({
    method: 'POST',
    url: `https://${input.shop_subdomain}.myshopify.com/admin/api/${input.api_version}/graphql.json`,
    headers: Object.freeze({ 'content-type': 'application/json' }),
    body: Object.freeze({ query: CUSTOMER_LOOKUP_QUERY, variables: { query: `phone:${input.phone}` } }),
    transient_pii: true,
    persistable: false,
  });
}

function finalizeShopifyCustomerPhoneLookup(response, expectedPhone) {
  exactObject(response, ['data', 'errors'], 'Shopify customer lookup response');
  if (!PHONE.test(expectedPhone)) fail('expectedPhone must be exact E.164');
  if (response.errors !== null && (!Array.isArray(response.errors) || response.errors.length > 0)) {
    return { status: 'unavailable', reason_code: 'shopify_graphql_error', customer: null, persistable: false };
  }
  const data = response.data;
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      !data.customers || !Array.isArray(data.customers.nodes)) {
    return { status: 'unavailable', reason_code: 'shopify_customer_response_invalid', customer: null, persistable: false };
  }
  const exact = data.customers.nodes.filter((node) => node && typeof node === 'object' &&
    CUSTOMER_GID.test(node.id || '') && node.phone === expectedPhone);
  if (exact.length === 0) return { status: 'not_found', reason_code: 'customer_not_found', customer: null, persistable: false };
  if (exact.length !== 1) return { status: 'ambiguous', reason_code: 'customer_match_ambiguous', customer: null, persistable: false };
  const node = exact[0];
  return {
    status: 'matched',
    reason_code: null,
    customer: { customer_gid: node.id, first_name: node.firstName || null, display_name: node.displayName || null },
    persistable: false,
  };
}

module.exports = { CUSTOMER_LOOKUP_QUERY, buildShopifyCustomerPhoneLookupRequest, finalizeShopifyCustomerPhoneLookup };
