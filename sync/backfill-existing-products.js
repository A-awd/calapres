/**
 * Plans the one-time pre-sync backfill for existing imported Calapres products.
 *
 * The planner only emits tag/metafield request shapes. It never writes price,
 * images, descriptions, inventory, or status.
 */
const DEFAULT_API_VERSION = '2026-04';
const IMPORTED_TAG = 'imported-nader-dior';
const SUPPLIER_TAG = 'supplier:nawadirdior';
const SUPPLIER_ID_TAG_PREFIX = 'supplier-id-p';

function planBackfillExistingProducts(existingProducts, supplierProducts, options) {
  const config = normalizeOptions(options);
  const supplierIndex = indexSupplierProducts(supplierProducts);
  const plan = {
    toBackfill: [],
    alreadyBackfilled: [],
    manualReview: []
  };

  for (const product of normalizeExistingProducts(existingProducts)) {
    if (!hasTag(product.tags, IMPORTED_TAG)) {
      plan.manualReview.push(review(product, 'missing_imported_tag', []));
      continue;
    }

    const match = findBestMatch(product, supplierIndex);
    if (!match || !match.supplierProduct) {
      plan.manualReview.push(review(product, 'no_confident_supplier_match', match ? match.candidates : []));
      continue;
    }
    if (!match.confident) {
      plan.manualReview.push(review(product, match.reason || 'weak_or_ambiguous_supplier_match', match.candidates));
      continue;
    }

    if (isBackfilled(product, match.supplierProduct)) {
      plan.alreadyBackfilled.push(action(product, match.supplierProduct, match, null));
      continue;
    }

    plan.toBackfill.push(
      action(product, match.supplierProduct, match, buildBackfillRequests(product, match.supplierProduct, config))
    );
  }

  return {
    ...plan,
    summary: {
      totalExisting: normalizeExistingProducts(existingProducts).length,
      confidentlyMatched: plan.toBackfill.length + plan.alreadyBackfilled.length,
      toBackfill: plan.toBackfill.length,
      alreadyBackfilled: plan.alreadyBackfilled.length,
      manualReview: plan.manualReview.length
    }
  };
}

function buildBackfillRequests(product, supplierProduct, config) {
  return {
    metafieldsSet: buildMetafieldsSetRequest({
      shopDomain: config.shopDomain,
      apiVersion: config.apiVersion,
      productId: product.id,
      sourceUrl: supplierProduct.sourceUrl,
      supplierId: supplierProduct.supplierId
    }),
    tagUpdate: buildTagUpdateRequest({
      shopDomain: config.shopDomain,
      apiVersion: config.apiVersion,
      productId: product.id,
      tags: addRequiredTags(product.tags, supplierProduct.supplierId)
    })
  };
}

function buildMetafieldsSetRequest(options) {
  const config = normalizeOptions(options);
  const ownerId = toGraphqlProductId(config.productId || config.id);
  if (!ownerId) throw new Error('buildMetafieldsSetRequest requires productId');
  const sourceUrl = cleanString(config.sourceUrl);
  const supplierId = cleanString(config.supplierId || productIdFromUrl(sourceUrl));
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

function findBestMatch(product, supplierIndex) {
  const exact = exactMatch(product, supplierIndex);
  if (exact) return exact;

  const candidates = [];
  for (const supplierProduct of supplierIndex.products) {
    const score = titleSimilarity(product.title, supplierProduct.name);
    if (score >= 0.72) {
      candidates.push({
        supplierProduct,
        method: 'title_similarity',
        confidence: roundScore(score)
      });
    }
  }
  candidates.sort((a, b) => b.confidence - a.confidence);
  if (!candidates.length) return { confident: false, reason: 'no_confident_supplier_match', candidates: [] };
  if (candidates.length > 1 && candidates[0].confidence === candidates[1].confidence) {
    return { confident: false, reason: 'ambiguous_supplier_match', candidates: summarizeCandidates(candidates.slice(0, 5)) };
  }
  if (candidates[0].confidence < 0.78) {
    return { confident: false, reason: 'weak_supplier_match', candidates: summarizeCandidates(candidates.slice(0, 5)) };
  }
  return {
    confident: true,
    method: candidates[0].method,
    confidence: candidates[0].confidence,
    supplierProduct: candidates[0].supplierProduct,
    candidates: summarizeCandidates(candidates.slice(0, 5))
  };
}

function exactMatch(product, supplierIndex) {
  const sourceUrl = readMetafield(product, 'supplier', 'source_url') || product.sourceUrl;
  const supplierId = readMetafield(product, 'supplier', 'product_id') || supplierIdFromTags(product.tags);
  if (sourceUrl && supplierIndex.bySourceUrl[sourceUrl]) {
    return confident('source_url', 1, supplierIndex.bySourceUrl[sourceUrl]);
  }
  if (supplierId && supplierIndex.bySupplierId[supplierId]) {
    return confident('supplier_id', 1, supplierIndex.bySupplierId[supplierId]);
  }

  const handle = normalizeHandle(product.handle || handleFromUrl(product.onlineStoreUrl || product.url));
  if (handle && supplierIndex.byHandle[handle] && supplierIndex.byHandle[handle].length === 1) {
    return confident('handle', 0.96, supplierIndex.byHandle[handle][0]);
  }

  const titleKey = normalizeTitle(product.title);
  if (titleKey && supplierIndex.byTitle[titleKey] && supplierIndex.byTitle[titleKey].length === 1) {
    return confident('title_exact', 0.92, supplierIndex.byTitle[titleKey][0]);
  }
  if (titleKey && supplierIndex.byTitle[titleKey] && supplierIndex.byTitle[titleKey].length > 1) {
    return {
      confident: false,
      reason: 'ambiguous_title_match',
      candidates: summarizeCandidates(supplierIndex.byTitle[titleKey].slice(0, 5).map((supplierProduct) => ({ supplierProduct, confidence: 0.92, method: 'title_exact' })))
    };
  }

  return null;
}

function confident(method, confidence, supplierProduct) {
  return {
    confident: true,
    method,
    confidence,
    supplierProduct,
    candidates: summarizeCandidates([{ supplierProduct, method, confidence }])
  };
}

function indexSupplierProducts(products) {
  const index = {
    products: [],
    bySourceUrl: {},
    bySupplierId: {},
    byHandle: {},
    byTitle: {}
  };
  const seen = {};
  for (const raw of products || []) {
    const supplierProduct = normalizeSupplierProduct(raw);
    if (!supplierProduct.sourceUrl || !supplierProduct.supplierId || !supplierProduct.name) continue;
    if (seen[supplierProduct.supplierId]) continue;
    seen[supplierProduct.supplierId] = true;
    index.products.push(supplierProduct);
    index.bySourceUrl[supplierProduct.sourceUrl] = supplierProduct;
    index.bySupplierId[supplierProduct.supplierId] = supplierProduct;
    pushIndex(index.byHandle, supplierProduct.handle, supplierProduct);
    pushIndex(index.byTitle, normalizeTitle(supplierProduct.name), supplierProduct);
  }
  return index;
}

function normalizeSupplierProduct(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const sourceUrl = cleanString(item.sourceUrl);
  return {
    ...item,
    sourceUrl,
    supplierId: cleanString(item.supplierId || productIdFromUrl(sourceUrl)),
    handle: normalizeHandle(item.handle || handleFromUrl(sourceUrl)),
    name: cleanString(item.name)
  };
}

function normalizeExistingProducts(products) {
  return (products || []).map((raw) => {
    const item = raw && typeof raw === 'object' ? raw : {};
    return {
      ...item,
      id: cleanString(item.id),
      title: cleanString(item.title),
      handle: normalizeHandle(item.handle || handleFromUrl(item.onlineStoreUrl || item.url)),
      tags: normalizeTags(item.tags),
      metafields: Array.isArray(item.metafields) ? item.metafields.slice() : []
    };
  });
}

function action(product, supplierProduct, match, requests) {
  return {
    productId: product.id,
    title: product.title,
    matchMethod: match.method,
    confidence: match.confidence,
    sourceUrl: supplierProduct.sourceUrl,
    supplierId: supplierProduct.supplierId,
    addedTags: addRequiredTags(product.tags, supplierProduct.supplierId).filter((tag) => !hasTag(product.tags, tag)),
    requests
  };
}

function review(product, reason, candidates) {
  return {
    productId: product.id,
    title: product.title,
    handle: product.handle || '',
    reason,
    candidates: candidates || []
  };
}

function isBackfilled(product, supplierProduct) {
  return (
    readMetafield(product, 'supplier', 'source_url') === supplierProduct.sourceUrl &&
    readMetafield(product, 'supplier', 'product_id') === supplierProduct.supplierId &&
    hasTag(product.tags, SUPPLIER_ID_TAG_PREFIX + supplierProduct.supplierId) &&
    hasTag(product.tags, SUPPLIER_TAG)
  );
}

function addRequiredTags(tags, supplierId) {
  return uniqueTags(normalizeTags(tags).concat([IMPORTED_TAG, SUPPLIER_TAG, SUPPLIER_ID_TAG_PREFIX + supplierId]));
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
  return union ? intersection / union : 0;
}

function tokenSet(value) {
  const normalized = normalizeTitle(value);
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) || normalized.split(/\s+/);
  return uniqueTags(tokens.filter((token) => token.length > 1));
}

function summarizeCandidates(candidates) {
  return (candidates || []).map((candidate) => ({
    method: candidate.method,
    confidence: candidate.confidence,
    supplierId: candidate.supplierProduct.supplierId,
    sourceUrl: candidate.supplierProduct.sourceUrl,
    name: candidate.supplierProduct.name
  }));
}

function pushIndex(index, key, value) {
  if (!key) return;
  if (!index[key]) index[key] = [];
  index[key].push(value);
}

function readMetafield(product, namespace, key) {
  const metafields = Array.isArray(product.metafields) ? product.metafields : [];
  const found = metafields.find((field) => field && field.namespace === namespace && field.key === key);
  return found && found.value !== undefined && found.value !== null ? String(found.value) : '';
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

function normalizeHandle(value) {
  const raw = cleanString(value).replace(/^\/+|\/+$/g, '');
  try {
    return decodeURIComponent(raw).toLowerCase();
  } catch (error) {
    return raw.toLowerCase();
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
    shopDomain: normalizeShopDomain(config.shopDomain || config.shop || config.domain || 'calapres.myshopify.com'),
    apiVersion: cleanString(config.apiVersion || DEFAULT_API_VERSION)
  };
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

function roundScore(value) {
  return Math.round(Number(value) * 1000) / 1000;
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
    IMPORTED_TAG,
    SUPPLIER_TAG,
    METAFIELDS_SET_MUTATION,
    planBackfillExistingProducts,
    buildMetafieldsSetRequest,
    buildTagUpdateRequest,
    findBestMatch,
    normalizeSupplierProduct,
    normalizeExistingProducts,
    handleFromUrl,
    normalizeTitle,
    titleSimilarity,
    toGraphqlProductId,
    toRestId
  };
}
