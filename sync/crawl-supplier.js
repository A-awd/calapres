/**
 * crawlSupplierProducts() reads Nawadirdior Salla sitemaps and returns every product URL.
 *
 * Example:
 * await crawlSupplierProducts({ sitemapUrl: 'https://nawadirdior.sa/sitemap.xml' })
 * // -> ['https://nawadirdior.sa/aramis-devin-for-men-cologne-100ml/p852601829', ...]
 *
 * Example:
 * extractProductUrls('<loc>https://nawadirdior.sa/%D8%B9%D8%B7%D8%B1/p123</loc>')
 * // -> ['https://nawadirdior.sa/%D8%B9%D8%B7%D8%B1/p123']
 */
async function crawlSupplierProducts(options) {
  const config = options && typeof options === 'object' ? options : {};
  const startUrl = config.sitemapUrl || 'https://nawadirdior.sa/sitemap.xml';
  const maxSitemaps = config.maxSitemaps || 50;
  const fetchText = config.fetchText || defaultFetchText;
  const queue = [startUrl];
  const visitedSitemaps = {};
  const productById = {};
  const products = [];

  while (queue.length && Object.keys(visitedSitemaps).length < maxSitemaps) {
    const sitemapUrl = queue.shift();
    const normalizedSitemapUrl = normalizeUrl(sitemapUrl) || sitemapUrl;
    if (visitedSitemaps[normalizedSitemapUrl]) continue;
    visitedSitemaps[normalizedSitemapUrl] = true;

    let xml = '';
    try {
      xml = await fetchText(normalizedSitemapUrl);
    } catch (error) {
      continue;
    }

    const locs = extractLocs(xml);
    for (const loc of locs) {
      if (isLikelySitemap(loc)) {
        const nested = normalizeUrl(loc);
        if (nested && !visitedSitemaps[nested]) queue.push(nested);
      }
    }

    for (const url of extractProductUrlsFromLocs(locs)) {
      const id = productIdFromUrl(url);
      if (!id || productById[id]) continue;
      productById[id] = true;
      products.push(url);
    }

    for (const url of extractProductUrls(xml)) {
      const id = productIdFromUrl(url);
      if (!id || productById[id]) continue;
      productById[id] = true;
      products.push(url);
    }
  }

  return products;
}

function extractLocs(xml) {
  const locs = [];
  const pattern = /<loc\b[^>]*>([\s\S]*?)<\/loc>/gi;
  let match;
  while ((match = pattern.exec(String(xml || '')))) {
    const loc = cleanLoc(match[1]);
    if (loc) locs.push(loc);
  }
  return locs;
}

function extractProductUrls(xml) {
  return extractProductUrlsFromLocs(extractLocs(xml));
}

function extractProductUrlsFromLocs(locs) {
  const seen = {};
  const out = [];
  for (const loc of locs || []) {
    const url = normalizeProductUrl(loc);
    if (!url) continue;
    const key = productIdFromUrl(url) || url;
    if (!seen[key]) {
      seen[key] = true;
      out.push(url);
    }
  }
  return out;
}

function normalizeProductUrl(value) {
  const raw = cleanLoc(value);
  if (!raw) return null;
  if (!isProductUrl(raw) && !isProductUrl(safeDecodeUri(raw))) return null;
  return normalizeUrl(raw) || raw;
}

function isProductUrl(value) {
  const url = String(value || '');
  return /\/[^/?#\s<>]+\/p\d+(?=$|[/?#])/i.test(url);
}

function productIdFromUrl(value) {
  const raw = String(value || '');
  const match = raw.match(/\/p(\d+)(?=$|[/?#])/i) || safeDecodeUri(raw).match(/\/p(\d+)(?=$|[/?#])/i);
  return match ? match[1] : null;
}

function isLikelySitemap(value) {
  const url = String(value || '').toLowerCase();
  return /\.xml(?:$|[?#])/.test(url) || /sitemap/.test(url);
}

function cleanLoc(value) {
  return decodeEntities(String(value || '')).replace(/\s+/g, '').trim();
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    parsed.search = '';
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  } catch (error) {
    return raw.replace(/[?#].*$/, '').replace(/\/+$/, '') || null;
  }
}

function safeDecodeUri(value) {
  try {
    return decodeURI(String(value || ''));
  } catch (error) {
    return String(value || '');
  }
}

async function defaultFetchText(url) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available. In n8n, run this in a Code node with fetch enabled or inject fetchText.');
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Calapres supplier sync crawler/1.0',
      Accept: 'application/xml,text/xml,text/plain,*/*'
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch sitemap ' + url + ': HTTP ' + response.status);
  }
  return response.text();
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    crawlSupplierProducts,
    extractLocs,
    extractProductUrls,
    normalizeProductUrl,
    productIdFromUrl
  };
}
