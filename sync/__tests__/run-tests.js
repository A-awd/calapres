import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Dependency-free offline test runner for every sync helper used by n8n.
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
const shopifyClient = loadSyncModule('shopify-client.js');
const reconcileModule = loadSyncModule('reconcile.js');
const shapeValidator = loadSyncModule('validate-shopify-shape.js');
const setupDefinitions = loadSyncModule('setup-metafield-definitions.js');
const backfillModule = loadSyncModule('backfill-existing-products.js');

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

test('shopify-client builds lookup GraphQL request by source_url metafield or supplier-id tag', () => {
  const sourceUrl = 'https://nawadirdior.sa/%D8%B9%D8%B7%D8%B1-test/p1625888751';
  const request = shopifyClient.buildLookupProductRequest({
    shopDomain: 'calapres.myshopify.com',
    sourceUrl,
    first: 5
  });
  assert.equal(request.method, 'POST');
  assert.equal(request.url, 'https://calapres.myshopify.com/admin/api/2026-04/graphql.json');
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
    shopDomain: 'calapres.myshopify.com',
    payload: productPayload
  });
  assert.equal(request.method, 'POST');
  assert.equal(request.url, 'https://calapres.myshopify.com/admin/api/2026-04/products.json');
  assert.equal(request.body.product.title, 'Test Perfume');
  assert.equal(request.body.product.variants[0].price, '200');
  assert.equal(request.body.product.metafields.find((field) => field.key === 'product_id').value, '777');
});

test('shopify-client builds price and availability only update request shape', () => {
  const request = shopifyClient.buildUpdatePriceAvailabilityRequest({
    shopDomain: 'calapres.myshopify.com',
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
  assert.equal(request.url, 'https://calapres.myshopify.com/admin/api/2026-04/products/123.json');
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
    shopDomain: 'calapres.myshopify.com',
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
    shopDomain: 'calapres.myshopify.com',
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
    shopDomain: 'calapres.myshopify.com',
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
  assert.ok(plan.unchanged.some((entry) => entry.reason === 'invalid_supplier_product'));
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
    shopDomain: 'calapres.myshopify.com'
  });
  assert.equal(requests.length, 2);
  const keys = requests.map((request) => request.body.variables.definition.key).sort();
  assert.deepEqual(Array.from(keys), ['product_id', 'source_url']);
  for (const request of requests) {
    const definition = request.body.variables.definition;
    assert.equal(request.method, 'POST');
    assert.equal(request.url, 'https://calapres.myshopify.com/admin/api/2026-04/graphql.json');
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

test('backfill-map contains exactly the 18 verified live products with strict low rows unwritable', () => {
  const map = JSON.parse(fs.readFileSync(path.join(syncDir, 'backfill-map.json'), 'utf8'));
  assert.equal(map.length, 18);
  assert.equal(new Set(map.map((entry) => entry.shopifyLegacyId)).size, 18);
  assert.equal(map.filter((entry) => entry.confidence === 'high').length, 14);
  assert.equal(map.filter((entry) => entry.confidence === 'medium').length, 0);
  assert.equal(map.filter((entry) => entry.confidence === 'low').length, 4);
  for (const entry of map.filter((item) => item.confidence === 'low')) {
    assert.equal(entry.matchedSourceUrl, null);
    assert.equal(entry.supplierProductId, null);
  }
  const polo = map.find((entry) => entry.title.includes('Polo 67'));
  assert.equal(polo.supplierProductId, 'p278426097');
  assert.equal(polo.confidence, 'high');
});

test('backfill-existing-products uses high and medium map entries and buckets low entries for manual match', () => {
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
    }
  ];
  const existing = [
    { id: '1001', title: 'High Product', tags: ['imported-nader-dior', 'legacy'], metafields: [] },
    { id: '1002', title: 'Medium Product', tags: ['مستورد-نوادر-ديور', 'luxury'], metafields: [] },
    { id: '1003', title: 'Low Product', tags: ['imported-nader-dior'], metafields: [] }
  ];
  const plan = backfillModule.planBackfillExistingProducts(existing, testMap, {
    shopDomain: 'calapres.myshopify.com'
  });
  assert.equal(plan.summary.highConfidence, 1);
  assert.equal(plan.summary.mediumConfidence, 1);
  assert.equal(plan.summary.lowConfidence, 1);
  assert.equal(plan.toBackfill.length, 2);
  assert.equal(plan.needsManualMatch.length, 1);
  assert.equal(plan.needsManualMatch[0].shopifyLegacyId, '1003');

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
  assert.equal(plan.toBackfill.length, 14);
  assert.equal(plan.needsManualMatch.length, 4);
  assert.equal(plan.toBackfill.filter((action) => action.addedTags.includes('imported-nader-dior')).length, 6);
  for (const action of plan.toBackfill.filter((item) => Number(item.shopifyLegacyId) >= 9468843819264)) {
    assert.ok(action.requests.tagUpdate.body.product.tags.includes('مستورد-نوادر-ديور'));
  }
  const supplierProducts = map
    .filter((entry) => entry.confidence !== 'low')
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
  console.log('Summary: ' + passed + '/' + tests.length + ' tests passed');
  if (failures.length) {
    process.exitCode = 1;
  }
}

main();
