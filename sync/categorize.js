const config = require('./config.js');
const normalize = require('./normalize.js');

function categorizeProduct(product, options) {
  const map = (options && options.collectionMap) || config.COLLECTION_MAP;
  const normalized = normalize.normalizeProduct(product);
  const handles = [];

  addAll(handles, map.defaultHandles);
  if (normalized.brand && map.brands && map.brands[normalized.brand]) addAll(handles, map.brands[normalized.brand]);
  if (normalized.gender && map.gender && map.gender[normalized.gender]) addAll(handles, map.gender[normalized.gender]);

  const text = [
    normalized.title,
    normalized.brand,
    normalized.category,
    normalized.description,
    normalized.concentration
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/(oud|عود|بخور|incense|bukhoor|مبخرة|دخون)/i.test(text)) addAll(handles, map.concentration && (map.concentration.oud || map.concentration.incense));
  if (/(tom ford|dior|givenchy|gaultier|chanel|guerlain|luxury)/i.test(text)) add(handles, 'luxury-brands');
  if (/(nishane|xerjoff|crivelli|matiere|niche|نيش)/i.test(text)) add(handles, 'niche-international');

  return unique(handles).map((handle) => ({
    handle,
    reason: reasonForHandle(handle, normalized)
  }));
}

function collectionHandles(product, options) {
  return categorizeProduct(product, options).map((entry) => entry.handle);
}

function addAll(target, values) {
  for (const value of values || []) add(target, value);
}

function add(target, value) {
  const clean = String(value || '').trim();
  if (clean) target.push(clean);
}

function unique(values) {
  const seen = {};
  const out = [];
  for (const value of values || []) {
    const key = String(value).toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(value);
    }
  }
  return out;
}

function reasonForHandle(handle, product) {
  if (handle === 'eastern-oud-incense') return 'oud_or_incense_signal';
  if (handle === 'luxury-brands') return 'luxury_brand_signal';
  if (handle === 'niche-international') return product.brand ? 'brand_or_default_niche_signal' : 'default_collection';
  if (handle === 'men-perfumes' || handle === 'women-perfumes' || handle === 'unisex-perfumes') return 'gender_signal';
  return 'collection_map';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    categorizeProduct,
    collectionHandles
  };
}
