// One-time script: seeds creative_briefs rows from enriched Shopify products.
// Run once after deploying the image_pipeline migration.
//
// Usage (n8n Manual Trigger + Code node — or run via run-local-dry.js):
//   node sync/image-pipeline/seed-creative-briefs.js
//
// What it does:
//   1. Fetches all Shopify products tagged `enriched`
//   2. Builds one creative_briefs row per product
//      - reference_image_url = first Shopify product image (original supplier shot)
//      - product_image_status = 'pending'  → picked up by Workflow 1
//   3. POSTs to Supabase /rest/v1/creative_briefs with upsert

const normalize = require('../normalize.js');

function buildBriefFromShopifyProduct(product) {
  const item = normalize.normalizeProduct(product || {});
  const firstImage = product.images && product.images[0] && product.images[0].src;
  return {
    shopify_product_id: String(product.id || product.legacyResourceId || ''),
    product_title: item.title || product.title || '',
    brand_name: item.brand || product.vendor || '',
    concentration: item.concentration || '',
    size_ml: item.sizeMl ? parseInt(item.sizeMl, 10) : null,
    collection_theme: guessTheme(product),
    gender: guessGender(product),
    reference_image_url: firstImage || null,
    needs_product_images: true,
    needs_ad_images: false,
    needs_collection_banner: false,
    product_image_status: 'pending',
    collection_banner_status: 'pending',
    ad_image_status: 'pending',
  };
}

function guessTheme(product) {
  const tags = Array.isArray(product.tags) ? product.tags : (product.tags || '').split(',').map(t => t.trim());
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (lower.includes('oud') || lower.includes('عود')) return 'oud';
    if (lower.includes('oriental') || lower.includes('شرقي')) return 'oriental';
    if (lower.includes('floral') || lower.includes('زهري')) return 'floral';
    if (lower.includes('woody') || lower.includes('خشبي')) return 'woody';
    if (lower.includes('fresh') || lower.includes('طازج')) return 'fresh';
  }
  const handles = ['eastern-oud-incense'];
  const collections = product.collections || [];
  if (collections.some(c => handles.includes(c.handle || c))) return 'oud';
  return 'niche';
}

function guessGender(product) {
  const tags = Array.isArray(product.tags) ? product.tags : (product.tags || '').split(',').map(t => t.trim());
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (lower.includes('men') || lower.includes('رجالي')) return 'men';
    if (lower.includes('women') || lower.includes('نسائي')) return 'women';
    if (lower.includes('unisex') || lower.includes('للجنسين')) return 'unisex';
  }
  return 'unisex';
}

// n8n Code node version (paste directly into n8n):
function n8nSeedNode() {
  // This function body is pasted into a Code node after fetching enriched products from Shopify.
  // Input: $input.all() contains Shopify products from a REST or GraphQL call.
  const products = $input.all().flatMap(item => {
    const nodes = item.json.data?.products?.nodes || item.json.products || [item.json];
    return nodes;
  });
  return products.map(product => ({ json: buildBriefFromShopifyProduct(product) }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildBriefFromShopifyProduct, guessTheme, guessGender };
}

// Direct execution (node sync/image-pipeline/seed-creative-briefs.js)
if (require.main === module) {
  console.log('This script generates creative_briefs rows.');
  console.log('Run via n8n Seed Creative Briefs workflow (see n8n-image-pipeline-flow.md).');
  console.log('Or call buildBriefFromShopifyProduct(shopifyProduct) from your own script.');
}
