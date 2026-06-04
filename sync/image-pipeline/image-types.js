// Image type definitions for Calapres automated generation pipeline.
// Each type drives: aspect_ratio, prompt_variant, num_outputs, and Shopify upload target.

const IMAGE_TYPES = {
  // ── Product images (4 shots per product) ──────────────────────────────
  product_hero: {
    jobType: 'product_hero',
    aspectRatio: '1:1',
    resolution: '2048x2048',
    numOutputs: 1,
    promptSuffix: 'Hero angle, product perfectly centered, polished marble surface, photorealistic, main ecommerce shot.',
    shopifyRole: 'main',                // used as product featured image
    entityType: 'product',
  },
  product_angle_rtq: {
    jobType: 'product_angle_rtq',
    aspectRatio: '1:1',
    resolution: '2048x2048',
    numOutputs: 1,
    promptSuffix: 'Three-quarter angle, subtle oud-inspired warm amber styling, gallery shot.',
    shopifyRole: 'gallery',
    entityType: 'product',
  },
  product_angle_detail: {
    jobType: 'product_angle_detail',
    aspectRatio: '1:1',
    resolution: '2048x2048',
    numOutputs: 1,
    promptSuffix: 'Close macro detail angle emphasizing cap, bottle silhouette, and premium glass materials.',
    shopifyRole: 'gallery',
    entityType: 'product',
  },
  product_angle_shelf: {
    jobType: 'product_angle_shelf',
    aspectRatio: '1:1',
    resolution: '2048x2048',
    numOutputs: 1,
    promptSuffix: 'Shelf-ready ecommerce angle, clean background, luxury contrast, slight left elevation.',
    shopifyRole: 'gallery',
    entityType: 'product',
  },

  // ── Collection banners ─────────────────────────────────────────────────
  collection_desktop: {
    jobType: 'collection_desktop',
    aspectRatio: '16:9',
    resolution: '2048x1152',
    numOutputs: 1,
    promptSuffix: 'Wide collection banner, multiple fragrance bottles artfully arranged, luxury brand header image, cinematic horizontal composition.',
    shopifyRole: 'collection_image',
    entityType: 'collection',
  },
  collection_mobile: {
    jobType: 'collection_mobile',
    aspectRatio: '4:5',
    resolution: '2048x2560',
    numOutputs: 1,
    promptSuffix: 'Vertical collection banner, elegant stacked arrangement, mobile-optimized composition, rich dark tones.',
    shopifyRole: 'collection_image_mobile',
    entityType: 'collection',
  },

  // ── Ad creatives ───────────────────────────────────────────────────────
  ad_square: {
    jobType: 'ad_square',
    aspectRatio: '1:1',
    resolution: '2048x2048',
    numOutputs: 1,
    promptSuffix: 'Instagram and Facebook feed ad, bold centered product, high contrast luxury feel, ad-ready composition.',
    shopifyRole: null,                  // goes to Supabase Storage only
    entityType: 'ad',
  },
  ad_story: {
    jobType: 'ad_story',
    aspectRatio: '9:16',
    resolution: '1152x2048',
    numOutputs: 1,
    promptSuffix: 'Instagram and Facebook story ad, vertical composition, product in upper third, luxury dark background, story-optimized framing.',
    shopifyRole: null,
    entityType: 'ad',
  },
  ad_landscape: {
    jobType: 'ad_landscape',
    aspectRatio: '16:9',
    resolution: '2048x1152',
    numOutputs: 1,
    promptSuffix: 'Landscape Facebook feed ad, product left-positioned, elegant negative space right for copy, luxury horizontal format.',
    shopifyRole: null,
    entityType: 'ad',
  },
};

// Shorthand groups used by n8n workflow nodes
const PRODUCT_SHOT_TYPES = ['product_hero', 'product_angle_rtq', 'product_angle_detail', 'product_angle_shelf'];
const COLLECTION_TYPES   = ['collection_desktop', 'collection_mobile'];
const AD_TYPES           = ['ad_square', 'ad_story', 'ad_landscape'];

function getImageType(jobType) {
  const def = IMAGE_TYPES[jobType];
  if (!def) throw new Error('Unknown job_type: ' + jobType);
  return def;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IMAGE_TYPES, PRODUCT_SHOT_TYPES, COLLECTION_TYPES, AD_TYPES, getImageType };
}
