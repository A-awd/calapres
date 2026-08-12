'use strict';

const {
  assertCompiledContextFreshAt,
  canonicalize,
  sha256Canonical,
  verifyCompiledContext,
} = require('./context-compiler');
const {
  loadTrustedCompiledContextReleasePin,
} = require('./compiled-context-trust-root');

const CHANNELS = new Set(['instagram', 'tiktok', 'whatsapp', 'email']);
const INTENTS = new Set([
  'faq',
  'order_status',
  'tracking',
  'inventory',
  'product_question',
  'shipping_policy',
  'return_request',
  'complaint',
  'order_change',
  'cancellation',
  'refund',
  'privacy',
  'legal',
  'payment_dispute',
  'security',
  'general',
  'unknown',
]);
const RISKS = new Set(['low', 'medium', 'high', 'unknown']);
const ACTIONS = new Set([
  'answer',
  'none',
  'read_fact',
  'draft_reply',
  'modify_order',
  'cancel_order',
  'issue_refund',
  'disclose_data',
  'approve_exception',
  'unknown',
]);
const SENSITIVE_INTENTS = new Set([
  'return_request',
  'complaint',
  'order_change',
  'cancellation',
  'refund',
  'privacy',
  'legal',
  'payment_dispute',
  'security',
]);
const LIVE_FACT_INTENTS = new Set(['order_status', 'tracking', 'inventory']);
const MUTATING_ACTIONS = new Set([
  'modify_order',
  'cancel_order',
  'issue_refund',
  'disclose_data',
  'approve_exception',
]);
const CANDIDATE_KEYS = Object.freeze([
  'intent',
  'risk',
  'requested_action',
  'draft_text',
  'confidence',
  'knowledge_fact_ids',
  'live_fact_ids',
  'needs_live_lookup',
  'escalation_reason_code',
]);
const RESPONSE_KEYS = Object.freeze([
  'schema_version',
  'request_ref',
  'request_digest',
  'compiled_context_digest',
  'candidate',
]);
const REQUEST_KEYS = Object.freeze([
  'schema_version',
  'task',
  'context_release_id',
  'request_ref',
  'brand_id',
  'channel',
  'locale',
  'evaluated_at',
  'expires_at',
  'compiled_context_digest',
  'trust_anchor_digest',
  'brand_isolation_digest',
  'customer_excerpt',
  'context',
  'response_contract',
  'constraints',
  'request_digest',
]);
const REDACTION_TYPES = Object.freeze([
  'email',
  'phone',
  'order_ref',
  'payment',
  'government_id',
  'address',
  'url',
  'social_handle',
  'long_number',
]);
const KNOWLEDGE_ID_PATTERN = /^[a-z][a-z0-9._:-]{2,120}$/;
const LIVE_FACT_ID_PATTERN = /^(?:lf_[a-f0-9]{64}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/;
const ESCALATION_REASON_CODES = new Set([
  'live_lookup_required',
  'owner_review_required',
]);
const REQUEST_REF_PATTERN = /^lr_[a-f0-9]{64}$/;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_RAW_MESSAGE_BYTES = 8192;
const MAX_EXCERPT_CHARS = 1200;
const MAX_REQUEST_BYTES = 12288;
const MAX_RESPONSE_BYTES = 32768;
const MAX_KNOWLEDGE_OPTIONS = 8;
const MAX_LIVE_FACT_OPTIONS = 8;
const MAX_CLASSIFICATION_HINT_CHARS = 600;
const REQUEST_TTL_SECONDS = 300;
const MAX_RESPONSE_CLOCK_SKEW_MS = 30_000;
const MAX_CANONICAL_DECODE_DEPTH = 4;
const MAX_CANONICAL_VIEWS = 64;
const MAX_ENCODED_TOKENS_PER_VIEW = 16;
const MAX_BASE64_CHUNKS = 8;
const MAX_BASE64_DECODED_BYTES = 8192;
const MAX_BASE64_SEPARATOR_CHARS = 16;
const MAX_CONFUSABLE_SKELETON_CHARS = 8192;
const EMAIL_PATTERN = /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]+@[\p{L}\p{N}](?:[\p{L}\p{N}.-]{0,251})\.[\p{L}]{2,63}(?![\p{L}\p{N}.-])/giu;
const SAUDI_PHONE_PATTERN = /(?<!\d)(?:(?:\+|00)?966[.\s-]?)?0?5\d(?:[.\s-]?\d){7}(?!\d)/gu;
const INTERNATIONAL_PHONE_PATTERN = /(?<!\w)\+\d(?:[.\s-]?\d){7,14}(?!\d)/gu;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>{}\[\]"]+/giu;
const SOCIAL_HANDLE_PATTERN = /(^|[^\p{L}\p{N}_.])@[A-Za-z0-9._]{2,30}/gu;
const ORDER_REFERENCE_PATTERN = /(?:رقم\s*(?:الطلب|الشحنة|التتبع)?|طلب(?:ي)?|شحنة|تتبع|order|tracking)\s*[:#-]?\s*[A-Z0-9-]{4,}/giu;
const SHORT_HASH_REFERENCE_PATTERN = /(?<![\p{L}\p{N}])#[A-Z0-9-]{4,}(?![\p{L}\p{N}])/giu;
const LONG_NUMBER_PATTERN = /(?<!\d)#?\d{5,}(?!\d)/gu;
const CONTROL_OR_BIDI_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu;
const REDACTION_MARKER_PATTERN = /\[(?:EMAIL|PHONE|ORDER_REF|URL|SOCIAL_HANDLE|LONG_NUMBER)_REDACTED\]/u;
const ACTION_COMPLETION_PATTERN = /(?:تم\s+(?:التعديل|تعديل|الإلغاء|إلغاء|الغاء|الاسترجاع|استرجاع|التعويض|تعويض|رد\s+المبلغ)|ألغيت|عدلت|رجعت\s+المبلغ)/u;
const FALSE_HUMAN_IDENTITY_PATTERN = /(?:أنا\s+(?:موظف|إنسان|بشر)|موظف\s+حقيقي)/u;
const OBFUSCATED_EMAIL_PATTERN = /[\p{L}\p{N}._%+-]+\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|\s+at\s+)\s*[\p{L}\p{N}.-]+\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\s+dot\s+)\s*[\p{L}]{2,63}/iu;
const PASSPORT_PATTERN = /(?:جواز(?:\s*السفر)?|passport)\D{0,16}(?:[A-Z]\d{6,9}|\d{7,10})\b/iu;
const ARABIC_MARKS_OR_TATWEEL_PATTERN = /[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
const SECURITY_SEPARATOR_PATTERN = /[\p{Z}\p{Cf}\p{Pd}_•·⋅∙・]+/gu;
const SECURITY_NON_ALNUM_PATTERN = /[^\p{L}\p{N}]+/gu;
const COMPACT_EMAIL_PATTERN = /[\p{L}\p{N}.%+-]{1,64}@[\p{L}\p{N}.-]{1,253}\.[\p{L}]{2,63}/iu;
const COMPACT_PHONE_PATTERN = /(?:966)?0?5\d{8}/u;
const NAMED_HTML_ENTITIES = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['bsol', '\\'],
  ['colon', ':'],
  ['commat', '@'],
  ['gt', '>'],
  ['lcub', '{'],
  ['lpar', '('],
  ['lsqb', '['],
  ['lt', '<'],
  ['newline', '\n'],
  ['nbsp', ' '],
  ['num', '#'],
  ['percnt', '%'],
  ['period', '.'],
  ['quot', '"'],
  ['rcub', '}'],
  ['rpar', ')'],
  ['rsqb', ']'],
  ['sol', '/'],
  ['tab', '\t'],
]);
const CONFUSABLE_SKELETON_MAP = Object.freeze({
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '\u0430': 'a',
  '\u0435': 'e',
  '\u0456': 'i',
  '\u043a': 'k',
  '\u04cf': 'l',
  '\u043e': 'o',
  '\u0440': 'p',
  '\u0441': 'c',
  '\u0455': 's',
  '\u0442': 't',
  '\u0445': 'x',
  '\u0443': 'y',
  '\u03b1': 'a',
  '\u03b2': 'b',
  '\u03b5': 'e',
  '\u03b9': 'i',
  '\u03ba': 'k',
  '\u03bd': 'v',
  '\u03bf': 'o',
  '\u03c1': 'p',
  '\u03c4': 't',
  '\u03c5': 'y',
  '\u03c7': 'x',
  '\u03f2': 'c',
});

class LlmBoundaryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LlmBoundaryError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new LlmBoundaryError(code, message);
}

function parseTimestamp(value, code, location) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    fail(code, `${location} must be an ISO-8601 date-time`);
  }
  return new Date(value);
}

function trustedParserNow(dependencies) {
  assertExactKeys(dependencies, [], ['clock'], 'parser_clock_invalid', 'parser dependencies');
  if (Object.prototype.hasOwnProperty.call(dependencies, 'clock') && typeof dependencies.clock !== 'function') {
    fail('parser_clock_invalid', 'parser clock dependency must be a function');
  }
  const value = dependencies.clock ? dependencies.clock() : new Date();
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    fail('parser_clock_invalid', 'parser clock returned an invalid Date');
  }
  return new Date(value.getTime());
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function exactKeys(value, required, optional = []) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    keys.every((key) => allowed.has(key));
}

function assertExactKeys(value, required, optional, code, location) {
  if (!exactKeys(value, required, optional)) {
    fail(code, `${location} has an invalid shape`);
  }
}

function normalizeDigits(value) {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  return value.replace(/[٠-٩۰-۹]/gu, (digit) => {
    const arabicIndex = arabic.indexOf(digit);
    return String(arabicIndex >= 0 ? arabicIndex : persian.indexOf(digit));
  });
}

function securityFold(value) {
  return normalizeDigits(value.normalize('NFKC'))
    .replace(ARABIC_MARKS_OR_TATWEEL_PATTERN, '')
    .replace(CONTROL_OR_BIDI_PATTERN, '')
    .toLocaleLowerCase('en-US');
}

function securityVariants(value) {
  const folded = securityFold(value);
  const collapsed = folded.replace(SECURITY_SEPARATOR_PATTERN, '');
  const compact = folded.replace(SECURITY_NON_ALNUM_PATTERN, '');
  return [...new Set([folded, collapsed, compact])];
}

function confusableSkeleton(value) {
  const compact = securityFold(value).replace(SECURITY_NON_ALNUM_PATTERN, '');
  const characters = [...compact];
  if (characters.length > MAX_CONFUSABLE_SKELETON_CHARS) return null;
  return characters.map((character) => CONFUSABLE_SKELETON_MAP[character] || character).join('');
}

function hasMixedConfusableScriptToken(value) {
  const tokens = securityFold(value).match(/[\p{L}\p{N}]+/gu) || [];
  for (const token of tokens) {
    const scripts = new Set();
    for (const character of token) {
      if (/\p{Script=Latin}/u.test(character)) scripts.add('latin');
      else if (/\p{Script=Cyrillic}/u.test(character)) scripts.add('cyrillic');
      else if (/\p{Script=Greek}/u.test(character)) scripts.add('greek');
    }
    if (
      scripts.size > 1 &&
      (scripts.has('latin') || scripts.has('cyrillic') || scripts.has('greek'))
    ) {
      return true;
    }
  }
  return false;
}

function decodeHtmlEntitiesBounded(value) {
  let output = '';
  let transformed = false;
  for (let index = 0; index < value.length;) {
    if (value[index] !== '&') {
      output += value[index];
      index += 1;
      continue;
    }

    if (value[index + 1] === '#') {
      let cursor = index + 2;
      let radix = 10;
      let digitPattern = /[0-9]/u;
      let maximumDigits = 7;
      if (value[cursor] === 'x' || value[cursor] === 'X') {
        radix = 16;
        digitPattern = /[0-9a-f]/iu;
        maximumDigits = 6;
        cursor += 1;
      }
      const digitsStart = cursor;
      while (cursor < value.length && digitPattern.test(value[cursor]) && cursor - digitsStart <= maximumDigits) {
        cursor += 1;
      }
      const digitCount = cursor - digitsStart;
      if (
        digitCount === 0 ||
        digitCount > maximumDigits ||
        (cursor < value.length && digitPattern.test(value[cursor]))
      ) {
        return { value, transformed, malformed: true };
      }
      const codePoint = Number.parseInt(value.slice(digitsStart, cursor), radix);
      if (
        !Number.isInteger(codePoint) ||
        codePoint < 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return { value, transformed, malformed: true };
      }
      if (value[cursor] === ';') cursor += 1;
      try {
        output += String.fromCodePoint(codePoint);
      } catch {
        return { value, transformed, malformed: true };
      }
      transformed = true;
      index = cursor;
      continue;
    }

    let cursor = index + 1;
    while (cursor < value.length && /[a-z]/iu.test(value[cursor]) && cursor - index <= 21) {
      cursor += 1;
    }
    const name = value.slice(index + 1, cursor);
    const hasSemicolon = value[cursor] === ';';
    if (name.length < 2) {
      output += '&';
      index += 1;
      continue;
    }
    if (name.length > 20 || (cursor < value.length && /[a-z]/iu.test(value[cursor]))) {
      return { value, transformed, malformed: true };
    }
    const normalizedName = name.toLowerCase();
    if (!NAMED_HTML_ENTITIES.has(normalizedName)) {
      return { value, transformed, malformed: true };
    }
    if (!hasSemicolon && cursor < value.length && /[a-z0-9]/iu.test(value[cursor])) {
      return { value, transformed, malformed: true };
    }
    output += NAMED_HTML_ENTITIES.get(normalizedName);
    transformed = true;
    index = cursor + (hasSemicolon ? 1 : 0);
  }
  return { value: output, transformed, malformed: false };
}

function hasCanonicalBase64Padding(token) {
  if (!/^[A-Za-z0-9+/_-]+={1,2}$/u.test(token) || token.length % 4 !== 0) return false;
  const paddingLength = token.length - token.replace(/=+$/u, '').length;
  const unpadded = token.slice(0, -paddingLength);
  if (
    (paddingLength === 1 && unpadded.length % 4 !== 3) ||
    (paddingLength === 2 && unpadded.length % 4 !== 2)
  ) {
    return false;
  }
  const normalized = unpadded.replace(/-/gu, '+').replace(/_/gu, '/');
  let bytes;
  try {
    bytes = Buffer.from(`${normalized}${'='.repeat(paddingLength)}`, 'base64');
  } catch {
    return false;
  }
  if (bytes.length === 0 || bytes.length > MAX_BASE64_DECODED_BYTES) return false;
  const standard = bytes.toString('base64').replace(/=+$/u, '');
  const urlSafe = bytes.toString('base64url');
  return unpadded === standard || unpadded === urlSafe;
}

function decodeCanonicalBase64Token(token) {
  const unpadded = token.replace(/=+$/u, '');
  if (unpadded.length % 4 === 1) return null;
  const normalized = unpadded.replace(/-/gu, '+').replace(/_/gu, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  let bytes;
  try {
    bytes = Buffer.from(padded, 'base64');
  } catch {
    return null;
  }
  if (bytes.length === 0 || bytes.length > MAX_BASE64_DECODED_BYTES) return null;
  const standard = bytes.toString('base64').replace(/=+$/u, '');
  const urlSafe = bytes.toString('base64url');
  if (unpadded !== standard && unpadded !== urlSafe) return null;
  const decoded = bytes.toString('utf8');
  const characters = [...decoded];
  if (
    decoded.includes('\uFFFD') ||
    Buffer.byteLength(decoded, 'utf8') > MAX_BASE64_DECODED_BYTES ||
    characters.length === 0 ||
    characters.filter((character) => /[\p{L}\p{N}\p{P}\p{Z}\n\r\t]/u.test(character)).length /
      characters.length < 0.8
  ) {
    return null;
  }
  return decoded;
}

function base64RunHasStrongSignal(tokens, separators, decoded) {
  if (decoded !== null) return true;
  if (tokens.some((token) => /[=+/_]/u.test(token))) return true;
  if (separators.some((separator) => !/^[\p{Z}\t\r\n]+$/u.test(separator))) return true;
  const lengths = tokens.slice(0, -1).map((token) => token.length);
  const uniformChunks = lengths.length >= 2 && new Set(lengths).size === 1;
  const joined = tokens.join('').replace(/=+$/u, '');
  return uniformChunks && joined.length >= 16 && /[a-z]/u.test(joined) && /[A-Z]/u.test(joined);
}

function decodeChunkedBase64Runs(value) {
  if (/[A-Za-z0-9+/_-]+={3,}/u.test(value)) {
    return { decoded: [], malformed: true };
  }
  const tokens = [];
  const tokenPattern = /[A-Za-z0-9+/_-]+={0,2}/gu;
  for (const match of value.matchAll(tokenPattern)) {
    if (match[0].length > 4096) return { decoded: [], malformed: true };
    tokens.push({ value: match[0], start: match.index, end: match.index + match[0].length });
  }

  const decoded = [];
  let groupTokens = [];
  let groupSeparators = [];
  let groupEnd = null;
  const flush = () => {
    if (groupTokens.length < 2) {
      groupTokens = [];
      groupSeparators = [];
      groupEnd = null;
      return false;
    }
    const joined = groupTokens.join('');
    const decodedValue = joined.length >= 16 ? decodeCanonicalBase64Token(joined) : null;
    const strongSignal = base64RunHasStrongSignal(groupTokens, groupSeparators, decodedValue);
    if (groupTokens.length > MAX_BASE64_CHUNKS) {
      groupTokens = [];
      groupSeparators = [];
      groupEnd = null;
      return strongSignal;
    }
    if (decodedValue !== null) decoded.push(decodedValue);
    const malformed = decodedValue === null && strongSignal;
    groupTokens = [];
    groupSeparators = [];
    groupEnd = null;
    return malformed;
  };

  for (const token of tokens) {
    if (groupTokens.length === 0) {
      groupTokens.push(token.value);
      groupEnd = token.end;
      continue;
    }
    const separator = value.slice(groupEnd, token.start);
    const separatorAllowed =
      separator.length > 0 &&
      separator.length <= MAX_BASE64_SEPARATOR_CHARS &&
      /^[\p{Z}\t\r\n|]+$/u.test(separator);
    const previousHasPadding = /=/u.test(groupTokens[groupTokens.length - 1]);
    if (
      separator.length === 0 &&
      previousHasPadding &&
      hasCanonicalBase64Padding(groupTokens[groupTokens.length - 1])
    ) {
      return { decoded, malformed: true };
    }
    if (separatorAllowed && previousHasPadding) {
      return { decoded, malformed: true };
    }
    if (!separatorAllowed || previousHasPadding) {
      if (flush()) return { decoded, malformed: true };
      groupTokens.push(token.value);
    } else {
      groupSeparators.push(separator);
      groupTokens.push(token.value);
    }
    groupEnd = token.end;
  }
  if (flush()) return { decoded, malformed: true };
  return { decoded: [...new Set(decoded)], malformed: false };
}

function boundedCanonicalViews(value) {
  const views = [];
  const seen = new Set();
  const queue = [{ value, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (typeof current.value !== 'string' || Buffer.byteLength(current.value, 'utf8') > MAX_RAW_MESSAGE_BYTES) {
      return { views, malformed_encoding: true };
    }
    if (seen.has(current.value)) continue;
    seen.add(current.value);
    views.push(current.value);
    if (views.length > MAX_CANONICAL_VIEWS) return { views, malformed_encoding: true };
    if (/%(?![0-9a-f]{2})[a-z0-9]{1,2}/iu.test(current.value)) {
      return { views, malformed_encoding: true };
    }
    const decodedHtml = decodeHtmlEntitiesBounded(current.value);
    if (decodedHtml.malformed) return { views, malformed_encoding: true };
    const chunkedBase64 = decodeChunkedBase64Runs(current.value);
    if (chunkedBase64.malformed) return { views, malformed_encoding: true };
    if (current.depth >= MAX_CANONICAL_DECODE_DEPTH) {
      const remainingTokens = current.value.match(
        /(?<![A-Za-z0-9+/_-])[A-Za-z0-9+/_-]{16,4096}={0,2}(?![A-Za-z0-9+/_-])/gu,
      ) || [];
      if (
        decodedHtml.transformed ||
        /%[0-9a-f]{2}/iu.test(current.value) ||
        remainingTokens.some((token) => decodeCanonicalBase64Token(token) !== null) ||
        chunkedBase64.decoded.length > 0
      ) {
        return { views, malformed_encoding: true };
      }
      continue;
    }

    if (decodedHtml.transformed) {
      queue.push({ value: decodedHtml.value, depth: current.depth + 1 });
    }

    if (/%[0-9a-f]{2}/iu.test(current.value)) {
      try {
        const decodedPercent = decodeURIComponent(current.value);
        if (decodedPercent !== current.value) {
          queue.push({ value: decodedPercent, depth: current.depth + 1 });
        }
      } catch {
        return { views, malformed_encoding: true };
      }
    }

    const tokens = current.value.match(
      /(?<![A-Za-z0-9+/_-])[A-Za-z0-9+/_-]{16,4096}={0,2}(?![A-Za-z0-9+/_-])/gu,
    ) || [];
    if (tokens.length > MAX_ENCODED_TOKENS_PER_VIEW) return { views, malformed_encoding: true };
    for (const token of tokens) {
      const decodedToken = decodeCanonicalBase64Token(token);
      if (decodedToken !== null) queue.push({ value: decodedToken, depth: current.depth + 1 });
    }
    for (const decodedValue of chunkedBase64.decoded) {
      queue.push({ value: decodedValue, depth: current.depth + 1 });
    }
    if (queue.length + views.length > MAX_CANONICAL_VIEWS * 2) {
      return { views, malformed_encoding: true };
    }
  }
  return { views, malformed_encoding: false };
}

function hasObfuscatedPhone(value) {
  const candidates = value.match(/(?<!\d)(?:\+?\s*9\s*6\s*6\s*)?0?\s*5(?:[^\p{L}\p{N}]?\d){8}(?!\d)/gu) || [];
  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/gu, '');
    return /^(?:966)?0?5\d{8}$/u.test(digits) && /[^\d+.\s-]/u.test(candidate);
  });
}

function regexMatches(pattern, value) {
  pattern.lastIndex = 0;
  const matched = pattern.test(value);
  pattern.lastIndex = 0;
  return matched;
}

function obfuscatedRiskType(value) {
  const variants = securityVariants(value);
  const folded = variants[0];
  if (
    OBFUSCATED_EMAIL_PATTERN.test(folded) ||
    (!regexMatches(EMAIL_PATTERN, folded) && variants.some((entry) => COMPACT_EMAIL_PATTERN.test(entry)))
  ) {
    return 'email';
  }
  if (
    hasObfuscatedPhone(folded) ||
    (!regexMatches(SAUDI_PHONE_PATTERN, folded) &&
      !regexMatches(INTERNATIONAL_PHONE_PATTERN, folded) &&
      variants.some((entry) => COMPACT_PHONE_PATTERN.test(entry)))
  ) {
    return 'phone';
  }
  if (variants.some((entry) => PASSPORT_PATTERN.test(entry))) return 'government_id';
  return null;
}

function encodedOrObfuscatedRisk(value, forbiddenBrandNames) {
  const canonical = boundedCanonicalViews(value);
  if (canonical.malformed_encoding) return { blocked: true, type: null };
  for (const [index, view] of canonical.views.entries()) {
    const normalized = securityFold(view);
    const type = obfuscatedRiskType(normalized);
    if (type !== null) return { blocked: true, type };
    if (
      index > 0 &&
      (directIdentifierPresent(normalized) ||
        hasPromptInjection(normalized) ||
        hasCrossBrandReference(normalized, forbiddenBrandNames))
    ) {
      return { blocked: true, type: null };
    }
  }
  return { blocked: false, type: null };
}

function stripEmailHistory(value) {
  const lines = value.split(/\r?\n/u);
  const kept = [];
  for (const line of lines) {
    if (
      /^\s*(?:On .+ wrote:|في .+ كتب:|From:|To:|Cc:|Bcc:|Subject:|Date:|من:|إلى:|نسخة:|الموضوع:|التاريخ:|-----Original Message-----)/iu.test(line)
    ) {
      break;
    }
    if (/^\s*(?:--\s*$|Sent from my |أرسلت من )/iu.test(line)) break;
    if (/^\s*>/u.test(line)) continue;
    kept.push(line);
  }
  return kept.join('\n');
}

function luhnValid(digits) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function hasPaymentData(value) {
  if (/\bSA\d{2}(?:[\s-]?[A-Z0-9]){20,24}\b/iu.test(value)) return true;
  if (/(?:CVV|CVC|رمز\s*الأمان)\s*[:#-]?\s*\d{3,4}/iu.test(value)) return true;
  const cardCandidates = value.match(/(?:\d[\s-]?){13,19}/gu) || [];
  return cardCandidates.some((candidate) => luhnValid(candidate.replace(/\D/gu, ''))) ||
    /(?:بطاقة|كرت|card)\D{0,20}(?:\d[\s-]?){13,19}/iu.test(value);
}

function hasGovernmentId(value) {
  return /(?:هوية|هويتي|الإقامة|اقامة|إقامتي|اقامتي|سجل\s*مدني|identity|iqama)\D{0,16}[12]\d{9}\b/iu.test(value) ||
    PASSPORT_PATTERN.test(value);
}

function hasAddressRisk(value) {
  if (/-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/u.test(value)) return true;
  return /(?<![\p{L}\p{N}])(?:العنوان\s*الوطني|عنواني|عنوان\s*التوصيل|الرمز\s*البريدي|شارع|حي|مبنى|شقة|address|street|district|building|apartment|postal\s*code)(?![\p{L}\p{N}])\s*[:#-]?\s*[\p{L}\p{N}][^\n]{3,}/iu.test(value);
}

function hasPromptInjection(value) {
  const folded = securityFold(value);
  const compact = folded.replace(SECURITY_NON_ALNUM_PATTERN, '');
  const decodedCandidates = folded.match(/\b[A-Za-z0-9+/_-]{32,}={0,2}\b/gu) || [];
  if (decodedCandidates.length > 0) return true;
  return /(?:تجاهل|تجاوز|انس(?:ى|ي)|اكسر|اعرض|اظهر|غير).{0,40}(?:التعليمات|النظام|البرومبت|السياس(?:ة|ه)|الحماي(?:ة|ه)|القيود)|(?:system\s*prompt|developer\s*message|ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|reveal\s+(?:the\s+)?prompt|tool\s*call|credential|api[_ -]?key)/iu.test(folded) ||
    /(?:تجاهل|تجاوز|انسى|انسي|اكسر|اعرض|اظهر|غير).{0,40}(?:التعليمات|النظام|البرومبت|السياس(?:ة|ه)|الحماي(?:ة|ه)|القيود)|(?:systemprompt|developermessage|ignore(?:all)?(?:previous|prior)instructions|reveal(?:the)?prompt|toolcall|credential|apikey)/iu.test(compact);
}

function normalizeForbiddenBrandNames(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    fail('brand_isolation_policy_invalid', 'forbidden_brand_names must be a non-empty bounded array');
  }
  const normalized = value.map((entry) => {
    if (typeof entry !== 'string' || entry.trim().length < 2 || entry.length > 80) {
      fail('brand_isolation_policy_invalid', 'forbidden brand names must be bounded strings');
    }
    const skeleton = confusableSkeleton(entry);
    if (skeleton === null || skeleton.length < 2) {
      fail('brand_isolation_policy_invalid', 'forbidden brand names cannot be skeletonized safely');
    }
    return skeleton;
  });
  if (new Set(normalized).size !== normalized.length) {
    fail('brand_isolation_policy_invalid', 'forbidden brand names must be unique');
  }
  return normalized.sort();
}

function hasCrossBrandReference(value, forbiddenBrandNames) {
  if (hasMixedConfusableScriptToken(value)) return true;
  const skeleton = confusableSkeleton(value);
  if (skeleton === null) return true;
  return forbiddenBrandNames.some((brand) => skeleton.includes(brand));
}

function countMatches(value, pattern) {
  pattern.lastIndex = 0;
  const matches = value.match(pattern);
  pattern.lastIndex = 0;
  return matches ? matches.length : 0;
}

function replaceAndCount(value, pattern, replacement) {
  const count = countMatches(value, pattern);
  pattern.lastIndex = 0;
  return { value: value.replace(pattern, replacement), count };
}

function emptyRedactionCounts() {
  return Object.fromEntries(REDACTION_TYPES.map((type) => [type, 0]));
}

function sanitizerResult(brandId, channel, disposition, reasonCode, counts, guard, excerpt = null, truncated = false) {
  return {
    schema_version: '1.0',
    brand_id: brandId,
    channel,
    disposition,
    reason_code: reasonCode,
    excerpt,
    excerpt_truncated: truncated,
    redaction_counts: counts,
    guard,
    persistable: false,
    customer_egress_allowed: false,
  };
}

function sanitizeCustomerText(options) {
  const required = ['brand_id', 'channel', 'content_kind', 'current_message', 'forbidden_brand_names'];
  assertExactKeys(options, required, [], 'sanitizer_input_invalid', 'sanitizer input');
  const { brand_id: brandId, channel, content_kind: contentKind } = options;
  if (typeof brandId !== 'string' || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(brandId)) {
    fail('sanitizer_input_invalid', 'brand_id is invalid');
  }
  if (!CHANNELS.has(channel)) fail('sanitizer_input_invalid', 'channel is invalid');
  if (!['text', 'media', 'mixed', 'unsupported'].includes(contentKind)) {
    fail('sanitizer_input_invalid', 'content_kind is invalid');
  }
  const forbiddenBrandNames = normalizeForbiddenBrandNames(options.forbidden_brand_names);
  const counts = emptyRedactionCounts();
  const baseGuard = {
    prompt_injection_suspected: false,
    cross_brand_suspected: false,
    must_escalate: false,
    minimum_risk: 'low',
  };
  if (contentKind === 'media' || contentKind === 'unsupported') {
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'attachment_only',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'unknown' },
    );
  }
  if (typeof options.current_message !== 'string') {
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'no_semantic_text',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'unknown' },
    );
  }
  if (Buffer.byteLength(options.current_message, 'utf8') > MAX_RAW_MESSAGE_BYTES) {
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'message_too_large',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'unknown' },
    );
  }
  let value = normalizeDigits(options.current_message.normalize('NFKC'));
  value = value.replace(CONTROL_OR_BIDI_PATTERN, '');
  if (channel === 'email') value = stripEmailHistory(value);
  const encodedRisk = encodedOrObfuscatedRisk(value, forbiddenBrandNames);
  if (encodedRisk.blocked) {
    if (encodedRisk.type !== null) counts[encodedRisk.type] = 1;
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'encoded_or_obfuscated_risk',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'high' },
    );
  }
  if (hasPaymentData(value)) {
    counts.payment = 1;
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'payment_data_detected',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'high' },
    );
  }
  if (hasGovernmentId(value)) {
    counts.government_id = 1;
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'government_id_detected',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'high' },
    );
  }
  if (hasAddressRisk(value)) {
    counts.address = 1;
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'address_risk_detected',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'high' },
    );
  }
  if (hasPromptInjection(value)) {
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'prompt_injection_suspected',
      counts,
      {
        ...baseGuard,
        prompt_injection_suspected: true,
        must_escalate: true,
        minimum_risk: 'high',
      },
    );
  }
  if (hasCrossBrandReference(value, forbiddenBrandNames)) {
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'cross_brand_scope_suspected',
      counts,
      {
        ...baseGuard,
        cross_brand_suspected: true,
        must_escalate: true,
        minimum_risk: 'high',
      },
    );
  }

  const redactions = [
    ['email', EMAIL_PATTERN, '[EMAIL_REDACTED]'],
    ['phone', SAUDI_PHONE_PATTERN, '[PHONE_REDACTED]'],
    ['phone', INTERNATIONAL_PHONE_PATTERN, '[PHONE_REDACTED]'],
    ['order_ref', ORDER_REFERENCE_PATTERN, '[ORDER_REF_REDACTED]'],
    ['order_ref', SHORT_HASH_REFERENCE_PATTERN, '[ORDER_REF_REDACTED]'],
    ['url', URL_PATTERN, '[URL_REDACTED]'],
    ['social_handle', SOCIAL_HANDLE_PATTERN, '$1[SOCIAL_HANDLE_REDACTED]'],
    ['long_number', LONG_NUMBER_PATTERN, '[LONG_NUMBER_REDACTED]'],
  ];
  for (const [type, pattern, replacement] of redactions) {
    const result = replaceAndCount(value, pattern, replacement);
    value = result.value;
    counts[type] += result.count;
  }
  value = value.replace(/[ \t]+/gu, ' ').replace(/\n{3,}/gu, '\n\n').trim();
  if (excerptHasUnsafeContent(value, forbiddenBrandNames)) {
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'encoded_or_obfuscated_risk',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'high' },
    );
  }
  if (!/[\p{L}\p{N}]/u.test(value.replace(/\[[A-Z_]+\]/gu, ''))) {
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'no_semantic_text',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'unknown' },
    );
  }
  const characters = [...value];
  const truncated = characters.length > MAX_EXCERPT_CHARS;
  if (truncated) value = `${characters.slice(0, MAX_EXCERPT_CHARS - 1).join('')}…`;
  if (excerptHasUnsafeContent(value, forbiddenBrandNames)) {
    return sanitizerResult(
      brandId,
      channel,
      'skip_and_escalate',
      'encoded_or_obfuscated_risk',
      counts,
      { ...baseGuard, must_escalate: true, minimum_risk: 'high' },
    );
  }
  return sanitizerResult(
    brandId,
    channel,
    'call_model',
    'sanitized_excerpt_ready',
    counts,
    baseGuard,
    value,
    truncated,
  );
}

function validateLiveFactOptions(value) {
  if (!Array.isArray(value) || value.length > MAX_LIVE_FACT_OPTIONS) {
    fail('llm_request_input_invalid', 'live fact options are invalid');
  }
  const seen = new Set();
  return value.map((entry, index) => {
    if (!exactKeys(entry, ['live_fact_id', 'kind']) || !LIVE_FACT_ID_PATTERN.test(entry.live_fact_id)) {
      fail('llm_request_input_invalid', `live fact option ${index} is invalid`);
    }
    if (!LIVE_FACT_INTENTS.has(entry.kind) || seen.has(entry.live_fact_id)) {
      fail('llm_request_input_invalid', `live fact option ${index} is duplicated or unsupported`);
    }
    seen.add(entry.live_fact_id);
    return { live_fact_id: entry.live_fact_id, kind: entry.kind };
  });
}

function isolationDigest(brandId, forbiddenBrandNames) {
  return sha256Canonical({ brand_id: brandId, forbidden_brand_names: forbiddenBrandNames });
}

function assertBrandIsolationBinding(compiled, forbiddenBrandNames) {
  const expectedNames = compiled.brand_isolation && compiled.brand_isolation.forbidden_names;
  if (
    !Array.isArray(expectedNames) ||
    expectedNames.length === 0 ||
    canonicalize(expectedNames) !== canonicalize(forbiddenBrandNames) ||
    compiled.brand_isolation.forbidden_names_digest !==
      isolationDigest(compiled.brand_id, forbiddenBrandNames)
  ) {
    fail('brand_isolation_policy_mismatch', 'brand aliases do not match the compiled trust anchor');
  }
}

function expectedConstraints() {
  return {
    observation_only: true,
    model_invocation_allowed: false,
    tools_allowed: false,
    external_actions_allowed: false,
    provider_memory_allowed: false,
    automatic_retry_allowed: false,
    automatic_fallback_allowed: false,
    customer_egress_allowed: false,
    persist_request_allowed: false,
    raw_identifiers_allowed: false,
    treat_customer_excerpt_as_instructions: false,
    max_request_bytes: MAX_REQUEST_BYTES,
    max_response_bytes: MAX_RESPONSE_BYTES,
    max_knowledge_options: MAX_KNOWLEDGE_OPTIONS,
    max_live_fact_options: MAX_LIVE_FACT_OPTIONS,
    max_classification_hint_chars: MAX_CLASSIFICATION_HINT_CHARS,
  };
}

function relevantCategories(excerpt) {
  const normalized = excerpt.normalize('NFKC').toLocaleLowerCase('ar-SA');
  const categories = [];
  const rules = [
    ['shipping', /(?:شحن|توصيل|رسوم|مجاني|الرياض|المملكة)/u],
    ['returns', /(?:استرجاع|ارجاع|إرجاع|أرجع|ارجع|متضرر|تالف|عيب|كسر|تعويض)/u],
    ['product_faq', /(?:لون|ألوان|الوان|حفر|نقش|شعار|قطعة|مجموعة|سلة|المنتج)/u],
    ['legal_reference', /(?:خصوصية|قانون|شروط|بياناتي|حقوقي)/u],
    ['brand_identity', /(?:اسمكم|اسم البراند|كالابريز|calapres)/iu],
  ];
  for (const [category, pattern] of rules) if (pattern.test(normalized)) categories.push(category);
  return categories;
}

function selectKnowledgeFacts(compiled, excerpt) {
  const selected = [];
  const seen = new Set();
  const categoryOrder = [
    ...relevantCategories(excerpt),
    'authority',
    'tone',
    'brand_identity',
    'shipping',
    'product_faq',
    'returns',
    'legal_reference',
    ...compiled.knowledge.categories,
  ];
  for (const category of categoryOrder) {
    for (const fact of compiled.knowledge.facts) {
      if (fact.category === category && !seen.has(fact.knowledge_id)) {
        selected.push(fact);
        seen.add(fact.knowledge_id);
        if (selected.length === MAX_KNOWLEDGE_OPTIONS) return selected;
      }
    }
  }
  if (selected.length === 0) fail('llm_request_context_empty', 'no bounded knowledge subset could be selected');
  return selected;
}

function projectKnowledgeOptions(compiled, excerpt) {
  return selectKnowledgeFacts(compiled, excerpt).map((fact) => {
    if ([...fact.statement_ar].length > MAX_CLASSIFICATION_HINT_CHARS) {
      fail('llm_request_context_oversized', 'classification hint exceeds the hard per-fact cap');
    }
    return {
    knowledge_id: fact.knowledge_id,
    category: fact.category,
    authority: fact.authority,
    classification_hint_ar: fact.statement_ar,
    renderable: fact.response_text !== null && fact.authority === 'draft_only',
    };
  });
}

function projectResponseStyle(compiled, channel) {
  const channelPolicy = compiled.response_style.channel_style[channel];
  const lookupBehavior = ['instagram', 'tiktok'].includes(channel)
    ? compiled.response_style.order_lookup_behavior.instagram_tiktok
    : compiled.response_style.order_lookup_behavior[channel];
  return {
    public_name: compiled.response_style.identity.public_name,
    locale: compiled.response_style.language.default,
    register: compiled.response_style.language.register,
    rules: cloneJson(compiled.response_style.language.rules),
    max_sentences: channelPolicy.max_sentences,
    emoji_max: channelPolicy.emoji_max,
    formality: channelPolicy.formality,
    signature: channel === 'email' ? channelPolicy.signature : null,
    order_lookup_behavior: lookupBehavior,
  };
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, output));
  else if (isPlainObject(value)) Object.values(value).forEach((entry) => collectStrings(entry, output));
  return output;
}

function collectProviderProse(value, output = [], parentKey = null) {
  const nonProseKeys = new Set([
    'knowledge_id',
    'category',
    'authority',
    'live_fact_id',
    'kind',
    'knowledge_version',
    'response_style_version',
  ]);
  if (typeof value === 'string') {
    if (!nonProseKeys.has(parentKey)) output.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((entry) => collectProviderProse(entry, output, parentKey));
  } else if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, entry]) => collectProviderProse(entry, output, key));
  }
  return output;
}

function providerProjectionIssueCodes(value, forbiddenBrandNames) {
  const issues = new Set();
  for (const entry of collectStrings(value)) {
    const normalized = normalizeDigits(entry.normalize('NFKC'));
    if (hasCrossBrandReference(normalized, forbiddenBrandNames)) issues.add('cross_brand');
  }
  for (const entry of collectProviderProse(value)) {
    const normalized = normalizeDigits(entry.normalize('NFKC'));
    if (encodedOrObfuscatedRisk(normalized, forbiddenBrandNames).blocked) issues.add('encoded');
    if (directIdentifierPresent(normalized)) issues.add('identifier');
    if (hasPromptInjection(normalized)) issues.add('instruction');
  }
  return [...issues].sort();
}

function providerProjectionUnsafe(value, forbiddenBrandNames) {
  return providerProjectionIssueCodes(value, forbiddenBrandNames).length > 0;
}

function validateRedactionCounts(value) {
  return exactKeys(value, REDACTION_TYPES) && REDACTION_TYPES.every(
    (type) => Number.isInteger(value[type]) && value[type] >= 0,
  );
}

function excerptHasUnsafeContent(value, forbiddenBrandNames) {
  CONTROL_OR_BIDI_PATTERN.lastIndex = 0;
  const controlFound = CONTROL_OR_BIDI_PATTERN.test(value);
  CONTROL_OR_BIDI_PATTERN.lastIndex = 0;
  return controlFound ||
    encodedOrObfuscatedRisk(value, forbiddenBrandNames).blocked ||
    directIdentifierPresent(value) ||
    hasPromptInjection(value) ||
    hasCrossBrandReference(value, forbiddenBrandNames);
}

function buildProviderNeutralRequest(options) {
  assertExactKeys(
    options,
    [
      'request_ref',
      'evaluated_at',
      'compiled_context',
      'sanitization',
      'verified_live_fact_options',
      'forbidden_brand_names',
    ],
    [],
    'llm_request_input_invalid',
    'LLM request input',
  );
  if (!REQUEST_REF_PATTERN.test(options.request_ref)) {
    fail('llm_request_input_invalid', 'request_ref must be an opaque non-customer reference');
  }
  verifyCompiledContext(options.compiled_context);
  const contextReleasePin = loadTrustedCompiledContextReleasePin(options.compiled_context);
  assertCompiledContextFreshAt(options.compiled_context, options.evaluated_at);
  const compiled = options.compiled_context;
  const sanitization = options.sanitization;
  const forbiddenBrandNames = normalizeForbiddenBrandNames(options.forbidden_brand_names);
  assertBrandIsolationBinding(compiled, forbiddenBrandNames);
  if (
    !exactKeys(
      sanitization,
      [
        'schema_version',
        'brand_id',
        'channel',
        'disposition',
        'reason_code',
        'excerpt',
        'excerpt_truncated',
        'redaction_counts',
        'guard',
        'persistable',
        'customer_egress_allowed',
      ],
    ) ||
    sanitization.schema_version !== '1.0' ||
    sanitization.brand_id !== compiled.brand_id ||
    !compiled.enabled_channels.includes(sanitization.channel) ||
    sanitization.disposition !== 'call_model' ||
    sanitization.reason_code !== 'sanitized_excerpt_ready' ||
    typeof sanitization.excerpt !== 'string' ||
    sanitization.excerpt.length === 0 ||
    [...sanitization.excerpt].length > 1200 ||
    typeof sanitization.excerpt_truncated !== 'boolean' ||
    !validateRedactionCounts(sanitization.redaction_counts) ||
    sanitization.redaction_counts.payment !== 0 ||
    sanitization.redaction_counts.government_id !== 0 ||
    sanitization.redaction_counts.address !== 0 ||
    !exactKeys(
      sanitization.guard,
      ['prompt_injection_suspected', 'cross_brand_suspected', 'must_escalate', 'minimum_risk'],
    ) ||
    sanitization.guard.must_escalate !== false ||
    sanitization.guard.prompt_injection_suspected !== false ||
    sanitization.guard.cross_brand_suspected !== false ||
    sanitization.guard.minimum_risk !== 'low' ||
    sanitization.persistable !== false ||
    sanitization.customer_egress_allowed !== false ||
    excerptHasUnsafeContent(sanitization.excerpt, forbiddenBrandNames)
  ) {
    fail('sanitization_not_callable', 'only a safe non-escalating sanitizer result may build a model request');
  }
  const liveFactOptions = validateLiveFactOptions(options.verified_live_fact_options);
  const knowledgeOptions = projectKnowledgeOptions(compiled, sanitization.excerpt);
  const evaluatedAt = new Date(options.evaluated_at);
  const expiresAt = new Date(evaluatedAt.getTime() + REQUEST_TTL_SECONDS * 1000).toISOString();
  const request = {
    schema_version: '1.0',
    task: 'classify_and_propose_internal_candidate',
    context_release_id: contextReleasePin.release_id,
    request_ref: options.request_ref,
    brand_id: compiled.brand_id,
    channel: sanitization.channel,
    locale: compiled.response_style.language.default,
    evaluated_at: options.evaluated_at,
    expires_at: expiresAt,
    compiled_context_digest: compiled.compiled_context_digest,
    trust_anchor_digest: compiled.trust_anchor.anchor_digest,
    brand_isolation_digest: compiled.brand_isolation.forbidden_names_digest,
    customer_excerpt: {
      trust: 'untrusted_customer_text',
      text: sanitization.excerpt,
      truncated: sanitization.excerpt_truncated,
      redaction_types: Object.entries(sanitization.redaction_counts)
        .filter(([, count]) => count > 0)
        .map(([type]) => type)
        .sort(),
    },
    context: {
      brand_identity: cloneJson(compiled.brand_identity),
      knowledge_version: compiled.source_versions.knowledge_version,
      response_style_version: compiled.source_versions.response_style_version,
      knowledge_options: knowledgeOptions,
      live_fact_options: liveFactOptions,
      response_style: projectResponseStyle(compiled, sanitization.channel),
    },
    response_contract: {
      schema_id: 'llm-candidate/1.0',
      envelope_required: true,
      echo_request_ref: options.request_ref,
      echo_compiled_context_digest: compiled.compiled_context_digest,
      allowed_intents: [...INTENTS],
      allowed_risks: [...RISKS],
      allowed_requested_actions: [...ACTIONS],
    },
    constraints: expectedConstraints(),
  };
  if (providerProjectionUnsafe(request.context, forbiddenBrandNames)) {
    fail(
      'llm_request_projection_unsafe',
      `a provider context projection contains unsafe data (${providerProjectionIssueCodes(request.context, forbiddenBrandNames).join(',')})`,
    );
  }
  request.request_digest = sha256Canonical(request);
  if (Buffer.byteLength(canonicalize(request), 'utf8') > MAX_REQUEST_BYTES) {
    fail('llm_request_too_large', 'provider-neutral request exceeds the hard byte budget');
  }
  return request;
}

class StrictJsonParser {
  constructor(text) {
    this.text = text;
    this.index = 0;
  }

  error(code, message) {
    const error = new SyntaxError(message);
    error.code = code;
    throw error;
  }

  skipWhitespace() {
    while (this.index < this.text.length && /[\u0009\u000A\u000D\u0020]/u.test(this.text[this.index])) {
      this.index += 1;
    }
  }

  parse() {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.index !== this.text.length) this.error('response_json_invalid', 'trailing content is forbidden');
    return value;
  }

  parseValue() {
    if (this.index >= this.text.length) this.error('response_json_invalid', 'unexpected end of input');
    const character = this.text[this.index];
    if (character === '{') return this.parseObject();
    if (character === '[') return this.parseArray();
    if (character === '"') return this.parseString();
    if (character === '-' || /[0-9]/u.test(character)) return this.parseNumber();
    for (const [literal, value] of [['true', true], ['false', false], ['null', null]]) {
      if (this.text.startsWith(literal, this.index)) {
        this.index += literal.length;
        return value;
      }
    }
    this.error('response_json_invalid', 'invalid JSON token');
  }

  parseObject() {
    const value = Object.create(null);
    const keys = new Set();
    this.index += 1;
    this.skipWhitespace();
    if (this.text[this.index] === '}') {
      this.index += 1;
      return value;
    }
    while (this.index < this.text.length) {
      if (this.text[this.index] !== '"') this.error('response_json_invalid', 'object keys must be strings');
      const key = this.parseString();
      if (keys.has(key)) this.error('response_duplicate_key', `duplicate JSON key: ${key}`);
      keys.add(key);
      this.skipWhitespace();
      if (this.text[this.index] !== ':') this.error('response_json_invalid', 'missing object colon');
      this.index += 1;
      this.skipWhitespace();
      value[key] = this.parseValue();
      this.skipWhitespace();
      if (this.text[this.index] === '}') {
        this.index += 1;
        return value;
      }
      if (this.text[this.index] !== ',') this.error('response_json_invalid', 'missing object comma');
      this.index += 1;
      this.skipWhitespace();
    }
    this.error('response_json_invalid', 'unterminated object');
  }

  parseArray() {
    const value = [];
    this.index += 1;
    this.skipWhitespace();
    if (this.text[this.index] === ']') {
      this.index += 1;
      return value;
    }
    while (this.index < this.text.length) {
      value.push(this.parseValue());
      this.skipWhitespace();
      if (this.text[this.index] === ']') {
        this.index += 1;
        return value;
      }
      if (this.text[this.index] !== ',') this.error('response_json_invalid', 'missing array comma');
      this.index += 1;
      this.skipWhitespace();
    }
    this.error('response_json_invalid', 'unterminated array');
  }

  parseString() {
    const start = this.index;
    this.index += 1;
    let escaped = false;
    while (this.index < this.text.length) {
      const code = this.text.charCodeAt(this.index);
      const character = this.text[this.index];
      if (!escaped && character === '"') {
        this.index += 1;
        try {
          return JSON.parse(this.text.slice(start, this.index));
        } catch {
          this.error('response_json_invalid', 'invalid JSON string');
        }
      }
      if (!escaped && code < 0x20) this.error('response_json_invalid', 'unescaped control character');
      if (!escaped && character === '\\') {
        escaped = true;
        this.index += 1;
        continue;
      }
      escaped = false;
      this.index += 1;
    }
    this.error('response_json_invalid', 'unterminated string');
  }

  parseNumber() {
    const match = this.text.slice(this.index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u);
    if (!match) this.error('response_json_invalid', 'invalid number');
    this.index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) this.error('response_json_invalid', 'non-finite number');
    return value;
  }
}

function parseJsonWithoutDuplicateKeys(rawText) {
  return new StrictJsonParser(rawText).parse();
}

function uniqueBoundedStringArray(value, pattern, maxItems) {
  return Array.isArray(value) &&
    value.length <= maxItems &&
    new Set(value).size === value.length &&
    value.every((entry) => typeof entry === 'string' && pattern.test(entry));
}

function sentenceCount(value) {
  return value.split(/[.!؟\n]+/u).map((part) => part.trim()).filter(Boolean).length;
}

function emojiCount(value) {
  return (value.match(/\p{Extended_Pictographic}/gu) || []).length;
}

function isArabicFirst(value) {
  const letters = value.match(/\p{L}/gu) || [];
  if (letters.length === 0) return false;
  const arabicLetters = letters.filter((letter) => /\p{Script=Arabic}/u.test(letter)).length;
  return arabicLetters / letters.length >= 0.6;
}

function renderDeterministicKnowledgeDraft(candidate, compiled, channel) {
  if (!CHANNELS.has(channel) || !isPlainObject(candidate)) {
    fail('grounded_render_invalid', 'grounded renderer received invalid input');
  }
  if (!Array.isArray(candidate.knowledge_fact_ids) || !Array.isArray(candidate.live_fact_ids)) {
    fail('grounded_render_invalid', 'grounded renderer requires fact ID arrays');
  }
  if (candidate.live_fact_ids.length > 0) {
    fail('grounded_live_render_unavailable', 'live response fragments are not present in this boundary contract');
  }
  const renderById = new Map(
    compiled.core_context.knowledge_facts.map((fact) => [fact.knowledge_id, fact.response_text]),
  );
  if (
    candidate.knowledge_fact_ids.length === 0 ||
    candidate.knowledge_fact_ids.some((id) => !renderById.has(id))
  ) {
    fail('grounded_render_invalid', 'candidate references a non-renderable knowledge fact');
  }
  let draft = candidate.knowledge_fact_ids.map((id) => renderById.get(id)).join(' ').trim();
  const style = projectResponseStyle(compiled, channel);
  if (channel === 'email') draft = `${draft}\n\n${style.signature}`;
  if (
    draft.length === 0 ||
    draft.length > 1200 ||
    sentenceCount(draft) > style.max_sentences ||
    emojiCount(draft) > style.emoji_max
  ) {
    fail('grounded_render_style_violation', 'deterministic grounded render violates channel style');
  }
  const normalized = normalizeDigits(draft.normalize('NFKC'));
  if (
    !isArabicFirst(draft) ||
    directIdentifierPresent(normalized) ||
    hasPromptInjection(normalized) ||
    providerProjectionUnsafe({ draft }, compiled.brand_isolation.forbidden_names)
  ) {
    fail('grounded_render_security_violation', 'deterministic grounded render failed final security checks');
  }
  return draft;
}

function directIdentifierPresentInView(value) {
  const patterns = [
    EMAIL_PATTERN,
    SAUDI_PHONE_PATTERN,
    INTERNATIONAL_PHONE_PATTERN,
    URL_PATTERN,
    ORDER_REFERENCE_PATTERN,
    SHORT_HASH_REFERENCE_PATTERN,
    SOCIAL_HANDLE_PATTERN,
    LONG_NUMBER_PATTERN,
  ];
  const found = patterns.some((pattern) => {
    pattern.lastIndex = 0;
    const result = pattern.test(value);
    pattern.lastIndex = 0;
    return result;
  });
  return found ||
    COMPACT_EMAIL_PATTERN.test(value) ||
    COMPACT_PHONE_PATTERN.test(value) ||
    hasPaymentData(value) ||
    hasGovernmentId(value) ||
    hasAddressRisk(value);
}

function directIdentifierPresent(value) {
  const variants = securityVariants(value);
  if (directIdentifierPresentInView(variants[0])) return true;
  const compact = variants[variants.length - 1];
  return COMPACT_EMAIL_PATTERN.test(compact) ||
    COMPACT_PHONE_PATTERN.test(compact) ||
    hasPaymentData(compact) ||
    hasGovernmentId(compact);
}

function validateCandidate(candidate, request, compiled, forbiddenBrandNames) {
  if (!exactKeys(candidate, CANDIDATE_KEYS)) return 'candidate_shape_invalid';
  if (!INTENTS.has(candidate.intent) || !RISKS.has(candidate.risk) || !ACTIONS.has(candidate.requested_action)) {
    return 'candidate_enum_invalid';
  }
  if (
    candidate.draft_text !== null &&
    (typeof candidate.draft_text !== 'string' || candidate.draft_text.trim().length === 0 || candidate.draft_text.length > 1200)
  ) {
    return 'candidate_draft_invalid';
  }
  if (
    typeof candidate.confidence !== 'number' ||
    !Number.isFinite(candidate.confidence) ||
    candidate.confidence < 0 ||
    candidate.confidence > 1
  ) {
    return 'candidate_confidence_invalid';
  }
  if (!uniqueBoundedStringArray(candidate.knowledge_fact_ids, KNOWLEDGE_ID_PATTERN, MAX_KNOWLEDGE_OPTIONS)) {
    return 'candidate_knowledge_ids_invalid';
  }
  if (!uniqueBoundedStringArray(candidate.live_fact_ids, LIVE_FACT_ID_PATTERN, MAX_LIVE_FACT_OPTIONS)) {
    return 'candidate_live_fact_ids_invalid';
  }
  if (typeof candidate.needs_live_lookup !== 'boolean') return 'candidate_lookup_flag_invalid';
  if (
    candidate.escalation_reason_code !== null &&
    (typeof candidate.escalation_reason_code !== 'string' ||
      !ESCALATION_REASON_CODES.has(candidate.escalation_reason_code))
  ) {
    return 'candidate_escalation_reason_invalid';
  }
  const knowledgeById = new Map(request.context.knowledge_options.map((fact) => [fact.knowledge_id, fact]));
  const liveFactIds = new Set(request.context.live_fact_options.map((fact) => fact.live_fact_id));
  if (candidate.knowledge_fact_ids.some((id) => !knowledgeById.has(id))) {
    return 'candidate_knowledge_reference_unverified';
  }
  if (candidate.live_fact_ids.some((id) => !liveFactIds.has(id))) {
    return 'candidate_live_fact_reference_unverified';
  }
  const knowledgeOrder = new Map(
    compiled.knowledge.facts.map((fact, index) => [fact.knowledge_id, index]),
  );
  const liveOrder = new Map(
    request.context.live_fact_options.map((fact, index) => [fact.live_fact_id, index]),
  );
  const canonicalKnowledgeIds = [...candidate.knowledge_fact_ids].sort(
    (left, right) => knowledgeOrder.get(left) - knowledgeOrder.get(right),
  );
  const canonicalLiveFactIds = [...candidate.live_fact_ids].sort(
    (left, right) => liveOrder.get(left) - liveOrder.get(right),
  );
  if (
    canonicalize(candidate.knowledge_fact_ids) !== canonicalize(canonicalKnowledgeIds) ||
    canonicalize(candidate.live_fact_ids) !== canonicalize(canonicalLiveFactIds)
  ) {
    return 'candidate_fact_order_invalid';
  }
  if (
    candidate.needs_live_lookup === true &&
    (candidate.requested_action !== 'read_fact' ||
      candidate.draft_text !== null ||
      candidate.live_fact_ids.length !== 0 ||
      candidate.escalation_reason_code === null)
  ) {
    return 'candidate_lookup_contract_invalid';
  }
  if (candidate.live_fact_ids.length > 0 && candidate.needs_live_lookup !== false) {
    return 'candidate_lookup_contract_invalid';
  }
  if (candidate.risk !== 'low' && candidate.escalation_reason_code === null) {
    return 'candidate_escalation_required';
  }
  if (SENSITIVE_INTENTS.has(candidate.intent)) {
    if (candidate.requested_action === 'answer' || candidate.draft_text !== null || candidate.escalation_reason_code === null) {
      return 'candidate_sensitive_intent_violation';
    }
  }
  if (MUTATING_ACTIONS.has(candidate.requested_action)) {
    if (candidate.draft_text !== null || candidate.escalation_reason_code === null || candidate.risk === 'low') {
      return 'candidate_action_authority_violation';
    }
  }
  if (
    candidate.requested_action !== 'answer' &&
    (candidate.draft_text !== null || candidate.escalation_reason_code === null)
  ) {
    return 'candidate_non_answer_contract_invalid';
  }
  if (
    LIVE_FACT_INTENTS.has(candidate.intent) &&
    candidate.live_fact_ids.length === 0 &&
    !(candidate.needs_live_lookup === true && candidate.requested_action === 'read_fact')
  ) {
    return 'candidate_live_fact_required';
  }
  if (candidate.requested_action === 'answer') {
    if (
      candidate.risk !== 'low' ||
      candidate.needs_live_lookup !== false ||
      typeof candidate.draft_text !== 'string' ||
      candidate.escalation_reason_code !== null ||
      candidate.knowledge_fact_ids.length + candidate.live_fact_ids.length === 0
    ) {
      return 'candidate_answer_contract_invalid';
    }
    if (candidate.knowledge_fact_ids.some((id) => knowledgeById.get(id).renderable !== true)) {
      return 'candidate_knowledge_authority_violation';
    }
    try {
      renderDeterministicKnowledgeDraft(candidate, compiled, request.channel);
    } catch (error) {
      if (error && error.code === 'grounded_live_render_unavailable') {
        return 'candidate_live_render_unavailable';
      }
      return 'candidate_grounded_render_style_violation';
    }
  }
  if (candidate.draft_text !== null) {
    const draft = candidate.draft_text;
    if (CONTROL_OR_BIDI_PATTERN.test(draft)) {
      CONTROL_OR_BIDI_PATTERN.lastIndex = 0;
      return 'candidate_draft_control_character';
    }
    CONTROL_OR_BIDI_PATTERN.lastIndex = 0;
    const securityNormalizedDraft = normalizeDigits(draft.normalize('NFKC'));
    if (
      directIdentifierPresent(securityNormalizedDraft) ||
      encodedOrObfuscatedRisk(securityNormalizedDraft, forbiddenBrandNames).blocked ||
      REDACTION_MARKER_PATTERN.test(draft)
    ) {
      return 'candidate_draft_pii_or_marker';
    }
    if (hasPromptInjection(securityNormalizedDraft)) return 'candidate_draft_instruction_attack';
    if (hasCrossBrandReference(draft, forbiddenBrandNames)) return 'candidate_cross_brand_reference';
    if (ACTION_COMPLETION_PATTERN.test(draft)) return 'candidate_claims_action_completed';
    if (FALSE_HUMAN_IDENTITY_PATTERN.test(draft)) return 'candidate_false_human_identity';
    if (!isArabicFirst(draft)) return 'candidate_not_arabic_first';
    const style = request.context.response_style;
    if (sentenceCount(draft) > style.max_sentences || emojiCount(draft) > style.emoji_max) {
      return 'candidate_channel_style_violation';
    }
    if (request.channel === 'email' && !draft.trim().endsWith(style.signature)) {
      return 'candidate_email_signature_missing';
    }
  }
  const compiledIds = new Set(compiled.knowledge.facts.map((fact) => fact.knowledge_id));
  if (candidate.knowledge_fact_ids.some((id) => !compiledIds.has(id))) {
    return 'candidate_context_binding_invalid';
  }
  return null;
}

function parseResult(request, responseReceivedAt, parsedAt, status, reasonCode, candidate = null) {
  return {
    schema_version: '1.0',
    status,
    reason_code: reasonCode,
    request_ref: request.request_ref,
    request_digest: request.request_digest,
    compiled_context_digest: request.compiled_context_digest,
    response_received_at: responseReceivedAt,
    parsed_at: parsedAt,
    candidate,
    persistable: false,
    retry_allowed: false,
    fallback_allowed: false,
    customer_egress_allowed: false,
  };
}

function verifyRequestIntegrity(
  request,
  compiled,
  forbiddenBrandNames,
  contextReleasePin,
) {
  if (
    !exactKeys(request, REQUEST_KEYS) ||
    request.schema_version !== '1.0' ||
    request.task !== 'classify_and_propose_internal_candidate' ||
    request.context_release_id !== contextReleasePin.release_id ||
    !REQUEST_REF_PATTERN.test(request.request_ref || '') ||
    request.brand_id !== compiled.brand_id ||
    !compiled.enabled_channels.includes(request.channel) ||
    request.locale !== 'ar-SA' ||
    typeof request.expires_at !== 'string' ||
    !DIGEST_PATTERN.test(request.compiled_context_digest || '') ||
    !DIGEST_PATTERN.test(request.trust_anchor_digest || '') ||
    !DIGEST_PATTERN.test(request.brand_isolation_digest || '') ||
    !DIGEST_PATTERN.test(request.request_digest || '')
  ) {
    fail('llm_request_invalid', 'request is not a valid provider-neutral request');
  }
  assertCompiledContextFreshAt(compiled, request.evaluated_at);
  const evaluatedAt = parseTimestamp(request.evaluated_at, 'llm_request_invalid', 'request.evaluated_at');
  const expectedExpiry = new Date(evaluatedAt.getTime() + REQUEST_TTL_SECONDS * 1000).toISOString();
  if (request.expires_at !== expectedExpiry) {
    fail('llm_request_invalid', 'request expiry is not the exact bounded TTL');
  }
  if (
    !exactKeys(request.customer_excerpt, ['trust', 'text', 'truncated', 'redaction_types']) ||
    request.customer_excerpt.trust !== 'untrusted_customer_text' ||
    typeof request.customer_excerpt.text !== 'string' ||
    request.customer_excerpt.text.length === 0 ||
    [...request.customer_excerpt.text].length > 1200 ||
    typeof request.customer_excerpt.truncated !== 'boolean' ||
    !Array.isArray(request.customer_excerpt.redaction_types) ||
    request.customer_excerpt.redaction_types.length > REDACTION_TYPES.length ||
    new Set(request.customer_excerpt.redaction_types).size !== request.customer_excerpt.redaction_types.length ||
    request.customer_excerpt.redaction_types.some((type) => !REDACTION_TYPES.includes(type)) ||
    request.customer_excerpt.redaction_types.some((type) => ['payment', 'government_id', 'address'].includes(type)) ||
    excerptHasUnsafeContent(request.customer_excerpt.text, forbiddenBrandNames)
  ) {
    fail('llm_request_invalid', 'request contains an unsafe or malformed customer excerpt');
  }
  if (
    !exactKeys(
      request.context,
      [
        'brand_identity',
        'knowledge_version',
        'response_style_version',
        'knowledge_options',
        'live_fact_options',
        'response_style',
      ],
    ) ||
    canonicalize(request.context.brand_identity) !== canonicalize(compiled.brand_identity) ||
    request.context.knowledge_version !== compiled.source_versions.knowledge_version ||
    request.context.response_style_version !== compiled.source_versions.response_style_version ||
    canonicalize(request.context.knowledge_options) !==
      canonicalize(projectKnowledgeOptions(compiled, request.customer_excerpt.text)) ||
    canonicalize(request.context.response_style) !== canonicalize(projectResponseStyle(compiled, request.channel))
  ) {
    fail('llm_request_context_mismatch', 'request context projection does not match the trusted compiler output');
  }
  let validatedLiveFactOptions;
  try {
    validatedLiveFactOptions = validateLiveFactOptions(request.context.live_fact_options);
  } catch {
    fail('llm_request_invalid', 'request live-fact options are invalid');
  }
  if (canonicalize(request.context.live_fact_options) !== canonicalize(validatedLiveFactOptions)) {
    fail('llm_request_invalid', 'request live-fact options changed during validation');
  }
  if (providerProjectionUnsafe(request.context, forbiddenBrandNames)) {
    fail('llm_request_projection_unsafe', 'provider context projection failed the full safety rescan');
  }
  const expectedResponseContract = {
    schema_id: 'llm-candidate/1.0',
    envelope_required: true,
    echo_request_ref: request.request_ref,
    echo_compiled_context_digest: compiled.compiled_context_digest,
    allowed_intents: [...INTENTS],
    allowed_risks: [...RISKS],
    allowed_requested_actions: [...ACTIONS],
  };
  if (
    canonicalize(request.response_contract) !== canonicalize(expectedResponseContract) ||
    canonicalize(request.constraints) !== canonicalize(expectedConstraints())
  ) {
    fail('llm_request_invalid', 'request safety constraints or response contract were modified');
  }
  const unsigned = cloneJson(request);
  const expectedDigest = unsigned.request_digest;
  delete unsigned.request_digest;
  if (sha256Canonical(unsigned) !== expectedDigest) {
    fail('llm_request_digest_mismatch', 'request digest does not match its content');
  }
  if (
    request.compiled_context_digest !== compiled.compiled_context_digest ||
    request.compiled_context_digest !== contextReleasePin.expected_compiled_context_digest ||
    request.trust_anchor_digest !== compiled.trust_anchor.anchor_digest ||
    request.trust_anchor_digest !== contextReleasePin.expected_anchor_digest ||
    request.brand_isolation_digest !== compiled.brand_isolation.forbidden_names_digest ||
    request.brand_isolation_digest !== isolationDigest(compiled.brand_id, forbiddenBrandNames)
  ) {
    fail('llm_request_context_mismatch', 'request does not match the trusted context/isolation policy');
  }
  if (Buffer.byteLength(canonicalize(request), 'utf8') > MAX_REQUEST_BYTES) {
    fail('llm_request_too_large', 'provider-neutral request exceeds the hard byte budget');
  }
}

function parseProviderNeutralResponse(rawText, options, dependencies = {}) {
  assertExactKeys(
    options,
    [
      'request',
      'compiled_context',
      'forbidden_brand_names',
      'response_received_at',
    ],
    [],
    'parser_input_invalid',
    'parser input',
  );
  verifyCompiledContext(options.compiled_context);
  const contextReleasePin = loadTrustedCompiledContextReleasePin(options.compiled_context);
  const forbiddenBrandNames = normalizeForbiddenBrandNames(options.forbidden_brand_names);
  assertBrandIsolationBinding(options.compiled_context, forbiddenBrandNames);
  verifyRequestIntegrity(
    options.request,
    options.compiled_context,
    forbiddenBrandNames,
    contextReleasePin,
  );
  const request = options.request;
  const responseReceivedAt = parseTimestamp(
    options.response_received_at,
    'parser_input_invalid',
    'response_received_at',
  );
  const parsedAt = trustedParserNow(dependencies);
  const parsedAtIso = parsedAt.toISOString();
  const evaluatedAt = new Date(request.evaluated_at);
  const expiresAt = new Date(request.expires_at);
  if (responseReceivedAt.getTime() < evaluatedAt.getTime()) {
    return parseResult(
      request,
      options.response_received_at,
      parsedAtIso,
      'rejected',
      'response_time_before_request',
    );
  }
  if (parsedAt.getTime() < evaluatedAt.getTime()) {
    return parseResult(
      request,
      options.response_received_at,
      parsedAtIso,
      'rejected',
      'parse_time_before_request',
    );
  }
  if (parsedAt.getTime() < responseReceivedAt.getTime()) {
    return parseResult(
      request,
      options.response_received_at,
      parsedAtIso,
      'rejected',
      'response_time_after_trusted_clock',
    );
  }
  if (parsedAt.getTime() - responseReceivedAt.getTime() > MAX_RESPONSE_CLOCK_SKEW_MS) {
    return parseResult(
      request,
      options.response_received_at,
      parsedAtIso,
      'rejected',
      'response_receipt_clock_skew_exceeded',
    );
  }
  if (responseReceivedAt.getTime() > expiresAt.getTime() || parsedAt.getTime() > expiresAt.getTime()) {
    return parseResult(
      request,
      options.response_received_at,
      parsedAtIso,
      'rejected',
      'request_expired',
    );
  }
  try {
    assertCompiledContextFreshAt(options.compiled_context, parsedAtIso);
  } catch (error) {
    if (error && error.code === 'compiled_context_stale') {
      return parseResult(
        request,
        options.response_received_at,
        parsedAtIso,
        'rejected',
        'compiled_context_stale_at_response',
      );
    }
    throw error;
  }
  if (typeof rawText !== 'string') {
    return parseResult(request, options.response_received_at, parsedAtIso, 'rejected', 'response_not_text');
  }
  if (Buffer.byteLength(rawText, 'utf8') > MAX_RESPONSE_BYTES) {
    return parseResult(request, options.response_received_at, parsedAtIso, 'rejected', 'response_too_large');
  }
  if (rawText.includes('```')) {
    return parseResult(
      request,
      options.response_received_at,
      parsedAtIso,
      'rejected',
      'response_markdown_forbidden',
    );
  }
  let parsed;
  try {
    parsed = parseJsonWithoutDuplicateKeys(rawText);
  } catch (error) {
    const reason = error && error.code === 'response_duplicate_key'
      ? 'response_duplicate_key'
      : 'response_json_invalid';
    return parseResult(request, options.response_received_at, parsedAtIso, 'rejected', reason);
  }
  if (!exactKeys(parsed, RESPONSE_KEYS)) {
    return parseResult(
      request,
      options.response_received_at,
      parsedAtIso,
      'rejected',
      'response_envelope_invalid',
    );
  }
  if (
    parsed.schema_version !== '1.0' ||
    parsed.request_ref !== request.request_ref ||
    parsed.request_digest !== request.request_digest ||
    parsed.compiled_context_digest !== request.compiled_context_digest
  ) {
    return parseResult(
      request,
      options.response_received_at,
      parsedAtIso,
      'rejected',
      'response_binding_mismatch',
    );
  }
  const candidateIssue = validateCandidate(
    parsed.candidate,
    request,
    options.compiled_context,
    forbiddenBrandNames,
  );
  if (candidateIssue !== null) {
    return parseResult(
      request,
      options.response_received_at,
      parsedAtIso,
      'rejected',
      candidateIssue,
    );
  }
  const acceptedCandidate = cloneJson(parsed.candidate);
  acceptedCandidate.draft_text = acceptedCandidate.requested_action === 'answer'
    ? renderDeterministicKnowledgeDraft(acceptedCandidate, options.compiled_context, request.channel)
    : null;
  return parseResult(
    request,
    options.response_received_at,
    parsedAtIso,
    'accepted',
    'candidate_valid',
    acceptedCandidate,
  );
}

module.exports = {
  ACTIONS,
  CHANNELS,
  INTENTS,
  LlmBoundaryError,
  RISKS,
  buildProviderNeutralRequest,
  parseJsonWithoutDuplicateKeys,
  parseProviderNeutralResponse,
  renderDeterministicKnowledgeDraft,
  sanitizeCustomerText,
};
