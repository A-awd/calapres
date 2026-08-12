'use strict';

const crypto = require('node:crypto');

const SOURCE_KEYS = Object.freeze([
  'registry',
  'knowledge_manifest',
  'knowledge_release',
  'response_style_manifest',
  'response_style_release',
]);
const SOURCE_BUNDLE_KEYS = Object.freeze([
  ...SOURCE_KEYS,
  'knowledge_history_releases',
  'response_style_history_releases',
]);
const AUTHORITY_VALUES = new Set(['draft_only', 'owner_required', 'mandatory_stop']);
const CHANNEL_VALUES = new Set(['instagram', 'tiktok', 'whatsapp', 'email']);
const VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}-v[1-9]\d*$/;
const KNOWLEDGE_ID_PATTERN = /^[a-z][a-z0-9._:-]{2,120}$/;
const SAFE_REPOSITORY_REFERENCE = /^(?:decisions|docs)\/[A-Za-z0-9._/-]+\.md$/;
const ARABIC_MARKS_OR_TATWEEL_PATTERN = /[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
const SECURITY_NON_ALNUM_PATTERN = /[^\p{L}\p{N}]+/gu;

class ContextCompilerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ContextCompilerError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new ContextCompilerError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, code, location) {
  if (!isPlainObject(value)) fail(code, `${location} must be a plain object`);
}

function assertExactKeys(value, required, optional, code, location) {
  assertPlainObject(value, code, location);
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  const missing = required.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  const unexpected = keys.filter((key) => !allowed.has(key));
  if (missing.length > 0 || unexpected.length > 0) {
    fail(
      code,
      `${location} keys are invalid (missing=${missing.join(',') || 'none'}; unexpected=${unexpected.join(',') || 'none'})`,
    );
  }
}

function assertNonEmptyString(value, code, location, maxLength = 4000) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    fail(code, `${location} must be a non-empty bounded string`);
  }
}

function assertDateOnly(value, code, location) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(code, `${location} must use YYYY-MM-DD`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(code, `${location} is not a valid date`);
  }
  return parsed;
}

function assertDateTime(value, code, location) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    fail(code, `${location} must be an ISO-8601 date-time`);
  }
  return new Date(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalize(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('non_json_number', 'non-finite numbers are forbidden');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalize(entry)).join(',')}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(',')}}`;
  }
  fail('non_json_value', 'only JSON-compatible values may be canonicalized');
}

function sha256Canonical(value) {
  return `sha256:${crypto.createHash('sha256').update(canonicalize(value), 'utf8').digest('hex')}`;
}

function computeSourceDigests(sourceBundle) {
  assertExactKeys(sourceBundle, SOURCE_BUNDLE_KEYS, [], 'source_bundle_invalid', 'source_bundle');
  const digests = {};
  for (const key of SOURCE_KEYS) {
    assertPlainObject(sourceBundle[key], 'source_bundle_invalid', `source_bundle.${key}`);
    digests[key] = sha256Canonical(sourceBundle[key]);
  }
  assertPlainObject(
    sourceBundle.knowledge_history_releases,
    'source_bundle_invalid',
    'source_bundle.knowledge_history_releases',
  );
  assertPlainObject(
    sourceBundle.response_style_history_releases,
    'source_bundle_invalid',
    'source_bundle.response_style_history_releases',
  );
  return digests;
}

function normalizeForbiddenBrandNames(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    fail('trust_anchor_invalid', 'anchor forbidden brand names must be a non-empty bounded array');
  }
  const normalized = value.map((entry) => {
    if (typeof entry !== 'string' || entry.trim().length < 2 || entry.length > 80) {
      fail('trust_anchor_invalid', 'anchor forbidden brand names contain an invalid value');
    }
    return entry.normalize('NFKC')
      .replace(ARABIC_MARKS_OR_TATWEEL_PATTERN, '')
      .toLocaleLowerCase('en-US')
      .replace(SECURITY_NON_ALNUM_PATTERN, '');
  });
  if (new Set(normalized).size !== normalized.length) {
    fail('trust_anchor_invalid', 'anchor forbidden brand names must be unique after normalization');
  }
  return normalized.sort();
}

function assertDigestMap(actual, expected) {
  assertExactKeys(expected, SOURCE_KEYS, [], 'digest_contract_invalid', 'anchor.source_digests');
  for (const key of SOURCE_KEYS) {
    if (typeof expected[key] !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(expected[key])) {
      fail('digest_contract_invalid', `anchor.source_digests.${key} is invalid`);
    }
    if (actual[key] !== expected[key]) {
      fail('source_digest_mismatch', `canonical digest mismatch for ${key}`);
    }
  }
}

function validateHistory(history, currentVersion, currentDigest, location) {
  if (!Array.isArray(history) || history.length === 0 || history.length > 128) {
    fail('trust_anchor_invalid', `${location} must be a non-empty bounded array`);
  }
  const versions = new Set();
  for (const [index, row] of history.entries()) {
    assertExactKeys(
      row,
      ['version', 'canonical_digest'],
      [],
      'trust_anchor_invalid',
      `${location}[${index}]`,
    );
    if (
      !VERSION_PATTERN.test(row.version) ||
      versions.has(row.version) ||
      typeof row.canonical_digest !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(row.canonical_digest)
    ) {
      fail('trust_anchor_invalid', `${location} contains an invalid or duplicate row`);
    }
    versions.add(row.version);
  }
  const currentRows = history.filter((row) => row.version === currentVersion);
  if (currentRows.length !== 1 || currentRows[0].canonical_digest !== currentDigest) {
    fail('trust_anchor_invalid', `${location} does not bind the current release digest`);
  }
}

function validateTrustAnchor(anchor) {
  assertExactKeys(
    anchor,
    [
      'schema_version',
      'anchor_id',
      'brand_id',
      'status',
      'model_invocation_allowed',
      'current_knowledge_version',
      'current_response_style_version',
      'source_digests',
      'knowledge_history',
      'response_style_history',
      'freshness_policy',
      'brand_isolation',
    ],
    [],
    'trust_anchor_invalid',
    'anchor',
  );
  if (anchor.schema_version !== '1.0') fail('trust_anchor_invalid', 'anchor schema version is invalid');
  assertNonEmptyString(anchor.anchor_id, 'trust_anchor_invalid', 'anchor.anchor_id', 120);
  assertNonEmptyString(anchor.brand_id, 'trust_anchor_invalid', 'anchor.brand_id', 64);
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(anchor.brand_id)) {
    fail('trust_anchor_invalid', 'anchor.brand_id is invalid');
  }
  if (anchor.status !== 'observation_build_only' || anchor.model_invocation_allowed !== false) {
    fail('trust_anchor_invalid', 'anchor must remain observation-only with model invocation disabled');
  }
  if (!VERSION_PATTERN.test(anchor.current_knowledge_version)) {
    fail('trust_anchor_invalid', 'anchor current knowledge version is invalid');
  }
  if (!VERSION_PATTERN.test(anchor.current_response_style_version)) {
    fail('trust_anchor_invalid', 'anchor current response style version is invalid');
  }
  assertDigestMap(anchor.source_digests, anchor.source_digests);
  validateHistory(
    anchor.knowledge_history,
    anchor.current_knowledge_version,
    anchor.source_digests.knowledge_release,
    'anchor.knowledge_history',
  );
  validateHistory(
    anchor.response_style_history,
    anchor.current_response_style_version,
    anchor.source_digests.response_style_release,
    'anchor.response_style_history',
  );
  assertExactKeys(
    anchor.freshness_policy,
    ['max_source_age_days', 'allowed_source_hosts'],
    [],
    'trust_anchor_invalid',
    'anchor.freshness_policy',
  );
  if (
    !Number.isInteger(anchor.freshness_policy.max_source_age_days) ||
    anchor.freshness_policy.max_source_age_days < 1 ||
    anchor.freshness_policy.max_source_age_days > 366
  ) {
    fail('trust_anchor_invalid', 'anchor max source age must be an integer from 1 to 366');
  }
  if (
    !Array.isArray(anchor.freshness_policy.allowed_source_hosts) ||
    anchor.freshness_policy.allowed_source_hosts.length === 0 ||
    anchor.freshness_policy.allowed_source_hosts.length > 16 ||
    new Set(anchor.freshness_policy.allowed_source_hosts).size !==
      anchor.freshness_policy.allowed_source_hosts.length ||
    anchor.freshness_policy.allowed_source_hosts.some(
      (host) => typeof host !== 'string' || host !== host.toLowerCase() || !/^[a-z0-9.-]+$/.test(host),
    )
  ) {
    fail('trust_anchor_invalid', 'anchor allowed source hosts must be a unique lowercase allowlist');
  }
  assertExactKeys(
    anchor.brand_isolation,
    ['forbidden_brand_names'],
    [],
    'trust_anchor_invalid',
    'anchor.brand_isolation',
  );
  normalizeForbiddenBrandNames(anchor.brand_isolation.forbidden_brand_names);
  return anchor;
}

function assertHistoryMatchesManifest(history, manifest, location) {
  const historyVersions = history.map((row) => row.version).sort();
  const manifestVersions = manifest.versions.map((row) => row.version).sort();
  if (canonicalize(historyVersions) !== canonicalize(manifestVersions)) {
    fail('trust_anchor_history_mismatch', `${location} does not exactly cover the manifest versions`);
  }
}

function validateManifest(manifest, kind, brandId, trustedVersion, asOfDate) {
  assertExactKeys(
    manifest,
    ['schema_version', 'brand_id', 'current_version', 'versions'],
    [],
    `${kind}_manifest_invalid`,
    `${kind}_manifest`,
  );
  if (manifest.schema_version !== '1.0' || manifest.brand_id !== brandId) {
    fail(`${kind}_manifest_invalid`, `${kind} manifest scope/version is invalid`);
  }
  if (manifest.current_version !== trustedVersion || !VERSION_PATTERN.test(manifest.current_version)) {
    fail(`${kind}_version_untrusted`, `${kind} manifest current version is not trusted`);
  }
  if (!Array.isArray(manifest.versions) || manifest.versions.length === 0) {
    fail(`${kind}_manifest_invalid`, `${kind} manifest versions must be non-empty`);
  }
  const seen = new Set();
  for (const [index, row] of manifest.versions.entries()) {
    const optional = kind === 'knowledge' ? ['categories'] : [];
    assertExactKeys(
      row,
      ['version', 'path', 'status', 'effective_at', 'approval_basis', 'supersedes'],
      optional,
      `${kind}_manifest_invalid`,
      `${kind}_manifest.versions[${index}]`,
    );
    if (!VERSION_PATTERN.test(row.version) || seen.has(row.version)) {
      fail(`${kind}_manifest_invalid`, `${kind} manifest has an invalid or duplicate version`);
    }
    seen.add(row.version);
    assertNonEmptyString(row.path, `${kind}_manifest_invalid`, `${kind} version path`, 240);
    const directoryName = kind === 'response_style' ? 'response-style' : kind;
    if (row.path.includes('..') || !row.path.startsWith(`support/brands/${brandId}/${directoryName}/`)) {
      fail(`${kind}_manifest_invalid`, `${kind} version path leaves the brand namespace`);
    }
    if (row.status !== 'approved') {
      fail(`${kind}_manifest_invalid`, `${kind} manifest contains a non-approved version`);
    }
    const effective = assertDateOnly(row.effective_at, `${kind}_manifest_invalid`, `${kind} effective_at`);
    if (effective.getTime() > asOfDate.getTime()) {
      fail(`${kind}_release_not_effective`, `${kind} version is not effective as of the trust time`);
    }
    assertNonEmptyString(row.approval_basis, `${kind}_manifest_invalid`, `${kind} approval_basis`, 240);
    if (!SAFE_REPOSITORY_REFERENCE.test(row.approval_basis) || row.approval_basis.includes('..')) {
      fail(`${kind}_manifest_invalid`, `${kind} approval basis is not a safe repository reference`);
    }
    if (row.supersedes !== null && !VERSION_PATTERN.test(row.supersedes)) {
      fail(`${kind}_manifest_invalid`, `${kind} supersedes value is invalid`);
    }
    if (kind === 'knowledge') {
      if (!Array.isArray(row.categories) || row.categories.length === 0) {
        fail('knowledge_manifest_invalid', 'knowledge categories must be non-empty');
      }
      const categories = new Set(row.categories);
      if (
        categories.size !== row.categories.length ||
        row.categories.some((category) => typeof category !== 'string' || !/^[a-z][a-z0-9_]{1,63}$/.test(category))
      ) {
        fail('knowledge_manifest_invalid', 'knowledge categories are invalid or duplicated');
      }
    }
  }
  const currentRows = manifest.versions.filter((row) => row.version === manifest.current_version);
  if (currentRows.length !== 1) {
    fail(`${kind}_manifest_invalid`, `${kind} current version must resolve exactly once`);
  }
  const current = currentRows[0];
  for (const row of manifest.versions) {
    if (row.supersedes === row.version) {
      fail(`${kind}_manifest_invalid`, `${kind} version cannot supersede itself`);
    }
    if (row.supersedes !== null && !seen.has(row.supersedes)) {
      fail(`${kind}_manifest_invalid`, `${kind} superseded version is absent`);
    }
  }
  const visited = new Set();
  let cursor = current;
  while (cursor !== null) {
    if (visited.has(cursor.version)) {
      fail(`${kind}_manifest_invalid`, `${kind} supersedes chain contains a cycle`);
    }
    visited.add(cursor.version);
    cursor = cursor.supersedes === null
      ? null
      : manifest.versions.find((row) => row.version === cursor.supersedes);
  }
  if (visited.size !== manifest.versions.length) {
    fail(`${kind}_manifest_invalid`, `${kind} supersedes chain is forked or disconnected`);
  }
  return current;
}

function assertHistoricalReleaseSet(historyReleases, manifest, anchorHistory, kind) {
  assertPlainObject(historyReleases, 'history_release_invalid', `${kind}_history_releases`);
  const expectedVersions = manifest.versions.map((row) => row.version).sort();
  const suppliedVersions = Object.keys(historyReleases).sort();
  if (canonicalize(suppliedVersions) !== canonicalize(expectedVersions)) {
    fail('history_release_set_mismatch', `${kind} history bodies do not exactly cover the manifest`);
  }
  const digestByVersion = new Map(anchorHistory.map((row) => [row.version, row.canonical_digest]));
  for (const version of expectedVersions) {
    assertPlainObject(historyReleases[version], 'history_release_invalid', `${kind}_history_releases.${version}`);
    if (sha256Canonical(historyReleases[version]) !== digestByVersion.get(version)) {
      fail('history_release_digest_mismatch', `${kind} historical release ${version} is not anchor-pinned`);
    }
  }
}

function validateLegacyKnowledgeRelease(release, row, brandId, asOfDate) {
  assertExactKeys(
    release,
    [
      'schema_version',
      'brand_id',
      'version',
      'status',
      'effective_at',
      'approval_basis',
      'scope',
      'entries',
    ],
    [],
    'history_release_invalid',
    `knowledge_history_releases.${row.version}`,
  );
  if (release.schema_version !== '1.0' || release.brand_id !== brandId) {
    fail('history_release_invalid', `legacy knowledge release ${row.version} scope is invalid`);
  }
  for (const key of ['version', 'status', 'effective_at', 'approval_basis']) {
    if (release[key] !== row[key]) {
      fail('history_release_manifest_mismatch', `legacy knowledge release ${row.version} ${key} drifted`);
    }
  }
  if (row.supersedes !== null) {
    fail('history_release_invalid', `legacy knowledge release ${row.version} must be the first version`);
  }
  const effective = assertDateOnly(
    release.effective_at,
    'history_release_invalid',
    `knowledge history ${row.version} effective_at`,
  );
  if (effective.getTime() > asOfDate.getTime()) {
    fail('knowledge_release_not_effective', `legacy knowledge release ${row.version} is not effective`);
  }
  assertExactKeys(
    release.scope,
    ['included', 'commercial_policy_included', 'live_order_facts_included'],
    [],
    'history_release_invalid',
    `knowledge_history_releases.${row.version}.scope`,
  );
  if (
    canonicalize(release.scope.included) !== canonicalize(row.categories) ||
    release.scope.commercial_policy_included !== false ||
    release.scope.live_order_facts_included !== false
  ) {
    fail('history_release_invalid', `legacy knowledge release ${row.version} scope drifted`);
  }
  if (!Array.isArray(release.entries) || release.entries.length === 0 || release.entries.length > 128) {
    fail('history_release_invalid', `legacy knowledge release ${row.version} entries are invalid`);
  }
  const ids = new Set();
  for (const [index, entry] of release.entries.entries()) {
    assertExactKeys(
      entry,
      ['knowledge_id', 'category', 'statement_ar', 'source'],
      [],
      'history_release_invalid',
      `knowledge_history_releases.${row.version}.entries[${index}]`,
    );
    if (!KNOWLEDGE_ID_PATTERN.test(entry.knowledge_id) || ids.has(entry.knowledge_id)) {
      fail('history_release_invalid', `legacy knowledge release ${row.version} contains invalid IDs`);
    }
    ids.add(entry.knowledge_id);
    if (!row.categories.includes(entry.category)) {
      fail('history_release_invalid', `legacy knowledge release ${row.version} category is not manifested`);
    }
    assertNonEmptyString(
      entry.statement_ar,
      'history_release_invalid',
      `knowledge history ${row.version} statement`,
      1200,
    );
    if (!/[\u0600-\u06ff]/u.test(entry.statement_ar)) {
      fail('history_release_invalid', `legacy knowledge release ${row.version} statement is not Arabic-first`);
    }
    if (
      typeof entry.source !== 'string' ||
      !SAFE_REPOSITORY_REFERENCE.test(entry.source) ||
      entry.source.includes('..')
    ) {
      fail('history_release_invalid', `legacy knowledge release ${row.version} source is unsafe`);
    }
  }
  const categories = [...new Set(release.entries.map((entry) => entry.category))].sort();
  if (canonicalize(categories) !== canonicalize([...row.categories].sort())) {
    fail('history_release_invalid', `legacy knowledge release ${row.version} categories are incomplete`);
  }
}

function validateKnowledgeReleaseHistory(sourceBundle, anchor, asOfDate) {
  const manifest = sourceBundle.knowledge_manifest;
  const historyReleases = sourceBundle.knowledge_history_releases;
  assertHistoricalReleaseSet(historyReleases, manifest, anchor.knowledge_history, 'knowledge');
  for (const row of manifest.versions) {
    if (row.path !== `support/brands/${anchor.brand_id}/knowledge/${row.version}.json`) {
      fail('knowledge_release_path_mismatch', `knowledge history path for ${row.version} is invalid`);
    }
    const release = historyReleases[row.version];
    if (Object.prototype.hasOwnProperty.call(release, 'scope')) {
      validateLegacyKnowledgeRelease(release, row, anchor.brand_id, asOfDate);
    } else {
      const validationRelease = cloneJson(release);
      if (!Object.prototype.hasOwnProperty.call(validationRelease, 'change_summary')) {
        validationRelease.change_summary = `Pinned historical release ${row.version}`;
      }
      validateKnowledgeRelease(
        validationRelease,
        row,
        anchor.brand_id,
        asOfDate,
        anchor.freshness_policy.max_source_age_days,
        anchor.freshness_policy.allowed_source_hosts,
      );
    }
  }
  if (
    canonicalize(historyReleases[anchor.current_knowledge_version]) !==
    canonicalize(sourceBundle.knowledge_release)
  ) {
    fail('history_release_current_mismatch', 'current knowledge body differs from its history body');
  }
}

function validateResponseStyleReleaseHistory(
  sourceBundle,
  anchor,
  registry,
  enabledChannels,
  asOfDate,
) {
  const manifest = sourceBundle.response_style_manifest;
  const historyReleases = sourceBundle.response_style_history_releases;
  assertHistoricalReleaseSet(
    historyReleases,
    manifest,
    anchor.response_style_history,
    'response_style',
  );
  for (const row of manifest.versions) {
    if (row.path !== `support/brands/${anchor.brand_id}/response-style/${row.version}.json`) {
      fail('response_style_release_path_mismatch', `response-style history path for ${row.version} is invalid`);
    }
    validateResponseStyle(
      historyReleases[row.version],
      row,
      registry,
      anchor.brand_id,
      enabledChannels,
      asOfDate,
    );
  }
  if (
    canonicalize(historyReleases[anchor.current_response_style_version]) !==
    canonicalize(sourceBundle.response_style_release)
  ) {
    fail('history_release_current_mismatch', 'current response-style body differs from its history body');
  }
}

function validateKnowledgeRelease(
  release,
  currentRow,
  brandId,
  asOfDate,
  maxSourceAgeDays,
  allowedSourceHosts,
) {
  assertExactKeys(
    release,
    [
      'schema_version',
      'brand_id',
      'version',
      'status',
      'effective_at',
      'approval_basis',
      'capture_basis',
      'supersedes',
      'change_summary',
      'sources',
      'entries',
    ],
    [],
    'knowledge_release_invalid',
    'knowledge_release',
  );
  if (release.schema_version !== '1.0' || release.brand_id !== brandId) {
    fail('knowledge_release_invalid', 'knowledge release scope/version is invalid');
  }
  for (const key of ['version', 'status', 'effective_at', 'approval_basis', 'supersedes']) {
    if (release[key] !== currentRow[key]) {
      fail('knowledge_release_manifest_mismatch', `knowledge release ${key} does not match its manifest row`);
    }
  }
  assertNonEmptyString(release.capture_basis, 'knowledge_release_invalid', 'knowledge capture_basis', 240);
  assertNonEmptyString(release.change_summary, 'knowledge_release_invalid', 'knowledge change_summary', 500);
  const effective = assertDateOnly(release.effective_at, 'knowledge_release_invalid', 'knowledge effective_at');
  if (effective.getTime() > asOfDate.getTime()) {
    fail('knowledge_release_not_effective', 'knowledge release is not yet effective');
  }
  if (!Array.isArray(release.sources) || release.sources.length === 0) {
    fail('knowledge_release_invalid', 'knowledge sources must be non-empty');
  }
  const sourceIds = new Set();
  let oldestRetrieved = null;
  let newestRetrieved = null;
  for (const [index, source] of release.sources.entries()) {
    assertExactKeys(
      source,
      ['source_id', 'url', 'retrieved_at', 'source_updated_at', 'use'],
      [],
      'knowledge_source_invalid',
      `knowledge.sources[${index}]`,
    );
    if (
      typeof source.source_id !== 'string' ||
      !/^[a-z][a-z0-9-]{2,80}$/.test(source.source_id) ||
      sourceIds.has(source.source_id)
    ) {
      fail('knowledge_source_invalid', 'knowledge source IDs must be unique safe identifiers');
    }
    sourceIds.add(source.source_id);
    let url;
    try {
      url = new URL(source.url);
    } catch {
      fail('knowledge_source_invalid', `knowledge source ${source.source_id} URL is invalid`);
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash ||
      !allowedSourceHosts.includes(url.hostname.toLowerCase())
    ) {
      fail('knowledge_source_invalid', `knowledge source ${source.source_id} URL is not a safe HTTPS URL`);
    }
    const retrieved = assertDateOnly(
      source.retrieved_at,
      'knowledge_source_invalid',
      `knowledge source ${source.source_id} retrieved_at`,
    );
    if (retrieved.getTime() > asOfDate.getTime()) {
      fail('knowledge_source_from_future', `knowledge source ${source.source_id} was retrieved in the future`);
    }
    const ageDays = Math.floor((asOfDate.getTime() - retrieved.getTime()) / 86400000);
    if (ageDays > maxSourceAgeDays) {
      fail('knowledge_source_stale', `knowledge source ${source.source_id} is older than the trust policy`);
    }
    if (source.source_updated_at !== null) {
      const updated = assertDateOnly(
        source.source_updated_at,
        'knowledge_source_invalid',
        `knowledge source ${source.source_id} source_updated_at`,
      );
      if (updated.getTime() > retrieved.getTime()) {
        fail('knowledge_source_invalid', `knowledge source ${source.source_id} update date is after retrieval`);
      }
    }
    assertNonEmptyString(source.use, 'knowledge_source_invalid', `knowledge source ${source.source_id} use`, 120);
    oldestRetrieved = oldestRetrieved === null || retrieved < oldestRetrieved ? retrieved : oldestRetrieved;
    newestRetrieved = newestRetrieved === null || retrieved > newestRetrieved ? retrieved : newestRetrieved;
  }

  if (!Array.isArray(release.entries) || release.entries.length === 0 || release.entries.length > 128) {
    fail('knowledge_release_invalid', 'knowledge entries must contain 1-128 entries');
  }
  const knowledgeIds = new Set();
  const facts = [];
  for (const [index, entry] of release.entries.entries()) {
    assertExactKeys(
      entry,
      ['knowledge_id', 'category', 'statement_ar', 'authority', 'source_ref'],
      ['customer_response_ar'],
      'knowledge_entry_invalid',
      `knowledge.entries[${index}]`,
    );
    if (!KNOWLEDGE_ID_PATTERN.test(entry.knowledge_id) || knowledgeIds.has(entry.knowledge_id)) {
      fail('knowledge_entry_invalid', 'knowledge IDs must be unique safe identifiers');
    }
    knowledgeIds.add(entry.knowledge_id);
    if (typeof entry.category !== 'string' || !/^[a-z][a-z0-9_]{1,63}$/.test(entry.category)) {
      fail('knowledge_entry_invalid', `knowledge entry ${entry.knowledge_id} category is invalid`);
    }
    assertNonEmptyString(entry.statement_ar, 'knowledge_entry_invalid', `${entry.knowledge_id}.statement_ar`, 1200);
    if (!/[\u0600-\u06ff]/u.test(entry.statement_ar)) {
      fail('knowledge_entry_invalid', `${entry.knowledge_id} statement is not Arabic-first`);
    }
    if (!AUTHORITY_VALUES.has(entry.authority)) {
      fail('knowledge_entry_invalid', `${entry.knowledge_id} authority is invalid`);
    }
    assertNonEmptyString(entry.source_ref, 'knowledge_entry_invalid', `${entry.knowledge_id}.source_ref`, 240);
    const sourceIsKnown = sourceIds.has(entry.source_ref);
    const repositoryReferenceIsSafe =
      SAFE_REPOSITORY_REFERENCE.test(entry.source_ref) && !entry.source_ref.includes('..');
    if (!sourceIsKnown && !repositoryReferenceIsSafe) {
      fail('knowledge_entry_invalid', `${entry.knowledge_id} source reference is not approved`);
    }
    let responseText = null;
    if (Object.prototype.hasOwnProperty.call(entry, 'customer_response_ar')) {
      assertNonEmptyString(
        entry.customer_response_ar,
        'knowledge_entry_invalid',
        `${entry.knowledge_id}.customer_response_ar`,
        1200,
      );
      if (entry.authority !== 'draft_only') {
        fail('restricted_fact_renderable', `${entry.knowledge_id} cannot expose customer response text`);
      }
      if (!/[\u0600-\u06ff]/u.test(entry.customer_response_ar)) {
        fail('knowledge_entry_invalid', `${entry.knowledge_id} response text is not Arabic-first`);
      }
      responseText = entry.customer_response_ar;
    }
    facts.push({
      knowledge_id: entry.knowledge_id,
      category: entry.category,
      statement_ar: entry.statement_ar,
      authority: entry.authority,
      source_ref: entry.source_ref,
      response_text: responseText,
    });
  }
  const factCategories = [...new Set(facts.map((fact) => fact.category))].sort();
  const manifestCategories = [...currentRow.categories].sort();
  if (canonicalize(factCategories) !== canonicalize(manifestCategories)) {
    fail('knowledge_category_mismatch', 'knowledge release categories do not match the manifest');
  }
  const validThrough = new Date(oldestRetrieved.getTime() + maxSourceAgeDays * 86400000)
    .toISOString()
    .slice(0, 10);
  return {
    facts: facts.sort((left, right) => left.knowledge_id.localeCompare(right.knowledge_id, 'en')),
    sources: cloneJson(release.sources).sort((left, right) => left.source_id.localeCompare(right.source_id, 'en')),
    categories: factCategories,
    oldest_retrieved_at: oldestRetrieved.toISOString().slice(0, 10),
    newest_retrieved_at: newestRetrieved.toISOString().slice(0, 10),
    valid_through: validThrough,
  };
}

function validateResponseStyle(release, currentRow, registry, brandId, enabledChannels, asOfDate) {
  assertExactKeys(
    release,
    [
      'schema_version',
      'brand_id',
      'version',
      'status',
      'effective_at',
      'approval_basis',
      'identity',
      'language',
      'channel_style',
      'order_lookup_behavior',
      'examples',
    ],
    [],
    'response_style_release_invalid',
    'response_style_release',
  );
  if (release.schema_version !== '1.0' || release.brand_id !== brandId) {
    fail('response_style_release_invalid', 'response style release scope/version is invalid');
  }
  for (const key of ['version', 'status', 'effective_at', 'approval_basis']) {
    if (release[key] !== currentRow[key]) {
      fail('response_style_release_manifest_mismatch', `response style ${key} does not match its manifest row`);
    }
  }
  const effective = assertDateOnly(
    release.effective_at,
    'response_style_release_invalid',
    'response style effective_at',
  );
  if (effective.getTime() > asOfDate.getTime()) {
    fail('response_style_release_not_effective', 'response style is not yet effective');
  }
  assertExactKeys(
    release.identity,
    ['public_name', 'arabic_brand_spelling', 'personal_employee_name', 'must_not_claim_human_identity'],
    [],
    'response_style_release_invalid',
    'response_style.identity',
  );
  if (
    release.identity.arabic_brand_spelling !== registry.display_name.ar ||
    release.identity.personal_employee_name !== null ||
    release.identity.must_not_claim_human_identity !== true
  ) {
    fail('response_style_identity_mismatch', 'response style identity does not match the registry safety contract');
  }
  assertNonEmptyString(release.identity.public_name, 'response_style_release_invalid', 'response style public_name', 120);
  assertExactKeys(
    release.language,
    ['default', 'register', 'rules'],
    [],
    'response_style_release_invalid',
    'response_style.language',
  );
  if (release.language.default !== 'ar-SA') {
    fail('response_style_release_invalid', 'response style must remain Arabic-first');
  }
  assertNonEmptyString(release.language.register, 'response_style_release_invalid', 'response style register', 120);
  if (
    !Array.isArray(release.language.rules) ||
    release.language.rules.length === 0 ||
    release.language.rules.length > 32 ||
    new Set(release.language.rules).size !== release.language.rules.length
  ) {
    fail('response_style_release_invalid', 'response style rules are invalid');
  }
  release.language.rules.forEach((rule, index) =>
    assertNonEmptyString(rule, 'response_style_release_invalid', `response style rule ${index}`, 500),
  );
  assertPlainObject(release.channel_style, 'response_style_release_invalid', 'response_style.channel_style');
  const styleChannels = Object.keys(release.channel_style).sort();
  if (canonicalize(styleChannels) !== canonicalize([...enabledChannels].sort())) {
    fail('response_style_channel_mismatch', 'response style channels do not match enabled registry channels');
  }
  for (const channel of styleChannels) {
    const required = ['max_sentences', 'emoji_max', 'formality'];
    const optional = channel === 'email' ? ['signature'] : [];
    const policy = release.channel_style[channel];
    assertExactKeys(
      policy,
      required,
      optional,
      'response_style_release_invalid',
      `response_style.channel_style.${channel}`,
    );
    if (!Number.isInteger(policy.max_sentences) || policy.max_sentences < 1 || policy.max_sentences > 6) {
      fail('response_style_release_invalid', `${channel} max_sentences is invalid`);
    }
    if (!Number.isInteger(policy.emoji_max) || policy.emoji_max < 0 || policy.emoji_max > 1) {
      fail('response_style_release_invalid', `${channel} emoji_max is invalid`);
    }
    if (channel === 'email' && policy.emoji_max !== 0) {
      fail('response_style_release_invalid', 'email emoji_max must remain zero');
    }
    assertNonEmptyString(policy.formality, 'response_style_release_invalid', `${channel} formality`, 40);
    if (channel === 'email') {
      assertNonEmptyString(policy.signature, 'response_style_release_invalid', 'email signature', 120);
    }
  }
  if (release.channel_style.email.signature !== release.identity.public_name) {
    fail('response_style_identity_mismatch', 'service identity must exactly match the approved email signature');
  }
  assertExactKeys(
    release.order_lookup_behavior,
    [
      'proactive_before_question',
      'whatsapp',
      'email',
      'instagram_tiktok',
      'order_number_alone_proves_ownership',
      'names_or_social_handles_can_link_identity',
      'ambiguous_match',
    ],
    [],
    'response_style_release_invalid',
    'response_style.order_lookup_behavior',
  );
  if (
    release.order_lookup_behavior.proactive_before_question !== true ||
    release.order_lookup_behavior.order_number_alone_proves_ownership !== false ||
    release.order_lookup_behavior.names_or_social_handles_can_link_identity !== false
  ) {
    fail('response_style_release_invalid', 'order lookup identity safeguards are missing');
  }
  if (!Array.isArray(release.examples) || release.examples.length === 0 || release.examples.length > 32) {
    fail('response_style_release_invalid', 'response style examples are invalid');
  }
  for (const [index, example] of release.examples.entries()) {
    assertExactKeys(
      example,
      ['scenario', 'channel', 'draft', 'authority'],
      [],
      'response_style_release_invalid',
      `response_style.examples[${index}]`,
    );
    if (!CHANNEL_VALUES.has(example.channel) || !enabledChannels.has(example.channel)) {
      fail('response_style_release_invalid', 'response style example channel is invalid');
    }
    assertNonEmptyString(example.scenario, 'response_style_release_invalid', 'response style scenario', 120);
    assertNonEmptyString(example.draft, 'response_style_release_invalid', 'response style example draft', 1200);
    assertNonEmptyString(example.authority, 'response_style_release_invalid', 'response style example authority', 120);
  }
  return cloneJson(release);
}

function validateRegistry(registry, anchor) {
  assertExactKeys(
    registry,
    [
      'schema_version',
      'brand_id',
      'display_name',
      'runtime',
      'chatwoot',
      'delay_policy',
      'knowledge',
      'response_style',
      'live_sources',
      'data_policy',
    ],
    [],
    'registry_invalid',
    'registry',
  );
  if (registry.schema_version !== '1.0' || registry.brand_id !== anchor.brand_id) {
    fail('registry_scope_mismatch', 'registry brand/schema does not match the trust anchor');
  }
  assertExactKeys(registry.display_name, ['en', 'ar', 'approved_public_name'], [], 'registry_invalid', 'registry.display_name');
  Object.entries(registry.display_name).forEach(([key, value]) =>
    assertNonEmptyString(value, 'registry_invalid', `registry.display_name.${key}`, 120),
  );
  if (
    registry.runtime.mode !== 'observation' ||
    registry.runtime.customer_egress_enabled !== false ||
    registry.runtime.kill_switch !== true
  ) {
    fail('unsafe_registry_runtime', 'compiler accepts only kill-switched observation registry state');
  }
  if (
    registry.knowledge.namespace !== anchor.brand_id ||
    registry.knowledge.current_version !== anchor.current_knowledge_version ||
    registry.response_style.current_version !== anchor.current_response_style_version
  ) {
    fail('registry_version_untrusted', 'registry source versions do not match trust');
  }
  if (
    typeof registry.knowledge.manifest_path !== 'string' ||
    registry.knowledge.manifest_path !== `support/brands/${anchor.brand_id}/knowledge/manifest.json`
  ) {
    fail('registry_invalid', 'knowledge manifest path is not brand scoped');
  }
  if (
    typeof registry.response_style.manifest_path !== 'string' ||
    registry.response_style.manifest_path !== `support/brands/${anchor.brand_id}/response-style/manifest.json`
  ) {
    fail('registry_invalid', 'response style manifest path is not brand scoped');
  }
  if (
    registry.data_policy.persist_message_bodies !== false ||
    registry.data_policy.persist_attachments !== false ||
    registry.data_policy.persist_raw_phone_numbers !== false ||
    registry.data_policy.persist_raw_email_addresses !== false ||
    registry.data_policy.persist_addresses !== false ||
    registry.data_policy.persist_order_payloads !== false ||
    registry.data_policy.persist_payment_data !== false ||
    registry.data_policy.cross_brand_linking !== false
  ) {
    fail('unsafe_registry_data_policy', 'registry data minimization safeguards are missing');
  }
  if (!registry.chatwoot || !Array.isArray(registry.chatwoot.channels)) {
    fail('registry_invalid', 'registry channel list is missing');
  }
  const enabledChannels = new Set();
  const inboxIds = new Set();
  for (const row of registry.chatwoot.channels) {
    if (!isPlainObject(row) || typeof row.channel !== 'string' || !Number.isInteger(row.inbox_id)) {
      fail('registry_invalid', 'registry contains an invalid channel row');
    }
    if (inboxIds.has(row.inbox_id)) fail('registry_invalid', 'registry inbox IDs must be unique');
    inboxIds.add(row.inbox_id);
    if (row.enabled === true && row.accept_events === true) {
      if (!CHANNEL_VALUES.has(row.channel) || enabledChannels.has(row.channel)) {
        fail('registry_invalid', 'enabled channel is unsupported or duplicated');
      }
      enabledChannels.add(row.channel);
    }
  }
  if (canonicalize([...enabledChannels].sort()) !== canonicalize([...CHANNEL_VALUES].sort())) {
    fail('registry_channel_scope_mismatch', 'all four approved channels must be enabled for this compiler release');
  }
  return enabledChannels;
}

function compileBrandContext(sourceBundle, anchor, asOf) {
  validateTrustAnchor(anchor);
  const sourceDigests = computeSourceDigests(sourceBundle);
  assertDigestMap(sourceDigests, anchor.source_digests);
  const registry = sourceBundle.registry;
  const asOfDateTime = assertDateTime(asOf, 'trust_anchor_invalid', 'compiler as_of');
  const asOfDay = new Date(`${asOfDateTime.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const enabledChannels = validateRegistry(registry, anchor);
  const knowledgeRow = validateManifest(
    sourceBundle.knowledge_manifest,
    'knowledge',
    anchor.brand_id,
    anchor.current_knowledge_version,
    asOfDay,
  );
  assertHistoryMatchesManifest(anchor.knowledge_history, sourceBundle.knowledge_manifest, 'knowledge history');
  validateKnowledgeReleaseHistory(sourceBundle, anchor, asOfDay);
  if (
    knowledgeRow.path !==
    `support/brands/${anchor.brand_id}/knowledge/${anchor.current_knowledge_version}.json`
  ) {
    fail('knowledge_release_path_mismatch', 'trusted knowledge release path is invalid');
  }
  const knowledge = validateKnowledgeRelease(
    sourceBundle.knowledge_release,
    knowledgeRow,
    anchor.brand_id,
    asOfDay,
    anchor.freshness_policy.max_source_age_days,
    anchor.freshness_policy.allowed_source_hosts,
  );
  const styleRow = validateManifest(
    sourceBundle.response_style_manifest,
    'response_style',
    anchor.brand_id,
    anchor.current_response_style_version,
    asOfDay,
  );
  assertHistoryMatchesManifest(
    anchor.response_style_history,
    sourceBundle.response_style_manifest,
    'response-style history',
  );
  validateResponseStyleReleaseHistory(
    sourceBundle,
    anchor,
    registry,
    enabledChannels,
    asOfDay,
  );
  if (
    styleRow.path !==
    `support/brands/${anchor.brand_id}/response-style/${anchor.current_response_style_version}.json`
  ) {
    fail('response_style_release_path_mismatch', 'trusted response style release path is invalid');
  }
  const responseStyle = validateResponseStyle(
    sourceBundle.response_style_release,
    styleRow,
    registry,
    anchor.brand_id,
    enabledChannels,
    asOfDay,
  );
  const renderableFacts = knowledge.facts
    .filter((fact) => fact.authority === 'draft_only' && fact.response_text !== null)
    .map((fact) => ({
      knowledge_id: fact.knowledge_id,
      authority: fact.authority,
      response_text: fact.response_text,
    }));
  if (renderableFacts.length === 0) {
    fail('renderable_knowledge_missing', 'knowledge release has no safe customer-response facts');
  }
  const forbiddenBrandNames = normalizeForbiddenBrandNames(anchor.brand_isolation.forbidden_brand_names);
  const compiled = {
    schema_version: '1.0',
    brand_id: anchor.brand_id,
    trust_anchor: {
      anchor_id: anchor.anchor_id,
      anchor_digest: sha256Canonical(anchor),
      status: anchor.status,
      model_invocation_allowed: anchor.model_invocation_allowed,
    },
    brand_identity: {
      display_name_en: registry.display_name.en,
      display_name_ar: registry.display_name.ar,
      approved_public_name: registry.display_name.approved_public_name,
    },
    enabled_channels: [...enabledChannels].sort(),
    brand_isolation: {
      policy: 'deny_explicit_cross_brand_references',
      forbidden_names: forbiddenBrandNames,
      forbidden_name_count: forbiddenBrandNames.length,
      forbidden_names_digest: sha256Canonical({
        brand_id: anchor.brand_id,
        forbidden_brand_names: forbiddenBrandNames,
      }),
    },
    source_versions: {
      registry_schema_version: registry.schema_version,
      knowledge_manifest_schema_version: sourceBundle.knowledge_manifest.schema_version,
      knowledge_version: sourceBundle.knowledge_release.version,
      response_style_manifest_schema_version: sourceBundle.response_style_manifest.schema_version,
      response_style_version: sourceBundle.response_style_release.version,
    },
    source_paths: {
      knowledge_manifest: registry.knowledge.manifest_path,
      knowledge_release: knowledgeRow.path,
      response_style_manifest: registry.response_style.manifest_path,
      response_style_release: styleRow.path,
    },
    source_digests: sourceDigests,
    freshness: {
      status: 'verified_against_explicit_trust_policy',
      policy_basis: 'retrieved_at_plus_pinned_max_age',
      source_snapshot_digests_present: false,
      as_of: asOf,
      max_source_age_days: anchor.freshness_policy.max_source_age_days,
      oldest_source_retrieved_at: knowledge.oldest_retrieved_at,
      newest_source_retrieved_at: knowledge.newest_retrieved_at,
      valid_through: knowledge.valid_through,
    },
    knowledge: {
      status: sourceBundle.knowledge_release.status,
      effective_at: sourceBundle.knowledge_release.effective_at,
      approval_basis: sourceBundle.knowledge_release.approval_basis,
      capture_basis: sourceBundle.knowledge_release.capture_basis,
      supersedes: sourceBundle.knowledge_release.supersedes,
      categories: knowledge.categories,
      sources: knowledge.sources,
      facts: knowledge.facts,
      renderable_fact_ids: renderableFacts.map((fact) => fact.knowledge_id),
    },
    response_style: responseStyle,
    core_context: {
      knowledge_version: sourceBundle.knowledge_release.version,
      knowledge_facts: renderableFacts,
      live_facts_status: 'not_requested',
      verified_live_facts: [],
    },
  };
  compiled.compiled_context_digest = sha256Canonical(compiled);
  return compiled;
}

function verifyCompiledContext(compiled) {
  assertPlainObject(compiled, 'compiled_context_invalid', 'compiled_context');
  if (typeof compiled.compiled_context_digest !== 'string') {
    fail('compiled_context_invalid', 'compiled context digest is missing');
  }
  const unsigned = cloneJson(compiled);
  const expected = unsigned.compiled_context_digest;
  delete unsigned.compiled_context_digest;
  const actual = sha256Canonical(unsigned);
  if (actual !== expected) {
    fail('compiled_context_digest_mismatch', 'compiled context digest does not match its content');
  }
  if (
    !compiled.trust_anchor ||
    typeof compiled.trust_anchor.anchor_id !== 'string' ||
    !/^sha256:[a-f0-9]{64}$/.test(compiled.trust_anchor.anchor_digest || '') ||
    compiled.trust_anchor.status !== 'observation_build_only' ||
    compiled.trust_anchor.model_invocation_allowed !== false ||
    !compiled.brand_identity ||
    typeof compiled.brand_identity.display_name_en !== 'string' ||
    typeof compiled.brand_identity.display_name_ar !== 'string' ||
    typeof compiled.brand_identity.approved_public_name !== 'string' ||
    !compiled.brand_isolation ||
    !Array.isArray(compiled.brand_isolation.forbidden_names) ||
    compiled.brand_isolation.forbidden_names.length === 0 ||
    compiled.brand_isolation.forbidden_name_count !== compiled.brand_isolation.forbidden_names.length ||
    compiled.brand_isolation.forbidden_names_digest !== sha256Canonical({
      brand_id: compiled.brand_id,
      forbidden_brand_names: compiled.brand_isolation.forbidden_names,
    }) ||
    !compiled.freshness ||
    compiled.freshness.status !== 'verified_against_explicit_trust_policy' ||
    compiled.freshness.policy_basis !== 'retrieved_at_plus_pinned_max_age' ||
    compiled.freshness.source_snapshot_digests_present !== false
  ) {
    fail('compiled_context_invalid', 'compiled context freshness is not verified');
  }
  return true;
}

function verifyCompiledContextReleasePin(pin, compiled) {
  verifyCompiledContext(compiled);
  assertExactKeys(
    pin,
    [
      'schema_version',
      'release_id',
      'brand_id',
      'status',
      'model_invocation_allowed',
      'compiled_as_of',
      'anchor_id',
      'expected_anchor_digest',
      'expected_compiled_context_digest',
    ],
    [],
    'compiled_context_release_pin_invalid',
    'compiled_context_release_pin',
  );
  if (
    pin.schema_version !== '1.0' ||
    typeof pin.release_id !== 'string' ||
    !/^[a-z0-9][a-z0-9-]{2,120}$/.test(pin.release_id) ||
    pin.brand_id !== compiled.brand_id ||
    pin.status !== 'observation_build_only' ||
    pin.model_invocation_allowed !== false ||
    pin.compiled_as_of !== compiled.freshness.as_of ||
    pin.anchor_id !== compiled.trust_anchor.anchor_id ||
    pin.expected_anchor_digest !== compiled.trust_anchor.anchor_digest ||
    pin.expected_compiled_context_digest !== compiled.compiled_context_digest
  ) {
    fail('compiled_context_release_pin_mismatch', 'compiled context does not match the independent release pin');
  }
  assertDateTime(
    pin.compiled_as_of,
    'compiled_context_release_pin_invalid',
    'compiled_context_release_pin.compiled_as_of',
  );
  for (const [location, digest] of [
    ['expected_anchor_digest', pin.expected_anchor_digest],
    ['expected_compiled_context_digest', pin.expected_compiled_context_digest],
  ]) {
    if (typeof digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(digest)) {
      fail('compiled_context_release_pin_invalid', `compiled context release pin ${location} is invalid`);
    }
  }
  return true;
}

function assertCompiledContextFreshAt(compiled, evaluatedAt) {
  verifyCompiledContext(compiled);
  const evaluated = assertDateTime(evaluatedAt, 'evaluation_time_invalid', 'evaluated_at');
  const compiledAsOf = assertDateTime(compiled.freshness.as_of, 'compiled_context_invalid', 'freshness.as_of');
  const evaluatedDay = evaluated.toISOString().slice(0, 10);
  if (evaluated.getTime() < compiledAsOf.getTime()) {
    fail('evaluation_time_rollback', 'evaluation time predates the compiled freshness check');
  }
  if (evaluatedDay > compiled.freshness.valid_through) {
    fail('compiled_context_stale', 'compiled context is outside its source freshness window');
  }
  return true;
}

module.exports = {
  ContextCompilerError,
  SOURCE_BUNDLE_KEYS,
  SOURCE_KEYS,
  assertCompiledContextFreshAt,
  canonicalize,
  compileBrandContext,
  computeSourceDigests,
  sha256Canonical,
  verifyCompiledContext,
  verifyCompiledContextReleasePin,
};
