import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'n8n-build');
const config = loadCommonJs('./config.js');

const modules = [
  './config.js',
  './crawl-supplier.js',
  './parse-product.js',
  './pricing.js',
  './inventory.js',
  './build-shopify-payload.js',
  './shopify-client.js',
  './reconcile.js',
  './validate-shopify-shape.js',
  './sync-state.js',
  './normalize.js',
  './categorize.js',
  './enrich/prompt.js',
  './enrich/seo.js',
  './enrich/build-enrich-payload.js',
  './report.js'
];

const nodes = [
  {
    file: 'crawl.generated.js',
    name: 'Crawl Supplier URLs',
    mode: 'runOnceForAllItems',
    glue: `
const config = __require('./config.js');
const crawl = __require('./crawl-supplier.js');
const state = __require('./sync-state.js');
async function main() {
  const offset = Number($vars?.CALAPRES_SYNC_OFFSET || $env?.CALAPRES_SYNC_OFFSET || 0);
  const urls = await crawl.crawlSupplierProducts({ sitemapUrl: config.SUPPLIER_SITEMAP });
  const chunk = state.computeChunk(urls, offset, config.CHUNK_SIZE);
  return chunk.chunk.map((sourceUrl) => ({ json: {
    sourceUrl,
    supplierProductId: crawl.productIdFromUrl(sourceUrl),
    offset: chunk.offset,
    nextOffset: chunk.nextOffset,
    wrapped: chunk.wrapped,
    totalProducts: chunk.total,
    seenInCurrentCrawl: true
  }}));
}`
  },
  {
    file: 'parse.generated.js',
    name: 'Code: parseProduct',
    mode: 'runOnceForEachItem',
    glue: `
const parser = __require('./parse-product.js');
async function main() {
  const html = $json.body || $json.data || $json.html || '';
  const parsed = parser.parseProduct(String(html), {
    sourceUrl: $json.sourceUrl,
    supplierProductId: $json.supplierProductId
  });
  return { json: { ...$json, parsed } };
}`
  },
  {
    file: 'pricing.generated.js',
    name: 'Code: applyPricing',
    mode: 'runOnceForEachItem',
    glue: `
const pricing = __require('./pricing.js');
async function main() {
  const priced = pricing.applyPricing($json.parsed);
  return { json: { ...$json, parsed: { ...$json.parsed, price: priced.price, compareAtPrice: priced.compareAtPrice } } };
}`
  },
  {
    file: 'availability.generated.js',
    name: 'Code: mapAvailability',
    mode: 'runOnceForEachItem',
    glue: `
const inventory = __require('./inventory.js');
async function main() {
  const mapped = inventory.mapAvailability($json.parsed && $json.parsed.availability);
  return { json: { ...$json, parsed: { ...$json.parsed, inventory: mapped } } };
}`
  },
  {
    file: 'buildLookup.generated.js',
    name: 'Code: Build Shopify Lookup',
    mode: 'runOnceForEachItem',
    glue: `
const shopify = __require('./shopify-client.js');
async function main() {
  const sourceUrl = $json.sourceUrl || ($json.parsed && $json.parsed.sourceUrl);
  const supplierId = $json.supplierProductId || ($json.parsed && $json.parsed.supplierProductId) || shopify.productIdFromUrl(sourceUrl);
  const request = shopify.buildLookupProductRequest({ shopDomain: $env?.SHOPIFY_STORE_DOMAIN, sourceUrl, supplierId, apiVersion: $env?.SHOPIFY_API_VERSION });
  return { json: { ...$json, lookupRequest: request, lookup: { sourceUrl, supplierId } } };
}`
  },
  {
    file: 'selectExisting.generated.js',
    name: 'Code: Select Existing Product',
    mode: 'runOnceForEachItem',
    glue: `
const shopify = __require('./shopify-client.js');
async function main() {
  const criteria = $node['Code: Build Shopify Lookup']?.json?.lookup || $json.lookup || {};
  const existingProduct = shopify.selectLookupProduct($json, criteria);
  return { json: { ...($node['Code: Build Shopify Lookup']?.json || $json), existingProduct } };
}`
  },
  {
    file: 'buildPayload.generated.js',
    name: 'Code: buildPayload',
    mode: 'runOnceForEachItem',
    glue: `
const payloads = __require('./build-shopify-payload.js');
const validator = __require('./validate-shopify-shape.js');
async function main() {
  const payload = payloads.buildPayload({ ...$json.parsed, existingProduct: $json.existingProduct, existingTags: $json.existingProduct?.tags || [] });
  if (payload.skipped) return { json: { ...$json, payload, skipWrite: true, reason: payload.reason } };
  validator.assertValidShopifyProductShape(payload, $json.existingProduct?.tags?.includes('enriched') ? { mode: 'price_availability_only' } : {});
  return { json: { ...$json, payload, productId: payload.product.id || null } };
}`
  },
  {
    file: 'findMissing.generated.js',
    name: 'Code: Find Missing Supplier Products',
    mode: 'runOnceForAllItems',
    glue: `
async function main() {
  const crawlItems = $items('Crawl Supplier URLs');
  const seen = {};
  for (const item of crawlItems) if (item.json.sourceUrl) seen[item.json.sourceUrl] = true;
  const imported = $json.data?.products?.nodes || [];
  return imported.filter((product) => product.metafield?.value && !seen[product.metafield.value]).map((product) => ({ json: {
    parsed: { sourceUrl: product.metafield.value, supplierPrice: null, supplierCompareAtPrice: null, availability: 'missing' },
    existingProduct: { id: product.legacyResourceId || product.id, graphqlId: product.id, title: product.title, tags: product.tags || [], variants: (product.variants?.nodes || []).map((variant) => ({ id: variant.legacyResourceId || variant.id, graphqlId: variant.id })) }
  }}));
}`
  },
  {
    file: 'buildMissing.generated.js',
    name: 'Code: buildPayload Missing',
    mode: 'runOnceForEachItem',
    glue: `
const payloads = __require('./build-shopify-payload.js');
const validator = __require('./validate-shopify-shape.js');
async function main() {
  const payload = payloads.buildPayload({ ...$json.parsed, existingProduct: $json.existingProduct, existingTags: $json.existingProduct?.tags || [] });
  validator.assertValidShopifyProductShape(payload, { mode: 'price_availability_only' });
  return { json: { ...$json, payload, productId: payload.product.id } };
}`
  },
  {
    file: 'enrich-prompt.generated.js',
    name: 'Code: Build Higgsfield Prompt',
    mode: 'runOnceForEachItem',
    glue: `
const prompts = __require('./enrich/prompt.js');
async function main() {
  return { json: { ...$json, higgsfieldPrompt: prompts.buildHiggsfieldPrompts($json.product || $json) } };
}`
  },
  {
    file: 'enrich-seo.generated.js',
    name: 'Code: Build Arabic SEO',
    mode: 'runOnceForEachItem',
    glue: `
const seo = __require('./enrich/seo.js');
async function main() {
  return { json: { ...$json, arabicSeo: seo.buildArabicSeo($json.product || $json) } };
}`
  },
  {
    file: 'enrich-payload.generated.js',
    name: 'Code: Build Enriched Payload',
    mode: 'runOnceForEachItem',
    glue: `
const enrich = __require('./enrich/build-enrich-payload.js');
const validator = __require('./validate-shopify-shape.js');
async function main() {
  const payload = enrich.buildEnrichPayload({ product: $json.product, generatedImages: $json.generatedImages || $json.images, productId: $json.productId });
  validator.assertValidShopifyProductShape(payload);
  return { json: { ...$json, payload, productId: payload.product.id } };
}`
  }
];

function moduleBundle() {
  const entries = modules.map((modulePath) => {
    const abs = path.join(__dirname, modulePath.replace(/^\.\//, ''));
    const code = fs.readFileSync(abs, 'utf8');
    return JSON.stringify(modulePath) + ': function(module, exports, __require) {\n' + code + '\n}';
  });
  return `
const __modules = {
${entries.join(',\n')}
};
const __cache = {};
function __require(id) {
  const normalized = normalizeModuleId(id);
  if (!__modules[normalized]) throw new Error('Unknown bundled module: ' + id);
  if (!__cache[normalized]) {
    const module = { exports: {} };
    __cache[normalized] = module;
    __modules[normalized](module, module.exports, __require);
  }
  return __cache[normalized].exports;
}
function normalizeModuleId(id) {
  const parts = [];
  for (const part of String(id).replace(/^\\.\\//, '').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return './' + parts.join('/');
}
`;
}

function writeGenerated() {
  fs.mkdirSync(outDir, { recursive: true });
  const bundle = moduleBundle();
  for (const node of nodes) {
    const content = [
      '// Generated by sync/build-n8n-nodes.js. Do not edit by hand.',
      '// n8n node: ' + node.name,
      bundle,
      node.glue.trim(),
      'await main();',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(outDir, node.file), content);
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(buildManifest(), null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'README.md'), buildReadme());
}

function buildManifest() {
  return {
    generatedAt: 'deterministic',
    apiVersionStandard: config.API_VERSION_STANDARD,
    apiVersionDeployed: config.API_VERSION_DEPLOYED,
    credentialRefs: {
      shopify: config.CREDENTIALS.shopifyOAuth2,
      higgsfield: config.CREDENTIALS.higgsfieldHeaderAuth
    },
    trigger: { type: 'schedule', everyHours: 6, timezone: 'Asia/Riyadh' },
    nodes: nodes.map((node, index) => ({ order: index + 1, name: node.name, file: node.file, mode: node.mode })),
    connectionGraph: [
      ['Schedule Trigger', 'Crawl Supplier URLs'],
      ['Crawl Supplier URLs', 'HTTP GET Supplier Product'],
      ['HTTP GET Supplier Product', 'Code: parseProduct'],
      ['Code: parseProduct', 'Code: applyPricing'],
      ['Code: applyPricing', 'Code: mapAvailability'],
      ['Code: mapAvailability', 'Code: Build Shopify Lookup'],
      ['Code: Build Shopify Lookup', 'Shopify Admin GraphQL: Lookup Existing'],
      ['Shopify Admin GraphQL: Lookup Existing', 'Code: Select Existing Product'],
      ['Code: Select Existing Product', 'Code: buildPayload'],
      ['Code: buildPayload', 'Shopify Admin REST create/update'],
      ['Shopify Admin GraphQL: List Imported Products', 'Code: Find Missing Supplier Products'],
      ['Code: Find Missing Supplier Products', 'Code: buildPayload Missing'],
      ['Code: Build Higgsfield Prompt', 'HTTP Request: Higgsfield Generate Images'],
      ['HTTP Request: Higgsfield Generate Images', 'Code: Build Arabic SEO'],
      ['Code: Build Arabic SEO', 'Code: Build Enriched Payload']
    ]
  };
}

function buildReadme() {
  return [
    '# Generated n8n Code Nodes',
    '',
    'Generated by `node sync/build-n8n-nodes.js`. Claude deploys these bundles in n8n; Codex does not deploy live workflows.',
    '',
    '| n8n node | File | Mode |',
    '| --- | --- | --- |',
    ...nodes.map((node) => '| ' + node.name + ' | `' + node.file + '` | `' + node.mode + '` |'),
    '',
    'The bundles inline `sync/` helpers, config, offset chunking, carry-through parsing, canCreate guards, enriched guard, and validation.'
  ].join('\n') + '\n';
}

function loadCommonJs(modulePath) {
  const file = path.join(__dirname, modulePath.replace(/^\.\//, ''));
  const code = fs.readFileSync(file, 'utf8');
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports }, { filename: file, timeout: 1000 });
  return module.exports;
}

writeGenerated();
