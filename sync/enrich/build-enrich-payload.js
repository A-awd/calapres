const config = require('../config.js');
const seo = require('./seo.js');

function buildEnrichPayload(input) {
  const item = input && typeof input === 'object' ? input : {};
  const product = item.product || item;
  const productId = cleanString(item.productId || product.id || product.legacyResourceId);
  if (!productId) throw new Error('buildEnrichPayload requires product id');
  const generatedImages = normalizeImages(item.generatedImages || item.images || item.higgsfieldImages);
  const originalImages = normalizeImages(item.originalImages || product.images || product.imageUrls);
  const images = generatedImages.concat(originalImages).slice(0, 6).map((src) => ({ src }));
  const seoFields = seo.buildArabicSeo(product);
  const tags = uniqueTags(normalizeTags(product.tags).concat([config.TAGS.enriched]));
  return {
    product: {
      id: productId,
      body_html: seoFields.bodyHtml,
      tags: tags.join(', '),
      images,
      metafields: seoFields.metafields
    }
  };
}

function normalizeImages(value) {
  const list = Array.isArray(value) ? value : value && value.nodes ? value.nodes : value ? [value] : [];
  return list
    .map((item) => {
      if (typeof item === 'string') return item;
      return item && (item.src || item.url || item.originalSrc);
    })
    .map((src) => cleanString(src))
    .filter(Boolean);
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
  for (const tag of tags || []) {
    const key = String(tag || '').toLowerCase();
    if (key && !seen[key]) {
      seen[key] = true;
      out.push(String(tag).trim());
    }
  }
  return out;
}

function cleanString(value) {
  return String(value || '').trim();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildEnrichPayload, normalizeImages };
}
