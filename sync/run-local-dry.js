import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

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
  const urls = (await crawlOfflineProducts()).slice(0, limit);
  const entries = [];

  for (let index = 0; index < urls.length; index += 1) {
    const sourceUrl = urls[index];
    const fixture = readCachedProductHtml(sourceUrl);
    const parsed = parser.parseProduct(fixture.html);
    const normalized = normalizeForPayload(parsed, sourceUrl);
    const isMissing = normalized.availability === 'missing';
    const priced = pricing.applyPricing(normalized);
    const mappedInventory = inventory.mapAvailability(normalized.availability);
    const payload = payloads.buildPayload(normalized);

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
      payload
    });
  }

  const output = {
    mode: 'offline-fixtures',
    productLimit: limit,
    generatedPayloads: entries.length,
    missingSupplierPages: entries.filter((entry) => entry.action === 'skip_missing_supplier_page').length,
    payloads: entries
  };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
  return output;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  runDryRun({ limit: process.env.CALAPRES_DRY_RUN_LIMIT || defaultLimit })
    .then((output) => {
      console.log('Dry run wrote ' + output.generatedPayloads + ' payloads to ' + path.relative(process.cwd(), outputPath));
      console.log('Missing supplier pages skipped: ' + output.missingSupplierPages);
    })
    .catch((error) => {
      console.error(error && error.stack ? error.stack : String(error));
      process.exitCode = 1;
    });
}

export { runDryRun };
