// Reservation cost model. Rates are USD per 1M tokens (from the provider's official price page,
// entered by the operator at activation); amounts are integer USD micro-units.
// This is a RESERVATION POLICY, not a provider-enforced maximum: the Images API has no parameter
// that caps billed output tokens, and the per-image output-token ceiling is an operator assumption
// until real usage has been observed. If observed usage exceeds it, the overshoot is recorded in
// the ledger and generation halts after that job; one batch can therefore cost more than reserved.
// Nothing here is a guaranteed invoice cap. Provider-side limits (prepaid balance, project budgets)
// reduce exposure but are not verified hard caps: dispatch, usage reporting and cutoff can lag.
import { designPrompt } from './provider.mjs';
import { DESIGNS_PER_BATCH } from './ledger.mjs';

// A valid name is at most 30 Arabic letters (2 UTF-8 bytes each); one unbroken word gives the
// longest prompt (spaces are 1 byte). PROMPT_OVERHEAD_TOKENS covers request framing tokens.
const LONGEST_NAME = 'ض'.repeat(30);
const PROMPT_OVERHEAD_TOKENS = 64;

export function costModel({ textInputPerM, imageInputPerM = 0, outputPerM, maxOutputTokensPerImage }) {
  for (const v of [textInputPerM, imageInputPerM, outputPerM, maxOutputTokensPerImage]) if (!(Number.isFinite(v) && v >= 0)) throw Error('INVALID_COST_MODEL');
  if (!textInputPerM || !outputPerM || !Number.isSafeInteger(maxOutputTokensPerImage) || maxOutputTokensPerImage <= 0) throw Error('INVALID_COST_MODEL');
  // BPE tokens never exceed UTF-8 bytes; use the largest prompt any valid name can produce.
  let maxPromptTokens = 0;
  for (let slot = 0; slot < 9; slot++) maxPromptTokens = Math.max(maxPromptTokens, Buffer.byteLength(designPrompt(LONGEST_NAME, slot), 'utf8') + PROMPT_OVERHEAD_TOKENS);
  const micros = (tokens, perM) => tokens * perM; // 1 USD per 1M tokens == 1 micro-USD per token
  const worstImageMicros = Math.ceil(micros(maxPromptTokens, textInputPerM) + micros(maxOutputTokensPerImage, outputPerM));
  return {
    maxPromptTokens, maxOutputTokensPerImage, worstImageMicros,
    batchReserveMicros: DESIGNS_PER_BATCH * worstImageMicros,
    actualMicros(u) {
      return Math.ceil(micros(u.textInputTokens, textInputPerM) + micros(u.imageInputTokens, imageInputPerM) + micros(u.outputTokens, outputPerM));
    },
    exceeds(u) { return u.outputTokens > maxOutputTokensPerImage || u.inputTokens > maxPromptTokens; },
  };
}
