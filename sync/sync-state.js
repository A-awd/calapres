const config = require('./config.js');

function computeChunk(fullList, offset, chunkSize) {
  const list = Array.isArray(fullList) ? fullList.slice() : [];
  const size = normalizePositiveInt(chunkSize, config.CHUNK_SIZE);
  if (!list.length) {
    return { chunk: [], nextOffset: 0, wrapped: true, offset: 0, chunkSize: size, total: 0 };
  }

  const start = normalizeOffset(offset, list.length);
  const end = Math.min(start + size, list.length);
  const chunk = list.slice(start, end);
  const wrapped = end >= list.length;
  return {
    chunk,
    nextOffset: wrapped ? 0 : end,
    wrapped,
    offset: start,
    chunkSize: size,
    total: list.length
  };
}

function selectOneProductTestUrls(fullList, options) {
  const opts = options && typeof options === 'object' ? options : {};
  const urls = Array.isArray(fullList) ? fullList.slice() : [];
  const explicitUrl = cleanString(opts.testProductUrl);
  if (explicitUrl) return [explicitUrl];

  const productId = normalizeSupplierId(opts.testProductId);
  if (!productId) return urls;
  return urls.filter((url) => productIdFromUrl(url) === productId);
}

function selectNewVsExisting(supplierProducts, shopifyProducts) {
  const existingIds = {};
  const existingUrls = {};
  for (const product of shopifyProducts || []) {
    const sourceUrl = cleanString(product && product.sourceUrl);
    const supplierId = normalizeSupplierId(
      (product && (product.supplierId || product.supplierProductId)) || productIdFromUrl(sourceUrl) || supplierIdFromTags(product && product.tags)
    );
    if (sourceUrl) existingUrls[sourceUrl] = true;
    if (supplierId) existingIds[supplierId] = true;
  }

  const fresh = [];
  const existing = [];
  for (const product of supplierProducts || []) {
    const sourceUrl = cleanString(product && product.sourceUrl);
    const supplierId = normalizeSupplierId((product && (product.supplierId || product.supplierProductId)) || productIdFromUrl(sourceUrl));
    if ((sourceUrl && existingUrls[sourceUrl]) || (supplierId && existingIds[supplierId])) existing.push(product);
    else fresh.push(product);
  }
  return { newProducts: fresh, existingProducts: existing };
}

function normalizeOffset(value, total) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < 0) return 0;
  if (!total) return 0;
  return number >= total ? 0 : number;
}

function normalizePositiveInt(value, fallback) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return number;
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

function normalizeSupplierId(value) {
  return String(value || '').replace(/^p/i, '').replace(/\D/g, '');
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeChunk,
    selectOneProductTestUrls,
    selectNewVsExisting,
    normalizeOffset,
    normalizePositiveInt,
    productIdFromUrl,
    normalizeSupplierId
  };
}
