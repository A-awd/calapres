import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Offline first-20 pipeline preview: fixtures in, reconcile plan and Shopify request shapes out.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');
const outputPath = path.join(__dirname, 'dry-run-output.json');
const defaultLimit = 20;

function loadSyncModule(fileName) {
  const filePath = path.join(__dirname, fileName);
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = {
    module: { exports: {} },
    exports: {},
    URL,
    console,
    fetch: async () => {
      throw new Error('Live fetch is disabled in the default dry run.');
    }
  };
  vm.runInNewContext(code, sandbox, { filename: filePath, timeout: 1000 });
  return sandbox.module.exports;
}

const crawl = loadSyncModule('crawl-supplier.js');
const parser = loadSyncModule('parse-product.js');
const pricing = loadSyncModule('pricing.js');
const inventory = loadSyncModule('inventory.js');
const payloads = loadSyncModule('build-shopify-payload.js');
const reconcileModule = loadSyncModule('reconcile.js');
const shopifyClient = loadSyncModule('shopify-client.js');
const shapeValidator = loadSyncModule('validate-shopify-shape.js');
const setupDefinitions = loadSyncModule('setup-metafield-definitions.js');
const backfillModule = loadSyncModule('backfill-existing-products.js');

function readFixture(fileName) {
  return fs.readFileSync(path.join(fixturesDir, fileName), 'utf8');
}

async function crawlOfflineProducts() {
  const sitemapIndex = readFixture('sitemap-index.xml');
  const productSitemap = readFixture('sitemap-products.xml');
  const fetchText = async (url) => {
    if (String(url).endsWith('/sitemap.xml')) return sitemapIndex;
    if (String(url).endsWith('/sitemap-2.xml')) return productSitemap;
    return '<urlset></urlset>';
  };
  return crawl.crawlSupplierProducts({ fetchText });
}

function readDryRunManifest() {
  const manifestPath = path.join(fixturesDir, 'dry-run-manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function readBackfillMap() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'backfill-map.json'), 'utf8'));
}

function readCachedProductHtml(sourceUrl) {
  const manifest = readDryRunManifest();
  const entry = manifest.find((item) => item.sourceUrl === sourceUrl);
  if (!entry) {
    throw new Error('Missing dry-run HTML fixture for ' + sourceUrl);
  }
  return {
    html: readFixture(entry.file),
    finalUrl: entry.finalUrl,
    httpStatus: entry.status
  };
}

function productMatchesSource(parsed, sourceUrl) {
  const expected = crawl.productIdFromUrl(sourceUrl);
  const actual = crawl.productIdFromUrl(parsed && parsed.sourceUrl);
  return Boolean(expected && actual && expected === actual && parsed.supplierPrice !== null);
}

function normalizeForPayload(parsed, sourceUrl) {
  if (productMatchesSource(parsed, sourceUrl)) {
    return { ...parsed, sourceUrl };
  }
  return {
    name: '',
    brand: '',
    supplierPrice: null,
    supplierCompareAtPrice: null,
    availability: 'missing',
    imageUrl: null,
    description: '',
    category: '',
    sourceUrl
  };
}

async function runDryRun(options = {}) {
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : defaultLimit;
  const shopDomain = options.shopDomain || process.env.SHOPIFY_SHOP_DOMAIN || 'calapres.myshopify.com';
  const urls = (await crawlOfflineProducts()).slice(0, limit);
  const entries = [];
  const supplierProducts = [];

  for (let index = 0; index < urls.length; index += 1) {
    const sourceUrl = urls[index];
    const fixture = readCachedProductHtml(sourceUrl);
    const parsed = parser.parseProduct(fixture.html);
    const normalized = normalizeForPayload(parsed, sourceUrl);
    const isMissing = normalized.availability === 'missing';
    const priced = pricing.applyPricing(normalized);
    const mappedInventory = inventory.mapAvailability(normalized.availability);
    const payload = payloads.buildPayload(normalized);
    supplierProducts.push(normalized);

    entries.push({
      index: index + 1,
      sourceUrl,
      productId: crawl.productIdFromUrl(sourceUrl),
      fixture: {
        httpStatus: fixture.httpStatus,
        finalUrl: fixture.finalUrl
      },
      action: isMissing ? 'skip_missing_supplier_page' : 'create_or_update',
      parsed: normalized,
      pricing: priced,
      inventory: mappedInventory,
      payload,
      lookupRequest: shopifyClient.buildLookupProductRequest({ shopDomain, sourceUrl })
    });
  }

  const syntheticShopifyProducts = buildSyntheticShopifyProducts(supplierProducts);
  const reconcilePlan = reconcileModule.reconcile(supplierProducts, syntheticShopifyProducts);
  const actionRequests = buildActionRequests(reconcilePlan, shopDomain);
  const actionIndex = indexActions(reconcilePlan);
  const backfillMap = readBackfillMap();
  const backfillSupplierProducts = buildSupplierProductsFromBackfillMap(backfillMap);
  const existingImportedProductsNeedingBackfill = buildExistingImportedProductsFromBackfillMap(backfillMap);
  const backfillPlan = backfillModule.planBackfillExistingProducts(
    existingImportedProductsNeedingBackfill,
    backfillMap,
    { shopDomain }
  );
  const duplicateRiskBeforeBackfill = reconcileModule.reconcile(
    backfillSupplierProducts,
    existingImportedProductsNeedingBackfill
  );
  const postBackfillShopifyProducts = applyBackfillPlanForDryRun(existingImportedProductsNeedingBackfill, backfillPlan);
  const postBackfillReconcilePlan = reconcileModule.reconcile(backfillSupplierProducts, postBackfillShopifyProducts);

  for (const entry of entries) {
    const action = actionIndex[entry.sourceUrl] || actionIndex[entry.productId] || null;
    entry.reconcile = action
      ? {
          bucket: action.bucket,
          reason: action.reason,
          updateMode: action.updateMode || null
        }
      : {
          bucket: 'unchanged',
          reason: 'not_in_reconcile_action_index',
          updateMode: null
        };
  }

  const output = {
    mode: 'offline-fixtures',
    shopDomain,
    productLimit: limit,
    generatedPayloads: entries.length,
    missingSupplierPages: entries.filter((entry) => entry.action === 'skip_missing_supplier_page').length,
    preSyncSetup: {
      metafieldDefinitionRequests: setupDefinitions.buildSupplierMetafieldDefinitionRequests({ shopDomain }),
      backfillMap,
      backfillMapSummary: summarizeBackfillMap(backfillMap),
      existingImportedProductsNeedingBackfill,
      backfillPlan,
      needsManualMatch: backfillPlan.needsManualMatch,
      notFoundAtSupplier: backfillPlan.notFoundAtSupplier,
      duplicateRiskBeforeBackfill: summarizePlan(duplicateRiskBeforeBackfill),
      postBackfillReconcilePlan: summarizePlan(postBackfillReconcilePlan)
    },
    reconcilePlan: summarizePlan(reconcilePlan),
    syntheticShopifyProducts,
    shopifyRequests: {
      lookupFirst20: entries.map((entry) => entry.lookupRequest),
      listImportedFirstPage: shopifyClient.buildListImportedProductsRequest({ shopDomain, first: 250 }),
      actionRequests
    },
    payloads: entries
  };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
  return output;
}

function buildSyntheticShopifyProducts(supplierProducts) {
  const valid = supplierProducts.filter((item) => item.sourceUrl && item.supplierPrice !== null && item.availability !== 'missing');
  const products = [];
  if (valid[0]) {
    products.push(productFromSupplier(valid[0], 9001, 8001, { price: '1', status: 'draft', inventory_policy: 'deny' }));
  }
  if (valid[1]) {
    products.push(productFromSupplier(valid[1], 9002, 8002, { extraTags: ['enriched'] }));
  }
  if (valid[2]) {
    products.push(productFromSupplier(valid[2], 9003, 8003, { extraTags: ['enriched'], price: '1' }));
  }
  if (valid[3]) {
    products.push(productFromSupplier(valid[3], 9004, 8004));
  }
  products.push(
    productFromSupplier(
      {
        name: 'Missing Active',
        brand: 'Maison Missing',
        supplierPrice: 210,
        supplierCompareAtPrice: null,
        availability: 'in_stock',
        sourceUrl: 'https://nawadirdior.sa/missing-active/p990001'
      },
      990001,
      980001
    )
  );
  products.push(
    productFromSupplier(
      {
        name: 'Missing Draft',
        brand: 'Maison Missing',
        supplierPrice: 210,
        supplierCompareAtPrice: null,
        availability: 'out_of_stock',
        sourceUrl: 'https://nawadirdior.sa/missing-draft/p990002'
      },
      990002,
      980002
    )
  );
  return products;
}

function buildExistingImportedProductsFromBackfillMap(backfillMap) {
  return backfillMap.map((entry, index) => {
    const tags =
      index < 11
        ? [backfillModule.CANONICAL_IMPORTED_TAG]
        : [backfillModule.ARABIC_IMPORTED_TAG];
    return {
      id: String(entry.shopifyLegacyId),
      title: entry.title,
      vendor: entry.brand,
      status: 'active',
      tags,
      metafields: [],
      variants: [
        {
          id: String(810000 + index),
          price: null,
          compare_at_price: null,
          inventory_policy: 'continue'
        }
      ]
    };
  });
}

function buildSupplierProductsFromBackfillMap(backfillMap) {
  return backfillMap
    .filter((entry) => (entry.confidence === 'high' || entry.confidence === 'medium') && entry.matchedSourceUrl)
    .map((entry) => ({
      name: entry.title,
      brand: entry.brand,
      supplierPrice: 100,
      supplierCompareAtPrice: null,
      availability: 'in_stock',
      sourceUrl: entry.matchedSourceUrl,
      supplierId: String(entry.supplierProductId || '').replace(/^p/i, '').replace(/\D/g, '')
    }));
}

function applyBackfillPlanForDryRun(existingProducts, backfillPlan) {
  const byId = {};
  for (const action of backfillPlan.toBackfill) byId[String(action.productId)] = action;
  return existingProducts.map((product) => {
    const action = byId[String(product.id)];
    if (!action) return product;
    return {
      ...product,
      tags: uniqueTags(normalizeTags(product.tags).concat(action.addedTags)),
      sourceUrl: action.sourceUrl,
      supplierId: action.supplierId,
      metafields: [
        { namespace: 'supplier', key: 'source_url', value: action.sourceUrl, type: 'single_line_text_field' },
        { namespace: 'supplier', key: 'product_id', value: action.supplierId, type: 'single_line_text_field' }
      ]
    };
  });
}

function productFromSupplier(supplierProduct, productId, variantId, overrides = {}) {
  const payload = payloads.buildPayload(supplierProduct).product;
  const variant = payload.variants && payload.variants[0] ? payload.variants[0] : {};
  const tags = normalizeTags(payload.tags).concat(overrides.extraTags || []);
  return {
    id: String(productId),
    title: payload.title || supplierProduct.name || '',
    vendor: payload.vendor || supplierProduct.brand || '',
    status: overrides.status || payload.status || 'active',
    tags: uniqueTags(tags),
    sourceUrl: supplierProduct.sourceUrl,
    metafields: payload.metafields || [
      { namespace: 'supplier', key: 'source_url', value: supplierProduct.sourceUrl, type: 'single_line_text_field' },
      { namespace: 'supplier', key: 'product_id', value: crawl.productIdFromUrl(supplierProduct.sourceUrl), type: 'single_line_text_field' }
    ],
    variants: [
      {
        id: String(variantId),
        price: overrides.price || variant.price,
        compare_at_price:
          overrides.compare_at_price !== undefined ? overrides.compare_at_price : variant.compare_at_price || null,
        inventory_policy: overrides.inventory_policy || variant.inventory_policy || 'continue'
      }
    ]
  };
}

function buildActionRequests(plan, shopDomain) {
  return {
    toCreate: plan.toCreate.map((entry) => {
      const payload = payloads.buildPayload(entry.supplierProduct);
      shapeValidator.assertValidShopifyProductShape(payload);
      return {
        reason: entry.reason,
        sourceUrl: entry.supplierProduct.sourceUrl,
        request: shopifyClient.buildCreateProductRequest({ shopDomain, payload })
      };
    }),
    toUpdate: plan.toUpdate.map((entry) => {
      const payload = payloads.buildPayload({
        ...entry.supplierProduct,
        existingProduct: entry.shopifyProduct
      });
      const mode = entry.updateMode === 'price_availability_only' ? 'price_availability_only' : 'full_product';
      shapeValidator.assertValidShopifyProductShape(payload, mode === 'price_availability_only' ? { mode } : {});
      const request =
        mode === 'price_availability_only'
          ? shopifyClient.buildUpdatePriceAvailabilityRequest({ shopDomain, product: payload.product })
          : shopifyClient.buildUpdateProductRequest({ shopDomain, payload });
      return {
        reason: entry.reason,
        updateMode: mode,
        sourceUrl: entry.supplierProduct.sourceUrl,
        request
      };
    }),
    toMarkOutOfStock: plan.toMarkOutOfStock.map((entry) => {
      const payload = payloads.buildPayload({
        availability: 'missing',
        existingProduct: entry.shopifyProduct
      });
      shapeValidator.assertValidShopifyProductShape(payload, { mode: 'price_availability_only' });
      return {
        reason: entry.reason,
        sourceUrl: entry.shopifyProduct.sourceUrl,
        request: shopifyClient.buildUpdatePriceAvailabilityRequest({ shopDomain, product: payload.product })
      };
    }),
    toSkipEnriched: plan.toSkipEnriched.map((entry) => ({
      reason: entry.reason,
      sourceUrl: entry.supplierProduct.sourceUrl,
      request: null
    }))
  };
}

function indexActions(plan) {
  const out = {};
  for (const bucket of ['toCreate', 'toUpdate', 'toMarkOutOfStock', 'toSkipEnriched', 'unchanged']) {
    for (const action of plan[bucket]) {
      const sourceUrl =
        (action.supplierProduct && action.supplierProduct.sourceUrl) ||
        (action.shopifyProduct && action.shopifyProduct.sourceUrl);
      const id =
        (action.supplierProduct && action.supplierProduct.supplierId) ||
        (action.shopifyProduct && action.shopifyProduct.supplierId);
      const record = {
        bucket,
        reason: action.reason,
        updateMode: action.updateMode || null
      };
      if (sourceUrl) out[sourceUrl] = record;
      if (id) out[id] = record;
    }
  }
  return out;
}

function summarizeBackfillMap(backfillMap) {
  const counts = { high: 0, medium: 0, low: 0, not_found: 0 };
  const products = backfillMap.map((entry) => {
    counts[entry.confidence] = (counts[entry.confidence] || 0) + 1;
    return {
      shopifyLegacyId: entry.shopifyLegacyId,
      title: entry.title,
      supplierProductId: entry.supplierProductId,
      confidence: entry.confidence
    };
  });
  return {
    total: backfillMap.length,
    counts,
    products
  };
}

function summarizePlan(plan) {
  return {
    toCreate: plan.toCreate.length,
    toUpdate: plan.toUpdate.length,
    toMarkOutOfStock: plan.toMarkOutOfStock.length,
    toSkipEnriched: plan.toSkipEnriched.length,
    unchanged: plan.unchanged.length,
    actions: plan
  };
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function uniqueTags(tags) {
  const seen = {};
  const out = [];
  for (const tag of normalizeTags(tags)) {
    const key = tag.toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(tag);
    }
  }
  return out;
}

function handleFromSourceUrl(sourceUrl) {
  try {
    const parsed = new URL(String(sourceUrl || ''));
    const parts = parsed.pathname.split('/').filter(Boolean);
    const productIndex = parts.findIndex((part) => /^p\d+$/i.test(part));
    return productIndex > 0 ? parts[productIndex - 1] : parts[0] || '';
  } catch (error) {
    const match = String(sourceUrl || '').match(/\/([^/?#]+)\/p\d+(?=$|[/?#])/i);
    return match ? match[1] : '';
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  runDryRun({ limit: process.env.CALAPRES_DRY_RUN_LIMIT || defaultLimit })
    .then((output) => {
      console.log('Dry run wrote ' + output.generatedPayloads + ' payloads to ' + path.relative(process.cwd(), outputPath));
      console.log('Missing supplier pages skipped: ' + output.missingSupplierPages);
      console.log('Reconcile plan: ' + JSON.stringify({
        create: output.reconcilePlan.toCreate,
        update: output.reconcilePlan.toUpdate,
        outOfStock: output.reconcilePlan.toMarkOutOfStock,
        skipEnriched: output.reconcilePlan.toSkipEnriched,
        unchanged: output.reconcilePlan.unchanged
      }));
      console.log('Backfill plan: ' + JSON.stringify(output.preSyncSetup.backfillPlan.summary));
      console.log('Backfill needsManualMatch: ' + output.preSyncSetup.needsManualMatch.length);
      console.log('Backfill notFoundAtSupplier: ' + output.preSyncSetup.notFoundAtSupplier.length);
    })
    .catch((error) => {
      console.error(error && error.stack ? error.stack : String(error));
      process.exitCode = 1;
    });
}

export { runDryRun };
