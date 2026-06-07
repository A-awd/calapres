import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'n8n-build');
const config = loadCommonJs('./config.js');

const modules = [
  './config.js',
  './crawl-supplier.js',
  './parse-product.js',
  './pricing.js',
  './inventory.js',
  './build-shopify-payload.js',
  './shopify-client.js',
  './reconcile.js',
  './validate-shopify-shape.js',
  './sync-state.js',
  './normalize.js',
  './categorize.js',
  './supabase-product.js',
  './match-fragrance.js',
  './fragrance-variant.js',
  './enrich/enrichment-source.js',
  './enrich/prompt.js',
  './enrich/seo.js',
  './enrich/build-enrich-payload.js',
  './report.js',
  './image-pipeline/creative-brief.js',
  './image-pipeline/image-types.js',
  './image-pipeline/quality-gate.js'
];

const nodes = [
  {
    file: 'crawl.generated.js',
    name: 'Crawl Supplier URLs',
    mode: 'runOnceForAllItems',
    glue: `
const config = __require('./config.js');
const crawl = __require('./crawl-supplier.js');
const state = __require('./sync-state.js');
async function main() {
  const offset = Number($vars?.CALAPRES_SYNC_OFFSET || $env?.CALAPRES_SYNC_OFFSET || 0);
  const limit = $vars?.CALAPRES_SYNC_LIMIT || $env?.CALAPRES_SYNC_LIMIT || config.CHUNK_SIZE;
  const testProductId = $vars?.CALAPRES_TEST_PRODUCT_ID || $env?.CALAPRES_TEST_PRODUCT_ID || null;
  const testProductUrl = $vars?.CALAPRES_TEST_PRODUCT_URL || $env?.CALAPRES_TEST_PRODUCT_URL || null;
  const sitemapUrl = $vars?.SUPPLIER_SITEMAP_URL || $env?.SUPPLIER_SITEMAP_URL || config.SUPPLIER_SITEMAP;
  const urls = await crawl.crawlSupplierProducts({ sitemapUrl });
  const selectedUrls = state.selectOneProductTestUrls(urls, { testProductId, testProductUrl });
  if (testProductId && !selectedUrls.length) {
    throw new Error('CALAPRES_TEST_PRODUCT_ID not found in supplier sitemap: ' + testProductId);
  }
  const chunk = state.computeChunk(selectedUrls, testProductId || testProductUrl ? 0 : offset, limit);
  return chunk.chunk.map((sourceUrl) => ({ json: {
    sourceUrl,
    supplierProductId: crawl.productIdFromUrl(sourceUrl),
    offset: chunk.offset,
    nextOffset: chunk.nextOffset,
    wrapped: chunk.wrapped,
    totalProducts: chunk.total,
    seenInCurrentCrawl: true
  }}));
}`
  },
  {
    file: 'parse.generated.js',
    name: 'Code: parseProduct',
    mode: 'runOnceForEachItem',
    glue: `
const parser = __require('./parse-product.js');
async function main() {
  const html = $json.body || $json.data || $json.html || '';
  const parsed = parser.parseProduct(String(html), {
    sourceUrl: $json.sourceUrl,
    supplierProductId: $json.supplierProductId
  });
  return { json: { ...$json, parsed } };
}`
  },
  {
    file: 'normalize-supplier.generated.js',
    name: 'Code: Normalize Supplier Product',
    mode: 'runOnceForEachItem',
    glue: `
const normalizer = __require('./normalize.js');
const categorizer = __require('./categorize.js');
async function main() {
  const parsed = $json.parsed || {};
  const normalized = normalizer.normalizeProduct({
    name: parsed.name,
    brand: parsed.brand,
    category: parsed.category,
    description: parsed.description
  });
  return { json: { ...$json, parsed: {
    ...parsed,
    brand: normalized.brand || parsed.brand,
    concentration: normalized.concentration || parsed.concentration,
    sizeMl: normalized.sizeMl || parsed.sizeMl,
    gender: normalized.gender || parsed.gender,
    collectionHandles: categorizer.collectionHandles({ ...parsed, ...normalized })
  } } };
}`
  },
  {
    file: 'pricing.generated.js',
    name: 'Code: applyPricing',
    mode: 'runOnceForEachItem',
    glue: `
const pricing = __require('./pricing.js');
async function main() {
  const priced = pricing.applyPricing($json.parsed);
  return { json: { ...$json, parsed: { ...$json.parsed, price: priced.price, compareAtPrice: priced.compareAtPrice } } };
}`
  },
  {
    file: 'supabase-upsert.generated.js',
    name: 'Code: Build Supabase Upsert Payload',
    mode: 'runOnceForEachItem',
    glue: `
const supabase = __require('./supabase-product.js');
async function main() {
  const parsed = $json.parsed || {};
  const priced = { price: parsed.price, compareAtPrice: parsed.compareAtPrice };
  const supplierId = $json.supplierId || $json.supplier_id || $vars?.SUPABASE_SUPPLIER_ID || $env?.SUPABASE_SUPPLIER_ID || null;
  const body = supabase.buildSupabaseUpsertBody(parsed, priced, supplierId, { supplierCode: 'ND', supplierName: 'nawadirdior' });
  return { json: { ...$json, supabaseUpsertBody: body, supabaseTable: 'supplier_products' } };
}`
  },
  {
    file: 'fragrance-resolve.generated.js',
    name: 'Code: Resolve Fragrance Parent',
    mode: 'runOnceForEachItem',
    glue: `
const matcher = __require('./match-fragrance.js');
const fragranceVariant = __require('./fragrance-variant.js');
async function main() {
  const parsed = $json.parsed || {};
  // Existing-parent attach vs create is enforced at the DB level by the
  // fragrance_products identity index (brand + normalized name + concentration).
  // Here we only compute facts + confidence and gate low-confidence rows to review.
  const resolution = matcher.resolveFragrance(parsed, $json.existingFragrances || []);
  const review = resolution.action === 'review';
  const fragranceRecord = review ? null : fragranceVariant.buildFragranceProductRecord(parsed, { facts: resolution.facts, confidence: resolution.confidence });
  return { json: { ...$json,
    fragranceResolution: resolution,
    fragranceFacts: resolution.facts,
    fragranceRecord,
    fragranceTable: 'fragrance_products',
    matchStatus: review ? 'needs_review' : (resolution.action === 'attach_variant' ? 'matched_variant' : 'created_fragrance'),
    matchConfidence: resolution.confidence,
    skipFragranceUpsert: review
  } };
}`
  },
  {
    file: 'variant-upsert.generated.js',
    name: 'Code: Build Variant Upsert Payload',
    mode: 'runOnceForEachItem',
    glue: `
const fragranceVariant = __require('./fragrance-variant.js');
async function main() {
  const parsed = $json.parsed || {};
  const priced = { price: parsed.price, compareAtPrice: parsed.compareAtPrice };
  const fragranceResponse = $json.fragranceResponse || $json.fragranceUpsertResponse;
  const fragranceRow = Array.isArray(fragranceResponse) ? fragranceResponse[0]
    : (fragranceResponse && Array.isArray(fragranceResponse.data) ? fragranceResponse.data[0] : (fragranceResponse || $json.fragranceRow));
  const supplierRow = $json.supabaseProduct || $json.supplierProduct || null;
  const supplierId = $json.supplierId || $json.supplier_id || $vars?.SUPABASE_SUPPLIER_ID || $env?.SUPABASE_SUPPLIER_ID || null;
  const body = fragranceVariant.buildProductVariantRecord(parsed, priced, {
    facts: $json.fragranceFacts,
    fragranceProductId: fragranceRow && fragranceRow.id,
    supplierProductUuid: supplierRow && supplierRow.id,
    supplierId: supplierId,
    supplierCode: 'ND',
    supplierName: 'nawadirdior'
  });
  return { json: { ...$json, productVariantBody: body, supabaseTable: 'product_variants', skipVariantUpsert: !(fragranceRow && fragranceRow.id) } };
}`
  },
  {
    file: 'shopify-from-fragrance.generated.js',
    name: 'Code: Build Shopify Product From Fragrance',
    mode: 'runOnceForEachItem',
    glue: `
const fragranceVariant = __require('./fragrance-variant.js');
async function main() {
  const fragrance = $json.fragrance || $json.fragranceRow || $json.supabaseFragrance || {};
  const variants = $json.variants || $json.productVariants || (fragrance && fragrance.variants) || [];
  const existingProduct = $json.existingProduct || null;
  const payload = fragranceVariant.buildShopifyProductFromFragrance(fragrance, variants, {
    existingProductId: existingProduct && (existingProduct.id || existingProduct.legacyResourceId)
  });
  return { json: { ...$json, payload, productId: payload.product.id || (fragrance && fragrance.shopify_product_id) || null } };
}`
  },
  {
    file: 'enrich-merge.generated.js',
    name: 'Code: Merge Enrichment Facts',
    mode: 'runOnceForEachItem',
    glue: `
const enrichment = __require('./enrich/enrichment-source.js');
async function main() {
  const fragrance = $json.fragrance || $json.fragranceRow || {};
  const facts = $json.facts || $json.enrichmentFacts || {};
  const source = $json.enrichmentSource || facts.source || 'fragrantica_arabia';
  // markVerified only honored for official/manual trusted sources inside the merge.
  const merged = enrichment.mergeEnrichmentFacts(fragrance, facts, source, {
    sourceUrl: $json.enrichmentSourceUrl || facts.source_url || null,
    confidence: $json.enrichmentConfidence,
    markVerified: $json.markVerified === true,
    force: $json.forceUpdate === true
  });
  return { json: { ...$json, fragranceEnrichmentBody: merged.fragrance, enrichmentApplied: merged.applied, enrichmentIgnored: merged.ignored, fragranceTable: 'fragrance_products' } };
}`
  },
  {
    file: 'product-media.generated.js',
    name: 'Code: Build Product Media Rows',
    mode: 'runOnceForEachItem',
    glue: `
const supabase = __require('./supabase-product.js');
async function main() {
  const response = $json.supabaseResponse || $json;
  const row = Array.isArray(response) ? response[0] : (Array.isArray(response.data) ? response.data[0] : response);
  const productId = row && row.id;
  const mediaRows = productId ? supabase.buildProductMediaRows(productId, $json.parsed || row) : [];
  return { json: { ...$json, supabaseProduct: row || null, productMediaRows: mediaRows } };
}`
  },
  {
    file: 'product-media-lookup.generated.js',
    name: 'Code: Build Product Media Lookup',
    mode: 'runOnceForEachItem',
    glue: `
const supabase = __require('./supabase-product.js');
async function main() {
  const productId = $json.supabaseProduct?.id || $json.supplier_product_id || null;
  const path = supabase.buildProductMediaLookupPath(productId);
  return { json: { ...$json, productMediaLookupPath: path, skipProductMediaLookup: !path || !($json.productMediaRows || []).length } };
}`
  },
  {
    file: 'product-media-filter.generated.js',
    name: 'Code: Filter Product Media Rows',
    mode: 'runOnceForEachItem',
    glue: `
const supabase = __require('./supabase-product.js');
async function main() {
  const base = $node['Code: Build Product Media Lookup']?.json || $node['Code: Build Product Media Rows']?.json || $json;
  const existingRows = Array.isArray($json) ? $json : ($json.data || $json.body || []);
  const rows = supabase.filterMissingProductMediaRows(base.productMediaRows || [], existingRows);
  return { json: { ...base, existingProductMediaRows: existingRows, productMediaInsertRows: rows, skipProductMediaInsert: rows.length === 0 } };
}`
  },
  {
    file: 'availability.generated.js',
    name: 'Code: mapAvailability',
    mode: 'runOnceForEachItem',
    glue: `
const inventory = __require('./inventory.js');
async function main() {
  const mapped = inventory.mapAvailability($json.parsed && $json.parsed.availability);
  return { json: { ...$json, parsed: { ...$json.parsed, inventory: mapped } } };
}`
  },
  {
    file: 'shopify-from-supabase.generated.js',
    name: 'Code: Build Shopify Payload From Supabase',
    mode: 'runOnceForEachItem',
    glue: `
const supabase = __require('./supabase-product.js');
const validator = __require('./validate-shopify-shape.js');
async function main() {
  const row = $json.supabaseProduct || $json.supplierProduct || $json;
  const existingProduct = $json.existingProduct || null;
  const payload = supabase.buildShopifyPayloadFromSupabaseRecord(row, { existingProduct, existingTags: existingProduct?.tags || [] });
  if (payload.skipped) return { json: { ...$json, payload, skipWrite: true, reason: payload.reason } };
  validator.assertValidShopifyProductShape(payload, existingProduct?.tags?.includes('enriched') ? { mode: 'price_availability_only' } : {});
  return { json: { ...$json, payload, productId: payload.product.id || row.shopify_product_id || null } };
}`
  },
  {
    file: 'supabase-shopify-sync.generated.js',
    name: 'Code: Build Supabase Shopify Sync Payload',
    mode: 'runOnceForEachItem',
    glue: `
const supabase = __require('./supabase-product.js');
async function main() {
  const base = $node['Code: Build Shopify Payload From Supabase']?.json || $json;
  const sync = supabase.buildShopifySyncPayload(base.supabaseProduct || base.supplierProduct || {}, $json, {
    payload: base.payload,
    existingProduct: base.existingProduct,
    existingTags: base.existingProduct?.tags || []
  });
  return { json: { ...base, shopifyResponse: $json, ...sync } };
}`
  },
  {
    file: 'sync-error.generated.js',
    name: 'Code: Build Sync Error Row',
    mode: 'runOnceForEachItem',
    glue: `
const supabase = __require('./supabase-product.js');
async function main() {
  const errorRow = supabase.buildSyncErrorRow($json.error || $json.errorMessage || 'Unknown sync error', {
    syncRunId: $json.syncRunId,
    supabaseProductId: $json.supabaseProductId || $json.supabaseProduct?.id,
    sourceUrl: $json.sourceUrl || $json.parsed?.sourceUrl,
    errorType: $json.errorType || 'unknown',
    rawPayload: $json
  });
  return { json: { ...$json, syncErrorRow: errorRow } };
}`
  },
  {
    file: 'buildLookup.generated.js',
    name: 'Code: Build Shopify Lookup',
    mode: 'runOnceForEachItem',
    glue: `
const shopify = __require('./shopify-client.js');
async function main() {
  const sourceUrl = $json.sourceUrl || ($json.parsed && $json.parsed.sourceUrl);
  const supplierId = $json.supplierProductId || ($json.parsed && $json.parsed.supplierProductId) || shopify.productIdFromUrl(sourceUrl);
  const request = shopify.buildLookupProductRequest({ shopDomain: $env?.SHOPIFY_STORE_DOMAIN, sourceUrl, supplierId, apiVersion: $env?.SHOPIFY_API_VERSION });
  return { json: { ...$json, lookupRequest: request, lookup: { sourceUrl, supplierId } } };
}`
  },
  {
    file: 'selectExisting.generated.js',
    name: 'Code: Select Existing Product',
    mode: 'runOnceForEachItem',
    glue: `
const shopify = __require('./shopify-client.js');
async function main() {
  const criteria = $node['Code: Build Shopify Lookup']?.json?.lookup || $json.lookup || {};
  const existingProduct = shopify.selectLookupProduct($json, criteria);
  return { json: { ...($node['Code: Build Shopify Lookup']?.json || $json), existingProduct } };
}`
  },
  {
    file: 'buildPayload.generated.js',
    name: 'Code: buildPayload',
    mode: 'runOnceForEachItem',
    glue: `
const payloads = __require('./build-shopify-payload.js');
const validator = __require('./validate-shopify-shape.js');
async function main() {
  const payload = payloads.buildPayload({ ...$json.parsed, existingProduct: $json.existingProduct, existingTags: $json.existingProduct?.tags || [] });
  if (payload.skipped) return { json: { ...$json, payload, skipWrite: true, reason: payload.reason } };
  validator.assertValidShopifyProductShape(payload, $json.existingProduct?.tags?.includes('enriched') ? { mode: 'price_availability_only' } : {});
  return { json: { ...$json, payload, productId: payload.product.id || null } };
}`
  },
  {
    file: 'findMissing.generated.js',
    name: 'Code: Find Missing Supplier Products',
    mode: 'runOnceForAllItems',
    glue: `
async function main() {
  const crawlItems = $items('Crawl Supplier URLs');
  const seen = {};
  for (const item of crawlItems) if (item.json.sourceUrl) seen[item.json.sourceUrl] = true;
  const imported = $json.data?.products?.nodes || [];
  return imported.filter((product) => product.metafield?.value && !seen[product.metafield.value]).map((product) => ({ json: {
    parsed: { sourceUrl: product.metafield.value, supplierPrice: null, supplierCompareAtPrice: null, availability: 'missing' },
    existingProduct: { id: product.legacyResourceId || product.id, graphqlId: product.id, title: product.title, tags: product.tags || [], variants: (product.variants?.nodes || []).map((variant) => ({ id: variant.legacyResourceId || variant.id, graphqlId: variant.id })) }
  }}));
}`
  },
  {
    file: 'buildMissing.generated.js',
    name: 'Code: buildPayload Missing',
    mode: 'runOnceForEachItem',
    glue: `
const payloads = __require('./build-shopify-payload.js');
const validator = __require('./validate-shopify-shape.js');
async function main() {
  const payload = payloads.buildPayload({ ...$json.parsed, existingProduct: $json.existingProduct, existingTags: $json.existingProduct?.tags || [] });
  validator.assertValidShopifyProductShape(payload, { mode: 'price_availability_only' });
  return { json: { ...$json, payload, productId: payload.product.id } };
}`
  },
  {
    file: 'image-pipeline-brief.generated.js',
    name: 'Code: Build Higgsfield Request (Image Pipeline)',
    mode: 'runOnceForEachItem',
    glue: `
const creative = __require('./image-pipeline/creative-brief.js');
async function main() {
  const job = $json.imageGenerationJob || $json.job || {};
  const product = $json.supabaseProduct || $json.product || {};
  const brandStyle = $json.brandStyle || {
    base_prompt_fragment: 'Luxury ecommerce fragrance photography. Ivory, gold, refined Calapres boutique mood. No readable text, no people, no watermark.',
    negative_prompt: 'low quality, blurry, distorted bottle, fake text, watermark, hands, faces',
    reference_image_weight: 0.85
  };
  const brief = {
    id: job.id,
    shopify_product_id: product.shopify_product_id,
    product_title: product.product_title_en || product.product_title_ar,
    brand_name: product.brand_name,
    concentration: product.concentration,
    size_ml: product.size_ml,
    reference_image_url: job.reference_image_url || $json.referenceImageUrl
  };
  const jobType = job.job_type || 'product_hero';
  return { json: { ...$json, higgsfieldRequest: creative.buildHiggsfieldRequest(brief, brandStyle, jobType), brief, brandStyle, jobType } };
}`
  },
  {
    file: 'image-pipeline-quality.generated.js',
    name: 'Code: Run Quality Gate (Image Pipeline)',
    mode: 'runOnceForEachItem',
    glue: `
const quality = __require('./image-pipeline/quality-gate.js');
async function main() {
  const response = $json.higgsfieldResponse || $json.response || $json;
  const context = { referenceImageUrl: $json.brief?.reference_image_url || $json.referenceImageUrl || null };
  const result = quality.runQualityChecks(response, context);
  const action = quality.decideAction(result, Number($json.retryCount || $json.imageGenerationJob?.retry_count || 0));
  return { json: { ...$json, qualityResult: result, nextImageAction: action } };
}`
  },
  {
    file: 'enrich-prompt.generated.js',
    name: 'Code: Build Higgsfield Prompt',
    mode: 'runOnceForEachItem',
    glue: `
const prompts = __require('./enrich/prompt.js');
async function main() {
  return { json: { ...$json, higgsfieldPrompt: prompts.buildHiggsfieldPrompts($json.product || $json) } };
}`
  },
  {
    file: 'enrich-seo.generated.js',
    name: 'Code: Build Arabic SEO',
    mode: 'runOnceForEachItem',
    glue: `
const seo = __require('./enrich/seo.js');
async function main() {
  return { json: { ...$json, arabicSeo: seo.buildArabicSeo($json.product || $json) } };
}`
  },
  {
    file: 'enrich-payload.generated.js',
    name: 'Code: Build Enriched Payload',
    mode: 'runOnceForEachItem',
    glue: `
const enrich = __require('./enrich/build-enrich-payload.js');
const validator = __require('./validate-shopify-shape.js');
async function main() {
  const payload = enrich.buildEnrichPayload({ product: $json.product, generatedImages: $json.generatedImages || $json.images, productId: $json.productId });
  validator.assertValidShopifyProductShape(payload);
  return { json: { ...$json, payload, productId: payload.product.id } };
}`
  },
  {
    file: 'brand-normalize.generated.js',
    name: 'Code: Resolve Brand + Parent Name (Offline Enrichment)',
    mode: 'runOnceForEachItem',
    offlineOnly: true,
    glue: `
const normalizer = __require('./normalize.js');
const CONCENTRATION_TOKENS = [
  'eau de parfum', 'eau de toilette', 'eau de cologne', 'le parfum',
  'edp', 'edt', 'edc', 'extrait', 'parfum', 'cologne',
  'او دو برفيوم', 'او دو بارفيوم', 'اودي بارفيوم', 'او دو تواليت',
  'ماء عطر', 'ماء تواليت', 'بارفيوم', 'برفيوم', 'كولونيا', 'اكستريت',
  'اكسيتريت', 'مستخلص'
];
const GENDER_TOKENS = ['for women', 'for men', 'for him', 'for her', 'pour homme', 'pour femme', 'women', 'woman', 'men', 'man', 'unisex', 'ladies', 'نسائي', 'للنساء', 'حريمي', 'رجالي', 'للرجال', 'للجنسين', 'مشترك'];
const TESTER_TOKENS = ['tester', 'test', 'تستر', 'تيستر', 'عينة'];
const GIFT_SET_TOKENS = ['gift set', 'giftset', 'gift box', 'set', 'coffret', 'طقم', 'مجموعة', 'هدية', 'بوكس'];
const PRODUCT_NOISE_TOKENS = ['perfume', 'fragrance', 'body spray', 'hair perfume', 'hair and body mist', 'عطر', 'العطر', 'عطور', 'العطور', 'عينة', 'عينات', 'جديد المتجر', 'المتجر'];

async function main() {
  const source = typeof $json === 'object' && $json ? $json : {};
  const title = normalizer.cleanTitle(source.title || source.name || source.product_title_ar || source.product_title_en || '');
  const brandRecord = normalizer.resolveBrand(source.brand || source.brand_name || source.vendor, title);
  const concentration = firstNonEmpty(source.concentration, normalizer.normalizeConcentration(title));
  const sizeMl = firstFinite(source.sizeMl, source.size_ml, source.size, normalizer.normalizeSizeMl(title));
  const gender = firstNonEmpty(source.gender, source.gender_target, normalizer.normalizeGender(title));
  const isTester = detectFlag(title, TESTER_TOKENS) || Boolean(source.is_tester);
  const isGiftSet = detectFlag(title, GIFT_SET_TOKENS) || Boolean(source.is_gift_set);
  const coreName = stripToCoreName(title, brandRecord);
  const normalizedName = normalizer.fold(coreName);
  const reviewReasons = [];
  if (!brandRecord) reviewReasons.push('missing_canonical_brand');
  if (!normalizedName) reviewReasons.push('missing_normalized_name');
  return { json: {
    ...source,
    normalized_title: title,
    brand_name: brandRecord ? brandRecord.name_en : '',
    brand_name_en: brandRecord ? brandRecord.name_en : '',
    brand_name_ar: brandRecord ? brandRecord.name_ar : '',
    brand_slug: brandRecord ? brandRecord.slug : '',
    brand_lookup: brandRecord ? {
      rpc: 'calapres_resolve_brand',
      params: {
        p_name_en: brandRecord.name_en,
        p_name_ar: brandRecord.name_ar
      }
    } : null,
    normalized_name: normalizedName,
    canonical_name_en: latinOnly(coreName),
    canonical_name_ar: arabicOnly(coreName),
    concentration: concentration || null,
    size_ml: sizeMl,
    gender_target: gender || null,
    is_tester: isTester,
    is_gift_set: isGiftSet,
    size_label: buildSizeLabel(sizeMl, isTester, isGiftSet),
    variant_title: buildVariantTitle(sizeMl, isTester, isGiftSet, concentration),
    needs_review: reviewReasons.length > 0,
    review_reason: reviewReasons.join(',') || null,
    enrichment_brand_map: {
      source: 'nawadirdior_title',
      ignored_store_brand: normalizer.isStoreBrandName(source.brand || source.brand_name || source.vendor),
      brand: brandRecord,
      normalized_name: normalizedName
    }
  } };
}

function stripToCoreName(title, brandRecord) {
  let text = ' ' + normalizer.stripStoreBrandNames(normalizer.foldArabicDigits(String(title || ''))) + ' ';
  for (const form of brandSurfaceForms(brandRecord)) text = removeToken(text, form);
  for (const token of CONCENTRATION_TOKENS) text = removeToken(text, token);
  for (const token of GENDER_TOKENS) text = removeToken(text, token);
  for (const token of TESTER_TOKENS) text = removeToken(text, token);
  for (const token of GIFT_SET_TOKENS) text = removeToken(text, token);
  for (const token of PRODUCT_NOISE_TOKENS) text = removeToken(text, token);
  text = text.replace(/\\d+(?:\\.\\d+)?\\s*-?\\s*(?:ml|m\\.l|مل|ملي|مليلتر)/gi, ' ');
  text = text.replace(/\\b(?:30|40|45|50|60|67|75|80|90|100|110|125|150|200)\\b/g, ' ');
  return text.replace(/[‌‏]/g, ' ').replace(/[-_/|,،.]+/g, ' ').replace(/\\s+/g, ' ').trim();
}

function brandSurfaceForms(record) {
  if (!record) return [];
  return unique([record.name_en, record.name_ar].concat(record.aliases || [])).sort((a, b) => b.length - a.length);
}

function removeToken(haystack, token) {
  const needle = String(token || '').trim();
  if (!needle) return haystack;
  if (/[a-z]/i.test(needle)) {
    const escaped = escapeRegExp(needle).replace(/\\s+/g, '\\\\s+');
    return haystack.replace(new RegExp('(^|[^a-z])' + escaped + '(?=$|[^a-z])', 'gi'), '$1 ');
  }
  return haystack.split(needle).join(' ');
}

function escapeRegExp(value) {
  const specials = ['\\\\', '^', '$', '*', '+', '?', '.', '(', ')', '|', '[', ']', '{', '}', '-', '/'];
  let out = '';
  for (const char of String(value || '')) out += specials.includes(char) ? '\\\\' + char : char;
  return out;
}

function detectFlag(text, tokens) {
  const folded = normalizer.fold(text);
  return tokens.some((token) => folded.indexOf(normalizer.fold(token)) !== -1);
}

function buildSizeLabel(sizeMl, isTester, isGiftSet) {
  if (isTester) return 'Tester';
  if (isGiftSet) return 'Gift Set';
  return sizeMl ? sizeMl + 'ml' : 'Standard';
}

function buildVariantTitle(sizeMl, isTester, isGiftSet, concentration) {
  const parts = [];
  if (sizeMl) parts.push(sizeMl + 'ml');
  if (concentration) parts.push(concentration);
  if (isTester) parts.push('Tester');
  if (isGiftSet) parts.push('Gift Set');
  return parts.join(' ').trim() || 'Standard';
}

function latinOnly(value) {
  const out = String(value || '').replace(/[^\\u0000-\\u024F]/g, ' ').replace(/\\s+/g, ' ').trim();
  return /[a-z]/i.test(out) ? out : '';
}

function arabicOnly(value) {
  const out = String(value || '').replace(/[^\\u0600-\\u06FF\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
  return /[\\u0600-\\u06FF]/.test(out) ? out : '';
}

function firstNonEmpty() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
}

function firstFinite() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
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
}`
  },
  {
    file: 'enrichment-anthropic.generated.js',
    name: 'Code: Build Anthropic Fragrance Enrichment (Offline)',
    mode: 'runOnceForEachItem',
    offlineOnly: true,
    glue: `
async function main() {
  const source = typeof $json === 'object' && $json ? $json : {};
  const forceUpdate = truthy(source.force_update);
  const row = source.fragrance_product && typeof source.fragrance_product === 'object' ? source.fragrance_product : source;
  const existingTags = normalizeTags(row.tags || source.tags);
  const protectedColumns = ['description_ar', 'description_en', 'seo_title_ar', 'seo_title_en', 'seo_description_ar', 'seo_description_en', 'seo_keywords'];
  const hasEnrichedContent = protectedColumns.some((key) => hasValue(row[key]));
  const isEnriched = truthy(row.is_enriched);
  const guardBlocked = (isEnriched || hasEnrichedContent) && !forceUpdate;
  const fragranceFacts = buildFragranceFacts(source, row);
  const prompt = buildAnthropicPrompt(fragranceFacts);

  if (guardBlocked) {
    return { json: {
      ...source,
      should_call_anthropic: false,
      enrichment_status: 'skipped_existing_enrichment',
      enrichment_guard: {
        blocked: true,
        reason: isEnriched ? 'is_enriched_true' : 'existing_enriched_content',
        force_update: forceUpdate,
        protected_columns: protectedColumns.filter((key) => hasValue(row[key]))
      },
      anthropic_prompt: prompt,
      fragrance_product_update: null
    } };
  }

  const rawResponse = firstNonEmpty(source.anthropic_response, source.anthropic_output, source.enrichment_response, source.llm_response);
  const parsed = rawResponse ? parseAnthropicJson(rawResponse) : null;
  const mapped = parsed && parsed.ok ? mapEnrichmentToColumns(parsed.value, existingTags) : null;
  const status = rawResponse ? (mapped ? 'enriched_ready' : 'enrichment_parse_failed') : 'prompt_ready';
  return { json: {
    ...source,
    should_call_anthropic: !rawResponse,
    enrichment_status: status,
    enrichment_guard: {
      blocked: false,
      force_update: forceUpdate,
      protected_columns: protectedColumns.filter((key) => hasValue(row[key]))
    },
    anthropic_prompt: prompt,
    parsed_enrichment: parsed ? parsed.value : null,
    enrichment_parse_error: parsed && !parsed.ok ? parsed.error : null,
    fragrance_product_update: mapped,
    fragrance_product_update_contract: {
      table: 'fragrance_products',
      key: 'id',
      key_value: row.id || source.fragrance_product_id || null,
      method: 'PATCH',
      note: 'Live agent must wire this payload; this Code node performs no HTTP call.'
    }
  } };
}

function buildFragranceFacts(input, existingRow) {
  const brandNameEn = firstNonEmpty(input.brand_name_en, input.brandNameEn, input.brand_name, existingRow.brand_name_en, existingRow.brand_name, input.brand && input.brand.name_en);
  const brandNameAr = firstNonEmpty(input.brand_name_ar, input.brandNameAr, existingRow.brand_name_ar, input.brand && input.brand.name_ar);
  const normalizedName = firstNonEmpty(input.normalized_name, input.normalizedName, existingRow.normalized_name);
  const canonicalNameEn = firstNonEmpty(input.canonical_name_en, input.canonicalNameEn, existingRow.name_en, existingRow.canonical_name_en, normalizedName);
  const canonicalNameAr = firstNonEmpty(input.canonical_name_ar, input.canonicalNameAr, existingRow.name_ar, existingRow.canonical_name_ar);
  return {
    brand_name_en: brandNameEn || '',
    brand_name_ar: brandNameAr || '',
    normalized_name: normalizedName || '',
    canonical_name_en: canonicalNameEn || '',
    canonical_name_ar: canonicalNameAr || '',
    concentration: firstNonEmpty(input.concentration, existingRow.concentration) || '',
    gender_target: firstNonEmpty(input.gender_target, input.gender, existingRow.gender_target) || '',
    size_ml: firstNonEmpty(input.size_ml, input.sizeMl, existingRow.size_ml) || '',
    supplier_title: firstNonEmpty(input.title, input.name, input.normalized_title, input.rawTitle) || '',
    supplier_description: firstNonEmpty(input.description, input.supplier_description, input.raw_description) || '',
    existing_tags: normalizeTags(existingRow.tags || input.tags)
  };
}

function buildAnthropicPrompt(facts) {
  const schema = {
    description_ar: 'Arabic luxury product description, 90-130 words, truthful, no unverifiable claims.',
    description_en: 'Concise English product description, 45-70 words, factual and retail-safe.',
    seo_title_ar: 'Arabic SEO title, max 65 characters.',
    seo_title_en: 'English SEO title, max 65 characters.',
    seo_description_ar: 'Arabic meta description, max 155 characters.',
    seo_description_en: 'English meta description, max 155 characters.',
    seo_keywords: ['5-10 Arabic/English keyword phrases, no duplicates.'],
    tags: ['Optional extra collection tags; keep existing tags when mapping.']
  };
  return {
    system: [
      'You write luxury fragrance catalog copy for Calapres.',
      'Return strict JSON only. Do not include markdown.',
      'Use the supplied facts only. Do not invent notes, perfumer, launch year, awards, concentration, size, or gender.',
      'Arabic copy should sound premium, warm, and retail-safe for Saudi customers.'
    ].join(' '),
    user: [
      'Create enrichment copy and SEO for this fragrance parent.',
      '',
      'Facts:',
      JSON.stringify(facts, null, 2),
      '',
      'Return JSON with exactly these keys:',
      JSON.stringify(schema, null, 2)
    ].join('\\n'),
    response_format: 'json_object',
    target_columns: ['description_ar', 'description_en', 'seo_title_ar', 'seo_title_en', 'seo_description_ar', 'seo_description_en', 'seo_keywords', 'tags', 'is_enriched', 'enrichment_status', 'enriched_at']
  };
}

function parseAnthropicJson(response) {
  const text = stripCodeFence(extractText(response));
  if (!text) return { ok: false, value: null, error: 'empty_response_text' };
  const candidates = [text, extractJsonObject(text)].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return { ok: true, value: JSON.parse(candidate), error: null };
    } catch (_err) {
      // Try the next candidate.
    }
  }
  return { ok: false, value: null, error: 'invalid_json_response' };
}

function mapEnrichmentToColumns(parsed, existingTags) {
  const cleaned = {
    description_ar: cleanText(parsed.description_ar),
    description_en: cleanText(parsed.description_en),
    seo_title_ar: limit(cleanText(parsed.seo_title_ar), 65),
    seo_title_en: limit(cleanText(parsed.seo_title_en), 65),
    seo_description_ar: limit(cleanText(parsed.seo_description_ar), 155),
    seo_description_en: limit(cleanText(parsed.seo_description_en), 155),
    seo_keywords: normalizeKeywords(parsed.seo_keywords),
    tags: mergeTags(existingTags, parsed.tags, ['enriched']),
    is_enriched: true,
    enrichment_status: 'enriched',
    enriched_at: new Date().toISOString()
  };
  const required = ['description_ar', 'seo_title_ar', 'seo_title_en', 'seo_description_ar', 'seo_description_en'];
  const missing = required.filter((key) => !hasValue(cleaned[key]));
  if (missing.length > 0) {
    return {
      enrichment_status: 'needs_review',
      enrichment_error: 'missing_required_fields:' + missing.join(','),
      tags: mergeTags(existingTags, parsed.tags, [])
    };
  }
  return cleaned;
}

function extractText(response) {
  if (typeof response === 'string') return response.trim();
  if (!response || typeof response !== 'object') return '';
  if (typeof response.text === 'string') return response.text.trim();
  if (typeof response.content === 'string') return response.content.trim();
  if (Array.isArray(response.content)) {
    return response.content.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part.text === 'string') return part.text;
      return '';
    }).join('\\n').trim();
  }
  if (response.message) return extractText(response.message);
  if (response.data) return extractText(response.data);
  return '';
}

function stripCodeFence(value) {
  let text = String(value || '').trim();
  const fence = String.fromCharCode(96, 96, 96);
  if (text.indexOf(fence) === 0) {
    text = text.slice(fence.length).trim();
    if (text.toLowerCase().indexOf('json') === 0) text = text.slice(4).trim();
    if (text.lastIndexOf(fence) === text.length - fence.length) text = text.slice(0, -fence.length).trim();
  }
  return text;
}

function extractJsonObject(text) {
  const raw = String(text || '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return start >= 0 && end > start ? raw.slice(start, end + 1) : '';
}

function cleanText(value) {
  return String(value || '').replace(/\\s+/g, ' ').trim();
}

function limit(value, max) {
  const text = cleanText(value);
  return text.length > max ? text.slice(0, max - 1).trim() : text;
}

function normalizeKeywords(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,،]/);
  const seen = {};
  const out = [];
  for (const item of raw) {
    const text = cleanText(item);
    const key = text.toLowerCase();
    if (text && !seen[key]) {
      seen[key] = true;
      out.push(text);
    }
  }
  return out.slice(0, 10);
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeTags(parsed);
    } catch (_err) {
      // Treat non-JSON strings as comma-separated tags.
    }
    return trimmed.split(/[,،]/).map(cleanText).filter(Boolean);
  }
  return [];
}

function mergeTags() {
  const seen = {};
  const out = [];
  for (let i = 0; i < arguments.length; i += 1) {
    for (const tag of normalizeTags(arguments[i])) {
      const key = tag.toLowerCase();
      if (!seen[key]) {
        seen[key] = true;
        out.push(tag);
      }
    }
  }
  return out;
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function truthy(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function firstNonEmpty() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (hasValue(value)) return value;
  }
  return null;
}`
  }
];

function moduleBundle() {
  const entries = modules.map((modulePath) => {
    const abs = path.join(__dirname, modulePath.replace(/^\.\//, ''));
    const code = fs.readFileSync(abs, 'utf8');
    return JSON.stringify(modulePath) + ': function(module, exports, __require) {\nconst require = __require;\n' + code + '\n}';
  });
  return `
const __modules = {
${entries.join(',\n')}
};
const __cache = {};
function __require(id) {
  const normalized = normalizeModuleId(id);
  if (!__modules[normalized]) throw new Error('Unknown bundled module: ' + id);
  if (!__cache[normalized]) {
    const module = { exports: {} };
    __cache[normalized] = module;
    __modules[normalized](module, module.exports, __require);
  }
  return __cache[normalized].exports;
}
function normalizeModuleId(id) {
  const parts = [];
  for (const part of String(id).replace(/^\\.\\//, '').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return './' + parts.join('/');
}
`;
}

function writeGenerated() {
  fs.mkdirSync(outDir, { recursive: true });
  const bundle = moduleBundle();
  for (const node of nodes) {
    const content = [
      '// Generated by sync/build-n8n-nodes.js. Do not edit by hand.',
      '// n8n node: ' + node.name,
      bundle,
      node.glue.trim(),
      'await main();',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(outDir, node.file), content);
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(buildManifest(), null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'README.md'), buildReadme());
}

function buildManifest() {
  return {
    generatedAt: 'deterministic',
    apiVersionStandard: config.API_VERSION_STANDARD,
    apiVersionDeployed: config.API_VERSION_DEPLOYED,
    credentialRefs: {
      shopify: config.CREDENTIALS.shopifyOAuth2,
      higgsfield: config.CREDENTIALS.higgsfieldHeaderAuth,
      supabase: config.CREDENTIALS.supabaseServiceRole
    },
    trigger: { type: 'schedule', everyHours: 6, timezone: 'Asia/Riyadh' },
    nodes: nodes.map((node, index) => ({
      order: index + 1,
      name: node.name,
      file: node.file,
      mode: node.mode,
      ...(node.offlineOnly ? { offlineOnly: true } : {})
    })),
    connectionGraph: [
      ['Schedule Trigger', 'Crawl Supplier URLs'],
      ['Crawl Supplier URLs', 'HTTP GET Supplier Product'],
      ['HTTP GET Supplier Product', 'Code: parseProduct'],
      ['Code: parseProduct', 'Code: Normalize Supplier Product'],
      ['Code: Normalize Supplier Product', 'Code: applyPricing'],
      ['Code: applyPricing', 'Code: Build Supabase Upsert Payload'],
      ['Code: Build Supabase Upsert Payload', 'HTTP POST: Supabase Upsert supplier_products'],
      ['HTTP POST: Supabase Upsert supplier_products', 'Code: Resolve Fragrance Parent'],
      ['Code: Resolve Fragrance Parent', 'HTTP POST: Supabase Upsert fragrance_products (skip when needs_review)'],
      ['HTTP POST: Supabase Upsert fragrance_products (skip when needs_review)', 'Code: Build Variant Upsert Payload'],
      ['Code: Build Variant Upsert Payload', 'HTTP POST: Supabase Upsert product_variants'],
      ['HTTP POST: Supabase Upsert product_variants', 'HTTP PATCH: Supabase supplier_products link fragrance+variant'],
      ['HTTP PATCH: Supabase supplier_products link fragrance+variant', 'Code: Build Product Media Rows'],
      ['Code: Build Product Media Rows', 'Code: Build Product Media Lookup'],
      ['Code: Build Product Media Lookup', 'HTTP GET: Supabase Existing product_media'],
      ['HTTP GET: Supabase Existing product_media', 'Code: Filter Product Media Rows'],
      ['Code: Filter Product Media Rows', 'HTTP POST: Supabase Insert Missing product_media'],
      ['HTTP POST: Supabase Insert Missing product_media', 'Code: mapAvailability'],
      ['Code: mapAvailability', 'Code: Build Shopify Lookup'],
      ['Code: Build Shopify Lookup', 'Shopify Admin GraphQL: Lookup Existing'],
      ['Shopify Admin GraphQL: Lookup Existing', 'Code: Select Existing Product'],
      ['Code: Select Existing Product', 'Code: Build Shopify Payload From Supabase'],
      ['Code: Build Shopify Payload From Supabase', 'Shopify Admin REST create/update'],
      ['Shopify Admin REST create/update', 'Code: Build Supabase Shopify Sync Payload'],
      ['Code: Build Supabase Shopify Sync Payload', 'HTTP PATCH: Supabase supplier_products Shopify fields'],
      ['Code: Build Supabase Shopify Sync Payload', 'HTTP POST: Supabase Upsert shopify_products'],
      ['HTTP GET: Supabase fragrance_products + product_variants (grouped)', 'Code: Build Shopify Product From Fragrance'],
      ['Code: Build Shopify Product From Fragrance', 'Shopify Admin REST create/update product+variants'],
      ['Supabase List fragrance_products (enrichment pending)', 'Code: Merge Enrichment Facts'],
      ['Code: Merge Enrichment Facts', 'HTTP PATCH: Supabase fragrance_products enrichment'],
      ['Shopify Admin GraphQL: List Imported Products', 'Code: Find Missing Supplier Products'],
      ['Code: Find Missing Supplier Products', 'Code: buildPayload Missing'],
      ['Workflow Error Trigger', 'Code: Build Sync Error Row'],
      ['Code: Build Sync Error Row', 'HTTP POST: Supabase Insert sync_errors'],
      ['Supabase List Pending Image Jobs', 'Code: Build Higgsfield Request (Image Pipeline)'],
      ['Code: Build Higgsfield Request (Image Pipeline)', 'HTTP Request: Higgsfield Generate Images'],
      ['HTTP Request: Higgsfield Generate Images', 'Code: Run Quality Gate (Image Pipeline)'],
      ['Code: Run Quality Gate (Image Pipeline)', 'HTTP PATCH: Supabase image_generation_jobs/generated_assets'],
      ['Code: Build Higgsfield Prompt', 'HTTP Request: Higgsfield Generate Images'],
      ['HTTP Request: Higgsfield Generate Images', 'Code: Build Arabic SEO'],
      ['Code: Build Arabic SEO', 'Code: Build Enriched Payload']
    ]
  };
}

function buildReadme() {
  return [
    '# Generated n8n Code Nodes',
    '',
    'Generated by `node sync/build-n8n-nodes.js`. Claude deploys these bundles in n8n; Codex does not deploy live workflows.',
    '',
    '| n8n node | File | Mode |',
    '| --- | --- | --- |',
    ...nodes.map((node) => '| ' + node.name + ' | `' + node.file + '` | `' + node.mode + '` |'),
    '',
    'The bundles inline `sync/` helpers, config, offset chunking, one-product guards (`CALAPRES_SYNC_LIMIT`, `CALAPRES_TEST_PRODUCT_ID`, `CALAPRES_TEST_PRODUCT_URL`), carry-through parsing, canCreate guards, enriched guard, and validation.',
    '',
    'The offline enrichment bundles are not wired into the live workflow by Codex. They are self-contained Code-node candidates for the live agent to add later to enrichment workflow `vNnk9ivt8HqCOZfu`.'
  ].join('\n') + '\n';
}

function loadCommonJs(modulePath) {
  const file = path.join(__dirname, modulePath.replace(/^\.\//, ''));
  const code = fs.readFileSync(file, 'utf8');
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports }, { filename: file, timeout: 1000 });
  return module.exports;
}

writeGenerated();
