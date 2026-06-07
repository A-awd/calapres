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
async function main() {
  const job = $json.imageGenerationJob || $json.job || {};
  const product = $json.fragranceProduct || $json.fragrance_product || $json.fragrance || $json.supabaseProduct || $json.product || {};
  const mediaRows = normalizeMediaRows($json.productMediaRows || $json.product_media || $json.media || $json.productMedia || []);
  const supplierReference = selectSupplierReference(mediaRows, job.reference_image_url || $json.referenceImageUrl);
  const facts = buildFragranceFacts(product, job);
  const positivePrompt = buildWarmLightPrompt(facts, job);
  const negativePrompt = buildWarmLightNegativePrompt();
  const brief = {
    id: job.id,
    image_generation_job_id: job.id || $json.image_generation_job_id || null,
    fragrance_product_id: product.id || product.fragrance_product_id || job.fragrance_product_id || null,
    shopify_product_id: product.shopify_product_id || null,
    product_title: facts.productTitle,
    brand_name: facts.brandName,
    concentration: facts.concentration,
    size_ml: facts.sizeMl,
    visual_identity: 'Warm Light Luxury',
    reference_image_url: supplierReference && supplierReference.url
  };
  const jobType = job.job_type || 'product_hero';
  const request = {
    model: 'nano_banana_pro',
    count: 4,
    n: 4,
    prompt: positivePrompt,
    negative_prompt: negativePrompt,
    aspect_ratio: job.aspect_ratio || '1:1',
    resolution: job.resolution || '2048x2048',
    output_format: 'png',
    style: 'editorial photorealistic luxury product photography',
    reference_images: supplierReference ? [{
      url: supplierReference.url,
      source: 'product_media',
      source_row_id: supplierReference.id || null,
      role: 'product_shape_reference',
      weight: 0.92
    }] : []
  };
  return { json: {
    ...$json,
    higgsfieldRequest: request,
    brief,
    jobType,
    productMediaReference: supplierReference,
    skipImageGeneration: !supplierReference,
    imagePipelineStatus: supplierReference ? 'request_ready' : 'needs_supplier_reference_image',
    warmLightLuxury: {
      palette: ['ivory', 'champagne', 'soft beige'],
      accents: ['gold', 'amber'],
      lighting: 'soft warm editorial studio light',
      absoluteRule: 'never dark or black theme'
    }
  } };
}

function buildFragranceFacts(product, job) {
  const brandName = firstNonEmpty(product.brand_name, product.brand_name_en, product.brandName, product.brand, job.brand_name);
  const nameEn = firstNonEmpty(product.name_en, product.product_title_en, product.title_en, product.canonical_name_en, product.normalized_name);
  const nameAr = firstNonEmpty(product.name_ar, product.product_title_ar, product.title_ar, product.canonical_name_ar);
  return {
    brandName: brandName || 'Calapres fragrance',
    productTitle: firstNonEmpty(nameEn, nameAr, product.title, product.name, 'Luxury fragrance'),
    nameEn: nameEn || '',
    nameAr: nameAr || '',
    concentration: firstNonEmpty(product.concentration, job.concentration) || '',
    sizeMl: firstNonEmpty(product.size_ml, product.sizeMl, job.size_ml, job.sizeMl) || '',
    gender: firstNonEmpty(product.gender_target, product.gender, job.gender_target) || ''
  };
}

function buildWarmLightPrompt(facts, job) {
  const productLine = [
    facts.brandName,
    facts.productTitle,
    facts.concentration,
    facts.sizeMl ? facts.sizeMl + 'ml' : ''
  ].filter(Boolean).join(' ');
  return [
    'Warm Light Luxury fragrance product image for Calapres.',
    'Editorial photorealistic studio product photography.',
    'Show the exact bottle shape, cap, label placement, glass thickness, and proportions from the supplied reference image.',
    'Product: ' + productLine + '.',
    facts.nameAr ? 'Arabic product name context: ' + facts.nameAr + '.' : '',
    'Warm ivory, champagne, and soft beige palette with refined gold and amber accents.',
    'Soft warm lighting, clean luminous background, subtle premium shadows, polished reflective surface.',
    'Centered full bottle, ecommerce-ready composition, premium Saudi boutique mood.',
    'No readable text added by the model except authentic text already visible in the reference bottle.',
    'Absolute visual rule: never use a dark, black, moody, nightclub, gothic, or high-contrast black theme.',
    job.prompt_suffix || ''
  ].filter(Boolean).join(' ');
}

function buildWarmLightNegativePrompt() {
  return [
    'dark background',
    'black background',
    'black theme',
    'dark luxury theme',
    'moody low key lighting',
    'nightclub lighting',
    'blue dark shadows',
    'brown espresso palette',
    'readable fake text',
    'misspelled label',
    'extra logo',
    'watermark',
    'hands',
    'people',
    'distorted bottle',
    'wrong bottle shape',
    'warped cap',
    'crooked sprayer',
    'duplicate bottle',
    'melted glass',
    'blurry',
    'low resolution',
    'cropped product',
    'cut off bottle',
    'busy background'
  ].join(', ');
}

function normalizeMediaRows(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.data)) return value.data;
  if (value && Array.isArray(value.rows)) return value.rows;
  return [];
}

function selectSupplierReference(rows, fallbackUrl) {
  const supplierRows = rows.filter((row) => row && row.source === 'supplier');
  const ranked = supplierRows
    .map((row) => ({ ...row, url: firstNonEmpty(row.original_url, row.url, row.public_url, row.storage_url, row.src) }))
    .filter((row) => isHttpsUrl(row.url))
    .sort((a, b) => Number(a.position || 999) - Number(b.position || 999) || Number(a.id || 0) - Number(b.id || 0));
  if (ranked[0]) return ranked[0];
  if (isHttpsUrl(fallbackUrl)) return { id: null, source: 'fallback', url: fallbackUrl };
  return null;
}

function isHttpsUrl(value) {
  try {
    return new URL(String(value || '')).protocol === 'https:';
  } catch (_err) {
    return false;
  }
}

function firstNonEmpty() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
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
  const request = $json.higgsfieldRequest || {};
  const job = $json.imageGenerationJob || $json.job || {};
  const context = {
    referenceImageUrl: $json.brief?.reference_image_url || $json.referenceImageUrl || null,
    expectedAspectRatio: request.aspect_ratio || job.aspect_ratio || '1:1',
    expectedResolution: request.resolution || job.resolution || '2048x2048',
    expectedCount: Number(request.count || request.n || 4)
  };
  const result = quality.runQualityChecks(response, context);
  const bestOfFour = evaluateBestOfFour(response, context);
  const mergedResult = {
    ...result,
    passed: result.passed && bestOfFour.passed,
    score: Math.min(result.score, bestOfFour.quality_score),
    checks: { ...result.checks, ...bestOfFour.checks },
    issues: result.issues.concat(bestOfFour.issues),
    images: bestOfFour.images.map((image) => image.url),
    bestImageUrl: bestOfFour.best_image_url
  };
  const retryCount = Number($json.retryCount || job.retry_count || 0);
  const action = quality.decideAction(mergedResult, retryCount);
  const qualityStatus = mergedResult.passed ? 'passed' : (action === 'retry' ? 'retry' : 'needs_review');
  const imageGenerationJobPatch = {
    id: job.id || $json.brief?.image_generation_job_id || null,
    quality_status: qualityStatus,
    quality_score: bestOfFour.quality_score,
    best_image_url: bestOfFour.best_image_url,
    status: qualityStatus === 'passed' ? 'ready' : qualityStatus,
    error_message: bestOfFour.issues.join('; ') || null
  };
  const generatedAssetsRows = bestOfFour.images.map((image, index) => ({
    image_generation_job_id: imageGenerationJobPatch.id,
    fragrance_product_id: $json.brief?.fragrance_product_id || job.fragrance_product_id || null,
    source: 'higgsfield',
    asset_type: 'product_image',
    original_url: image.url,
    best_image_url: bestOfFour.best_image_url,
    quality_status: image.accepted ? 'passed' : 'rejected',
    quality_score: image.score,
    is_selected: image.url === bestOfFour.best_image_url,
    sort_order: index + 1,
    raw_payload: image.raw
  }));
  return { json: {
    ...$json,
    qualityResult: mergedResult,
    bestOfFour,
    nextImageAction: action,
    imageGenerationJobPatch,
    generatedAssetsRows
  } };
}

function evaluateBestOfFour(response, context) {
  const rawImages = normalizeImageObjects(response);
  const expectedCount = context.expectedCount || 4;
  const expectedAspect = parseAspectRatio(context.expectedAspectRatio);
  const expectedResolution = parseResolution(context.expectedResolution);
  const images = rawImages.map((raw, index) => scoreImage(raw, index, expectedAspect, expectedResolution))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const accepted = images.filter((image) => image.accepted);
  const checks = {
    output_count_ok: rawImages.length >= expectedCount,
    best_of_4_available: accepted.length > 0,
    aspect_ratio_ok: accepted.some((image) => image.checks.aspect_ratio_ok),
    resolution_ok: accepted.some((image) => image.checks.resolution_ok),
    failed_outputs_rejected: images.filter((image) => isFailure(image.raw)).every((image) => !image.accepted)
  };
  const issues = [];
  if (!checks.output_count_ok) issues.push('Expected ' + expectedCount + ' generated images, got ' + rawImages.length);
  if (!checks.aspect_ratio_ok) issues.push('No candidate image matched expected aspect ratio');
  if (!checks.resolution_ok) issues.push('No candidate image met expected resolution');
  if (!checks.best_of_4_available) issues.push('No generated image passed concrete quality checks');
  const best = accepted[0] || images[0] || null;
  return {
    passed: issues.length === 0,
    quality_score: best ? best.score : 0,
    best_image_url: best && best.accepted ? best.url : null,
    checks,
    issues,
    images
  };
}

function normalizeImageObjects(response) {
  if (!response) return [];
  const raw = response.images || response.data || response.outputs || response.result || [];
  return (Array.isArray(raw) ? raw : [raw]).map((item) => {
    if (typeof item === 'string') return { url: item };
    return item && typeof item === 'object' ? item : {};
  });
}

function scoreImage(raw, index, expectedAspect, expectedResolution) {
  const url = firstNonEmpty(raw.url, raw.src, raw.uri, raw.image_url);
  const width = Number(firstNonEmpty(raw.width, raw.w, raw.metadata && raw.metadata.width));
  const height = Number(firstNonEmpty(raw.height, raw.h, raw.metadata && raw.metadata.height));
  const ratio = width && height ? width / height : null;
  const aspectTolerance = 0.04;
  const checks = {
    url_valid: isHttpsUrl(url),
    not_failed: !isFailure(raw),
    dimensions_present: Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0,
    aspect_ratio_ok: ratio !== null && Math.abs(ratio - expectedAspect) <= aspectTolerance,
    resolution_ok: Number.isFinite(width) && Number.isFinite(height) && width >= expectedResolution.width && height >= expectedResolution.height
  };
  const score = (
    (checks.url_valid ? 20 : 0) +
    (checks.not_failed ? 20 : 0) +
    (checks.dimensions_present ? 15 : 0) +
    (checks.aspect_ratio_ok ? 20 : 0) +
    (checks.resolution_ok ? 25 : 0)
  );
  return {
    index,
    url: checks.url_valid ? url : null,
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
    score,
    accepted: score >= 90,
    checks,
    raw
  };
}

function parseAspectRatio(value) {
  const parts = String(value || '1:1').split(':').map(Number);
  return parts.length === 2 && parts[0] > 0 && parts[1] > 0 ? parts[0] / parts[1] : 1;
}

function parseResolution(value) {
  const match = String(value || '2048x2048').match(/(\\d+)\\s*x\\s*(\\d+)/i);
  if (!match) return { width: 1536, height: 1536 };
  return { width: Math.round(Number(match[1]) * 0.75), height: Math.round(Number(match[2]) * 0.75) };
}

function isFailure(raw) {
  const status = String(firstNonEmpty(raw.status, raw.state, '')).toLowerCase();
  return Boolean(raw.error || raw.failed || status === 'failed' || status === 'rejected' || status === 'error');
}

function isHttpsUrl(value) {
  try {
    return new URL(String(value || '')).protocol === 'https:';
  } catch (_err) {
    return false;
  }
}

function firstNonEmpty() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
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
  }
];

function moduleBundle() {
  const entries = modules.map((modulePath) => {
    const abs = path.join(__dirname, modulePath.replace(/^\.\//, ''));
    const code = fs.readFileSync(abs, 'utf8');
    return JSON.stringify(modulePath) + ': function(module, exports, __require) {\n' + code + '\n}';
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
    nodes: nodes.map((node, index) => ({ order: index + 1, name: node.name, file: node.file, mode: node.mode })),
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
    'The bundles inline `sync/` helpers, config, offset chunking, one-product guards (`CALAPRES_SYNC_LIMIT`, `CALAPRES_TEST_PRODUCT_ID`, `CALAPRES_TEST_PRODUCT_URL`), carry-through parsing, canCreate guards, enriched guard, and validation.'
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
