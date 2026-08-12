-- Calapres customer-service atomic state, migration 0001.
-- Candidate status: implementation_candidate_pending_live_postgres_validation.
-- This schema stores opaque identifiers, fingerprints, digests, and bounded state only.
-- Run through an operator-reviewed migration process; this file performs no cleanup.

BEGIN;

CREATE SCHEMA IF NOT EXISTS calapres_cs;

COMMENT ON SCHEMA calapres_cs IS
  'Transactional customer-service state; opaque identifiers and digests only.';

CREATE TABLE IF NOT EXISTS calapres_cs.schema_migrations (
  version integer PRIMARY KEY CHECK (version > 0),
  migration_name text NOT NULL CHECK (migration_name ~ '^[a-z0-9_]{4,120}$'),
  applied_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE TABLE IF NOT EXISTS calapres_cs.request_replay_claims (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  claim_id text NOT NULL CHECK (claim_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  lifecycle_status text NOT NULL DEFAULT 'completed'
    CHECK (lifecycle_status = 'completed'),
  claimed_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, claim_id),
  CHECK (expires_at > claimed_at),
  CHECK (retention_until >= expires_at)
);

CREATE TABLE IF NOT EXISTS calapres_cs.request_replay_aliases (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  key_version text NOT NULL CHECK (key_version ~ '^hmac-sha256-v[1-9][0-9]*$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  claim_id text NOT NULL CHECK (claim_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, key_version, fingerprint),
  FOREIGN KEY (brand_id, claim_id)
    REFERENCES calapres_cs.request_replay_claims (brand_id, claim_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calapres_cs.business_events (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  claim_id text NOT NULL CHECK (claim_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('prepared', 'completed')),
  claimed_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  lease_owner_id text NOT NULL CHECK (lease_owner_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  lease_expires_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  observation_id text CHECK (
    observation_id IS NULL OR observation_id ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  observation_digest text CHECK (
    observation_digest IS NULL OR observation_digest ~ '^[a-f0-9]{64}$'
  ),
  audit_id text CHECK (audit_id IS NULL OR audit_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  completed_at timestamptz,
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, claim_id),
  CHECK (expires_at > claimed_at),
  CHECK (lease_expires_at <= expires_at),
  CHECK (retention_until >= expires_at),
  CHECK (
    (lifecycle_status = 'prepared'
      AND observation_id IS NULL
      AND observation_digest IS NULL
      AND audit_id IS NULL
      AND completed_at IS NULL)
    OR
    (lifecycle_status = 'completed'
      AND observation_id IS NOT NULL
      AND observation_digest IS NOT NULL
      AND audit_id IS NOT NULL
      AND completed_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS calapres_cs.business_event_aliases (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  key_version text NOT NULL CHECK (key_version ~ '^hmac-sha256-v[1-9][0-9]*$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  claim_id text NOT NULL CHECK (claim_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, key_version, fingerprint),
  FOREIGN KEY (brand_id, claim_id)
    REFERENCES calapres_cs.business_events (brand_id, claim_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calapres_cs.conversation_jobs (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  conversation_id text NOT NULL CHECK (conversation_id ~ '^[1-9][0-9]{0,30}$'),
  generation integer NOT NULL CHECK (generation > 0),
  state text NOT NULL CHECK (
    state IN ('pending', 'retry_scheduled', 'retry_running', 'completed', 'cancelled', 'human_owned')
  ),
  due_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL,
  last_safe_error_code text CHECK (
    last_safe_error_code IS NULL OR last_safe_error_code ~ '^[a-z][a-z0-9_]{2,80}$'
  ),
  retry_idempotency_key text CHECK (
    retry_idempotency_key IS NULL OR retry_idempotency_key ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  max_attempts integer CHECK (max_attempts IS NULL OR max_attempts BETWEEN 1 AND 10),
  retry_worker_id text CHECK (
    retry_worker_id IS NULL OR retry_worker_id ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  retry_lease_token text CHECK (
    retry_lease_token IS NULL OR retry_lease_token ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  retry_lease_expires_at timestamptz,
  last_transition_idempotency_key text CHECK (
    last_transition_idempotency_key IS NULL
    OR last_transition_idempotency_key ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, conversation_id),
  CHECK (
    (state <> 'retry_running')
    OR (
      retry_worker_id IS NOT NULL
      AND retry_lease_token IS NOT NULL
      AND retry_lease_expires_at IS NOT NULL
    )
  ),
  CHECK (max_attempts IS NULL OR attempt_count <= max_attempts)
);

CREATE TABLE IF NOT EXISTS calapres_cs.conversation_message_aliases (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  conversation_id text NOT NULL CHECK (conversation_id ~ '^[1-9][0-9]{0,30}$'),
  generation integer NOT NULL CHECK (generation > 0),
  key_version text NOT NULL CHECK (key_version ~ '^hmac-sha256-v[1-9][0-9]*$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, conversation_id, key_version, fingerprint),
  FOREIGN KEY (brand_id, conversation_id)
    REFERENCES calapres_cs.conversation_jobs (brand_id, conversation_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calapres_cs.observation_outcomes (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  observation_id text NOT NULL CHECK (observation_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  claim_id text NOT NULL CHECK (claim_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  observation_digest text NOT NULL CHECK (observation_digest ~ '^[a-f0-9]{64}$'),
  audit_id text NOT NULL CHECK (audit_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  outcome_class text NOT NULL CHECK (
    outcome_class IN ('observation_only', 'routine_candidate', 'owner_escalation', 'fail_closed')
  ),
  reason_code text NOT NULL CHECK (reason_code ~ '^[a-z][a-z0-9_]{2,80}$'),
  risk_level text NOT NULL CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'critical')),
  risk_digest text CHECK (risk_digest IS NULL OR risk_digest ~ '^[a-f0-9]{64}$'),
  incident_id text CHECK (incident_id IS NULL OR incident_id ~ '^inc_[A-Za-z0-9_-]{8,80}$'),
  completed_at timestamptz NOT NULL,
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, observation_id),
  UNIQUE (brand_id, claim_id),
  UNIQUE (brand_id, audit_id),
  UNIQUE (brand_id, incident_id),
  FOREIGN KEY (brand_id, claim_id)
    REFERENCES calapres_cs.business_events (brand_id, claim_id),
  CHECK (retention_until >= completed_at),
  CHECK ((outcome_class = 'owner_escalation') = (incident_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS calapres_cs.incidents (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  incident_id text NOT NULL CHECK (incident_id ~ '^inc_[A-Za-z0-9_-]{8,80}$'),
  revision integer NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (
    status IN ('awaiting_owner_preparation', 'awaiting_owner', 'owner_decision_recorded')
  ),
  source_observation_id text NOT NULL CHECK (
    source_observation_id ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  source_observation_digest text NOT NULL CHECK (
    source_observation_digest ~ '^[a-f0-9]{64}$'
  ),
  preparation_id text CHECK (
    preparation_id IS NULL OR preparation_id ~ '^prep_[A-Za-z0-9_-]{8,80}$'
  ),
  review_snapshot_digest text CHECK (
    review_snapshot_digest IS NULL OR review_snapshot_digest ~ '^[a-f0-9]{64}$'
  ),
  owner_decision_ref text CHECK (
    owner_decision_ref IS NULL OR owner_decision_ref ~ '^dec_[A-Za-z0-9_-]{8,80}$'
  ),
  audit_ref text CHECK (audit_ref IS NULL OR audit_ref ~ '^aud_[A-Za-z0-9_-]{8,80}$'),
  decided_at timestamptz,
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, incident_id),
  UNIQUE (brand_id, source_observation_id),
  FOREIGN KEY (brand_id, source_observation_id)
    REFERENCES calapres_cs.observation_outcomes (brand_id, observation_id),
  CHECK (
    (status = 'awaiting_owner_preparation'
      AND revision = 1
      AND preparation_id IS NULL
      AND review_snapshot_digest IS NULL
      AND owner_decision_ref IS NULL
      AND audit_ref IS NULL
      AND decided_at IS NULL)
    OR
    (status = 'awaiting_owner'
      AND revision >= 2
      AND preparation_id IS NOT NULL
      AND review_snapshot_digest IS NOT NULL
      AND owner_decision_ref IS NULL
      AND audit_ref IS NULL
      AND decided_at IS NULL)
    OR
    (status = 'owner_decision_recorded'
      AND revision >= 3
      AND preparation_id IS NOT NULL
      AND review_snapshot_digest IS NOT NULL
      AND owner_decision_ref IS NOT NULL
      AND audit_ref IS NOT NULL
      AND decided_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS calapres_cs.owner_review_preparations (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  preparation_id text NOT NULL CHECK (preparation_id ~ '^prep_[A-Za-z0-9_-]{8,80}$'),
  incident_id text NOT NULL CHECK (incident_id ~ '^inc_[A-Za-z0-9_-]{8,80}$'),
  committed_incident_revision integer NOT NULL CHECK (committed_incident_revision >= 2),
  source_observation_id text NOT NULL CHECK (
    source_observation_id ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  source_observation_digest text NOT NULL CHECK (
    source_observation_digest ~ '^[a-f0-9]{64}$'
  ),
  review_snapshot_digest text NOT NULL CHECK (review_snapshot_digest ~ '^[a-f0-9]{64}$'),
  nonce_fingerprint text NOT NULL CHECK (nonce_fingerprint ~ '^[a-f0-9]{64}$'),
  nonce_key_version text NOT NULL CHECK (nonce_key_version ~ '^hmac-sha256-v[1-9][0-9]*$'),
  nonce_issued_at timestamptz NOT NULL,
  nonce_expires_at timestamptz NOT NULL,
  prepared_at timestamptz NOT NULL,
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, preparation_id),
  UNIQUE (brand_id, nonce_key_version, nonce_fingerprint),
  FOREIGN KEY (brand_id, incident_id)
    REFERENCES calapres_cs.incidents (brand_id, incident_id),
  CHECK (nonce_issued_at <= prepared_at AND prepared_at < nonce_expires_at),
  CHECK (retention_until >= nonce_expires_at)
);

CREATE TABLE IF NOT EXISTS calapres_cs.owner_decision_options (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  incident_id text NOT NULL CHECK (incident_id ~ '^inc_[A-Za-z0-9_-]{8,80}$'),
  preparation_id text NOT NULL CHECK (preparation_id ~ '^prep_[A-Za-z0-9_-]{8,80}$'),
  command_digest text NOT NULL CHECK (command_digest ~ '^[a-f0-9]{64}$'),
  action text NOT NULL CHECK (action IN ('reply_only', 'approve', 'approve_until', 'correct')),
  case_reply_sha256 text NOT NULL CHECK (case_reply_sha256 ~ '^[a-f0-9]{64}$'),
  knowledge_proposal_sha256 text CHECK (
    knowledge_proposal_sha256 IS NULL OR knowledge_proposal_sha256 ~ '^[a-f0-9]{64}$'
  ),
  base_knowledge_version text CHECK (
    base_knowledge_version IS NULL
    OR base_knowledge_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
  ),
  knowledge_version_to_publish text CHECK (
    knowledge_version_to_publish IS NULL
    OR knowledge_version_to_publish ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
  ),
  supersedes_knowledge_version text CHECK (
    supersedes_knowledge_version IS NULL
    OR supersedes_knowledge_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
  ),
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, incident_id, preparation_id, command_digest),
  FOREIGN KEY (brand_id, preparation_id)
    REFERENCES calapres_cs.owner_review_preparations (brand_id, preparation_id),
  CHECK (
    (action = 'reply_only'
      AND knowledge_proposal_sha256 IS NULL
      AND base_knowledge_version IS NULL
      AND knowledge_version_to_publish IS NULL
      AND supersedes_knowledge_version IS NULL)
    OR
    (action IN ('approve', 'approve_until')
      AND knowledge_proposal_sha256 IS NOT NULL
      AND base_knowledge_version IS NOT NULL
      AND knowledge_version_to_publish IS NOT NULL
      AND supersedes_knowledge_version IS NULL)
    OR
    (action = 'correct'
      AND knowledge_proposal_sha256 IS NOT NULL
      AND base_knowledge_version IS NOT NULL
      AND knowledge_version_to_publish IS NOT NULL
      AND supersedes_knowledge_version IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS calapres_cs.owner_nonces (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  key_version text NOT NULL CHECK (key_version ~ '^hmac-sha256-v[1-9][0-9]*$'),
  nonce_fingerprint text NOT NULL CHECK (nonce_fingerprint ~ '^[a-f0-9]{64}$'),
  preparation_id text NOT NULL CHECK (preparation_id ~ '^prep_[A-Za-z0-9_-]{8,80}$'),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_by text CHECK (consumed_by IS NULL OR consumed_by ~ '^dec_[A-Za-z0-9_-]{8,80}$'),
  consumed_digest text CHECK (
    consumed_digest IS NULL OR consumed_digest ~ '^[a-f0-9]{64}$'
  ),
  consumed_at timestamptz,
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, key_version, nonce_fingerprint),
  UNIQUE (brand_id, preparation_id),
  FOREIGN KEY (brand_id, preparation_id)
    REFERENCES calapres_cs.owner_review_preparations (brand_id, preparation_id),
  CHECK (expires_at > issued_at),
  CHECK (retention_until >= expires_at),
  CHECK (
    (consumed_by IS NULL AND consumed_digest IS NULL AND consumed_at IS NULL)
    OR
    (consumed_by IS NOT NULL AND consumed_digest IS NOT NULL AND consumed_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS calapres_cs.owner_approvals (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  approval_id text NOT NULL CHECK (approval_id ~ '^dec_[A-Za-z0-9_-]{8,80}$'),
  decision_id text NOT NULL CHECK (decision_id ~ '^dec_[A-Za-z0-9_-]{8,80}$'),
  incident_id text NOT NULL CHECK (incident_id ~ '^inc_[A-Za-z0-9_-]{8,80}$'),
  committed_incident_revision integer NOT NULL CHECK (committed_incident_revision > 1),
  audit_id text NOT NULL CHECK (audit_id ~ '^aud_[A-Za-z0-9_-]{8,80}$'),
  action text NOT NULL CHECK (action IN ('reply_only', 'approve', 'approve_until', 'correct')),
  command_digest text NOT NULL CHECK (command_digest ~ '^[a-f0-9]{64}$'),
  case_reply_sha256 text NOT NULL CHECK (case_reply_sha256 ~ '^[a-f0-9]{64}$'),
  knowledge_proposal_sha256 text CHECK (
    knowledge_proposal_sha256 IS NULL OR knowledge_proposal_sha256 ~ '^[a-f0-9]{64}$'
  ),
  base_knowledge_version text CHECK (
    base_knowledge_version IS NULL
    OR base_knowledge_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
  ),
  knowledge_version_to_publish text CHECK (
    knowledge_version_to_publish IS NULL
    OR knowledge_version_to_publish ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
  ),
  supersedes_knowledge_version text CHECK (
    supersedes_knowledge_version IS NULL
    OR supersedes_knowledge_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
  ),
  nonce_fingerprint text NOT NULL CHECK (nonce_fingerprint ~ '^[a-f0-9]{64}$'),
  nonce_key_version text NOT NULL CHECK (nonce_key_version ~ '^hmac-sha256-v[1-9][0-9]*$'),
  nonce_issued_at timestamptz NOT NULL,
  nonce_expires_at timestamptz NOT NULL,
  decided_at timestamptz NOT NULL,
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, approval_id),
  UNIQUE (brand_id, decision_id),
  UNIQUE (brand_id, incident_id),
  UNIQUE (brand_id, audit_id),
  FOREIGN KEY (brand_id, incident_id)
    REFERENCES calapres_cs.incidents (brand_id, incident_id),
  CHECK (approval_id = decision_id),
  CHECK (nonce_issued_at <= decided_at AND decided_at < nonce_expires_at),
  CHECK (retention_until >= nonce_expires_at),
  CHECK (
    (action = 'reply_only'
      AND knowledge_proposal_sha256 IS NULL
      AND base_knowledge_version IS NULL
      AND knowledge_version_to_publish IS NULL
      AND supersedes_knowledge_version IS NULL)
    OR
    (action IN ('approve', 'approve_until')
      AND knowledge_proposal_sha256 IS NOT NULL
      AND base_knowledge_version IS NOT NULL
      AND knowledge_version_to_publish IS NOT NULL
      AND supersedes_knowledge_version IS NULL)
    OR
    (action = 'correct'
      AND knowledge_proposal_sha256 IS NOT NULL
      AND base_knowledge_version IS NOT NULL
      AND knowledge_version_to_publish IS NOT NULL
      AND supersedes_knowledge_version IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS calapres_cs.audit_events (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  audit_id text NOT NULL CHECK (audit_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  event_type text NOT NULL CHECK (
    event_type IN ('business_event_completed', 'owner_decision_committed')
  ),
  claim_id text CHECK (claim_id IS NULL OR claim_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  observation_id text CHECK (
    observation_id IS NULL OR observation_id ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  observation_digest text CHECK (
    observation_digest IS NULL OR observation_digest ~ '^[a-f0-9]{64}$'
  ),
  incident_id text CHECK (incident_id IS NULL OR incident_id ~ '^inc_[A-Za-z0-9_-]{8,80}$'),
  approval_id text CHECK (approval_id IS NULL OR approval_id ~ '^dec_[A-Za-z0-9_-]{8,80}$'),
  outcome_class text CHECK (
    outcome_class IS NULL
    OR outcome_class IN ('observation_only', 'routine_candidate', 'owner_escalation', 'fail_closed')
  ),
  reason_code text CHECK (reason_code IS NULL OR reason_code ~ '^[a-z][a-z0-9_]{2,80}$'),
  risk_level text CHECK (
    risk_level IS NULL OR risk_level IN ('none', 'low', 'medium', 'high', 'critical')
  ),
  risk_digest text CHECK (risk_digest IS NULL OR risk_digest ~ '^[a-f0-9]{64}$'),
  action text CHECK (
    action IS NULL OR action IN ('reply_only', 'approve', 'approve_until', 'correct')
  ),
  command_digest text CHECK (command_digest IS NULL OR command_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL,
  retention_until timestamptz NOT NULL,
  PRIMARY KEY (brand_id, audit_id),
  CHECK (retention_until >= created_at),
  CHECK (
    (event_type = 'business_event_completed'
      AND claim_id IS NOT NULL
      AND observation_id IS NOT NULL
      AND observation_digest IS NOT NULL
      AND approval_id IS NULL
      AND outcome_class IS NOT NULL
      AND reason_code IS NOT NULL
      AND risk_level IS NOT NULL
      AND action IS NULL
      AND command_digest IS NULL)
    OR
    (event_type = 'owner_decision_committed'
      AND claim_id IS NULL
      AND observation_id IS NULL
      AND observation_digest IS NULL
      AND incident_id IS NOT NULL
      AND approval_id IS NOT NULL
      AND outcome_class IS NULL
      AND reason_code IS NULL
      AND risk_level IS NULL
      AND risk_digest IS NULL
      AND action IS NOT NULL
      AND command_digest IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS audit_events_observation_idx
  ON calapres_cs.audit_events (brand_id, observation_id)
  WHERE observation_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS audit_events_approval_idx
  ON calapres_cs.audit_events (brand_id, approval_id)
  WHERE approval_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS request_replay_claims_active_idx
  ON calapres_cs.request_replay_claims (brand_id, expires_at);
CREATE INDEX IF NOT EXISTS request_replay_claims_retention_idx
  ON calapres_cs.request_replay_claims (retention_until);
CREATE INDEX IF NOT EXISTS request_replay_aliases_claim_idx
  ON calapres_cs.request_replay_aliases (brand_id, claim_id);

CREATE INDEX IF NOT EXISTS business_events_active_idx
  ON calapres_cs.business_events (brand_id, lifecycle_status, expires_at);
CREATE INDEX IF NOT EXISTS business_events_lease_idx
  ON calapres_cs.business_events (brand_id, lifecycle_status, lease_expires_at);
CREATE INDEX IF NOT EXISTS business_events_retention_idx
  ON calapres_cs.business_events (retention_until);
CREATE INDEX IF NOT EXISTS business_event_aliases_claim_idx
  ON calapres_cs.business_event_aliases (brand_id, claim_id);
CREATE INDEX IF NOT EXISTS observation_outcomes_retention_idx
  ON calapres_cs.observation_outcomes (retention_until);

CREATE INDEX IF NOT EXISTS conversation_jobs_due_idx
  ON calapres_cs.conversation_jobs (brand_id, state, next_attempt_at);
CREATE INDEX IF NOT EXISTS conversation_jobs_retention_idx
  ON calapres_cs.conversation_jobs (retention_until);
CREATE INDEX IF NOT EXISTS conversation_message_aliases_generation_idx
  ON calapres_cs.conversation_message_aliases (brand_id, conversation_id, generation);

CREATE INDEX IF NOT EXISTS owner_nonces_expiry_idx
  ON calapres_cs.owner_nonces (brand_id, expires_at) WHERE consumed_by IS NULL;
CREATE INDEX IF NOT EXISTS owner_nonces_retention_idx
  ON calapres_cs.owner_nonces (retention_until);
CREATE INDEX IF NOT EXISTS incidents_status_idx
  ON calapres_cs.incidents (brand_id, status, updated_at);
CREATE INDEX IF NOT EXISTS incidents_retention_idx
  ON calapres_cs.incidents (retention_until);
CREATE INDEX IF NOT EXISTS owner_review_preparations_retention_idx
  ON calapres_cs.owner_review_preparations (retention_until);
CREATE INDEX IF NOT EXISTS owner_decision_options_preparation_idx
  ON calapres_cs.owner_decision_options (brand_id, preparation_id);
CREATE INDEX IF NOT EXISTS owner_approvals_retention_idx
  ON calapres_cs.owner_approvals (retention_until);
CREATE INDEX IF NOT EXISTS audit_events_retention_idx
  ON calapres_cs.audit_events (retention_until);

COMMENT ON TABLE calapres_cs.request_replay_claims IS
  'Replay claims with bounded validity and retention.';
COMMENT ON TABLE calapres_cs.business_events IS
  'Prepared/completed business-event lifecycle with recoverable leases.';
COMMENT ON TABLE calapres_cs.observation_outcomes IS
  'Sanitized outcome, reason, risk, and escalation references committed with completion.';
COMMENT ON TABLE calapres_cs.conversation_jobs IS
  'Per-brand conversation generation, retry, and terminal state.';
COMMENT ON TABLE calapres_cs.owner_nonces IS
  'Single-use owner-decision windows represented by irreversible fingerprints.';
COMMENT ON TABLE calapres_cs.incidents IS
  'Escalation revision linked to one sanitized observation outcome.';
COMMENT ON TABLE calapres_cs.owner_review_preparations IS
  'Trusted review snapshot and single-use decision window committed by revision CAS.';
COMMENT ON TABLE calapres_cs.owner_decision_options IS
  'Allowed owner decisions represented only by actions, versions, and digests.';
COMMENT ON TABLE calapres_cs.owner_approvals IS
  'Immutable logical approval snapshot committed with incident and audit state.';
COMMENT ON TABLE calapres_cs.audit_events IS
  'Sanitized completion and decision audit references and digests.';

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (1, 'calapres_cs_atomic_state')
ON CONFLICT (version) DO NOTHING;

COMMIT;
