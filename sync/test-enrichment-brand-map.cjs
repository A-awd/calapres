const fs = require('fs');
const path = require('path');
const vm = require('vm');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'nawadir-title-fixtures.json'), 'utf8'));

const ROOT = path.resolve(__dirname, '..');
const CURRENT_NEEDS_REVIEW = 30;
const normalize = loadCommonJs(path.join(__dirname, 'normalize.js'));
const matcher = loadCommonJs(path.join(__dirname, 'match-fragrance.js'), {
  './normalize.js': normalize
});

const LEGACY_BRAND_MAP = {
  'ديور': 'Dior',
  'ديور سوفاج': 'Dior',
  'توم فورد': 'Tom Ford',
  'تومفورد': 'Tom Ford',
  'شانيل': 'Chanel',
  'نيشان': 'Nishane',
  'جيرلان': 'Guerlain',
  'زيرجوف': 'Xerjoff',
  'اكوا دي بارما': 'Acqua di Parma',
  'جان بول غوتييه': 'Jean Paul Gaultier',
  'فان كليف': 'Van Cleef & Arpels',
  'ماتيري بريميير': 'Matiere Premiere',
  'ماتيير بريميير': 'Matiere Premiere',
  'عبد الصمد القرشي': 'Abdul Samad Al Qurashi',
  'العربية للعود': 'Arabian Oud'
};

const LEGACY_BRAND_ALIASES = {
  'matiere premiere': 'Matiere Premiere',
  'matière première': 'Matiere Premiere',
  'van cleef and arpels': 'Van Cleef & Arpels',
  'van cleef & arpels': 'Van Cleef & Arpels',
  'j p g': 'Jean Paul Gaultier',
  'j.p.g': 'Jean Paul Gaultier',
  'tomford': 'Tom Ford'
};

function legacyNormalizeBrand(value) {
  const cleaned = normalize.cleanTitle(value);
  if (!cleaned) return '';
  if (LEGACY_BRAND_MAP[cleaned]) return LEGACY_BRAND_MAP[cleaned];
  const folded = legacyFold(cleaned);
  if (LEGACY_BRAND_ALIASES[folded]) return LEGACY_BRAND_ALIASES[folded];
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function legacyFold(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[اأإآ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function runCodeNode(file, json) {
  const source = fs
    .readFileSync(file, 'utf8')
    .replace(/\nawait main\(\);\s*$/, '\nreturn await main();\n');
  if (/\bimport\s+/.test(source)) {
    throw new Error(`${path.basename(file)} contains an external import`);
  }
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFn('$json', source);
  const result = await fn(json);
  if (!result || typeof result !== 'object' || !result.json) {
    throw new Error(`${path.basename(file)} did not return an n8n item`);
  }
  return result.json;
}

const brandRows = fixtures.map((fixture) => {
  const legacyBrand = legacyNormalizeBrand(fixture.inputBrand);
  const brandRecord = normalize.resolveBrand(fixture.inputBrand, fixture.title);
  const facts = matcher.extractFragranceFacts({
    title: fixture.title,
    brand_name: fixture.inputBrand
  });
  return {
    fixture,
    legacyBrand,
    actualBrand: brandRecord ? brandRecord.name_en : '',
    facts
  };
});

const beforeBrandPass = brandRows.filter((row) => row.legacyBrand === row.fixture.expectedBrand).length;
const afterBrandPass = brandRows.filter((row) => row.actualBrand === row.fixture.expectedBrand).length;
const brandCoverageBefore = percent(beforeBrandPass, fixtures.length);
const brandCoverageAfter = percent(afterBrandPass, fixtures.length);

const sizeFixtures = fixtures.filter((fixture) => fixture.expectedSizeMl !== null);
const sizePass = sizeFixtures.filter((fixture) => normalize.normalizeSizeMl(fixture.title) === fixture.expectedSizeMl).length;
const sizeCoverage = percent(sizePass, sizeFixtures.length);

const beforeNeedsReview = brandRows.filter((row) => row.legacyBrand !== row.fixture.expectedBrand).length;
const afterNeedsReview = brandRows.filter((row) => {
  return row.actualBrand !== row.fixture.expectedBrand || !row.facts.normalizedName;
}).length;
const projectedNeedsReviewAfter = Math.round(CURRENT_NEEDS_REVIEW * (afterNeedsReview / Math.max(1, beforeNeedsReview)));

const brandBundlePath = path.join(ROOT, 'sync/n8n-build/brand-normalize.generated.js');
const enrichmentBundlePath = path.join(ROOT, 'sync/n8n-build/enrichment-anthropic.generated.js');

runGeneratedBundleChecks().then(() => {
  console.log(JSON.stringify(summary, null, 2));

  if (afterBrandPass !== fixtures.length) {
    const failures = brandRows
      .filter((row) => row.actualBrand !== row.fixture.expectedBrand)
      .map((row) => ({ title: row.fixture.title, expected: row.fixture.expectedBrand, actual: row.actualBrand }));
    throw new Error(`brand coverage failures: ${JSON.stringify(failures, null, 2)}`);
  }
  if (sizePass !== sizeFixtures.length) {
    throw new Error(`size parse coverage failed: ${sizePass}/${sizeFixtures.length}`);
  }
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function runGeneratedBundleChecks() {
const brandBundleResult = await runCodeNode(brandBundlePath, {
  title: 'عطر ديور سوفاج 100مل',
  brand_name: 'متجر نوادر ديور'
});
assertEqual(brandBundleResult.brand_name_en, 'Dior', 'brand bundle should ignore store name and resolve Dior from title');
assertEqual(brandBundleResult.size_ml, 100, 'brand bundle should parse Arabic attached ml size');
if (!brandBundleResult.normalized_name) throw new Error('brand bundle should emit normalized_name');

const promptOnly = await runCodeNode(enrichmentBundlePath, {
  id: 'fragrance-1',
  brand_name_en: 'Dior',
  brand_name_ar: 'ديور',
  normalized_name: 'sauvage',
  canonical_name_en: 'Sauvage',
  tags: ['dior', 'men']
});
assertEqual(promptOnly.enrichment_status, 'prompt_ready', 'enrichment bundle should build prompt without response');
assertEqual(promptOnly.should_call_anthropic, true, 'prompt-only bundle should request Anthropic call by downstream node');

const guarded = await runCodeNode(enrichmentBundlePath, {
  id: 'fragrance-2',
  is_enriched: true,
  description_ar: 'محتوى موجود',
  tags: ['existing']
});
assertEqual(guarded.enrichment_status, 'skipped_existing_enrichment', 'enrichment guard should skip existing enrichment');
assertEqual(guarded.fragrance_product_update, null, 'guard should not emit overwrite payload');

const parsed = await runCodeNode(enrichmentBundlePath, {
  id: 'fragrance-3',
  brand_name_en: 'Dior',
  brand_name_ar: 'ديور',
  normalized_name: 'rose kabuki',
  canonical_name_en: 'Rose Kabuki',
  tags: ['dior'],
  anthropic_response: {
    content: [
      {
        text: JSON.stringify({
          description_ar: 'عطر فاخر يبرز حضور الورد بأسلوب ناعم ومتوازن يناسب محبي الروائح الراقية.',
          description_en: 'A refined floral fragrance with a polished luxury character.',
          seo_title_ar: 'ديور روز كابوكي او دو بارفيوم',
          seo_title_en: 'Dior Rose Kabuki Eau de Parfum',
          seo_description_ar: 'تسوق عطر ديور روز كابوكي بلمسة وردية فاخرة لدى كالابريس.',
          seo_description_en: 'Shop Dior Rose Kabuki, a refined floral luxury fragrance at Calapres.',
          seo_keywords: ['ديور روز كابوكي', 'Dior Rose Kabuki', 'عطور ديور'],
          tags: ['floral']
        })
      }
    ]
  }
});
assertEqual(parsed.enrichment_status, 'enriched_ready', 'enrichment bundle should parse JSON response');
assertEqual(parsed.fragrance_product_update.is_enriched, true, 'parsed payload should set is_enriched');
if (!parsed.fragrance_product_update.tags.includes('enriched')) {
  throw new Error('parsed payload should add enriched tag');
}
if (!parsed.fragrance_product_update.tags.includes('dior')) {
  throw new Error('parsed payload should preserve existing tags');
}
}

const summary = {
  fixture_count: fixtures.length,
  brand_extraction: {
    before: `${beforeBrandPass}/${fixtures.length}`,
    before_percent: brandCoverageBefore,
    after: `${afterBrandPass}/${fixtures.length}`,
    after_percent: brandCoverageAfter
  },
  size_parse: {
    after: `${sizePass}/${sizeFixtures.length}`,
    after_percent: sizeCoverage
  },
  needs_review_projection: {
    current: CURRENT_NEEDS_REVIEW,
    sample_before: `${beforeNeedsReview}/${fixtures.length}`,
    sample_after: `${afterNeedsReview}/${fixtures.length}`,
    projected_after: projectedNeedsReviewAfter,
    projected_reduction: CURRENT_NEEDS_REVIEW - projectedNeedsReviewAfter
  }
};

function percent(numerator, denominator) {
  return denominator === 0 ? 100 : Math.round((numerator / denominator) * 10000) / 100;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function loadCommonJs(file, requires = {}) {
  const code = fs.readFileSync(file, 'utf8');
  const module = { exports: {} };
  const dirname = path.dirname(file);
  const sandboxRequire = (request) => {
    if (requires[request]) return requires[request];
    throw new Error(`Unexpected test require ${request} from ${path.basename(file)}`);
  };
  const wrapped = `(function (require, module, exports, __dirname, __filename) { ${code}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: file });
  fn(sandboxRequire, module, module.exports, dirname, file);
  return module.exports;
}
