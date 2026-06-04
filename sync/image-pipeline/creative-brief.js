// Builds Higgsfield API request body from Supabase creative_brief + brand_style_config.
// This is the single function that translates product data → AI prompt.
//
// Bottle geometry is locked via reference_images with role "product_reference"
// and high image_weight (from brand_style_config.reference_image_weight).
// This is the primary protection against hallucinated bottle shapes.

const imageTypes = require('./image-types.js');

function buildHiggsfieldRequest(brief, brandStyle, jobType) {
  const typeDef = imageTypes.getImageType(jobType);

  const productLine = buildProductLine(brief);
  const prompt = [
    brandStyle.base_prompt_fragment,
    productLine,
    typeDef.promptSuffix,
  ].filter(Boolean).join(' ');

  const body = {
    model: 'higgsfield-soul',
    prompt,
    negative_prompt: brandStyle.negative_prompt,
    aspect_ratio: typeDef.aspectRatio,
    resolution: typeDef.resolution,
    num_outputs: typeDef.numOutputs,
    output_format: 'jpeg',
    metadata: {
      source: 'calapres-image-pipeline',
      job_type: jobType,
      shopify_entity_id: brief.shopify_product_id,
      brief_id: brief.id,
    },
  };

  // Reference image locks the bottle geometry — must be included whenever available
  if (brief.reference_image_url) {
    body.reference_images = [
      {
        url: brief.reference_image_url,
        role: 'product_reference',
        image_weight: parseFloat(brandStyle.reference_image_weight) || 0.85,
      },
    ];
  }

  return body;
}

// Collection banners use a different prompt structure (no single bottle reference)
function buildCollectionRequest(collectionBrief, brandStyle, jobType, featuredProductTitles) {
  const typeDef = imageTypes.getImageType(jobType);
  const themeDesc = collectionBrief.mood_override || buildThemeDescription(collectionBrief.collection_theme);
  const productsDesc = featuredProductTitles && featuredProductTitles.length > 0
    ? ' Featuring: ' + featuredProductTitles.slice(0, 3).join(', ') + '.'
    : '';

  const prompt = [
    brandStyle.base_prompt_fragment,
    themeDesc + productsDesc,
    typeDef.promptSuffix,
  ].filter(Boolean).join(' ');

  return {
    model: 'higgsfield-soul',
    prompt,
    negative_prompt: brandStyle.negative_prompt,
    aspect_ratio: typeDef.aspectRatio,
    resolution: typeDef.resolution,
    num_outputs: typeDef.numOutputs,
    output_format: 'jpeg',
    metadata: {
      source: 'calapres-image-pipeline',
      job_type: jobType,
      shopify_collection_id: collectionBrief.shopify_collection_id,
    },
  };
}

// ── helpers ──────────────────────────────────────────────────────────────

function buildProductLine(brief) {
  const parts = [];
  if (brief.product_title) parts.push('Product: ' + brief.product_title + '.');
  if (brief.brand_name) parts.push('Brand: ' + brief.brand_name + '.');
  if (brief.concentration) parts.push('Concentration: ' + brief.concentration + '.');
  if (brief.size_ml) parts.push('Size: ' + brief.size_ml + 'ml.');
  if (brief.bottle_shape_notes) parts.push('Bottle: ' + brief.bottle_shape_notes + '.');
  if (brief.primary_color) parts.push('Dominant color: ' + brief.primary_color + '.');
  if (brief.extra_prompt_notes) parts.push(brief.extra_prompt_notes);
  return parts.join(' ');
}

function buildThemeDescription(theme) {
  const themes = {
    oud: 'Deep oriental oud collection, dark amber incense smoke trails, rich mahogany tones.',
    oriental: 'Oriental spice collection, warm saffron and amber tones, luxurious depth.',
    floral: 'Floral perfume collection, delicate blooms, soft pastel luxury arrangement.',
    woody: 'Woody aromatic collection, cedar and sandalwood textures, earthy refinement.',
    fresh: 'Fresh citrus and aquatic collection, cool blue tones, modern Saudi elegance.',
    niche: 'Niche international fragrance collection, artisan bottles, collector presentation.',
    luxury: 'Luxury designer brand collection, iconic bottles, premium presentation.',
    gift: 'Gift collection arrangement, elegant gift-ready styling, celebratory composition.',
  };
  return themes[theme] || 'Premium fragrance collection, curated luxury selection.';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildHiggsfieldRequest, buildCollectionRequest };
}
