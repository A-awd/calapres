// Enrichment source handling for fragrance_products.
//
// Source priority (use the first that yields each structured fact):
//   1. supplier      (nawadirdior.sa)            — already-crawled facts. NOT verified.
//   2. official_brand (brand's own site, manual) — TRUSTED. May be verified.
//   3. fragrantica_arabia (fragranticarabia.com) — public structured facts only. NOT verified.
//
// Hard rules:
// - Public sources are used ONLY for STRUCTURED perfume facts (family, accords,
//   notes, ratings, season/occasion). Never copy long descriptions or reviews.
// - Do not mark facts `verified` unless they come from an official brand source
//   or a manual trusted entry.
// - Never overwrite a fragrance field that is already filled unless force=true.
//
// Dependency-free so it runs in n8n Code nodes and the offline test runner.

const FRAGRANTICA_ARABIA_BASE = 'https://www.fragranticarabia.com/';

// Structured fields enrichment is allowed to write. Anything not listed here
// (descriptions, reviews, body copy) is intentionally ignored.
const STRUCTURED_FACT_FIELDS = [
  'fragrance_family_primary',
  'fragrance_family_secondary',
  'accords',
  'notes_top',
  'notes_middle',
  'notes_base',
  'longevity_rating',
  'sillage_rating',
  'season_best_for',
  'occasion_best_for',
  'style_keywords'
];

// Free-text fields that must NEVER be copied from a public source.
const BLOCKED_FACT_FIELDS = [
  'description',
  'long_description',
  'luxury_description_ar',
  'luxury_description_en',
  'review',
  'reviews',
  'body',
  'body_html'
];

const ARRAY_FACT_FIELDS = {
  accords: true,
  notes_top: true,
  notes_middle: true,
  notes_base: true,
  season_best_for: true,
  occasion_best_for: true,
  style_keywords: true
};

const TRUSTED_SOURCES = { official_brand: true, manual: true };

function buildEnrichmentPlan(fragrance, options) {
  const opts = options || {};
  const parent = fragrance && typeof fragrance === 'object' ? fragrance : {};
  const plan = [];

  plan.push({
    source: 'supplier',
    trusted: false,
    url: opts.supplierSourceUrl || parent.enrichment_source_url || null,
    use: 'structured_facts',
    note: 'Supplier-crawled facts. Never verified.'
  });

  if (opts.officialBrandUrl) {
    plan.push({
      source: 'official_brand',
      trusted: true,
      url: opts.officialBrandUrl,
      use: 'structured_facts',
      note: 'Official brand source. May be marked verified.'
    });
  }

  if (opts.useFragranticaArabia !== false) {
    plan.push({
      source: 'fragrantica_arabia',
      trusted: false,
      url: opts.fragranticaUrl || buildFragranticaQueryUrl(parent),
      use: 'structured_facts_only',
      note: 'Public structured facts only. Do not copy descriptions or reviews. Never verified.'
    });
  }

  return plan;
}

function buildFragranticaQueryUrl(fragrance) {
  const parent = fragrance && typeof fragrance === 'object' ? fragrance : {};
  const terms = [parent.brand_name, parent.canonical_name_en || parent.canonical_name_ar || parent.normalized_name]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');
  if (!terms) return FRAGRANTICA_ARABIA_BASE;
  return FRAGRANTICA_ARABIA_BASE + 'search/?query=' + encodeURIComponent(terms);
}

function isTrustedSource(source) {
  return Boolean(TRUSTED_SOURCES[String(source || '').toLowerCase()]);
}

// Merge structured facts onto a fragrance, honoring every enrichment rule.
function mergeEnrichmentFacts(fragrance, facts, source, options) {
  const opts = options || {};
  const parent = fragrance && typeof fragrance === 'object' ? { ...fragrance } : {};
  const incoming = facts && typeof facts === 'object' ? facts : {};
  const sourceName = String(source || incoming.source || 'unknown').toLowerCase();
  const trusted = isTrustedSource(sourceName);
  const force = Boolean(opts.force);

  const applied = {};
  const ignored = [];

  for (const field of STRUCTURED_FACT_FIELDS) {
    if (!(field in incoming)) continue;
    const value = ARRAY_FACT_FIELDS[field] ? normalizeArray(incoming[field]) : normalizeScalar(incoming[field]);
    if (value === null || (Array.isArray(value) && value.length === 0)) continue;
    if (!force && !isEmpty(parent[field])) continue; // never overwrite existing enriched/manual data
    parent[field] = value;
    applied[field] = value;
  }

  // Explicitly drop anything that looks like free-text copy from a public source.
  for (const field of BLOCKED_FACT_FIELDS) {
    if (field in incoming) ignored.push(field);
  }

  parent.enrichment_source = sourceName;
  parent.enrichment_source_url = opts.sourceUrl || incoming.source_url || parent.enrichment_source_url || null;
  parent.raw_enrichment_payload = onlyStructured(incoming);
  parent.confidence_score = clampConfidence(opts.confidence ?? parent.confidence_score);
  parent.enrichment_status = Object.keys(applied).length ? (opts.partial ? 'partial' : 'enriched') : (parent.enrichment_status || 'pending');

  // Verified ONLY from an official/manual trusted source AND an explicit verify flag.
  parent.verified = Boolean(trusted && opts.markVerified);
  if (parent.verified) parent.enrichment_status = 'verified';

  return { fragrance: parent, applied, ignored, trusted, verified: parent.verified };
}

// ── helpers ─────────────────────────────────────────────────────────────────
function onlyStructured(facts) {
  const out = {};
  for (const field of STRUCTURED_FACT_FIELDS) {
    if (field in facts && !isEmpty(facts[field])) out[field] = facts[field];
  }
  return out;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return unique(value.map(cleanString).filter(Boolean));
  const text = cleanString(value);
  if (!text) return [];
  return unique(text.split(/[,،|]/).map(cleanString).filter(Boolean));
}

function normalizeScalar(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = cleanString(value);
  return text || null;
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return Math.round(number * 1000) / 1000;
}

function isEmpty(value) {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function cleanString(value) {
  return String(value === null || value === undefined ? '' : value).replace(/\s+/g, ' ').trim();
}

function unique(values) {
  const seen = {};
  const out = [];
  for (const value of values || []) {
    const key = String(value);
    if (!seen[key]) {
      seen[key] = true;
      out.push(value);
    }
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FRAGRANTICA_ARABIA_BASE,
    STRUCTURED_FACT_FIELDS,
    BLOCKED_FACT_FIELDS,
    TRUSTED_SOURCES,
    buildEnrichmentPlan,
    buildFragranticaQueryUrl,
    isTrustedSource,
    mergeEnrichmentFacts
  };
}
