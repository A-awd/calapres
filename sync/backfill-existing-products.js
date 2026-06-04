/**
 * Plans the one-time pre-sync backfill for the 18 live imported Calapres products.
 *
 * The audited source of truth is sync/backfill-map.json. This planner only emits
 * supplier metafield writes and tag updates; it never writes price, images,
 * descriptions, inventory, status, vendor, SEO, or product presentation fields.
 */
const config = require('./config.js');

const DEFAULT_API_VERSION = config.API_VERSION_STANDARD;
const CANONICAL_IMPORTED_TAG = config.TAGS.imported;
const ARABIC_IMPORTED_TAG = config.TAGS.importedArabic;
const IMPORTED_TAGS = [CANONICAL_IMPORTED_TAG, ARABIC_IMPORTED_TAG];
const SUPPLIER_ID_TAG_PREFIX = config.TAGS.idPrefix;
const CONFIDENT_MATCHES = { high: true, medium: true };
const NOT_FOUND_CONFIDENCE = 'not_found';

function planBackfillExistingProducts(existingProducts, backfillMap, options) {
  return planBackfillFromMap(backfillMap, {
    ...(options || {}),
    existingProducts
  });
}

function planBackfillFromMap(backfillMap, options) {
  const config = normalizeOptions(options);
  const entries = normalizeBackfillMap(backfillMap);
  const existingIndex = indexExistingProducts(config.existingProducts || config.products || []);
  const plan = {
    toBackfill: [],
    alreadyBackfilled: [],
    notFoundAtSupplier: [],
    needsManualMatch: []
  };

  for (const entry of entries) {
    if (entry.confidence === NOT_FOUND_CONFIDENCE) {
      plan.notFoundAtSupplier.push(review(entry, entry.reason || 'not_found_at_supplier'));
      continue;
    }

    const product = existingIndex.byId[entry.shopifyLegacyId];
    if (!product) {
      plan.needsManualMatch.push(review(entry, 'missing_shopify_product_snapshot'));
      continue;
    }
    if (!hasAnyTag(product.tags, IMPORTED_TAGS)) {
      plan.needsManualMatch.push(review(entry, 'missing_imported_tag_on_shopify_product'));
      continue;
    }
    if (!isConfidentMapEntry(entry)) {
      plan.needsManualMatch.push(review(entry, entry.reason || 'low_confidence_or_unmatched'));
      continue;
    }

    const supplierId = supplierIdDigits(entry.supplierProductId || productIdFromUrl(entry.matchedSourceUrl));
    if (!entry.matchedSourceUrl || !supplierId) {
      plan.needsManualMatch.push(review(entry, 'matched_entry_missing_source_url_or_supplier_id'));
      continue;
    }

    if (isBackfilled(product, entry.matchedSourceUrl, supplierId)) {
      plan.alreadyBackfilled.push(action(entry, product, supplierId, null));
      continue;
    }

    plan.toBackfill.push(
      action(
        entry,
        product,
        supplierId,
        buildBackfillRequests({
          shopDomain: config.shopDomain,
          apiVersion: config.apiVersion,
          accessToken: config.accessToken,
          productId: product.id || entry.shopifyLegacyId,
          sourceUrl: entry.matchedSourceUrl,
          supplierId,
          currentTags: product.tags
        })
      )
    );
  }

  return {
    ...plan,
    manualReview: plan.needsManualMatch,
    summary: {
      totalExisting: entries.length,
      highConfidence: entries.filter((entry) => entry.confidence === 'high').length,
      mediumConfidence: entries.filter((entry) => entry.confidence === 'medium').length,
      lowConfidence: entries.filter((entry) => entry.confidence === 'low').length,
      notFoundAtSupplier: plan.notFoundAtSupplier.length,
      confidentlyMatched: plan.toBackfill.length + plan.alreadyBackfilled.length,
      toBackfill: plan.toBackfill.length,
      alreadyBackfilled: plan.alreadyBackfilled.length,
      needsManualMatch: plan.needsManualMatch.length,
      manualReview: plan.needsManualMatch.length
    }
  };
}

function buildBackfillRequests(options) {
  const config = normalizeOptions(options);
  return {
    metafieldsSet: buildMetafieldsSetRequest(config),
    tagUpdate: buildTagUpdateRequest({
      ...config,
      tags: addBackfillTags(config.currentTags, config.supplierId)
    })
  };
}

function buildMetafieldsSetRequest(options) {
  const config = normalizeOptions(options);
  const ownerId = toGraphqlProductId(config.productId || config.id);
  const sourceUrl = cleanString(config.sourceUrl);
  const supplierId = supplierIdDigits(config.supplierId || config.supplierProductId || productIdFromUrl(sourceUrl));
  if (!ownerId) throw new Error('buildMetafieldsSetRequest requires productId');
  if (!sourceUrl || !supplierId) throw new Error('buildMetafieldsSetRequest requires sourceUrl and supplierId');
  return {
    method: 'POST',
    url: adminGraphqlUrl(config.shopDomain, config.apiVersion),
    headers: requestHeaders(config.accessToken),
    body: {
      query: METAFIELDS_SET_MUTATION,
      variables: {
        metafields: [
          {
            ownerId,
            namespace: 'supplier',
            key: 'source_url',
            type: 'single_line_text_field',
            value: sourceUrl
          },
          {
            ownerId,
            namespace: 'supplier',
            key: 'product_id',
            type: 'single_line_text_field',
            value: supplierId
          }
        ]
      }
    }
  };
}

function buildTagUpdateRequest(options) {
  const config = normalizeOptions(options);
  const productId = toRestId(config.productId || config.id);
  if (!productId) throw new Error('buildTagUpdateRequest requires productId');
  return {
    method: 'PUT',
    url: adminRestUrl(config.shopDomain, config.apiVersion, '/products/' + encodeURIComponent(productId) + '.json'),
    headers: requestHeaders(config.accessToken),
    body: {
      product: {
        id: productId,
        tags: normalizeTags(config.tags).join(', ')
      }
    }
  };
}

function normalizeBackfillMap(backfillMap) {
  return (backfillMap || []).map((raw) => {
    const item = raw && typeof raw === 'object' ? raw : {};
    const matchedSourceUrl = cleanString(item.matchedSourceUrl);
    const supplierProductId = normalizeSupplierProductId(item.supplierProductId || productIdFromUrl(matchedSourceUrl));
    return {
      shopifyLegacyId: cleanString(item.shopifyLegacyId),
      title: cleanString(item.title),
      brand: cleanString(item.brand),
      matchedSourceUrl: matchedSourceUrl || null,
      supplierProductId: supplierProductId || null,
      concentration: item.concentration === null || item.concentration === undefined ? null : cleanString(item.concentration),
      sizeMl: item.sizeMl === null || item.sizeMl === undefined ? null : Number(item.sizeMl),
      confidence: normalizeConfidence(item.confidence),
      reason: cleanString(item.reason)
    };
  });
}

function normalizeExistingProducts(products) {
  return (products || []).map((raw) => {
    const item = raw && typeof raw === 'object' ? raw : {};
    return {
      ...item,
      id: cleanString(item.shopifyLegacyId || item.legacyResourceId || item.id),
      title: cleanString(item.title),
      brand: cleanString(item.brand || item.vendor),
      tags: normalizeTags(item.tags),
      metafields: Array.isArray(item.metafields) ? item.metafields.slice() : []
    };
  });
}

function indexExistingProducts(products) {
  const byId = {};
  for (const product of normalizeExistingProducts(products)) {
    if (product.id) byId[product.id] = product;
  }
  return { byId };
}

function isConfidentMapEntry(entry) {
  return Boolean(entry && CONFIDENT_MATCHES[entry.confidence] && entry.matchedSourceUrl && entry.supplierProductId);
}

function isBackfilled(product, sourceUrl, supplierId) {
  return (
    readMetafield(product, 'supplier', 'source_url') === sourceUrl &&
    supplierIdDigits(readMetafield(product, 'supplier', 'product_id')) === supplierId &&
    hasTag(product.tags, CANONICAL_IMPORTED_TAG) &&
    hasTag(product.tags, supplierIdTag(supplierId))
  );
}

function action(entry, product, supplierId, requests) {
  const addedTags = addBackfillTags(product.tags, supplierId).filter((tag) => !hasTag(product.tags, tag));
  return {
    shopifyLegacyId: entry.shopifyLegacyId,
    productId: product.id || entry.shopifyLegacyId,
    title: entry.title || product.title,
    brand: entry.brand || product.brand,
    confidence: entry.confidence,
    reason: entry.reason,
    sourceUrl: entry.matchedSourceUrl,
    matchedSourceUrl: entry.matchedSourceUrl,
    supplierProductId: normalizeSupplierProductId(entry.supplierProductId || supplierId),
    supplierId,
    addedTags,
    requests
  };
}

function review(entry, reason) {
  return {
    shopifyLegacyId: entry.shopifyLegacyId,
    title: entry.title,
    brand: entry.brand,
    matchedSourceUrl: entry.matchedSourceUrl,
    supplierProductId: entry.supplierProductId,
    confidence: entry.confidence,
    reason
  };
}

function addBackfillTags(tags, supplierId) {
  return uniqueTags(normalizeTags(tags).concat([CANONICAL_IMPORTED_TAG, supplierIdTag(supplierId)]));
}

function readMetafield(product, namespace, key) {
  const metafields = Array.isArray(product.metafields) ? product.metafields : [];
  const found = metafields.find((field) => field && field.namespace === namespace && field.key === key);
  return found && found.value !== undefined && found.value !== null ? String(found.value) : '';
}

function supplierIdTag(value) {
  const id = supplierIdDigits(value);
  return id ? SUPPLIER_ID_TAG_PREFIX + id : '';
}

function supplierIdDigits(value) {
  const raw = cleanString(value);
  const match = raw.match(/^p?(\d+)$/i) || raw.match(/\/p(\d+)(?=$|[/?#])/i);
  return match ? match[1] : raw.replace(/\D/g, '');
}

function normalizeSupplierProductId(value) {
  const id = supplierIdDigits(value);
  return id ? 'p' + id : '';
}

function productIdFromUrl(value) {
  const match = String(value || '').match(/\/p(\d+)(?=$|[/?#])/i);
  return match ? match[1] : '';
}

function handleFromUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    const parts = parsed.pathname.split('/').filter(Boolean);
    const productIndex = parts.findIndex((part) => /^p\d+$/i.test(part));
    return productIndex > 0 ? parts[productIndex - 1] : parts[0] || '';
  } catch (error) {
    const match = String(value || '').match(/\/([^/?#]+)\/p\d+(?=$|[/?#])/i);
    return match ? match[1] : '';
  }
}

function normalizeTitle(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[اأإآ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleSimilarity(left, right) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (!leftTokens.length || !rightTokens.length) return 0;
  const rightMap = {};
  for (const token of rightTokens) rightMap[token] = true;
  let intersection = 0;
  for (const token of leftTokens) if (rightMap[token]) intersection += 1;
  const union = uniqueTags(leftTokens.concat(rightTokens)).length;
  return union ? Math.round((intersection / union) * 1000) / 1000 : 0;
}

function tokenSet(value) {
  const normalized = normalizeTitle(value);
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) || normalized.split(/\s+/);
  return uniqueTags(tokens.filter((token) => token.length > 1));
}

function toGraphqlProductId(value) {
  const raw = cleanString(value);
  if (!raw) return '';
  if (raw.startsWith('gid://shopify/Product/')) return raw;
  const id = toRestId(raw);
  return id ? 'gid://shopify/Product/' + id : '';
}

function toRestId(value) {
  const raw = cleanString(value);
  if (!raw) return '';
  const match = raw.match(/(\d+)$/);
  return match ? match[1] : raw;
}

function adminGraphqlUrl(shopDomain, apiVersion) {
  return 'https://' + normalizeShopDomain(shopDomain) + '/admin/api/' + String(apiVersion || DEFAULT_API_VERSION).trim() + '/graphql.json';
}

function adminRestUrl(shopDomain, apiVersion, requestPath) {
  const cleanPath = String(requestPath || '').charAt(0) === '/' ? String(requestPath || '') : '/' + String(requestPath || '');
  return 'https://' + normalizeShopDomain(shopDomain) + '/admin/api/' + String(apiVersion || DEFAULT_API_VERSION).trim() + cleanPath;
}

function normalizeOptions(options) {
  const config = options && typeof options === 'object' ? options : {};
  return {
    ...config,
    shopDomain: normalizeShopDomain(config.shopDomain || config.shop || config.domain || configModuleShopDomain()),
    apiVersion: cleanString(config.apiVersion || DEFAULT_API_VERSION)
  };
}

function configModuleShopDomain() {
  return config.SHOP_DOMAIN;
}

function normalizeShopDomain(value) {
  const raw = cleanString(value).replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
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

function normalizeConfidence(value) {
  const raw = cleanString(value).toLowerCase();
  if (raw === 'high' || raw === 'medium' || raw === 'low' || raw === NOT_FOUND_CONFIDENCE) return raw;
  return 'low';
}

function hasAnyTag(tags, targets) {
  return (targets || []).some((tag) => hasTag(tags, tag));
}

function hasTag(tags, target) {
  const key = cleanString(target).toLowerCase();
  return normalizeTags(tags).some((tag) => tag.toLowerCase() === key);
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function uniqueTags(tags) {
  const seen = {};
  const out = [];
  for (const tag of normalizeTags(tags)) {
    const key = tag.toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(tag);
    }
  }
  return out;
}

function cleanString(value) {
  return String(value || '').trim();
}

const METAFIELDS_SET_MUTATION = `
mutation CalapresBackfillSupplierMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      value
      type
      owner {
        ... on Product {
          id
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
    CANONICAL_IMPORTED_TAG,
    ARABIC_IMPORTED_TAG,
    IMPORTED_TAGS,
    SUPPLIER_ID_TAG_PREFIX,
    NOT_FOUND_CONFIDENCE,
    METAFIELDS_SET_MUTATION,
    planBackfillExistingProducts,
    planBackfillFromMap,
    buildBackfillRequests,
    buildMetafieldsSetRequest,
    buildTagUpdateRequest,
    normalizeBackfillMap,
    normalizeExistingProducts,
    addBackfillTags,
    supplierIdTag,
    supplierIdDigits,
    normalizeSupplierProductId,
    productIdFromUrl,
    handleFromUrl,
    normalizeTitle,
    titleSimilarity,
    toGraphqlProductId,
    toRestId
  };
}
