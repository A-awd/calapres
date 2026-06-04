// supabase-product.js
// Builds Supabase supplier_products upsert payload from a parsed+priced product.
// Also provides calapres_sku generation and field extraction for Shopify payload builder.
//
// calapres_sku format: CAL-{SUPPLIER_CODE}-P{SUPPLIER_PRODUCT_ID}
// Examples:
//   CAL-ND-P852601829   (Nawadir Dior, product 852601829)
//   CAL-AF-P100001      (future supplier AF, product 100001)
//
// Rules:
//   - calapres_sku is set once on INSERT via DB trigger; never changed after that.
//   - supplier_sku is preserved separately for traceability and supplier reconciliation.
//   - Shopify variant.sku = calapres_sku (never supplier_sku).
//   - profit_margin_sar is stored per row so it can be changed per product if needed.
//   - selling_price = supplier_price + profit_margin_sar.

const config = require('./config.js');

const SUPPLIER_CODE_ND = 'ND';  // Nawadir Dior

// Builds the Supabase supplier_products upsert record from a normalized parsed product.
// `parsed`  — output of parse-product.js (name, brand, supplierPrice, availability, …)
// `priced`  — output of pricing.js (price, compareAtPrice)
// `options` — { supplierCode, profitMarginSar, calapresSku }
function buildSupabaseRecord(parsed, priced, options) {
  const opts = options || {};
  const profitMarginSar = opts.profitMarginSar !== undefined ? Number(opts.profitMarginSar) : config.MARKUP_SAR;

  const supplierProductId = normalizeProductId(
    parsed.supplierProductId || parsed.supplierId || extractProductIdFromUrl(parsed.sourceUrl)
  );

  const supplierPrice = toNumber(parsed.supplierPrice);
  const supplierOriginalPrice = toNumber(parsed.supplierCompareAtPrice);

  // If supplier has a discount: original > discounted; store both explicitly.
  const supplierDiscountedPrice =
    supplierOriginalPrice !== null && supplierPrice !== null && supplierOriginalPrice > supplierPrice
      ? supplierPrice
      : null;

  // Use priced values if provided; fall back to computing from supplier price.
  const sellingPrice = priced && priced.price !== null && priced.price !== undefined
    ? priced.price
    : supplierPrice !== null ? roundMoney(supplierPrice + profitMarginSar) : null;

  const compareAtPrice = priced && priced.compareAtPrice !== null && priced.compareAtPrice !== undefined
    ? priced.compareAtPrice
    : null;

  const record = {
    // Identity
    supplier_product_id:      supplierProductId,
    supplier_sku:             parsed.supplierSku || parsed.sku || null,
    supplier_source_url:      parsed.sourceUrl || null,
    supplier_slug:            extractSlug(parsed.sourceUrl),

    // Content
    product_title_ar:         parsed.nameAr || parsed.name || null,
    product_title_en:         parsed.nameEn || parsed.name || null,
    product_description_ar:   parsed.descriptionAr || parsed.description || null,
    product_description_en:   parsed.descriptionEn || parsed.description || null,

    // Brand & Classification
    brand_name:               parsed.brand || null,
    category:                 parsed.category || null,
    gender_target:            parsed.gender || null,
    size_ml:                  parsed.sizeMl ? parseInt(String(parsed.sizeMl), 10) : null,
    concentration:            parsed.concentration || null,

    // Pricing
    supplier_price:           supplierPrice,
    supplier_original_price:  supplierOriginalPrice,
    supplier_discounted_price: supplierDiscountedPrice,
    profit_margin_sar:        profitMarginSar,
    selling_price:            sellingPrice,
    compare_at_price:         compareAtPrice,
    currency:                 'SAR',

    // Availability
    availability_status:      normalizeAvailability(parsed.availability),

    // Image pipeline: mark source_saved if we have an original image URL.
    image_pipeline_status:    parsed.imageUrl ? 'source_saved' : 'pending',

    // Tags from supplier (as array for Supabase; Shopify tags are handled separately)
    tags:                     Array.isArray(parsed.tags) ? parsed.tags : null,

    // Raw full supplier payload for future re-parsing without schema migrations.
    raw_payload:              parsed,

    last_seen_at:             new Date().toISOString(),
  };

  // Only include calapres_sku if explicitly provided (e.g. when reading back from DB).
  // On new inserts the DB trigger handles it.
  if (opts.calapresSku) {
    record.calapres_sku = opts.calapresSku;
  }

  return record;
}

// Generates calapres_sku in JavaScript (mirrors the DB trigger for tests and offline use).
// supplierCode — e.g. 'ND', 'AF'
// supplierProductId — numeric string, e.g. '852601829'
function generateCalapresSku(supplierCode, supplierProductId) {
  if (!supplierCode || !supplierProductId) return null;
  const id = String(supplierProductId).replace(/^p/i, '').replace(/\D/g, '');
  if (!id) return null;
  return 'CAL-' + String(supplierCode).toUpperCase() + '-P' + id;
}

// Builds the complete HTTP body for POST /rest/v1/supplier_products with:
//   Prefer: resolution=merge-duplicates,return=representation
// supplierId — UUID of the supplier row (from suppliers table)
function buildSupabaseUpsertBody(parsed, priced, supplierId, options) {
  const record = buildSupabaseRecord(parsed, priced, options);
  return {
    ...record,
    supplier_id: supplierId,
  };
}

// Extracts the fields that build-shopify-payload.js needs after a Supabase upsert.
// Pass the row returned from Supabase (Prefer: return=representation).
function extractShopifyFields(supabaseRow) {
  return {
    calapresSku:     supabaseRow.calapres_sku || null,
    supplierSku:     supabaseRow.supplier_sku || null,
    shopifyProductId: supabaseRow.shopify_product_id || null,
    shopifyVariantId: supabaseRow.shopify_variant_id || null,
    supabaseProductId: supabaseRow.id || null,
  };
}

// Builds the product_media row for the supplier's original image.
// Used after upsert to record the supplier image in the media table.
function buildProductMediaRow(supabaseProductId, imageUrl, options) {
  const opts = options || {};
  return {
    supplier_product_id: supabaseProductId,
    media_type:  'image',
    source:      'supplier',
    original_url: imageUrl || null,
    position:    opts.position || 1,
    is_primary:  opts.position === 1 || opts.isPrimary || false,
    is_active:   true,
    uploaded_to_shopify: false,
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

function normalizeProductId(value) {
  const cleaned = String(value || '').replace(/^p/i, '').replace(/\D/g, '');
  return cleaned || null;
}

function extractProductIdFromUrl(url) {
  const match = String(url || '').match(/\/p(\d+)(?=$|[/?#])/i);
  return match ? match[1] : null;
}

function extractSlug(sourceUrl) {
  try {
    const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean);
    // Supplier URL format: /<slug>/p<id> → slug is parts[0] when there are 2 segments
    return parts.length >= 2 ? parts[0] : (parts[0] || null);
  } catch {
    return null;
  }
}

function normalizeAvailability(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (
    raw === 'in_stock' || raw === 'instock' || raw === 'available' ||
    raw === 'true' || raw === '1' || raw.includes('in stock')
  ) return 'in_stock';
  if (
    raw === 'out_of_stock' || raw === 'out of stock' || raw === 'unavailable' ||
    raw === 'false' || raw === '0' || raw === 'نفد'
  ) return 'out_of_stock';
  return 'unknown';
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildSupabaseRecord,
    buildSupabaseUpsertBody,
    generateCalapresSku,
    extractShopifyFields,
    buildProductMediaRow,
    SUPPLIER_CODE_ND,
  };
}
