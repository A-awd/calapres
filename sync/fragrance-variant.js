// Builders for the fragrance parent + variant model.
//
// Flow: supplier_products (raw) -> fragrance_products (parent) -> product_variants
// (children) -> Shopify (one product, many size variants).
//
// Business rules honored here (same as supplier_products):
// - profit_margin_sar = 100 (default).
// - selling_price = supplier price + margin.
// - discounted -> compare_at_price = original + margin, selling = discounted + margin.
// - compare_at_price never equals selling_price (null it instead).
// - supplier_sku is preserved separately; calapres_sku (CAL-<CODE>-P<id>) is the
//   ONLY value used as the Shopify variant sku.

const config = require('./config.js');
const matcher = require('./match-fragrance.js');

const SUPPLIER_CODE_ND = 'ND';

// ── Parent: fragrance_products ──────────────────────────────────────────────
function buildFragranceProductRecord(parsed, options) {
  const opts = options || {};
  const facts = opts.facts || matcher.extractFragranceFacts(parsed, opts);
  const input = parsed && typeof parsed === 'object' ? parsed : {};

  return compactObject({
    brand_id: opts.brandId || input.brand_id || null,
    brand_name: facts.brand || cleanString(input.brand || input.brand_name) || null,
    canonical_name_ar: facts.canonicalNameAr || null,
    canonical_name_en: facts.canonicalNameEn || null,
    normalized_name: facts.normalizedName || null,
    gender_target: facts.gender || null,
    concentration: facts.concentration || null,
    // Enrichment fields stay empty until an enrichment pass fills them.
    fragrance_family_primary: null,
    fragrance_family_secondary: null,
    accords: normalizeTextArray(input.accords),
    notes_top: normalizeTextArray(input.notesTop || input.notes_top),
    notes_middle: normalizeTextArray(input.notesMiddle || input.notes_middle),
    notes_base: normalizeTextArray(input.notesBase || input.notes_base),
    longevity_rating: null,
    sillage_rating: null,
    season_best_for: null,
    occasion_best_for: null,
    style_keywords: null,
    luxury_description_ar: null,
    luxury_description_en: null,
    seo_title_ar: null,
    seo_title_en: null,
    seo_description_ar: null,
    seo_description_en: null,
    seo_keywords: null,
    enrichment_status: cleanString(opts.enrichmentStatus) || 'pending',
    enrichment_source: opts.enrichmentSource || null,
    enrichment_source_url: opts.enrichmentSourceUrl || null,
    confidence_score: clampConfidence(opts.confidence),
    verified: false,
    raw_enrichment_payload: opts.rawEnrichmentPayload || {}
  });
}

// ── Child: product_variants ─────────────────────────────────────────────────
function buildProductVariantRecord(parsed, priced, options) {
  const opts = options || {};
  const facts = opts.facts || matcher.extractFragranceFacts(parsed, opts);
  const input = parsed && typeof parsed === 'object' ? parsed : {};
  const pricing = priced && typeof priced === 'object' ? priced : {};
  const profitMarginSar = toMoneyNumber(opts.profitMarginSar) || config.MARKUP_SAR;

  const supplierProductId = normalizeProductId(
    input.supplierProductId || input.supplier_product_id || extractProductIdFromUrl(input.sourceUrl || input.supplier_source_url)
  );
  const supplierCode = cleanString(opts.supplierCode || config.SUPPLIER_CODES[config.SUPPLIER_NAME] || SUPPLIER_CODE_ND).toUpperCase();

  const supplierPrice = toMoneyNumber(input.supplierPrice ?? input.supplier_price);
  const supplierOriginalPrice = toMoneyNumber(
    input.supplierCompareAtPrice ?? input.supplier_original_price ?? input.compareAtPrice ?? input.compare_at_price
  );
  const hasDiscount = supplierOriginalPrice !== null && supplierPrice !== null && supplierOriginalPrice > supplierPrice;
  const supplierDiscountedPrice = hasDiscount ? supplierPrice : null;
  const sellingPrice = firstMoney(
    pricing.price, pricing.selling_price, input.selling_price,
    supplierPrice === null ? null : supplierPrice + profitMarginSar
  );
  let compareAtPrice = firstMoney(pricing.compareAtPrice, pricing.compare_at_price, input.compare_at_price);
  if (compareAtPrice === null && hasDiscount) compareAtPrice = roundMoney(supplierOriginalPrice + profitMarginSar);
  if (compareAtPrice !== null && sellingPrice !== null && sameMoney(compareAtPrice, sellingPrice)) compareAtPrice = null;

  const record = compactObject({
    fragrance_product_id: opts.fragranceProductId || input.fragrance_product_id || null,
    supplier_id: opts.supplierId || input.supplier_id || null,
    supplier_product_uuid: opts.supplierProductUuid || input.supplier_product_uuid || null,
    supplier_product_id: supplierProductId,
    supplier_sku: cleanString(input.supplierSku || input.supplier_sku || input.sku) || null,
    size_ml: toInteger(facts.sizeMl),
    size_label: facts.sizeLabel || null,
    variant_title: facts.variantTitle || null,
    is_tester: Boolean(facts.isTester),
    is_gift_set: Boolean(facts.isGiftSet),
    supplier_price: supplierPrice,
    supplier_original_price: supplierOriginalPrice,
    supplier_discounted_price: supplierDiscountedPrice,
    profit_margin_sar: profitMarginSar,
    selling_price: sellingPrice,
    compare_at_price: compareAtPrice,
    currency: cleanString(input.currency) || 'SAR',
    availability_status: normalizeAvailability(input.availability || input.availability_status),
    shopify_product_id: cleanString(input.shopifyProductId || input.shopify_product_id) || null,
    shopify_variant_id: cleanString(input.shopifyVariantId || input.shopify_variant_id) || null,
    shopify_sync_status: cleanString(input.shopifySyncStatus || input.shopify_sync_status) || 'pending',
    raw_payload: input.raw_payload || input,
    last_seen_at: opts.now || new Date().toISOString()
  });

  if (opts.calapresSku || input.calapresSku || input.calapres_sku) {
    record.calapres_sku = cleanString(opts.calapresSku || input.calapresSku || input.calapres_sku);
  } else if (opts.includeCalapresSku) {
    record.calapres_sku = generateCalapresSku(supplierCode, supplierProductId);
  }

  return record;
}

function generateCalapresSku(supplierCode, supplierProductId) {
  const code = cleanString(supplierCode).toUpperCase();
  const id = normalizeProductId(supplierProductId);
  if (!code || !id) return null;
  return 'CAL-' + code + '-P' + id;
}

// ── Shopify: one parent product with a size-variant array ───────────────────
// Each Shopify variant.sku is the variant's calapres_sku — never supplier_sku.
function buildShopifyProductFromFragrance(fragrance, variants, options) {
  const opts = options || {};
  const parent = fragrance && typeof fragrance === 'object' ? fragrance : {};
  const rows = (Array.isArray(variants) ? variants : []).filter((row) => row && typeof row === 'object');
  const anyInStock = rows.some((row) => normalizeAvailability(row.availability_status || row.availability) === 'in_stock');
  const existingProductId = opts.existingProductId || parent.shopify_product_id || null;

  const shopifyVariants = rows.map((row) => {
    const inStock = normalizeAvailability(row.availability_status || row.availability) === 'in_stock';
    return compactObject({
      id: row.shopify_variant_id || undefined,
      option1: cleanString(row.size_label || row.variant_title) || 'Standard',
      // SKU = calapres_sku ONLY. supplier_sku is never used as a Shopify SKU.
      sku: cleanString(row.calapres_sku) || undefined,
      price: row.selling_price === null || row.selling_price === undefined ? undefined : formatMoney(row.selling_price),
      compare_at_price: row.compare_at_price === null || row.compare_at_price === undefined ? null : formatMoney(row.compare_at_price),
      inventory_policy: inStock ? 'continue' : 'deny'
    });
  });

  return {
    product: compactObject({
      id: existingProductId || undefined,
      title: cleanString(parent.canonical_name_en || parent.canonical_name_ar || parent.normalized_name) || undefined,
      vendor: cleanString(parent.brand_name) || undefined,
      status: existingProductId ? (anyInStock ? 'active' : 'draft') : 'draft',
      options: [{ name: 'Size', values: shopifyVariants.map((variant) => variant.option1) }],
      variants: shopifyVariants
    }),
    variantCount: shopifyVariants.length,
    anyInStock
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────
function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return Math.round(number * 1000) / 1000;
}

function normalizeProductId(value) {
  const cleaned = String(value || '').replace(/^p/i, '').replace(/\D/g, '');
  return cleaned || null;
}

function extractProductIdFromUrl(url) {
  const match = String(url || '').match(/\/p(\d+)(?=$|[/?#])/i);
  return match ? match[1] : null;
}

function normalizeAvailability(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'in_stock' || raw === 'instock' || raw === 'available' || raw === 'true' || raw === '1' || raw.includes('متوفر') || raw.includes('in stock')) {
    return 'in_stock';
  }
  if (raw === 'out_of_stock' || raw === 'missing' || raw === 'not_found' || raw === 'unavailable' || raw === 'false' || raw === '0' || raw.includes('نفد') || raw.includes('غير متوفر') || raw.includes('sold out')) {
    return 'out_of_stock';
  }
  return 'unknown';
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    const out = unique(value.map(cleanString).filter(Boolean));
    return out.length ? out : null;
  }
  const text = cleanString(value);
  if (!text) return null;
  return unique(text.split(/[,،|]/).map(cleanString).filter(Boolean));
}

function firstMoney() {
  for (const value of arguments) {
    const number = toMoneyNumber(value);
    if (number !== null) return roundMoney(number);
  }
  return null;
}

function toMoneyNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function toInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = parseInt(String(value).replace(/\D/g, ''), 10);
  return Number.isFinite(number) ? number : null;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function sameMoney(left, right) {
  return roundMoney(left) === roundMoney(right);
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const rounded = roundMoney(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function cleanString(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function compactObject(object) {
  const out = {};
  for (const key of Object.keys(object || {})) {
    if (object[key] !== undefined) out[key] = object[key];
  }
  return out;
}

function unique(values) {
  const seen = {};
  const out = [];
  for (const value of values || []) {
    const key = String(value);
    if (!seen[key]) {
      seen[key] = true;
      out.push(value);
    }
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUPPLIER_CODE_ND,
    buildFragranceProductRecord,
    buildProductVariantRecord,
    generateCalapresSku,
    buildShopifyProductFromFragrance
  };
}
