import { expr, ifElse, node, trigger, workflow } from '@n8n/workflow-sdk';

/*
 * Calapres Shopify Order Index v1 - HMAC-only source preview.
 *
 * The workflow is private, inactive source. It has no Shopify credential,
 * public webhook, Data Table write, customer message, or Shopify mutation.
 * A future signature-verified Shopify ingress must normalize transient values
 * and calculate keyed HMAC-SHA256 fingerprints before invoking this workflow.
 * Raw contact values and order payloads are outside this contract.
 */

const calledByVerifiedShopifyIngress = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.2,
  config: {
    name: 'Private HMAC-only Index Command',
    parameters: {
      inputSource: 'passthrough',
    },
    position: [160, 220],
  },
});

const manualTest = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Manual Sanitized Test Only',
    parameters: {},
    position: [160, 500],
  },
});

const createHmacOnlyFixture = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Create HMAC-only Shopify Fixture',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return [{
  json: {
    schema_version: '1.0',
    brand_id: 'calapres',
    source: 'shopify_order_event',
    operation: 'upsert',
    source_event_fingerprint: '4444444444444444444444444444444444444444444444444444444444444444',
    idempotency_fingerprint: '5555555555555555555555555555555555555555555555555555555555555555',
    record: {
      schema_version: '1.0',
      brand_id: 'calapres',
      shopify_order_gid: 'gid://shopify/Order/100000001',
      shopify_customer_gid: 'gid://shopify/Customer/200000001',
      order_name_fingerprint: '6666666666666666666666666666666666666666666666666666666666666666',
      email_fingerprint: '7777777777777777777777777777777777777777777777777777777777777777',
      buyer_phone_fingerprint: '8888888888888888888888888888888888888888888888888888888888888888',
      recipient_phone_fingerprint: null,
      fingerprint_key_version: 'hmac-sha256-v1',
      status_class: 'active',
      order_created_at: '2026-08-11T12:00:00.000Z',
      order_updated_at: '2026-08-11T12:05:00.000Z',
      indexed_at: '2026-08-11T12:05:01.000Z',
      expires_at: '2026-11-09T12:05:01.000Z'
    }
  }
}];
`,
    },
    position: [420, 500],
  },
});

const validateHmacOnlyCommand = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validate Exact HMAC-only Command',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const expectedKeys = new Set([
  'schema_version',
  'brand_id',
  'source',
  'operation',
  'source_event_fingerprint',
  'idempotency_fingerprint',
  'record'
]);
const expectedRecordKeys = new Set([
  'schema_version',
  'brand_id',
  'shopify_order_gid',
  'shopify_customer_gid',
  'order_name_fingerprint',
  'email_fingerprint',
  'buyer_phone_fingerprint',
  'recipient_phone_fingerprint',
  'fingerprint_key_version',
  'status_class',
  'order_created_at',
  'order_updated_at',
  'indexed_at',
  'expires_at'
]);
const sources = new Set(['shopify_order_event', 'shopify_reconciliation']);
const operations = new Set(['upsert', 'revoke']);
const statusClasses = new Set(['active', 'stale', 'revoked']);
const fingerprintPattern = /^[a-f0-9]{64}$/;
const keyVersionPattern = /^hmac-sha256-v[1-9][0-9]*$/;
const customerGidPattern = /^gid:\\/\\/shopify\\/Customer\\/[1-9][0-9]{0,30}$/;
const orderGidPattern = /^gid:\\/\\/shopify\\/Order\\/[1-9][0-9]{0,30}$/;

function timestamp(value) {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

return $input.all().map((item) => {
  const value = item.json && typeof item.json === 'object' && !Array.isArray(item.json)
    ? item.json
    : {};
  const issues = [];
  const unknownKeys = Object.keys(value).filter((key) => !expectedKeys.has(key));
  if (unknownKeys.length > 0) issues.push('unexpected_field');
  if (Object.keys(value).length !== expectedKeys.size) issues.push('required_field_missing');
  if (value.schema_version !== '1.0') issues.push('schema_version_invalid');
  if (value.brand_id !== 'calapres') issues.push('brand_not_calapres');
  if (!sources.has(value.source)) issues.push('source_invalid');
  if (!operations.has(value.operation)) issues.push('operation_invalid');
  if (!fingerprintPattern.test(value.source_event_fingerprint || '')) issues.push('source_event_fingerprint_invalid');
  if (!fingerprintPattern.test(value.idempotency_fingerprint || '')) issues.push('idempotency_fingerprint_invalid');
  const record = value.record && typeof value.record === 'object' && !Array.isArray(value.record)
    ? value.record
    : {};
  const unknownRecordKeys = Object.keys(record).filter((key) => !expectedRecordKeys.has(key));
  if (unknownRecordKeys.length > 0) issues.push('record_unexpected_field');
  if (Object.keys(record).length !== expectedRecordKeys.size) issues.push('record_required_field_missing');
  if (record.schema_version !== '1.0') issues.push('record_schema_version_invalid');
  if (record.brand_id !== 'calapres') issues.push('record_brand_not_calapres');
  if (!orderGidPattern.test(record.shopify_order_gid || '')) issues.push('order_gid_invalid');
  if (record.shopify_customer_gid !== null && !customerGidPattern.test(record.shopify_customer_gid || '')) issues.push('customer_gid_invalid');
  if (!fingerprintPattern.test(record.order_name_fingerprint || '')) issues.push('order_name_fingerprint_invalid');
  for (const field of ['email_fingerprint', 'buyer_phone_fingerprint', 'recipient_phone_fingerprint']) {
    if (record[field] !== null && !fingerprintPattern.test(record[field] || '')) issues.push(field + '_invalid');
  }
  if (!keyVersionPattern.test(record.fingerprint_key_version || '')) issues.push('fingerprint_key_version_invalid');
  if (!statusClasses.has(record.status_class)) issues.push('status_class_invalid');
  if (value.operation === 'revoke' && record.status_class !== 'revoked') issues.push('revoke_status_invalid');

  const orderCreatedAt = timestamp(record.order_created_at);
  const orderUpdatedAt = timestamp(record.order_updated_at);
  const indexedAt = timestamp(record.indexed_at);
  const expiresAt = timestamp(record.expires_at);
  if (orderCreatedAt === null || orderUpdatedAt === null || indexedAt === null || expiresAt === null) issues.push('timestamp_invalid');
  if (orderCreatedAt !== null && orderUpdatedAt !== null && orderCreatedAt > orderUpdatedAt) issues.push('order_timestamp_invalid');
  if (orderUpdatedAt !== null && indexedAt !== null && orderUpdatedAt > indexedAt) issues.push('source_newer_than_index');
  if (indexedAt !== null && expiresAt !== null && indexedAt >= expiresAt) issues.push('expiry_invalid');

  return {
    json: {
      accepted: issues.length === 0,
      reason_code: issues.length === 0 ? 'hmac_index_command_valid' : issues[0],
      command: issues.length === 0 ? value : null,
      customer_egress_allowed: false,
      shopify_write_allowed: false
    }
  };
});
`,
    },
    position: [720, 340],
  },
});

const commandAccepted = ifElse({
  version: 2.3,
  config: {
    name: 'HMAC-only Command Accepted?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            leftValue: expr('{{ $json.accepted }}'),
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            rightValue: '',
          },
        ],
        combinator: 'and',
      },
    },
    position: [1000, 340],
  },
});

const buildIndexPreview = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Order Index Record - Preview No Write',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => {
  const command = item.json.command;
  const record = command.record;
  const tableRow = {
    shopify_order_gid: record.shopify_order_gid,
    shopify_customer_gid: record.shopify_customer_gid,
    order_name_fingerprint: record.order_name_fingerprint,
    email_fingerprint: record.email_fingerprint,
    buyer_phone_fingerprint: record.buyer_phone_fingerprint,
    recipient_phone_fingerprint: record.recipient_phone_fingerprint,
    fingerprint_key_version: record.fingerprint_key_version,
    status_class: record.status_class,
    order_created_at: record.order_created_at,
    order_updated_at: record.order_updated_at,
    indexed_at: record.indexed_at,
    expires_at: record.expires_at
  };
  return {
    json: {
      accepted: true,
      reason_code: 'hmac_index_preview_built',
      persistence_preview: {
        table_id: 'cMp5lpr89DlUL6eT',
        required_operation: command.operation === 'revoke' ? 'revoke_exact_order' : 'upsert_exact_order',
        write_executed: false,
        idempotency_fingerprint: command.idempotency_fingerprint,
        source_event_fingerprint: command.source_event_fingerprint,
        table_row: tableRow
      },
      customer_egress_allowed: false,
      shopify_write_allowed: false
    }
  };
});
`,
    },
    position: [1280, 220],
  },
});

const buildRejectedPreview = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Fail-Closed Index Rejection',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => ({
  json: {
    accepted: false,
    decision: 'no_action',
    reason_code: item.json.reason_code || 'hmac_index_command_rejected',
    persistence_preview: {
      table_id: 'cMp5lpr89DlUL6eT',
      required_operation: 'none',
      write_executed: false,
      table_row: null
    },
    customer_egress_allowed: false,
    shopify_write_allowed: false
  }
}));
`,
    },
    position: [1280, 480],
  },
});

export default workflow('calapres-shopify-order-index-v1', 'Calapres | Shopify Order Index v1')
  .add(calledByVerifiedShopifyIngress)
  .to(validateHmacOnlyCommand)
  .to(commandAccepted.onTrue(buildIndexPreview).onFalse(buildRejectedPreview))
  .add(manualTest)
  .to(createHmacOnlyFixture)
  .to(validateHmacOnlyCommand);
