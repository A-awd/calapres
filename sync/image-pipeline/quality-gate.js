// Automated quality gate for Higgsfield-generated images.
// No human approval required. Gate runs in n8n Code nodes.
//
// Strategy: trust Higgsfield for visual quality; enforce
// structural and API-level guarantees programmatically.
//
// Three tiers:
//   PASS  → publish immediately to Shopify
//   RETRY → re-generate with adjusted prompt (up to MAX_RETRIES)
//   REVIEW → log to needs_review state, pipeline continues (non-blocking)

const MAX_RETRIES = 3;

// Checks run in order. First FAIL result triggers retry.
function runQualityChecks(higgsfieldResponse, context) {
  const checks = {};
  const issues = [];

  // 1. API success check
  const apiOk = higgsfieldResponse && !higgsfieldResponse.error;
  checks.api_ok = apiOk;
  if (!apiOk) {
    issues.push('Higgsfield API error: ' + (higgsfieldResponse && higgsfieldResponse.error || 'no response'));
  }

  // 2. Images present check
  const images = normalizeImages(higgsfieldResponse);
  checks.has_images = images.length > 0;
  if (!checks.has_images) {
    issues.push('No images in Higgsfield response');
  }

  // 3. URL accessibility check (structural, not fetching content)
  const validUrls = images.filter(url => isValidUrl(url));
  checks.urls_valid = validUrls.length > 0;
  if (!checks.urls_valid) {
    issues.push('Image URLs are invalid or empty');
  }

  // 4. Reference image was provided (prevents hallucinated bottle shapes)
  const hasReference = !!(context && context.referenceImageUrl && context.referenceImageUrl.startsWith('http'));
  checks.reference_used = hasReference;
  if (!hasReference) {
    issues.push('No reference image supplied — bottle geometry unanchored');
  }

  const passed = issues.length === 0;
  const score = computeScore(checks);

  return {
    passed,
    score,
    checks,
    issues,
    images: validUrls,
    bestImageUrl: validUrls[0] || null,
  };
}

// Determines next action given current retry count and check result
function decideAction(checkResult, retryCount) {
  if (checkResult.passed) return 'publish';
  if (retryCount < MAX_RETRIES) return 'retry';
  return 'needs_review';
}

// Adjusts the prompt slightly on each retry to break deterministic failures
function buildRetryPromptAdjustment(originalPrompt, retryCount) {
  const suffixes = [
    ' Ultra-sharp product photography, pristine clarity.',
    ' Refined studio lighting, no imperfections.',
    ' Professional commercial shoot, award-winning composition.',
  ];
  return originalPrompt + (suffixes[retryCount - 1] || '');
}

// ── helpers ──────────────────────────────────────────────────────────────

function normalizeImages(response) {
  if (!response) return [];
  // Higgsfield returns: { images: [{url}] } or { data: [{url}] } or { outputs: [...] }
  const raw = response.images || response.data || response.outputs || [];
  return raw
    .map(item => (typeof item === 'string' ? item : item && (item.url || item.src || item.uri)))
    .filter(url => typeof url === 'string' && url.startsWith('https://'));
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.length > 0;
  } catch {
    return false;
  }
}

function computeScore(checks) {
  const weights = { api_ok: 40, has_images: 30, urls_valid: 20, reference_used: 10 };
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (checks[key]) score += weight;
  }
  return score;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runQualityChecks,
    decideAction,
    buildRetryPromptAdjustment,
    normalizeImages,
    MAX_RETRIES,
  };
}
