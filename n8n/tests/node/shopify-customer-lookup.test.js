'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  buildShopifyCustomerPhoneLookupRequest,
  finalizeShopifyCustomerPhoneLookup,
} = require('../../adapters/shopify-customer-lookup');

const phone = '+966501234567';

test('customer phone lookup is exact, read-only, and transient', () => {
  const request = buildShopifyCustomerPhoneLookupRequest({
    shop_subdomain: 'unywbe-ub', api_version: '2026-07', phone,
  });
  assert.match(request.url, /unywbe-ub\.myshopify\.com\/admin\/api\/2026-07\/graphql\.json$/);
  assert.match(request.body.query, /customers\(first: 10/);
  assert.equal(request.body.variables.query, 'phone:' + phone);
  assert.equal(request.persistable, false);
  assert.equal(request.transient_pii, true);
  assert.throws(() => buildShopifyCustomerPhoneLookupRequest({
    shop_subdomain: 'unywbe-ub', api_version: '2026-07', phone: '0501234567',
  }), /E\.164/);
});

test('customer lookup fails closed on zero or multiple exact matches', () => {
  const base = { data: { customers: { nodes: [] } }, errors: null };
  assert.equal(finalizeShopifyCustomerPhoneLookup(base, phone).status, 'not_found');
  const node = { id: 'gid://shopify/Customer/200000001', phone, firstName: 'A', displayName: 'A' };
  assert.equal(finalizeShopifyCustomerPhoneLookup({ data: { customers: { nodes: [node] } }, errors: null }, phone).status, 'matched');
  assert.equal(finalizeShopifyCustomerPhoneLookup({ data: { customers: { nodes: [node, { ...node, id: 'gid://shopify/Customer/200000002' }] } }, errors: null }, phone).status, 'ambiguous');
});

test('customer lookup never treats a mismatched returned phone as a match', () => {
  const result = finalizeShopifyCustomerPhoneLookup({
    data: { customers: { nodes: [{ id: 'gid://shopify/Customer/200000001', phone: '+966501234568', firstName: 'A', displayName: 'A' }] } },
    errors: null,
  }, phone);
  assert.equal(result.status, 'not_found');
});
