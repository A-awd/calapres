const config = require('../config.js');
const normalize = require('../normalize.js');

function buildHiggsfieldPrompts(product, options) {
  const item = normalize.normalizeProduct(product || {});
  const model = (options && options.model) || config.HIGGSFIELD_IMAGE_MODEL;
  const title = item.title || item.name || 'Luxury fragrance';
  const brand = item.brand || 'Calapres';
  const concentration = item.concentration ? ' ' + item.concentration : '';
  const size = item.sizeMl ? ' ' + item.sizeMl + 'ml' : '';
  const base =
    'Luxury ecommerce fragrance photography for ' +
    title +
    ' by ' +
    brand +
    concentration +
    size +
    '. Refined Riyadh premium perfume boutique, elegant marble, warm champagne light, precise bottle geometry, high-end product campaign, no people, no readable text.';
  return {
    model,
    heroPrompt: base + ' Hero angle, product centered, polished shadows, photorealistic.',
    anglePrompts: [
      base + ' Three-quarter angle with subtle oud-inspired styling.',
      base + ' Close detail angle emphasizing cap, bottle silhouette, and premium materials.',
      base + ' Shelf-ready ecommerce angle with clean background and luxury contrast.'
    ],
    negativePrompt: 'low quality, blurry, distorted bottle, fake text, watermark, hands, faces, clutter, duplicate bottle, broken label'
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildHiggsfieldPrompts };
}
