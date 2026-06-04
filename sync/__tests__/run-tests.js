import nodeAssert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Dependency-free offline test runner for every sync helper used by n8n.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const syncDir = path.resolve(__dirname, '..');
const fixturesDir = path.join(syncDir, 'fixtures');

const tests = [];
let assertionCount = 0;

const assert = new Proxy(nodeAssert, {
  apply(target, thisArg, args) {
    assertionCount += 1;
    return Reflect.apply(target, thisArg, args);
  },
  get(target, prop) {
    const value = target[prop];
    if (typeof value !== 'function') return value;
    return (...args) => {
      assertionCount += 1;
      return value.apply(target, args);
    };
  }
});

function test(name, fn) {
  tests.push({ name, fn });
}

function loadSyncModule(fileName) {
  const cache = {};
  return loadModule(fileName, cache);
}

function loadModule(fileName, cache) {
  const filePath = path.join(syncDir, fileName);
  const resolved = path.normalize(filePath);
  if (cache[resolved]) return cache[resolved].exports;
  const code = fs.readFileSync(filePath, 'utf8');
  const module = { exports: {} };
  cache[resolved] = module;
  const localRequire = (request) => {
    if (request.startsWith('.')) {
      const target = path.normalize(path.join(path.dirname(resolved), request));
      return loadModule(path.relative(syncDir, target), cache);
    }
    throw new Error('External require is disabled in sync tests: ' + request);
  };
  const sandbox = {
    module,
    exports: module.exports,
    require: localRequire,
    URL,
    console,
    fetch: async () => {
      throw new Error('Tests must use fixture fetchText, not live fetch.');
    }
  };
  vm.runInNewContext(code, sandbox, { filename: filePath, timeout: 1000 });
  return module.exports;
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
const shopifyClient = loadSyncModule('shopify-client.js');
const reconcileModule = loadSyncModule('reconcile.js');
const shapeValidator = loadSyncModule('validate-shopify-shape.js');
const setupDefinitions = loadSyncModule('setup-metafield-definitions.js');
const backfillModule = loadSyncModule('backfill-existing-products.js');
const configModule = loadSyncModule('config.js');
const stateModule = loadSyncModule('sync-state.js');
const normalizeModule = loadSyncModule('normalize.js');
const categorizeModule = loadSyncModule('categorize.js');
const enrichPrompt = loadSyncModule('enrich/prompt.js');
const enrichSeo = loadSyncModule('enrich/seo.js');
const enrichPayload = loadSyncModule('enrich/build-enrich-payload.js');
const reportModule = loadSyncModule('report.js');
const qualityGate = loadSyncModule('image-pipeline/quality-gate.js');
const creativeBrief = loadSyncModule('image-pipeline/creative-brief.js');
const imageTypes = loadSyncModule('image-pipeline/image-types.js');
const seedBriefs = loadSyncModule('image-pipeline/seed-creative-briefs.js');
const supabaseProduct = loadSyncModule('supabase-product.js');

function productId(url) {
  return crawl.productIdFromUrl(url);
}

function supplier(overrides) {
  return {
    name: 'Test Perfume',
    brand: 'Maison Test',
    category: 'Niche',
    description: 'A test perfume.',
    supplierPrice: 100,
    supplierCompareAtPrice: null,
    availability: 'in_stock',
    imageUrl: 'https://cdn.test/product.jpg',
    sourceUrl: 'https://nawadirdior.sa/test-perfume/p1001',
    ...(overrides || {})
  };
}

function shopifyProduct(overrides) {
  const sourceUrl = (overrides && overrides.sourceUrl) || 'https://nawadirdior.sa/test-perfume/p1001';
  const id = productId(sourceUrl) || '1001';
  return {
    id: '9001',
    title: 'Test Perfume',
    vendor: 'Maison Test',
    status: 'active',
    tags: ['imported-nader-dior', 'supplier:nawadirdior', 'supplier-id-p' + id],
    metafields: [
      { namespace: 'supplier', key: 'source_url', value: sourceUrl, type: 'single_line_text_field' },
      { namespace: 'supplier', key: 'product_id', value: id, type: 'single_line_text_field' }
    ],
    variants: [{ id: '8001', price: '200', compare_at_price: null, inventory_policy: 'continue' }],
    ...(overrides || {})
  };
}

function existingNeedingBackfill(sourceUrl, overrides) {
  const base = supplier({ sourceUrl });
  const built = payloads.buildPayload(base).product;
  return {
    id: '9101',
    title: built.title,
    handle: backfillModule.handleFromUrl(sourceUrl),
    tags: ['imported-nader-dior'],
    metafields: [],
    variants: [{ id: '8101', price: built.variants[0].price, compare_at_price: null, inventory_policy: 'continue' }],
    ...(overrides || {})
  };
}

function applyBackfillForTest(product, action) {
  return {
    ...product,
    tags: product.tags.concat(action.addedTags),
    sourceUrl: action.sourceUrl,
    supplierId: action.supplierId,
    metafields: [
      { namespace: 'supplier', key: 'source_url', value: action.sourceUrl, type: 'single_line_text_field' },
      { namespace: 'supplier', key: 'product_id', value: action.supplierId, type: 'single_line_text_field' }
    ]
  };
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
    sourceUrl: null,
    supplierProductId: '',
    canCreate: false,
    invalidReason: 'missing_supplier_price'
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
  assert.equal(payload.status, 'draft');
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

test('shopify-client builds lookup GraphQL request by source_url metafield or supplier-id tag', () => {
  const sourceUrl = 'https://nawadirdior.sa/%D8%B9%D8%B7%D8%B1-test/p1625888751';
  const request = shopifyClient.buildLookupProductRequest({
    shopDomain: 'unywbe-ub.myshopify.com',
    sourceUrl,
    first: 5
  });
  assert.equal(request.method, 'POST');
  assert.equal(request.url, 'https://unywbe-ub.myshopify.com/admin/api/2026-04/graphql.json');
  assert.ok(request.body.query.includes('CalapresLookupProduct'));
  assert.equal(request.body.variables.first, 5);
  assert.ok(request.body.variables.query.includes('metafields.supplier.source_url'));
  assert.ok(request.body.variables.query.includes('tag:"supplier-id-p1625888751"'));
  assert.ok(request.body.variables.query.includes('tag:imported-nader-dior OR tag:مستورد-نوادر-ديور'));
  assert.ok(request.body.variables.query.includes('%D8%B9%D8%B7%D8%B1'));
});

test('shopify-client builds exact REST create product request shape', () => {
  const productPayload = payloads.buildPayload(supplier({ sourceUrl: 'https://nawadirdior.sa/new/p777' }));
  const request = shopifyClient.buildCreateProductRequest({
    shopDomain: 'unywbe-ub.myshopify.com',
    payload: productPayload
  });
  assert.equal(request.method, 'POST');
  assert.equal(request.url, 'https://unywbe-ub.myshopify.com/admin/api/2026-04/products.json');
  assert.equal(request.body.product.title, 'Test Perfume');
  assert.equal(request.body.product.variants[0].price, '200');
  assert.equal(request.body.product.metafields.find((field) => field.key === 'product_id').value, '777');
});

test('shopify-client builds price and availability only update request shape', () => {
  const request = shopifyClient.buildUpdatePriceAvailabilityRequest({
    shopDomain: 'unywbe-ub.myshopify.com',
    productId: 'gid://shopify/Product/123',
    status: 'draft',
    variant: {
      id: 'gid://shopify/ProductVariant/456',
      price: '300',
      compare_at_price: null,
      inventory_policy: 'deny'
    }
  });
  assert.equal(request.method, 'PUT');
  assert.equal(request.url, 'https://unywbe-ub.myshopify.com/admin/api/2026-04/products/123.json');
  assert.deepEqual(plain(request.body), {
    product: {
      id: '123',
      status: 'draft',
      variants: [{ id: '456', price: '300', compare_at_price: null, inventory_policy: 'deny' }]
    }
  });
});

test('shopify-client builds imported-products pagination requests past 250 safely', () => {
  const request = shopifyClient.buildListImportedProductsRequest({
    shopDomain: 'unywbe-ub.myshopify.com',
    first: 999,
    after: 'cursor-250'
  });
  assert.equal(request.body.variables.first, 250);
  assert.equal(request.body.variables.after, 'cursor-250');
  assert.equal(request.body.variables.query, 'tag:imported-nader-dior OR tag:مستورد-نوادر-ديور');
  assert.ok(request.body.query.includes('pageInfo'));
});

test('shopify-client builds product tags read request for enriched guard', () => {
  const request = shopifyClient.buildReadProductTagsRequest({
    shopDomain: 'unywbe-ub.myshopify.com',
    productId: '123'
  });
  assert.equal(request.body.variables.id, 'gid://shopify/Product/123');
  assert.ok(request.body.query.includes('tags'));
  assert.ok(request.body.query.includes('CalapresReadProductTags'));
});

test('shopify-client normalizes GraphQL product nodes and lookup selection', () => {
  const response = {
    data: {
      products: {
        nodes: [
          {
            id: 'gid://shopify/Product/111',
            legacyResourceId: '111',
            title: 'Arabic Encoded',
            vendor: 'Maison',
            status: 'ACTIVE',
            tags: ['imported-nader-dior', 'supplier-id-p1625888751'],
            sourceUrlMetafield: {
              value: 'https://nawadirdior.sa/%D8%B9%D8%B7%D8%B1-test/p1625888751'
            },
            productIdMetafield: { value: 'p1625888751' },
            variants: {
              nodes: [
                {
                  id: 'gid://shopify/ProductVariant/222',
                  legacyResourceId: '222',
                  price: '600.00',
                  compareAtPrice: null,
                  inventoryPolicy: 'CONTINUE'
                }
              ]
            }
          }
        ]
      }
    }
  };
  const normalized = shopifyClient.normalizeGraphqlProducts(response);
  assert.equal(normalized[0].id, '111');
  assert.equal(normalized[0].variants[0].id, '222');
  assert.equal(normalized[0].inventoryPolicy, undefined);
  const selected = shopifyClient.selectLookupProduct(response, {
    sourceUrl: 'https://nawadirdior.sa/%D8%B9%D8%B7%D8%B1-test/p1625888751'
  });
  assert.equal(selected.supplierId, '1625888751');
});

test('shopify-client executeShopifyRequest serializes body and parses JSON offline', async () => {
  const request = shopifyClient.buildCreateProductRequest({
    shopDomain: 'unywbe-ub.myshopify.com',
    product: { title: 'Offline Test', variants: [{ price: '200', inventory_policy: 'continue' }] }
  });
  const calls = [];
  const response = await shopifyClient.executeShopifyRequest(request, async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 201,
      headers: {},
      text: async () => '{"product":{"id":123}}'
    };
  });
  assert.equal(calls[0].url, request.url);
  assert.equal(JSON.parse(calls[0].init.body).product.title, 'Offline Test');
  assert.equal(response.json.product.id, 123);
});

test('reconcile plans create, update, enriched skip/update, missing, duplicates, and malformed products', () => {
  const suppliers = [
    supplier({ sourceUrl: 'https://nawadirdior.sa/create-me/p1001', supplierPrice: 100 }),
    supplier({ sourceUrl: 'https://nawadirdior.sa/update-me/p1002', supplierPrice: 100 }),
    supplier({ sourceUrl: 'https://nawadirdior.sa/enriched-same/p1003', supplierPrice: 100 }),
    supplier({ sourceUrl: 'https://nawadirdior.sa/enriched-price/p1004', supplierPrice: 150 }),
    supplier({ sourceUrl: 'https://nawadirdior.sa/returning/p1005', supplierPrice: 220, availability: 'in_stock' }),
    supplier({ sourceUrl: 'https://nawadirdior.sa/discount/p1006', supplierPrice: 287.5, supplierCompareAtPrice: 345 }),
    supplier({ sourceUrl: 'https://nawadirdior.sa/discount-guard/p1007', supplierPrice: 200, supplierCompareAtPrice: 200 }),
    supplier({ sourceUrl: 'https://nawadirdior.sa/create-me-dupe/p1001', supplierPrice: 100 }),
    { sourceUrl: 'https://nawadirdior.sa/malformed/p1008', availability: 'missing', supplierPrice: null }
  ];
  const shops = [
    shopifyProduct({ sourceUrl: 'https://nawadirdior.sa/update-me/p1002', variants: [{ id: '8002', price: '199', compare_at_price: null, inventory_policy: 'continue' }] }),
    shopifyProduct({ sourceUrl: 'https://nawadirdior.sa/enriched-same/p1003', tags: ['imported-nader-dior', 'supplier-id-p1003', 'enriched'], variants: [{ id: '8003', price: '200', compare_at_price: null, inventory_policy: 'continue' }] }),
    shopifyProduct({ sourceUrl: 'https://nawadirdior.sa/enriched-price/p1004', tags: ['imported-nader-dior', 'supplier-id-p1004', 'enriched'], variants: [{ id: '8004', price: '200', compare_at_price: null, inventory_policy: 'continue' }] }),
    shopifyProduct({ sourceUrl: 'https://nawadirdior.sa/returning/p1005', status: 'draft', variants: [{ id: '8005', price: '320', compare_at_price: null, inventory_policy: 'deny' }] }),
    shopifyProduct({ sourceUrl: 'https://nawadirdior.sa/missing-live/p2001', status: 'active', variants: [{ id: '8101', price: '300', compare_at_price: null, inventory_policy: 'continue' }] }),
    shopifyProduct({ sourceUrl: 'https://nawadirdior.sa/missing-already-draft/p2002', status: 'draft', variants: [{ id: '8102', price: '300', compare_at_price: null, inventory_policy: 'deny' }] }),
    shopifyProduct({ sourceUrl: 'https://nawadirdior.sa/discount/p1006', variants: [{ id: '8006', price: '387.50', compare_at_price: null, inventory_policy: 'continue' }] }),
    shopifyProduct({ sourceUrl: 'https://nawadirdior.sa/discount-guard/p1007', variants: [{ id: '8007', price: '300', compare_at_price: null, inventory_policy: 'continue' }] })
  ];
  const plan = reconcileModule.reconcile(suppliers, shops);
  assert.equal(plan.toCreate.length, 1);
  assert.equal(plan.toUpdate.length, 4);
  assert.equal(plan.toMarkOutOfStock.length, 1);
  assert.equal(plan.toSkipEnriched.length, 1);
  assert.ok(plan.unchanged.some((entry) => entry.reason === 'duplicate_supplier_id'));
  assert.ok(plan.unchanged.some((entry) => entry.reason === 'cannot_create_missing_supplier_price'));
  assert.ok(plan.unchanged.some((entry) => entry.reason === 'already_out_of_stock_missing_supplier'));
  assert.equal(plan.toUpdate.find((entry) => entry.supplierProduct.supplierId === '1004').updateMode, 'price_availability_only');
  assert.ok(plan.toUpdate.find((entry) => entry.supplierProduct.supplierId === '1006').changes.some((change) => change.field === 'compareAtPrice' && change.desired === 445));
  assert.ok(!plan.toUpdate.find((entry) => entry.supplierProduct.supplierId === '1007'));
});

test('reconcile matches Shopify products by supplier-id tag when source_url metafield is absent', () => {
  const plan = reconcileModule.reconcile(
    [supplier({ sourceUrl: 'https://nawadirdior.sa/tag-match/p3333', supplierPrice: 100 })],
    [
      {
        id: '9100',
        status: 'active',
        tags: 'imported-nader-dior, supplier-id-p3333',
        variants: [{ id: '8100', price: '199', compare_at_price: null, inventory_policy: 'continue' }]
      }
    ]
  );
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toCreate.length, 0);
});

test('reconcile treats Arabic imported tag as imported for supplier-missing products', () => {
  const plan = reconcileModule.reconcile(
    [],
    [
      {
        id: '9200',
        status: 'active',
        tags: 'مستورد-نوادر-ديور',
        variants: [{ id: '8200', price: '299', compare_at_price: null, inventory_policy: 'continue' }]
      }
    ]
  );
  assert.equal(plan.toMarkOutOfStock.length, 1);
  assert.equal(plan.toMarkOutOfStock[0].reason, 'missing_from_supplier');
});

test('reconcile treats a missing supplier product returning as an update, not a create', () => {
  const plan = reconcileModule.reconcile(
    [supplier({ sourceUrl: 'https://nawadirdior.sa/back/p4444', supplierPrice: 210, availability: 'in_stock' })],
    [shopifyProduct({ sourceUrl: 'https://nawadirdior.sa/back/p4444', status: 'draft', variants: [{ id: '8444', price: '310', compare_at_price: null, inventory_policy: 'deny' }] })]
  );
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].reason, 'update_imported_product');
  assert.ok(plan.toUpdate[0].changes.some((change) => change.field === 'status' && change.desired === 'active'));
});

test('validate-shopify-shape accepts create and price-only payloads', () => {
  const createPayload = payloads.buildPayload(supplier({ sourceUrl: 'https://nawadirdior.sa/valid/p9090' }));
  const priceOnlyPayload = payloads.buildPayload({
    availability: 'missing',
    existingProduct: { id: 505, variants: [{ id: 606 }] }
  });
  assert.equal(shapeValidator.validateShopifyProductShape(createPayload).valid, true);
  assert.equal(shapeValidator.validateShopifyProductShape(priceOnlyPayload, { mode: 'price_availability_only' }).valid, true);
});

test('validate-shopify-shape flags GraphQL-style or forbidden field names', () => {
  const result = shapeValidator.validateShopifyProductShape({
    product: {
      id: 1,
      bodyHtml: '<p>Wrong</p>',
      inventory_quantity: 5,
      variants: [{ id: 2, compareAtPrice: '300', inventoryPolicy: 'continue' }]
    }
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('bodyHtml')));
  assert.ok(result.errors.some((error) => error.includes('inventory_quantity')));
  assert.ok(result.errors.some((error) => error.includes('compareAtPrice')));
});

test('validate-shopify-shape flags invalid status, inventory policy, and malformed metafields', () => {
  const result = shapeValidator.validateShopifyProductShape({
    product: {
      title: 'Bad Shape',
      status: 'published',
      variants: [{ price: '200', inventory_policy: 'track' }],
      metafields: [{ namespace: 'supplier', key: '', value: null }]
    }
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('product.status')));
  assert.ok(result.errors.some((error) => error.includes('inventory_policy')));
  assert.ok(result.errors.some((error) => error.includes('key is required')));
  assert.ok(result.errors.some((error) => error.includes('value is required')));
});

test('setup-metafield-definitions builds two admin-filterable pinned PRODUCT definitions', () => {
  const requests = setupDefinitions.buildSupplierMetafieldDefinitionRequests({
    shopDomain: 'unywbe-ub.myshopify.com'
  });
  assert.equal(requests.length, 2);
  const keys = requests.map((request) => request.body.variables.definition.key).sort();
  assert.deepEqual(Array.from(keys), ['product_id', 'source_url']);
  for (const request of requests) {
    const definition = request.body.variables.definition;
    assert.equal(request.method, 'POST');
    assert.equal(request.url, 'https://unywbe-ub.myshopify.com/admin/api/2026-04/graphql.json');
    assert.ok(request.body.query.includes('metafieldDefinitionCreate'));
    assert.equal(definition.namespace, 'supplier');
    assert.equal(definition.ownerType, 'PRODUCT');
    assert.equal(definition.type, 'single_line_text_field');
    assert.equal(definition.pin, true);
    assert.deepEqual(plain(definition.access), { admin: 'MERCHANT_READ_WRITE' });
    assert.deepEqual(plain(definition.capabilities), { adminFilterable: { enabled: true } });
  }
});

test('setup-metafield-definitions executes through an injected fetch-like function only', async () => {
  const request = setupDefinitions.buildMetafieldDefinitionCreateRequest({ key: 'source_url' });
  const calls = [];
  const response = await setupDefinitions.executeSetupRequest(request, async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      text: async () => '{"data":{"metafieldDefinitionCreate":{"userErrors":[]}}}'
    };
  });
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].init.body).variables.definition.key, 'source_url');
  assert.equal(response.json.data.metafieldDefinitionCreate.userErrors.length, 0);
});

test('backfill-map contains exactly the 18 verified live products with all four resolved rows high', () => {
  const map = JSON.parse(fs.readFileSync(path.join(syncDir, 'backfill-map.json'), 'utf8'));
  assert.equal(map.length, 18);
  assert.equal(new Set(map.map((entry) => entry.shopifyLegacyId)).size, 18);
  assert.equal(map.filter((entry) => entry.confidence === 'high').length, 18);
  assert.equal(map.filter((entry) => entry.confidence === 'medium').length, 0);
  assert.equal(map.filter((entry) => entry.confidence === 'low').length, 0);
  assert.equal(map.filter((entry) => entry.confidence === 'not_found').length, 0);
  const polo = map.find((entry) => entry.title.includes('Polo 67'));
  assert.equal(polo.supplierProductId, 'p278426097');
  assert.equal(polo.confidence, 'high');
  assert.equal(map.find((entry) => entry.shopifyLegacyId === '9468830122240').supplierProductId, 'p1034058830');
  assert.equal(map.find((entry) => entry.shopifyLegacyId === '9468840673536').supplierProductId, 'p917062112');
  assert.equal(map.find((entry) => entry.shopifyLegacyId === '9468841558272').supplierProductId, 'p1729559829');
  assert.equal(map.find((entry) => entry.shopifyLegacyId === '9468845785344').supplierProductId, 'p1673700127');
});

test('backfill-existing-products uses high and medium entries, separates low manual and not_found supplier rows', () => {
  const testMap = [
    {
      shopifyLegacyId: '1001',
      title: 'High Product',
      brand: 'Brand A',
      matchedSourceUrl: 'https://nawadirdior.sa/high-product/p111',
      supplierProductId: 'p111',
      concentration: 'EDP',
      sizeMl: 100,
      confidence: 'high',
      reason: 'Exact strict match.'
    },
    {
      shopifyLegacyId: '1002',
      title: 'Medium Product',
      brand: 'Brand B',
      matchedSourceUrl: 'https://nawadirdior.sa/medium-product/p222',
      supplierProductId: 'p222',
      concentration: 'EDT',
      sizeMl: 125,
      confidence: 'medium',
      reason: 'Unique match with non-conflicting missing field.'
    },
    {
      shopifyLegacyId: '1003',
      title: 'Low Product',
      brand: 'Brand C',
      matchedSourceUrl: null,
      supplierProductId: null,
      concentration: null,
      sizeMl: 100,
      confidence: 'low',
      reason: 'Ambiguous concentration.'
    },
    {
      shopifyLegacyId: '1004',
      title: 'Not Found Product',
      brand: 'Brand D',
      matchedSourceUrl: null,
      supplierProductId: null,
      concentration: null,
      sizeMl: 100,
      confidence: 'not_found',
      reason: 'No strict supplier match in crawl.'
    }
  ];
  const existing = [
    { id: '1001', title: 'High Product', tags: ['imported-nader-dior', 'legacy'], metafields: [] },
    { id: '1002', title: 'Medium Product', tags: ['مستورد-نوادر-ديور', 'luxury'], metafields: [] },
    { id: '1003', title: 'Low Product', tags: ['imported-nader-dior'], metafields: [] },
    { id: '1004', title: 'Not Found Product', tags: ['imported-nader-dior'], metafields: [] }
  ];
  const plan = backfillModule.planBackfillExistingProducts(existing, testMap, {
    shopDomain: 'unywbe-ub.myshopify.com'
  });
  assert.equal(plan.summary.highConfidence, 1);
  assert.equal(plan.summary.mediumConfidence, 1);
  assert.equal(plan.summary.lowConfidence, 1);
  assert.equal(plan.summary.notFoundAtSupplier, 1);
  assert.equal(plan.toBackfill.length, 2);
  assert.equal(plan.needsManualMatch.length, 1);
  assert.equal(plan.notFoundAtSupplier.length, 1);
  assert.equal(plan.needsManualMatch[0].shopifyLegacyId, '1003');
  assert.equal(plan.notFoundAtSupplier[0].shopifyLegacyId, '1004');

  const arabicAction = plan.toBackfill.find((action) => action.shopifyLegacyId === '1002');
  assert.deepEqual(Array.from(arabicAction.addedTags), ['imported-nader-dior', 'supplier-id-p222']);
  const tagProduct = arabicAction.requests.tagUpdate.body.product;
  assert.deepEqual(Object.keys(tagProduct).sort(), ['id', 'tags']);
  assert.equal(tagProduct.tags, 'مستورد-نوادر-ديور, luxury, imported-nader-dior, supplier-id-p222');
  assert.ok(tagProduct.tags.includes('مستورد-نوادر-ديور'));

  const metafields = arabicAction.requests.metafieldsSet.body.variables.metafields;
  assert.equal(metafields[0].ownerId, 'gid://shopify/Product/1002');
  assert.equal(metafields.find((field) => field.key === 'product_id').value, '222');
  assert.equal(metafields.find((field) => field.key === 'source_url').value, 'https://nawadirdior.sa/medium-product/p222');
});

test('backfill-existing-products never emits forbidden product fields', () => {
  const map = [
    {
      shopifyLegacyId: '2001',
      title: 'Guard Product',
      brand: 'Guard',
      matchedSourceUrl: 'https://nawadirdior.sa/guard/p333',
      supplierProductId: 'p333',
      concentration: 'EDP',
      sizeMl: 100,
      confidence: 'high',
      reason: 'Exact strict match.'
    }
  ];
  const plan = backfillModule.planBackfillExistingProducts(
    [{ id: '2001', title: 'Guard Product', tags: ['imported-nader-dior'], metafields: [] }],
    map
  );
  const product = plan.toBackfill[0].requests.tagUpdate.body.product;
  for (const key of ['price', 'images', 'image', 'body_html', 'description', 'status', 'vendor', 'variants', 'metafields']) {
    assert.equal(Object.prototype.hasOwnProperty.call(product, key), false);
  }
  assert.equal(plan.toBackfill[0].requests.metafieldsSet.body.variables.metafields.length, 2);
});

test('backfill-existing-products detects already backfilled products and normalizes p-prefixed metafield ids', () => {
  const sourceUrl = 'https://nawadirdior.sa/already/p2222';
  const existing = {
    id: '2222',
    title: 'Already Backfilled',
    tags: ['imported-nader-dior', 'supplier-id-p2222'],
    metafields: [
      { namespace: 'supplier', key: 'source_url', value: sourceUrl },
      { namespace: 'supplier', key: 'product_id', value: 'p2222' }
    ]
  };
  const map = [
    {
      shopifyLegacyId: '2222',
      title: 'Already Backfilled',
      brand: 'Maison',
      matchedSourceUrl: sourceUrl,
      supplierProductId: 'p2222',
      concentration: null,
      sizeMl: null,
      confidence: 'high',
      reason: 'Exact strict match.'
    }
  ];
  const plan = backfillModule.planBackfillExistingProducts([existing], map);
  assert.equal(plan.toBackfill.length, 0);
  assert.equal(plan.alreadyBackfilled.length, 1);
});

test('backfill-existing-products plans the real 18-product map and preserves dual imported tags', () => {
  const map = JSON.parse(fs.readFileSync(path.join(syncDir, 'backfill-map.json'), 'utf8'));
  const existing = map.map((entry, index) => ({
    id: entry.shopifyLegacyId,
    title: entry.title,
    tags: index < 11 ? ['imported-nader-dior'] : ['مستورد-نوادر-ديور'],
    metafields: []
  }));
  const plan = backfillModule.planBackfillExistingProducts(existing, map);
  assert.equal(plan.summary.totalExisting, 18);
  assert.equal(plan.toBackfill.length, 18);
  assert.equal(plan.needsManualMatch.length, 0);
  assert.equal(plan.notFoundAtSupplier.length, 0);
  assert.equal(plan.toBackfill.filter((action) => action.addedTags.includes('imported-nader-dior')).length, 7);
  for (const action of plan.toBackfill.filter((item) => Number(item.shopifyLegacyId) >= 9468843819264)) {
    assert.ok(action.requests.tagUpdate.body.product.tags.includes('مستورد-نوادر-ديور'));
  }
  const supplierProducts = map
    .filter((entry) => entry.confidence === 'high' || entry.confidence === 'medium')
    .map((entry) => ({
      name: entry.title,
      brand: entry.brand,
      supplierPrice: 100,
      availability: 'in_stock',
      sourceUrl: entry.matchedSourceUrl
    }));
  const afterProducts = existing.map((product) => {
    const action = plan.toBackfill.find((item) => item.productId === product.id);
    return action ? applyBackfillForTest(product, action) : product;
  });
  const after = reconcileModule.reconcile(supplierProducts, afterProducts);
  assert.equal(after.toCreate.length, 0);
});

test('config exposes the live source-of-truth constants', () => {
  assert.equal(configModule.SHOP_DOMAIN, 'unywbe-ub.myshopify.com');
  assert.equal(configModule.API_VERSION_STANDARD, '2026-04');
  assert.equal(configModule.API_VERSION_DEPLOYED, '2025-01');
  assert.equal(configModule.MARKUP_SAR, 100);
  assert.equal(configModule.CHUNK_SIZE, 300);
  assert.equal(configModule.TAGS.imported, 'imported-nader-dior');
  assert.equal(configModule.TAGS.supplier, 'supplier:nawadirdior');
  assert.equal(configModule.NAMESPACES.supplier, 'supplier');
  assert.equal(configModule.CREDENTIALS.shopifyOAuth2.id, 'QLsvwO73GFsQfy0w');
});

test('sync-state computes chunks, offsets, wrap-around, and empty lists', () => {
  assert.deepEqual(plain(stateModule.computeChunk([1, 2, 3, 4, 5], 0, 2)), {
    chunk: [1, 2],
    nextOffset: 2,
    wrapped: false,
    offset: 0,
    chunkSize: 2,
    total: 5
  });
  assert.deepEqual(plain(stateModule.computeChunk([1, 2, 3, 4, 5], 4, 3)), {
    chunk: [5],
    nextOffset: 0,
    wrapped: true,
    offset: 4,
    chunkSize: 3,
    total: 5
  });
  assert.deepEqual(plain(stateModule.computeChunk([], 99, 300)), {
    chunk: [],
    nextOffset: 0,
    wrapped: true,
    offset: 0,
    chunkSize: 300,
    total: 0
  });
});

test('sync-state selects new vs existing by source URL and supplier id', () => {
  const selected = stateModule.selectNewVsExisting(
    [
      { sourceUrl: 'https://nawadirdior.sa/a/p111' },
      { sourceUrl: 'https://nawadirdior.sa/b/p222' },
      { sourceUrl: 'https://nawadirdior.sa/c/p333' }
    ],
    [
      { sourceUrl: 'https://nawadirdior.sa/a/p111' },
      { tags: ['supplier-id-p222'] }
    ]
  );
  assert.equal(selected.existingProducts.length, 2);
  assert.equal(selected.newProducts.length, 1);
  assert.equal(selected.newProducts[0].sourceUrl, 'https://nawadirdior.sa/c/p333');
});

test('parse-product carries crawl source/id through redirected homepage HTML and blocks create', () => {
  const parsed = parser.parseProduct(readFixture('homepage-redirect.html'), {
    sourceUrl: 'https://nawadirdior.sa/stale-page/p123456',
    supplierProductId: '123456'
  });
  assert.equal(parsed.sourceUrl, 'https://nawadirdior.sa/stale-page/p123456');
  assert.equal(parsed.supplierProductId, '123456');
  assert.equal(parsed.supplierPrice, null);
  assert.equal(parsed.canCreate, false);
  assert.equal(parsed.invalidReason, 'missing_supplier_price');
  const payload = payloads.buildPayload(parsed);
  assert.equal(payload.skipped, true);
  assert.equal(payload.reason, 'missing_supplier_price');
});

test('parse-product recognizes Arabic availability and Arabic-Indic prices', () => {
  const html = `
    <meta property="og:title" content="عطر اختبار">
    <meta property="product:price:amount" content="٣٤٥ ر.س">
    <meta property="product:availability" content="متوفر">
    <link rel="canonical" href="https://nawadirdior.sa/arabic-test/p765">
  `;
  const parsed = parser.parseProduct(html);
  assert.equal(parsed.supplierPrice, 345);
  assert.equal(parsed.availability, 'in_stock');
  assert.equal(parsed.canCreate, true);
});

test('pricing custom strategy stub reads brand and range tables while preserving compare guard', () => {
  const brand = pricing.applyPricing(
    { brand: 'Dior', supplierPrice: 100, supplierCompareAtPrice: 100 },
    { strategy: 'custom', customTable: { brands: { Dior: { markupSar: 150 } } } }
  );
  assert.equal(brand.price, 250);
  assert.equal(brand.compareAtPrice, null);
  assert.equal(brand.strategy, 'custom');
  assert.equal(brand.rule, 'brand:Dior');
  const range = pricing.applyPricing(
    { supplierPrice: 900, supplierCompareAtPrice: 1000 },
    { strategy: 'custom', customTable: { ranges: [{ min: 800, markupSar: 200 }] } }
  );
  assert.equal(range.price, 1100);
  assert.equal(range.compareAtPrice, 1200);
  assert.equal(range.rule, 'range');
});

test('normalize extracts canonical brand, concentration, size, gender, and cleaned title', () => {
  const normalized = normalizeModule.normalizeProduct({
    name: ' توم فورد Black Orchid Eau de Parfum ١٠٠ml للنساء '
  });
  assert.equal(normalized.brand, 'Tom Ford');
  assert.equal(normalized.concentration, 'EDP');
  assert.equal(normalized.sizeMl, 100);
  assert.equal(normalized.gender, 'women');
  assert.equal(normalized.title, 'توم فورد Black Orchid Eau de Parfum ١٠٠ml للنساء');
});

test('categorize maps products to Calapres collection handles', () => {
  const niche = categorizeModule.collectionHandles({ name: 'Nishane Hacivat Extrait 100ml', brand: 'Nishane' });
  assert.ok(niche.includes('niche-international'));
  const oud = categorizeModule.collectionHandles({ name: 'Luxury Oud Burner مبخرة عود', brand: 'Arabian Oud' });
  assert.ok(oud.includes('eastern-oud-incense'));
  const luxury = categorizeModule.collectionHandles({ name: 'Dior Sauvage Elixir', brand: 'Dior' });
  assert.ok(luxury.includes('luxury-brands'));
});

test('shopify-client builds metafieldsSet, collection add, smart collection, and backoff metadata', () => {
  const meta = shopifyClient.buildMetafieldsSetRequest({
    productId: '123',
    metafields: [{ key: 'source_url', value: 'https://nawadirdior.sa/a/p1' }]
  });
  assert.equal(meta.url, 'https://unywbe-ub.myshopify.com/admin/api/2026-04/graphql.json');
  assert.equal(meta.body.variables.metafields[0].ownerId, 'gid://shopify/Product/123');
  const collection = shopifyClient.buildCollectionAddProductsRequest({
    collectionId: '999',
    productIds: ['123', 'gid://shopify/Product/456']
  });
  assert.equal(collection.body.variables.id, 'gid://shopify/Collection/999');
  assert.equal(collection.body.variables.productIds.length, 2);
  const rule = shopifyClient.buildSmartCollectionRuleShape({
    handle: 'tom-ford',
    rules: [{ condition: 'brand:Tom Ford' }]
  });
  assert.equal(rule.rules[0].column, 'tag');
  const backoff = shopifyClient.backoffMetadata({ status: 429, headers: { 'Retry-After': '7' } });
  assert.equal(backoff.shouldRetry, true);
  assert.equal(backoff.waitSeconds, 7);
  assert.equal(shopifyClient.pacingMetadata().waitSeconds, 1);
});

test('validate-shopify-shape rejects customer fields, secrets, and exact enriched guard violations', () => {
  const bad = shapeValidator.validateShopifyProductShape({
    product: {
      id: 1,
      status: 'draft',
      customerEmail: 'blocked-contact',
      metafields: [{ namespace: 'presentation', key: 'note', value: 'bear' + 'er abcdefghijklmnopqrstuvwxyz', type: 'single_line_text_field' }],
      variants: [{ id: 2, price: '100', inventory_policy: 'deny', sku: 'NOPE' }]
    }
  }, { mode: 'price_availability_only' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some((error) => error.includes('customer')));
  assert.ok(bad.errors.some((error) => error.includes('secret')));
  assert.ok(bad.errors.some((error) => error.includes('variant.sku') || error.includes('sku')));
});

test('enrichment prompt, SEO, and payload protect luxury presentation and add enriched tag', () => {
  const product = {
    id: '123',
    title: 'Tom Ford Oud Wood EDP 100ml',
    vendor: 'Tom Ford',
    tags: ['imported-nader-dior'],
    images: [{ url: 'https://cdn.test/original.jpg' }]
  };
  const prompts = enrichPrompt.buildHiggsfieldPrompts(product);
  assert.equal(prompts.model, 'higgsfield-soul');
  assert.ok(prompts.heroPrompt.includes('Tom Ford'));
  assert.equal(prompts.anglePrompts.length, 3);
  const seo = enrichSeo.buildArabicSeo(product);
  assert.ok(seo.titleTag.includes('كالابريز'));
  assert.ok(seo.bodyHtml.includes('dir="rtl"'));
  assert.ok(seo.descriptionTag.length <= 155);
  const payload = enrichPayload.buildEnrichPayload({
    product,
    generatedImages: ['https://cdn.test/generated-1.jpg', 'https://cdn.test/generated-2.jpg']
  });
  assert.equal(payload.product.id, '123');
  assert.ok(payload.product.tags.includes('enriched'));
  assert.equal(payload.product.images.length, 3);
  const guarded = payloads.buildPayload({
    supplierPrice: 500,
    availability: 'in_stock',
    existingProduct: { id: '123', tags: payload.product.tags, variants: [{ id: '456' }] }
  }).product;
  assert.deepEqual(Object.keys(guarded).sort(), ['id', 'status', 'variants']);
});

test('report builds stable JSON and Markdown run summaries', () => {
  const summary = reportModule.buildRunSummary({
    runId: 'test-run',
    mode: 'offline',
    offset: { start: 300, next: 600, chunkSize: 300, total: 3155 },
    reconcilePlan: { toCreate: [1, 2], toUpdate: [3], toMarkOutOfStock: [], toSkipEnriched: [4], unchanged: [5, 6] }
  });
  assert.equal(summary.counts.created, 2);
  assert.equal(summary.counts.updated, 1);
  assert.equal(summary.offset.next, 600);
  const markdown = reportModule.toMarkdown(summary);
  assert.ok(markdown.includes('Calapres Sync Run Summary'));
  assert.ok(markdown.includes('| Created | 2 |'));
  assert.equal(JSON.parse(reportModule.toJson(summary)).runId, 'test-run');
});

// ─── Image Pipeline Tests ────────────────────────────────────────────────────

test('quality-gate passes a well-formed Higgsfield response with reference image', () => {
  const response = { images: [{ url: 'https://cdn.higgsfield.ai/img1.jpg' }, { url: 'https://cdn.higgsfield.ai/img2.jpg' }] };
  const ctx = { referenceImageUrl: 'https://cdn.salla.sa/original.jpg' };
  const result = qualityGate.runQualityChecks(response, ctx);
  assert.equal(result.passed, true);
  assert.equal(result.score, 100);
  assert.equal(result.bestImageUrl, 'https://cdn.higgsfield.ai/img1.jpg');
  assert.equal(result.issues.length, 0);
  assert.equal(qualityGate.decideAction(result, 0), 'publish');
});

test('quality-gate fails empty response and triggers retry then needs_review', () => {
  const empty = { images: [] };
  const ctx = { referenceImageUrl: 'https://cdn.salla.sa/original.jpg' };
  const result = qualityGate.runQualityChecks(empty, ctx);
  assert.equal(result.passed, false);
  assert.ok(result.issues.some(i => i.includes('No images')));
  assert.equal(qualityGate.decideAction(result, 0), 'retry');
  assert.equal(qualityGate.decideAction(result, 1), 'retry');
  assert.equal(qualityGate.decideAction(result, 3), 'needs_review');
});

test('quality-gate flags missing reference image but still checks images', () => {
  const response = { images: [{ url: 'https://cdn.higgsfield.ai/img.jpg' }] };
  const result = qualityGate.runQualityChecks(response, {});
  assert.equal(result.checks.has_images, true);
  assert.equal(result.checks.reference_used, false);
  assert.equal(result.passed, false);
  assert.ok(result.issues.some(i => i.includes('reference')));
});

test('quality-gate normalizes different Higgsfield response shapes', () => {
  const withData   = { data: [{ url: 'https://cdn.higgsfield.ai/a.jpg' }] };
  const withOutput = { outputs: ['https://cdn.higgsfield.ai/b.jpg'] };
  const ctx = { referenceImageUrl: 'https://cdn.salla.sa/ref.jpg' };
  assert.equal(qualityGate.normalizeImages(withData)[0],   'https://cdn.higgsfield.ai/a.jpg');
  assert.equal(qualityGate.normalizeImages(withOutput)[0], 'https://cdn.higgsfield.ai/b.jpg');
});

test('quality-gate rejects non-https URLs', () => {
  const response = { images: [{ url: 'http://insecure.com/img.jpg' }, { url: 'https://cdn.higgsfield.ai/safe.jpg' }] };
  const imgs = qualityGate.normalizeImages(response);
  assert.equal(imgs.length, 1);
  assert.equal(imgs[0], 'https://cdn.higgsfield.ai/safe.jpg');
});

test('creative-brief builds correct Higgsfield request body for product_hero', () => {
  const brief = {
    id: 'brief-1',
    shopify_product_id: '123',
    product_title: 'Tom Ford Oud Wood',
    brand_name: 'Tom Ford',
    concentration: 'EDP',
    size_ml: 100,
    bottle_shape_notes: 'rectangular dark brown bottle with gold cap',
    primary_color: 'dark brown',
    reference_image_url: 'https://cdn.salla.sa/original.jpg',
  };
  const brandStyle = {
    base_prompt_fragment: 'Luxury ecommerce fragrance photography.',
    negative_prompt: 'low quality, blurry',
    reference_image_weight: 0.85,
  };
  const req = creativeBrief.buildHiggsfieldRequest(brief, brandStyle, 'product_hero');
  assert.equal(req.model, 'higgsfield-soul');
  assert.ok(req.prompt.includes('Tom Ford Oud Wood'));
  assert.ok(req.prompt.includes('EDP'));
  assert.ok(req.prompt.includes('Hero angle'));
  assert.equal(req.aspect_ratio, '1:1');
  assert.equal(req.resolution, '2048x2048');
  assert.equal(req.num_outputs, 1);
  assert.ok(Array.isArray(req.reference_images));
  assert.equal(req.reference_images[0].role, 'product_reference');
  assert.equal(req.reference_images[0].url, 'https://cdn.salla.sa/original.jpg');
  assert.equal(req.reference_images[0].image_weight, 0.85);
});

test('creative-brief omits reference_images when url is missing', () => {
  const brief = { shopify_product_id: '456', product_title: 'No Ref Product', reference_image_url: null };
  const brandStyle = { base_prompt_fragment: 'Luxury.', negative_prompt: 'bad', reference_image_weight: 0.85 };
  const req = creativeBrief.buildHiggsfieldRequest(brief, brandStyle, 'product_angle_rtq');
  assert.equal(req.reference_images, undefined);
});

test('image-types getImageType returns correct definitions', () => {
  const hero = imageTypes.getImageType('product_hero');
  assert.equal(hero.aspectRatio, '1:1');
  assert.equal(hero.resolution, '2048x2048');
  const banner = imageTypes.getImageType('collection_desktop');
  assert.equal(banner.aspectRatio, '16:9');
  const story = imageTypes.getImageType('ad_story');
  assert.equal(story.aspectRatio, '9:16');
  assert.throws(() => imageTypes.getImageType('invalid_type'), /Unknown job_type/);
});

test('image-types product shot types covers all 4 angles', () => {
  assert.equal(imageTypes.PRODUCT_SHOT_TYPES.length, 4);
  assert.ok(imageTypes.PRODUCT_SHOT_TYPES.includes('product_hero'));
  assert.ok(imageTypes.PRODUCT_SHOT_TYPES.includes('product_angle_rtq'));
});

// ─── Supabase Product (Data Lake) Tests ─────────────────────────────────────

test('supabase-product generateCalapresSku produces CAL-ND-P<id> format', () => {
  assert.equal(supabaseProduct.generateCalapresSku('ND', '852601829'), 'CAL-ND-P852601829');
  assert.equal(supabaseProduct.generateCalapresSku('nd', '100'),       'CAL-ND-P100');
  assert.equal(supabaseProduct.generateCalapresSku('AF', 'p123'),      'CAL-AF-P123'); // strips leading p
  assert.equal(supabaseProduct.generateCalapresSku('ND', ''),          null);
  assert.equal(supabaseProduct.generateCalapresSku('',   '123'),       null);
  assert.equal(supabaseProduct.SUPPLIER_CODE_ND, 'ND');
});

test('supabase-product buildSupabaseRecord maps supplier product fields correctly', () => {
  const parsed = {
    name: 'Tom Ford Oud Wood EDP 100ml',
    brand: 'Tom Ford',
    category: 'Niche',
    concentration: 'EDP',
    gender: 'unisex',
    sizeMl: 100,
    supplierPrice: 805,
    supplierCompareAtPrice: null,
    availability: 'in_stock',
    imageUrl: 'https://cdn.salla.sa/original.jpg',
    sourceUrl: 'https://nawadirdior.sa/tom-ford-oud-wood/p852601829',
    description: 'A woody perfume.',
    supplierProductId: '852601829',
    supplierSku: 'TF-OW-100',
  };
  const priced = { price: 905, compareAtPrice: null };
  const record = supabaseProduct.buildSupabaseRecord(parsed, priced);

  // Identity
  assert.equal(record.supplier_product_id, '852601829');
  assert.equal(record.supplier_sku, 'TF-OW-100');
  assert.equal(record.supplier_source_url, 'https://nawadirdior.sa/tom-ford-oud-wood/p852601829');
  assert.equal(record.supplier_slug, 'tom-ford-oud-wood');

  // Content
  assert.equal(record.product_title_en, 'Tom Ford Oud Wood EDP 100ml');

  // Classification
  assert.equal(record.brand_name, 'Tom Ford');
  assert.equal(record.concentration, 'EDP');
  assert.equal(record.size_ml, 100);
  assert.equal(record.gender_target, 'unisex');
  assert.equal(record.category, 'Niche');

  // Pricing
  assert.equal(record.supplier_price, 805);
  assert.equal(record.supplier_original_price, null);
  assert.equal(record.supplier_discounted_price, null);
  assert.equal(record.profit_margin_sar, 100);
  assert.equal(record.selling_price, 905);
  assert.equal(record.compare_at_price, null);
  assert.equal(record.currency, 'SAR');

  // Availability
  assert.equal(record.availability_status, 'in_stock');

  // Image pipeline auto-advances when image URL is present
  assert.equal(record.image_pipeline_status, 'source_saved');

  // calapres_sku not set on record (DB trigger handles it on INSERT)
  assert.equal(record.calapres_sku, undefined);

  // Raw payload preserved
  assert.equal(record.raw_payload.supplierPrice, 805);
});

test('supabase-product buildSupabaseRecord computes discount pricing correctly', () => {
  const parsed = {
    name: 'Dior Sauvage EDP',
    brand: 'Dior',
    supplierPrice: 650,
    supplierCompareAtPrice: 805,
    availability: 'in_stock',
    sourceUrl: 'https://nawadirdior.sa/dior-sauvage/p111',
    supplierProductId: '111',
  };
  const priced = { price: 750, compareAtPrice: 905 };
  const record = supabaseProduct.buildSupabaseRecord(parsed, priced);

  assert.equal(record.supplier_price, 650);
  assert.equal(record.supplier_original_price, 805);
  assert.equal(record.supplier_discounted_price, 650);  // discounted = current price when original > current
  assert.equal(record.selling_price, 750);              // supplier_discounted + 100
  assert.equal(record.compare_at_price, 905);           // supplier_original + 100
});

test('supabase-product buildSupabaseRecord prevents compare_at == price (same-price guard)', () => {
  const parsed = {
    name: 'Test',
    brand: 'X',
    supplierPrice: 200,
    supplierCompareAtPrice: 200,
    availability: 'in_stock',
    sourceUrl: 'https://nawadirdior.sa/x/p222',
    supplierProductId: '222',
  };
  // applyPricing would null out compareAtPrice when equal; pass that result
  const priced = { price: 300, compareAtPrice: null };
  const record = supabaseProduct.buildSupabaseRecord(parsed, priced);
  assert.equal(record.compare_at_price, null);
});

test('supabase-product buildSupabaseRecord normalizes availability variants', () => {
  const base = { name: 'X', brand: 'Y', sourceUrl: 'https://nawadirdior.sa/x/p1', supplierProductId: '1', supplierPrice: 100 };
  assert.equal(supabaseProduct.buildSupabaseRecord({ ...base, availability: 'in_stock' }, {}).availability_status, 'in_stock');
  assert.equal(supabaseProduct.buildSupabaseRecord({ ...base, availability: 'متوفر' }, {}).availability_status, 'in_stock');
  assert.equal(supabaseProduct.buildSupabaseRecord({ ...base, availability: 'out_of_stock' }, {}).availability_status, 'out_of_stock');
  assert.equal(supabaseProduct.buildSupabaseRecord({ ...base, availability: 'نفد' }, {}).availability_status, 'out_of_stock');
  assert.equal(supabaseProduct.buildSupabaseRecord({ ...base, availability: 'available' }, {}).availability_status, 'in_stock');
});

test('supabase-product buildSupabaseRecord sets image_pipeline_status=pending when no image', () => {
  const parsed = { name: 'X', brand: 'Y', sourceUrl: 'https://nawadirdior.sa/x/p9', supplierProductId: '9', supplierPrice: 100 };
  const record = supabaseProduct.buildSupabaseRecord(parsed, { price: 200 });
  assert.equal(record.image_pipeline_status, 'pending');
  assert.equal(record.supplier_sku, null);
});

test('supabase-product extractShopifyFields reads calapres_sku and supplier_sku from DB row', () => {
  const dbRow = {
    id: 'uuid-abc',
    calapres_sku: 'CAL-ND-P852601829',
    supplier_sku: 'TF-OW-100',
    shopify_product_id: '9001',
    shopify_variant_id: '8001',
  };
  const fields = supabaseProduct.extractShopifyFields(dbRow);
  assert.equal(fields.calapresSku, 'CAL-ND-P852601829');
  assert.equal(fields.supplierSku, 'TF-OW-100');
  assert.equal(fields.shopifyProductId, '9001');
  assert.equal(fields.supabaseProductId, 'uuid-abc');
});

test('build-shopify-payload uses calapres_sku as Shopify variant sku in full update', () => {
  const parsed = supplier({
    sourceUrl: 'https://nawadirdior.sa/tom-ford/p852601829',
    calapresSku: 'CAL-ND-P852601829',
  });
  const payload = payloads.buildPayload(parsed);
  assert.equal(payload.product.variants[0].sku, 'CAL-ND-P852601829');
  assert.ok(payload.canCreate !== false);
});

test('build-shopify-payload does not emit sku in enriched status-only update', () => {
  const parsed = supplier({
    sourceUrl: 'https://nawadirdior.sa/tom-ford/p852601829',
    calapresSku: 'CAL-ND-P852601829',
    existingProduct: { id: '9001', tags: 'imported-nader-dior, enriched', variants: [{ id: '8001' }] },
  });
  const payload = payloads.buildPayload(parsed).product;
  assert.deepEqual(Object.keys(payload).sort(), ['id', 'status', 'variants']);
  assert.equal(payload.variants[0].sku, undefined);
});

test('build-shopify-payload stores supplier_sku as metafield, calapres_sku as variant sku', () => {
  const parsed = supplier({
    sourceUrl: 'https://nawadirdior.sa/dior-sauvage/p111',
    calapresSku: 'CAL-ND-P111',
    supplierSku: 'DS-EDP-100',
  });
  const payload = payloads.buildPayload(parsed);
  const variant = payload.product.variants[0];
  const mfs = payload.product.metafields || [];

  // Shopify variant SKU = calapres_sku
  assert.equal(variant.sku, 'CAL-ND-P111');

  // supplier_sku stored as metafield, never as variant.sku
  const skuMetafield = mfs.find(function(mf) { return mf.key === 'sku'; });
  assert.ok(skuMetafield, 'supplier.sku metafield must be present');
  assert.equal(skuMetafield.namespace, 'supplier');
  assert.equal(skuMetafield.value, 'DS-EDP-100');

  // supplier_sku is NOT in variant fields
  assert.equal(variant.sku, 'CAL-ND-P111');  // only calapres_sku
});

test('single product end-to-end: parse → Supabase record → Shopify payload', () => {
  // Simulate one product flowing through the full data lake pipeline
  const rawParsed = {
    name: 'Tom Ford Oud Wood EDP 100ml',
    brand: 'Tom Ford',
    category: 'Niche',
    concentration: 'EDP',
    gender: 'unisex',
    sizeMl: 100,
    supplierPrice: 805,
    supplierCompareAtPrice: null,
    availability: 'in_stock',
    imageUrl: 'https://cdn.salla.sa/original.jpg',
    sourceUrl: 'https://nawadirdior.sa/tom-ford-oud-wood/p852601829',
    supplierProductId: '852601829',
    supplierSku: 'TF-OW-100',
    description: 'A woody fragrance.',
    canCreate: true,
  };

  // Step 1: Apply pricing (pricing.js)
  const priced = pricing.applyPricing(rawParsed);
  assert.equal(priced.price, 905);
  assert.equal(priced.compareAtPrice, null);

  // Step 2: Build Supabase record (supabase-product.js)
  const record = supabaseProduct.buildSupabaseRecord(rawParsed, priced);
  assert.equal(record.supplier_product_id, '852601829');
  assert.equal(record.supplier_sku, 'TF-OW-100');
  assert.equal(record.selling_price, 905);
  assert.equal(record.profit_margin_sar, 100);
  assert.equal(record.availability_status, 'in_stock');
  assert.equal(record.image_pipeline_status, 'source_saved');

  // Step 3: Simulate DB-generated calapres_sku (trigger runs on INSERT)
  const calapresSku = supabaseProduct.generateCalapresSku('ND', record.supplier_product_id);
  assert.equal(calapresSku, 'CAL-ND-P852601829');

  // Step 4: Build Shopify payload using calapres_sku (build-shopify-payload.js)
  const shopifyPayload = payloads.buildPayload({
    ...rawParsed,
    ...priced,
    calapresSku,
    supplierSku: rawParsed.supplierSku,
  });
  const product = shopifyPayload.product;
  const variant = product.variants[0];

  // Variant SKU = calapres_sku (not supplier_sku)
  assert.equal(variant.sku, 'CAL-ND-P852601829');
  assert.equal(variant.price, '905');

  // supplier_sku stored as metafield
  const skuMf = product.metafields.find(function(mf) { return mf.key === 'sku'; });
  assert.equal(skuMf.value, 'TF-OW-100');

  // supplier_product_id stored as metafield
  const idMf = product.metafields.find(function(mf) { return mf.key === 'product_id'; });
  assert.equal(idMf.value, '852601829');

  // product title and brand set
  assert.equal(product.title, 'Tom Ford Oud Wood EDP 100ml');
  assert.equal(product.vendor, 'Tom Ford');

  // Image media row for product_media table
  const mediaRow = supabaseProduct.buildProductMediaRow('uuid-xyz', rawParsed.imageUrl);
  assert.equal(mediaRow.original_url, 'https://cdn.salla.sa/original.jpg');
  assert.equal(mediaRow.source, 'supplier');
  assert.equal(mediaRow.is_primary, true);
  assert.equal(mediaRow.uploaded_to_shopify, false);
});

test('config exposes SUPABASE_URL, SUPABASE_REST, and SUPPLIER_CODES', () => {
  assert.equal(configModule.SUPABASE_PROJECT_REF, 'pbiiqlpgchrcgagemclt');
  assert.equal(configModule.SUPABASE_URL, 'https://pbiiqlpgchrcgagemclt.supabase.co');
  assert.equal(configModule.SUPABASE_REST, 'https://pbiiqlpgchrcgagemclt.supabase.co/rest/v1');
  assert.equal(configModule.SUPPLIER_CODES.nawadirdior, 'ND');
  assert.equal(configModule.METAFIELDS.supplierSku, 'sku');
  assert.equal(configModule.CREDENTIALS.supabaseServiceRole.name, 'Supabase Calapres Service Role');
});

test('supabase-product builds Shopify payload from Supabase row using calapres_sku only', () => {
  const row = {
    id: 'uuid-product',
    supplier_name: 'nawadirdior',
    supplier_product_id: '852601829',
    supplier_sku: 'SUP-852',
    supplier_source_url: 'https://nawadirdior.sa/tom-ford/p852601829',
    calapres_sku: 'CAL-ND-P852601829',
    product_title_ar: 'Tom Ford Oud Wood EDP 100ml',
    product_description_ar: 'A woody fragrance.',
    brand_name: 'Tom Ford',
    supplier_price: 805,
    supplier_original_price: null,
    selling_price: 905,
    compare_at_price: null,
    availability_status: 'in_stock'
  };
  const payload = supabaseProduct.buildShopifyPayloadFromSupabaseRecord(row);
  assert.equal(payload.product.variants[0].sku, 'CAL-ND-P852601829');
  assert.equal(payload.product.variants[0].price, '905');
  assert.equal(payload.product.vendor, 'Tom Ford');
  assert.equal(payload.product.metafields.find((field) => field.key === 'sku').value, 'SUP-852');
  assert.notEqual(payload.product.variants[0].sku, 'SUP-852');
});

test('supabase-product creates media rows without triggering Higgsfield generation', () => {
  const rows = supabaseProduct.buildProductMediaRows('uuid-product', {
    imageUrl: 'https://cdn.salla.sa/main.jpg',
    images: ['https://cdn.salla.sa/second.jpg']
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].source, 'supplier');
  assert.equal(rows[0].is_primary, true);
  assert.equal(rows[0].uploaded_to_shopify, false);
  assert.equal(rows[0].upload_status, 'pending');
  assert.equal(Object.prototype.hasOwnProperty.call(rows[0], 'higgsfield_request_id'), false);
});

test('supabase-product filters existing supplier media rows before n8n insert', () => {
  const rows = supabaseProduct.buildProductMediaRows('uuid-product', {
    imageUrl: 'https://cdn.salla.sa/main.jpg',
    images: ['https://cdn.salla.sa/second.jpg']
  });
  const lookupPath = supabaseProduct.buildProductMediaLookupPath('uuid-product');
  assert.equal(
    lookupPath,
    '/product_media?select=id,original_url&supplier_product_id=eq.uuid-product&source=eq.supplier'
  );

  const missing = supabaseProduct.filterMissingProductMediaRows(rows, [
    { id: 'existing-media', original_url: 'https://cdn.salla.sa/main.jpg' }
  ]);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].original_url, 'https://cdn.salla.sa/second.jpg');
});

test('supabase-product builds post-Shopify Supabase mapping payloads', () => {
  const sync = supabaseProduct.buildShopifySyncPayload(
    {
      id: '32f2f461-dc25-4507-a71a-9c7550453455',
      shopify_product_id: null,
      shopify_variant_id: null,
      shopify_handle: null
    },
    {
      product: {
        id: 1234567890,
        handle: 'tom-ford-oud-wood',
        status: 'draft',
        variants: [{ id: 9876543210 }]
      }
    },
    {
      existingTags: ['imported-nader-dior']
    }
  );

  assert.equal(sync.supplierProductPatch.shopify_product_id, '1234567890');
  assert.equal(sync.supplierProductPatch.shopify_variant_id, '9876543210');
  assert.equal(sync.supplierProductPatch.shopify_handle, 'tom-ford-oud-wood');
  assert.equal(sync.supplierProductPatch.shopify_sync_status, 'synced');
  assert.equal(Object.prototype.hasOwnProperty.call(sync.supplierProductPatch, 'raw_payload'), false);
  assert.equal(sync.shopifyProductUpsertBody.supplier_product_id, '32f2f461-dc25-4507-a71a-9c7550453455');
  assert.equal(sync.shopifyProductUpsertBody.shopify_status, 'draft');
  assert.equal(sync.shopifyProductUpsertBody.is_enriched, false);
  assert.equal(sync.shopifyProductUpsertBody.sync_status, 'synced');
});

test('supabase-product builds sync_errors rows for n8n error logging', () => {
  const row = supabaseProduct.buildSyncErrorRow(new Error('Parse failed'), {
    syncRunId: 'run-1',
    supabaseProductId: 'product-1',
    sourceUrl: 'https://nawadirdior.sa/x/p1',
    errorType: 'parse_error',
    rawPayload: { sourceUrl: 'https://nawadirdior.sa/x/p1' }
  });
  assert.equal(row.sync_run_id, 'run-1');
  assert.equal(row.supplier_product_id, 'product-1');
  assert.equal(row.error_type, 'parse_error');
  assert.equal(row.error_message, 'Parse failed');
});

test('seed-creative-briefs builds brief from Shopify product with oud theme detection', () => {
  const product = {
    id: '9001',
    title: 'Arabian Oud Tribute 100ml',
    vendor: 'Arabian Oud',
    tags: ['imported-nader-dior', 'eastern-oud-incense'],
    images: [{ src: 'https://cdn.shopify.com/original.jpg' }],
  };
  const brief = seedBriefs.buildBriefFromShopifyProduct(product);
  assert.equal(brief.shopify_product_id, '9001');
  assert.equal(brief.brand_name, 'Arabian Oud');
  assert.equal(brief.reference_image_url, 'https://cdn.shopify.com/original.jpg');
  assert.equal(brief.needs_product_images, true);
  assert.equal(brief.product_image_status, 'pending');
  assert.equal(brief.collection_theme, 'oud');
});

async function main() {
  let passed = 0;
  const failures = [];
  const rows = [];
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      rows.push({ result: 'PASS', name });
    } catch (error) {
      failures.push({ name, error });
      rows.push({ result: 'FAIL', name, error });
    }
  }

  const resultWidth = 6;
  console.log('Result | Test');
  console.log('-------|-----');
  for (const row of rows) {
    console.log(row.result.padEnd(resultWidth) + ' | ' + row.name);
    if (row.error) console.error(row.error && row.error.stack ? row.error.stack : String(row.error));
  }
  console.log('');
  console.log('Summary: ' + passed + '/' + tests.length + ' tests passed; ' + assertionCount + ' assertions');
  if (failures.length) {
    process.exitCode = 1;
  }
}

main();
