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
    const sources = [
      sourceFromJsonLd(source),
      sourceFromMeta(source, meta),
      sourceFromSallaInline(source)
    ];
    const merged = mergeSources(sources);
    const supplierPrice = firstNumber(
      merged.supplierPrice,
      merged.salePrice,
      merged.price,
      merged.amount
    );
    const compareCandidate = firstNumber(
      merged.supplierCompareAtPrice,
      merged.compareAtPrice,
      merged.originalPrice,
      merged.regularPrice
    );
    const supplierCompareAtPrice =
      supplierPrice !== null && compareCandidate !== null && compareCandidate > supplierPrice
        ? compareCandidate
        : null;

    return {
      name: cleanText(merged.name),
      brand: cleanText(merged.brand),
      supplierPrice,
      supplierCompareAtPrice,
      availability: normalizeAvailability(merged.availability),
      imageUrl: pickBestImage(merged.images || [merged.imageUrl]),
      description: cleanText(merged.description),
      category: cleanText(merged.category),
      sourceUrl: cleanUrl(merged.sourceUrl)
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

function sourceFromJsonLd(html) {
  const product = findJsonLdProduct(collectJsonLd(html)) || {};
  const offer = firstOffer(product.offers) || {};
  return {
    name: product.name,
    brand: readName(product.brand),
    supplierPrice: parseMoney(offer.price),
    availability: offer.availability,
    imageUrl: firstImage(product.image),
    images: flatten([product.image]),
    description: product.description,
    category: readCategory(product.category),
    sourceUrl: offer.url || product.url
  };
}

function sourceFromMeta(html, meta) {
  const price = parseMoney(getMeta(meta, 'product:price:amount'));
  const salePrice = parseMoney(getMeta(meta, 'product:sale_price:amount'));
  const compareAt = firstNumber(
    parseMoney(getMeta(meta, 'product:compare_at_price:amount')),
    parseMoney(getMeta(meta, 'product:original_price:amount')),
    parseMoney(getMeta(meta, 'product:regular_price:amount')),
    parseMoney(getMeta(meta, 'product:retail_price:amount'))
  );
  return {
    name: getMeta(meta, 'og:title') || getMeta(meta, 'twitter:title'),
    brand: getMeta(meta, 'product:brand'),
    supplierPrice: firstNumber(salePrice, price),
    supplierCompareAtPrice: compareAt || (salePrice !== null && price !== null && salePrice < price ? price : null),
    availability: getMeta(meta, 'product:availability'),
    imageUrl: getMeta(meta, 'og:image') || getMeta(meta, 'twitter:image'),
    images: [getMeta(meta, 'og:image'), getMeta(meta, 'twitter:image')],
    description:
      getMeta(meta, 'og:description') ||
      getMeta(meta, 'twitter:description') ||
      getMeta(meta, 'description'),
    category: getMeta(meta, 'product:category'),
    sourceUrl: getMeta(meta, 'og:url') || getMeta(meta, 'twitter:url') || getCanonical(html)
  };
}

function sourceFromSallaInline(html) {
  const products = []
    .concat(extractDataLayerProducts(html))
    .concat(extractSallaViewedProducts(html))
    .filter(Boolean);
  const product = products[0] || {};
  const button = extractSallaButton(html);
  return {
    name: product.name,
    brand: product.brand || extractVisibleBrand(html),
    supplierPrice: parseMoney(product.price || button.amount),
    availability: product.availability || product.quantity || button.status,
    imageUrl: product.image_url || product.image,
    images: [product.image_url, product.image],
    description: product.description,
    category: product.category || readCategory(product.categories),
    sourceUrl: product.url || product.link
  };
}

function mergeSources(sources) {
  const out = { images: [] };
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of Object.keys(source)) {
      if (key === 'images') {
        out.images = out.images.concat(flatten(source.images));
      } else if (isEmpty(out[key]) && !isEmpty(source[key])) {
        out[key] = source[key];
      }
    }
  }
  return out;
}

function collectMeta(html) {
  const meta = {};
  const tagPattern = /<meta\b[^>]*>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const attrs = parseAttributes(match[0]);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key && attrs.content !== undefined) meta[key] = decodeEntities(attrs.content);
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
      // Ignore malformed supplier JSON-LD blocks; other sources still provide data.
    }
  }
  return blocks;
}

function findJsonLdProduct(blocks) {
  const queue = flatten(blocks).slice();
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

function extractDataLayerProducts(html) {
  const products = [];
  const payloads = extractFunctionJsonArgs(html, 'window.dataLayer.push').concat(
    extractFunctionJsonArgs(html, 'dataLayer.push')
  );
  for (const payload of payloads) {
    const detailProducts =
      payload &&
      payload.ecommerce &&
      payload.ecommerce.detail &&
      payload.ecommerce.detail.products;
    if (Array.isArray(detailProducts)) products.push.apply(products, detailProducts);
  }
  return products;
}

function extractSallaViewedProducts(html) {
  const products = [];
  const payloads = extractFunctionJsonArgs(html, 'salla.event.dispatchEvents');
  for (const payload of payloads) {
    const viewed = payload && payload.events && payload.events['Product Viewed'];
    if (Array.isArray(viewed)) products.push.apply(products, viewed);
  }
  return products;
}

function extractFunctionJsonArgs(html, marker) {
  const out = [];
  let index = 0;
  while ((index = html.indexOf(marker, index)) !== -1) {
    const open = html.indexOf('(', index + marker.length);
    if (open === -1) break;
    const arg = extractBalanced(html, open, '(', ')');
    if (!arg) break;
    try {
      out.push(JSON.parse(arg.slice(1, -1)));
    } catch (error) {
      // Not a clean JSON argument; skip it.
    }
    index = open + arg.length;
  }
  return out;
}

function extractSallaButton(html) {
  const match = html.match(/<salla-add-product-button\b[^>]*>/i);
  if (!match) return {};
  const attrs = parseAttributes(match[0]);
  return {
    amount: attrs.amount,
    status: attrs['product-status']
  };
}

function extractVisibleBrand(html) {
  const brandLink = html.match(/<a\b[^>]*aria-label=["']brand["'][^>]*>/i);
  if (!brandLink) return '';
  const attrs = parseAttributes(brandLink[0]);
  return attrs.title || '';
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
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function getMeta(meta, key) {
  return meta[String(key).toLowerCase()] || null;
}

function getCanonical(html) {
  const match = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i);
  if (!match) return null;
  return parseAttributes(match[0]).href || null;
}

function extractBalanced(text, start, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
    } else if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
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

function readCategory(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return readName(value);
  return value.map(readName).filter(Boolean).join('/');
}

function firstImage(value) {
  return flatten([value]).filter(Boolean)[0] || null;
}

function pickBestImage(values) {
  const candidates = flatten(values).map(cleanUrl).filter(Boolean);
  if (!candidates.length) return null;
  candidates.sort((a, b) => imageScore(b) - imageScore(a));
  return candidates[0];
}

function imageScore(url) {
  const size = String(url).match(/(\d{2,5}(?:\.\d+)?)x(\d{2,5}(?:\.\d+)?)/);
  if (size) return Number(size[1]) * Number(size[2]);
  return String(url).includes('cdn.salla.sa') ? 1 : 0;
}

function flatten(values) {
  const out = [];
  for (const value of values || []) {
    if (Array.isArray(value)) out.push.apply(out, flatten(value));
    else if (value && typeof value === 'object' && value.url) out.push(value.url);
    else out.push(value);
  }
  return out;
}

function normalizeAvailability(value) {
  const raw = String(value ?? '').toLowerCase();
  if (
    raw === 'in_stock' ||
    raw === 'available' ||
    raw === 'sale' ||
    raw === 'true' ||
    raw.includes('instock') ||
    raw.includes('in stock') ||
    raw.includes('/instock') ||
    raw.includes('product-status="sale"')
  ) {
    return 'in_stock';
  }
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

function isEmpty(value) {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
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
