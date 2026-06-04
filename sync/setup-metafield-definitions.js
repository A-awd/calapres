/**
 * Builds Shopify Admin GraphQL request shapes for Calapres supplier metafield definitions.
 *
 * No request is executed unless executeSetupRequest() receives a fetch-like function.
 */
const config = require('./config.js');

const DEFAULT_API_VERSION = config.API_VERSION_STANDARD;
const SUPPLIER_DEFINITIONS = [
  {
    name: 'Supplier Source URL',
    namespace: config.NAMESPACES.supplier,
    key: config.METAFIELDS.sourceUrl,
    description: 'Canonical Nawadirdior product URL used by the Calapres supplier sync.',
    type: 'single_line_text_field',
    ownerType: 'PRODUCT',
    pin: true,
    access: {
      admin: 'MERCHANT_READ_WRITE'
    },
    capabilities: {
      adminFilterable: {
        enabled: true
      }
    }
  },
  {
    name: 'Supplier Product ID',
    namespace: config.NAMESPACES.supplier,
    key: config.METAFIELDS.productId,
    description: 'Nawadirdior Salla product id parsed from the supplier product URL.',
    type: 'single_line_text_field',
    ownerType: 'PRODUCT',
    pin: true,
    access: {
      admin: 'MERCHANT_READ_WRITE'
    },
    capabilities: {
      adminFilterable: {
        enabled: true
      }
    }
  }
];

function buildMetafieldDefinitionCreateRequest(options) {
  const config = normalizeOptions(options);
  const definition = normalizeDefinition(config.definition || definitionForKey(config.key));
  return {
    method: 'POST',
    url: adminGraphqlUrl(config.shopDomain, config.apiVersion),
    headers: requestHeaders(config.accessToken),
    body: {
      query: METAFIELD_DEFINITION_CREATE_MUTATION,
      variables: {
        definition
      }
    }
  };
}

function buildSupplierMetafieldDefinitionRequests(options) {
  return SUPPLIER_DEFINITIONS.map((definition) =>
    buildMetafieldDefinitionCreateRequest({
      ...(options || {}),
      definition
    })
  );
}

async function executeSetupRequest(request, fetchLike) {
  if (typeof fetchLike !== 'function') {
    throw new Error('executeSetupRequest requires a fetch-like function');
  }
  const response = await fetchLike(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(request.body)
  });
  const text = typeof response.text === 'function' ? await response.text() : '';
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (error) {
      json = null;
    }
  }
  return {
    ok: Boolean(response.ok),
    status: response.status,
    text,
    json
  };
}

function definitionForKey(key) {
  const cleanKey = String(key || '').trim();
  const definition = SUPPLIER_DEFINITIONS.find((item) => item.key === cleanKey);
  if (!definition) throw new Error('Unknown supplier metafield definition key: ' + cleanKey);
  return definition;
}

function normalizeDefinition(definition) {
  if (!definition || typeof definition !== 'object') throw new Error('Metafield definition must be an object');
  return clone({
    name: definition.name,
    namespace: definition.namespace || 'supplier',
    key: definition.key,
    description: definition.description || '',
    type: definition.type || 'single_line_text_field',
    ownerType: definition.ownerType || 'PRODUCT',
    pin: definition.pin !== false,
    access: definition.access || { admin: 'MERCHANT_READ_WRITE' },
    capabilities: definition.capabilities || { adminFilterable: { enabled: true } }
  });
}

function normalizeOptions(options) {
  const config = options && typeof options === 'object' ? options : {};
  return {
    ...config,
    shopDomain: normalizeShopDomain(config.shopDomain || config.shop || config.domain || configModuleShopDomain()),
    apiVersion: String(config.apiVersion || DEFAULT_API_VERSION).trim()
  };
}

function configModuleShopDomain() {
  return config.SHOP_DOMAIN;
}

function adminGraphqlUrl(shopDomain, apiVersion) {
  return 'https://' + normalizeShopDomain(shopDomain) + '/admin/api/' + String(apiVersion || DEFAULT_API_VERSION).trim() + '/graphql.json';
}

function normalizeShopDomain(value) {
  const raw = String(value || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (!raw) throw new Error('Shopify shop domain is required');
  return raw;
}

function requestHeaders(accessToken) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  if (accessToken) headers['X-Shopify-Access-Token'] = String(accessToken);
  return headers;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const METAFIELD_DEFINITION_CREATE_MUTATION = `
mutation CalapresCreateSupplierMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      name
      namespace
      key
      ownerType
      pinnedPosition
      type {
        name
      }
      access {
        admin
      }
      capabilities {
        adminFilterable {
          eligible
          enabled
          status
        }
      }
    }
    userErrors {
      field
      message
      code
    }
  }
}`;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_API_VERSION,
    SUPPLIER_DEFINITIONS,
    METAFIELD_DEFINITION_CREATE_MUTATION,
    buildMetafieldDefinitionCreateRequest,
    buildSupplierMetafieldDefinitionRequests,
    executeSetupRequest,
    definitionForKey
  };
}
