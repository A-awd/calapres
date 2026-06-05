// Fragrance matching: resolve raw supplier products into a canonical parent
// fragrance + a variant (size / tester / gift set).
//
// Rules:
// - Fragrance = parent (brand + normalized fragrance name + concentration).
// - Sizes / testers / gift sets = variants of that parent.
// - Same brand + same normalized name (+ compatible concentration) with HIGH
//   confidence -> attach as a new VARIANT, never a duplicate parent.
// - Missing brand or unresolvable name -> LOW confidence -> flag for review,
//   never merge blindly.
//
// Dependency-free: only requires sibling sync helpers so it runs in n8n Code
// nodes and the offline test runner.

const normalize = require('./normalize.js');

const HIGH_CONFIDENCE = 0.9;

// Surface forms removed from a title to isolate the core fragrance name.
const CONCENTRATION_TOKENS = [
  'eau de parfum', 'eau de toilette', 'eau de cologne', 'le parfum',
  'edp', 'edt', 'edc', 'extrait', 'parfum', 'cologne',
  'او دو برفيوم', 'او دو بارفيوم', 'او دو تواليت', 'ماء عطر', 'ماء تواليت',
  'بارفيوم', 'برفيوم', 'كولونيا', 'اكستريت', 'اكسيتريت', 'مستخلص'
];

const GENDER_TOKENS = [
  'for women', 'for men', 'for him', 'for her', 'pour homme', 'pour femme',
  'women', 'woman', 'men', 'man', 'unisex', 'ladies',
  'نسائي', 'للنساء', 'حريمي', 'رجالي', 'للرجال', 'للجنسين', 'مشترك'
];

const TESTER_TOKENS = ['tester', 'test', 'تستر', 'تيستر', 'عينة'];
const GIFT_SET_TOKENS = ['gift set', 'giftset', 'gift box', 'set', 'coffret', 'طقم', 'مجموعة', 'هدية', 'بوكس'];

function resolveFragrance(parsed, existingFragrances, options) {
  const facts = extractFragranceFacts(parsed, options);
  const key = buildFragranceKey(facts);
  const confidence = scoreConfidence(facts);

  if (confidence < HIGH_CONFIDENCE) {
    return {
      action: 'review',
      reason: reviewReason(facts),
      confidence,
      facts,
      fragranceKey: key,
      matched: null
    };
  }

  const matched = findMatchingFragrance(facts, existingFragrances);
  if (matched) {
    return { action: 'attach_variant', confidence, facts, fragranceKey: key, matched };
  }
  return { action: 'create_fragrance', confidence, facts, fragranceKey: key, matched: null };
}

function extractFragranceFacts(parsed, options) {
  const opts = options || {};
  const input = parsed && typeof parsed === 'object' ? parsed : {};
  const rawTitle = normalize.cleanTitle(input.name || input.title || input.product_title_en || input.product_title_ar || '');
  const brand = normalize.normalizeBrand(input.brand || input.brand_name || input.vendor || normalize.detectBrand(rawTitle));
  const concentration = firstNonEmpty(input.concentration, normalize.normalizeConcentration(rawTitle));
  const sizeMl = firstFinite(input.sizeMl, input.size_ml, normalize.normalizeSizeMl(rawTitle));
  const gender = firstNonEmpty(input.gender, input.gender_target, normalize.normalizeGender(rawTitle));
  const isTester = detectFlag(rawTitle, TESTER_TOKENS) || Boolean(opts.isTester);
  const isGiftSet = detectFlag(rawTitle, GIFT_SET_TOKENS) || Boolean(opts.isGiftSet);

  const coreName = stripToCoreName(rawTitle, brand, concentration);
  const normalizedName = normalize.fold(coreName);
  const canonicalNameEn = latinOnly(coreName) || (isLatin(rawTitle) ? rawTitle : '');
  const canonicalNameAr = arabicOnly(coreName) || (isArabic(rawTitle) ? rawTitle : '');

  return {
    rawTitle,
    brand: brand || '',
    brandSlug: brand ? normalize.fold(brand) : '',
    concentration: concentration || null,
    sizeMl: sizeMl === undefined ? null : sizeMl,
    gender: gender || null,
    isTester,
    isGiftSet,
    coreName,
    normalizedName,
    canonicalNameEn,
    canonicalNameAr,
    sizeLabel: buildSizeLabel({ sizeMl, isTester, isGiftSet }),
    variantTitle: buildVariantTitle({ sizeMl, isTester, isGiftSet, concentration })
  };
}

function buildFragranceKey(facts) {
  const f = facts || {};
  return [f.brandSlug || '', f.normalizedName || '', f.concentration ? String(f.concentration).toLowerCase() : ''].join('|');
}

function scoreConfidence(facts) {
  const f = facts || {};
  let score = 0;
  if (f.brand) score += 0.5;
  if (f.normalizedName) score += 0.4;
  if (f.concentration) score += 0.1;
  // Brand AND a resolvable name are both mandatory for a high-confidence merge.
  if (!f.brand || !f.normalizedName) score = Math.min(score, 0.5);
  return Math.round(score * 1000) / 1000;
}

function reviewReason(facts) {
  const f = facts || {};
  if (!f.brand && !f.normalizedName) return 'missing_brand_and_name';
  if (!f.brand) return 'missing_brand';
  if (!f.normalizedName) return 'unresolvable_fragrance_name';
  return 'low_confidence';
}

function findMatchingFragrance(facts, existingFragrances) {
  const rows = Array.isArray(existingFragrances)
    ? existingFragrances
    : (existingFragrances && Array.isArray(existingFragrances.data) ? existingFragrances.data : []);
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rowBrandSlug = row.brandSlug || (row.brand_name ? normalize.fold(row.brand_name) : (row.brand ? normalize.fold(row.brand) : ''));
    const rowName = row.normalized_name || row.normalizedName || '';
    if (!rowBrandSlug || !rowName) continue;
    if (rowBrandSlug !== facts.brandSlug) continue;
    if (rowName !== facts.normalizedName) continue;
    if (!concentrationCompatible(facts.concentration, row.concentration)) continue;
    return row;
  }
  return null;
}

function concentrationCompatible(a, b) {
  if (!a || !b) return true; // unknown concentration never blocks a name match
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function stripToCoreName(title, brand, concentration) {
  // Fold Arabic-Indic digits to ASCII first so "١٠٠ml" becomes "100ml" and the
  // size patterns below can strip it (\d and \b only see ASCII digits).
  let text = ' ' + normalize.foldArabicDigits(String(title || '')) + ' ';
  for (const form of brandSurfaceForms(brand)) text = removeToken(text, form);
  for (const token of CONCENTRATION_TOKENS) text = removeToken(text, token);
  for (const token of GENDER_TOKENS) text = removeToken(text, token);
  for (const token of TESTER_TOKENS) text = removeToken(text, token);
  for (const token of GIFT_SET_TOKENS) text = removeToken(text, token);
  // Sizes: "100ml", "100 مل", then any bare 1-4 digit run left over.
  text = text.replace(/\d+(?:\.\d+)?\s*(?:ml|m\.l|مل|ملي|مليلتر)/gi, ' ');
  text = text.replace(/\d{1,4}/g, ' ');
  return text.replace(/[‌‏]/g, ' ').replace(/[-_/|,،.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function brandSurfaceForms(brand) {
  const forms = [];
  const canonical = String(brand || '').trim();
  if (canonical) forms.push(canonical);
  for (const key of Object.keys(normalize.BRAND_MAP)) {
    if (normalize.BRAND_MAP[key] === canonical) forms.push(key);
  }
  for (const key of Object.keys(normalize.BRAND_ALIASES)) {
    if (normalize.BRAND_ALIASES[key] === canonical) forms.push(key);
  }
  // Longest first so multi-word brands are removed before their fragments.
  return unique(forms).sort((a, b) => b.length - a.length);
}

function removeToken(haystack, token) {
  const needle = String(token || '').trim();
  if (!needle) return haystack;
  if (/[a-z]/i.test(needle)) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return haystack.replace(new RegExp('(^|[^a-z])' + escaped + '(?=$|[^a-z])', 'gi'), '$1 ');
  }
  // Arabic / non-latin: plain global substring removal.
  return haystack.split(needle).join(' ');
}

function buildSizeLabel(input) {
  if (input && input.isTester) return 'Tester';
  if (input && input.isGiftSet) return 'Gift Set';
  const ml = firstFinite(input && input.sizeMl);
  return ml ? ml + 'ml' : 'Standard';
}

function buildVariantTitle(input) {
  const parts = [];
  const ml = firstFinite(input && input.sizeMl);
  if (ml) parts.push(ml + 'ml');
  if (input && input.concentration) parts.push(input.concentration);
  if (input && input.isTester) parts.push('Tester');
  if (input && input.isGiftSet) parts.push('Gift Set');
  return parts.join(' ').trim() || 'Standard';
}

function detectFlag(text, tokens) {
  const folded = normalize.fold(text);
  return tokens.some((token) => {
    if (/[a-z]/i.test(token)) return new RegExp('(^|[^a-z])' + token.replace(/\s+/g, '\\s+') + '(?=$|[^a-z])', 'i').test(folded);
    return folded.indexOf(token) !== -1;
  });
}

function latinOnly(value) {
  const out = String(value || '').replace(/[^ -ɏ]/g, ' ').replace(/\s+/g, ' ').trim();
  return /[a-z]/i.test(out) ? out : '';
}

function arabicOnly(value) {
  const out = String(value || '').replace(/[^؀-ۿ\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return /[؀-ۿ]/.test(out) ? out : '';
}

function isLatin(value) {
  return /[a-z]/i.test(String(value || ''));
}

function isArabic(value) {
  return /[؀-ۿ]/.test(String(value || ''));
}

function firstNonEmpty() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
}

function firstFinite() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
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
    HIGH_CONFIDENCE,
    resolveFragrance,
    extractFragranceFacts,
    buildFragranceKey,
    scoreConfidence,
    findMatchingFragrance,
    stripToCoreName,
    buildSizeLabel,
    buildVariantTitle,
    detectFlag
  };
}
