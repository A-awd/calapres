// Self-contained n8n Code node bundle.
// Mode: runOnceForEachItem
// Purpose: resolve Nawadir Dior supplier titles to canonical brand records,
// stable fragrance parent names, concentration, and variant size facts.

const STORE_BRAND_NAMES = [
  'متجر نوادر ديور',
  'نوادر ديور',
  'nawadir dior',
  'nawadir dior store',
  'nawadir',
  'calapres'
];

const BRAND_RECORDS = [
  { name_en: 'Dior', name_ar: 'ديور', aliases: ['ديور', 'كريستيان ديور', 'dior', 'christian dior'] },
  { name_en: 'Tom Ford', name_ar: 'توم فورد', aliases: ['توم فورد', 'تومفورد', 'tom ford', 'tomford'] },
  { name_en: 'Chanel', name_ar: 'شانيل', aliases: ['شانيل', 'chanel'] },
  { name_en: 'Nishane', name_ar: 'نيشان', aliases: ['نيشان', 'nishane'] },
  { name_en: 'Guerlain', name_ar: 'جيرلان', aliases: ['جيرلان', 'guerlain'] },
  { name_en: 'Xerjoff', name_ar: 'زيرجوف', aliases: ['زيرجوف', 'xerjoff'] },
  { name_en: 'Acqua di Parma', name_ar: 'اكوا دي بارما', aliases: ['اكوا دي بارما', 'أكوا دي بارما', 'acqua di parma'] },
  { name_en: 'Jean Paul Gaultier', name_ar: 'جان بول غوتييه', aliases: ['جان بول غوتييه', 'جان بول جوتييه', 'jean paul gaultier', 'j p g', 'j.p.g'] },
  { name_en: 'Van Cleef & Arpels', name_ar: 'فان كليف اند اربلز', aliases: ['فان كليف', 'فان كليف اند اربلز', 'فان كليف آند آربلز', 'van cleef and arpels', 'van cleef & arpels', 'van cleef arpels'] },
  { name_en: 'Matiere Premiere', name_ar: 'ماتيري بريميير', aliases: ['ماتيري بريميير', 'ماتيير بريميير', 'ماتيريا بريميير', 'matiere premiere', 'matière première', 'materia premiere'] },
  { name_en: 'Abdul Samad Al Qurashi', name_ar: 'عبد الصمد القرشي', aliases: ['عبد الصمد القرشي', 'abdul samad al qurashi'] },
  { name_en: 'Arabian Oud', name_ar: 'العربية للعود', aliases: ['العربية للعود', 'arabian oud'] },
  { name_en: 'Aramis', name_ar: 'اراميس', aliases: ['اراميس', 'aramis'] },
  { name_en: 'Armand Basi', name_ar: 'ارماند باسي', aliases: ['ارماند باسي', 'armand basi'] },
  { name_en: 'Azzaro', name_ar: 'ازارو', aliases: ['ازارو', 'azzaro'] },
  { name_en: 'Escada', name_ar: 'اسكادا', aliases: ['اسكادا', 'escada'] },
  { name_en: 'La Rive', name_ar: 'لا ريف', aliases: ['لا ريف', 'la rive'] },
  { name_en: 'Rasasi', name_ar: 'رصاصي', aliases: ['رصاصي', 'رساسي', 'rasasi'] },
  { name_en: 'Elizabeth Arden', name_ar: 'اليزابيث اردن', aliases: ['اليزابيث اردن', 'إليزابيث أردن', 'elizabeth arden'] },
  { name_en: 'Elizabeth Taylor', name_ar: 'اليزابيث تايلور', aliases: ['اليزابيث تايلور', 'إليزابيث تايلور', 'elizabeth taylor'] },
  { name_en: 'Issey Miyake', name_ar: 'ايسي مياكي', aliases: ['ايسي مياكي', 'إيسي مياكي', 'issey miyake'] },
  { name_en: 'Emanuel Ungaro', name_ar: 'ايمانويل انغارو', aliases: ['ايمانويل انغارو', 'emanuel ungaro'] },
  { name_en: 'S.T. Dupont', name_ar: 'اس تي ديبونت', aliases: ['اس تي ديبونت', 'ديبونت', 's t dupont', 'st dupont', 's.t. dupont', 'dupont'] },
  { name_en: 'Estee Lauder', name_ar: 'استي لودر', aliases: ['استي لودر', 'إستي لودر', 'estee lauder', 'estée lauder'] },
  { name_en: 'Yves Saint Laurent', name_ar: 'ايف سان لوران', aliases: ['ايف سان لوران', 'إيف سان لوران', 'yves saint laurent', 'ysl'] },
  { name_en: 'Elie Saab', name_ar: 'ايلي صعب', aliases: ['ايلي صعب', 'إيلي صعب', 'elie saab'] },
  { name_en: 'Clive Christian', name_ar: 'كلايف كريستيان', aliases: ['كلايف كريستيان', 'clive christian'] },
  { name_en: 'By Kilian', name_ar: 'باي كيليان', aliases: ['باي كيليان', 'كيليان', 'kilian', 'by kilian'] },
  { name_en: 'Kajal', name_ar: 'كاجال', aliases: ['كاجال', 'kajal'] },
  { name_en: 'Atelier Cologne', name_ar: 'اتيليه كولون', aliases: ['اتيليه كولون', 'atelier cologne'] },
  { name_en: 'Atelier des Ors', name_ar: 'اتيليه دي اورس', aliases: ['اتيليه دي اورس', 'أتيليه دي أورس', 'atelier des ors'] },
  { name_en: 'Rosendo Mateu', name_ar: 'روسيندو ماتيو', aliases: ['روسيندو ماتيو', 'rosendo mateu'] },
  { name_en: 'Louis Vuitton', name_ar: 'لويس فيتون', aliases: ['لويس فيتون', 'louis vuitton'] },
  { name_en: 'Vilhelm Parfumerie', name_ar: 'فيلهلم بارفومري', aliases: ['فيلهلم', 'vilhelm', 'vilhelm parfumerie'] },
  { name_en: 'Cartier', name_ar: 'كارتير', aliases: ['كارتير', 'cartier'] },
  { name_en: 'Diptyque', name_ar: 'ديبتيك', aliases: ['ديبتيك', 'diptyque'] },
  { name_en: 'Maison Francis Kurkdjian', name_ar: 'ميزون فرانسيس كوركدجيان', aliases: ['ميزون فرانسيس كوركدجيان', 'ميزون فرانسيس', 'maison francis kurkdjian', 'mfk'] },
  { name_en: 'Maison Crivelli', name_ar: 'ميزون كرفيلي', aliases: ['ميزون كرفيلي', 'maison crivelli'] },
  { name_en: 'Francesca Bianchi', name_ar: 'فرانشيسكا بيانكي', aliases: ['فرانشيسكا بيانكي', 'francesca bianchi'] },
  { name_en: 'Creed', name_ar: 'كريد', aliases: ['كريد', 'creed'] },
  { name_en: 'Lancome', name_ar: 'لانكوم', aliases: ['لانكوم', 'lancome', 'lancôme'] },
  { name_en: 'Giorgio Armani', name_ar: 'جورجيو ارماني', aliases: ['جورجيو ارماني', 'giorgio armani', 'armani'] },
  { name_en: 'Imperissima', name_ar: 'امبريسما', aliases: ['امبريسما', 'imperissima'] }
].map((record) => ({ ...record, slug: slugify(record.name_en) }));

const CONCENTRATION_TOKENS = [
  'eau de parfum', 'eau de toilette', 'eau de cologne', 'le parfum',
  'edp', 'edt', 'edc', 'extrait', 'parfum', 'cologne',
  'او دو برفيوم', 'او دو بارفيوم', 'اودي بارفيوم', 'او دو تواليت',
  'ماء عطر', 'ماء تواليت', 'بارفيوم', 'برفيوم', 'كولونيا', 'اكستريت',
  'اكسيتريت', 'مستخلص'
];
const GENDER_TOKENS = ['for women', 'for men', 'for him', 'for her', 'pour homme', 'pour femme', 'women', 'woman', 'men', 'man', 'unisex', 'ladies', 'نسائي', 'للنساء', 'حريمي', 'رجالي', 'للرجال', 'للجنسين', 'مشترك'];
const TESTER_TOKENS = ['tester', 'test', 'تستر', 'تيستر', 'عينة'];
const GIFT_SET_TOKENS = ['gift set', 'giftset', 'gift box', 'set', 'coffret', 'طقم', 'مجموعة', 'هدية', 'بوكس'];
const PRODUCT_NOISE_TOKENS = ['perfume', 'fragrance', 'body spray', 'hair perfume', 'hair and body mist', 'عطر', 'العطر', 'عطور', 'العطور', 'عينة', 'عينات', 'جديد المتجر', 'المتجر'];

const STORE_NAME_FOLDS = STORE_BRAND_NAMES.map((name) => fold(name));
const BRAND_RECORD_BY_NAME = buildBrandRecordByName(BRAND_RECORDS);
const BRAND_ALIAS_INDEX = buildBrandAliasIndex(BRAND_RECORDS);

const source = typeof $json === 'object' && $json ? $json : {};
const title = cleanTitle(source.title || source.name || source.product_title_ar || source.product_title_en || '');
const brandRecord = resolveBrand(source.brand || source.brand_name || source.vendor, title);
const concentration = firstNonEmpty(source.concentration, normalizeConcentration(title));
const sizeMl = firstFinite(source.sizeMl, source.size_ml, source.size, normalizeSizeMl(title));
const gender = firstNonEmpty(source.gender, source.gender_target, normalizeGender(title));
const isTester = detectFlag(title, TESTER_TOKENS) || Boolean(source.is_tester);
const isGiftSet = detectFlag(title, GIFT_SET_TOKENS) || Boolean(source.is_gift_set);
const coreName = stripToCoreName(title, brandRecord, concentration);
const normalizedName = fold(coreName);
const reviewReasons = [];
if (!brandRecord) reviewReasons.push('missing_canonical_brand');
if (!normalizedName) reviewReasons.push('missing_normalized_name');

return {
  json: {
    ...source,
    normalized_title: title,
    brand_name: brandRecord ? brandRecord.name_en : '',
    brand_name_en: brandRecord ? brandRecord.name_en : '',
    brand_name_ar: brandRecord ? brandRecord.name_ar : '',
    brand_slug: brandRecord ? brandRecord.slug : '',
    brand_lookup: brandRecord ? {
      rpc: 'calapres_resolve_brand',
      params: {
        p_name_en: brandRecord.name_en,
        p_name_ar: brandRecord.name_ar
      }
    } : null,
    normalized_name: normalizedName,
    canonical_name_en: latinOnly(coreName),
    canonical_name_ar: arabicOnly(coreName),
    concentration: concentration || null,
    size_ml: sizeMl,
    gender_target: gender || null,
    is_tester: isTester,
    is_gift_set: isGiftSet,
    size_label: buildSizeLabel(sizeMl, isTester, isGiftSet),
    variant_title: buildVariantTitle(sizeMl, isTester, isGiftSet, concentration),
    needs_review: reviewReasons.length > 0,
    review_reason: reviewReasons.join(',') || null,
    enrichment_brand_map: {
      source: 'nawadirdior_title',
      ignored_store_brand: isStoreBrandName(source.brand || source.brand_name || source.vendor),
      brand: brandRecord,
      normalized_name: normalizedName
    }
  }
};

function resolveBrand(value, titleValue) {
  const candidate = cleanTitle(value);
  if (candidate && !isStoreBrandName(candidate)) {
    const record = getBrandRecord(candidate);
    if (record) return record;
  }
  return detectBrandRecord(titleValue || '');
}

function detectBrandRecord(titleValue) {
  const clean = stripStoreBrandNames(cleanTitle(titleValue));
  const folded = ' ' + fold(clean) + ' ';
  if (!folded.trim()) return null;
  for (const entry of BRAND_ALIAS_INDEX) {
    if (folded.indexOf(' ' + entry.foldedAlias + ' ') !== -1) return entry.record;
  }
  return null;
}

function getBrandRecord(value) {
  const cleaned = cleanTitle(value);
  if (!cleaned || isStoreBrandName(cleaned)) return null;
  return BRAND_RECORD_BY_NAME[fold(cleaned)] || null;
}

function isStoreBrandName(value) {
  const folded = fold(value);
  if (!folded) return false;
  return STORE_NAME_FOLDS.some((storeName) => folded === storeName || folded.indexOf(storeName) !== -1);
}

function stripStoreBrandNames(value) {
  let text = String(value || '');
  for (const name of STORE_BRAND_NAMES) text = text.split(name).join(' ');
  return STORE_NAME_FOLDS.some((storeName) => fold(text) === storeName) ? '' : text;
}

function stripToCoreName(titleValue, brandRecordValue, concentrationValue) {
  let text = ' ' + stripStoreBrandNames(foldArabicDigits(String(titleValue || ''))) + ' ';
  for (const form of brandSurfaceForms(brandRecordValue)) text = removeToken(text, form);
  for (const token of CONCENTRATION_TOKENS) text = removeToken(text, token);
  for (const token of GENDER_TOKENS) text = removeToken(text, token);
  for (const token of TESTER_TOKENS) text = removeToken(text, token);
  for (const token of GIFT_SET_TOKENS) text = removeToken(text, token);
  for (const token of PRODUCT_NOISE_TOKENS) text = removeToken(text, token);
  text = text.replace(/\d+(?:\.\d+)?\s*-?\s*(?:ml|m\.l|مل|ملي|مليلتر)/gi, ' ');
  text = text.replace(/\b(?:30|40|45|50|60|67|75|80|90|100|110|125|150|200)\b/g, ' ');
  return text.replace(/[‌‏]/g, ' ').replace(/[-_/|,،.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function brandSurfaceForms(record) {
  if (!record) return [];
  return unique([record.name_en, record.name_ar].concat(record.aliases || [])).sort((a, b) => b.length - a.length);
}

function removeToken(haystack, token) {
  const needle = String(token || '').trim();
  if (!needle) return haystack;
  if (/[a-z]/i.test(needle)) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return haystack.replace(new RegExp('(^|[^a-z])' + escaped + '(?=$|[^a-z])', 'gi'), '$1 ');
  }
  return haystack.split(needle).join(' ');
}

function normalizeConcentration(value) {
  const raw = foldArabicDigits(value).toLowerCase();
  if (/\bextrait\b|اكستريت|اكسيتريت|مستخلص/.test(raw)) return 'Extrait';
  if (/\bedp\b|eau de parfum|او دو برفيوم|او دو بارفيوم|اودي بارفيوم|ماء عطر/.test(raw)) return 'EDP';
  if (/\bedt\b|eau de toilette|او دو تواليت|ماء تواليت/.test(raw)) return 'EDT';
  if (/\ble parfum\b|\bparfum\b|بارفيوم|برفيوم/.test(raw)) return 'Parfum';
  if (/\bedc\b|eau de cologne|كولونيا/.test(raw)) return 'EDC';
  return null;
}

function normalizeSizeMl(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = foldArabicDigits(value);
  const match = raw.match(/(\d+(?:\.\d+)?)\s*-?\s*(?:ml|m\.l|مل|ملي|مليلتر)/i) || raw.match(/\b(30|40|45|50|60|67|75|80|90|100|110|125|150|200)\b/);
  return match ? Number(match[1]) : null;
}

function normalizeGender(value) {
  const raw = String(value || '').toLowerCase();
  if (/women|woman|female|ladies|نسائي|للنساء|حريمي/.test(raw)) return 'women';
  if (/men|man|male|رجالي|للرجال/.test(raw)) return 'men';
  if (/unisex|مشترك|للجنسين/.test(raw)) return 'unisex';
  return null;
}

function buildSizeLabel(sizeMl, isTester, isGiftSet) {
  if (isTester) return 'Tester';
  if (isGiftSet) return 'Gift Set';
  return sizeMl ? sizeMl + 'ml' : 'Standard';
}

function buildVariantTitle(sizeMl, isTester, isGiftSet, concentrationValue) {
  const parts = [];
  if (sizeMl) parts.push(sizeMl + 'ml');
  if (concentrationValue) parts.push(concentrationValue);
  if (isTester) parts.push('Tester');
  if (isGiftSet) parts.push('Gift Set');
  return parts.join(' ').trim() || 'Standard';
}

function detectFlag(text, tokens) {
  const folded = fold(text);
  return tokens.some((token) => folded.indexOf(fold(token)) !== -1);
}

function cleanTitle(value) {
  return decodeEntities(stripTags(String(value || ''))).replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
}

function fold(value) {
  return removeLatinDiacritics(foldArabicDigits(value))
    .toLowerCase()
    .replace(/[اأإآٱ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[ـ]/g, '')
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

function removeLatinDiacritics(value) {
  const raw = String(value || '');
  return typeof raw.normalize === 'function' ? raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '') : raw;
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

function latinOnly(value) {
  const out = String(value || '').replace(/[^\u0000-\u024F]/g, ' ').replace(/\s+/g, ' ').trim();
  return /[a-z]/i.test(out) ? out : '';
}

function arabicOnly(value) {
  const out = String(value || '').replace(/[^\u0600-\u06FF\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return /[\u0600-\u06FF]/.test(out) ? out : '';
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

function buildBrandRecordByName(records) {
  const out = {};
  for (const record of records) {
    out[fold(record.name_en)] = record;
    out[fold(record.name_ar)] = record;
    out[fold(record.slug)] = record;
    for (const alias of record.aliases || []) out[fold(alias)] = record;
  }
  return out;
}

function buildBrandAliasIndex(records) {
  const out = [];
  for (const record of records) {
    for (const alias of unique([record.name_en, record.name_ar].concat(record.aliases || []))) {
      const foldedAlias = fold(alias);
      if (foldedAlias && !STORE_NAME_FOLDS.includes(foldedAlias)) out.push({ foldedAlias, record });
    }
  }
  return out.sort((a, b) => b.foldedAlias.length - a.foldedAlias.length);
}

function slugify(value) {
  return fold(value).replace(/&/g, 'and').replace(/\s+/g, '-');
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
