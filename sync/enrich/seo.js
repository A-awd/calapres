const config = require('../config.js');
const normalize = require('../normalize.js');

const BODY_VARIANTS = [
  'اختير بعناية ليمنح حضورًا عطريًا راقيًا يناسب تفاصيل اليوم والمناسبات الخاصة.',
  'يقدم تجربة فاخرة متوازنة لعشاق العطور النادرة والاختيارات الهادئة ذات الطابع المميز.',
  'يعكس ذوق كالابريز في انتقاء العطور التي تجمع بين أصالة المصدر وأناقة التقديم العربي.'
];

function buildArabicSeo(product, options) {
  const item = normalize.normalizeProduct(product || {});
  const title = item.title || item.name || 'عطر فاخر';
  const brand = item.brand || 'كالابريز';
  const size = item.sizeMl ? ' ' + item.sizeMl + ' مل' : '';
  const concentration = item.concentration ? ' ' + item.concentration : '';
  const variantIndex = stableIndex(title + brand, BODY_VARIANTS.length);
  const titleTag = capLength(title + ' | كالابريز للعطور الفاخرة', 70);
  const descriptionTag = capLength('تسوق ' + title + ' من كالابريز. عطر فاخر من ' + brand + size + ' بتجربة عربية راقية وسعر محدث من المصدر.', 155);
  const bodyHtml = [
    '<section class="calapres-luxury-description" dir="rtl">',
    '<h2>' + escapeHtml(title) + '</h2>',
    '<p>' + escapeHtml(BODY_VARIANTS[variantIndex]) + '</p>',
    '<p>تأتي هذه القطعة من ' + escapeHtml(brand) + escapeHtml(concentration) + escapeHtml(size) + ' ضمن مجموعة كالابريز المختارة لعشاق العطور الفاخرة في الرياض.</p>',
    '</section>'
  ].join('');
  return {
    titleTag,
    descriptionTag,
    bodyHtml,
    variantIndex,
    metafields: [
      { namespace: config.NAMESPACES.seo, key: config.METAFIELDS.seoTitle, value: titleTag, type: 'single_line_text_field' },
      { namespace: config.NAMESPACES.seo, key: config.METAFIELDS.seoDescription, value: descriptionTag, type: 'multi_line_text_field' },
      { namespace: config.NAMESPACES.presentation, key: config.METAFIELDS.enrichedBy, value: 'higgsfield-calapres-n8n', type: 'single_line_text_field' }
    ]
  };
}

function stableIndex(value, modulo) {
  let hash = 0;
  for (const char of String(value || '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return modulo ? hash % modulo : 0;
}

function capLength(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : text.slice(0, Math.max(0, max - 1)).trim() + '…';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildArabicSeo, capLength, escapeHtml, stableIndex };
}
