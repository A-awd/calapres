'use strict';

const {
  AtomicStorageContract,
  JOB_CONTROL_FIELDS,
  PILOT_BRAND_ID,
  RECONCILIATION_ACTIVATION_FLOOR_AT,
  RECONCILIATION_ACTIVATION_POLICY_VERSION,
  RECONCILIATION_PROOF_ROW_FIELDS,
  RFC3339_UTC,
  patterns,
  safeAtomicCall,
  validateCommand,
} = require('./atomic-storage-contract');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function composite(...parts) {
  return parts.join('\u0000');
}

function aliases(activeFingerprint, activeKeyVersion, retainedFingerprints) {
  return [
    { fingerprint: activeFingerprint, key_version: activeKeyVersion },
    ...retainedFingerprints,
  ];
}

function committed(outcome, value) {
  return { status: 'committed', outcome, value };
}

function conflict(outcome, value = null) {
  return { status: 'duplicate_or_conflict', outcome, value };
}

function unknown(outcome, errorCode) {
  return { status: 'unknown', outcome, value: null, error_code: errorCode };
}

function nullablePattern(value, pattern) {
  return value === null || (typeof value === 'string' && pattern.test(value));
}

const EXPECTED_DECISION_FIELDS = Object.freeze([
  'action',
  'command_digest',
  'case_reply_sha256',
  'knowledge_proposal_sha256',
  'base_knowledge_version',
  'knowledge_version_to_publish',
  'supersedes_knowledge_version',
]);

const KEY_NAMESPACES = Object.freeze([
  'request_replay',
  'business_event',
  'message_identity',
]);

const RECONCILIATION_STABLE_CONTROL_FIELDS = Object.freeze(
  JOB_CONTROL_FIELDS.filter((field) => ![
    'event_identity_key_version',
    'event_identity_fingerprint',
    'message_fingerprint',
  ].includes(field)),
);

const DEFAULT_KEY_REGISTRY = Object.freeze({
  registry_version: 'calapres-storage-keys-v1',
  namespaces: Object.freeze(Object.fromEntries(KEY_NAMESPACES.map((namespace) => [
    namespace,
    Object.freeze({
      active_key_version: 'hmac-sha256-v1',
      retained_key_versions: Object.freeze([]),
      coverage_until_by_version: Object.freeze({ 'hmac-sha256-v1': null }),
    }),
  ]))),
});

class InMemoryAtomicStorage extends AtomicStorageContract {
  constructor(seed = {}, { clock = () => Date.now(), keyRegistry = DEFAULT_KEY_REGISTRY } = {}) {
    super();
    if (typeof clock !== 'function') throw new TypeError('clock must be a function');
    this._clock = clock;
    this._keyRegistry = this._normalizeKeyRegistry(keyRegistry);
    this._requestReplays = new Map();
    this._businessEvents = new Map();
    this._observations = new Map();
    this._jobs = new Map();
    this._heads = new Map();
    this._ownerNonces = new Map();
    this._incidents = new Map();
    this._ownerReviewPreparations = new Map();
    this._decisionOptions = new Map();
    this._approvals = new Map();
    this._audits = new Map();
    this._reconciliationScans = new Map();
    this._reconciliationCursors = new Map();
    this._reconciliationCursorCommits = new Map();
    this._tail = Promise.resolve();
    this._seed(seed);
  }

  _normalizeKeyRegistry(value) {
    const rootKeys = Object.keys(value || {}).sort().join(',');
    if (rootKeys !== 'namespaces,registry_version' ||
        !patterns.KEY_REGISTRY_VERSION.test(value.registry_version || '')) {
      throw new TypeError('keyRegistry root is invalid');
    }
    if (Object.keys(value.namespaces || {}).sort().join(',') !== [...KEY_NAMESPACES].sort().join(',')) {
      throw new TypeError('keyRegistry namespaces are invalid');
    }
    const namespaces = {};
    for (const namespace of KEY_NAMESPACES) {
      const entry = value.namespaces[namespace];
      if (Object.keys(entry || {}).sort().join(',') !==
          'active_key_version,coverage_until_by_version,retained_key_versions') {
        throw new TypeError(`keyRegistry.${namespace} is invalid`);
      }
      if (!patterns.KEY_VERSION.test(entry.active_key_version || '') ||
          !Array.isArray(entry.retained_key_versions) || entry.retained_key_versions.length > 8 ||
          new Set(entry.retained_key_versions).size !== entry.retained_key_versions.length ||
          entry.retained_key_versions.includes(entry.active_key_version) ||
          entry.retained_key_versions.some((version) => !patterns.KEY_VERSION.test(version))) {
        throw new TypeError(`keyRegistry.${namespace} versions are invalid`);
      }
      const versions = [entry.active_key_version, ...entry.retained_key_versions];
      const coverage = entry.coverage_until_by_version;
      if (!coverage || typeof coverage !== 'object' || Array.isArray(coverage) ||
          Object.keys(coverage).sort().join(',') !== [...versions].sort().join(',')) {
        throw new TypeError(`keyRegistry.${namespace} coverage is invalid`);
      }
      for (const version of versions) {
        if (coverage[version] !== null &&
            (!RFC3339_UTC.test(coverage[version]) ||
             new Date(Date.parse(coverage[version])).toISOString() !== coverage[version])) {
          throw new TypeError(`keyRegistry.${namespace} coverage is invalid`);
        }
      }
      namespaces[namespace] = {
        active_key_version: entry.active_key_version,
        retained_key_versions: [...entry.retained_key_versions],
        coverage_until_by_version: { ...coverage },
      };
    }
    return { registry_version: value.registry_version, namespaces };
  }

  _nowMilliseconds() {
    const value = this._clock();
    const milliseconds = value instanceof Date ? value.getTime() : value;
    if (!Number.isFinite(milliseconds)) {
      throw new TypeError('clock must return a Date or finite epoch milliseconds');
    }
    return milliseconds;
  }

  _now() {
    const milliseconds = this._nowMilliseconds();
    return { milliseconds, timestamp: new Date(milliseconds).toISOString() };
  }

  _seed(seed) {
    const allowed = new Set(['owner_nonces', 'incidents']);
    for (const key of Object.keys(seed)) {
      if (!allowed.has(key)) throw new TypeError(`unsupported seed collection: ${key}`);
    }
    for (const nonce of seed.owner_nonces || []) {
      const keys = Object.keys(nonce).sort().join(',');
      if (keys !== 'brand_id,expires_at,issued_at,key_version,nonce_fingerprint') {
        throw new TypeError('owner nonce seed has unexpected fields');
      }
      if (nonce.brand_id !== PILOT_BRAND_ID ||
          !patterns.HEX_64.test(nonce.nonce_fingerprint) ||
          !patterns.KEY_VERSION.test(nonce.key_version) ||
          !RFC3339_UTC.test(nonce.issued_at) ||
          !RFC3339_UTC.test(nonce.expires_at) ||
          new Date(Date.parse(nonce.issued_at)).toISOString() !== nonce.issued_at ||
          new Date(Date.parse(nonce.expires_at)).toISOString() !== nonce.expires_at ||
          Date.parse(nonce.expires_at) <= Date.parse(nonce.issued_at)) {
        throw new TypeError('owner nonce seed is invalid');
      }
      this._ownerNonces.set(
        composite(nonce.brand_id, nonce.key_version, nonce.nonce_fingerprint),
        {
          ...clone(nonce),
          preparation_id: 'seed_reference_only',
          consumed_by: null,
          consumed_digest: null,
          consumed_at: null,
        },
      );
    }
    for (const incident of seed.incidents || []) {
      const keys = Object.keys(incident).sort().join(',');
      if (keys !== 'brand_id,expected_decision,incident_id,revision,status') {
        throw new TypeError('incident seed has unexpected fields');
      }
      const expectedKeys = Object.keys(incident.expected_decision || {}).sort();
      if (expectedKeys.join(',') !== [...EXPECTED_DECISION_FIELDS].sort().join(',')) {
        throw new TypeError('incident expected_decision has unexpected fields');
      }
      const expected = incident.expected_decision;
      const expectedValid = ['reply_only', 'approve', 'approve_until', 'correct'].includes(expected.action) &&
        patterns.HEX_64.test(expected.command_digest || '') &&
        patterns.HEX_64.test(expected.case_reply_sha256 || '') &&
        nullablePattern(expected.knowledge_proposal_sha256, patterns.HEX_64) &&
        nullablePattern(expected.base_knowledge_version, patterns.KNOWLEDGE_VERSION) &&
        nullablePattern(expected.knowledge_version_to_publish, patterns.KNOWLEDGE_VERSION) &&
        nullablePattern(expected.supersedes_knowledge_version, patterns.KNOWLEDGE_VERSION);
      if (incident.brand_id !== PILOT_BRAND_ID ||
          !/^inc_[A-Za-z0-9_-]{8,80}$/.test(incident.incident_id) ||
          !Number.isInteger(incident.revision) || incident.revision < 1 ||
          typeof incident.status !== 'string' || !expectedValid) {
        throw new TypeError('incident seed is invalid');
      }
      this._incidents.set(
        composite(incident.brand_id, incident.incident_id),
        {
          ...clone(incident),
          source_observation_id: null,
          source_observation_digest: null,
          preparation_id: 'seed_reference_only',
          review_snapshot_digest: null,
          owner_decision_ref: null,
          audit_ref: null,
          decided_at: null,
        },
      );
      this._decisionOptions.set(
        composite(
          incident.brand_id,
          incident.incident_id,
          'seed_reference_only',
          incident.expected_decision.command_digest,
        ),
        clone(incident.expected_decision),
      );
    }
  }

  _atomic(action) {
    const operation = this._tail.then(action);
    this._tail = operation.catch(() => undefined);
    return operation;
  }

  _safe(operation, command, action) {
    return safeAtomicCall(operation, async () => {
      validateCommand(operation, command);
      return this._atomic(action);
    });
  }

  _purgeExpiredClaims(collection, brandId, now) {
    const expired = new Set();
    for (const record of new Set(collection.values())) {
      if (record.brand_id === brandId && Date.parse(record.expires_at) <= now) expired.add(record);
    }
    for (const [key, record] of collection.entries()) {
      if (expired.has(record)) collection.delete(key);
    }
  }

  _storedVersions(namespace, brandId, now) {
    const versions = new Set();
    if (namespace === 'request_replay' || namespace === 'business_event') {
      const collection = namespace === 'request_replay' ? this._requestReplays : this._businessEvents;
      this._purgeExpiredClaims(collection, brandId, now);
      for (const record of new Set(collection.values())) {
        if (record.brand_id === brandId && Date.parse(record.expires_at) > now) {
          record.aliases.forEach((item) => versions.add(item.key_version));
        }
      }
    } else {
      for (const job of this._jobs.values()) {
        if (job.brand_id === brandId && Date.parse(job.retention_until) > now) {
          job.message_fingerprints.forEach((item) => versions.add(item.key_version));
        }
      }
    }
    return versions;
  }

  _coverageState(namespace, command, commandAliases, now, requiredThrough) {
    if (command.key_registry_version !== this._keyRegistry.registry_version) {
      return unknown('key_registry_version_unknown', 'key_coverage_incomplete');
    }
    const registry = this._keyRegistry.namespaces[namespace];
    const requiredVersions = [registry.active_key_version, ...registry.retained_key_versions];
    const providedVersions = commandAliases.map((item) => item.key_version);
    if (command.active_key_version !== registry.active_key_version ||
        requiredVersions.length !== providedVersions.length ||
        requiredVersions.some((version) => !providedVersions.includes(version))) {
      return unknown('key_coverage_incomplete', 'key_coverage_incomplete');
    }
    const storedVersions = this._storedVersions(namespace, command.brand_id, now);
    if ([...storedVersions].some((version) => !requiredVersions.includes(version))) {
      return unknown('key_coverage_incomplete', 'key_coverage_incomplete');
    }
    for (const version of requiredVersions) {
      const coverageUntil = registry.coverage_until_by_version[version];
      if (coverageUntil !== null && Date.parse(coverageUntil) < requiredThrough) {
        return unknown('key_coverage_incomplete', 'key_coverage_incomplete');
      }
    }
    return null;
  }

  _matchingClaim(collection, brandId, commandAliases) {
    const records = new Set();
    for (const item of commandAliases) {
      const record = collection.get(composite(brandId, item.key_version, item.fingerprint));
      if (record) records.add(record);
    }
    const byClaimId = new Map([...records].map((record) => [record.claim_id, record]));
    if (byClaimId.size > 1) {
      return { conflict: unknown('alias_conflict', 'key_alias_conflict'), record: null };
    }
    return { conflict: null, record: byClaimId.values().next().value || null };
  }

  _claimById(collection, brandId, claimId) {
    return [...new Set(collection.values())].find((record) =>
      record.brand_id === brandId && record.claim_id === claimId,
    ) || null;
  }

  _healAliases(collection, record, commandAliases) {
    const pairs = new Set(record.aliases.map((item) => `${item.key_version}:${item.fingerprint}`));
    for (const item of commandAliases) {
      const key = composite(record.brand_id, item.key_version, item.fingerprint);
      const existing = collection.get(key);
      if (existing && existing !== record) return false;
    }
    for (const item of commandAliases) {
      const key = composite(record.brand_id, item.key_version, item.fingerprint);
      collection.set(key, record);
      const pair = `${item.key_version}:${item.fingerprint}`;
      if (!pairs.has(pair)) {
        record.aliases.push(clone(item));
        pairs.add(pair);
      }
    }
    return true;
  }

  _jobControlValue(job) {
    return Object.fromEntries(JOB_CONTROL_FIELDS.map((field) => [field, job[field]]));
  }

  _jobControlMatchesCommand(job, command) {
    return JOB_CONTROL_FIELDS.every((field) => job[field] === command[field]);
  }

  _jobReconciliationControlMatchesCommand(job, command) {
    return RECONCILIATION_STABLE_CONTROL_FIELDS.every((field) => job[field] === command[field]);
  }

  _completedBusinessJob(record) {
    const job = this._jobs.get(composite(record.brand_id, record.job_id));
    const observation = this._observations.get(composite(record.brand_id, record.observation_id));
    const audit = this._audits.get(composite(record.brand_id, record.audit_id));
    const storageKeyVersion = job && job.event_identity_key_version.replace(
      'calapres-identity-hmac-',
      'hmac-sha256-',
    );
    const eventAliasBound = job && record.aliases.some((item) =>
      item.key_version === storageKeyVersion &&
      item.fingerprint === job.event_identity_fingerprint,
    );
    if (!job || job.business_claim_id !== record.claim_id || job.job_id !== record.job_id ||
        job.state !== 'completed' || !eventAliasBound || !observation || !audit ||
        observation.claim_id !== record.claim_id || observation.job_id !== job.job_id ||
        observation.observation_id !== record.observation_id ||
        observation.audit_id !== record.audit_id ||
        audit.claim_id !== record.claim_id || audit.job_id !== job.job_id ||
        audit.observation_id !== record.observation_id || audit.audit_id !== record.audit_id ||
        audit.event_type !== 'business_event_completed') {
      return null;
    }
    return job;
  }

  _messageAliasReconciliationPlan(job, commandAliases, now) {
    const storedByVersion = new Map();
    for (const item of job.message_fingerprints) {
      if (storedByVersion.has(item.key_version) &&
          storedByVersion.get(item.key_version) !== item.fingerprint) {
        return { failure: unknown('alias_conflict', 'key_alias_conflict'), additions: [] };
      }
      storedByVersion.set(item.key_version, item.fingerprint);
    }
    const overlap = commandAliases.some((item) =>
      storedByVersion.get(item.key_version) === item.fingerprint,
    );
    if (!overlap) {
      return { failure: conflict('message_identity_binding_mismatch'), additions: [] };
    }
    if (commandAliases.some((item) =>
      storedByVersion.has(item.key_version) &&
      storedByVersion.get(item.key_version) !== item.fingerprint,
    )) {
      return { failure: unknown('alias_conflict', 'key_alias_conflict'), additions: [] };
    }
    const additions = [];
    for (const item of commandAliases) {
      const other = [...this._jobs.values()].find((candidate) => candidate !== job &&
        candidate.brand_id === job.brand_id && Date.parse(candidate.retention_until) > now &&
        candidate.message_fingerprints.some((stored) =>
          stored.key_version === item.key_version && stored.fingerprint === item.fingerprint,
        ));
      if (other) return { failure: unknown('alias_conflict', 'key_alias_conflict'), additions: [] };
      if (!storedByVersion.has(item.key_version)) additions.push(clone(item));
    }
    return { failure: null, additions };
  }

  _requestValue(record, job = null) {
    const base = {
      claim_id: record.claim_id,
      lifecycle_status: record.lifecycle_status,
      claimed_at: record.claimed_at,
      expires_at: record.expires_at,
      lease_expires_at: record.lease_expires_at,
      attempt_count: record.attempt_count,
      request_source: record.request_source,
      source_binding_sha256: record.source_binding_sha256,
    };
    if (record.lifecycle_status !== 'completed') return base;
    return {
      ...base,
      business_claim_id: record.business_claim_id,
      job_id: record.job_id,
      conversation_id: record.conversation_id,
      generation: record.generation,
      due_at: record.due_at,
      ...(job ? this._jobControlValue(job) : {}),
    };
  }

  _requestProvenanceMatches(record, command) {
    return record.request_source === command.request_source &&
      record.source_binding_sha256 === command.source_binding_sha256;
  }

  _ingressProvenanceValue(record) {
    return {
      request_source: record.request_source,
      source_binding_sha256: record.source_binding_sha256,
      reconciliation_scan_id: record.reconciliation_scan_id,
      reconciliation_expected_after_message_id: record.reconciliation_expected_after_message_id,
      reconciliation_page_binding_sha256: record.reconciliation_page_binding_sha256,
    };
  }

  _requestIngressBindingMatches(record, command) {
    if (!this._requestProvenanceMatches(record, command)) return false;
    if (command.request_source === 'chatwoot_signed_webhook_v1') {
      return record.reconciliation_scan_id === null &&
        record.reconciliation_expected_after_message_id === null &&
        record.reconciliation_page_binding_sha256 === null;
    }
    return record.reconciliation_scan_id === command.reconciliation_scan_id &&
      record.reconciliation_expected_after_message_id ===
        command.reconciliation_expected_after_message_id &&
      record.reconciliation_page_binding_sha256 ===
        command.reconciliation_page_binding_sha256;
  }

  _completeRequestIngressProvenance(record, command) {
    record.reconciliation_scan_id = command.reconciliation_scan_id;
    record.reconciliation_expected_after_message_id =
      command.reconciliation_expected_after_message_id;
    record.reconciliation_page_binding_sha256 = command.reconciliation_page_binding_sha256;
  }

  _reconciliationIngressGate(command, now) {
    if (command.request_source === 'chatwoot_signed_webhook_v1') return true;
    const scan = this._reconciliationScans.get(composite(
      command.brand_id,
      command.account_id,
      command.inbox_id,
    ));
    if (!scan || scan.scan_id !== command.reconciliation_scan_id ||
        scan.lease_token !== command.reconciliation_scan_lease_token ||
        scan.channel !== command.channel ||
        scan.activation_floor_at !== RECONCILIATION_ACTIVATION_FLOOR_AT ||
        scan.activation_policy_version !== RECONCILIATION_ACTIVATION_POLICY_VERSION ||
        Date.parse(scan.lease_expires_at) <= now) {
      return false;
    }
    const cursor = this._reconciliationCursors.get(composite(
      command.brand_id,
      command.account_id,
      command.inbox_id,
      command.conversation_id,
    ));
    if (cursor && (cursor.channel !== command.channel ||
        cursor.activation_floor_at !== RECONCILIATION_ACTIVATION_FLOOR_AT ||
        cursor.activation_policy_version !== RECONCILIATION_ACTIVATION_POLICY_VERSION)) {
      return false;
    }
    return (cursor ? cursor.after_message_id : 0) ===
      command.reconciliation_expected_after_message_id;
  }

  _reconciliationScanValue(record) {
    return {
      account_id: record.account_id,
      inbox_id: record.inbox_id,
      channel: record.channel,
      scan_id: record.scan_id,
      lease_owner_id: record.lease_owner_id,
      lease_token: record.lease_token,
      lease_claimed_at: record.lease_claimed_at,
      lease_expires_at: record.lease_expires_at,
      lease_duration_seconds: record.lease_duration_seconds,
      attempt_count: record.attempt_count,
      max_pages: record.max_pages,
      activation_floor_at: record.activation_floor_at,
      activation_policy_version: record.activation_policy_version,
    };
  }

  _reconciliationScanBindingMatches(record, command) {
    return record.account_id === command.account_id && record.inbox_id === command.inbox_id &&
      record.channel === command.channel &&
      record.lease_duration_seconds === command.lease_duration_seconds &&
      record.max_pages === command.max_pages &&
      record.activation_floor_at === command.activation_floor_at &&
      record.activation_policy_version === command.activation_policy_version;
  }

  _reconciliationScanIdentifierConflict(command, ignoredRecord = null) {
    for (const record of this._reconciliationScans.values()) {
      if (record === ignoredRecord || record.brand_id !== command.brand_id) continue;
      if (record.scan_id === command.scan_id) return 'scan_id_conflict';
      if (record.lease_token === command.lease_token) return 'scan_lease_token_conflict';
    }
    return null;
  }

  _reconciliationProofRowsEqual(left, right) {
    return left.length === right.length && left.every((row, index) =>
      RECONCILIATION_PROOF_ROW_FIELDS.every((field) => row[field] === right[index][field]),
    );
  }

  _reconciliationCursorCommitMatches(commit, command) {
    return commit.scan_id === command.scan_id && commit.lease_token === command.lease_token &&
      commit.new_after_message_id === command.new_after_message_id &&
      commit.page_binding_sha256 === command.page_binding_sha256 &&
      commit.outcome_digest === command.outcome_digest && commit.row_count === command.row_count &&
      commit.activation_floor_at === command.activation_floor_at &&
      commit.activation_policy_version === command.activation_policy_version &&
      this._reconciliationProofRowsEqual(commit.proof_rows, command.proof_rows);
  }

  _reconciliationDurableProofsValid(command, now) {
    for (const proof of command.proof_rows) {
      if (proof.classification !== 'event_candidate') continue;
      const storageKeyVersion = proof.event_identity_key_version.replace(
        'calapres-identity-hmac-',
        'hmac-sha256-',
      );
      const event = this._businessEvents.get(composite(
        command.brand_id,
        storageKeyVersion,
        proof.event_identity_fingerprint,
      ));
      const job = this._jobs.get(composite(command.brand_id, proof.job_id));
      if (!event || !job || event.claim_id !== proof.business_claim_id ||
          event.job_id !== proof.job_id || Date.parse(event.retention_until) <= now ||
          job.business_claim_id !== proof.business_claim_id ||
          job.account_id !== command.account_id || job.inbox_id !== command.inbox_id ||
          job.channel !== command.channel || job.conversation_id !== command.conversation_id ||
          job.anchor_message_id !== proof.message_id || job.generation !== proof.generation ||
          Date.parse(job.retention_until) <= now) {
        return false;
      }
    }
    return true;
  }

  _businessEventRetentionCoverageValid(event, command, requiredThrough) {
    if (command.key_registry_version !== this._keyRegistry.registry_version) return false;
    const registry = this._keyRegistry.namespaces.business_event;
    const storageKeyVersion = command.event_identity_key_version.replace(
      'calapres-identity-hmac-',
      'hmac-sha256-',
    );
    const requiredVersions = [registry.active_key_version, ...registry.retained_key_versions];
    const eventVersions = event.aliases.map((alias) => alias.key_version);
    if (storageKeyVersion !== registry.active_key_version ||
        requiredVersions.length !== eventVersions.length ||
        requiredVersions.some((version) => !eventVersions.includes(version))) {
      return false;
    }
    return eventVersions.every((version) => {
      const coverageUntil = registry.coverage_until_by_version[version];
      return coverageUntil === null || Date.parse(coverageUntil) >= requiredThrough;
    });
  }

  _extendBusinessEventRetention(event, retentionUntil) {
    event.expires_at = new Date(Math.max(
      Date.parse(event.expires_at),
      Date.parse(retentionUntil),
    )).toISOString();
    event.retention_until = new Date(Math.max(
      Date.parse(event.retention_until),
      Date.parse(retentionUntil),
    )).toISOString();
  }

  _reconciliationCursorResult(commit) {
    return {
      account_id: commit.account_id,
      inbox_id: commit.inbox_id,
      channel: commit.channel,
      conversation_id: commit.conversation_id,
      scan_id: commit.scan_id,
      expected_after_message_id: commit.expected_after_message_id,
      new_after_message_id: commit.new_after_message_id,
      page_binding_sha256: commit.page_binding_sha256,
      outcome_digest: commit.outcome_digest,
      row_count: commit.row_count,
      advanced_at: commit.advanced_at,
      activation_floor_at: commit.activation_floor_at,
      activation_policy_version: commit.activation_policy_version,
    };
  }

  claim_request_replay(command) {
    return this._safe('claim_request_replay', command, () => {
      const current = this._now();
      const now = current.milliseconds;
      const expiresAt = now + command.request_ttl_seconds * 1000;
      const leaseExpiresAt = now + command.lease_duration_seconds * 1000;
      const commandAliases = aliases(
        command.active_fingerprint,
        command.active_key_version,
        command.retained_fingerprints,
      );
      const coverage = this._coverageState(
        'request_replay', command, commandAliases, now, expiresAt,
      );
      if (coverage) return coverage;
      const match = this._matchingClaim(this._requestReplays, command.brand_id, commandAliases);
      if (match.conflict) return match.conflict;
      if (match.record) {
        const record = match.record;
        if (!this._requestProvenanceMatches(record, command)) {
          return unknown('request_provenance_mismatch', 'durable_reference_conflict');
        }
        if (!this._healAliases(this._requestReplays, record, commandAliases)) {
          return unknown('alias_conflict', 'key_alias_conflict');
        }
        if (record.lifecycle_status === 'completed') {
          const job = this._jobs.get(composite(record.brand_id, record.job_id));
          if (!job || job.business_claim_id !== record.business_claim_id ||
              job.conversation_id !== record.conversation_id ||
              job.generation !== record.generation || job.due_at !== record.due_at) {
            return unknown('bound_job_missing', 'durable_reference_conflict');
          }
          return conflict('duplicate_completed', this._requestValue(record, job));
        }
        if (record.lease_owner_id === command.lease_owner_id &&
            record.lease_token === command.lease_token &&
            Date.parse(record.lease_expires_at) > now) {
          return committed('processing_owned', this._requestValue(record));
        }
        if (Date.parse(record.lease_expires_at) > now) {
          return conflict('retry_later', {
            claim_id: record.claim_id,
            retry_after_at: record.lease_expires_at,
            request_source: record.request_source,
            source_binding_sha256: record.source_binding_sha256,
          });
        }
        record.lease_owner_id = command.lease_owner_id;
        record.lease_token = command.lease_token;
        record.lease_expires_at = new Date(Math.min(leaseExpiresAt, Date.parse(record.expires_at)))
          .toISOString();
        record.attempt_count += 1;
        record.updated_at = current.timestamp;
        return committed('processing_recovered', this._requestValue(record));
      }
      const record = {
        brand_id: command.brand_id,
        claim_id: command.claim_id,
        aliases: [],
        lifecycle_status: 'processing',
        claimed_at: current.timestamp,
        expires_at: new Date(expiresAt).toISOString(),
        retention_until: new Date(expiresAt + 90 * 24 * 60 * 60 * 1000).toISOString(),
        lease_owner_id: command.lease_owner_id,
        lease_token: command.lease_token,
        lease_expires_at: new Date(leaseExpiresAt).toISOString(),
        attempt_count: 1,
        request_source: command.request_source,
        source_binding_sha256: command.source_binding_sha256,
        reconciliation_scan_id: null,
        reconciliation_expected_after_message_id: null,
        reconciliation_page_binding_sha256: null,
        business_claim_id: null,
        job_id: null,
        conversation_id: null,
        generation: null,
        due_at: null,
        completed_at: null,
        updated_at: current.timestamp,
      };
      if (!this._healAliases(this._requestReplays, record, commandAliases)) {
        return unknown('alias_conflict', 'key_alias_conflict');
      }
      return committed('processing_claimed', this._requestValue(record));
    });
  }

  claim_business_event(command) {
    return this._safe('claim_business_event', command, () => {
      const current = this._now();
      const now = current.milliseconds;
      const expiresAt = now + command.event_retention_seconds * 1000;
      const leaseExpiresAt = now + command.lease_duration_seconds * 1000;
      const commandAliases = aliases(
        command.active_fingerprint,
        command.active_key_version,
        command.retained_fingerprints,
      );
      const coverage = this._coverageState(
        'business_event', command, commandAliases, now, expiresAt,
      );
      if (coverage) return coverage;
      const match = this._matchingClaim(this._businessEvents, command.brand_id, commandAliases);
      if (match.conflict) return match.conflict;
      if (match.record) {
        const record = match.record;
        const completedJob = record.lifecycle_status === 'completed'
          ? this._completedBusinessJob(record)
          : null;
        if (record.lifecycle_status === 'completed' && !completedJob) {
          return unknown('completed_binding_invalid', 'durable_reference_conflict');
        }
        if (!this._healAliases(this._businessEvents, record, commandAliases)) {
          return unknown('alias_conflict', 'key_alias_conflict');
        }
        if (record.lifecycle_status === 'completed') {
          return conflict('duplicate_completed', {
            claim_id: record.claim_id,
            lifecycle_status: record.lifecycle_status,
            job_id: completedJob.job_id,
            generation: completedJob.generation,
            due_at: completedJob.due_at,
            state: completedJob.state,
            observation_id: record.observation_id,
            audit_id: record.audit_id,
            ...this._jobControlValue(completedJob),
          });
        }
        if (record.lease_owner_id === command.lease_owner_id &&
            record.lease_token === command.lease_token &&
            Date.parse(record.lease_expires_at) > now) {
          return committed('prepared_owned', {
            claim_id: record.claim_id,
            lease_expires_at: record.lease_expires_at,
            attempt_count: record.attempt_count,
            job_id: record.job_id,
          });
        }
        if (Date.parse(record.lease_expires_at) > now) {
          return conflict('business_retry_later', {
            claim_id: record.claim_id,
            retry_after_at: record.lease_expires_at,
          });
        }
        record.lease_owner_id = command.lease_owner_id;
        record.lease_token = command.lease_token;
        record.lease_expires_at = new Date(Math.min(leaseExpiresAt, Date.parse(record.expires_at)))
          .toISOString();
        record.attempt_count += 1;
        record.updated_at = current.timestamp;
        return committed('recovered_prepared', {
          claim_id: record.claim_id,
          lease_expires_at: record.lease_expires_at,
          attempt_count: record.attempt_count,
          job_id: record.job_id,
        });
      }
      const record = {
        brand_id: command.brand_id,
        claim_id: command.claim_id,
        aliases: [],
        claimed_at: current.timestamp,
        expires_at: new Date(expiresAt).toISOString(),
        lifecycle_status: 'prepared',
        lease_owner_id: command.lease_owner_id,
        lease_token: command.lease_token,
        lease_expires_at: new Date(leaseExpiresAt).toISOString(),
        attempt_count: 1,
        request_claim_id: null,
        job_id: null,
        observation_id: null,
        observation_digest: null,
        audit_id: null,
        completed_at: null,
        retention_until: new Date(expiresAt).toISOString(),
        updated_at: current.timestamp,
      };
      if (!this._healAliases(this._businessEvents, record, commandAliases)) {
        return unknown('alias_conflict', 'key_alias_conflict');
      }
      return committed('prepared', {
        claim_id: record.claim_id,
        lease_expires_at: record.lease_expires_at,
        attempt_count: 1,
        job_id: null,
      });
    });
  }

  advance_conversation_generation(command) {
    return this._safe('advance_conversation_generation', command, () => {
      const current = this._now();
      const now = current.milliseconds;
      const dueAt = now + command.delay_seconds * 1000;
      const retentionUntil = now + command.retention_seconds * 1000;
      const messageAliases = aliases(
        command.message_fingerprint,
        command.active_key_version,
        command.retained_message_fingerprints,
      );
      const coverage = this._coverageState(
        'message_identity', command, messageAliases, now, retentionUntil,
      );
      if (coverage) return coverage;
      const request = this._claimById(
        this._requestReplays, command.brand_id, command.request_claim_id,
      );
      if (!request) return conflict('request_claim_not_found');
      if (!this._requestProvenanceMatches(request, command)) {
        return unknown('request_provenance_mismatch', 'durable_reference_conflict');
      }
      const existingJob = this._jobs.get(composite(command.brand_id, command.job_id));
      if (request.lifecycle_status === 'completed') {
        if (!this._requestIngressBindingMatches(request, command)) {
          return unknown('request_ingress_binding_mismatch', 'durable_reference_conflict');
        }
        const business = this._claimById(
          this._businessEvents, command.brand_id, request.business_claim_id,
        );
        const eventAliasBound = business && business.aliases.some((item) =>
          item.key_version === command.active_key_version &&
          item.fingerprint === command.event_identity_fingerprint,
        );
        const same = request.business_claim_id === command.business_claim_id &&
          request.job_id === command.job_id && request.conversation_id === command.conversation_id &&
          business && business.job_id === command.job_id && existingJob &&
          existingJob.business_claim_id === business.claim_id && eventAliasBound &&
          this._jobReconciliationControlMatchesCommand(existingJob, command);
        if (!same || existingJob.generation !== request.generation ||
            existingJob.due_at !== request.due_at) {
          return conflict('request_already_bound');
        }
        const extendedRetention = Math.max(
          Date.parse(existingJob.retention_until),
          retentionUntil,
        );
        if (!this._businessEventRetentionCoverageValid(
          business,
          command,
          extendedRetention,
        )) return unknown('key_coverage_incomplete', 'key_coverage_incomplete');
        const aliasPlan = this._messageAliasReconciliationPlan(existingJob, messageAliases, now);
        if (aliasPlan.failure) return aliasPlan.failure;
        existingJob.message_fingerprints.push(...aliasPlan.additions);
        existingJob.retention_until = new Date(extendedRetention).toISOString();
        this._extendBusinessEventRetention(business, existingJob.retention_until);
        existingJob.updated_at = current.timestamp;
        return conflict('duplicate_ingress_bound', {
          request_claim_id: request.claim_id,
          business_claim_id: request.business_claim_id,
          job_id: request.job_id,
          conversation_id: request.conversation_id,
          generation: request.generation,
          due_at: request.due_at,
          state: existingJob.state,
          ...this._ingressProvenanceValue(request),
          ...this._jobControlValue(existingJob),
        });
      }
      if (request.lease_owner_id !== command.request_lease_owner_id ||
          request.lease_token !== command.request_lease_token ||
          Date.parse(request.lease_expires_at) <= now) {
        return conflict('request_lease_not_owned');
      }
      if (!this._reconciliationIngressGate(command, now)) {
        return unknown('reconciliation_ingress_binding_invalid', 'durable_reference_conflict');
      }
      const business = this._claimById(
        this._businessEvents, command.brand_id, command.business_claim_id,
      );
      if (!business) return conflict('business_claim_not_found');
      if (!business.aliases.some((item) =>
        item.key_version === command.active_key_version &&
        item.fingerprint === command.event_identity_fingerprint,
      )) return conflict('event_identity_binding_mismatch');
      if (!this._businessEventRetentionCoverageValid(
        business,
        command,
        retentionUntil,
      )) return unknown('key_coverage_incomplete', 'key_coverage_incomplete');
      if (business.job_id !== null) {
        const bound = this._jobs.get(composite(command.brand_id, business.job_id));
        if (!bound) return unknown('bound_job_missing', 'durable_reference_conflict');
        if (business.job_id !== command.job_id || bound.business_claim_id !== business.claim_id ||
            bound.conversation_id !== command.conversation_id ||
            !this._jobReconciliationControlMatchesCommand(bound, command)) {
          return conflict('business_binding_mismatch');
        }
        if (business.lifecycle_status === 'completed' && this._completedBusinessJob(business) !== bound) {
          return unknown('completed_binding_invalid', 'durable_reference_conflict');
        }
        const extendedRetention = Math.max(
          Date.parse(bound.retention_until),
          retentionUntil,
        );
        if (!this._businessEventRetentionCoverageValid(
          business,
          command,
          extendedRetention,
        )) return unknown('key_coverage_incomplete', 'key_coverage_incomplete');
        const aliasPlan = this._messageAliasReconciliationPlan(bound, messageAliases, now);
        if (aliasPlan.failure) return aliasPlan.failure;
        bound.message_fingerprints.push(...aliasPlan.additions);
        bound.retention_until = new Date(extendedRetention).toISOString();
        this._extendBusinessEventRetention(business, bound.retention_until);
        bound.updated_at = current.timestamp;
        request.lifecycle_status = 'completed';
        request.business_claim_id = business.claim_id;
        request.job_id = bound.job_id;
        request.conversation_id = bound.conversation_id;
        request.generation = bound.generation;
        request.due_at = bound.due_at;
        this._completeRequestIngressProvenance(request, command);
        request.completed_at = current.timestamp;
        request.updated_at = current.timestamp;
        return conflict('duplicate_ingress_bound', {
          request_claim_id: request.claim_id,
          business_claim_id: business.claim_id,
          job_id: bound.job_id,
          conversation_id: bound.conversation_id,
          generation: bound.generation,
          due_at: bound.due_at,
          state: bound.state,
          ...this._ingressProvenanceValue(request),
          ...this._jobControlValue(bound),
        });
      }
      if (business.lease_owner_id !== command.business_lease_owner_id ||
          business.lease_token !== command.business_lease_token ||
          Date.parse(business.lease_expires_at) <= now) {
        return conflict('business_lease_not_owned');
      }
      if (existingJob) return unknown('job_id_conflict', 'durable_reference_conflict');
      for (const job of this._jobs.values()) {
        if (job.brand_id !== command.brand_id || Date.parse(job.retention_until) <= now) continue;
        const matched = messageAliases.some((candidate) => job.message_fingerprints.some((stored) =>
          stored.key_version === candidate.key_version && stored.fingerprint === candidate.fingerprint,
        ));
        if (matched) return conflict('message_already_bound', { job_id: job.job_id });
      }
      const headKey = composite(command.brand_id, command.conversation_id);
      const head = this._heads.get(headKey);
      const generation = head ? head.generation + 1 : 1;
      if (head) {
        const previous = this._jobs.get(composite(command.brand_id, head.current_job_id));
        if (previous && !['completed', 'cancelled', 'human_owned'].includes(previous.state)) {
          previous.state = 'cancelled';
          previous.retry_worker_id = null;
          previous.retry_lease_token = null;
          previous.retry_lease_expires_at = null;
          previous.updated_at = current.timestamp;
        }
      }
      const job = {
        brand_id: command.brand_id,
        job_id: command.job_id,
        request_claim_id: request.claim_id,
        business_claim_id: business.claim_id,
        account_id: command.account_id,
        inbox_id: command.inbox_id,
        channel: command.channel,
        conversation_id: command.conversation_id,
        anchor_message_id: command.anchor_message_id,
        correlation_id: command.correlation_id,
        generation,
        event_identity_key_version: command.event_identity_key_version,
        event_identity_fingerprint: command.event_identity_fingerprint,
        conversation_fingerprint: command.conversation_fingerprint,
        message_fingerprint: command.message_fingerprint,
        baseline_fingerprint_key_version: command.baseline_fingerprint_key_version,
        baseline_status_fingerprint: command.baseline_status_fingerprint,
        baseline_assignee_fingerprint: command.baseline_assignee_fingerprint,
        delay_policy_version: command.delay_policy_version,
        delay_seconds: command.delay_seconds,
        knowledge_version: command.knowledge_version,
        message_fingerprints: clone(messageAliases),
        due_at: new Date(dueAt).toISOString(),
        retention_until: new Date(retentionUntil).toISOString(),
        state: 'pending',
        attempt_count: 0,
        next_attempt_at: new Date(dueAt).toISOString(),
        last_safe_error_code: null,
        retry_idempotency_key: null,
        max_attempts: null,
        retry_worker_id: null,
        retry_lease_token: null,
        retry_lease_expires_at: null,
        last_transition_idempotency_key: null,
        created_at: current.timestamp,
        updated_at: current.timestamp,
      };
      this._jobs.set(composite(command.brand_id, command.job_id), job);
      this._heads.set(headKey, {
        brand_id: command.brand_id,
        conversation_id: command.conversation_id,
        generation,
        current_job_id: command.job_id,
        retention_until: job.retention_until,
        updated_at: current.timestamp,
      });
      business.request_claim_id = request.claim_id;
      business.job_id = job.job_id;
      this._extendBusinessEventRetention(business, job.retention_until);
      business.updated_at = current.timestamp;
      request.lifecycle_status = 'completed';
      request.business_claim_id = business.claim_id;
      request.job_id = job.job_id;
      request.conversation_id = job.conversation_id;
      request.generation = job.generation;
      request.due_at = job.due_at;
      this._completeRequestIngressProvenance(request, command);
      request.completed_at = current.timestamp;
      request.updated_at = current.timestamp;
      return committed('ingress_bound', {
        request_claim_id: request.claim_id,
        business_claim_id: business.claim_id,
        job_id: job.job_id,
        conversation_id: job.conversation_id,
        generation: job.generation,
        due_at: job.due_at,
        state: job.state,
        ...this._ingressProvenanceValue(request),
        ...this._jobControlValue(job),
      });
    });
  }

  read_generation(command) {
    return this._safe('read_generation', command, () => {
      const head = this._heads.get(composite(command.brand_id, command.conversation_id));
      if (!head) {
        return conflict('generation_absent', {
          conversation_id: command.conversation_id,
          expected_generation: command.expected_generation,
          generation: null,
          current: false,
          job_id: null,
        });
      }
      const job = this._jobs.get(composite(command.brand_id, head.current_job_id));
      if (!job) return unknown('head_job_missing', 'durable_reference_conflict');
      return committed('generation_read', {
        conversation_id: command.conversation_id,
        expected_generation: command.expected_generation,
        generation: head.generation,
        current: head.generation === command.expected_generation,
        job_id: head.current_job_id,
        due_at: job.due_at,
        state: job.state,
        ...this._jobControlValue(job),
      });
    });
  }

  schedule_conversation_retry(command) {
    return this._safe('schedule_conversation_retry', command, () => {
      const current = this._now();
      const job = this._jobs.get(composite(command.brand_id, command.job_id));
      if (!job || job.conversation_id !== command.conversation_id) return conflict('job_not_found');
      if (job.generation !== command.expected_generation) {
        return conflict('stale_generation', { generation: job.generation });
      }
      if (job.retry_idempotency_key === command.retry_idempotency_key) {
        return conflict('duplicate_retry_schedule', {
          job_id: job.job_id,
          generation: job.generation,
          attempt_count: job.attempt_count,
          next_attempt_at: job.next_attempt_at,
        });
      }
      if (job.state !== 'retry_running') return conflict('retry_not_running', { state: job.state });
      if (job.retry_worker_id !== command.expected_worker_id ||
          job.retry_lease_token !== command.expected_lease_token) {
        return conflict('retry_lease_cas_failed');
      }
      if (Date.parse(job.retry_lease_expires_at) <= current.milliseconds) {
        return conflict('retry_lease_expired');
      }
      if (job.attempt_count >= command.max_attempts) {
        return conflict('retry_exhausted', {
          attempt_count: job.attempt_count,
          max_attempts: command.max_attempts,
        });
      }
      job.state = 'retry_scheduled';
      job.next_attempt_at = new Date(
        current.milliseconds + command.delay_seconds * 1000,
      ).toISOString();
      job.retention_until = new Date(Math.max(
        Date.parse(job.retention_until),
        current.milliseconds + command.retention_seconds * 1000,
      )).toISOString();
      job.last_safe_error_code = command.safe_error_code;
      job.retry_idempotency_key = command.retry_idempotency_key;
      job.max_attempts = command.max_attempts;
      job.retry_worker_id = null;
      job.retry_lease_token = null;
      job.retry_lease_expires_at = null;
      job.updated_at = current.timestamp;
      return committed('retry_scheduled', {
        job_id: job.job_id,
        generation: job.generation,
        attempt_count: job.attempt_count,
        next_attempt_at: job.next_attempt_at,
        safe_error_code: job.last_safe_error_code,
      });
    });
  }

  _jobLeaseValue(job) {
    return {
      job_id: job.job_id,
      conversation_id: job.conversation_id,
      generation: job.generation,
      business_claim_id: job.business_claim_id,
      due_at: job.due_at,
      ...this._jobControlValue(job),
      worker_id: job.retry_worker_id,
      lease_token: job.retry_lease_token,
      lease_expires_at: job.retry_lease_expires_at,
      attempt_count: job.attempt_count,
    };
  }

  claim_due_conversation_retry(command) {
    return this._safe('claim_due_conversation_retry', command, () => {
      const current = this._now();
      const now = current.milliseconds;
      const owned = [...this._jobs.values()].filter((job) =>
        job.brand_id === command.brand_id && job.state === 'retry_running' &&
        job.retry_worker_id === command.worker_id && job.retry_lease_token === command.lease_token &&
        Date.parse(job.retry_lease_expires_at) > now,
      );
      if (owned.length > 1) return unknown('lease_token_conflict', 'durable_reference_conflict');
      if (owned.length === 1) return committed('job_lease_owned', this._jobLeaseValue(owned[0]));
      const candidates = [...this._jobs.values()].filter((job) => {
        if (job.brand_id !== command.brand_id || Date.parse(job.next_attempt_at) > now) return false;
        if (job.state === 'pending') return true;
        if (job.state === 'retry_scheduled') {
          return job.max_attempts === null || job.attempt_count < job.max_attempts;
        }
        return job.state === 'retry_running' && Date.parse(job.retry_lease_expires_at) <= now &&
          (job.max_attempts === null || job.attempt_count < job.max_attempts);
      }).sort((left, right) =>
        Date.parse(left.next_attempt_at) - Date.parse(right.next_attempt_at) ||
        left.job_id.localeCompare(right.job_id),
      );
      if (candidates.length === 0) return conflict('no_due_job');
      const job = candidates[0];
      const recovered = job.state === 'retry_running';
      job.state = 'retry_running';
      job.retry_worker_id = command.worker_id;
      job.retry_lease_token = command.lease_token;
      job.retry_lease_expires_at = new Date(
        now + command.lease_duration_seconds * 1000,
      ).toISOString();
      job.attempt_count += 1;
      job.updated_at = current.timestamp;
      return committed(recovered ? 'job_lease_recovered' : 'job_claimed', this._jobLeaseValue(job));
    });
  }

  transition_conversation_job(command) {
    return this._safe('transition_conversation_job', command, () => {
      const current = this._now();
      const job = this._jobs.get(composite(command.brand_id, command.job_id));
      if (!job || job.conversation_id !== command.conversation_id) return conflict('job_not_found');
      if (job.generation !== command.expected_generation) {
        return conflict('stale_generation', { generation: job.generation });
      }
      if (job.last_transition_idempotency_key === command.transition_idempotency_key) {
        return conflict('duplicate_transition', { state: job.state });
      }
      if (job.state !== command.from_state) return conflict('state_compare_failed', { state: job.state });
      if (!['pending', 'retry_scheduled', 'retry_running'].includes(job.state) ||
          !['cancelled', 'human_owned'].includes(command.to_state)) {
        return conflict('invalid_job_transition', { state: job.state });
      }
      job.state = command.to_state;
      job.retry_worker_id = null;
      job.retry_lease_token = null;
      job.retry_lease_expires_at = null;
      job.last_transition_idempotency_key = command.transition_idempotency_key;
      job.updated_at = current.timestamp;
      return committed('job_transitioned', {
        job_id: job.job_id,
        generation: job.generation,
        state: job.state,
      });
    });
  }

  complete_business_event(command) {
    return this._safe('complete_business_event', command, () => {
      const current = this._now();
      const now = current.milliseconds;
      const event = this._claimById(this._businessEvents, command.brand_id, command.claim_id);
      if (!event) return conflict('claim_not_found');
      if (event.lifecycle_status === 'completed') {
        const stored = this._observations.get(composite(command.brand_id, event.observation_id));
        if (!stored) return unknown('observation_missing', 'durable_reference_conflict');
        const same = event.job_id === command.job_id &&
          event.observation_id === command.observation_id &&
          event.observation_digest === command.observation_digest &&
          event.audit_id === command.audit_id &&
          stored.outcome_class === command.outcome_class &&
          stored.reason_code === command.reason_code &&
          stored.risk_level === command.risk_level &&
          stored.risk_digest === command.risk_digest &&
          stored.incident_id === command.incident_id;
        return conflict(same ? 'duplicate_completed' : 'completion_digest_conflict', same ? {
          claim_id: event.claim_id,
          job_id: event.job_id,
          observation_id: event.observation_id,
          audit_id: event.audit_id,
        } : null);
      }
      const job = this._jobs.get(composite(command.brand_id, command.job_id));
      if (!job || job.business_claim_id !== event.claim_id ||
          job.conversation_id !== command.conversation_id) return conflict('job_binding_mismatch');
      if (job.generation !== command.expected_generation) {
        return conflict('stale_generation', { generation: job.generation });
      }
      const head = this._heads.get(composite(command.brand_id, command.conversation_id));
      if (!head || head.current_job_id !== job.job_id || head.generation !== job.generation) {
        return conflict('stale_generation', { generation: head ? head.generation : null });
      }
      if (job.state !== 'retry_running' || job.retry_worker_id !== command.worker_id ||
          job.retry_lease_token !== command.lease_token ||
          Date.parse(job.retry_lease_expires_at) <= now) return conflict('job_lease_not_owned');
      const observationKey = composite(command.brand_id, command.observation_id);
      const auditKey = composite(command.brand_id, command.audit_id);
      if (this._observations.has(observationKey)) {
        return unknown('observation_id_conflict', 'durable_reference_conflict');
      }
      if (this._audits.has(auditKey)) return unknown('audit_id_conflict', 'durable_reference_conflict');
      const incidentKey = command.incident_id === null ? null :
        composite(command.brand_id, command.incident_id);
      if (incidentKey !== null && this._incidents.has(incidentKey)) {
        return unknown('incident_id_conflict', 'durable_reference_conflict');
      }
      const observationSnapshot = {
        brand_id: command.brand_id,
        observation_id: command.observation_id,
        claim_id: command.claim_id,
        job_id: command.job_id,
        observation_digest: command.observation_digest,
        audit_id: command.audit_id,
        outcome_class: command.outcome_class,
        reason_code: command.reason_code,
        risk_level: command.risk_level,
        risk_digest: command.risk_digest,
        incident_id: command.incident_id,
        completed_at: current.timestamp,
      };
      this._observations.set(observationKey, observationSnapshot);
      this._audits.set(auditKey, {
        brand_id: command.brand_id,
        audit_id: command.audit_id,
        event_type: 'business_event_completed',
        claim_id: command.claim_id,
        job_id: command.job_id,
        observation_id: command.observation_id,
        observation_digest: command.observation_digest,
        incident_id: command.incident_id,
        outcome_class: command.outcome_class,
        reason_code: command.reason_code,
        risk_level: command.risk_level,
        risk_digest: command.risk_digest,
        created_at: current.timestamp,
      });
      event.lifecycle_status = 'completed';
      event.observation_id = command.observation_id;
      event.observation_digest = command.observation_digest;
      event.audit_id = command.audit_id;
      event.completed_at = current.timestamp;
      event.updated_at = current.timestamp;
      job.state = 'completed';
      job.retry_worker_id = null;
      job.retry_lease_token = null;
      job.retry_lease_expires_at = null;
      job.updated_at = current.timestamp;
      if (incidentKey !== null) {
        this._incidents.set(incidentKey, {
          brand_id: command.brand_id,
          incident_id: command.incident_id,
          revision: 1,
          status: 'awaiting_owner_preparation',
          source_observation_id: command.observation_id,
          source_observation_digest: command.observation_digest,
          preparation_id: null,
          review_snapshot_digest: null,
          owner_decision_ref: null,
          audit_ref: null,
          decided_at: null,
        });
      }
      return committed('completed', {
        claim_id: event.claim_id,
        job_id: job.job_id,
        observation_id: event.observation_id,
        audit_id: event.audit_id,
        incident_id: command.incident_id,
        outcome_class: command.outcome_class,
        completed_at: event.completed_at,
      });
    });
  }

  _decisionFields(command) {
    return Object.fromEntries(EXPECTED_DECISION_FIELDS.map((field) => [field, command[field]]));
  }

  _sameDecision(left, right) {
    return EXPECTED_DECISION_FIELDS.every((field) => left[field] === right[field]);
  }

  prepare_owner_review(command) {
    return this._safe('prepare_owner_review', command, () => {
      const current = this._now();
      const nonceExpiresAt = new Date(
        current.milliseconds + command.nonce_ttl_seconds * 1000,
      ).toISOString();
      const incidentKey = composite(command.brand_id, command.incident_id);
      const incident = this._incidents.get(incidentKey);
      if (!incident) return conflict('incident_not_found');
      const preparationKey = composite(command.brand_id, command.preparation_id);
      const existingPreparation = this._ownerReviewPreparations.get(preparationKey);
      if (existingPreparation) {
        const same = existingPreparation.incident_id === command.incident_id &&
          existingPreparation.review_snapshot_digest === command.review_snapshot_digest &&
          existingPreparation.nonce_fingerprint === command.nonce_fingerprint;
        return conflict(same ? 'duplicate_owner_review_preparation' : 'preparation_id_conflict',
          same ? {
            preparation_id: command.preparation_id,
            incident_revision: existingPreparation.committed_incident_revision,
          } : null);
      }
      if (!['awaiting_owner_preparation', 'awaiting_owner'].includes(incident.status)) {
        return conflict('incident_not_awaiting_preparation', { incident_revision: incident.revision });
      }
      if (incident.revision !== command.expected_incident_revision) {
        return conflict('stale_incident_revision', { incident_revision: incident.revision });
      }
      if (incident.source_observation_id !== command.source_observation_id ||
          incident.source_observation_digest !== command.source_observation_digest) {
        return conflict('source_observation_mismatch');
      }
      if (incident.status === 'awaiting_owner') {
        const currentNonce = [...this._ownerNonces.values()].find((nonce) =>
          nonce.brand_id === command.brand_id && nonce.preparation_id === incident.preparation_id,
        );
        if (!currentNonce) return unknown('nonce_missing', 'durable_reference_conflict');
        if (currentNonce.consumed_by !== null) return conflict('owner_review_already_decided');
        if (Date.parse(currentNonce.expires_at) > current.milliseconds) {
          return conflict('owner_review_window_active', {
            nonce_expires_at: currentNonce.expires_at,
          });
        }
      }
      const nonceKey = composite(
        command.brand_id,
        command.nonce_key_version,
        command.nonce_fingerprint,
      );
      if (this._ownerNonces.has(nonceKey)) return conflict('nonce_id_conflict');
      const committedRevision = incident.revision + 1;
      const preparation = {
        brand_id: command.brand_id,
        preparation_id: command.preparation_id,
        incident_id: command.incident_id,
        committed_incident_revision: committedRevision,
        source_observation_id: command.source_observation_id,
        source_observation_digest: command.source_observation_digest,
        review_snapshot_digest: command.review_snapshot_digest,
        nonce_fingerprint: command.nonce_fingerprint,
        nonce_key_version: command.nonce_key_version,
        nonce_issued_at: current.timestamp,
        nonce_expires_at: nonceExpiresAt,
        prepared_at: current.timestamp,
      };
      this._ownerNonces.set(nonceKey, {
        brand_id: command.brand_id,
        nonce_fingerprint: command.nonce_fingerprint,
        key_version: command.nonce_key_version,
        issued_at: current.timestamp,
        expires_at: nonceExpiresAt,
        preparation_id: command.preparation_id,
        consumed_by: null,
        consumed_digest: null,
        consumed_at: null,
      });
      for (const option of command.decision_options) {
        this._decisionOptions.set(
          composite(
            command.brand_id,
            command.incident_id,
            command.preparation_id,
            option.command_digest,
          ),
          clone(option),
        );
      }
      incident.revision = committedRevision;
      incident.status = 'awaiting_owner';
      incident.preparation_id = command.preparation_id;
      incident.review_snapshot_digest = command.review_snapshot_digest;
      this._ownerReviewPreparations.set(preparationKey, preparation);
      return committed('owner_review_prepared', {
        preparation_id: command.preparation_id,
        incident_id: command.incident_id,
        incident_revision: committedRevision,
        option_count: command.decision_options.length,
        nonce_expires_at: nonceExpiresAt,
      });
    });
  }

  compare_and_commit_owner_decision(command) {
    return this._safe('compare_and_commit_owner_decision', command, () => {
      const current = this._now();
      if (command.decision_id !== command.approval_id) {
        return conflict('approval_decision_id_mismatch');
      }
      const approvalKey = composite(command.brand_id, command.approval_id);
      const existingApproval = this._approvals.get(approvalKey);
      const decisionFields = this._decisionFields(command);
      if (existingApproval) {
        if (existingApproval.incident_id === command.incident_id &&
            this._sameDecision(existingApproval, decisionFields)) {
          return conflict('duplicate_owner_decision', {
            approval_id: existingApproval.approval_id,
            audit_id: existingApproval.audit_id,
            incident_revision: existingApproval.committed_incident_revision,
          });
        }
        return conflict('decision_id_conflict');
      }

      const incident = this._incidents.get(composite(command.brand_id, command.incident_id));
      if (!incident) return conflict('incident_not_found');
      if (incident.status !== 'awaiting_owner') {
        return conflict('incident_not_awaiting_owner', { incident_revision: incident.revision });
      }
      if (incident.revision !== command.expected_incident_revision) {
        return conflict('stale_incident_revision', { incident_revision: incident.revision });
      }
      const trustedOption = this._decisionOptions.get(composite(
        command.brand_id,
        command.incident_id,
        incident.preparation_id,
        command.command_digest,
      ));
      if (!trustedOption || !this._sameDecision(trustedOption, decisionFields)) {
        return conflict('owner_decision_digest_mismatch');
      }

      const nonceKey = composite(
        command.brand_id,
        command.nonce_key_version,
        command.nonce_fingerprint,
      );
      const nonce = this._ownerNonces.get(nonceKey);
      if (!nonce) return conflict('nonce_not_found');
      if (nonce.preparation_id !== incident.preparation_id) {
        return conflict('nonce_window_mismatch');
      }
      if (current.milliseconds < Date.parse(nonce.issued_at)) return conflict('nonce_not_yet_issued');
      if (current.milliseconds >= Date.parse(nonce.expires_at)) return conflict('nonce_expired');
      if (nonce.consumed_by !== null) return conflict('nonce_already_consumed');

      const committedRevision = incident.revision + 1;
      const approvalSnapshot = {
        brand_id: command.brand_id,
        approval_id: command.approval_id,
        incident_id: command.incident_id,
        committed_incident_revision: committedRevision,
        audit_id: command.audit_id,
        ...clone(decisionFields),
        nonce_fingerprint: command.nonce_fingerprint,
        nonce_key_version: command.nonce_key_version,
        nonce_issued_at: nonce.issued_at,
        nonce_expires_at: nonce.expires_at,
        decided_at: current.timestamp,
      };
      const auditSnapshot = {
        brand_id: command.brand_id,
        audit_id: command.audit_id,
        incident_id: command.incident_id,
        approval_id: command.approval_id,
        event_type: 'owner_decision_committed',
        action: command.action,
        command_digest: command.command_digest,
        created_at: current.timestamp,
      };
      const auditKey = composite(command.brand_id, command.audit_id);
      const existingAudit = this._audits.get(auditKey);
      if (existingAudit && existingAudit.approval_id !== command.approval_id) {
        return conflict('audit_id_conflict');
      }

      nonce.consumed_by = command.decision_id;
      nonce.consumed_digest = command.command_digest;
      nonce.consumed_at = current.timestamp;
      incident.revision = committedRevision;
      incident.status = 'owner_decision_recorded';
      incident.owner_decision_ref = command.approval_id;
      incident.audit_ref = command.audit_id;
      incident.decided_at = current.timestamp;
      this._approvals.set(approvalKey, approvalSnapshot);
      this._audits.set(auditKey, auditSnapshot);

      return committed('owner_decision_committed', {
        approval_id: command.approval_id,
        audit_id: command.audit_id,
        incident_revision: committedRevision,
        action: command.action,
        command_digest: command.command_digest,
        case_reply_sha256: command.case_reply_sha256,
        knowledge_proposal_sha256: command.knowledge_proposal_sha256,
        base_knowledge_version: command.base_knowledge_version,
        knowledge_version_to_publish: command.knowledge_version_to_publish,
        supersedes_knowledge_version: command.supersedes_knowledge_version,
      });
    });
  }

  claim_chatwoot_reconciliation_scan(command) {
    return this._safe('claim_chatwoot_reconciliation_scan', command, () => {
      const current = this._now();
      const leaseExpiresAt = new Date(
        current.milliseconds + command.lease_duration_seconds * 1000,
      ).toISOString();
      const routeKey = composite(command.brand_id, command.account_id, command.inbox_id);
      const record = this._reconciliationScans.get(routeKey);
      const newRecord = () => ({
        brand_id: command.brand_id,
        account_id: command.account_id,
        inbox_id: command.inbox_id,
        channel: command.channel,
        scan_id: command.scan_id,
        lease_owner_id: command.lease_owner_id,
        lease_token: command.lease_token,
        lease_claimed_at: current.timestamp,
        lease_expires_at: leaseExpiresAt,
        lease_duration_seconds: command.lease_duration_seconds,
        attempt_count: 1,
        max_pages: command.max_pages,
        activation_floor_at: command.activation_floor_at,
        activation_policy_version: command.activation_policy_version,
        created_at: current.timestamp,
        updated_at: current.timestamp,
      });
      if (!record) {
        const identifierConflict = this._reconciliationScanIdentifierConflict(command);
        if (identifierConflict) return conflict(identifierConflict);
        const created = newRecord();
        this._reconciliationScans.set(routeKey, created);
        return committed('scan_lease_claimed', this._reconciliationScanValue(created));
      }

      const sameIdentity = record.scan_id === command.scan_id &&
        record.lease_owner_id === command.lease_owner_id &&
        record.lease_token === command.lease_token;
      const sameBinding = this._reconciliationScanBindingMatches(record, command);
      if (Date.parse(record.lease_expires_at) > current.milliseconds) {
        if (sameIdentity && sameBinding) {
          return committed('scan_lease_owned', this._reconciliationScanValue(record));
        }
        if (sameIdentity) return conflict('scan_binding_mismatch');
        return conflict('scan_retry_later', {
          account_id: record.account_id,
          inbox_id: record.inbox_id,
          channel: record.channel,
          retry_after_at: record.lease_expires_at,
        });
      }
      if (record.scan_id === command.scan_id && !sameIdentity) return conflict('scan_id_conflict');
      if (record.lease_token === command.lease_token && !sameIdentity) {
        return conflict('scan_lease_token_conflict');
      }
      if (sameIdentity && !sameBinding) return conflict('scan_binding_mismatch');
      const identifierConflict = this._reconciliationScanIdentifierConflict(command, record);
      if (identifierConflict) return conflict(identifierConflict);

      Object.assign(record, newRecord(), {
        attempt_count: record.attempt_count + 1,
        created_at: record.created_at,
      });
      return committed('scan_lease_recovered', this._reconciliationScanValue(record));
    });
  }

  compare_and_advance_chatwoot_message_cursor(command) {
    return this._safe('compare_and_advance_chatwoot_message_cursor', command, () => {
      const current = this._now();
      const routeKey = composite(
        command.brand_id,
        command.account_id,
        command.inbox_id,
        command.conversation_id,
      );
      const commitKey = composite(routeKey, command.expected_after_message_id);
      const priorCommit = this._reconciliationCursorCommits.get(commitKey);
      if (priorCommit) {
        if (!this._reconciliationCursorCommitMatches(priorCommit, command)) {
          return conflict('cursor_finalization_conflict');
        }
        return conflict('duplicate_cursor_advance',
          this._reconciliationCursorResult(priorCommit));
      }

      const scan = this._reconciliationScans.get(composite(
        command.brand_id,
        command.account_id,
        command.inbox_id,
      ));
      if (!scan || scan.scan_id !== command.scan_id ||
          scan.lease_token !== command.lease_token ||
          scan.channel !== command.channel ||
          scan.activation_floor_at !== command.activation_floor_at ||
          scan.activation_policy_version !== command.activation_policy_version ||
          Date.parse(scan.lease_expires_at) <= current.milliseconds) {
        return conflict('scan_lease_not_owned');
      }

      const cursor = this._reconciliationCursors.get(routeKey);
      const currentAfterMessageId = cursor ? cursor.after_message_id : 0;
      if (currentAfterMessageId !== command.expected_after_message_id) {
        return conflict('cursor_compare_failed', {
          account_id: command.account_id,
          inbox_id: command.inbox_id,
          channel: command.channel,
          conversation_id: command.conversation_id,
          current_after_message_id: currentAfterMessageId,
        });
      }
      if (!this._reconciliationDurableProofsValid(command, current.milliseconds)) {
        return unknown('cursor_durable_proof_invalid', 'durable_reference_conflict');
      }

      const cursorCommit = {
        brand_id: command.brand_id,
        account_id: command.account_id,
        inbox_id: command.inbox_id,
        channel: command.channel,
        conversation_id: command.conversation_id,
        scan_id: command.scan_id,
        lease_token: command.lease_token,
        expected_after_message_id: command.expected_after_message_id,
        new_after_message_id: command.new_after_message_id,
        proof_rows: clone(command.proof_rows),
        page_binding_sha256: command.page_binding_sha256,
        outcome_digest: command.outcome_digest,
        row_count: command.row_count,
        activation_floor_at: command.activation_floor_at,
        activation_policy_version: command.activation_policy_version,
        advanced_at: current.timestamp,
      };
      this._reconciliationCursorCommits.set(commitKey, cursorCommit);
      this._reconciliationCursors.set(routeKey, {
        brand_id: command.brand_id,
        account_id: command.account_id,
        inbox_id: command.inbox_id,
        channel: command.channel,
        conversation_id: command.conversation_id,
        after_message_id: command.new_after_message_id,
        activation_floor_at: command.activation_floor_at,
        activation_policy_version: command.activation_policy_version,
        updated_at: current.timestamp,
      });
      return committed('cursor_advanced', this._reconciliationCursorResult(cursorCommit));
    });
  }

  read_chatwoot_reconciliation_cursor(command) {
    return this._safe('read_chatwoot_reconciliation_cursor', command, () => {
      const now = this._nowMilliseconds();
      const scan = this._reconciliationScans.get(composite(
        command.brand_id,
        command.account_id,
        command.inbox_id,
      ));
      if (!scan || scan.scan_id !== command.scan_id ||
          scan.lease_token !== command.lease_token || scan.channel !== command.channel ||
          scan.activation_floor_at !== command.activation_floor_at ||
          scan.activation_policy_version !== command.activation_policy_version ||
          Date.parse(scan.lease_expires_at) <= now) {
        return conflict('scan_lease_not_owned');
      }

      const cursor = this._reconciliationCursors.get(composite(
        command.brand_id,
        command.account_id,
        command.inbox_id,
        command.conversation_id,
      ));
      if (cursor && (cursor.channel !== command.channel ||
          cursor.activation_floor_at !== command.activation_floor_at ||
          cursor.activation_policy_version !== command.activation_policy_version)) {
        return unknown('cursor_state_invalid', 'durable_reference_conflict');
      }
      return committed('cursor_read', {
        account_id: command.account_id,
        inbox_id: command.inbox_id,
        channel: command.channel,
        conversation_id: command.conversation_id,
        scan_id: command.scan_id,
        current_after_message_id: cursor ? cursor.after_message_id : 0,
        activation_floor_at: command.activation_floor_at,
        activation_policy_version: command.activation_policy_version,
      });
    });
  }

  snapshot() {
    return this._atomic(() => ({
      request_replay_alias_count: this._requestReplays.size,
      business_event_alias_count: this._businessEvents.size,
      observation_count: this._observations.size,
      job_count: this._jobs.size,
      conversation_head_count: this._heads.size,
      conversation_message_alias_count: [...this._jobs.values()].reduce(
        (count, job) => count + job.message_fingerprints.length,
        0,
      ),
      conversation_longest_retention_until: [...this._jobs.values()].reduce(
        (latest, job) => latest === null || Date.parse(job.retention_until) > Date.parse(latest)
          ? job.retention_until
          : latest,
        null,
      ),
      owner_nonce_count: this._ownerNonces.size,
      incident_count: this._incidents.size,
      owner_review_preparation_count: this._ownerReviewPreparations.size,
      decision_option_count: this._decisionOptions.size,
      approval_count: this._approvals.size,
      audit_count: this._audits.size,
      reconciliation_scan_lease_count: this._reconciliationScans.size,
      reconciliation_cursor_count: this._reconciliationCursors.size,
      reconciliation_cursor_commit_count: this._reconciliationCursorCommits.size,
    }));
  }
}

module.exports = { DEFAULT_KEY_REGISTRY, InMemoryAtomicStorage };
