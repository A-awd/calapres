// Code: Build Supabase Upsert Payload
// n8n Code node — runOnceForEachItem
//
// Input:  parsed + priced product from applyPricing node
//         (supplierPrice, supplierCompareAtPrice, price, compareAtPrice, availability, …)
// Output: { supabaseUpsertBody, mediaRows, parsed, priced, sourceUrl }
//
// The HTTP Request node that follows POSTs supabaseUpsertBody to:
//   POST /rest/v1/supplier_products
//   Prefer: resolution=merge-duplicates,return=representation
//
// After the HTTP response, the next Code node calls extractCalapresSku() to read
// the calapres_sku from the returned row and passes it to buildPayload.

// ── inline config ─────────────────────────────────────────────────────────────
const MARKUP_SAR = 100;
const SUPPLIER_CODE = 'ND';      // Nawadir Dior
// Supplier UUID is fetched at workflow start from the suppliers table.
// Passed as $json.supplierId (set by a preceding Set node or the trigger).

// ── helpers ───────────────────────────────────────────────────────────────────
function normalizeProductId(v) {
  var cleaned = String(v || '').replace(/^p/i, '').replace(/\D/g, '');
  return cleaned || null;
}
function extractProductIdFromUrl(url) {
  var m = String(url || '').match(/\/p(\d+)(?=$|[/?#])/i);
  return m ? m[1] : null;
}
function extractSlug(sourceUrl) {
  try {
    var parts = new URL(sourceUrl).pathname.split('/').filter(Boolean);
    return parts.length >= 2 ? parts[0] : (parts[0] || null);
  } catch (e) { return null; }
}
function normalizeAvailability(v) {
  var raw = String(v || '').trim().toLowerCase();
  if (raw === 'in_stock' || raw === 'instock' || raw === 'available' || raw === 'true') return 'in_stock';
  if (raw === 'out_of_stock' || raw === 'out of stock' || raw === 'unavailable' || raw === 'false') return 'out_of_stock';
  return 'unknown';
}
function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(String(v).replace(/,/g, ''));
  return isFinite(n) ? n : null;
}
function roundMoney(v) { return Math.round(Number(v) * 100) / 100; }

// ── main ──────────────────────────────────────────────────────────────────────
var input = $json;
var supplierId = input.supplierId || null;   // pass from trigger/Set node

var supplierProductId = normalizeProductId(
  input.supplierProductId || input.supplierId || extractProductIdFromUrl(input.sourceUrl)
);
var supplierPrice = toNum(input.supplierPrice);
var supplierOriginalPrice = toNum(input.supplierCompareAtPrice);
var supplierDiscountedPrice =
  (supplierOriginalPrice !== null && supplierPrice !== null && supplierOriginalPrice > supplierPrice)
    ? supplierPrice : null;

var sellingPrice = toNum(input.price);
if (sellingPrice === null && supplierPrice !== null) {
  sellingPrice = roundMoney(supplierPrice + MARKUP_SAR);
}
var compareAtPrice = input.compareAtPrice !== undefined ? toNum(input.compareAtPrice) : null;

var upsertBody = {
  supplier_id:               supplierId,
  supplier_product_id:       supplierProductId,
  supplier_sku:              input.supplierSku || input.sku || null,
  supplier_source_url:       input.sourceUrl || null,
  supplier_slug:             extractSlug(input.sourceUrl),
  product_title_ar:          input.nameAr || input.name || null,
  product_title_en:          input.nameEn || input.name || null,
  product_description_ar:    input.descriptionAr || input.description || null,
  product_description_en:    input.descriptionEn || input.description || null,
  brand_name:                input.brand || null,
  category:                  input.category || null,
  gender_target:             input.gender || null,
  size_ml:                   input.sizeMl ? parseInt(String(input.sizeMl), 10) : null,
  concentration:             input.concentration || null,
  supplier_price:            supplierPrice,
  supplier_original_price:   supplierOriginalPrice,
  supplier_discounted_price: supplierDiscountedPrice,
  profit_margin_sar:         MARKUP_SAR,
  selling_price:             sellingPrice,
  compare_at_price:          compareAtPrice,
  currency:                  'SAR',
  availability_status:       normalizeAvailability(input.availability),
  image_pipeline_status:     input.imageUrl ? 'source_saved' : 'pending',
  raw_payload:               input,
  last_seen_at:              new Date().toISOString(),
};

// Supplier image row (saved to product_media after upsert)
var mediaRow = input.imageUrl ? {
  media_type:  'image',
  source:      'supplier',
  original_url: String(input.imageUrl).trim(),
  position:    1,
  is_primary:  true,
  is_active:   true,
  uploaded_to_shopify: false,
} : null;

return [{
  json: {
    supabaseUpsertBody: upsertBody,
    mediaRow:           mediaRow,
    parsed:             input,
    sourceUrl:          input.sourceUrl,
    supplierProductId:  supplierProductId,
  }
}];
