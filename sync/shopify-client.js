/**
 * Shopify Admin API request-shape helpers for the Calapres supplier sync.
 *
 * These helpers are dependency-free and do not make network calls unless a caller
 * explicitly passes a fetch-like function to executeShopifyRequest().
 */
const config = require('./config.js');

const DEFAULT_API_VERSION = config.API_VERSION_STANDARD;
const IMPORTED_TAG = config.TAGS.imported;
const ARABIC_IMPORTED_TAG = config.TAGS.importedArabic;
const IMPORTED_TAGS = [IMPORTED_TAG, ARABIC_IMPORTED_TAG];
const IMPORTED_PRODUCTS_SEARCH_QUERY = config.IMPORTED_PRODUCTS_SEARCH_QUERY;
const SUPPLIER_TAG = config.TAGS.supplier;
const SUPPLIER_ID_TAG_PREFIX = config.TAGS.idPrefix;
const SOURCE_NAMESPACE = config.NAMESPACES.supplier;
const SOURCE_URL_KEY = config.METAFIELDS.sourceUrl;
const SOURCE_PRODUCT_ID_KEY = config.METAFIELDS.productId;

function buildLookupProductRequest(options) {
  const config = normalizeOptions(options);
  const sourceUrl = cleanString(config.sourceUrl);
  const supplierId = cleanString(config.supplierId) || productIdFromUrl(sourceUrl);
  const sourceFilter = sourceUrl
    ? 'metafields.' + SOURCE_NAMESPACE + '.' + SOURCE_URL_KEY + ':' + quoteSearchValue(sourceUrl)
    : '';
  const tagFilter = supplierId ? 'tag:' + quoteSearchValue(supplierIdTag(supplierId)) : '';
  const query = [sourceFilter, tagFilter, IMPORTED_PRODUCTS_SEARCH_QUERY].filter(Boolean).join(' OR ');

  return buildGraphqlRequest({
    shopDomain: config.shopDomain,
    apiVersion: config.apiVersion,
    body: {
      query: PRODUCT_LOOKUP_QUERY,
      variables: {
        first: clampFirst(config.first || 10),
        query
      }
    }
  });
}

function buildCreateProductRequest(options) {
  const config = normalizeOptions(options);
  const product = normalizeProductBody(config.product || config.payload);
  return buildRestRequest({
    shopDomain: config.shopDomain,
    apiVersion: config.apiVersion,
    method: 'POST',
    path: '/products.json',
    body: { product }
  });
}

function buildUpdateProductRequest(options) {
  const config = normalizeOptions(options);
  const product = normalizeProductBody(config.product || config.payload);
  const productId = cleanString(config.productId || product.id);
  if (!productId) throw new Error('buildUpdateProductRequest requires productId or product.id');
  product.id = toRestId(productId);
  return buildRestRequest({
    shopDomain: config.shopDomain,
    apiVersion: config.apiVersion,
    method: 'PUT',
    path: '/products/' + encodeURIComponent(toRestId(productId)) + '.json',
    body: { product }
  });
}

function buildUpdatePriceAvailabilityRequest(options) {
  const config = normalizeOptions(options);
  const productId = cleanString(config.productId || (config.product && config.product.id));
  if (!productId) throw new Error('buildUpdatePriceAvailabilityRequest requires productId');

  const variantInput = config.variant || (config.product && config.product.variants && config.product.variants[0]) || {};
  const variant = compactObject({
    id: variantInput.id === undefined ? undefined : toRestId(variantInput.id),
    price: variantInput.price,
    compare_at_price: variantInput.compare_at_price,
    inventory_policy: variantInput.inventory_policy
  });
  const product = compactObject({
    id: toRestId(productId),
    status: config.status || (config.product && config.product.status),
    variants: [variant]
  });

  return buildRestRequest({
    shopDomain: config.shopDomain,
    apiVersion: config.apiVersion,
    method: 'PUT',
    path: '/products/' + encodeURIComponent(toRestId(productId)) + '.json',
    body: { product }
  });
}

function buildListImportedProductsRequest(options) {
  const config = normalizeOptions(options);
  return buildGraphqlRequest({
    shopDomain: config.shopDomain,
    apiVersion: config.apiVersion,
    body: {
      query: IMPORTED_PRODUCTS_QUERY,
      variables: {
        first: clampFirst(config.first || 250),
        after: config.after || null,
        query: buildImportedProductsSearchQuery()
      }
    }
  });
}

function buildListImportedProductsPageRequest(options) {
  return buildListImportedProductsRequest(options);
}

function buildListAllImportedProductsRequests(options) {
  const config = normalizeOptions(options);
  const cursors = Array.isArray(config.cursors) && config.cursors.length ? config.cursors : [null];
  return cursors.map((after) =>
    buildListImportedProductsRequest({
      ...config,
      after,
      first: config.first || 250
    })
  );
}

function buildMetafieldsSetRequest(options) {
  const config = normalizeOptions(options);
  const metafields = (config.metafields || []).map((field) => ({
    ownerId: field.ownerId || toGraphqlProductId(field.productId || config.productId),
    namespace: field.namespace || SOURCE_NAMESPACE,
    key: field.key,
    type: field.type || 'single_line_text_field',
    value: String(field.value === undefined || field.value === null ? '' : field.value)
  }));
  if (!metafields.length) throw new Error('buildMetafieldsSetRequest requires metafields');
  return buildGraphqlRequest({
    shopDomain: config.shopDomain,
    apiVersion: config.apiVersion,
    body: {
      query: METAFIELDS_SET_MUTATION,
      variables: { metafields }
    }
  });
}

function buildCollectionAddProductsRequest(options) {
  const config = normalizeOptions(options);
  const collectionId = toGraphqlCollectionId(config.collectionId);
  const productIds = (config.productIds || []).map(toGraphqlProductId).filter(Boolean);
  if (!collectionId || !productIds.length) throw new Error('buildCollectionAddProductsRequest requires collectionId and productIds');
  return buildGraphqlRequest({
    shopDomain: config.shopDomain,
    apiVersion: config.apiVersion,
    body: {
      query: COLLECTION_ADD_PRODUCTS_MUTATION,
      variables: { id: collectionId, productIds }
    }
  });
}

function buildSmartCollectionRuleShape(options) {
  const input = options && typeof options === 'object' ? options : {};
  return {
    title: cleanString(input.title || input.handle || 'Calapres Supplier Collection'),
    handle: cleanString(input.handle),
    rules: (input.rules || []).map((rule) => ({
      column: cleanString(rule.column || 'tag'),
      relation: cleanString(rule.relation || 'equals'),
      condition: cleanString(rule.condition)
    })),
    disjunctive: Boolean(input.disjunctive)
  };
}

function buildReadProductTagsRequest(options) {
  const config = normalizeOptions(options);
  const id = toGraphqlProductId(config.productId || config.id);
  if (!id) throw new Error('buildReadProductTagsRequest requires productId or id');
  return buildGraphqlRequest({
    shopDomain: config.shopDomain,
    apiVersion: config.apiVersion,
    body: {
      query: PRODUCT_TAGS_QUERY,
      variables: { id }
    }
  });
}

function buildGraphqlRequest(options) {
  const config = normalizeOptions(options);
  return {
    method: 'POST',
    url: adminGraphqlUrl(config.shopDomain, config.apiVersion),
    headers: requestHeaders(config.accessToken),
    body: config.body
  };
}

function buildRestRequest(options) {
  const config = normalizeOptions(options);
  return {
    method: config.method || 'GET',
    url: adminRestUrl(config.shopDomain, config.apiVersion, config.path),
    headers: requestHeaders(config.accessToken),
    body: config.body || null
  };
}

async function executeShopifyRequest(request, fetchLike) {
  if (typeof fetchLike !== 'function') {
    throw new Error('executeShopifyRequest requires a fetch-like function');
  }
  const response = await fetchLike(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body === null || request.body === undefined ? undefined : JSON.stringify(request.body)
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
    headers: response.headers,
    text,
    json
  };
}

function backoffMetadata(response, options) {
  const status = Number(response && response.status);
  const retryAfter = readHeader(response && response.headers, 'Retry-After');
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : null;
  const baseDelay = Number((options && options.baseDelaySeconds) || config.REQUEST_DELAY_SECONDS);
  const attempt = Math.max(1, Number((options && options.attempt) || 1));
  const waitSeconds =
    status === 429 && Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds
      : status === 429
        ? Math.min(60, baseDelay * Math.pow(2, attempt - 1))
        : baseDelay;
  return {
    shouldRetry: status === 429 || status >= 500,
    status,
    retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
    waitSeconds
  };
}

function pacingMetadata(options) {
  const delay = Number((options && options.requestDelaySeconds) || config.REQUEST_DELAY_SECONDS);
  return {
    waitSeconds: Number.isFinite(delay) && delay > 0 ? delay : config.REQUEST_DELAY_SECONDS,
    reason: 'shopify_admin_rate_pacing'
  };
}

function normalizeGraphqlProducts(response) {
  const nodes = readGraphqlNodes(response && response.json ? response.json : response);
  return nodes.map(normalizeGraphqlProduct).filter(Boolean);
}

function selectLookupProduct(response, criteria) {
  const sourceUrl = cleanString(criteria && criteria.sourceUrl);
  const supplierId = cleanString(criteria && criteria.supplierId) || productIdFromUrl(sourceUrl);
  const products = normalizeGraphqlProducts(response);
  return (
    products.find((product) => sourceUrl && cleanString(product.sourceUrl) === sourceUrl) ||
    products.find((product) => supplierId && product.supplierId === supplierId) ||
    null
  );
}

function normalizeGraphqlProduct(node) {
  if (!node || typeof node !== 'object') return null;
  const sourceUrl = readMetafieldValue(node.metafield) || readMetafieldValue(node.sourceUrlMetafield);
  const supplierProductId =
    normalizeSupplierProductId(
      readMetafieldValue(node.productIdMetafield) || supplierIdFromTags(node.tags || []) || productIdFromUrl(sourceUrl)
    );
  const variants = readGraphqlVariantNodes(node.variants).map((variant) => ({
    id: toRestId(variant.legacyResourceId || variant.id),
    graphqlId: variant.id,
    price: variant.price === undefined || variant.price === null ? null : String(variant.price),
    compare_at_price:
      variant.compareAtPrice === undefined || variant.compareAtPrice === null ? null : String(variant.compareAtPrice),
    inventory_policy: normalizeInventoryPolicy(variant.inventoryPolicy)
  }));
  return {
    id: toRestId(node.legacyResourceId || node.id),
    graphqlId: node.id,
    title: node.title || '',
    vendor: node.vendor || '',
    status: normalizeStatus(node.status),
    tags: Array.isArray(node.tags) ? node.tags.slice() : [],
    sourceUrl: sourceUrl || null,
    supplierId: supplierProductId || '',
    variants
  };
}

function readGraphqlNodes(response) {
  const products =
    response &&
    response.data &&
    (response.data.products || (response.data.product ? { nodes: [response.data.product] } : null));
  if (!products) return [];
  if (Array.isArray(products.nodes)) return products.nodes;
  if (Array.isArray(products.edges)) return products.edges.map((edge) => edge && edge.node).filter(Boolean);
  return [];
}

function readGraphqlVariantNodes(variants) {
  if (!variants) return [];
  if (Array.isArray(variants.nodes)) return variants.nodes;
  if (Array.isArray(variants.edges)) return variants.edges.map((edge) => edge && edge.node).filter(Boolean);
  return [];
}

function readMetafieldValue(metafield) {
  return metafield && metafield.value !== undefined && metafield.value !== null ? String(metafield.value) : '';
}

function normalizeProductBody(value) {
  const input = value && value.product ? value.product : value;
  if (!input || typeof input !== 'object') throw new Error('Product payload must be an object');
  return clone(input);
}

function normalizeOptions(options) {
  const input = options && typeof options === 'object' ? options : {};
  return {
    ...input,
    shopDomain: normalizeShopDomain(input.shopDomain || input.shop || input.domain || config.SHOP_DOMAIN),
    apiVersion: cleanString(input.apiVersion || DEFAULT_API_VERSION)
  };
}

function normalizeShopDomain(value) {
  const raw = cleanString(value).replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (!raw) throw new Error('Shopify shop domain is required');
  return raw;
}

function adminGraphqlUrl(shopDomain, apiVersion) {
  return 'https://' + normalizeShopDomain(shopDomain) + '/admin/api/' + cleanString(apiVersion || DEFAULT_API_VERSION) + '/graphql.json';
}

function adminRestUrl(shopDomain, apiVersion, path) {
  const cleanPath = String(path || '').charAt(0) === '/' ? String(path || '') : '/' + String(path || '');
  return 'https://' + normalizeShopDomain(shopDomain) + '/admin/api/' + cleanString(apiVersion || DEFAULT_API_VERSION) + cleanPath;
}

function requestHeaders(accessToken) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  if (accessToken) headers['X-Shopify-Access-Token'] = String(accessToken);
  return headers;
}

function quoteSearchValue(value) {
  return '"' + String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function clampFirst(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 250;
  return Math.max(1, Math.min(250, Math.floor(number)));
}

function buildImportedProductsSearchQuery() {
  return IMPORTED_PRODUCTS_SEARCH_QUERY;
}

function supplierIdTag(value) {
  const id = normalizeSupplierProductId(value);
  return id ? SUPPLIER_ID_TAG_PREFIX + id : '';
}

function normalizeSupplierProductId(value) {
  return String(value || '').replace(/^p/i, '').replace(/\D/g, '');
}

function supplierIdFromTags(tags) {
  for (const tag of normalizeTags(tags)) {
    const match = tag.match(/^supplier-id-p(\d+)$/i);
    if (match) return match[1];
  }
  return '';
}

function productIdFromUrl(value) {
  const match = String(value || '').match(/\/p(\d+)(?=$|[/?#])/i);
  return match ? match[1] : '';
}

function toGraphqlProductId(value) {
  const raw = cleanString(value);
  if (!raw) return '';
  if (raw.startsWith('gid://shopify/Product/')) return raw;
  const id = toRestId(raw);
  return id ? 'gid://shopify/Product/' + id : '';
}

function toGraphqlCollectionId(value) {
  const raw = cleanString(value);
  if (!raw) return '';
  if (raw.startsWith('gid://shopify/Collection/')) return raw;
  const id = toRestId(raw);
  return id ? 'gid://shopify/Collection/' + id : '';
}

function toRestId(value) {
  const raw = cleanString(value);
  if (!raw) return '';
  const match = raw.match(/(\d+)$/);
  return match ? match[1] : raw;
}

function normalizeStatus(value) {
  return cleanString(value).toLowerCase();
}

function normalizeInventoryPolicy(value) {
  return cleanString(value).toLowerCase();
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function cleanString(value) {
  return String(value || '').trim();
}

function compactObject(object) {
  const out = {};
  for (const key of Object.keys(object || {})) {
    if (object[key] !== undefined) out[key] = object[key];
  }
  return out;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readHeader(headers, name) {
  if (!headers || !name) return '';
  if (typeof headers.get === 'function') return headers.get(name) || headers.get(String(name).toLowerCase()) || '';
  const key = Object.keys(headers).find((header) => header.toLowerCase() === String(name).toLowerCase());
  return key ? headers[key] : '';
}

const PRODUCT_FIELDS = `
  id
  legacyResourceId
  title
  vendor
  status
  tags
  sourceUrlMetafield: metafield(namespace: "supplier", key: "source_url") { namespace key value type }
  productIdMetafield: metafield(namespace: "supplier", key: "product_id") { namespace key value type }
  variants(first: 1) {
    nodes {
      id
      legacyResourceId
      price
      compareAtPrice
      inventoryPolicy
    }
  }
`;

const PRODUCT_LOOKUP_QUERY = `
query CalapresLookupProduct($query: String!, $first: Int!) {
  products(first: $first, query: $query) {
    nodes {
      ${PRODUCT_FIELDS}
    }
  }
}`;

const IMPORTED_PRODUCTS_QUERY = `
query CalapresListImportedProducts($query: String!, $first: Int!, $after: String) {
  products(first: $first, after: $after, query: $query) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ${PRODUCT_FIELDS}
    }
  }
}`;

const PRODUCT_TAGS_QUERY = `
query CalapresReadProductTags($id: ID!) {
  product(id: $id) {
    id
    legacyResourceId
    title
    status
    tags
    sourceUrlMetafield: metafield(namespace: "supplier", key: "source_url") { namespace key value type }
    productIdMetafield: metafield(namespace: "supplier", key: "product_id") { namespace key value type }
    variants(first: 1) {
      nodes {
        id
        legacyResourceId
        price
        compareAtPrice
        inventoryPolicy
      }
    }
  }
}`;

const METAFIELDS_SET_MUTATION = `
mutation CalapresMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id namespace key value type }
    userErrors { field message code }
  }
}`;

const COLLECTION_ADD_PRODUCTS_MUTATION = `
mutation CalapresCollectionAddProducts($id: ID!, $productIds: [ID!]!) {
  collectionAddProducts(id: $id, productIds: $productIds) {
    collection { id }
    userErrors { field message }
  }
}`;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_API_VERSION,
    IMPORTED_TAG,
    ARABIC_IMPORTED_TAG,
    IMPORTED_TAGS,
    IMPORTED_PRODUCTS_SEARCH_QUERY,
    SUPPLIER_TAG,
    SOURCE_NAMESPACE,
    SOURCE_URL_KEY,
    SOURCE_PRODUCT_ID_KEY,
    buildLookupProductRequest,
    buildCreateProductRequest,
    buildUpdateProductRequest,
    buildUpdatePriceAvailabilityRequest,
    buildListImportedProductsRequest,
    buildListImportedProductsPageRequest,
    buildListAllImportedProductsRequests,
    buildReadProductTagsRequest,
    buildMetafieldsSetRequest,
    buildCollectionAddProductsRequest,
    buildSmartCollectionRuleShape,
    buildGraphqlRequest,
    buildRestRequest,
    executeShopifyRequest,
    backoffMetadata,
    pacingMetadata,
    normalizeGraphqlProducts,
    selectLookupProduct,
    normalizeGraphqlProduct,
    adminGraphqlUrl,
    adminRestUrl,
    buildImportedProductsSearchQuery,
    supplierIdTag,
    normalizeSupplierProductId,
    supplierIdFromTags,
    productIdFromUrl,
    toGraphqlProductId,
    toGraphqlCollectionId,
    toRestId
  };
}
