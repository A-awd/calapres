import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const syncDir = path.resolve(__dirname, '..');
const fixturesDir = path.join(syncDir, 'fixtures');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function loadSyncModule(fileName) {
  const filePath = path.join(syncDir, fileName);
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = {
    module: { exports: {} },
    exports: {},
    URL,
    console,
    fetch: async () => {
      throw new Error('Tests must use fixture fetchText, not live fetch.');
    }
  };
  vm.runInNewContext(code, sandbox, { filename: filePath, timeout: 1000 });
  return sandbox.module.exports;
}

function readFixture(fileName) {
  return fs.readFileSync(path.join(fixturesDir, fileName), 'utf8');
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const crawl = loadSyncModule('crawl-supplier.js');
const parser = loadSyncModule('parse-product.js');
const pricing = loadSyncModule('pricing.js');
const inventory = loadSyncModule('inventory.js');
const payloads = loadSyncModule('build-shopify-payload.js');

function productId(url) {
  return crawl.productIdFromUrl(url);
}

test('crawl-supplier extracts all product URLs from the saved product sitemap', () => {
  const urls = crawl.extractProductUrls(readFixture('sitemap-products.xml'));
  assert.equal(urls.length, 3155);
  assert.equal(urls.filter((url) => /%D8|%D9/i.test(url)).length, 589);
  assert.ok(urls.every((url) => /\/p\d+$/.test(url)));
  assert.ok(urls.some((url) => url.includes('p1625888751') && url.includes('%D8')));
  assert.equal(new Set(urls.map(productId)).size, urls.length);
});

test('crawl-supplier follows nested sitemaps offline and dedupes by product id', async () => {
  const sitemapIndex = readFixture('sitemap-index.xml');
  const productSitemap = readFixture('sitemap-products.xml');
  const fetchText = async (url) => {
    if (url.endsWith('/sitemap.xml')) return sitemapIndex;
    if (url.endsWith('/sitemap-2.xml')) return productSitemap;
    return '<urlset></urlset>';
  };
  const urls = await crawl.crawlSupplierProducts({ fetchText });
  assert.equal(urls.length, 3155);
  assert.equal(urls[1], 'https://nawadirdior.sa/aramis-classic-eau-de-toilette-110ml/p735368737');
});

test('crawl-supplier normalizes encoded URLs and removes duplicate product ids', () => {
  const xml = [
    '<urlset>',
    '<url><loc>https://nawadirdior.sa/foo/p123?utm=1&amp;x=2</loc></url>',
    '<url><loc>https://nawadirdior.sa/bar/p123</loc></url>',
    '<url><loc>https://nawadirdior.sa/%D8%B9%D8%B7%D8%B1/p456#frag</loc></url>',
    '</urlset>'
  ].join('');
  const urls = crawl.extractProductUrls(xml);
  assert.deepEqual(Array.from(urls), [
    'https://nawadirdior.sa/foo/p123',
    'https://nawadirdior.sa/%D8%B9%D8%B7%D8%B1/p456'
  ]);
});

test('parse-product reads a real no-discount Salla product fixture', () => {
  const parsed = parser.parseProduct(readFixture('product-aramis-classic.html'));
  assert.equal(parsed.supplierPrice, 172.5);
  assert.equal(parsed.supplierCompareAtPrice, null);
  assert.equal(parsed.availability, 'in_stock');
  assert.ok(parsed.brand.includes('Aramis'));
  assert.ok(parsed.sourceUrl.endsWith('/p735368737'));
});

test('parse-product reads a real discounted Salla product fixture', () => {
  const parsed = parser.parseProduct(readFixture('product-azzaro-pour-homme-discounted.html'));
  assert.equal(parsed.supplierPrice, 287.5);
  assert.equal(parsed.supplierCompareAtPrice, 345);
  assert.equal(parsed.availability, 'in_stock');
  assert.ok(parsed.imageUrl.includes('1000x1000'));
  assert.ok(parsed.sourceUrl.endsWith('/p592165416'));
});

test('parse-product preserves Arabic percent-encoded source URLs from real fixtures', () => {
  const parsed = parser.parseProduct(readFixture('product-arabic-encoded-issey-miyake.html'));
  assert.equal(parsed.supplierPrice, 500);
  assert.equal(parsed.availability, 'in_stock');
  assert.ok(parsed.brand.includes('Issey Miyake'));
  assert.ok(/%D8|%D9/i.test(parsed.sourceUrl));
});

test('parse-product reads a real out-of-stock Salla product fixture', () => {
  const parsed = parser.parseProduct(readFixture('product-ysl-out-of-stock.html'));
  assert.equal(parsed.supplierPrice, 402.5);
  assert.equal(parsed.availability, 'out_of_stock');
  assert.ok(parsed.sourceUrl.endsWith('/p532728690'));
});

test('parse-product reads JSON-LD Product data', () => {
  const html = `
    <script type="application/ld+json">
      {"@graph":[{"@type":"Product","name":"JSON LD Amber","brand":{"name":"Maison Test"},"image":["https://cdn.test/500x500.jpg"],"category":"Perfume","offers":{"price":"\\u0668\\u0660\\u0665","availability":"https://schema.org/InStock","url":"https://nawadirdior.sa/json-ld-amber/p111"}}]}
    </script>
  `;
  const parsed = parser.parseProduct(html);
  assert.equal(parsed.name, 'JSON LD Amber');
  assert.equal(parsed.brand, 'Maison Test');
  assert.equal(parsed.supplierPrice, 805);
  assert.equal(parsed.availability, 'in_stock');
  assert.equal(parsed.sourceUrl, 'https://nawadirdior.sa/json-ld-amber/p111');
});

test('parse-product reads Open Graph and product meta data', () => {
  const html = `
    <meta property="og:title" content="Meta Musk">
    <meta property="product:price:amount" content="345">
    <meta property="product:sale_price:amount" content="300">
    <meta property="product:availability" content="out of stock">
    <meta property="og:image" content="https://cdn.test/meta-1000x1000.jpg">
    <link rel="canonical" href="https://nawadirdior.sa/meta-musk/p222">
  `;
  const parsed = parser.parseProduct(html);
  assert.equal(parsed.name, 'Meta Musk');
  assert.equal(parsed.supplierPrice, 300);
  assert.equal(parsed.supplierCompareAtPrice, 345);
  assert.equal(parsed.availability, 'out_of_stock');
  assert.equal(parsed.sourceUrl, 'https://nawadirdior.sa/meta-musk/p222');
});

test('parse-product reads Salla dataLayer inline product JSON', () => {
  const html = `
    <script>
      window.dataLayer.push({"ecommerce":{"detail":{"products":[{"name":"Inline Oud","brand":"Inline House","category":"Niche","price":199,"quantity":3,"image":"https://cdn.test/inline-500x500.jpg","url":"https://nawadirdior.sa/inline-oud/p333"}]}}});
    </script>
  `;
  const parsed = parser.parseProduct(html);
  assert.equal(parsed.name, 'Inline Oud');
  assert.equal(parsed.brand, 'Inline House');
  assert.equal(parsed.supplierPrice, 199);
  assert.equal(parsed.availability, 'in_stock');
  assert.equal(parsed.sourceUrl, 'https://nawadirdior.sa/inline-oud/p333');
});

test('parse-product reads Salla dispatchEvents inline product JSON with quantity zero', () => {
  const html = `
    <script>
      salla.event.dispatchEvents({"events":{"Product Viewed":[{"name":"Inline Sold Out","brand":"Inline House","category":"Niche","price":120,"quantity":0,"url":"https://nawadirdior.sa/inline-sold-out/p444"}]}});
    </script>
  `;
  const parsed = parser.parseProduct(html);
  assert.equal(parsed.name, 'Inline Sold Out');
  assert.equal(parsed.supplierPrice, 120);
  assert.equal(parsed.availability, 'out_of_stock');
});

test('parse-product never throws on missing, malformed, or homepage-like fields', () => {
  assert.deepEqual(plain(parser.parseProduct(null)), {
    name: '',
    brand: '',
    supplierPrice: null,
    supplierCompareAtPrice: null,
    availability: 'out_of_stock',
    imageUrl: null,
    description: '',
    category: '',
    sourceUrl: null
  });
  assert.equal(parser.parseProduct('<script type="application/ld+json">{bad json}</script>').name, '');
  const homepageLike = '<meta property="og:title" content="Supplier Home"><link rel="canonical" href="https://nawadirdior.sa/">';
  assert.equal(parser.parseProduct(homepageLike).name, '');
});

test('pricing applies Calapres no-discount markup', () => {
  assert.deepEqual(plain(pricing.applyPricing({ supplierPrice: 805 })), {
    price: 905,
    compareAtPrice: null
  });
});

test('pricing applies Calapres discounted markup', () => {
  assert.deepEqual(plain(pricing.applyPricing({ supplierPrice: 650, supplierCompareAtPrice: 805 })), {
    price: 750,
    compareAtPrice: 905
  });
});

test('pricing clears compareAtPrice when compareAtPrice equals price', () => {
  assert.deepEqual(plain(pricing.applyPricing({ supplierPrice: 200, supplierCompareAtPrice: 200 })), {
    price: 300,
    compareAtPrice: null
  });
});

test('pricing returns null prices when supplier price is missing', () => {
  assert.deepEqual(plain(pricing.applyPricing({ supplierPrice: null, supplierCompareAtPrice: 900 })), {
    price: null,
    compareAtPrice: null
  });
});

test('inventory maps in-stock states and never deletes', () => {
  for (const value of ['in_stock', 'InStock', 'in stock', 'available', 'sale', 4]) {
    const mapped = inventory.mapAvailability(value);
    assert.equal(mapped.availability, 'in_stock');
    assert.equal(mapped.productStatus, 'active');
    assert.equal(mapped.inventoryPolicy, 'continue');
    assert.equal(mapped.shouldDelete, false);
  }
});

test('inventory maps out-of-stock and missing states to draft without deletion', () => {
  for (const value of ['out_of_stock', 'missing', 'not_found', 0, '', null]) {
    const mapped = inventory.mapAvailability(value);
    assert.equal(mapped.availability, 'out_of_stock');
    assert.equal(mapped.productStatus, 'draft');
    assert.equal(mapped.inventoryPolicy, 'deny');
    assert.equal(mapped.shouldDelete, false);
  }
});

test('build-shopify-payload creates a new product payload', () => {
  const payload = payloads.buildPayload({
    name: 'Amber <Rose>',
    brand: 'Maison Test',
    category: 'Niche',
    description: 'Line <one>\\nLine two',
    supplierPrice: 100,
    supplierCompareAtPrice: 150,
    availability: 'in_stock',
    imageUrl: 'https://cdn.test/amber.jpg',
    sourceUrl: 'https://nawadirdior.sa/amber-rose/p777'
  }).product;
  assert.equal(payload.title, 'Amber <Rose>');
  assert.equal(payload.vendor, 'Maison Test');
  assert.equal(payload.status, 'active');
  assert.equal(payload.variants[0].price, '200');
  assert.equal(payload.variants[0].compare_at_price, '250');
  assert.ok(payload.body_html.includes('&lt;one&gt;'));
  assert.ok(payload.tags.includes('imported-nader-dior'));
  assert.ok(payload.tags.includes('supplier-id-p777'));
  assert.deepEqual(plain(payload.images), [{ src: 'https://cdn.test/amber.jpg' }]);
  assert.equal(payload.metafields.find((field) => field.key === 'product_id').value, '777');
});

test('build-shopify-payload updates an existing product and variant', () => {
  const payload = payloads.buildPayload({
    name: 'Existing Amber',
    brand: 'Maison Test',
    supplierPrice: 210,
    availability: 'out_of_stock',
    sourceUrl: 'https://nawadirdior.sa/existing-amber/p888',
    existingProduct: { id: 101, variants: [{ id: 202 }] }
  }).product;
  assert.equal(payload.id, 101);
  assert.equal(payload.status, 'draft');
  assert.equal(payload.variants[0].id, 202);
  assert.equal(payload.variants[0].inventory_policy, 'deny');
});

test('build-shopify-payload protects enriched products from presentation overwrites', () => {
  const payload = payloads.buildPayload({
    name: 'Do Not Overwrite',
    description: 'Protected description',
    imageUrl: 'https://cdn.test/protected.jpg',
    supplierPrice: 300,
    availability: 'in_stock',
    existingProduct: { id: 303, tags: 'imported-nader-dior, enriched', variants: [{ id: 404 }] }
  }).product;
  assert.equal(payload.id, 303);
  assert.equal(payload.status, 'active');
  assert.deepEqual(Object.keys(payload).sort(), ['id', 'status', 'variants']);
  assert.equal(payload.variants[0].id, 404);
  assert.equal(payload.variants[0].price, '400');
});

test('build-shopify-payload marks missing supplier products draft and never emits delete intent', () => {
  const payload = payloads.buildPayload({
    availability: 'missing',
    existingProduct: { id: 505, variants: [{ id: 606 }] }
  }).product;
  assert.deepEqual(Object.keys(payload).sort(), ['id', 'status', 'variants']);
  assert.equal(payload.status, 'draft');
  assert.equal(payload.variants[0].inventory_policy, 'deny');
  assert.equal(payload.variants[0].price, undefined);
});

async function main() {
  let passed = 0;
  const failures = [];
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log('PASS ' + name);
    } catch (error) {
      failures.push({ name, error });
      console.error('FAIL ' + name);
      console.error(error && error.stack ? error.stack : String(error));
    }
  }

  console.log('');
  console.log('Summary: ' + passed + '/' + tests.length + ' tests passed');
  if (failures.length) {
    process.exitCode = 1;
  }
}

main();
