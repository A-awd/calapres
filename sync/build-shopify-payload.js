/**
 * buildPayload(parsed) builds the Shopify product payload for one supplier item.
 *
 * Example:
 * buildPayload({ name: 'Amber', brand: 'NISHANE', supplierPrice: 805, availability: 'in_stock' }).product.variants[0].price
 * // -> '905'
 *
 * Example:
 * buildPayload({ existingTags: ['enriched'], supplierPrice: 805, availability: 'out_of_stock', description: 'ignored' })
 * // -> { product: { status: 'draft', variants: [{ price: '905', compare_at_price: null, inventory_policy: 'deny' }] } }
 */
function buildPayload(parsed) {
  const item = parsed && typeof parsed === 'object' ? parsed : {};
  const pricing = applyPricingForPayload(item);
  const stock = mapAvailabilityForPayload(item.availability);
  const existingProduct = item.existingProduct || item.shopifyProduct || {};
  const existingTags = normalizeTags(item.existingTags || existingProduct.tags || item.tags);
  const enriched = hasTag(existingTags, 'enriched');
  const statusOnly = enriched || isMissingAvailability(item.availability);

  const variant = compactObject({
    id: item.existingVariantId || existingProduct.variantId || readFirstVariantId(existingProduct),
    price: pricing.price === null ? undefined : formatMoney(pricing.price),
    compare_at_price:
      pricing.price === null ? undefined : pricing.compareAtPrice === null ? null : formatMoney(pricing.compareAtPrice),
    inventory_policy: stock.inventoryPolicy
  });

  if (statusOnly) {
    // ENRICHED/MISSING GUARD: do not emit title, body_html, images, SEO, vendor, tags, or metafields.
    return {
      product: compactObject({
        id: item.existingProductId || existingProduct.id,
        status: stock.productStatus,
        variants: [variant]
      })
    };
  }

  const tags = uniqueTags([
    'imported-nader-dior',
    'supplier:nawadirdior',
    supplierIdTag(item.sourceUrl),
    item.brand ? 'brand:' + item.brand : '',
    item.category ? 'category:' + item.category : ''
  ]);

  return {
    product: compactObject({
      id: item.existingProductId || existingProduct.id,
      title: cleanText(item.name),
      body_html: toBodyHtml(item.description),
      vendor: cleanText(item.brand) || 'Nawadirdior',
      tags: tags.join(', '),
      status: stock.productStatus,
      images: item.imageUrl ? [{ src: String(item.imageUrl).trim() }] : undefined,
      metafields: supplierMetafields(item),
      variants: [variant]
    })
  };
}

function applyPricingForPayload(input) {
  const supplierPrice = toMoneyNumber(input && input.supplierPrice);
  const supplierCompareAtPrice = toMoneyNumber(input && input.supplierCompareAtPrice);
  if (supplierPrice === null) return { price: null, compareAtPrice: null };
  const price = roundMoney(supplierPrice + 100);
  let compareAtPrice = supplierCompareAtPrice === null ? null : roundMoney(supplierCompareAtPrice + 100);
  if (compareAtPrice !== null && roundMoney(compareAtPrice) === roundMoney(price)) compareAtPrice = null;
  return { price, compareAtPrice };
}

function mapAvailabilityForPayload(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  const inStock =
    raw === 'in_stock' ||
    raw === 'available' ||
    raw === 'true' ||
    raw.includes('instock') ||
    raw.includes('in stock') ||
    raw.includes('/instock') ||
    Number(raw) > 0;
  return {
    availability: inStock ? 'in_stock' : 'out_of_stock',
    productStatus: inStock ? 'active' : 'draft',
    inventoryPolicy: inStock ? 'continue' : 'deny'
  };
}

function isMissingAvailability(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === 'missing' || raw === 'not_found' || raw === 'not found';
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function hasTag(tags, target) {
  return tags.some((tag) => tag.toLowerCase() === target.toLowerCase());
}

function uniqueTags(tags) {
  const seen = {};
  const out = [];
  for (const tag of tags.map(String).map((value) => value.trim()).filter(Boolean)) {
    const key = tag.toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(tag);
    }
  }
  return out;
}

function supplierIdTag(sourceUrl) {
  const id = productIdFromUrl(sourceUrl);
  return id ? 'supplier-id-p' + id : '';
}

function productIdFromUrl(value) {
  const match = String(value || '').match(/\/p(\d+)(?=$|[/?#])/i);
  return match ? match[1] : '';
}

function supplierMetafields(item) {
  const metafields = [];
  if (item.sourceUrl) {
    metafields.push({
      namespace: 'supplier',
      key: 'source_url',
      value: String(item.sourceUrl),
      type: 'single_line_text_field'
    });
  }
  const id = productIdFromUrl(item.sourceUrl);
  if (id) {
    metafields.push({
      namespace: 'supplier',
      key: 'product_id',
      value: id,
      type: 'single_line_text_field'
    });
  }
  return metafields.length ? metafields : undefined;
}

function readFirstVariantId(product) {
  return product && product.variants && product.variants[0] && product.variants[0].id;
}

function toBodyHtml(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (looksLikeTrustedHtml(text)) return text;
  return '<p>' + escapeHtml(text).replace(/\n+/g, '</p><p>') + '</p>';
}

function looksLikeTrustedHtml(value) {
  return /<\/?(p|br|div|ul|ol|li|strong|em|b|i|span|h[1-6]|table|thead|tbody|tr|td|th|blockquote|a)\b[\s\S]*>/i.test(
    String(value || '')
  );
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toMoneyNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const rounded = roundMoney(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function compactObject(object) {
  const out = {};
  for (const key of Object.keys(object)) {
    if (object[key] !== undefined) out[key] = object[key];
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildPayload };
}
