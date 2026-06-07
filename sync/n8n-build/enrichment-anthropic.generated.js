// Self-contained n8n Code node bundle.
// Mode: runOnceForEachItem
// Purpose: build an Anthropic prompt for fragrance enrichment and, when a
// response is supplied, map parsed enrichment into fragrance_products columns.
// This bundle does not call any live API.

const source = typeof $json === 'object' && $json ? $json : {};
const forceUpdate = truthy(source.force_update);
const row = source.fragrance_product && typeof source.fragrance_product === 'object'
  ? source.fragrance_product
  : source;
const existingTags = normalizeTags(row.tags || source.tags);
const protectedColumns = [
  'description_ar',
  'description_en',
  'seo_title_ar',
  'seo_title_en',
  'seo_description_ar',
  'seo_description_en',
  'seo_keywords'
];
const hasEnrichedContent = protectedColumns.some((key) => hasValue(row[key]));
const isEnriched = truthy(row.is_enriched);
const guardBlocked = (isEnriched || hasEnrichedContent) && !forceUpdate;
const fragranceFacts = buildFragranceFacts(source, row);
const prompt = buildAnthropicPrompt(fragranceFacts);

if (guardBlocked) {
  return {
    json: {
      ...source,
      should_call_anthropic: false,
      enrichment_status: 'skipped_existing_enrichment',
      enrichment_guard: {
        blocked: true,
        reason: isEnriched ? 'is_enriched_true' : 'existing_enriched_content',
        force_update: forceUpdate,
        protected_columns: protectedColumns.filter((key) => hasValue(row[key]))
      },
      anthropic_prompt: prompt,
      fragrance_product_update: null
    }
  };
}

const rawResponse = firstNonEmpty(
  source.anthropic_response,
  source.anthropic_output,
  source.enrichment_response,
  source.llm_response
);
const parsed = rawResponse ? parseAnthropicJson(rawResponse) : null;
const mapped = parsed && parsed.ok ? mapEnrichmentToColumns(parsed.value, row, existingTags) : null;
const status = rawResponse
  ? (mapped ? 'enriched_ready' : 'enrichment_parse_failed')
  : 'prompt_ready';

return {
  json: {
    ...source,
    should_call_anthropic: !rawResponse,
    enrichment_status: status,
    enrichment_guard: {
      blocked: false,
      force_update: forceUpdate,
      protected_columns: protectedColumns.filter((key) => hasValue(row[key]))
    },
    anthropic_prompt: prompt,
    parsed_enrichment: parsed ? parsed.value : null,
    enrichment_parse_error: parsed && !parsed.ok ? parsed.error : null,
    fragrance_product_update: mapped,
    fragrance_product_update_contract: {
      table: 'fragrance_products',
      key: 'id',
      key_value: row.id || source.fragrance_product_id || null,
      method: 'PATCH',
      note: 'Live agent must wire this payload; this Code node performs no HTTP call.'
    }
  }
};

function buildFragranceFacts(input, existingRow) {
  const brandNameEn = firstNonEmpty(input.brand_name_en, input.brandNameEn, input.brand_name, existingRow.brand_name_en, existingRow.brand_name, input.brand && input.brand.name_en);
  const brandNameAr = firstNonEmpty(input.brand_name_ar, input.brandNameAr, existingRow.brand_name_ar, input.brand && input.brand.name_ar);
  const normalizedName = firstNonEmpty(input.normalized_name, input.normalizedName, existingRow.normalized_name);
  const canonicalNameEn = firstNonEmpty(input.canonical_name_en, input.canonicalNameEn, existingRow.name_en, existingRow.canonical_name_en, normalizedName);
  const canonicalNameAr = firstNonEmpty(input.canonical_name_ar, input.canonicalNameAr, existingRow.name_ar, existingRow.canonical_name_ar);
  return {
    brand_name_en: brandNameEn || '',
    brand_name_ar: brandNameAr || '',
    normalized_name: normalizedName || '',
    canonical_name_en: canonicalNameEn || '',
    canonical_name_ar: canonicalNameAr || '',
    concentration: firstNonEmpty(input.concentration, existingRow.concentration) || '',
    gender_target: firstNonEmpty(input.gender_target, input.gender, existingRow.gender_target) || '',
    size_ml: firstNonEmpty(input.size_ml, input.sizeMl, existingRow.size_ml) || '',
    supplier_title: firstNonEmpty(input.title, input.name, input.normalized_title, input.rawTitle) || '',
    supplier_description: firstNonEmpty(input.description, input.supplier_description, input.raw_description) || '',
    existing_tags: normalizeTags(existingRow.tags || input.tags)
  };
}

function buildAnthropicPrompt(facts) {
  const schema = {
    description_ar: 'Arabic luxury product description, 90-130 words, truthful, no unverifiable claims.',
    description_en: 'Concise English product description, 45-70 words, factual and retail-safe.',
    seo_title_ar: 'Arabic SEO title, max 65 characters.',
    seo_title_en: 'English SEO title, max 65 characters.',
    seo_description_ar: 'Arabic meta description, max 155 characters.',
    seo_description_en: 'English meta description, max 155 characters.',
    seo_keywords: ['5-10 Arabic/English keyword phrases, no duplicates.'],
    tags: ['Optional extra collection tags; keep existing tags when mapping.']
  };
  return {
    system: [
      'You write luxury fragrance catalog copy for Calapres.',
      'Return strict JSON only. Do not include markdown.',
      'Use the supplied facts only. Do not invent notes, perfumer, launch year, awards, concentration, size, or gender.',
      'Arabic copy should sound premium, warm, and retail-safe for Saudi customers.'
    ].join(' '),
    user: [
      'Create enrichment copy and SEO for this fragrance parent.',
      '',
      'Facts:',
      JSON.stringify(facts, null, 2),
      '',
      'Return JSON with exactly these keys:',
      JSON.stringify(schema, null, 2)
    ].join('\n'),
    response_format: 'json_object',
    target_columns: [
      'description_ar',
      'description_en',
      'seo_title_ar',
      'seo_title_en',
      'seo_description_ar',
      'seo_description_en',
      'seo_keywords',
      'tags',
      'is_enriched',
      'enrichment_status',
      'enriched_at'
    ]
  };
}

function parseAnthropicJson(response) {
  const text = extractText(response);
  if (!text) return { ok: false, value: null, error: 'empty_response_text' };
  const candidates = [
    text,
    text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(),
    extractJsonObject(text)
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return { ok: true, value: parsed, error: null };
    } catch (_err) {
      // Try the next candidate.
    }
  }
  return { ok: false, value: null, error: 'invalid_json_response' };
}

function mapEnrichmentToColumns(parsed, existingRow, existingTags) {
  const cleaned = {
    description_ar: cleanText(parsed.description_ar),
    description_en: cleanText(parsed.description_en),
    seo_title_ar: limit(cleanText(parsed.seo_title_ar), 65),
    seo_title_en: limit(cleanText(parsed.seo_title_en), 65),
    seo_description_ar: limit(cleanText(parsed.seo_description_ar), 155),
    seo_description_en: limit(cleanText(parsed.seo_description_en), 155),
    seo_keywords: normalizeKeywords(parsed.seo_keywords),
    tags: mergeTags(existingTags, parsed.tags, ['enriched']),
    is_enriched: true,
    enrichment_status: 'enriched',
    enriched_at: new Date().toISOString()
  };
  const required = ['description_ar', 'seo_title_ar', 'seo_title_en', 'seo_description_ar', 'seo_description_en'];
  const missing = required.filter((key) => !hasValue(cleaned[key]));
  if (missing.length > 0) {
    return {
      enrichment_status: 'needs_review',
      enrichment_error: 'missing_required_fields:' + missing.join(','),
      tags: mergeTags(existingTags, parsed.tags, [])
    };
  }
  return cleaned;
}

function extractText(response) {
  if (typeof response === 'string') return response.trim();
  if (!response || typeof response !== 'object') return '';
  if (typeof response.text === 'string') return response.text.trim();
  if (typeof response.content === 'string') return response.content.trim();
  if (Array.isArray(response.content)) {
    return response.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('\n')
      .trim();
  }
  if (response.message) return extractText(response.message);
  if (response.data) return extractText(response.data);
  return '';
}

function extractJsonObject(text) {
  const raw = String(text || '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return start >= 0 && end > start ? raw.slice(start, end + 1) : '';
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function limit(value, max) {
  const text = cleanText(value);
  return text.length > max ? text.slice(0, max - 1).trim() : text;
}

function normalizeKeywords(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(/[,،]/);
  const seen = {};
  const out = [];
  for (const item of raw) {
    const text = cleanText(item);
    const key = text.toLowerCase();
    if (text && !seen[key]) {
      seen[key] = true;
      out.push(text);
    }
  }
  return out.slice(0, 10);
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeTags(parsed);
    } catch (_err) {
      // Treat non-JSON strings as comma-separated tags.
    }
    return trimmed.split(/[,،]/).map(cleanText).filter(Boolean);
  }
  return [];
}

function mergeTags() {
  const seen = {};
  const out = [];
  for (let i = 0; i < arguments.length; i += 1) {
    for (const tag of normalizeTags(arguments[i])) {
      const key = tag.toLowerCase();
      if (!seen[key]) {
        seen[key] = true;
        out.push(tag);
      }
    }
  }
  return out;
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function truthy(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function firstNonEmpty() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (hasValue(value)) return value;
  }
  return null;
}
