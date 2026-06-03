/**
 * parseProduct(html) extracts a Salla product page without running JavaScript.
 *
 * Example:
 * parseProduct('<meta property="og:title" content="Amber"><meta property="product:price:amount" content="250">')
 * // -> { name: 'Amber', supplierPrice: 250, supplierCompareAtPrice: null, availability: 'out_of_stock', ... }
 *
 * Example:
 * parseProduct('<script type="application/ld+json">{"@type":"Product","brand":{"name":"NISHANE"},"offers":{"price":805,"availability":"https://schema.org/InStock"}}</script>')
 * // -> { brand: 'NISHANE', supplierPrice: 805, availability: 'in_stock', ... }
 */
function parseProduct(html) {
  try {
    const source = typeof html === 'string' ? html : '';
    const meta = collectMeta(source);
    const jsonLd = collectJsonLd(source);
    const product = findJsonLdProduct(jsonLd) || {};
    const offer = firstOffer(product.offers) || {};
    const dataProduct = extractDataLayerProduct(source) || {};

    const sourceUrl = cleanUrl(
      getMeta(meta, 'og:url') ||
        getMeta(meta, 'twitter:url') ||
        getCanonical(source) ||
        offer.url ||
        dataProduct.url ||
        null
    );

    const name = cleanText(
      product.name ||
        getMeta(meta, 'og:title') ||
        getMeta(meta, 'twitter:title') ||
        dataProduct.name ||
        ''
    );

    const brand = cleanText(
      readName(product.brand) ||
        dataProduct.brand ||
        getMeta(meta, 'product:brand') ||
        ''
    );

    const metaPrice = parseMoney(getMeta(meta, 'product:price:amount'));
    const salePrice = parseMoney(getMeta(meta, 'product:sale_price:amount'));
    const jsonPrice = parseMoney(offer.price);
    const dataPrice = parseMoney(dataProduct.price);
    const explicitCompareAt = firstNumber(
      parseMoney(getMeta(meta, 'product:compare_at_price:amount')),
      parseMoney(getMeta(meta, 'product:original_price:amount')),
      parseMoney(getMeta(meta, 'product:regular_price:amount')),
      parseMoney(getMeta(meta, 'product:retail_price:amount'))
    );

    const supplierPrice = firstNumber(salePrice, metaPrice, jsonPrice, dataPrice);
    let supplierCompareAtPrice = null;
    if (supplierPrice !== null) {
      if (explicitCompareAt !== null && explicitCompareAt > supplierPrice) {
        supplierCompareAtPrice = explicitCompareAt;
      } else if (salePrice !== null && metaPrice !== null && salePrice < metaPrice) {
        supplierCompareAtPrice = metaPrice;
      }
    }

    const availability = normalizeAvailability(
      getMeta(meta, 'product:availability') ||
        offer.availability ||
        dataProduct.availability ||
        dataProduct.quantity
    );

    const imageUrl = pickBestImage([
      product.image,
      dataProduct.image_url,
      dataProduct.image,
      getMeta(meta, 'og:image'),
      getMeta(meta, 'twitter:image')
    ]);

    const description = cleanText(
      product.description ||
        getMeta(meta, 'og:description') ||
        getMeta(meta, 'twitter:description') ||
        getMeta(meta, 'description') ||
        ''
    );

    const category = cleanText(
      getMeta(meta, 'product:category') ||
        dataProduct.category ||
        readCategory(dataProduct.categories) ||
        ''
    );

    return {
      name,
      brand,
      supplierPrice,
      supplierCompareAtPrice,
      availability,
      imageUrl,
      description,
      category,
      sourceUrl
    };
  } catch (error) {
    return emptyProduct();
  }
}

function emptyProduct() {
  return {
    name: '',
    brand: '',
    supplierPrice: null,
    supplierCompareAtPrice: null,
    availability: 'out_of_stock',
    imageUrl: null,
    description: '',
    category: '',
    sourceUrl: null
  };
}

function collectMeta(html) {
  const meta = {};
  const tagPattern = /<meta\b[^>]*>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const attrs = parseAttributes(match[0]);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key && attrs.content !== undefined) {
      meta[key] = decodeEntities(attrs.content);
    }
  }
  return meta;
}

function collectJsonLd(html) {
  const blocks = [];
  const scriptPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptPattern.exec(html))) {
    try {
      blocks.push(JSON.parse(decodeEntities(match[1].trim())));
    } catch (error) {
      // Ignore malformed supplier blocks; other meta tags still provide data.
    }
  }
  return blocks;
}

function findJsonLdProduct(blocks) {
  const queue = blocks.slice();
  while (queue.length) {
    const item = queue.shift();
    if (!item || typeof item !== 'object') continue;
    const type = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    if (type.some((value) => String(value).toLowerCase() === 'product')) return item;
    if (Array.isArray(item['@graph'])) queue.push.apply(queue, item['@graph']);
    if (Array.isArray(item.itemListElement)) queue.push.apply(queue, item.itemListElement);
  }
  return null;
}

function firstOffer(offers) {
  if (!offers) return null;
  return Array.isArray(offers) ? offers[0] || null : offers;
}

function parseAttributes(tag) {
  const attrs = {};
  const attrPattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = attrPattern.exec(tag))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function getMeta(meta, key) {
  return meta[String(key).toLowerCase()] || null;
}

function getCanonical(html) {
  const match = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i);
  if (!match) return null;
  return decodeEntities(parseAttributes(match[0]).href || '');
}

function extractDataLayerProduct(html) {
  const marker = '"Product Viewed":';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const slice = html.slice(start + marker.length);
  const arrayStart = slice.indexOf('[');
  if (arrayStart === -1) return null;
  const productStart = slice.indexOf('{', arrayStart);
  if (productStart === -1) return null;
  const json = extractBalancedObject(slice, productStart);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

function extractBalancedObject(text, start) {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function readName(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.name || '';
  return '';
}

function readCategory(categories) {
  if (!Array.isArray(categories)) return '';
  return categories.map(readName).filter(Boolean).join('/');
}

function pickBestImage(values) {
  const candidates = flatten(values)
    .map((value) => cleanUrl(value))
    .filter(Boolean);
  if (!candidates.length) return null;
  candidates.sort((a, b) => imageScore(b) - imageScore(a));
  return candidates[0];
}

function imageScore(url) {
  const match = String(url).match(/(\d{2,5})x(\d{2,5})/);
  if (!match) return 0;
  return Number(match[1]) * Number(match[2]);
}

function flatten(values) {
  const out = [];
  for (const value of values) {
    if (Array.isArray(value)) out.push.apply(out, flatten(value));
    else if (value && typeof value === 'object' && value.url) out.push(value.url);
    else out.push(value);
  }
  return out;
}

function normalizeAvailability(value) {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('instock') || raw.includes('in stock') || raw === 'true') return 'in_stock';
  if (Number(raw) > 0) return 'in_stock';
  return 'out_of_stock';
}

function firstNumber() {
  for (let i = 0; i < arguments.length; i += 1) {
    if (typeof arguments[i] === 'number' && Number.isFinite(arguments[i])) return arguments[i];
  }
  return null;
}

function parseMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value)
    .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
    .replace(/[۰-۹]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))
    .replace(/,/g, '')
    .match(/-?\d+(\.\d+)?/);
  return normalized ? Number(normalized[0]) : null;
}

function cleanText(value) {
  return decodeEntities(stripTags(String(value || '')))
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanUrl(value) {
  const url = decodeEntities(String(value || '')).trim();
  return url || null;
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ');
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseProduct };
}
