// Pure Supabase product data lake helpers.
//
// Source of truth flow:
// Supplier -> n8n -> Supabase supplier_products -> Shopify
//
// SKU rules:
// - supplier_sku is preserved for supplier traceability only.
// - calapres_sku is our permanent SKU and the only value used as Shopify variant.sku.
// - default format is CAL-<SUPPLIER_CODE>-P<supplier_product_id>.

const config = require('./config.js');
const payloads = require('./build-shopify-payload.js');

const SUPPLIER_CODE_ND = 'ND';
const IMAGE_PIPELINE_STATUSES = [
  'pending',
  'source_saved',
  'generation_requested',
  'generated',
  'quality_failed',
  'ready_to_upload',
  'uploaded_to_shopify',
  'failed',
  'skipped'
];

function buildSupabaseRecord(parsed, priced, options) {
  const opts = options || {};
  const input = parsed && typeof parsed === 'object' ? parsed : {};
  const pricing = priced && typeof priced === 'object' ? priced : {};
  const profitMarginSar = toMoneyNumber(opts.profitMarginSar) || config.MARKUP_SAR;
  const sourceUrl = cleanString(input.sourceUrl || input.supplier_source_url);
  const supplierProductId = normalizeProductId(
    input.supplierProductId || input.supplier_product_id || input.supplierId || extractProductIdFromUrl(sourceUrl)
  );
  const supplierCode = cleanString(opts.supplierCode || config.SUPPLIER_CODES[config.SUPPLIER_NAME] || SUPPLIER_CODE_ND).toUpperCase();
  const supplierPrice = toMoneyNumber(input.supplierPrice ?? input.supplier_price);
  const supplierOriginalPrice = toMoneyNumber(
    input.supplierCompareAtPrice ?? input.supplier_original_price ?? input.compareAtPrice ?? input.compare_at_price
  );
  const hasDiscount = supplierOriginalPrice !== null && supplierPrice !== null && supplierOriginalPrice > supplierPrice;
  const supplierDiscountedPrice = hasDiscount ? supplierPrice : null;
  const sellingPrice = firstMoney(pricing.price, pricing.selling_price, input.selling_price, supplierPrice === null ? null : supplierPrice + profitMarginSar);
  let compareAtPrice = firstMoney(pricing.compareAtPrice, pricing.compare_at_price, input.compare_at_price);
  if (compareAtPrice === null && hasDiscount) compareAtPrice = roundMoney(supplierOriginalPrice + profitMarginSar);
  if (compareAtPrice !== null && sellingPrice !== null && sameMoney(compareAtPrice, sellingPrice)) compareAtPrice = null;
  const imageUrls = extractImageUrls(input);
  const imagePipelineStatus = normalizeImagePipelineStatus(
    input.image_pipeline_status || (imageUrls.length ? 'source_saved' : 'pending')
  );

  const record = compactObject({
    supplier_id: opts.supplierId || input.supplier_id,
    supplier_name: cleanString(input.supplierName || input.supplier_name || opts.supplierName || config.SUPPLIER_NAME),
    supplier_product_id: supplierProductId,
    supplier_sku: cleanString(input.supplierSku || input.supplier_sku || input.sku) || null,
    supplier_source_url: sourceUrl || null,
    supplier_slug: input.supplier_slug || extractSlug(sourceUrl),
    shopify_product_id: cleanString(input.shopifyProductId || input.shopify_product_id) || null,
    shopify_variant_id: cleanString(input.shopifyVariantId || input.shopify_variant_id) || null,
    shopify_handle: cleanString(input.shopifyHandle || input.shopify_handle) || null,
    product_title_ar: cleanString(input.nameAr || input.product_title_ar || input.name || input.title) || null,
    product_title_en: cleanString(input.nameEn || input.product_title_en || input.name || input.title) || null,
    product_description_ar: cleanString(input.descriptionAr || input.product_description_ar || input.description) || null,
    product_description_en: cleanString(input.descriptionEn || input.product_description_en || input.description) || null,
    brand_id: input.brandId || input.brand_id || null,
    brand_name: cleanString(input.brand || input.brand_name) || null,
    category: cleanString(input.category) || null,
    product_type: cleanString(input.productType || input.product_type) || null,
    gender_target: cleanString(input.gender || input.gender_target) || null,
    size_ml: toInteger(input.sizeMl ?? input.size_ml),
    concentration: cleanString(input.concentration) || null,
    notes_top: normalizeTextArray(input.notesTop || input.notes_top),
    notes_middle: normalizeTextArray(input.notesMiddle || input.notes_middle),
    notes_base: normalizeTextArray(input.notesBase || input.notes_base),
    supplier_price: supplierPrice,
    supplier_original_price: supplierOriginalPrice,
    supplier_discounted_price: supplierDiscountedPrice,
    profit_margin_sar: profitMarginSar,
    selling_price: sellingPrice,
    compare_at_price: compareAtPrice,
    currency: cleanString(input.currency) || 'SAR',
    availability_status: normalizeAvailability(input.availability || input.availability_status),
    shopify_sync_status: cleanString(input.shopifySyncStatus || input.shopify_sync_status) || 'pending',
    image_pipeline_status: imagePipelineStatus,
    seo_title_ar: cleanString(input.seoTitleAr || input.seo_title_ar) || null,
    seo_title_en: cleanString(input.seoTitleEn || input.seo_title_en) || null,
    seo_description_ar: cleanString(input.seoDescriptionAr || input.seo_description_ar) || null,
    seo_description_en: cleanString(input.seoDescriptionEn || input.seo_description_en) || null,
    seo_keywords: normalizeTextArray(input.seoKeywords || input.seo_keywords),
    tags: normalizeTextArray(input.tags),
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

function buildSupabaseUpsertBody(parsed, priced, supplierId, options) {
  return buildSupabaseRecord(parsed, priced, { ...(options || {}), supplierId });
}

function generateCalapresSku(supplierCode, supplierProductId) {
  const code = cleanString(supplierCode).toUpperCase();
  const id = normalizeProductId(supplierProductId);
  if (!code || !id) return null;
  return 'CAL-' + code + '-P' + id;
}

function buildProductMediaRow(supabaseProductId, imageUrl, options) {
  const opts = options || {};
  const url = cleanString(imageUrl);
  return compactObject({
    supplier_product_id: supabaseProductId,
    media_type: opts.mediaType || 'image',
    source: opts.source || 'supplier',
    original_url: url || null,
    generated_url: opts.generatedUrl || null,
    shopify_cdn_url: opts.shopifyCdnUrl || null,
    supabase_storage_path: opts.storagePath || null,
    alt_text: opts.altText || null,
    position: Number.isFinite(Number(opts.position)) ? Number(opts.position) : 1,
    is_primary: opts.isPrimary !== undefined ? Boolean(opts.isPrimary) : (Number(opts.position || 1) === 1),
    is_active: opts.isActive === undefined ? true : Boolean(opts.isActive),
    uploaded_to_shopify: false,
    upload_status: opts.uploadStatus || 'pending'
  });
}

function buildProductMediaRows(supabaseProductId, product, options) {
  return extractImageUrls(product).map((url, index) =>
    buildProductMediaRow(supabaseProductId, url, {
      ...(options || {}),
      position: index + 1,
      isPrimary: index === 0
    })
  );
}

function buildSyncErrorRow(error, context) {
  const ctx = context || {};
  const message = error && error.message ? error.message : String(error || 'Unknown sync error');
  return compactObject({
    sync_run_id: ctx.syncRunId || ctx.sync_run_id || null,
    supplier_product_id: ctx.supabaseProductId || ctx.supplier_product_uuid || null,
    source_url: ctx.sourceUrl || ctx.supplier_source_url || null,
    error_type: ctx.errorType || ctx.error_type || 'unknown',
    error_message: message,
    raw_payload: ctx.rawPayload || ctx.raw_payload || null
  });
}

function buildShopifyInputFromSupabaseRecord(row, options) {
  const record = row && typeof row === 'object' ? row : {};
  const opts = options || {};
  return {
    name: record.product_title_ar || record.product_title_en,
    description: record.product_description_ar || record.product_description_en,
    brand: record.brand_name,
    category: record.category,
    supplierPrice: record.supplier_price,
    supplierCompareAtPrice: record.supplier_original_price,
    price: record.selling_price,
    compareAtPrice: record.compare_at_price,
    availability: record.availability_status,
    sourceUrl: record.supplier_source_url,
    supplierProductId: record.supplier_product_id,
    supplierSku: record.supplier_sku,
    calapresSku: record.calapres_sku || opts.calapresSku,
    shopifyProductId: record.shopify_product_id,
    shopifyVariantId: record.shopify_variant_id,
    existingProduct: opts.existingProduct,
    existingTags: opts.existingTags
  };
}

function buildShopifyPayloadFromSupabaseRecord(row, options) {
  return payloads.buildPayload(buildShopifyInputFromSupabaseRecord(row, options));
}

function extractShopifyFields(supabaseRow) {
  const row = supabaseRow && typeof supabaseRow === 'object' ? supabaseRow : {};
  return {
    calapresSku: row.calapres_sku || null,
    supplierSku: row.supplier_sku || null,
    shopifyProductId: row.shopify_product_id || null,
    shopifyVariantId: row.shopify_variant_id || null,
    shopifyHandle: row.shopify_handle || null,
    supabaseProductId: row.id || null
  };
}

function extractImageUrls(value) {
  const item = value && typeof value === 'object' ? value : {};
  const candidates = []
    .concat(item.imageUrl || [])
    .concat(item.image_url || [])
    .concat(item.images || [])
    .concat(item.imageUrls || []);
  return unique(
    candidates
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object') return entry.url || entry.src || entry.original_url;
        return '';
      })
      .map(cleanString)
      .filter((url) => /^https:\/\//i.test(url))
  );
}

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
    return parts.length >= 2 ? parts[0] : (parts[0] || null);
  } catch (error) {
    return null;
  }
}

function normalizeAvailability(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (
    raw === 'in_stock' ||
    raw === 'instock' ||
    raw === 'available' ||
    raw === 'true' ||
    raw === '1' ||
    raw.includes('متوفر') ||
    raw.includes('in stock')
  ) {
    return 'in_stock';
  }
  if (
    raw === 'missing' ||
    raw === 'not_found' ||
    raw === 'out_of_stock' ||
    raw === 'out of stock' ||
    raw === 'unavailable' ||
    raw === 'false' ||
    raw === '0' ||
    raw.includes('نفد') ||
    raw.includes('غير متوفر') ||
    raw.includes('sold out')
  ) {
    return 'out_of_stock';
  }
  return 'unknown';
}

function normalizeImagePipelineStatus(value) {
  const status = cleanString(value);
  return IMAGE_PIPELINE_STATUSES.includes(status) ? status : 'pending';
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
    IMAGE_PIPELINE_STATUSES,
    buildSupabaseRecord,
    buildSupabaseUpsertBody,
    generateCalapresSku,
    buildProductMediaRow,
    buildProductMediaRows,
    buildSyncErrorRow,
    buildShopifyInputFromSupabaseRecord,
    buildShopifyPayloadFromSupabaseRecord,
    extractShopifyFields,
    extractImageUrls,
    SUPPLIER_CODE_ND
  };
}
