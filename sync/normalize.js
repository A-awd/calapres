const BRAND_MAP = {
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

const BRAND_ALIASES = {
  'matiere premiere': 'Matiere Premiere',
  'matière première': 'Matiere Premiere',
  'van cleef and arpels': 'Van Cleef & Arpels',
  'van cleef & arpels': 'Van Cleef & Arpels',
  'j p g': 'Jean Paul Gaultier',
  'j.p.g': 'Jean Paul Gaultier',
  'tomford': 'Tom Ford'
};

function normalizeProduct(input) {
  const product = input && typeof input === 'object' ? input : {};
  const title = cleanTitle(product.name || product.title || '');
  const brand = normalizeBrand(product.brand || product.vendor || detectBrand(title));
  const concentration = normalizeConcentration(product.concentration || title);
  const sizeMl = normalizeSizeMl(product.sizeMl || product.size || title);
  const gender = normalizeGender(product.gender || title || product.category || '');
  return {
    ...product,
    title,
    name: product.name || title,
    brand,
    concentration,
    sizeMl,
    gender
  };
}

function normalizeBrand(value) {
  const cleaned = cleanTitle(value);
  if (!cleaned) return '';
  if (BRAND_MAP[cleaned]) return BRAND_MAP[cleaned];
  const folded = fold(cleaned);
  if (BRAND_ALIASES[folded]) return BRAND_ALIASES[folded];
  return titleCasePreservingKnown(cleaned);
}

function detectBrand(title) {
  const text = cleanTitle(title);
  for (const key of Object.keys(BRAND_MAP)) {
    if (text.includes(key)) return BRAND_MAP[key];
  }
  const folded = fold(text);
  for (const key of Object.keys(BRAND_ALIASES)) {
    if (folded.includes(key)) return BRAND_ALIASES[key];
  }
  const firstTwo = text.split(/\s+/).slice(0, 2).join(' ');
  return firstTwo;
}

function normalizeConcentration(value) {
  const raw = foldArabicDigits(value).toLowerCase();
  if (/\bextrait\b|اكستريت|اكسيتريت|مستخلص/.test(raw)) return 'Extrait';
  if (/\bedp\b|eau de parfum|او دو برفيوم|او دو بارفيوم|ماء عطر/.test(raw)) return 'EDP';
  if (/\bedt\b|eau de toilette|او دو تواليت|ماء تواليت/.test(raw)) return 'EDT';
  if (/\ble parfum\b|\bparfum\b|بارفيوم|برفيوم/.test(raw)) return 'Parfum';
  if (/\bedc\b|eau de cologne|كولونيا/.test(raw)) return 'EDC';
  return null;
}

function normalizeSizeMl(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = foldArabicDigits(value);
  const match = raw.match(/(\d+(?:\.\d+)?)\s*(?:ml|m\.l|مل|ملي|مليلتر)/i) || raw.match(/\b(\d{2,3})\b/);
  return match ? Number(match[1]) : null;
}

function normalizeGender(value) {
  const raw = String(value || '').toLowerCase();
  if (/women|woman|female|ladies|نسائي|للنساء|حريمي/.test(raw)) return 'women';
  if (/men|man|male|رجالي|للرجال/.test(raw)) return 'men';
  if (/unisex|مشترك|للجنسين/.test(raw)) return 'unisex';
  return null;
}

function cleanTitle(value) {
  return decodeEntities(stripTags(String(value || '')))
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function titleCasePreservingKnown(value) {
  return String(value || '')
    .split(/\s+/)
    .map((part) => {
      if (/^[A-Z0-9&'.-]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function fold(value) {
  return foldArabicDigits(value)
    .toLowerCase()
    .replace(/[اأإآ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function foldArabicDigits(value) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ');
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BRAND_MAP,
    BRAND_ALIASES,
    normalizeProduct,
    normalizeBrand,
    detectBrand,
    normalizeConcentration,
    normalizeSizeMl,
    normalizeGender,
    cleanTitle,
    fold,
    foldArabicDigits
  };
}
