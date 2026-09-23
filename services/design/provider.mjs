// Direct OpenAI Images API adapter. One image per request so each result is stored and accounted
// separately. Never retried here: a request whose outcome is unknown may already be billed.
import { createHash } from 'node:crypto';
import { normalizeName } from './security.mjs';

export const PROMPT_VERSION = 'p1';
export const layouts = [
  'A low, wide horizontal composition with sweeping connected strokes.',
  'A tall vertical composition with carefully stacked word parts.',
  'A compact rounded composition formed entirely by the letters themselves, with no enclosing circle.',
  'An upward diagonal composition with elegant long letter strokes.',
  'An open, airy composition with generous negative space between the naturally connected letter groups.',
  'A dense, square-like interwoven composition, without any square border.',
  'A flowing composition with a prominent low baseline and short upper letter forms.',
  'A balanced two-level composition that preserves the natural right-to-left reading order.',
  'An asymmetrical composition whose one restrained long terminal stroke is part of a letter, not an added ornament.',
];

export function designPrompt(name, slot) {
  const exact = normalizeName(name);
  const letters = [...exact].map((c) => (c === ' ' ? '/' : c)).join(' ');
  return [
    'Create one original Arabic calligraphic name artwork for printing on clear acrylic.',
    `The exact text is ${JSON.stringify(exact)}. Its letters in reading order are: ${letters} (the slash is the space between words).`,
    'Write every one of these letters exactly once, in this order, with all essential letter dots and any hamza exactly as given. Add no other letters or words.',
    'No tashkeel or vowel marks, no decorative diacritics, no symbols, frames, borders, flowers, stars, backgrounds, objects, mockups, shadows, textures or watermarks.',
    'Solid black ink on a plain white background, flat and high contrast, centred with generous empty margins on every side.',
    'Keep correct Arabic joining and non-joining behaviour and right-to-left reading. Compose and interweave the valid letterforms artistically, in the spirit of hand-made Diwani/Thuluth name logos; do not merely typeset a common font.',
    `Layout direction: ${layouts[slot % layouts.length]}`,
    'Deliver a single composition, not a sheet of variations.',
  ].join('\n');
}

export class ProviderError extends Error {
  constructor(code, billed, { providerCode = '', retryAfterMs = 0 } = {}) {
    super(code); this.code = code; this.billed = billed; this.providerCode = providerCode; this.retryAfterMs = retryAfterMs;
  }
}

// From an error response keep only the provider's machine code (e.g. `rate_limit_exceeded`), never its
// message text, and only when it is a short identifier. Reads at most 4 KB of the body.
export async function safeProviderCode(response) {
  let text = '';
  try {
    const chunks = []; let n = 0;
    for await (const c of response.body) { chunks.push(c); n += c.length; if (n >= 4096) break; }
    text = Buffer.concat(chunks).subarray(0, 4096).toString('utf8');
  } catch { return ''; }
  try { const e = JSON.parse(text)?.error; const code = e?.code || e?.type; return typeof code === 'string' && /^[a-z0-9_.-]{1,48}$/i.test(code) ? code : ''; }
  catch { return ''; }
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function openAIProvider({ apiKey = '', model = 'gpt-image-2-2026-04-21', quality = 'low', size = '1024x1024',
  fetchImpl = fetch, timeoutMs = 120_000, maxResponseBytes = 16 * 1024 * 1024 } = {}) {
  return {
    ready: !!apiKey,
    version: (slot) => `${PROMPT_VERSION}-L${slot % layouts.length}-${model}-${quality}`,
    async generate(name, slot, { sessionHash = '' } = {}) {
      if (!apiKey) throw new ProviderError('PROVIDER_DISABLED', false);
      let response;
      try {
        response = await fetchImpl('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, prompt: designPrompt(name, slot), n: 1, size, quality, output_format: 'png', background: 'opaque',
            ...(sessionHash ? { user: sessionHash } : {}) }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (e) {
        throw new ProviderError(e?.name === 'TimeoutError' ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK', 'unknown');
      }
      // Authentication, permission, not-found and rate-limit rejections are refused before generation.
      // Everything else that is not 2xx (including 400 moderation blocks and 5xx) is treated as possibly billed.
      if (!response.ok) {
        const providerCode = response.body ? await safeProviderCode(response) : '';
        const billed = [401, 403, 404, 429].includes(response.status) ? false : 'unknown';
        const after = Number(response.headers.get('retry-after'));
        throw new ProviderError(`PROVIDER_HTTP_${response.status}`, billed, { providerCode, retryAfterMs: Number.isFinite(after) && after > 0 ? after * 1000 : 0 });
      }
      const chunks = []; let bytes = 0;
      try {
        for await (const value of response.body) {
          bytes += value.length;
          if (bytes > maxResponseBytes) throw new ProviderError('PROVIDER_RESPONSE_TOO_LARGE', 'unknown');
          chunks.push(value);
        }
      } catch (e) { if (e instanceof ProviderError) throw e; throw new ProviderError('PROVIDER_NETWORK', 'unknown'); }
      let data;
      try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ProviderError('PROVIDER_BAD_JSON', 'unknown'); }
      const b64 = data?.data?.length === 1 ? data.data[0].b64_json : null;
      if (typeof b64 !== 'string') throw new ProviderError('PROVIDER_NO_IMAGE', 'unknown');
      const png = Buffer.from(b64, 'base64');
      if (!png.subarray(0, 8).equals(PNG_SIG)) throw new ProviderError('PROVIDER_NOT_PNG', 'unknown');
      const u = data.usage && typeof data.usage === 'object' ? data.usage : null;
      const usage = u && Number.isSafeInteger(u.input_tokens) && Number.isSafeInteger(u.output_tokens)
        ? { inputTokens: u.input_tokens, outputTokens: u.output_tokens,
            textInputTokens: Number.isSafeInteger(u.input_tokens_details?.text_tokens) ? u.input_tokens_details.text_tokens : u.input_tokens,
            imageInputTokens: Number.isSafeInteger(u.input_tokens_details?.image_tokens) ? u.input_tokens_details.image_tokens : 0 }
        : null;
      return { png, usage };
    },
  };
}

export const hashForProvider = (sessionId) => createHash('sha256').update(`calapres-design-user:${sessionId}`).digest('hex').slice(0, 32);
